\set ON_ERROR_STOP 0
-- Limites de taille (atelier) et de publication (300 patrons par compte).
insert into auth.users values ('00000000-0000-0000-0000-0000000000f1','f1@x.fr') on conflict do nothing;
set role authenticated; select set_config('test.uid','00000000-0000-0000-0000-0000000000f1',false);
select 'F1 atelier normal (OK attendu)' t;
insert into public.ateliers(user_id, donnees) values ('00000000-0000-0000-0000-0000000000f1', '{"creations":[]}'::jsonb)
  on conflict (user_id) do update set donnees = excluded.donnees;
select 'F1 atelier de 30 Mo (refus atelier_trop_gros attendu)' t;
update public.ateliers set donnees = jsonb_build_object('x', (select string_agg(md5(i::text), '') from generate_series(1, 1000000) i))
  where user_id = '00000000-0000-0000-0000-0000000000f1';
select 'F1 taille gardée (petite attendue)' t, pg_column_size(donnees) < 1000000 as petite from public.ateliers
  where user_id = '00000000-0000-0000-0000-0000000000f1';
reset role;
-- 300 patrons déjà publiés : le 301e est refusé.
insert into public.patrons_publics (user_id, titre, auteur_affiche, texte, licence, droits_declares)
  select '00000000-0000-0000-0000-0000000000f1', 'Patron ' || i, 'Autrice F1',
         'Texte du patron numéro ' || i || repeat(' rang de mailles serrées', 5), 'CC BY 4.0', true
  from generate_series(1, 300) i;
set role authenticated; select set_config('test.uid','00000000-0000-0000-0000-0000000000f1',false);
select 'F1 301e patron (refus trop_de_patrons attendu)' t;
insert into public.patrons_publics (user_id, titre, auteur_affiche, texte, licence, droits_declares)
  values ('00000000-0000-0000-0000-0000000000f1', 'De trop', 'Autrice F1', 'Texte du patron de trop' || repeat(' rang de mailles serrées', 5), 'CC BY 4.0', true);
reset role;
select 'patrons de F1 (300 attendu)' t, count(*) from public.patrons_publics where user_id = '00000000-0000-0000-0000-0000000000f1';
