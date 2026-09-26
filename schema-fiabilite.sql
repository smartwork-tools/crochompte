-- ═══════════════════════════════════════════════════════════════════════════
-- Crochompte — fiabilité et sécurité (25 septembre 2026)
-- À coller dans Supabase : menu « SQL Editor », puis « Run ».
-- Rejouable sans risque. À exécuter APRÈS les autres fichiers schema-*.sql.
--
-- 1. L'heure d'enregistrement de l'atelier est fixée par le serveur, plus par
--    l'horloge du téléphone ou de l'ordinateur (une horloge décalée ne peut
--    plus faire passer une version récente pour une ancienne).
-- 2. Limite de tentatives de connexion et de demandes « mot de passe
--    oublié » : empêche d'essayer des mots de passe à l'infini sur un pseudo,
--    ou d'inonder quelqu'un d'e-mails.
-- 3. Bibliothèque partagée : la date de publication et la date de la
--    déclaration de droits ne peuvent plus être modifiées par l'autrice
--    (ni pour épingler un patron en tête, ni pour antidater).
-- 4. L'historique garde 30 versions au lieu de 20.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Heure du serveur ────────────────────────────────────────────────────
create or replace function public.ateliers_heure_serveur()
returns trigger
language plpgsql
as $$
begin
  new.maj := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists ateliers_heure_serveur on public.ateliers;
create trigger ateliers_heure_serveur
  before insert or update on public.ateliers
  for each row execute function public.ateliers_heure_serveur();

-- ── 2. Tentatives ──────────────────────────────────────────────────────────
create table if not exists public.tentatives (
  cle    text primary key,
  n      integer not null,
  depuis timestamptz not null
);
alter table public.tentatives enable row level security;
revoke all on table public.tentatives from anon, authenticated;
-- Aucune règle d'accès : seules les fonctions serveur (clé d'administration)
-- passent, par la fonction ci-dessous.

create or replace function public.compter_tentative(p_cle text)
returns integer
language sql
security definer
set search_path = public
as $$
  insert into tentatives as t (cle, n, depuis) values (p_cle, 1, now())
  on conflict (cle) do update set
    n      = case when t.depuis < now() - interval '15 minutes' then 1 else t.n + 1 end,
    depuis = case when t.depuis < now() - interval '15 minutes' then now() else t.depuis end
  returning n;
$$;
revoke all on function public.compter_tentative(text) from public, anon, authenticated;

-- Ménage : les compteurs de plus d'un jour ne servent plus à rien.
create or replace function public.purger_tentatives()
returns void
language sql
security definer
set search_path = public
as $$
  delete from tentatives where depuis < now() - interval '1 day';
$$;
revoke all on function public.purger_tentatives() from public, anon, authenticated;

-- ── 3. Dates figées dans la bibliothèque partagée ──────────────────────────
create or replace function public.patrons_publics_dates()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.cree := now();
    new.droits_le := now();
  else
    new.cree := old.cree;
    new.droits_le := old.droits_le;
  end if;
  return new;
end;
$$;

drop trigger if exists patrons_publics_dates on public.patrons_publics;
create trigger patrons_publics_dates
  before insert or update on public.patrons_publics
  for each row execute function public.patrons_publics_dates();

-- ── 4. Historique : 30 versions ────────────────────────────────────────────
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
        limit 30
     );
$$;
revoke all on function public.purger_versions() from public;
grant execute on function public.purger_versions() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Vérification (facultatif) :
-- select tgname from pg_trigger where tgrelid = 'public.ateliers'::regclass;
-- select * from public.tentatives limit 5;
