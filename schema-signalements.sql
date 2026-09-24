-- ═══════════════════════════════════════════════════════════════════════════
-- Crochompte — signalements des patrons partagés, version renforcée
-- À coller dans Supabase : menu « SQL Editor », puis « Run ».
-- Rejouable sans risque. À exécuter APRÈS schema-patrons-publics.sql.
--
-- DEUX TROUS BOUCHÉS
--
-- 1. Une seule personne pouvait faire retirer n'importe quel patron : il
--    suffisait d'appeler trois fois « signaler ». Désormais, chaque compte ne
--    compte qu'une fois par patron, et on ne peut pas signaler le sien.
--    Trois signalements = trois personnes différentes.
--
-- 2. L'autrice d'un patron retiré pouvait le remettre en ligne elle-même, et
--    remettre son compteur à zéro : la règle « chacune modifie ses patrons »
--    lui ouvrait toutes les colonnes de sa ligne. Un garde-fou dans la base
--    l'en empêche désormais.
-- ═══════════════════════════════════════════════════════════════════════════

-- Qui a signalé quoi. Une ligne par personne et par patron, jamais plus.
create table if not exists public.patrons_signalements (
  patron_id uuid not null references public.patrons_publics (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  cree      timestamptz not null default now(),
  primary key (patron_id, user_id)
);

comment on table public.patrons_signalements is
  'Un signalement par compte et par patron. Personne ne lit ni n''écrit '
  'directement ici : seule la fonction signaler_patron y ajoute des lignes.';

alter table public.patrons_signalements enable row level security;
revoke all on table public.patrons_signalements from anon, authenticated;
-- Aucune règle d'accès : la table est fermée à tout le monde, sauf à la
-- fonction ci-dessous.

-- ─────────────────────────────────────────────────────────────────────────
-- Signaler : même nom et même appel qu'avant, l'application ne change pas.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.signaler_patron(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  moi uuid := auth.uid();
  total integer;
begin
  if moi is null then
    raise exception 'Il faut être connectée pour signaler un patron.';
  end if;

  -- On ne signale pas son propre patron.
  if exists (select 1 from patrons_publics where id = p_id and user_id = moi) then
    return;
  end if;

  -- Un deuxième signalement de la même personne ne compte pas.
  insert into patrons_signalements (patron_id, user_id)
  values (p_id, moi)
  on conflict do nothing;

  select count(*) into total from patrons_signalements where patron_id = p_id;

  update patrons_publics
     set signalements = total,
         retire = retire or total >= 3      -- retrait au 3e signalement distinct
   where id = p_id;
end;
$$;

revoke all on function public.signaler_patron(uuid) from public;
grant execute on function public.signaler_patron(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Garde-fou : l'autrice garde la main sur son texte, pas sur la modération.
-- Quand la modification vient de l'application (rôle « authenticated »), le
-- compteur de signalements ne bouge pas, et un patron retiré par les
-- signalements ne peut pas être remis en ligne. La fonction de signalement,
-- elle, s'exécute avec les droits du propriétaire de la base et n'est pas
-- concernée.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.patrons_publics_garde()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.signalements := old.signalements;
    if old.retire and not new.retire and old.signalements >= 3 then
      new.retire := true;
    end if;
  end if;
  new.maj := now();
  return new;
end;
$$;

drop trigger if exists patrons_publics_garde on public.patrons_publics;
create trigger patrons_publics_garde
  before update on public.patrons_publics
  for each row execute function public.patrons_publics_garde();

-- Remettre les compteurs existants d'aplomb : ceux d'avant pouvaient avoir
-- été gonflés par une seule personne.
update public.patrons_publics pp
   set signalements = (select count(*) from public.patrons_signalements s where s.patron_id = pp.id);

-- ─────────────────────────────────────────────────────────────────────────
-- Vérification
-- ─────────────────────────────────────────────────────────────────────────
-- select tgname from pg_trigger where tgrelid = 'public.patrons_publics'::regclass;
-- select count(*) from public.patrons_signalements;
