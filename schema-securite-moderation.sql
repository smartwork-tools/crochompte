-- ═══════════════════════════════════════════════════════════════════════════
-- Crochompte — sécurité et modération (V37)
-- À coller dans Supabase : menu « SQL Editor », puis « Run ».
-- À exécuter APRÈS tous les autres fichiers schema*.sql. Rejouable.
--
-- 1. DROITS D'EXÉCUTION. Supabase donne par défaut le droit d'exécuter
--    toute fonction à « anon » (visiteur non connecté). On le retire partout
--    où il n'a pas de raison d'être.
-- 2. search_path figé sur « public, pg_temp » pour toutes les fonctions qui
--    s'exécutent avec des droits élevés : une table temporaire ne peut plus
--    se faire passer pour une vraie table.
-- 3. PURGE AUTOMATIQUE des tentatives de connexion (adresses IP, e-mails) :
--    elles ne sont gardées que 24 heures.
-- 4. MODÉRATION DE LA BIBLIOTHÈQUE, conforme à l'esprit du règlement
--    européen sur les services numériques (DSA) :
--    - un signalement est MOTIVÉ (catégorie + explication) ;
--    - 3 signalements ne suppriment plus rien : ils mettent le patron « en
--      revue » (il reste visible) ; seul un danger manifeste ou un contenu
--      illicite signalé par 2 personnes le MASQUE provisoirement ;
--    - la décision (maintenir ou retirer) est prise par une personne, avec
--      un motif, et enregistrée ; l'autrice voit l'état et peut contester ;
--    - un patron retiré ne peut pas être republié à l'identique ;
--    - le nom d'autrice ne peut pas être le pseudo d'une autre personne.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Droits d'exécution ────────────────────────────────────────────────
do $$
declare f text;
begin
  foreach f in array array[
    'public.mon_profil()', 'public.mon_pseudo()',
    'public.modifier_mon_profil(text, text, date, text, text, text)',
    'public.purger_versions()', 'public.signaler_patron(uuid)',
    'public.prochain_numero_facture(int, int)',
    'public.emettre_facture(int, int, text, text, jsonb)']
  loop
    begin
      execute format('revoke execute on function %s from public, anon', f);
    exception when undefined_function then null;
    end;
  end loop;
  foreach f in array array['public.compter_tentative(text)', 'public.purger_tentatives()']
  loop
    begin
      execute format('revoke execute on function %s from public, anon, authenticated', f);
    exception when undefined_function then null;
    end;
  end loop;
end $$;

-- ─── 2. search_path des fonctions à droits élevés ─────────────────────────
do $$
declare r record;
begin
  for r in select p.oid::regprocedure as sig
             from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.prosecdef
  loop
    execute format('alter function %s set search_path = public, pg_temp', r.sig);
  end loop;
end $$;

-- ─── 3. Tentatives : jamais plus de 24 heures ─────────────────────────────
create or replace function public.tentatives_purge_auto()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- À chaque série d'ajouts : la table ne contient que quelques lignes par
  -- personne active, la purge ne coûte presque rien.
  delete from public.tentatives where depuis < now() - interval '24 hours';
  return null;
end;
$$;
do $$
begin
  if to_regclass('public.tentatives') is not null then
    execute 'drop trigger if exists tentatives_purge_auto on public.tentatives';
    execute 'create trigger tentatives_purge_auto after insert on public.tentatives
             for each statement execute function public.tentatives_purge_auto()';
  end if;
end $$;
revoke all on function public.tentatives_purge_auto() from public, anon, authenticated;

-- ─── 4. Modération de la bibliothèque ─────────────────────────────────────
alter table public.patrons_publics add column if not exists en_revue boolean not null default false;
alter table public.patrons_publics add column if not exists masque   boolean not null default false;
alter table public.patrons_publics add column if not exists decision text;          -- 'maintenu' | 'retire'
alter table public.patrons_publics add column if not exists decision_motif text;
alter table public.patrons_publics add column if not exists decision_le timestamptz;
alter table public.patrons_publics add column if not exists empreinte text;         -- md5 du texte, pour les republications

