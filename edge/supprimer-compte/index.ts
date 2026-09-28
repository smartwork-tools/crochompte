// ═══════════════════════════════════════════════════════════════════════════
// Effacement définitif d'un compte — fonction serveur (Supabase Edge Function)
//
// Pourquoi une fonction serveur : supprimer une IDENTITÉ de connexion demande
// un droit d'administration, et cette clé ne doit jamais se trouver dans un
// navigateur. L'atelier et les photos, eux, sont effacés par l'application
// elle-même : les règles de la base l'y autorisent pour ses propres lignes.
//
// Déploiement :
//   supabase functions deploy supprimer-compte
// (la clé SUPABASE_SERVICE_ROLE_KEY est fournie automatiquement par Supabase)
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

  // Et seulement ensuite, avec le droit d'administration, on efface CE compte.
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
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
