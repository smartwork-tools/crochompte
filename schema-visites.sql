-- ═══════════════════════════════════════════════════════════════════════════
-- Crochompte — compteur de visites sans cookies (V66.4)
-- À coller dans Supabase : menu « SQL Editor », puis « Run ».
-- Peut être rejoué sans risque.
--
-- Ce que ça compte, par jour et par provenance, en simples totaux :
--   accueil  : la page d'accueil a été vue
--   demo     : l'atelier de démonstration a été ouvert
--   creer    : le formulaire « Créer un compte » a été ouvert
--   inscrit  : une inscription a abouti
-- Provenances possibles : direct, tiktok, instagram, linkedin, facebook, autre.
--
-- Ce que ça ne garde JAMAIS : ni adresse IP, ni identifiant de personne, ni
-- cookie, ni parcours d'une page à l'autre. Une ligne = « tel jour, tel
-- événement, telle provenance : N fois ». Aucune donnée personnelle, donc
-- aucun bandeau de consentement à afficher pour ce compteur.
--
-- Exception assumée à la règle de schema-securite-moderation.sql (aucune
-- fonction ouverte aux visiteurs non connectés) : compter_visite doit
-- pouvoir être appelée avant toute connexion. Elle ne fait qu'ajouter 1 à un
-- total, n'accepte que des valeurs d'une liste fermée, et ne lit rien.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.visites_jour (
  jour       date    not null default current_date,
  evenement  text    not null,
  source     text    not null default 'direct',
  nombre     integer not null default 0,
  primary key (jour, evenement, source),
  constraint visites_evenement_verif check (evenement in ('accueil', 'demo', 'creer', 'inscrit')),
  constraint visites_source_verif check (source in ('direct', 'tiktok', 'instagram', 'linkedin', 'facebook', 'autre'))
);

comment on table public.visites_jour is
  'Totaux anonymes de visites par jour, événement et provenance. Aucune donnée personnelle.';

alter table public.visites_jour enable row level security;
-- Aucune politique : personne ne lit ni n'écrit la table directement depuis
-- le navigateur. Seule la fonction ci-dessous y ajoute 1 ; toi, tu la lis
-- depuis le SQL Editor (accès administrateur).
revoke all on table public.visites_jour from anon, authenticated;

create or replace function public.compter_visite(p_evenement text, p_source text default 'direct')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s text := lower(coalesce(nullif(trim(p_source), ''), 'direct'));
begin
  if p_evenement is null or p_evenement not in ('accueil', 'demo', 'creer', 'inscrit') then
    return;
  end if;
  if s not in ('direct', 'tiktok', 'instagram', 'linkedin', 'facebook') then
    s := 'autre';
  end if;
  insert into public.visites_jour (jour, evenement, source, nombre)
  values ((now() at time zone 'Europe/Paris')::date, p_evenement, s, 1)
  on conflict (jour, evenement, source)
  do update set nombre = public.visites_jour.nombre + 1;
end;
$$;

revoke all on function public.compter_visite(text, text) from public;
grant execute on function public.compter_visite(text, text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Pour lire les chiffres (à coller dans le SQL Editor quand tu veux) :
-- ─────────────────────────────────────────────────────────────────────────
-- Les 14 derniers jours, par jour :
--   select jour, evenement, source, nombre
--   from public.visites_jour
--   where jour >= current_date - 13
--   order by jour desc, evenement, source;
--
-- Le parcours de la semaine, par provenance (accueil → démo → créer → inscrit) :
--   select source,
--          sum(nombre) filter (where evenement = 'accueil') as accueil,
--          sum(nombre) filter (where evenement = 'demo')    as demo,
--          sum(nombre) filter (where evenement = 'creer')   as creer,
--          sum(nombre) filter (where evenement = 'inscrit') as inscrit
--   from public.visites_jour
--   where jour >= current_date - 6
--   group by source
--   order by accueil desc nulls last;
