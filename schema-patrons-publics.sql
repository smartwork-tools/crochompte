-- ═══════════════════════════════════════════════════════════════════════════
-- Crochompte — bibliothèque de patrons partagés
-- À coller dans Supabase : menu « SQL Editor », puis « Run ».
-- Ce fichier peut être rejoué sans risque s'il a déjà été exécuté.
--
-- PRINCIPE, ET POURQUOI IL EST STRICT
-- Une utilisatrice peut choisir de rendre SON patron visible par les autres.
-- À partir de là, tu héberges du contenu écrit par des tiers : c'est une
-- responsabilité réelle. Trois garde-fous sont donc inscrits dans la base
-- elle-même, pas seulement dans l'application :
--   1. Seul le texte est publiable. Jamais les pages scannées : un scan est
--      presque toujours la reproduction d'un patron acheté, donc une
--      contrefaçon, et la base n'a aucun moyen de le vérifier.
--   2. La déclaration de droits est obligatoire et horodatée. Sans elle, la
--      ligne ne peut pas exister (contrainte NOT NULL + CHECK).
--   3. Chacune ne peut écrire, modifier et retirer que SES patrons. Personne
--      ne peut toucher à celui d'une autre, ni republier ce qui a été retiré.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.patrons_publics (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  titre           text not null,
  auteur_affiche  text not null,            -- pseudo ou nom de plume choisi
  famille         text,                     -- ami, bebe, mode, maison, vegetal, fete
  niveau          smallint,                 -- 1 facile, 2 intermédiaire, 3 exigeant
  materiel        text,                     -- fil, crochet, dimensions finies
  texte           text not null,            -- le patron lui-même
  notes           text,
  licence         text not null default 'CC BY-NC-SA 4.0',
  droits_declares boolean not null,         -- « je suis l'autrice / je détiens les droits »
  droits_le       timestamptz not null default now(),
  signalements    integer not null default 0,
  retire          boolean not null default false,
  cree            timestamptz not null default now(),
  maj             timestamptz not null default now()
);

comment on table public.patrons_publics is
  'Patrons que leurs autrices ont choisi de partager. Texte uniquement : '
  'aucune page scannée, pour ne pas héberger de reproduction de patron acheté.';

-- La déclaration de droits ne peut pas être fausse : sans elle, pas de ligne.
alter table public.patrons_publics drop constraint if exists patrons_publics_droits;
alter table public.patrons_publics add constraint patrons_publics_droits
  check (droits_declares = true);

-- Un patron vide ou un titre vide n'a rien à faire dans une bibliothèque.
alter table public.patrons_publics drop constraint if exists patrons_publics_contenu;
alter table public.patrons_publics add constraint patrons_publics_contenu
  check (char_length(trim(titre)) between 2 and 120
     and char_length(trim(texte)) >= 80
     and char_length(texte) <= 40000
     and char_length(coalesce(notes,'')) <= 8000
     and char_length(coalesce(materiel,'')) <= 2000
     and char_length(trim(auteur_affiche)) between 2 and 60);

alter table public.patrons_publics drop constraint if exists patrons_publics_niveau;
alter table public.patrons_publics add constraint patrons_publics_niveau
  check (niveau is null or niveau between 1 and 3);

-- Les licences proposées à la publication. Toutes autorisent le partage ;
-- elles diffèrent sur l'usage commercial et l'obligation de partager à
-- l'identique. L'autrice choisit, l'application explique.
alter table public.patrons_publics drop constraint if exists patrons_publics_licence;
alter table public.patrons_publics add constraint patrons_publics_licence
  check (licence in ('CC BY 4.0', 'CC BY-SA 4.0', 'CC BY-NC 4.0', 'CC BY-NC-SA 4.0', 'CC0'));

create index if not exists patrons_publics_visibles
  on public.patrons_publics (cree desc) where retire = false;

alter table public.patrons_publics enable row level security;

revoke all on table public.patrons_publics from anon, authenticated;
grant select, insert, update, delete on table public.patrons_publics to authenticated;

drop policy if exists "tout le monde lit les patrons partagés" on public.patrons_publics;
drop policy if exists "chacune publie ses patrons"            on public.patrons_publics;
drop policy if exists "chacune modifie ses patrons"           on public.patrons_publics;
drop policy if exists "chacune retire ses patrons"            on public.patrons_publics;

-- Lecture : toute personne connectée voit les patrons partagés non retirés.
-- C'est le seul endroit de l'application où une ligne d'une autre personne
-- est lisible — et c'est exactement ce que son autrice a demandé.
create policy "tout le monde lit les patrons partagés"
  on public.patrons_publics for select
  to authenticated
  using ( retire = false or user_id = (select auth.uid()) );

create policy "chacune publie ses patrons"
  on public.patrons_publics for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "chacune modifie ses patrons"
  on public.patrons_publics for update
  to authenticated
  using      ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "chacune retire ses patrons"
  on public.patrons_publics for delete
  to authenticated
  using ( (select auth.uid()) = user_id );

-- ─────────────────────────────────────────────────────────────────────────
-- Signaler un patron : la fonction est définie dans schema-signalements.sql
-- (un signalement par personne et par patron, pas le sien). Elle n'est plus
-- redéfinie ici : rejouer ce fichier ne doit pas rétablir l'ancienne version,
-- qui permettait à une seule personne de faire retirer n'importe quel patron.
-- ─────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────
-- Vérification
-- ─────────────────────────────────────────────────────────────────────────
-- select policyname, cmd from pg_policies where tablename = 'patrons_publics';
-- select count(*) from public.patrons_publics where retire = false;
