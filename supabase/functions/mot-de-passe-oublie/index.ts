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

Deno.serve(async (req: Request) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const json = (corps: unknown, status = 200) =>
    new Response(JSON.stringify(corps), {
      status, headers: { ...cors, "Content-Type": "application/json" },
    });

  const REPONSE = { envoye: true };

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(REPONSE); }

  // "pseudo" est conservé en repli pour rester compatible avec un ancien
  // client qui n'enverrait pas encore "identifiant".
  const identifiant = String(body.identifiant || body.pseudo || "").trim();
  const redirectTo = typeof body.redirectTo === "string" ? body.redirectTo : undefined;
  if (!identifiant) return json(REPONSE);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  let courriel: string | null = null;
  if (identifiant.includes("@")) {
    courriel = identifiant.toLowerCase();
  } else {
    const admin = createClient(url, serviceKey);
    const { data: ligne } = await admin
      .from("pseudos")
      .select("courriel")
      .eq("pseudo_cle", identifiant)
      .maybeSingle();
    if (ligne) courriel = ligne.courriel;
  }

  if (courriel) {
    const anon = createClient(url, anonKey);
    // Erreur volontairement ignorée : la réponse au navigateur ne doit
    // jamais varier selon que l'identifiant existe ou non, ni selon que
    // l'envoi a réussi ou non côté fournisseur de courriel.
    await anon.auth.resetPasswordForEmail(courriel, { redirectTo });
  }

  return json(REPONSE);
});
