-- Complète le socle : ce que fait Supabase par défaut et que socle.sql n'imite pas.
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
-- Privilèges par défaut de Supabase sur le schéma public (tables, fonctions, séquences)
alter default privileges for role postgres in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated, service_role;
grant usage on schema public to service_role;
-- storage : Supabase donne les droits de table à anon/authenticated, la RLS filtre
grant select, insert, update, delete on storage.objects to anon, authenticated;
grant usage on schema storage to anon;
grant usage, select on all sequences in schema storage to anon, authenticated;
insert into auth.users values ('00000000-0000-0000-0000-00000000000c','c@x.fr') on conflict do nothing;
