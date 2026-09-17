-- ═══════════════════════════════════════════════════════════════════════════
-- Crochompte — schéma de base
-- À coller dans Supabase : menu « SQL Editor », puis « Run ».
--
-- Principe : un atelier par compte, et personne d'autre ne peut le lire.
-- La sécurité n'est pas dans l'application, elle est dans la base : même si
-- quelqu'un forgeait une requête à la main, il ne verrait que ses lignes.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 1. La table des ateliers
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.ateliers (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  donnees  jsonb       not null default '{}'::jsonb,
  maj      timestamptz not null default now(),
  cree     timestamptz not null default now()
);

comment on table  public.ateliers is
  'Un atelier par compte : réglages, matières, créations, patrons.';
comment on column public.ateliers.donnees is
  'État complet de l''application, tel que l''application le sérialise.';
comment on column public.ateliers.maj is
  'Horodatage du dernier envoi. Sert à détecter qu''un autre appareil a écrit.';

alter table public.ateliers enable row level security;

revoke all on table public.ateliers from anon, authenticated;
grant select, insert, update, delete on table public.ateliers to authenticated;

-- Une politique par action, comme le recommande Supabase.
drop policy if exists "chacun lit son atelier"      on public.ateliers;
drop policy if exists "chacun crée son atelier"     on public.ateliers;
drop policy if exists "chacun modifie son atelier"  on public.ateliers;
drop policy if exists "chacun supprime son atelier" on public.ateliers;

create policy "chacun lit son atelier"
  on public.ateliers for select
  to authenticated
  using ( (select auth.uid()) = user_id );

create policy "chacun crée son atelier"
  on public.ateliers for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

-- « using » empêche de modifier la ligne d'un autre ;
-- « with check » empêche de réattribuer sa propre ligne à quelqu'un d'autre.
create policy "chacun modifie son atelier"
  on public.ateliers for update
  to authenticated
  using      ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "chacun supprime son atelier"
  on public.ateliers for delete
  to authenticated
  using ( (select auth.uid()) = user_id );

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Le stockage des photos
-- ─────────────────────────────────────────────────────────────────────────
-- Chaque compte écrit dans un dossier qui porte son identifiant :
--   photos/<user_id>/<identifiant de photo>.jpg
-- Les politiques comparent le premier segment du chemin à l'identifiant du
-- compte connecté.

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists "photos : lecture de son dossier"     on storage.objects;
drop policy if exists "photos : dépôt dans son dossier"     on storage.objects;
drop policy if exists "photos : remplacement dans son dossier" on storage.objects;
drop policy if exists "photos : suppression dans son dossier"  on storage.objects;

create policy "photos : lecture de son dossier"
  on storage.objects for select
  to authenticated
  using ( bucket_id = 'photos'
          and (storage.foldername(name))[1] = (select auth.uid())::text );

create policy "photos : dépôt dans son dossier"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'photos'
               and (storage.foldername(name))[1] = (select auth.uid())::text );

create policy "photos : remplacement dans son dossier"
  on storage.objects for update
  to authenticated
  using      ( bucket_id = 'photos'
               and (storage.foldername(name))[1] = (select auth.uid())::text )
  with check ( bucket_id = 'photos'
               and (storage.foldername(name))[1] = (select auth.uid())::text );

create policy "photos : suppression dans son dossier"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'photos'
          and (storage.foldername(name))[1] = (select auth.uid())::text );

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Vérification
-- ─────────────────────────────────────────────────────────────────────────
-- Après exécution, ces deux requêtes doivent renvoyer des lignes.

-- select tablename, policyname, cmd from pg_policies where tablename = 'ateliers';
-- select id, public from storage.buckets where id = 'photos';
