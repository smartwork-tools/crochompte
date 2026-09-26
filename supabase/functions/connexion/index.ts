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

Deno.serve(async (req: Request) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
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
  if (!identifiant || !motDePasse) return json(ECHEC, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey);

  // Limite de tentatives : 10 par identifiant et 50 par adresse IP en
  // 15 minutes. Sans elle, on pourrait essayer des mots de passe à l'infini
  // sur un pseudo connu. (Nécessite schema-fiabilite.sql ; sans lui, la
  // connexion fonctionne comme avant.)
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "inconnue";
  try {
    const { data: n1 } = await admin.rpc("compter_tentative", { p_cle: "cx:" + identifiant.toLowerCase() });
    const { data: n2 } = await admin.rpc("compter_tentative", { p_cle: "cx-ip:" + ip });
    if ((Number(n1) || 0) > 10 || (Number(n2) || 0) > 50) {
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

  return json({
    access_token: jeton.access_token,
    refresh_token: jeton.refresh_token,
  });
});
