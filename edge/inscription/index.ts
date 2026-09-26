// ═══════════════════════════════════════════════════════════════════════════
// Inscription — pseudo, adresse de courriel, mot de passe et attestation d'âge
// (Supabase Edge Function)
//
// Supabase authentifie par adresse de courriel, pas par pseudo. Cette
// fonction crée le compte par la voie standard (ce qui déclenche le courriel
// de confirmation configuré dans le projet), puis enregistre le pseudo et
// les quelques informations d'identité demandées dans une table que le
// navigateur ne peut jamais lire pour le compte de quelqu'un d'autre — voir
// schema-pseudo.sql.
//
// Règle : une adresse de courriel = un compte = un pseudo.
//
// Si le pseudo choisi est pris entre-temps par quelqu'un d'autre, ou si
// l'enregistrement échoue pour une autre raison, le compte créé À L'INSTANT
// par cet appel est détruit aussitôt : jamais de compte orphelin, et jamais
// la suppression d'un compte qui existait déjà.
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
  // Le lien de confirmation ne peut ramener QUE sur le site.
  const emailRedirectTo = siteAutorise(body.emailRedirectTo);

  if (!RE_PSEUDO.test(pseudo)) {
    return json({ erreur: "Pseudo invalide : 3 à 24 caractères, lettres, chiffres, tiret ou "
      + "tiret bas, sans accent ni espace, et qui commence par une lettre ou un chiffre." }, 400);
  }
  // Inscription allégée : seuls le pseudo, l'adresse, le mot de passe et
  // l'attestation d'âge sont demandés. Le reste est facultatif — on ne
  // collecte que ce qui sert (RGPD, article 5.1.c). Si une ancienne version
  // du formulaire envoie encore ces champs, ils sont vérifiés et gardés.
  if (prenom.length > LONGUEUR_MAX_NOM || nom.length > LONGUEUR_MAX_NOM) {
    return json({ erreur: "Le prénom et le nom ne doivent pas dépasser 80 caractères." }, 400);
  }
  if (ville.length > LONGUEUR_MAX_LIEU || pays.length > LONGUEUR_MAX_LIEU) {
    return json({ erreur: "La ville et le pays ne doivent pas dépasser 100 caractères." }, 400);
  }
  if (typeActivite && !TYPES_ACTIVITE.has(typeActivite)) {
    return json({ erreur: "Type d'activité inconnu." }, 400);
  }
  // Âge : une date de naissance, si elle est donnée, est vérifiée ; sinon
  // la personne doit avoir coché « J'ai 15 ans ou plus ».
  if (dateNaissance) {
    const age = RE_DATE.test(dateNaissance) ? ageEnAnnees(dateNaissance) : null;
    if (age === null) {
      return json({ erreur: "Cette date de naissance ne semble pas correcte." }, 400);
    }
    if (age < AGE_MINIMUM) {
      return json({ erreur: `Crochompte ne s'adresse pas aux personnes de moins de ${AGE_MINIMUM} ans.` }, 400);
    }
  } else if (body.age15 !== true) {
    return json({ erreur: `Coche la case « J'ai ${AGE_MINIMUM} ans ou plus » : Crochompte ne s'adresse pas aux personnes plus jeunes.` }, 400);
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
  const admin = createClient(url, serviceKey);

  // Une adresse de courriel, un compte, un pseudo. Le message ne révèle
  // jamais le pseudo lié à l'adresse (ce serait le donner à n'importe qui) :
  // il indique comment le retrouver, par un courriel qui n'arrive qu'à la
  // propriétaire de l'adresse.
  const DEJA_UN_COMPTE = "Cette adresse de courriel a déjà un compte. Connecte-toi en tapant ton adresse "
    + "à la place du pseudo, ou utilise « Mot de passe oublié » : le courriel que tu recevras te "
    + "rappellera ton pseudo.";

  // ── Une inscription précédente avec cette adresse ? ──
  // Supabase ne crée pas de second compte pour une adresse déjà inscrite
  // mais jamais confirmée : il renvoie le premier, avec son ANCIEN mot de
  // passe. Sans ce contrôle, la personne croyait s'être réinscrite avec un
  // nouveau pseudo et un nouveau mot de passe, alors que rien n'avait
  // changé — et l'ancienne version de cette fonction supprimait même le
  // compte en croyant nettoyer.
  const { data: lignes, error: eLect } = await admin
    .from("pseudos").select("user_id").eq("courriel", email).limit(5);
  if (eLect) return json({ erreur: "Inscription impossible pour l'instant. Réessaie dans un moment." }, 500);
  // Au plus 20 inscriptions par adresse IP en 15 minutes (anti-robots).
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "inconnue";
  try {
    const { data: n } = await admin.rpc("compter_tentative", { p_cle: "insc-ip:" + ip });
    if ((Number(n) || 0) > 20) return json({ erreur: "Trop d'inscriptions depuis ce réseau. Patiente 15 minutes, puis réessaie." }, 429);
  } catch (_e) { /* compteur indisponible : on continue */ }

  for (const l of lignes ?? []) {
    const { data: u } = await admin.auth.admin.getUserById(l.user_id);
    const existant = u?.user ?? null;
    if (existant && existant.email_confirmed_at) {
      return json({ erreur: DEJA_UN_COMPTE }, 409);
    }
    // Une inscription de moins d'une heure, pas encore confirmée : on ne la
    // supprime pas (sinon n'importe qui pourrait effacer celle d'une autre
    // personne en se réinscrivant avec son adresse). On invite à ouvrir
    // l'e-mail déjà envoyé.
    if (existant && Date.now() - Date.parse(existant.created_at || "") < 3_600_000) {
      return json({ erreur: "Une inscription avec cette adresse attend déjà sa confirmation. Ouvre l'e-mail reçu "
        + "(pense aux courriers indésirables) et clique sur « Confirmer mon adresse ». Sans e-mail, réessaie dans une heure." }, 409);
    }
    // Inscription jamais confirmée : le compte n'a jamais pu servir. On le
    // retire pour que la nouvelle inscription reparte proprement, avec le
    // pseudo et le mot de passe qui viennent d'être choisis.
    if (existant) await admin.auth.admin.deleteUser(l.user_id);
    else await admin.from("pseudos").delete().eq("user_id", l.user_id);
  }

  // La création du compte passe par la voie normale (anon key), pour que
  // Supabase envoie lui-même le courriel de confirmation avec le modèle
  // réglé dans le projet. Le prénom et le pseudo voyagent avec le compte :
  // c'est ce qui permet au courriel de dire « Bienvenue, Marie ».
  const anon = createClient(url, anonKey);
  // L'attestation d'âge est gardée, datée, avec le compte : c'est la trace
  // de ce que la personne a déclaré en s'inscrivant.
  const donnees: Record<string, string> = { pseudo, age_atteste_le: new Date().toISOString() };
  if (prenom) donnees.prenom = prenom;
  const inscrire = () => anon.auth.signUp({
    email, password: motDePasse, options: { emailRedirectTo, data: donnees },
  });
  let { data, error } = await inscrire();
  if (error) return json({ erreur: error.message }, 400);

  // Une adresse déjà enregistrée et confirmée renvoie un « succès » sans
  // identité : c'est le signal officiel de Supabase pour ce cas.
  if (!data.user || (data.user.identities && data.user.identities.length === 0)) {
    return json({ erreur: DEJA_UN_COMPTE }, 409);
  }

  // Un compte en attente de confirmation, sans pseudo (reste d'un essai
  // interrompu) : Supabase vient de le renvoyer tel quel, avec son ancien
  // mot de passe. On le remplace par une inscription neuve.
  const anciennete = (d: string | undefined) => (d ? Date.now() - Date.parse(d) : 0);
  if (!data.user.email_confirmed_at && anciennete(data.user.created_at) > 60_000) {
    await admin.auth.admin.deleteUser(data.user.id);
    ({ data, error } = await inscrire());
    if (error) return json({ erreur: error.message }, 400);
    if (!data.user) return json({ erreur: "Inscription impossible pour l'instant. Réessaie dans un moment." }, 500);
  }

  const { error: eRes } = await admin.from("pseudos").insert({
    user_id: data.user.id, pseudo, pseudo_cle: pseudo, courriel: email,
    prenom: prenom || null, nom: nom || null, date_naissance: dateNaissance || null,
    ville: ville || null, pays: pays || null, type_activite: typeActivite || null,
  });
  if (eRes) {
    // On ne détruit QUE le compte créé à l'instant par cet appel : jamais un
    // compte qui existait avant. Ainsi, pas de compte orphelin sans pseudo,
    // et aucun risque d'effacer celui de quelqu'un.
    const creeALInstant = !data.user.email_confirmed_at && anciennete(data.user.created_at) < 60_000;
    if (creeALInstant) await admin.auth.admin.deleteUser(data.user.id);
    const message = eRes.message || "";
    if (/pseudo_cle/i.test(message)) return json({ erreur: "Ce pseudo est déjà pris." }, 409);
    if (/duplicate|unique/i.test(message)) return json({ erreur: DEJA_UN_COMPTE }, 409);
    return json({ erreur: "Inscription impossible pour l'instant. Réessaie dans un moment." }, 500);
  }

  return json({ inscrite: true });
});
