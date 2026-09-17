// ═══════════════════════════════════════════════════════════════════════════
// Inscription — pseudo, identité de base, adresse de courriel et mot de passe
// (Supabase Edge Function)
//
// Supabase authentifie par adresse de courriel, pas par pseudo. Cette
// fonction crée le compte par la voie standard (ce qui déclenche le courriel
// de confirmation configuré dans le projet), puis enregistre le pseudo et
// les quelques informations d'identité demandées dans une table que le
// navigateur ne peut jamais lire pour le compte de quelqu'un d'autre — voir
// schema-pseudo.sql.
//
// Si le pseudo choisi est pris entre-temps par quelqu'un d'autre, ou si
// l'enregistrement échoue pour une autre raison, le compte tout juste créé
// est détruit aussitôt : jamais de compte orphelin, sans pseudo, impossible
// à utiliser.
//
// Déploiement :
//   supabase functions deploy inscription
// (les clés SUPABASE_URL, SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY
//  sont fournies automatiquement par Supabase)
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from "jsr:@supabase/supabase-js@2";

const RE_PSEUDO = /^[A-Za-z0-9][A-Za-z0-9_-]{2,23}$/;
const RE_COURRIEL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const RE_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TYPES_ACTIVITE = new Set(["amateur", "artisanat", "entreprise"]);
const AGE_MINIMUM = 15;
const LONGUEUR_MAX_NOM = 80;
const LONGUEUR_MAX_LIEU = 100;

// Âge en années pleines à la date du jour, à partir d'une date de naissance
// « AAAA-MM-JJ ». Renvoie null si la date est absente, mal formée, dans le
// futur, ou trop ancienne pour être vraisemblable (ce n'est pas au serveur
// de deviner un âge de 200 ans).
function ageEnAnnees(iso: string): number | null {
  const m = RE_DATE.exec(iso);
  if (!m) return null;
  const [annee, mois, jour] = iso.split("-").map(Number);
  if (annee < 1900) return null;
  const naissance = new Date(Date.UTC(annee, mois - 1, jour));
  if (Number.isNaN(naissance.getTime())) return null;
  const auj = new Date();
  if (naissance > auj) return null;
  let age = auj.getUTCFullYear() - naissance.getUTCFullYear();
  const pasEncoreEuAnniversaire =
    auj.getUTCMonth() < naissance.getUTCMonth() ||
    (auj.getUTCMonth() === naissance.getUTCMonth() && auj.getUTCDate() < naissance.getUTCDate());
  if (pasEncoreEuAnniversaire) age--;
  return age;
}

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

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ erreur: "Requête invalide." }, 400); }

  const pseudo = String(body.pseudo || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const motDePasse = String(body.motDePasse || "");
  const prenom = String(body.prenom || "").trim();
  const nom = String(body.nom || "").trim();
  const dateNaissance = String(body.dateNaissance || "").trim();
  const ville = String(body.ville || "").trim();
  const pays = String(body.pays || "").trim();
  const typeActivite = String(body.typeActivite || "").trim();
  const emailRedirectTo = typeof body.emailRedirectTo === "string" ? body.emailRedirectTo : undefined;

  if (!RE_PSEUDO.test(pseudo)) {
    return json({ erreur: "Pseudo invalide : 3 à 24 caractères, lettres, chiffres, tiret ou "
      + "tiret bas, sans accent ni espace, et qui commence par une lettre ou un chiffre." }, 400);
  }
  if (!prenom || prenom.length > LONGUEUR_MAX_NOM) {
    return json({ erreur: "Indique ton prénom." }, 400);
  }
  if (!nom || nom.length > LONGUEUR_MAX_NOM) {
    return json({ erreur: "Indique ton nom." }, 400);
  }
  if (!RE_DATE.test(dateNaissance)) {
    return json({ erreur: "Indique une date de naissance valide." }, 400);
  }
  const age = ageEnAnnees(dateNaissance);
  if (age === null) {
    return json({ erreur: "Cette date de naissance ne semble pas correcte." }, 400);
  }
  if (age < AGE_MINIMUM) {
    return json({ erreur: `Crochompte ne s'adresse pas aux personnes de moins de ${AGE_MINIMUM} ans.` }, 400);
  }
  if (!ville || ville.length > LONGUEUR_MAX_LIEU) {
    return json({ erreur: "Indique ta ville." }, 400);
  }
  if (!pays || pays.length > LONGUEUR_MAX_LIEU) {
    return json({ erreur: "Indique ton pays." }, 400);
  }
  if (!TYPES_ACTIVITE.has(typeActivite)) {
    return json({ erreur: "Choisis un type d'activité." }, 400);
  }
  if (!RE_COURRIEL.test(email)) {
    return json({ erreur: "Cette adresse ne ressemble pas à une adresse de courriel." }, 400);
  }
  if (motDePasse.length < 8) {
    return json({ erreur: "Le mot de passe doit faire au moins 8 caractères." }, 400);
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // La création du compte passe par la voie normale (anon key), pour que
  // Supabase envoie lui-même le courriel de confirmation avec le modèle
  // réglé dans le projet — exactement comme si le navigateur l'avait
  // appelée directement.
  const anon = createClient(url, anonKey);
  const { data, error } = await anon.auth.signUp({
    email, password: motDePasse, options: { emailRedirectTo },
  });
  if (error) return json({ erreur: error.message }, 400);

  // Une adresse déjà enregistrée et confirmée renvoie un « succès » sans
  // identité nouvelle : c'est le signal officiel de Supabase pour ce cas,
  // sans avoir à révéler l'information autrement.
  if (!data.user || (data.user.identities && data.user.identities.length === 0)) {
    return json({ erreur: "Cette adresse de courriel a déjà un compte." }, 409);
  }

  const admin = createClient(url, serviceKey);
  const { error: eRes } = await admin.from("pseudos").insert({
    user_id: data.user.id, pseudo, pseudo_cle: pseudo, courriel: email,
    prenom, nom, date_naissance: dateNaissance, ville, pays, type_activite: typeActivite,
  });
  if (eRes) {
    // Le pseudo était pris entre-temps, ou toute autre erreur (y compris une
    // contrainte de la base, filet de sécurité derrière les vérifications
    // ci-dessus) : on ne laisse pas de compte orphelin derrière.
    await admin.auth.admin.deleteUser(data.user.id);
    const dejaPris = /duplicate|unique/i.test(eRes.message || "");
    return json(
      { erreur: dejaPris ? "Ce pseudo est déjà pris." : eRes.message },
      dejaPris ? 409 : 500,
    );
  }

  return json({ inscrite: true });
});
