-- ═══════════════════════════════════════════════════════════════════════════
-- Crochompte — historique des versions de l'atelier
-- À coller dans Supabase : menu « SQL Editor », puis « Run ».
-- Rejouable sans risque.
--
-- POURQUOI CE FICHIER EXISTE
-- Jusqu'ici, quand deux appareils avaient travaillé chacun de leur côté,
-- l'application refusait d'envoyer pour ne pas écraser. Conséquence réelle :
-- l'appareil bloqué ne pouvait PLUS JAMAIS enregistrer, et le seul bouton
-- proposé (« Récupérer depuis le serveur ») écrasait son travail. Quoi qu'elle
-- fasse, l'artisane perdait quelque chose.
--
-- Le principe change : on n'empêche plus jamais d'enregistrer. Avant chaque
-- écrasement, l'état remplacé est archivé ici. Le dernier envoi gagne — c'est
-- ce que tout le monde attend — mais plus rien ne disparaît définitivement.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.ateliers_versions (
  id       bigint generated always as identity primary key,
  user_id  uuid not null references auth.users (id) on delete cascade,
  donnees  jsonb not null,
  maj      timestamptz not null,          -- horodatage de l'état archivé
  appareil text,                          -- indice pour s'y retrouver
  raison   text,                          -- 'remplacee' | 'avant_recuperation'
  cree     timestamptz not null default now()
);

comment on table public.ateliers_versions is
  'États successifs de l''atelier, archivés avant remplacement. Filet de '
  'sécurité : aucune écriture ne doit jamais faire disparaître du travail.';

create index if not exists ateliers_versions_compte
  on public.ateliers_versions (user_id, cree desc);

alter table public.ateliers_versions enable row level security;

revoke all on table public.ateliers_versions from anon, authenticated;
grant select, insert, delete on table public.ateliers_versions to authenticated;

drop policy if exists "chacune lit ses versions"     on public.ateliers_versions;
drop policy if exists "chacune archive ses versions" on public.ateliers_versions;
drop policy if exists "chacune purge ses versions"   on public.ateliers_versions;

create policy "chacune lit ses versions"
  on public.ateliers_versions for select
  to authenticated
  using ( (select auth.uid()) = user_id );

create policy "chacune archive ses versions"
  on public.ateliers_versions for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "chacune purge ses versions"
  on public.ateliers_versions for delete
  to authenticated
  using ( (select auth.uid()) = user_id );

-- ─────────────────────────────────────────────────────────────────────────
-- Ne garder que les 20 dernières versions par compte.
-- Un historique sans limite finirait par peser plus lourd que l'atelier
-- lui-même, pour un bénéfice nul : au-delà de quelques jours, personne ne
-- restaure une version. La fonction est appelée après chaque archivage.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.purger_versions()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.ateliers_versions
   where user_id = auth.uid()
     and id not in (
       select id from public.ateliers_versions
        where user_id = auth.uid()
        order by cree desc
        limit 20
     );
$$;

revoke all on function public.purger_versions() from public;
grant execute on function public.purger_versions() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Vérification
-- ─────────────────────────────────────────────────────────────────────────
-- select count(*) from public.ateliers_versions where user_id = auth.uid();
