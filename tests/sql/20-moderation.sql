\set ON_ERROR_STOP 0
\pset pager off
insert into auth.users values ('00000000-0000-0000-0000-0000000000a1','a1@x.fr'),('00000000-0000-0000-0000-0000000000b1','b1@x.fr'),('00000000-0000-0000-0000-0000000000c1','c1@x.fr'),('00000000-0000-0000-0000-0000000000d1','d1@x.fr') on conflict do nothing;
set role authenticated; select set_config('test.uid','00000000-0000-0000-0000-0000000000a1',false) \g /dev/null
insert into public.patrons_publics (id,user_id,titre,auteur_affiche,texte,droits_declares) values ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-0000000000a1','Lapin','Autrice A', repeat('Rang 1 : six mailles serrées dans un cercle magique. ',3), true);
select set_config('test.uid','00000000-0000-0000-0000-0000000000b1',false) \g /dev/null
select '1 motif invalide (refus attendu)' t, public.signaler_patron('22222222-2222-2222-2222-222222222222','nimportequoi','un détail suffisant');
select '2 détail trop court (refus attendu)' t, public.signaler_patron('22222222-2222-2222-2222-222222222222','droits','court');
select '3 B signale droits' t, public.signaler_patron('22222222-2222-2222-2222-222222222222','droits','Copie du patron vendu par une autre créatrice');
select set_config('test.uid','00000000-0000-0000-0000-0000000000c1',false) \g /dev/null
select '4 C signale autre' t, public.signaler_patron('22222222-2222-2222-2222-222222222222','autre','Texte incompréhensible et incomplet');
select set_config('test.uid','00000000-0000-0000-0000-0000000000d1',false) \g /dev/null
select '5 D signale trompeur' t, public.signaler_patron('22222222-2222-2222-2222-222222222222','trompeur','Le résultat ne correspond pas du tout');
reset role;
select '6 après 3 signalements : en revue, PAS retiré, PAS masqué' t, signalements, en_revue, masque, retire from public.patrons_publics where id='22222222-2222-2222-2222-222222222222';
set role authenticated; select set_config('test.uid','00000000-0000-0000-0000-0000000000c1',false) \g /dev/null
select '7 toujours visible pour C' t, count(*) from public.patrons_publics where id='22222222-2222-2222-2222-222222222222';
select '8 C re-signale en illicite' t, public.signaler_patron('22222222-2222-2222-2222-222222222222','illicite','Contient des propos haineux dans les notes');
select set_config('test.uid','00000000-0000-0000-0000-0000000000d1',false) \g /dev/null
select '9 D re-signale dangereux' t, public.signaler_patron('22222222-2222-2222-2222-222222222222','dangereux','Instructions dangereuses pour un jouet de bébé');
reset role;
select '10 deux signalements graves : masqué provisoirement' t, en_revue, masque, retire from public.patrons_publics where id='22222222-2222-2222-2222-222222222222';
set role authenticated; select set_config('test.uid','00000000-0000-0000-0000-0000000000b1',false) \g /dev/null
select '11 invisible pour B' t, count(*) from public.patrons_publics where id='22222222-2222-2222-2222-222222222222';
select set_config('test.uid','00000000-0000-0000-0000-0000000000a1',false) \g /dev/null
select '12 visible pour son autrice' t, count(*) from public.patrons_publics where id='22222222-2222-2222-2222-222222222222';
update public.patrons_publics set masque=false, en_revue=false, retire=false where id='22222222-2222-2222-2222-222222222222';
select '13 autrice tente de démasquer' t, masque, en_revue from public.patrons_publics where id='22222222-2222-2222-2222-222222222222';
select '14 autrice conteste' t, public.contester_moderation('22222222-2222-2222-2222-222222222222','Mon patron est original, je peux fournir mes brouillons datés.');
select '15 contestation en double (refus attendu)' t, public.contester_moderation('22222222-2222-2222-2222-222222222222','Encore une contestation pour rien du tout.');
select '16 autrice décide (refus attendu)' t, public.decider_moderation('22222222-2222-2222-2222-222222222222','maintenu','Je me donne raison toute seule');
delete from public.patrons_publics where id='22222222-2222-2222-2222-222222222222';
reset role;
select '17 suppression par l autrice bloquée pendant la revue' t, count(*) from public.patrons_publics where id='22222222-2222-2222-2222-222222222222';
select set_config('test.uid','',false) \g /dev/null
select '18 file de modération' t, titre, signalements, masque, contestations is not null as contestee from public.moderation_a_traiter;
select public.decider_moderation('22222222-2222-2222-2222-222222222222','retire','Reproduction du patron d''une autre créatrice, confirmée.');
select '19 décision retire' t, retire, masque, en_revue, decision, decision_motif is not null from public.patrons_publics where id='22222222-2222-2222-2222-222222222222';
set role authenticated; select set_config('test.uid','00000000-0000-0000-0000-0000000000a1',false) \g /dev/null
insert into public.patrons_publics (user_id,titre,auteur_affiche,texte,droits_declares) values ('00000000-0000-0000-0000-0000000000a1','Lapin bis','Autrice A', repeat('Rang 1 : six mailles serrées dans un cercle magique. ',3), true);
select '20 republication identique refusée (0 attendu)' t, count(*) from public.patrons_publics where titre='Lapin bis';
select set_config('test.uid','00000000-0000-0000-0000-0000000000b1',false) \g /dev/null
select '21 retiré invisible pour B' t, count(*) from public.patrons_publics where id='22222222-2222-2222-2222-222222222222';
reset role; set role anon; select set_config('test.uid','',false) \g /dev/null
select '22 anon ne peut pas signaler (refus attendu)' t, public.signaler_patron('22222222-2222-2222-2222-222222222222','droits','un détail suffisant');
select '23 anon ne peut pas mon_profil (refus attendu)' t, public.mon_profil();
reset role;
insert into public.tentatives values ('vieille', 3, now() - interval '3 days');
select '24 purge auto (tentative > 24 h supprimée après quelques insertions)' t;
do $$ begin for i in 1..200 loop perform public.compter_tentative('cle' || i); end loop; end $$;
select count(*) as reste_vieille from public.tentatives where cle='vieille';
