// ═══════════════════════════════════════════════════════════════════════════
// Effacement définitif d'un compte — fonction serveur (Supabase Edge Function)
//
// Pourquoi une fonction serveur : supprimer une IDENTITÉ de connexion demande
// un droit d'administration, et cette clé ne doit jamais se trouver dans un
// navigateur. L'atelier et les photos, eux, sont effacés par l'application
// elle-même : les règles de la base l'y autorisent pour ses propres lignes.
//
// Le mot de passe est vérifié ICI, pas seulement dans le navigateur : un
// jeton volé ou un onglet laissé ouvert ne suffit pas (V56). Si le compte a
// un abonnement Stripe, il est résilié avant l'effacement (sinon le
// prélèvement continuait).
//
// Déploiement :
//   supabase functions deploy supprimer-compte
// (SUPABASE_SERVICE_ROLE_KEY est fournie par Supabase ; STRIPE_SECRET_KEY est
// le même secret que pour stripe-webhook, facultatif tant que Stripe n'est
// pas en place)
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from "jsr:@supabase/supabase-js@2";

function origineAutorisee(o: string | null): string {
  const ok = !!o && (/^https:\/\/(www\.)?crochompte\.com$/.test(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o));
  return ok ? o! : "https://crochompte.com";
}

Deno.serve(async (req: Request) => {
  const cors = {
    // Seul le site Crochompte (et un poste de développement) peut appeler
    // cette fonction depuis un navigateur.
    "Access-Control-Allow-Origin": origineAutorisee(req.headers.get("origin")),
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const jeton = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!jeton) {
    return new Response(JSON.stringify({ erreur: "non authentifiée" }), {
      status: 401, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // On vérifie QUI demande, avec son propre jeton : personne ne peut
  // effacer le compte de quelqu'un d'autre.
  const lecteur = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${jeton}` } } },
  );
  const { data: { user }, error: e1 } = await lecteur.auth.getUser();
  if (e1 || !user) {
    return new Response(JSON.stringify({ erreur: "session invalide" }), {
      status: 401, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Le mot de passe actuel, vérifié côté serveur (au plus 5 essais par
  // compte et quart d'heure).
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { body = {}; }
  const motDePasse = String(body.motDePasse || "");
  if (!motDePasse || motDePasse.length > 200 || !user.email) {
    return new Response(JSON.stringify({ erreur: "mot de passe requis" }), {
      status: 400, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  try {
    const { data: n } = await admin.rpc("compter_tentative", { p_cle: "sup:" + user.id });
    if ((Number(n) || 0) > 5) {
      return new Response(JSON.stringify({ erreur: "Trop de tentatives. Patiente 15 minutes, puis réessaie." }), {
        status: 429, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
  } catch (_e) { /* compteur indisponible : on continue */ }
  const verif = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: Deno.env.get("SUPABASE_ANON_KEY")!, "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, password: motDePasse }),
  });
  if (!verif.ok) {
    return new Response(JSON.stringify({ erreur: "Le mot de passe actuel n'est pas le bon." }), {
      status: 403, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // Un abonnement Stripe en cours est résilié d'abord : effacer le compte
  // sans cela laissait le prélèvement continuer.
  const cleStripe = Deno.env.get("STRIPE_SECRET_KEY");
  if (cleStripe) {
    try {
      const { data: ab } = await admin.from("abonnements").select("stripe_abonnement, stripe_client").eq("user_id", user.id).maybeSingle();
      const entetes = { Authorization: `Bearer ${cleStripe}` };
      if (ab?.stripe_abonnement) {
        const r = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(ab.stripe_abonnement)}`, { method: "DELETE", headers: entetes });
        if (!r.ok && r.status !== 404) {
          console.error("supprimer-compte : résiliation Stripe refusée", r.status);
          return new Response(JSON.stringify({ erreur: "L'abonnement n'a pas pu être résilié. Réessaie, ou écris à bonjour@crochompte.com." }), {
            status: 500, headers: { ...cors, "Content-Type": "application/json" },
          });
        }
      }
      if (ab?.stripe_client) {
        await fetch(`https://api.stripe.com/v1/customers/${encodeURIComponent(ab.stripe_client)}`, { method: "DELETE", headers: entetes }).catch(() => null);
      }
    } catch (e) { console.error("supprimer-compte : Stripe", (e as Error).message); }
  }

  // Et seulement ensuite, avec le droit d'administration, on efface CE compte.
  // Les photos d'abord : elles ne disparaissent pas avec le compte. Tout le
  // dossier, page par page (l'application a déjà essayé ; ceci rattrape ce
  // qui aurait pu rester).
  try {
    for (let tour = 0; tour < 50; tour++) {
      const { data: fichiers, error: eL } = await admin.storage.from("photos").list(user.id, { limit: 100 });
      if (eL || !fichiers || !fichiers.length) break;
      const { error: eR } = await admin.storage.from("photos").remove(fichiers.map((f) => `${user.id}/${f.name}`));
      if (eR) break;
    }
  } catch (_e) { /* on continue : l'identité doit partir quoi qu'il arrive */ }

  const { error: e2 } = await admin.auth.admin.deleteUser(user.id);
  if (e2) {
    console.error("supprimer-compte : échec de deleteUser", e2.message);
    return new Response(JSON.stringify({ erreur: "La suppression n'a pas pu aboutir. Réessaie, ou écris à bonjour@crochompte.com." }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ efface: true }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
