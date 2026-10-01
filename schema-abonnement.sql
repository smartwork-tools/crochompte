-- ═══════════════════════════════════════════════════════════════════════════
-- Crochompte — abonnement, codes cadeaux, administration (V55)
-- À coller dans Supabase : menu « SQL Editor », puis « Run ». Rejouable.
-- À exécuter APRÈS tous les autres fichiers schema*.sql.
--
-- Ce que ce fichier met en place :
--   1. abonnements : une ligne par compte. Un compte neuf est en ESSAI pendant
--      14 jours (créée automatiquement à l'inscription ; les comptes existants
--      reçoivent leurs 14 jours au moment où ce fichier est exécuté).
--   2. codes_cadeaux : un code = une durée offerte (ou l'accès illimité),
--      un nombre d'utilisations. Karim les crée depuis l'application
--      (Réglages › Administration) ; n'importe qui peut en saisir un dans
--      Réglages › Mon abonnement.
--   3. admins : qui a accès au panneau d'administration. Un administrateur a
--      toujours accès à l'application, sans abonnement.
--   4. Fonctions appelées par l'application (mon_abonnement, utiliser_code) et
--      par le panneau d'administration (admin_*). Toutes vérifient qui appelle.
--   5. enregistrer_atelier : envoi de l'atelier en UNE transaction (archive +
--      remplacement), pour que deux appareils ne s'écrasent jamais sans trace.
--   6. Plafond serveur de l'historique des versions (30 par compte).
--
-- Le paiement (Stripe) n'écrit rien ici directement : la fonction serveur
-- supabase/functions/stripe-webhook met la ligne à jour avec la clé service.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Tables ────────────────────────────────────────────────────────────
create table if not exists public.abonnements (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  statut             text not null default 'essai'
                     check (statut in ('essai', 'actif', 'offert', 'expire', 'resilie')),
  essai_fin          timestamptz not null default now() + interval '14 days',
  fin                timestamptz,                 -- fin de la période payée ou offerte ; null + 'offert' = illimité
  offre              text,                        -- 'mensuel' | 'semestriel' | 'annuel' | 'cadeau'
  stripe_client      text,
  stripe_abonnement  text,
  code_utilise       text,
  annulation_prevue  boolean not null default false,
  cree               timestamptz not null default now(),
  maj                timestamptz not null default now()
);
comment on table public.abonnements is 'Accès de chaque compte : essai de 14 jours, abonnement payé, accès offert.';

create table if not exists public.admins (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  note     text,
  cree     timestamptz not null default now()
);

create table if not exists public.codes_cadeaux (
  code              text primary key,
  duree_jours       int,                          -- null = accès illimité
  utilisations_max  int not null default 1 check (utilisations_max >= 1),
  utilisations      int not null default 0,
  actif             boolean not null default true,
  note              text,
  expire_le         timestamptz,                  -- le code lui-même ne peut plus être saisi après
  cree_par          uuid references auth.users (id) on delete set null,
  cree              timestamptz not null default now()
);

create table if not exists public.codes_utilisations (
  code     text not null references public.codes_cadeaux (code) on delete cascade,
  user_id  uuid not null references auth.users (id) on delete cascade,
  quand    timestamptz not null default now(),
  primary key (code, user_id)
);

-- ─── 2. Sécurité des tables : personne n'écrit directement ───────────────
alter table public.abonnements        enable row level security;
alter table public.admins             enable row level security;
alter table public.codes_cadeaux      enable row level security;
alter table public.codes_utilisations enable row level security;

revoke all on table public.abonnements, public.admins, public.codes_cadeaux, public.codes_utilisations from anon, authenticated;
grant select on table public.abonnements to authenticated;

drop policy if exists "chacune lit son abonnement" on public.abonnements;
create policy "chacune lit son abonnement"
  on public.abonnements for select
  to authenticated
  using ( (select auth.uid()) = user_id );

-- ─── 3. Qui est administrateur ──────────────────────────────────────────
create or replace function public.est_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke execute on function public.est_admin() from public, anon;
grant execute on function public.est_admin() to authenticated;

-- Karim est administrateur. Ajoute d'autres adresses sur le même modèle.
insert into public.admins (user_id, note)
select id, 'propriétaire' from auth.users where lower(email) = lower('karimfarhani01@gmail.com')
on conflict (user_id) do nothing;

