\set ON_ERROR_STOP 0
\pset pager off
insert into auth.users values ('00000000-0000-0000-0000-0000000000a1','a1@x.fr'),('00000000-0000-0000-0000-0000000000b1','b1@x.fr'),('00000000-0000-0000-0000-0000000000c1','c1@x.fr'),('00000000-0000-0000-0000-0000000000d1','d1@x.fr') on conflict do nothing;
insert into public.pseudos (user_id,pseudo,pseudo_cle,courriel,date_naissance) values ('00000000-0000-0000-0000-0000000000b1','Alice','Alice','b1@x.fr','2000-01-01') on conflict do nothing;
select 'N1 date de naissance effacée à l''insertion' t, date_naissance is null from public.pseudos where pseudo='Alice';
set role authenticated; select set_config('test.uid','00000000-0000-0000-0000-0000000000a1',false) \g /dev/null
-- V-01 : publier un patron déjà « maintenu » et non signalable
insert into public.patrons_publics (id,user_id,titre,auteur_affiche,texte,droits_declares,decision,signalements)
values ('33333333-3333-3333-3333-333333333333','00000000-0000-0000-0000-0000000000a1','Chat','Autrice A', repeat('Rang 2 : augmentations régulières sur tout le tour. ',3), true,'maintenu',0);
reset role;
select 'V01 décision forcée ignorée' t, decision is null from public.patrons_publics where id='33333333-3333-3333-3333-333333333333';
set role authenticated;
select set_config('test.uid','00000000-0000-0000-0000-0000000000c1',false) \g /dev/null
select public.signaler_patron('33333333-3333-3333-3333-333333333333','illicite','Contenu haineux dans les notes du patron');
select set_config('test.uid','00000000-0000-0000-0000-0000000000d1',false) \g /dev/null
select public.signaler_patron('33333333-3333-3333-3333-333333333333','dangereux','Petites pièces pour bébé non signalées');
reset role;
select 'V01 masqué après 2 graves' t, masque, en_revue from public.patrons_publics where id='33333333-3333-3333-3333-333333333333';
set role authenticated; select set_config('test.uid','00000000-0000-0000-0000-0000000000a1',false) \g /dev/null
-- V-02 : se renommer avec le pseudo d'une autre
update public.patrons_publics set auteur_affiche='alice' where id='33333333-3333-3333-3333-333333333333';
reset role;
select 'V02 nom inchangé' t, auteur_affiche from public.patrons_publics where id='33333333-3333-3333-3333-333333333333';
-- V-03 : un patron retiré, puis réécriture d'un autre patron avec le même texte
set role authenticated; select set_config('test.uid','00000000-0000-0000-0000-0000000000a1',false) \g /dev/null
insert into public.patrons_publics (id,user_id,titre,auteur_affiche,texte,droits_declares) values ('44444444-4444-4444-4444-444444444444','00000000-0000-0000-0000-0000000000a1','Ours','Autrice A', repeat('Rang 3 : diminutions tous les deux points. ',4), true);
reset role; select set_config('test.uid','',false) \g /dev/null
select public.decider_moderation('33333333-3333-3333-3333-333333333333','retire','Contenu confirmé comme problématique.');
set role authenticated; select set_config('test.uid','00000000-0000-0000-0000-0000000000a1',false) \g /dev/null
update public.patrons_publics set texte = repeat('Rang 2 : augmentations régulières sur tout le tour. ',3) where id='44444444-4444-4444-4444-444444444444';
reset role;
select 'V03 texte non remplacé' t, texte like 'Rang 3%' from public.patrons_publics where id='44444444-4444-4444-4444-444444444444';
-- V-06/V-07 : une seule facture active par commande
set role authenticated; select set_config('test.uid','00000000-0000-0000-0000-0000000000a1',false) \g /dev/null
select 'F1' t, public.emettre_facture(2026,0,'facture','cmdX','{"total":10}'::jsonb);
select 'F2 deuxième facture même commande (refus)' t, public.emettre_facture(2026,0,'facture','cmdX','{"total":10}'::jsonb);
select 'F3 avoir' t, public.emettre_facture(2026,0,'avoir','cmdX',jsonb_build_object('total',-10,'ref',(select numero from public.factures where commande='cmdX' and type='facture' limit 1)));
select 'F4 nouvelle facture après avoir (ok)' t, public.emettre_facture(2026,0,'facture','cmdX','{"total":12}'::jsonb);
reset role;
insert into public.tentatives values ('vieille', 3, now() - interval '3 days');
select public.compter_tentative('x1');
select 'V32 purge immédiate' t, count(*) from public.tentatives where cle='vieille';
