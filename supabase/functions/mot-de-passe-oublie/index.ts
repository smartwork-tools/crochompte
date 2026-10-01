// ═══════════════════════════════════════════════════════════════════════════
// Mot de passe oublié — à partir du pseudo OU de l'adresse de courriel
// (Supabase Edge Function)
//
// Résout l'identifiant en adresse côté serveur si c'est un pseudo (une
// adresse de courriel est utilisée telle quelle), et déclenche le courriel
// de réinitialisation standard de Supabase vers cette adresse.
//
// La réponse au navigateur est TOUJOURS la même, que l'identifiant
// corresponde à un compte ou non : sinon, ce point d'entrée deviendrait un
// moyen de vérifier si un pseudo ou une adresse existe, un par un.
//
// Déploiement :
//   supabase functions deploy mot-de-passe-oublie
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from "jsr:@supabase/supabase-js@2";

// Adresses de retour acceptées dans les e-mails : uniquement le site.
function siteAutorise(v: unknown): string {
  const defaut = Deno.env.get("SITE_URL") || "https://crochompte.com/";
  if (typeof v !== "string") return defaut;
  try {
    const u = new URL(v);
    const hote = u.hostname.toLowerCase();
    if (u.protocol === "https:" && (hote === "crochompte.com" || hote === "www.crochompte.com")) return u.origin + u.pathname;
  } catch (_e) { /* adresse illisible */ }
  return defaut;
}


// L'adresse IP de la personne : d'abord l'en-tête que pose la passerelle
// (cf-connecting-ip, x-real-ip), sinon le DERNIER élément de x-forwarded-for
// (le premier peut être fourni par le client lui-même). Avec le seul dernier
// élément, derrière certains relais, toutes les visites portaient la même
// adresse interne et une seule personne pouvait bloquer tout le monde (V56).
function adresseIp(req: Request): string {
  const direct = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip");
  if (direct && direct.trim()) return direct.trim().slice(0, 64);
  const xff = (req.headers.get("x-forwarded-for") ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  return (xff.length ? xff[xff.length - 1] : "inconnue").slice(0, 64);
}

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

  const json = (corps: unknown, status = 200) =>
    new Response(JSON.stringify(corps), {
      status, headers: { ...cors, "Content-Type": "application/json" },
    });

  const REPONSE = { envoye: true };
  // La réponse part toujours au même moment, que l'identifiant existe ou non :
  // un identifiant inconnu répondait tout de suite, un connu après l'envoi
  // du courriel, et cette différence de temps révélait son existence (V56).
  const debut = Date.now();
  const DUREE_MIN = 700;
  const repondre = async () => {
    const reste = DUREE_MIN - (Date.now() - debut);
    if (reste > 0) await new Promise((r) => setTimeout(r, reste));
    return json(REPONSE);
  };

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return repondre(); }

  // "pseudo" est conservé en repli pour rester compatible avec un ancien
  // client qui n'enverrait pas encore "identifiant".
  const identifiant = String(body.identifiant || body.pseudo || "").trim();
  if (identifiant.length > 254) return repondre();
  // Le lien de l'e-mail ne peut ramener QUE sur le site : une adresse de
  // retour fournie par le navigateur n'est acceptée que si elle en fait partie.
  const redirectTo = siteAutorise(body.redirectTo);
  if (!identifiant) return repondre();

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // On retrouve la ligne du compte, qu'on ait tapé le pseudo ou l'adresse.
  const admin = createClient(url, serviceKey);

  // Au plus 3 demandes par identifiant et 20 par adresse IP en 15 minutes :
  // personne ne peut inonder une boîte mail ni épuiser le quota d'envoi.
  // La réponse reste la même, pour ne rien révéler.
  const ip = adresseIp(req);
  try {
    const { data: n1 } = await admin.rpc("compter_tentative", { p_cle: "mdp:" + identifiant.toLowerCase() + "|" + ip });
    const { data: n2 } = await admin.rpc("compter_tentative", { p_cle: "mdp-ip:" + ip });
    const { data: n3 } = await admin.rpc("compter_tentative", { p_cle: "mdp:" + identifiant.toLowerCase() });
    if ((Number(n3) || 0) > 10) return repondre();
    if ((Number(n1) || 0) > 3 || (Number(n2) || 0) > 20) return repondre();
  } catch (_e) { /* compteur indisponible : on continue */ }
  const colonne = identifiant.includes("@") ? "courriel" : "pseudo_cle";
  const valeur = identifiant.includes("@") ? identifiant.toLowerCase() : identifiant;
  const { data: ligne } = await admin
    .from("pseudos")
    .select("user_id, courriel, pseudo, prenom")
    .eq(colonne, valeur)
    .maybeSingle();

  let courriel: string | null = ligne ? ligne.courriel : null;
  if (ligne) {
    // L'adresse ACTUELLE du compte, pas la copie faite à l'inscription : si
    // elle a changé, le lien ne doit pas partir vers l'ancienne.
    try {
      const { data: u } = await admin.auth.admin.getUserById(ligne.user_id);
      if (u && u.user && u.user.email) courriel = u.user.email;
    } catch (_e) { /* on garde la copie */ }
  }
  if (!courriel && identifiant.includes("@")) courriel = identifiant.toLowerCase();

  if (courriel) {
    // Le pseudo et le prénom sont recopiés sur le compte juste avant l'envoi :
    // le courriel peut alors rappeler « Ton pseudo : … » ({{ .Data.pseudo }}
    // dans le modèle). Il n'arrive qu'à la propriétaire de l'adresse, qui
    // retrouve ainsi un pseudo oublié sans que personne d'autre ne l'apprenne.
    if (ligne) {
      try {
        await admin.auth.admin.updateUserById(ligne.user_id, {
          user_metadata: { pseudo: ligne.pseudo, prenom: ligne.prenom },
        });
      } catch (_e) { /* sans gravité : le courriel partira sans le pseudo */ }
    }
    const anon = createClient(url, anonKey);
    // Erreur volontairement ignorée : la réponse au navigateur ne doit
    // jamais varier selon que l'identifiant existe ou non, ni selon que
    // l'envoi a réussi ou non côté fournisseur de courriel.
    await anon.auth.resetPasswordForEmail(courriel, { redirectTo });
  }

  return repondre();
});