-- ─── 4. Un essai à chaque inscription ────────────────────────────────────
create or replace function public.abonnement_a_l_inscription()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.abonnements (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists abonnement_a_l_inscription on auth.users;
create trigger abonnement_a_l_inscription
  after insert on auth.users
  for each row execute function public.abonnement_a_l_inscription();

-- Les comptes déjà existants : 14 jours d'essai à partir de maintenant.
insert into public.abonnements (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- ─── 5. Ce que l'application demande ─────────────────────────────────────
-- L'état de l'abonnement de la personne connectée, avec le verdict « accès ».
create or replace function public.mon_abonnement()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  a public.abonnements%rowtype;
  acces boolean;
  jours int;
  adm boolean;
begin
  if auth.uid() is null then raise exception 'non authentifiée'; end if;
  insert into public.abonnements (user_id) values (auth.uid()) on conflict (user_id) do nothing;
  select * into a from public.abonnements where user_id = auth.uid();
  adm := public.est_admin();

  -- Un essai ou une période payée qui se termine passe en « expiré ».
  if a.statut = 'essai' and a.essai_fin <= now() then
    update public.abonnements set statut = 'expire', maj = now() where user_id = a.user_id;
    a.statut := 'expire';
  elsif a.statut in ('actif', 'offert', 'resilie') and a.fin is not null and a.fin <= now() then
    update public.abonnements set statut = 'expire', maj = now() where user_id = a.user_id;
    a.statut := 'expire';
  end if;

  acces := adm
        or (a.statut = 'essai' and a.essai_fin > now())
        or (a.statut in ('actif', 'resilie') and a.fin is not null and a.fin > now())
        or (a.statut = 'offert' and (a.fin is null or a.fin > now()));

  jours := case
    when a.statut = 'essai' then greatest(0, ceil(extract(epoch from (a.essai_fin - now())) / 86400)::int)
    when a.fin is not null then greatest(0, ceil(extract(epoch from (a.fin - now())) / 86400)::int)
    else null end;

  return jsonb_build_object(
    'statut', a.statut,
    'acces', acces,
    'admin', adm,
    'essai_fin', a.essai_fin,
    'fin', a.fin,
    'offre', a.offre,
    'jours_restants', jours,
    'illimite', (a.statut = 'offert' and a.fin is null) or adm,
    'annulation_prevue', a.annulation_prevue,
    'stripe', a.stripe_abonnement is not null,
    'code_utilise', a.code_utilise
  );
end;
$$;
revoke execute on function public.mon_abonnement() from public, anon;
grant execute on function public.mon_abonnement() to authenticated;

-- Saisir un code cadeau. Le temps offert s'AJOUTE à ce qui reste (essai ou
-- abonnement en cours) ; un code illimité donne l'accès pour toujours.
create or replace function public.utiliser_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  c public.codes_cadeaux%rowtype;
  a public.abonnements%rowtype;
  code_norm text;
  depart timestamptz;
begin
  if auth.uid() is null then raise exception 'non authentifiée'; end if;
  code_norm := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if length(code_norm) < 6 then
    return jsonb_build_object('ok', false, 'erreur', 'code_inconnu');
  end if;
  select * into c from public.codes_cadeaux
   where upper(regexp_replace(code, '[^A-Za-z0-9]', '', 'g')) = code_norm
   for update;
  if not found or not c.actif then
    return jsonb_build_object('ok', false, 'erreur', 'code_inconnu');
  end if;
  if c.expire_le is not null and c.expire_le <= now() then
    return jsonb_build_object('ok', false, 'erreur', 'code_expire');
  end if;
  if exists (select 1 from public.codes_utilisations where code = c.code and user_id = auth.uid()) then
    return jsonb_build_object('ok', false, 'erreur', 'code_deja_utilise');
  end if;
  if c.utilisations >= c.utilisations_max then
    return jsonb_build_object('ok', false, 'erreur', 'code_epuise');
  end if;

  insert into public.abonnements (user_id) values (auth.uid()) on conflict (user_id) do nothing;
  select * into a from public.abonnements where user_id = auth.uid() for update;

  if c.duree_jours is null then
    update public.abonnements
       set statut = 'offert', fin = null, offre = 'cadeau', code_utilise = c.code, maj = now()
     where user_id = auth.uid();
  else
    -- point de départ : la fin de ce qui reste, sinon maintenant
    depart := now();
    if a.statut = 'essai' and a.essai_fin > now() then depart := a.essai_fin; end if;
    if a.statut in ('actif', 'offert', 'resilie') and a.fin is not null and a.fin > now() then depart := greatest(depart, a.fin); end if;
    update public.abonnements
       set statut = case when a.statut = 'actif' then 'actif' else 'offert' end,
           fin = depart + make_interval(days => c.duree_jours),
           offre = case when a.statut = 'actif' then a.offre else 'cadeau' end,
           code_utilise = c.code, maj = now()
     where user_id = auth.uid();
  end if;

  update public.codes_cadeaux set utilisations = utilisations + 1 where code = c.code;
  insert into public.codes_utilisations (code, user_id) values (c.code, auth.uid());

  return jsonb_build_object('ok', true, 'duree_jours', c.duree_jours, 'abonnement', public.mon_abonnement());
end;
$$;
revoke execute on function public.utiliser_code(text) from public, anon;
grant execute on function public.utiliser_code(text) to authenticated;

-- ─── 6. Le panneau d'administration ──────────────────────────────────────
create or replace function public.admin_stats()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.est_admin() then raise exception 'réservé aux administrateurs'; end if;
  return jsonb_build_object(
    'comptes',      (select count(*) from auth.users),
    'essai',        (select count(*) from public.abonnements where statut = 'essai' and essai_fin > now()),
    'actifs',       (select count(*) from public.abonnements where statut in ('actif', 'resilie') and fin > now()),
    'offerts',      (select count(*) from public.abonnements where statut = 'offert' and (fin is null or fin > now())),
    'expires',      (select count(*) from public.abonnements where statut = 'expire'
                        or (statut = 'essai' and essai_fin <= now())
                        or (statut in ('actif', 'resilie', 'offert') and fin is not null and fin <= now())),
    'inscrits_30j', (select count(*) from auth.users where created_at > now() - interval '30 days'),
    'codes_actifs', (select count(*) from public.codes_cadeaux where actif and utilisations < utilisations_max)
  );
end;
$$;

create or replace function public.admin_comptes(p_recherche text default '')
returns table (
  user_id uuid, email text, pseudo text, cree timestamptz, derniere_connexion timestamptz,
  statut text, essai_fin timestamptz, fin timestamptz, offre text, code_utilise text, admin boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.est_admin() then raise exception 'réservé aux administrateurs'; end if;
  return query
    select u.id, u.email::text, p.pseudo::text, u.created_at, u.last_sign_in_at,
           a.statut, a.essai_fin, a.fin, a.offre, a.code_utilise,
           exists (select 1 from public.admins ad where ad.user_id = u.id)
      from auth.users u
      left join public.abonnements a on a.user_id = u.id
      left join public.pseudos p on p.user_id = u.id
     where p_recherche = '' or u.email ilike '%' || p_recherche || '%' or p.pseudo ilike '%' || p_recherche || '%'
     order by u.created_at desc
     limit 300;
end;
$$;

-- Offrir du temps (ou l'accès illimité si p_jours est null) à une adresse.
create or replace function public.admin_offrir(p_email text, p_jours int)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid;
  a public.abonnements%rowtype;
  depart timestamptz;
begin
  if not public.est_admin() then raise exception 'réservé aux administrateurs'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then return jsonb_build_object('ok', false, 'erreur', 'compte_inconnu'); end if;
  insert into public.abonnements (user_id) values (uid) on conflict (user_id) do nothing;
  select * into a from public.abonnements where user_id = uid for update;
  if p_jours is null then
    update public.abonnements set statut = 'offert', fin = null, offre = 'cadeau', maj = now() where user_id = uid;
  else
    depart := now();
    if a.statut = 'essai' and a.essai_fin > now() then depart := a.essai_fin; end if;
    if a.statut in ('actif', 'offert', 'resilie') and a.fin is not null and a.fin > now() then depart := greatest(depart, a.fin); end if;
    update public.abonnements
       set statut = case when a.statut = 'actif' then 'actif' else 'offert' end,
           fin = depart + make_interval(days => p_jours),
           offre = case when a.statut = 'actif' then a.offre else 'cadeau' end, maj = now()
     where user_id = uid;
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- Retirer un accès offert (retour à l'état « expiré » si rien d'autre ne court).
create or replace function public.admin_retirer(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare uid uuid;
begin
  if not public.est_admin() then raise exception 'réservé aux administrateurs'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then return jsonb_build_object('ok', false, 'erreur', 'compte_inconnu'); end if;
  update public.abonnements
     set statut = case when statut = 'offert' then 'expire' else statut end,
         fin = case when statut = 'offert' then now() else fin end, maj = now()
   where user_id = uid;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_codes()
returns setof public.codes_cadeaux
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.est_admin() then raise exception 'réservé aux administrateurs'; end if;
  return query select * from public.codes_cadeaux order by cree desc limit 300;
end;
$$;

-- Crée un code lisible : CROCHET-XXXX-XXXX (sans 0/O ni 1/I).
create or replace function public.admin_creer_code(p_duree_jours int, p_max int default 1, p_note text default '', p_expire_le timestamptz default null)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  c text;
  i int;
  tentative int := 0;
begin
  if not public.est_admin() then raise exception 'réservé aux administrateurs'; end if;
  loop
    c := 'CROCHET-';
    for i in 1..8 loop
      c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
      if i = 4 then c := c || '-'; end if;
    end loop;
    begin
      insert into public.codes_cadeaux (code, duree_jours, utilisations_max, note, expire_le, cree_par)
      values (c, p_duree_jours, greatest(1, coalesce(p_max, 1)), left(coalesce(p_note, ''), 120), p_expire_le, auth.uid());
      return c;
    exception when unique_violation then
      tentative := tentative + 1;
      if tentative > 5 then raise; end if;
    end;
  end loop;
end;
$$;

create or replace function public.admin_desactiver_code(p_code text, p_actif boolean default false)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.est_admin() then raise exception 'réservé aux administrateurs'; end if;
  update public.codes_cadeaux set actif = p_actif where code = p_code;
end;
$$;

revoke execute on function public.admin_stats() from public, anon;
revoke execute on function public.admin_comptes(text) from public, anon;
revoke execute on function public.admin_offrir(text, int) from public, anon;
revoke execute on function public.admin_retirer(text) from public, anon;
revoke execute on function public.admin_codes() from public, anon;
revoke execute on function public.admin_creer_code(int, int, text, timestamptz) from public, anon;
revoke execute on function public.admin_desactiver_code(text, boolean) from public, anon;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.admin_comptes(text) to authenticated;
grant execute on function public.admin_offrir(text, int) to authenticated;
grant execute on function public.admin_retirer(text) to authenticated;
grant execute on function public.admin_codes() to authenticated;
grant execute on function public.admin_creer_code(int, int, text, timestamptz) to authenticated;
grant execute on function public.admin_desactiver_code(text, boolean) to authenticated;

-- ─── 7. Envoi de l'atelier en une seule transaction ──────────────────────
-- L'application envoie l'atelier et la version qu'elle connaissait. Si la
-- version en ligne n'est pas celle-là, elle est archivée AVANT d'être
-- remplacée, dans la même transaction : deux appareils ne peuvent plus
-- s'écraser sans trace. Renvoie {maj, archive}.
create or replace function public.enregistrer_atelier(p_donnees jsonb, p_maj_connue timestamptz, p_appareil text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  courant public.ateliers%rowtype;
  archive timestamptz := null;
  nouveau timestamptz := now();
begin
  if auth.uid() is null then raise exception 'non authentifiée'; end if;
  if pg_column_size(p_donnees) > 25 * 1024 * 1024 then raise exception 'atelier_trop_gros'; end if;
  select * into courant from public.ateliers where user_id = auth.uid() for update;
  if found then
    if p_maj_connue is null or courant.maj is distinct from p_maj_connue then
      insert into public.ateliers_versions (user_id, donnees, maj, appareil, raison)
      values (auth.uid(), courant.donnees, courant.maj, left(coalesce(p_appareil, ''), 40), 'remplacee');
      archive := courant.maj;
    end if;
    update public.ateliers set donnees = p_donnees, maj = nouveau where user_id = auth.uid()
      returning maj into nouveau;
  else
    insert into public.ateliers (user_id, donnees, maj) values (auth.uid(), p_donnees, nouveau)
      returning maj into nouveau;
  end if;
  return jsonb_build_object('maj', nouveau, 'archive', archive);
end;
$$;
revoke execute on function public.enregistrer_atelier(jsonb, timestamptz, text) from public, anon;
grant execute on function public.enregistrer_atelier(jsonb, timestamptz, text) to authenticated;

-- ─── 8. Plafond serveur de l'historique : 30 versions par compte ─────────
create or replace function public.ateliers_versions_plafond()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.ateliers_versions
   where user_id = new.user_id
     and id not in (select id from public.ateliers_versions where user_id = new.user_id order by cree desc limit 30);
  return null;
end;
$$;
drop trigger if exists ateliers_versions_plafond on public.ateliers_versions;
create trigger ateliers_versions_plafond
  after insert on public.ateliers_versions
  for each row execute function public.ateliers_versions_plafond();

-- Cohérence avec purger_versions (30 partout).
create or replace function public.purger_versions()
returns void
language sql
security definer
set search_path = public, pg_temp
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
