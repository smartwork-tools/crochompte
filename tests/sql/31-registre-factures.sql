\set ON_ERROR_STOP 0
insert into auth.users values ('00000000-0000-0000-0000-0000000000e1','e1@x.fr'),('00000000-0000-0000-0000-0000000000e2','e2@x.fr') on conflict do nothing;
set role authenticated; select set_config('test.uid','00000000-0000-0000-0000-0000000000e1',false);
select 'E1 facture' t, public.emettre_facture(2026, 0, 'facture', 'k1', '{"total":40}'::jsonb);
select 'E1 avoir' t, public.emettre_facture(2026, 0, 'avoir', 'k1', '{"total":-40}'::jsonb);
select 'E1 grand numéro' t, public.emettre_facture(2026, 12345, 'facture', 'k2', '{}'::jsonb);
select 'E1 lit ses factures' t, count(*) from public.factures;
select 'E1 modifie (doit échouer)' t; update public.factures set donnees='{}'::jsonb;
select 'E1 supprime (doit échouer)' t; delete from public.factures;
select 'E1 insère en direct (doit échouer)' t; insert into public.factures(user_id,numero,donnees) values ('00000000-0000-0000-0000-0000000000e1','X','{}');
select 'E1 type hostile (doit échouer)' t, public.emettre_facture(2026, 0, 'autre', null, '{}'::jsonb);
select set_config('test.uid','00000000-0000-0000-0000-0000000000e2',false);
select 'E2 voit les factures de E1 (0 attendu)' t, count(*) from public.factures;
reset role; set role anon; select set_config('test.uid','',false);
select 'anon (doit échouer)' t, public.emettre_facture(2026, 0, 'facture', null, '{}'::jsonb);
reset role;
select numero, type, commande, donnees->>'numero' from public.factures order by emise_le;
