// ═══════════════════════════════════════════════════════════════════════════
// Paiement — réception des événements Stripe (Supabase Edge Function)
//
// Stripe appelle cette adresse à chaque paiement, renouvellement ou
// résiliation. La fonction vérifie la signature (personne d'autre que Stripe
// ne peut la déclencher), puis met à jour la ligne « abonnements » du compte
// concerné avec la clé service (jamais exposée au navigateur).
//
// Comment le compte est reconnu : les liens de paiement Stripe sont ouverts
// par l'application avec ?client_reference_id=<identifiant du compte>. Stripe
// le renvoie dans checkout.session.completed ; on le copie ensuite dans les
// métadonnées de l'abonnement Stripe pour les renouvellements.
//
// Secrets à définir (Supabase → Edge Functions → Secrets) :
//   STRIPE_SECRET_KEY       clé secrète Stripe (sk_live_… ou sk_test_…)
//   STRIPE_WEBHOOK_SECRET   secret de signature du webhook (whsec_…)
// Déploiement (la signature Stripe remplace le jeton Supabase) :
//   supabase functions deploy stripe-webhook --no-verify-jwt
// Adresse à donner à Stripe (Développeurs → Webhooks) :
//   https://<projet>.supabase.co/functions/v1/stripe-webhook
// Événements à cocher : checkout.session.completed, invoice.paid,
//   customer.subscription.updated, customer.subscription.deleted
// ═══════════════════════════════════════════════════════════════════════════

import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { createClient } from "jsr:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-12-18.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});
const crypto = Stripe.createSubtleCryptoProvider();

