/* Renomme ce fichier en « config.js » et remplis les deux valeurs.
   Tu les trouves dans Supabase : Project Settings → API Keys.

   Prends la clé PUBLIABLE — « sb_publishable_... » dans l'onglet
   « Publishable and secret API keys », ou « anon / public » (eyJ...) dans
   l'onglet « Legacy ». Les deux fonctionnent ; la première est le format
   actuel de Supabase.

   Cette clé est faite pour être publique : elle se retrouve dans le
   navigateur de chaque utilisatrice, c'est son rôle. Ce n'est pas elle qui
   protège les données — ce sont les règles du schema.sql.

   Ce n'est PAS la clé « secret » / « service_role » : celle-là contourne
   toutes les règles de sécurité et ne doit jamais sortir d'un serveur. */

window.CROCHOMPTE_CONFIG = {
  supabaseUrl:     "https://xxxxxxxxxxxx.supabase.co",
  supabaseAnonKey: "sb_publishable_..."
};
