\set ON_ERROR_STOP 0
-- Abonnement, codes cadeaux, administration, envoi atomique (V55).
-- Chaque ligne « attendu » dit ce qu'on doit lire ; un test qui échoue affiche
-- une valeur différente ou une ERREUR là où « OK attendu » est écrit.
insert into auth.users values ('00000000-0000-0000-0000-0000000000a1','admin@x.fr'),
                              ('00000000-0000-0000-0000-0000000000b1','bea@x.fr'),
                              ('00000000-0000-0000-0000-0000000000c1','cam@x.fr') on conflict do nothing;
insert into public.admins (user_id, note) values ('00000000-0000-0000-0000-0000000000a1', 'test') on conflict do nothing;

-- 1. Un compte neuf est en essai, 14 jours, accès ouvert.
set role authenticated; select set_config('test.uid','00000000-0000-0000-0000-0000000000b1',false);
select 'B essai (statut essai, acces true, jours 14 attendus)' t,
       a->>'statut' statut, a->>'acces' acces, a->>'jours_restants' jours, a->>'admin' admin
  from public.mon_abonnement() a;

-- 2. L'essai se termine : accès fermé.
reset role;
update public.abonnements set essai_fin = now() - interval '1 hour' where user_id = '00000000-0000-0000-0000-0000000000b1';
set role authenticated; select set_config('test.uid','00000000-0000-0000-0000-0000000000b1',false);
select 'B essai fini (statut expire, acces false attendus)' t, a->>'statut' statut, a->>'acces' acces from public.mon_abonnement() a;

-- 3. B n'est pas administratrice : refus.
select 'B admin_stats (ERREUR attendue)' t;
select public.admin_stats();
select 'B admin_creer_code (ERREUR attendue)' t;
select public.admin_creer_code(30, 1, 'x');

-- 4. anon ne peut rien appeler.
set role anon;
select 'anon mon_abonnement (ERREUR attendue)' t;
select public.mon_abonnement();
select 'anon utiliser_code (ERREUR attendue)' t;
select public.utiliser_code('CROCHET-AAAA-BBBB');
reset role;

-- 5. L'administrateur crée un code de 30 jours, à usage unique.
set role authenticated; select set_config('test.uid','00000000-0000-0000-0000-0000000000a1',false);
select 'A est admin (true attendu)' t, public.est_admin();
select 'A stats (OK attendu)' t, public.admin_stats() - 'inscrits_30j' stats;
create temp table t_code as select public.admin_creer_code(30, 1, 'test 30 jours') as code;
select 'code au format CROCHET-XXXX-XXXX (true attendu)' t, code ~ '^CROCHET-[A-Z2-9]{4}-[A-Z2-9]{4}$' from t_code;

-- 6. B saisit le code (même en minuscules, avec des espaces) : 30 jours offerts.
select set_config('test.uid','00000000-0000-0000-0000-0000000000b1',false);
select 'B utilise le code (ok true, jours 30 attendus)' t, r->>'ok' ok, r->'abonnement'->>'statut' statut,
       r->'abonnement'->>'acces' acces, r->'abonnement'->>'jours_restants' jours
  from public.utiliser_code((select lower(' ' || code || ' ') from t_code)) r;
select 'B réutilise le code (code_deja_utilise attendu)' t, r->>'erreur' from public.utiliser_code((select code from t_code)) r;
select 'code inconnu (code_inconnu attendu)' t, r->>'erreur' from public.utiliser_code('CROCHET-ZZZZ-ZZZZ') r;

-- 7. C ne peut pas utiliser un code épuisé.
select set_config('test.uid','00000000-0000-0000-0000-0000000000c1',false);
select 'C code épuisé (code_epuise attendu)' t, r->>'erreur' from public.utiliser_code((select code from t_code)) r;

-- 8. Le temps offert s'ajoute à un essai en cours : C (essai 14 j) + code 10 j = 24 j.
select set_config('test.uid','00000000-0000-0000-0000-0000000000a1',false);
create temp table t_code2 as select public.admin_creer_code(10, 5, 'dix jours') as code;
select set_config('test.uid','00000000-0000-0000-0000-0000000000c1',false);
select 'C essai + 10 j (jours 24 attendus)' t, r->'abonnement'->>'jours_restants' jours, r->'abonnement'->>'statut' statut
  from public.utiliser_code((select code from t_code2)) r;

