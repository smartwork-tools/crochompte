/* Réglage de la connexion au serveur.

   La clé ci-dessous est la clé PUBLIABLE du projet Supabase : elle est faite
   pour être dans le navigateur de chaque utilisatrice. Ce n'est pas elle qui
   protège les données — ce sont les règles du schema.sql (row level security).

   Ce n'est PAS la clé « secret » / « service_role » : celle-là contourne
   toutes les règles et ne doit jamais sortir d'un serveur. */

window.CROCHOMPTE_CONFIG = {
  supabaseUrl:     "https://jsmmajntopdozkmzrniy.supabase.co",
  supabaseAnonKey: "sb_publishable_N3ZuPMwQ1zKOijfHkFenWA_jpyHAICC"
};