// Quelle offre d'après le prix : on lit d'abord la clé de recherche du prix
// (lookup_key « mensuel », « semestriel », « annuel » à définir sur chaque
// prix dans Stripe), sinon on déduit de la périodicité.
function offreDuPrix(prix: Stripe.Price | null | undefined): string {
  if (!prix) return "mensuel";
  const cle = (prix.lookup_key || "").toLowerCase();
  if (cle === "mensuel" || cle === "semestriel" || cle === "annuel") return cle;
  const r = prix.recurring;
  if (!r) return "mensuel";
  if (r.interval === "year") return "annuel";
  if (r.interval === "month" && (r.interval_count || 1) >= 6) return "semestriel";
  return "mensuel";
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("méthode non autorisée", { status: 405 });
  const signature = req.headers.get("stripe-signature");
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!signature || !secret) return new Response("signature manquante", { status: 400 });

  const corps = await req.text();
  let ev: Stripe.Event;
  try {
    ev = await stripe.webhooks.constructEventAsync(corps, signature, secret, undefined, crypto);
  } catch (e) {
    console.error("stripe-webhook : signature invalide", (e as Error).message);
    return new Response("signature invalide", { status: 400 });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Chaque événement n'est traité qu'une fois : Stripe peut renvoyer le même
  // deux fois, ou un ancien après un plus récent (V56).
  {
    const { error: eIns } = await admin.from("stripe_evenements").insert({ id: ev.id, type: ev.type });
    if (eIns) {
      if (/duplicate|23505/i.test(eIns.message + " " + ((eIns as { code?: string }).code ?? ""))) {
        return new Response(JSON.stringify({ recu: true, deja: true }), { headers: { "Content-Type": "application/json" } });
      }
      console.error("stripe-webhook : journal des événements indisponible", eIns.message);   // table absente : on continue sans garde
    }
  }

  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Statut Stripe → statut Crochompte. Un impayé ne prolonge jamais l'accès :
  // la fin reste celle de la dernière période réellement payée (V56).
  function statutDe(sub: Stripe.Subscription): { statut: string; prolonger: boolean } {
    switch (sub.status) {
      case "active": case "trialing": return { statut: "actif", prolonger: true };
      case "past_due": return { statut: "actif", prolonger: false };
      case "canceled": case "unpaid": case "incomplete_expired": return { statut: "resilie", prolonger: false };
      default: return { statut: "actif", prolonger: false };   // incomplete, paused
    }
  }

  // Met la ligne d'abonnement à jour pour un compte, sans jamais raccourcir
  // une période déjà acquise, ni retirer un accès offert sans limite.
  async function activer(uid: string, champs: Record<string, unknown>) {
    if (!UUID.test(uid)) { console.error("stripe-webhook : identifiant de compte invalide", uid); return; }
    const { data: actuel } = await admin.from("abonnements").select("fin, statut").eq("user_id", uid).maybeSingle();
    const finActuelle = actuel?.fin ? new Date(actuel.fin).getTime() : 0;
    const finNouvelle = champs.fin ? new Date(String(champs.fin)).getTime() : 0;
    if (actuel?.statut === "offert" && !actuel.fin) {
      // Accès illimité offert : on ne note que les identifiants Stripe, le
      // statut « offert » reste (sinon « actif » sans fin = accès fermé).
      delete champs.fin; delete champs.statut; delete champs.offre; delete champs.annulation_prevue;
    } else if (finNouvelle && finNouvelle < finActuelle) delete champs.fin;         // jamais en arrière
    if (!Object.keys(champs).length) return;
    const { error } = await admin.from("abonnements").upsert({ user_id: uid, ...champs, maj: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
  }

  // Retrouve le compte à partir d'un abonnement Stripe (métadonnées, puis table).
  async function compteDeLAbonnement(sub: Stripe.Subscription): Promise<string | null> {
    const meta = sub.metadata?.crochompte_uid;
    if (meta) return meta;
    const { data } = await admin.from("abonnements").select("user_id").eq("stripe_abonnement", sub.id).maybeSingle();
    if (data?.user_id) return data.user_id;
    const clientId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
    if (clientId) {
      const { data: d2 } = await admin.from("abonnements").select("user_id").eq("stripe_client", clientId).maybeSingle();
      if (d2?.user_id) return d2.user_id;
    }
    return null;
  }

  try {
    switch (ev.type) {
      case "checkout.session.completed": {
        const session = ev.data.object as Stripe.Checkout.Session;
        const uid = session.client_reference_id;
        if (!uid || !UUID.test(uid) || session.mode !== "subscription" || !session.subscription) break;
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const sub = await stripe.subscriptions.retrieve(subId, { expand: ["items.data.price"] });
        // On note le compte sur l'abonnement Stripe : les renouvellements le retrouveront.
        try { await stripe.subscriptions.update(subId, { metadata: { crochompte_uid: uid } }); } catch (_e) { /* facultatif */ }
        const prix = sub.items.data[0]?.price ?? null;
        await activer(uid, {
          statut: "actif",
          offre: offreDuPrix(prix),
          fin: new Date(sub.current_period_end * 1000).toISOString(),
          stripe_client: typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
          stripe_abonnement: sub.id,
          annulation_prevue: !!sub.cancel_at_period_end,
        });
        break;
      }
      case "invoice.paid": {
        const facture = ev.data.object as Stripe.Invoice;
        const subId = typeof facture.subscription === "string" ? facture.subscription : facture.subscription?.id;
        if (!subId) break;
        const sub = await stripe.subscriptions.retrieve(subId, { expand: ["items.data.price"] });
        const uid = await compteDeLAbonnement(sub);
        if (!uid) { console.error("invoice.paid : compte introuvable pour", subId); break; }
        await activer(uid, {
          statut: "actif",
          offre: offreDuPrix(sub.items.data[0]?.price ?? null),
          fin: new Date(sub.current_period_end * 1000).toISOString(),
          stripe_abonnement: sub.id,
          annulation_prevue: !!sub.cancel_at_period_end,
        });
        break;
      }
      case "customer.subscription.updated": {
        const sub = ev.data.object as Stripe.Subscription;
        const uid = await compteDeLAbonnement(sub);
        if (!uid) break;
        const st = statutDe(sub);
        const champs: Record<string, unknown> = { annulation_prevue: !!sub.cancel_at_period_end, statut: st.statut };
        if (st.prolonger) champs.fin = new Date(sub.current_period_end * 1000).toISOString();
        await activer(uid, champs);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = ev.data.object as Stripe.Subscription;
        const uid = await compteDeLAbonnement(sub);
        if (!uid) break;
        // L'accès reste ouvert jusqu'à la fin de la période déjà payée.
        await activer(uid, { statut: "resilie", annulation_prevue: false, fin: new Date(sub.current_period_end * 1000).toISOString() });
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("stripe-webhook :", ev.type, (e as Error).message);
    return new Response("erreur interne", { status: 500 });   // Stripe réessaiera
  }
  return new Response(JSON.stringify({ recu: true }), { headers: { "Content-Type": "application/json" } });
});