-- 9. L'administrateur offre l'accès illimité à B, puis le retire.
select set_config('test.uid','00000000-0000-0000-0000-0000000000a1',false);
select 'A offre illimité à B (ok true attendu)' t, r->>'ok' from public.admin_offrir('BEA@x.fr', null) r;
select set_config('test.uid','00000000-0000-0000-0000-0000000000b1',false);
select 'B illimité (offert, illimite true attendus)' t, a->>'statut', a->>'illimite' from public.mon_abonnement() a;
select set_config('test.uid','00000000-0000-0000-0000-0000000000a1',false);
select 'A retire (ok true attendu)' t, r->>'ok' from public.admin_retirer('bea@x.fr') r;
select set_config('test.uid','00000000-0000-0000-0000-0000000000b1',false);
select 'B après retrait (expire, acces false attendus)' t, a->>'statut', a->>'acces' from public.mon_abonnement() a;
select 'A offre à une inconnue (compte_inconnu attendu)' t;
select set_config('test.uid','00000000-0000-0000-0000-0000000000a1',false);
select r->>'erreur' from public.admin_offrir('personne@x.fr', 30) r;
select 'A liste des comptes (3 lignes au moins attendues)' t, count(*) >= 3 from public.admin_comptes('');
select 'A recherche bea (1 attendu)' t, count(*) from public.admin_comptes('bea');
select 'A codes (2 au moins attendus)' t, count(*) >= 2 from public.admin_codes();
select 'A désactive un code (OK attendu)' t; select public.admin_desactiver_code((select code from t_code2));
select set_config('test.uid','00000000-0000-0000-0000-0000000000b1',false);
select 'B code désactivé (code_inconnu attendu)' t, r->>'erreur' from public.utiliser_code((select code from t_code2)) r;

-- 10. B ne peut pas modifier sa ligne d'abonnement directement.
select 'B update abonnements (0 ligne ou ERREUR attendue)' t;
update public.abonnements set statut = 'offert', fin = null where user_id = '00000000-0000-0000-0000-0000000000b1';
select 'B lit son abonnement (1 attendu)' t, count(*) from public.abonnements where user_id = '00000000-0000-0000-0000-0000000000b1';
select 'B lit celui de C (0 attendu)' t, count(*) from public.abonnements where user_id = '00000000-0000-0000-0000-0000000000c1';

-- 11. L'administrateur a toujours accès.
reset role;
update public.abonnements set statut = 'expire', essai_fin = now() - interval '1 day' where user_id = '00000000-0000-0000-0000-0000000000a1';
set role authenticated; select set_config('test.uid','00000000-0000-0000-0000-0000000000a1',false);
select 'A expiré mais admin (acces true attendu)' t, a->>'acces' from public.mon_abonnement() a;

-- 12. Envoi atomique de l'atelier.
select set_config('test.uid','00000000-0000-0000-0000-0000000000c1',false);
create temp table t_env as select public.enregistrer_atelier('{"creations":[1]}'::jsonb, null, 'test') r;
select 'C premier envoi (archive null attendu)' t, r->>'archive' archive from t_env;
select 'C envoi avec la bonne base (archive null attendu)' t, r->>'archive' archive
  from public.enregistrer_atelier('{"creations":[1,2]}'::jsonb, (select (r->>'maj')::timestamptz from t_env), 'test') r;
select 'C envoi avec une base périmée (archive non null attendu)' t, (r->>'archive') is not null archive
  from public.enregistrer_atelier('{"creations":[9]}'::jsonb, (select (r->>'maj')::timestamptz from t_env), 'test') r;
select 'C version archivée remplacee (1 attendu)' t, count(*) from public.ateliers_versions
  where user_id = '00000000-0000-0000-0000-0000000000c1' and raison = 'remplacee' and donnees = '{"creations":[1,2]}'::jsonb;
select 'C atelier en ligne (creations [9] attendu)' t, donnees from public.ateliers where user_id = '00000000-0000-0000-0000-0000000000c1';

-- 13. Plafond de 30 versions par compte.
reset role;
insert into public.ateliers_versions (user_id, donnees, maj, raison)
  select '00000000-0000-0000-0000-0000000000c1', '{}'::jsonb, now() - (i || ' minutes')::interval, 'remplacee' from generate_series(1, 40) i;
select 'C versions plafonnées (30 attendu)' t, count(*) from public.ateliers_versions where user_id = '00000000-0000-0000-0000-0000000000c1';
