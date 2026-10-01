// ═══════════════════════════════════════════════════════════════════════════
// Connexion — pseudo OU adresse de courriel, + mot de passe
// (Supabase Edge Function)
//
// La personne peut taper indifféremment son pseudo ou son adresse de
// courriel : si l'identifiant contient un « @ », on le traite directement
// comme une adresse ; sinon on le résout en adresse côté serveur (clé
// service_role, jamais exposée), on demande nous-mêmes le jeton de connexion
// à Supabase, et on ne renvoie que ce jeton au navigateur — jamais l'adresse
// elle-même quand seul le pseudo a été donné.
//
// Même réponse générique dans tous les cas d'échec (identifiant inexistant,
// mauvais mot de passe) : deviner des pseudos ou des adresses ne doit rien
// apprendre à personne.
//
// Déploiement :
//   supabase functions deploy connexion
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from "jsr:@supabase/supabase-js@2";


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

  const ECHEC = { erreur: "Identifiant ou mot de passe incorrect." };

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ erreur: "Requête invalide." }, 400); }

  // "pseudo" est conservé en repli pour rester compatible avec un ancien
  // client qui n'enverrait pas encore "identifiant".
  const identifiant = String(body.identifiant || body.pseudo || "").trim();
  const motDePasse = String(body.motDePasse || "");
  if (!identifiant || !motDePasse || identifiant.length > 254 || motDePasse.length > 200) return json(ECHEC, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey);

  // Limite de tentatives : 10 par identifiant et 50 par adresse IP en
  // 15 minutes. Sans elle, on pourrait essayer des mots de passe à l'infini
  // sur un pseudo connu. (Nécessite schema-fiabilite.sql ; sans lui, la
  // connexion fonctionne comme avant.)
  const ip = adresseIp(req);
  try {
    // Trois compteurs : identifiant + adresse IP (10), adresse IP (50), et
    // identifiant toutes adresses confondues (100). Une personne mal
    // intentionnée qui tape le pseudo d'une autre ne bloque qu'elle-même ;
    // une attaque répartie sur beaucoup d'adresses reste plafonnée.
    const cle = identifiant.toLowerCase();
    const { data: n1 } = await admin.rpc("compter_tentative", { p_cle: "cx:" + cle + "|" + ip });
    const { data: n2 } = await admin.rpc("compter_tentative", { p_cle: "cx-ip:" + ip });
    const { data: n3 } = await admin.rpc("compter_tentative", { p_cle: "cx:" + cle });
    if ((Number(n1) || 0) > 10 || (Number(n2) || 0) > 50 || (Number(n3) || 0) > 100) {
      return json({ erreur: "Trop de tentatives de connexion. Patiente 15 minutes, puis réessaie." }, 429);
    }
  } catch (_e) { /* compteur indisponible : on continue */ }

  let courriel: string;
  if (identifiant.includes("@")) {
    // Une adresse de courriel n'a pas besoin d'être résolue : elle sert
    // directement à demander le jeton.
    courriel = identifiant.toLowerCase();
  } else {
    const { data: ligne } = await admin
      .from("pseudos")
      .select("user_id, courriel")
      .eq("pseudo_cle", identifiant)
      .maybeSingle();
    if (!ligne) return json(ECHEC, 401);
    // L'adresse ACTUELLE du compte (elle a pu changer depuis l'inscription),
    // plutôt que la copie faite ce jour-là.
    courriel = ligne.courriel;
    try {
      const { data: u } = await admin.auth.admin.getUserById(ligne.user_id);
      if (u && u.user && u.user.email) courriel = u.user.email;
    } catch (_e) { /* on garde la copie */ }
  }

  // On demande nous-mêmes le jeton à Supabase, avec l'adresse retrouvée ou
  // fournie, et on relaie seulement le résultat — jamais l'adresse elle-même
  // quand elle vient de la résolution du pseudo.
  const rep = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email: courriel, password: motDePasse }),
  });
  const jeton = await rep.json().catch(() => ({}));
  // Adresse pas encore confirmée : Supabase ne le dit qu'APRÈS avoir vérifié
  // le mot de passe, donc le dire ne révèle rien à quelqu'un qui devine.
  if (jeton && (jeton.error_code === "email_not_confirmed" || /not confirmed/i.test(String(jeton.msg || jeton.error_description || "")))) {
    return json({ erreur: "Ton adresse e-mail n'est pas encore confirmée. Clique sur le lien reçu par e-mail, puis reconnecte-toi." }, 403);
  }
  if (!rep.ok || !jeton.access_token) return json(ECHEC, 401);

  // Connexion réussie : les compteurs de cet identifiant repartent de zéro.
  // Seuls les échecs comptent ; dix connexions légitimes en un quart d'heure
  // ne bloquent personne (V56).
  try {
    const cleOk = identifiant.toLowerCase();
    await admin.rpc("oublier_tentatives", { p_cles: ["cx:" + cleOk + "|" + ip, "cx:" + cleOk] });
  } catch (_e) { /* sans gravité */ }

  return json({
    access_token: jeton.access_token,
    refresh_token: jeton.refresh_token,
  });
});