alter table public.patrons_signalements add column if not exists motif  text;
alter table public.patrons_signalements add column if not exists detail text;

create table if not exists public.moderation_contestations (
  id         bigserial primary key,
  patron_id  uuid not null references public.patrons_publics (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  texte      text not null check (char_length(trim(texte)) between 10 and 2000),
  cree       timestamptz not null default now(),
  traitee_le timestamptz
);
alter table public.moderation_contestations enable row level security;
revoke all on table public.moderation_contestations from anon, authenticated;

-- Lecture : un patron masqué ou retiré n'est visible que de son autrice.
drop policy if exists "tout le monde lit les patrons partagés" on public.patrons_publics;
create policy "tout le monde lit les patrons partagés"
  on public.patrons_publics for select
  to authenticated
  using ( (retire = false and masque = false) or user_id = (select auth.uid()) );

-- Signaler, avec un motif. L'ancienne version (sans motif) reste appelable
-- par une application pas encore mise à jour : le motif vaut alors « autre ».
create or replace function public.signaler_patron(p_id uuid, p_motif text, p_detail text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  moi uuid := auth.uid();
  total integer;
  graves integer;
begin
  if moi is null then raise exception 'Il faut être connectée pour signaler un patron.'; end if;
  if p_motif is null or p_motif not in ('droits','illicite','dangereux','trompeur','autre') then
    raise exception 'Motif de signalement invalide.';
  end if;
  if p_detail is null or char_length(trim(p_detail)) < 10 or char_length(p_detail) > 1000 then
    raise exception 'Explique en quelques mots (10 à 1000 caractères) ce qui pose problème.';
  end if;
  if not exists (select 1 from public.patrons_publics where id = p_id) then return 'introuvable'; end if;
  if exists (select 1 from public.patrons_publics where id = p_id and user_id = moi) then return 'le_tien'; end if;

  insert into public.patrons_signalements (patron_id, user_id, motif, detail)
  values (p_id, moi, p_motif, trim(p_detail))
  on conflict (patron_id, user_id) do update set motif = excluded.motif, detail = excluded.detail;

  select count(*), count(*) filter (where motif in ('illicite','dangereux'))
    into total, graves
    from public.patrons_signalements where patron_id = p_id;
  perform set_config('crochompte.moderation', 'oui', true);   -- autorise la mise à jour ci-dessous (voir le garde-fou)

  -- Tant qu'une décision « maintenu » n'a pas été prise après ces signalements.
  update public.patrons_publics
     set signalements = total,
         en_revue = en_revue or total >= 3 or graves >= 1,
         masque   = masque or (graves >= 2 and coalesce(decision, '') <> 'maintenu')
   where id = p_id;
  perform set_config('crochompte.moderation', '', true);
  return 'recu';
end;
$$;
revoke all on function public.signaler_patron(uuid, text, text) from public, anon;
grant execute on function public.signaler_patron(uuid, text, text) to authenticated;

create or replace function public.signaler_patron(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.signaler_patron(p_id, 'autre', 'Signalement sans précision (ancienne version de l''application).');
end;
$$;
revoke all on function public.signaler_patron(uuid) from public, anon;
grant execute on function public.signaler_patron(uuid) to authenticated;

-- L'autrice conteste un masquage ou un retrait.
create or replace function public.contester_moderation(p_id uuid, p_texte text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare moi uuid := auth.uid();
begin
  if moi is null then raise exception 'Connexion requise'; end if;
  if not exists (select 1 from public.patrons_publics where id = p_id and user_id = moi) then
    raise exception 'Ce patron n''est pas le tien.';
  end if;
  if (select count(*) from public.moderation_contestations where patron_id = p_id and traitee_le is null) >= 1 then
    raise exception 'Ta contestation est déjà en cours d''examen.';
  end if;
  insert into public.moderation_contestations (patron_id, user_id, texte) values (p_id, moi, trim(p_texte));
end;
$$;
revoke all on function public.contester_moderation(uuid, text) from public, anon;
grant execute on function public.contester_moderation(uuid, text) to authenticated;

-- DÉCISION : réservée à l'administratrice, depuis le SQL Editor de Supabase
-- (jamais depuis l'application). Exemples :
--   select public.decider_moderation('id-du-patron', 'maintenu', 'Patron original, signalement non fondé.');
--   select public.decider_moderation('id-du-patron', 'retire',   'Reproduction d''un patron vendu par une autre créatrice.');
create or replace function public.decider_moderation(p_id uuid, p_decision text, p_motif text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if current_user in ('anon', 'authenticated') or auth.uid() is not null then
    raise exception 'Décision réservée à l''administration (SQL Editor).';
  end if;
  if p_decision not in ('maintenu', 'retire') then raise exception 'Décision invalide'; end if;
  if p_motif is null or char_length(trim(p_motif)) < 10 then raise exception 'Un motif est obligatoire.'; end if;
  update public.patrons_publics
     set decision = p_decision, decision_motif = trim(p_motif), decision_le = now(),
         en_revue = false,
         masque = false,
         retire = (p_decision = 'retire')
   where id = p_id;
  update public.moderation_contestations set traitee_le = now() where patron_id = p_id and traitee_le is null;
end;
$$;
revoke all on function public.decider_moderation(uuid, text, text) from public, anon, authenticated;

-- Liste de travail de l'administratrice (SQL Editor) :
create or replace view public.moderation_a_traiter as
  select p.id, p.titre, p.auteur_affiche, p.signalements, p.en_revue, p.masque, p.retire, p.decision,
         (select string_agg(s.motif || ' : ' || coalesce(s.detail, ''), E'\n' order by s.cree)
            from public.patrons_signalements s where s.patron_id = p.id) as signalements_detail,
         (select string_agg(c.texte, E'\n' order by c.cree)
            from public.moderation_contestations c where c.patron_id = p.id and c.traitee_le is null) as contestations
    from public.patrons_publics p
   where p.en_revue or p.masque
      or exists (select 1 from public.moderation_contestations c where c.patron_id = p.id and c.traitee_le is null);
revoke all on public.moderation_a_traiter from public, anon, authenticated;

-- Deux vérifications utilisées à l'ajout ET à la modification. Elles lisent
-- des lignes que l'utilisatrice ne voit pas (pseudos des autres, patrons
-- retirés), d'où « security definer » ; elles ne renvoient qu'un oui/non.
create or replace function public.nom_auteur_pris(p_nom text, p_uid uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.pseudos where lower(pseudo) = lower(trim(p_nom)) and user_id <> p_uid);
$$;
create or replace function public.empreinte_retiree(p_emp text, p_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.patrons_publics where retire and empreinte = p_emp and id <> coalesce(p_id, '00000000-0000-0000-0000-000000000000'::uuid));
$$;
revoke all on function public.nom_auteur_pris(text, uuid) from public, anon, authenticated;
revoke all on function public.empreinte_retiree(text, uuid) from public, anon, authenticated;

-- Garde-fou (remplace celui de schema-signalements.sql) : l'autrice garde la
-- main sur son texte, pas sur la modération.
create or replace function public.patrons_publics_garde()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.empreinte := md5(lower(regexp_replace(new.texte, '\s+', ' ', 'g')));
  -- Écriture venant de l'application (une utilisatrice connectée), et non de
  -- l'administration ou d'une fonction de modération.
  if auth.uid() is not null and current_setting('crochompte.moderation', true) is distinct from 'oui' then
    new.signalements   := old.signalements;
    new.en_revue       := old.en_revue;
    new.masque         := old.masque;
    new.decision       := old.decision;
    new.decision_motif := old.decision_motif;
    new.decision_le    := old.decision_le;
    new.user_id        := old.user_id;
    if old.retire then new.retire := true; end if;
    if new.auteur_affiche is distinct from old.auteur_affiche and public.nom_auteur_pris(new.auteur_affiche, old.user_id) then
      raise exception 'auteur_pseudo_autre';
    end if;
    if new.empreinte is distinct from old.empreinte and public.empreinte_retiree(new.empreinte, old.id) then
      raise exception 'patron_retire_republie';
    end if;
  end if;
  new.maj := now();
  return new;
end;
$$;

-- Publication : pas de republication à l'identique d'un patron retiré, et
-- pas de nom d'autrice emprunté au pseudo d'une autre personne.
create or replace function public.patrons_publics_avant_ajout()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.empreinte := md5(lower(regexp_replace(new.texte, '\s+', ' ', 'g')));
  if public.empreinte_retiree(new.empreinte, null) then
    raise exception 'patron_retire_republie';
  end if;
  if public.nom_auteur_pris(new.auteur_affiche, new.user_id) then
    raise exception 'auteur_pseudo_autre';
  end if;
  -- Un compte ne peut pas noyer la bibliothèque : 300 patrons au plus.
  if auth.uid() is not null
     and (select count(*) from public.patrons_publics where user_id = new.user_id) >= 300 then
    raise exception 'trop_de_patrons';
  end if;
  -- Une publication venant de l'application part toujours « propre » : elle
  -- ne peut pas arriver déjà marquée « maintenu » ou « non signalée ».
  if auth.uid() is not null then
    new.signalements := 0; new.en_revue := false; new.masque := false; new.retire := false;
    new.decision := null; new.decision_motif := null; new.decision_le := null;
  end if;
  return new;
end;
$$;
drop trigger if exists patrons_publics_avant_ajout on public.patrons_publics;
create trigger patrons_publics_avant_ajout
  before insert on public.patrons_publics
  for each row execute function public.patrons_publics_avant_ajout();

-- Une autrice ne peut plus supprimer un patron retiré par décision (pour le
-- republier) : la décision et sa trace restent.
drop policy if exists "chacune retire ses patrons" on public.patrons_publics;
create policy "chacune retire ses patrons"
  on public.patrons_publics for delete
  to authenticated
  using ( (select auth.uid()) = user_id and retire = false and masque = false and en_revue = false );

update public.patrons_publics set empreinte = md5(lower(regexp_replace(texte, '\s+', ' ', 'g'))) where empreinte is null;


-- ─── 5. Date de naissance : plus conservée ────────────────────────────────
-- Elle ne servait qu'à vérifier l'âge à l'inscription. Les dates déjà
-- enregistrées sont effacées, et un garde-fou empêche d'en réenregistrer.
update public.pseudos set date_naissance = null where date_naissance is not null;
create or replace function public.pseudos_sans_naissance()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin new.date_naissance := null; return new; end; $$;
drop trigger if exists pseudos_sans_naissance on public.pseudos;
create trigger pseudos_sans_naissance before insert or update on public.pseudos
  for each row execute function public.pseudos_sans_naissance();
-- La contrainte d'âge minimum portait sur cette date : l'âge est désormais
-- attesté à l'inscription (case « 15 ans ou plus », horodatée avec le compte).
alter table public.pseudos drop constraint if exists pseudos_age_minimum;


-- ─── 6. Limites de taille ─────────────────────────────────────────────────
-- Un atelier (ou une version gardée) de plus de 25 Mo est refusé : c'est des
-- centaines de fois un atelier réel, et cela protège le projet d'un abus.
-- Les photos : 10 Mo au plus par fichier, images seulement.
create or replace function public.atelier_taille_max()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if pg_column_size(new.donnees) > 25 * 1024 * 1024 then
    raise exception 'atelier_trop_gros';
  end if;
  return new;
end; $$;
drop trigger if exists atelier_taille_max on public.ateliers;
create trigger atelier_taille_max before insert or update on public.ateliers
  for each row execute function public.atelier_taille_max();
drop trigger if exists atelier_taille_max on public.ateliers_versions;
create trigger atelier_taille_max before insert or update on public.ateliers_versions
  for each row execute function public.atelier_taille_max();
revoke execute on function public.atelier_taille_max() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'storage' and table_name = 'buckets' and column_name = 'file_size_limit') then
    execute $q$update storage.buckets
               set file_size_limit = 10485760,
                   allowed_mime_types = array['image/jpeg','image/png','image/webp']
             where id = 'photos'$q$;
  end if;
end $$;
