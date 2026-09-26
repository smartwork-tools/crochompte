-- ═══════════════════════════════════════════════════════════════════════════
-- Crochompte — numéros de facture uniques pour tous les comptes
--
-- Chaque compte reçoit, à sa première facture, un CODE de 5 caractères qui
-- n'appartient qu'à lui (garanti par la contrainte UNIQUE). Ses factures se
-- suivent derrière ce code, année par année, sans trou :
--     K7R2M-2026-0001, K7R2M-2026-0002, …
-- Deux créatrices n'auront donc jamais le même numéro de facture.
--
-- Le compteur vit sur le serveur : deux appareils du même compte ne peuvent
-- pas donner deux fois le même numéro (la ligne est verrouillée pendant le
-- calcul). p_min permet de continuer une numérotation déjà commencée sur
-- l'appareil (factures émises avant cette version) sans jamais revenir en
-- arrière.
--
-- À exécuter une fois dans Supabase → SQL Editor. Rejouable sans risque.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.factures_compteurs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code    text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{5}$'),
  annees  jsonb not null default '{}'::jsonb,
  cree    timestamptz not null default now()
);

-- Personne ne lit ni n'écrit cette table directement : tout passe par la
-- fonction ci-dessous, qui ne touche qu'à la ligne de la personne connectée.
alter table public.factures_compteurs enable row level security;
revoke all on table public.factures_compteurs from anon, authenticated;

create or replace function public.prochain_numero_facture(p_annee int, p_min int default 0)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_code    text;
  v_n       int;
  v_lettres constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   -- ni I, O, 0, 1 : illisibles à l'impression
  v_essais  int := 0;
  i         int;
begin
  if v_uid is null then
    raise exception 'Connexion requise';
  end if;
  if p_annee is null or p_annee < 2000 or p_annee > 2100 then
    raise exception 'Année invalide';
  end if;
  if p_min is null or p_min < 0 then p_min := 0; end if;
  if p_min > 999999 then raise exception 'Numéro invalide'; end if;

  -- Première facture du compte : on lui attribue un code libre.
  while not exists (select 1 from factures_compteurs where user_id = v_uid) loop
    v_code := '';
    for i in 1..5 loop
      v_code := v_code || substr(v_lettres, 1 + floor(random() * 32)::int, 1);
    end loop;
    begin
      insert into factures_compteurs (user_id, code) values (v_uid, v_code);
    exception when unique_violation then
      -- code déjà pris par une autre (ou ligne créée au même instant par un
      -- autre appareil du même compte) : on recommence
      v_essais := v_essais + 1;
      if v_essais > 50 then raise exception 'Aucun code libre trouvé, réessaie'; end if;
    end;
  end loop;

  update factures_compteurs
     set annees = jsonb_set(annees, array[p_annee::text],
           to_jsonb(greatest(coalesce((annees ->> p_annee::text)::int, 0), p_min) + 1))
   where user_id = v_uid
  returning code, (annees ->> p_annee::text)::int into v_code, v_n;

  return v_code || '-' || p_annee || '-' || lpad(v_n::text, 4, '0');
end;
$$;

revoke all on function public.prochain_numero_facture(int, int) from public, anon;
grant execute on function public.prochain_numero_facture(int, int) to authenticated;
