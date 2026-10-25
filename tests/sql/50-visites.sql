-- V66.4 — compteur de visites sans cookies (schema-visites.sql).
-- À lancer après le socle et les schémas (voir LISEZMOI.md), puis schema-visites.sql.
-- Chaque ligne affiche « conforme » ou « ÉCART ».
\set ON_ERROR_STOP off
set client_min_messages = notice;

-- 1. Un visiteur non connecté peut compter, et seulement des valeurs prévues
set role anon;
select public.compter_visite('accueil', 'tiktok');
select public.compter_visite('accueil', 'tiktok');
select public.compter_visite('demo', 'Instagram');
select public.compter_visite('accueil', 'site-inconnu');
select public.compter_visite('inscrit', null);
select public.compter_visite('piratage', 'tiktok');     -- ignoré
reset role;

select case when nombre = 2 then 'conforme' else 'ÉCART' end || ' : deux visites TikTok additionnées' as verif
  from public.visites_jour where evenement = 'accueil' and source = 'tiktok';
select case when count(*) = 1 then 'conforme' else 'ÉCART' end || ' : provenance mise en minuscules (instagram)' as verif
  from public.visites_jour where evenement = 'demo' and source = 'instagram';
select case when count(*) = 1 then 'conforme' else 'ÉCART' end || ' : provenance inconnue rangée dans « autre »' as verif
  from public.visites_jour where source = 'autre';
select case when count(*) = 1 then 'conforme' else 'ÉCART' end || ' : provenance vide = « direct »' as verif
  from public.visites_jour where evenement = 'inscrit' and source = 'direct';
select case when count(*) = 0 then 'conforme' else 'ÉCART' end || ' : événement inconnu ignoré' as verif
  from public.visites_jour where evenement not in ('accueil', 'demo', 'creer', 'inscrit');

-- 2. Personne ne lit ni n'écrit la table directement depuis le navigateur
set role anon;
do $$ begin
  perform 1 from public.visites_jour;
  raise notice 'ÉCART : anon lit la table';
exception when insufficient_privilege then raise notice 'conforme : anon ne lit pas la table';
end $$;
do $$ begin
  insert into public.visites_jour (evenement, source, nombre) values ('accueil', 'direct', 1000);
  raise notice 'ÉCART : anon écrit dans la table';
exception when insufficient_privilege then raise notice 'conforme : anon n''écrit pas dans la table';
end $$;
reset role;
set role authenticated;
do $$ begin
  update public.visites_jour set nombre = 0;
  raise notice 'ÉCART : un compte modifie les totaux';
exception when insufficient_privilege then raise notice 'conforme : un compte ne modifie pas les totaux';
end $$;
reset role;

-- 3. Aucune colonne ne peut contenir de donnée personnelle
select case when string_agg(column_name, ',' order by column_name) = 'evenement,jour,nombre,source'
            then 'conforme' else 'ÉCART' end || ' : seulement jour, événement, provenance, nombre' as verif
  from information_schema.columns where table_schema = 'public' and table_name = 'visites_jour';
