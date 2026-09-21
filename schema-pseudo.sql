-- ═══════════════════════════════════════════════════════════════════════════
-- Crochompte — connexion par pseudo + mot de passe, et profil de base
-- À coller APRÈS schema.sql : menu « SQL Editor », puis « Run ».
--
-- Ce fichier peut être recollé et rejoué sans risque si tu l'as déjà exécuté
-- une première fois (par exemple pour ajouter les colonnes de profil à une
-- table « pseudos » qui existait déjà) : chaque instruction est écrite pour
-- ne rien casser si elle est rejouée.
--
-- Principe : Supabase authentifie par adresse de courriel, pas par pseudo.
-- Cette table associe un pseudo — et quelques informations d'identité — à un
-- compte. Elle n'est JAMAIS lisible depuis le navigateur pour le compte d'une
-- AUTRE personne, ni par la clé publique : seules les fonctions serveur
-- (edge/inscription, edge/connexion, edge/mot-de-passe-oublie), avec la clé
-- service_role, et les fonctions « à propos de soi-même » ci-dessous, peuvent
-- la consulter ou la modifier.
-- ═══════════════════════════════════════════════════════════════════════════

-- citext : comparaison de texte insensible à la casse, pour que « LaineEtCie »
-- et « laineetcie » soient reconnus comme le même pseudo.
create extension if not exists citext;

create table if not exists public.pseudos (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  pseudo      text   not null,              -- tel que la personne l'a choisi, pour l'affichage
  pseudo_cle  citext not null unique,       -- comparaison insensible à la casse
  courriel    text   not null,              -- copie technique ; jamais affichée ni exposée
  cree        timestamptz not null default now()
);

-- Informations d'identité demandées à l'inscription (`add column if not
-- exists` : sans danger si la table existait déjà avant cette version).
alter table public.pseudos add column if not exists prenom         text;
alter table public.pseudos add column if not exists nom            text;
alter table public.pseudos add column if not exists date_naissance date;
alter table public.pseudos add column if not exists ville          text;
alter table public.pseudos add column if not exists pays           text;
alter table public.pseudos add column if not exists type_activite  text;

-- Le type d'activité ne peut être que l'une de ces trois valeurs.
alter table public.pseudos drop constraint if exists pseudos_type_activite_verif;
alter table public.pseudos add constraint pseudos_type_activite_verif
  check (type_activite is null or type_activite in ('amateur', 'artisanat', 'entreprise'));

-- Âge minimum : cohérent avec ce qu'annonce confidentialite.html. Vérifié une
-- première fois, avec un message clair, dans edge/inscription — cette
-- contrainte est le filet de sécurité côté base.
alter table public.pseudos drop constraint if exists pseudos_age_minimum;
alter table public.pseudos add constraint pseudos_age_minimum
  check (date_naissance is null or date_naissance <= (current_date - interval '15 years'));

-- Longueurs maximales : cohérentes avec edge/inscription (LONGUEUR_MAX_NOM =
-- 80, LONGUEUR_MAX_LIEU = 100) et les attributs maxlength du formulaire.
-- Sans ce filet, modifier_mon_profil() — un chemin d'écriture distinct de
-- l'inscription — laissait passer des valeurs de longueur illimitée.
alter table public.pseudos drop constraint if exists pseudos_longueur_prenom;
alter table public.pseudos add constraint pseudos_longueur_prenom
  check (prenom is null or char_length(prenom) <= 80);

alter table public.pseudos drop constraint if exists pseudos_longueur_nom;
alter table public.pseudos add constraint pseudos_longueur_nom
  check (nom is null or char_length(nom) <= 80);

alter table public.pseudos drop constraint if exists pseudos_longueur_ville;
alter table public.pseudos add constraint pseudos_longueur_ville
  check (ville is null or char_length(ville) <= 100);

alter table public.pseudos drop constraint if exists pseudos_longueur_pays;
alter table public.pseudos add constraint pseudos_longueur_pays
  check (pays is null or char_length(pays) <= 100);

comment on table public.pseudos is
  'Associe un pseudo et quelques informations d''identité à un compte. '
  'Lecture réservée aux fonctions serveur (service_role) pour la résolution '
  'pseudo/courriel, et à chaque utilisatrice pour ses PROPRES informations '
  'via mon_profil() / modifier_mon_profil() — jamais exposée en clair au '
  'navigateur pour le compte de quelqu''un d''autre.';

alter table public.pseudos enable row level security;

-- Aucune politique select/insert/update/delete pour anon ou authenticated :
-- cette table n'est accessible qu'au serveur et aux fonctions définies
-- ci-dessous, qui filtrent elles-mêmes sur auth.uid().
revoke all on table public.pseudos from anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Vérifier si un pseudo est déjà pris, sans rien révéler d'autre.
-- Sûre à exposer publiquement : ne renvoie qu'un booléen, et sert à
-- prévenir en direct pendant la saisie, comme sur la plupart des sites qui
-- laissent choisir un identifiant.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.pseudo_disponible(p text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1 from public.pseudos where pseudo_cle = p::citext
  );
$$;

revoke all on function public.pseudo_disponible(text) from public;
grant execute on function public.pseudo_disponible(text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Une utilisatrice connectée peut lire SON PROPRE profil — jamais celui
-- d'une autre. Sert à afficher son pseudo, et à préremplir le formulaire de
-- correction de ses informations (droit de rectification, RGPD art. 16).
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.mon_profil()
returns json
language sql
security definer
set search_path = public
stable
as $$
  select to_json(p) from (
    select pseudo, prenom, nom, date_naissance, ville, pays, type_activite
    from public.pseudos
    where user_id = auth.uid()
  ) p;
$$;

revoke all on function public.mon_profil() from public;
grant execute on function public.mon_profil() to authenticated;

-- Conservée pour compatibilité avec un code plus ancien : équivaut à
-- (mon_profil()->>'pseudo').
create or replace function public.mon_pseudo()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select pseudo from public.pseudos where user_id = auth.uid();
$$;

revoke all on function public.mon_pseudo() from public;
grant execute on function public.mon_pseudo() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Une utilisatrice connectée peut corriger SES PROPRES informations —
-- jamais son pseudo ni son adresse de courriel ici : les changer demande de
-- revérifier respectivement l'unicité et l'identité, ce qui n'est pas encore
-- construit. C'est le droit de rectification (RGPD art. 16) pour le reste.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.modifier_mon_profil(
  p_prenom text, p_nom text, p_date_naissance date,
  p_ville text, p_pays text, p_type_activite text
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.pseudos set
    prenom         = nullif(trim(p_prenom), ''),
    nom            = nullif(trim(p_nom), ''),
    date_naissance = p_date_naissance,
    ville          = nullif(trim(p_ville), ''),
    pays           = nullif(trim(p_pays), ''),
    type_activite  = p_type_activite
  where user_id = auth.uid();
$$;

revoke all on function public.modifier_mon_profil(text, text, date, text, text, text) from public;
grant execute on function public.modifier_mon_profil(text, text, date, text, text, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Vérification
-- ─────────────────────────────────────────────────────────────────────────
-- select * from pg_policies where tablename = 'pseudos';          -- doit être vide
-- select proname from pg_proc where proname in
--   ('pseudo_disponible', 'mon_pseudo', 'mon_profil', 'modifier_mon_profil');
