-- ═══════════════════════════════════════════════════════════════════════════
-- Audit D — matrice de tests RLS / RPC de Crochompte (réutilisable)
-- Prérequis : base chargée avec socle.sql, supabase-defauts.sql, puis
--   schema.sql, schema-pseudo.sql, schema-versions.sql,
--   schema-patrons-publics.sql, schema-signalements.sql,
--   schema-fiabilite.sql, schema-factures.sql
-- Lancer : psql -d audit_rls -f rls-tests.sql
-- Rôles : A = propriétaire, B = autre utilisatrice, anon = non connecté.
-- auth.uid() est lu dans current_setting('test.uid') (imitation du socle).
-- ═══════════════════════════════════════════════════════════════════════════
\set ON_ERROR_STOP 0
\pset pager off
set client_min_messages = warning;

drop schema if exists t cascade;
create schema t;
create table t.res(n serial, objet text, op text, qui text, resultat text, attendu text, verdict text);

-- Exécute p_sql sous un rôle et une identité ; rend « OK (n) » ou « REFUS : … ».
create function t.essai(p_role text, p_uid text, p_sql text) returns text language plpgsql as $$
declare n bigint; r text;
begin
  perform set_config('test.uid', coalesce(p_uid, ''), true);
  execute 'set local role ' || p_role;
  begin
    execute p_sql;
    get diagnostics n = row_count;
    r := 'OK (' || n || ')';
  exception when others then
    r := 'REFUS ' || sqlstate || ' ' || left(sqlerrm, 110);
  end;
  execute 'reset role';
  perform set_config('test.uid', '', true);
  return r;
end $$;

-- Valeur scalaire lue sous un rôle et une identité.
create function t.valeur(p_role text, p_uid text, p_sql text) returns text language plpgsql as $$
declare v text;
begin
  perform set_config('test.uid', coalesce(p_uid, ''), true);
  execute 'set local role ' || p_role;
  begin
    execute p_sql into v;
  exception when others then v := 'REFUS ' || sqlstate || ' ' || left(sqlerrm, 110);
  end;
  execute 'reset role';
  perform set_config('test.uid', '', true);
  return v;
end $$;

-- attendu : 'REFUS', 'OK0' (aucune ligne touchée), 'OK+' (au moins une), ou texte exact / motif LIKE
create function t.note(p_objet text, p_op text, p_qui text, p_res text, p_att text) returns void language plpgsql as $$
declare v text;
begin
  v := case
    when p_att = 'REFUS' then case when p_res like 'REFUS%' then 'conforme' else 'ÉCART' end
    when p_att = 'OK0'   then case when p_res = 'OK (0)' then 'conforme' else 'ÉCART' end
    when p_att = 'OK+'   then case when p_res like 'OK (%' and p_res <> 'OK (0)' then 'conforme' else 'ÉCART' end
    else case when coalesce(p_res,'∅') like p_att then 'conforme' else 'ÉCART' end
  end;
  insert into t.res(objet, op, qui, resultat, attendu, verdict) values (p_objet, p_op, p_qui, p_res, p_att, v);
end $$;

-- ── Données de départ (en superutilisateur) ─────────────────────────────────
\set A '''00000000-0000-0000-0000-00000000000a'''
\set B '''00000000-0000-0000-0000-00000000000b'''
\set C '''00000000-0000-0000-0000-00000000000c'''
\set D '''00000000-0000-0000-0000-00000000000d'''
insert into auth.users values ('00000000-0000-0000-0000-00000000000d','d@x.fr') on conflict do nothing;
truncate public.ateliers, public.ateliers_versions, public.pseudos, public.patrons_publics, public.patrons_signalements,
         public.tentatives, public.factures_compteurs cascade;
delete from storage.objects;
insert into public.pseudos(user_id, pseudo, pseudo_cle, courriel, prenom) values
  (:A, 'Alice', 'Alice', 'a@x.fr', 'Alice'), (:B, 'Berthe', 'Berthe', 'b@x.fr', 'Berthe');
insert into public.ateliers(user_id, donnees) values (:A, '{"creations":[{"nom":"secret A"}]}'), (:B, '{"creations":[{"nom":"secret B"}]}');
insert into public.ateliers_versions(user_id, donnees, maj) values (:A, '{"v":1}', now());
insert into public.patrons_publics(id, user_id, titre, auteur_affiche, texte, droits_declares) values
  ('11111111-1111-1111-1111-111111111111', :A, 'Lapin', 'Alice', repeat('Rang 1 : six mailles serrées. ', 4), true);
insert into storage.objects(bucket_id, name) values ('photos', '00000000-0000-0000-0000-00000000000a/p1.jpg'),
                                                    ('photos', '00000000-0000-0000-0000-00000000000b/p2.jpg');

\o /dev/null
-- ═══ 1. ateliers ═════════════════════════════════════════════════════════════
select t.note('ateliers','select','propriétaire', t.essai('authenticated', :A, 'select * from public.ateliers where user_id = ' || quote_literal(:A)), 'OK+');
select t.note('ateliers','select','autre', t.essai('authenticated', :B, 'select * from public.ateliers where user_id = ' || quote_literal(:A)), 'OK0');
select t.note('ateliers','select (sans filtre)','autre', t.valeur('authenticated', :B, 'select string_agg(user_id::text, '','') from public.ateliers'), '%0b');
select t.note('ateliers','select','anon', t.essai('anon', null, 'select * from public.ateliers'), 'REFUS');
select t.note('ateliers','insert pour autrui','autre', t.essai('authenticated', :B, 'insert into public.ateliers(user_id, donnees) values (' || quote_literal(:C) || ', ''{}'')'), 'REFUS');
select t.note('ateliers','insert','anon', t.essai('anon', null, 'insert into public.ateliers(user_id, donnees) values (' || quote_literal(:C) || ', ''{}'')'), 'REFUS');
select t.note('ateliers','insert','propriétaire (C)', t.essai('authenticated', :C, 'insert into public.ateliers(user_id, donnees, maj) values (' || quote_literal(:C) || ', ''{}'', ''2001-01-01'')'), 'OK+');
select t.note('ateliers','maj imposée par le serveur','propriétaire (C)', (select (maj > now() - interval '1 minute')::text from public.ateliers where user_id = :C), 'true');
select t.note('ateliers','update','propriétaire', t.essai('authenticated', :A, 'update public.ateliers set donnees = ''{"creations":[{"nom":"modifié A"}]}'' where user_id = ' || quote_literal(:A)), 'OK+');
select t.note('ateliers','update','autre', t.essai('authenticated', :B, 'update public.ateliers set donnees = ''{}'' where user_id = ' || quote_literal(:A)), 'OK0');
select t.note('ateliers','update','anon', t.essai('anon', null, 'update public.ateliers set donnees = ''{}'''), 'REFUS');
select t.note('ateliers','delete','autre', t.essai('authenticated', :B, 'delete from public.ateliers where user_id = ' || quote_literal(:A)), 'OK0');
select t.note('ateliers','delete','anon', t.essai('anon', null, 'delete from public.ateliers'), 'REFUS');
select t.note('ateliers','delete','propriétaire (C)', t.essai('authenticated', :C, 'delete from public.ateliers where user_id = ' || quote_literal(:C)), 'OK+');
select t.note('ateliers','changer user_id (réattribuer à C)','propriétaire', t.essai('authenticated', :A, 'update public.ateliers set user_id = ' || quote_literal(:C) || ' where user_id = ' || quote_literal(:A)), 'REFUS');
select t.note('ateliers','upsert sur la ligne d''autrui (on conflict)','autre', t.essai('authenticated', :B, 'insert into public.ateliers(user_id, donnees) values (' || quote_literal(:A) || ', ''{}'') on conflict (user_id) do update set donnees = excluded.donnees'), 'REFUS');
select t.note('ateliers','taille : donnees de 30 Mo refusées (limite 25 Mo)','propriétaire', t.essai('authenticated', :A,
  'update public.ateliers set donnees = jsonb_build_object(''x'', repeat(''a'', 30000000)) where user_id = ' || quote_literal(:A)), 'REFUS');
update public.ateliers set donnees = '{"creations":[{"nom":"secret A"}]}' where user_id = :A;

-- ═══ 2. ateliers_versions ════════════════════════════════════════════════════
select t.note('ateliers_versions','select','propriétaire', t.essai('authenticated', :A, 'select * from public.ateliers_versions'), 'OK+');
select t.note('ateliers_versions','select','autre', t.essai('authenticated', :B, 'select * from public.ateliers_versions where user_id = ' || quote_literal(:A)), 'OK0');
select t.note('ateliers_versions','select','anon', t.essai('anon', null, 'select * from public.ateliers_versions'), 'REFUS');
select t.note('ateliers_versions','insert','propriétaire', t.essai('authenticated', :A, 'insert into public.ateliers_versions(user_id, donnees, maj, raison) values (' || quote_literal(:A) || ', ''{}'', ''1990-01-01'', ''n''''importe quoi'')'), 'OK+');
select t.note('ateliers_versions','insert pour autrui','autre', t.essai('authenticated', :B, 'insert into public.ateliers_versions(user_id, donnees, maj) values (' || quote_literal(:A) || ', ''{"piege":1}'', now())'), 'REFUS');
select t.note('ateliers_versions','insert','anon', t.essai('anon', null, 'insert into public.ateliers_versions(user_id, donnees, maj) values (' || quote_literal(:A) || ', ''{}'', now())'), 'REFUS');
select t.note('ateliers_versions','update','propriétaire', t.essai('authenticated', :A, 'update public.ateliers_versions set donnees = ''{}'''), 'REFUS');
select t.note('ateliers_versions','delete','autre', t.essai('authenticated', :B, 'delete from public.ateliers_versions where user_id = ' || quote_literal(:A)), 'OK0');
select t.note('ateliers_versions','delete','anon', t.essai('anon', null, 'delete from public.ateliers_versions'), 'REFUS');
select t.note('ateliers_versions','500 versions sans appeler purger_versions()','propriétaire', t.essai('authenticated', :A,
  'insert into public.ateliers_versions(user_id, donnees, maj) select ' || quote_literal(:A) || ', jsonb_build_object(''i'', g), now() from generate_series(1,500) g'), 'OK (500)');
select t.note('ateliers_versions','plafond serveur : 30 gardées sans appeler la purge (V55)','—', (select count(*)::text from public.ateliers_versions where user_id = :A), '30');
select t.note('ateliers_versions','purger_versions() par B ne touche pas A','autre', t.essai('authenticated', :B, 'select public.purger_versions()'), 'OK+');
select t.note('ateliers_versions','après purge par B, A garde','—', (select count(*)::text from public.ateliers_versions where user_id = :A), '30');
select t.note('ateliers_versions','purger_versions() par A','propriétaire', t.essai('authenticated', :A, 'select public.purger_versions()'), 'OK+');
select t.note('ateliers_versions','après purge, A garde 30','—', (select count(*)::text from public.ateliers_versions where user_id = :A), '30');
select t.note('ateliers_versions','delete','propriétaire', t.essai('authenticated', :A, 'delete from public.ateliers_versions where user_id = ' || quote_literal(:A)), 'OK+');

-- ═══ 3. pseudos (profil) ═════════════════════════════════════════════════════
select t.note('pseudos','select','propriétaire', t.essai('authenticated', :A, 'select * from public.pseudos'), 'REFUS');
select t.note('pseudos','select','anon', t.essai('anon', null, 'select * from public.pseudos'), 'REFUS');
select t.note('pseudos','insert','propriétaire (C)', t.essai('authenticated', :C, 'insert into public.pseudos(user_id,pseudo,pseudo_cle,courriel) values (' || quote_literal(:C) || ',''c'',''c'',''c@x.fr'')'), 'REFUS');
select t.note('pseudos','update','propriétaire', t.essai('authenticated', :A, 'update public.pseudos set pseudo = ''x'''), 'REFUS');
select t.note('pseudos','delete','propriétaire', t.essai('authenticated', :A, 'delete from public.pseudos'), 'REFUS');
select t.note('mon_profil()','rpc','propriétaire', t.valeur('authenticated', :A, 'select public.mon_profil()->>''pseudo'''), 'Alice');
select t.note('mon_profil()','rpc','autre', t.valeur('authenticated', :B, 'select public.mon_profil()->>''pseudo'''), 'Berthe');
select t.note('mon_profil()','rpc (uid null)','anon', t.valeur('anon', null, 'select coalesce(public.mon_profil()::text, ''NULL'')'), 'REFUS%');
select t.note('mon_pseudo()','rpc (uid null)','anon', t.valeur('anon', null, 'select coalesce(public.mon_pseudo(), ''NULL'')'), 'REFUS%');
select t.note('modifier_mon_profil()','prénom 200 car.','propriétaire', t.essai('authenticated', :A, 'select public.modifier_mon_profil(repeat(''x'',200), null, null, null, null, null)'), 'REFUS');
select t.note('modifier_mon_profil()','naissance 2020 (<15 ans)','propriétaire', t.essai('authenticated', :A, 'select public.modifier_mon_profil(''A'', null, ''2020-01-01'', null, null, null)'), 'REFUS');
select t.note('modifier_mon_profil()','type_activite hostile','propriétaire', t.essai('authenticated', :A, 'select public.modifier_mon_profil(''A'', null, null, null, null, ''admin'')'), 'REFUS');
select t.note('modifier_mon_profil()','ne touche que soi (B modifie)','autre', t.essai('authenticated', :B, 'select public.modifier_mon_profil(''pirate'', null, null, null, null, null)'), 'OK+');
select t.note('modifier_mon_profil()','prénom de A intact','—', (select prenom from public.pseudos where user_id = :A), 'Alice');
select t.note('modifier_mon_profil()','rpc (uid null)','anon', t.essai('anon', null, 'select public.modifier_mon_profil(''x'', null, null, null, null, null)'), 'REFUS');
select t.note('pseudo_disponible()','énumération par anon (pseudo existant)','anon', t.valeur('anon', null, 'select public.pseudo_disponible(''ALICE'')::text'), 'false');
select t.note('pseudo_disponible()','entrée de 1 Mo','anon', t.valeur('anon', null, 'select public.pseudo_disponible(repeat(''z'', 1000000))::text'), 'true');

-- ═══ 4. patrons_publics ══════════════════════════════════════════════════════
select t.note('patrons_publics','select (patron d''autrui, non retiré)','autre', t.essai('authenticated', :B, 'select * from public.patrons_publics'), 'OK+');
select t.note('patrons_publics','user_id de l''autrice lisible par toutes','autre', t.valeur('authenticated', :B, 'select user_id::text from public.patrons_publics limit 1'), '%0a');
select t.note('patrons_publics','select','anon', t.essai('anon', null, 'select * from public.patrons_publics'), 'REFUS');
select t.note('patrons_publics','insert pour autrui','propriétaire', t.essai('authenticated', :A, 'insert into public.patrons_publics(user_id,titre,auteur_affiche,texte,droits_declares) values (' || quote_literal(:B) || ',''Ti'',''Alice'',repeat(''x'',90),true)'), 'REFUS');
select t.note('patrons_publics','insert','anon', t.essai('anon', null, 'insert into public.patrons_publics(user_id,titre,auteur_affiche,texte,droits_declares) values (' || quote_literal(:A) || ',''Ti'',''Al'',repeat(''x'',90),true)'), 'REFUS');
select t.note('patrons_publics','usurpation : auteur_affiche = pseudo d''une autre','propriétaire', t.essai('authenticated', :A, 'insert into public.patrons_publics(user_id,titre,auteur_affiche,texte,droits_declares) values (' || quote_literal(:A) || ',''Faux'',''Berthe'',repeat(''x'',90),true)'), 'OK+');
select t.note('patrons_publics','update','autre', t.essai('authenticated', :B, 'update public.patrons_publics set titre = ''pirate'''), 'OK0');
select t.note('patrons_publics','delete','autre', t.essai('authenticated', :B, 'delete from public.patrons_publics'), 'OK0');
select t.note('patrons_publics','update','anon', t.essai('anon', null, 'update public.patrons_publics set titre = ''pirate'''), 'REFUS');
select t.note('patrons_publics','changer user_id vers B','propriétaire', t.essai('authenticated', :A, 'update public.patrons_publics set user_id = ' || quote_literal(:B) || ' where id = ''11111111-1111-1111-1111-111111111111'''), 'REFUS');
select t.note('patrons_publics','antidater cree','propriétaire', t.essai('authenticated', :A, 'update public.patrons_publics set cree = ''2099-01-01'' where id = ''11111111-1111-1111-1111-111111111111'''), 'OK+');
select t.note('patrons_publics','cree reste figée','—', (select (cree < '2090-01-01')::text from public.patrons_publics where id = '11111111-1111-1111-1111-111111111111'), 'true');
select t.note('patrons_publics','signalements remis à 0 par l''autrice','propriétaire', t.essai('authenticated', :A, 'update public.patrons_publics set signalements = -5 where id = ''11111111-1111-1111-1111-111111111111'''), 'OK+');
select t.note('patrons_publics','compteur inchangé','—', (select signalements::text from public.patrons_publics where id = '11111111-1111-1111-1111-111111111111'), '0');
-- signalements
select t.note('signaler_patron()','anon','anon', t.essai('anon', null, 'select public.signaler_patron(''11111111-1111-1111-1111-111111111111'')'), 'REFUS');
select t.note('signaler_patron()','B signale 3 fois','autre', t.essai('authenticated', :B, 'select public.signaler_patron(''11111111-1111-1111-1111-111111111111''), public.signaler_patron(''11111111-1111-1111-1111-111111111111''), public.signaler_patron(''11111111-1111-1111-1111-111111111111'')'), 'OK+');
select t.note('signaler_patron()','A signale son propre patron','propriétaire', t.essai('authenticated', :A, 'select public.signaler_patron(''11111111-1111-1111-1111-111111111111'')'), 'OK+');
select t.note('signaler_patron()','compteur après B×3 + A','—', (select signalements::text from public.patrons_publics where id = '11111111-1111-1111-1111-111111111111'), '1');
select t.note('signaler_patron()','id null','autre', t.essai('authenticated', :B, 'select public.signaler_patron(null)'), 'OK+');
select t.note('signaler_patron()','C puis D signalent → retrait','—', t.essai('authenticated', :C, 'select public.signaler_patron(''11111111-1111-1111-1111-111111111111'')') || ' / ' || t.essai('authenticated', :D, 'select public.signaler_patron(''11111111-1111-1111-1111-111111111111'')'), 'OK (1) / OK (1)');
select t.note('patrons_publics','retiré après 3 signalements distincts','—', (select retire::text from public.patrons_publics where id = '11111111-1111-1111-1111-111111111111'), 'true');
select t.note('patrons_publics','l''autrice remet en ligne (retire=false)','propriétaire', t.essai('authenticated', :A, 'update public.patrons_publics set retire = false where id = ''11111111-1111-1111-1111-111111111111'''), 'OK+');
select t.note('patrons_publics','reste retiré','—', (select retire::text from public.patrons_publics where id = '11111111-1111-1111-1111-111111111111'), 'true');
select t.note('patrons_publics','CONTOURNEMENT : l''autrice supprime le patron retiré…','propriétaire', t.essai('authenticated', :A, 'delete from public.patrons_publics where id = ''11111111-1111-1111-1111-111111111111'''), 'OK+');
select t.note('patrons_publics','… et le republie à l''identique (compteur 0, visible)','propriétaire', t.essai('authenticated', :A, 'insert into public.patrons_publics(user_id,titre,auteur_affiche,texte,droits_declares) values (' || quote_literal(:A) || ',''Lapin'',''Alice'',repeat(''Rang 1 : six mailles serrées. '', 4),true)'), 'OK+');
select t.note('patrons_publics','le patron republié est visible par B','autre', t.valeur('authenticated', :B, 'select count(*)::text from public.patrons_publics where titre = ''Lapin'' and not retire'), '1');
select t.note('patrons_signalements','select','autre', t.essai('authenticated', :B, 'select * from public.patrons_signalements'), 'REFUS');
select t.note('patrons_signalements','insert direct','autre', t.essai('authenticated', :B, 'insert into public.patrons_signalements(patron_id,user_id) select id, ' || quote_literal(:B) || ' from public.patrons_publics limit 1'), 'REFUS');

-- ═══ 5. tentatives (limitation de débit) ═════════════════════════════════════
select t.note('tentatives','select','anon', t.essai('anon', null, 'select * from public.tentatives'), 'REFUS');
select t.note('tentatives','select','authentifiée', t.essai('authenticated', :A, 'select * from public.tentatives'), 'REFUS');
select t.note('compter_tentative()','rpc','anon', t.essai('anon', null, 'select public.compter_tentative(''cx:alice'')'), 'REFUS');
select t.note('compter_tentative()','rpc','authentifiée', t.essai('authenticated', :A, 'select public.compter_tentative(''cx:alice'')'), 'REFUS');
select t.note('compter_tentative()','rpc','service_role', t.essai('service_role', null, 'select public.compter_tentative(''cx:alice'')'), 'OK+');
select t.note('purger_tentatives()','rpc','anon', t.essai('anon', null, 'select public.purger_tentatives()'), 'REFUS');

-- ═══ 6. factures_compteurs ═══════════════════════════════════════════════════
select t.note('factures_compteurs','select','propriétaire', t.essai('authenticated', :A, 'select * from public.factures_compteurs'), 'REFUS');
select t.note('prochain_numero_facture()','1er numéro','propriétaire', t.valeur('authenticated', :A, 'select public.prochain_numero_facture(2026, 0)'), '_____-2026-0001');
select t.note('prochain_numero_facture()','2e numéro','propriétaire', t.valeur('authenticated', :A, 'select public.prochain_numero_facture(2026, 0)'), '_____-2026-0002');
select t.note('prochain_numero_facture()','p_min=999999 (saut)','propriétaire', t.valeur('authenticated', :A, 'select public.prochain_numero_facture(2026, 999999)'), '_____-2026-1000000');
select t.note('prochain_numero_facture()','p_min=1000000','propriétaire', t.valeur('authenticated', :A, 'select public.prochain_numero_facture(2026, 1000000)'), 'REFUS%');
select t.note('prochain_numero_facture()','année 1999','propriétaire', t.valeur('authenticated', :A, 'select public.prochain_numero_facture(1999, 0)'), 'REFUS%');
select t.note('prochain_numero_facture()','année null','propriétaire', t.valeur('authenticated', :A, 'select public.prochain_numero_facture(null, 0)'), 'REFUS%');
select t.note('prochain_numero_facture()','anon','anon', t.valeur('anon', null, 'select public.prochain_numero_facture(2026, 0)'), 'REFUS%');
select t.note('prochain_numero_facture()','B a un code distinct','autre', t.valeur('authenticated', :B, 'select public.prochain_numero_facture(2026, 0)'), '_____-2026-0001');

-- ═══ 7. storage.objects (imitation minimale ; storage.foldername = string_to_array) ═══
select t.note('storage.objects','select dossier propre','propriétaire', t.essai('authenticated', :A, 'select * from storage.objects'), 'OK (1)');
select t.note('storage.objects','select dossier d''autrui','autre', t.essai('authenticated', :B, 'select * from storage.objects where name like ''00000000-0000-0000-0000-00000000000a/%'''), 'OK0');
select t.note('storage.objects','select','anon', t.essai('anon', null, 'select * from storage.objects'), 'OK0');
select t.note('storage.objects','insert dans son dossier','propriétaire', t.essai('authenticated', :A, 'insert into storage.objects(bucket_id,name) values (''photos'',''00000000-0000-0000-0000-00000000000a/x.jpg'')'), 'OK+');
select t.note('storage.objects','insert dans le dossier d''autrui','autre', t.essai('authenticated', :B, 'insert into storage.objects(bucket_id,name) values (''photos'',''00000000-0000-0000-0000-00000000000a/y.jpg'')'), 'REFUS');
select t.note('storage.objects','insert','anon', t.essai('anon', null, 'insert into storage.objects(bucket_id,name) values (''photos'',''00000000-0000-0000-0000-00000000000a/z.jpg'')'), 'REFUS');
select t.note('storage.objects','update fichier d''autrui','autre', t.essai('authenticated', :B, 'update storage.objects set name = name where name like ''00000000-0000-0000-0000-00000000000a/%'''), 'OK0');
select t.note('storage.objects','delete fichier d''autrui','autre', t.essai('authenticated', :B, 'delete from storage.objects where name like ''00000000-0000-0000-0000-00000000000a/%'''), 'OK0');
select t.note('storage.objects','déplacer son fichier dans le dossier de B','propriétaire', t.essai('authenticated', :A, 'update storage.objects set name = ''00000000-0000-0000-0000-00000000000b/vol.jpg'' where name = ''00000000-0000-0000-0000-00000000000a/x.jpg'''), 'REFUS');
select t.note('storage.buckets','limites du seau photos (taille / types)','—', (select coalesce(string_agg(column_name, ','), 'aucune colonne de limite dans l''imitation') from information_schema.columns where table_schema='storage' and table_name='buckets' and column_name in ('file_size_limit','allowed_mime_types')), '%');

-- ═══ 8. Fonctions exécutables par anon (avec les privilèges par défaut Supabase) ═══
select t.note('fonction ' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
              'EXECUTE par anon ?', 'anon',
              case when has_function_privilege('anon', p.oid, 'EXECUTE') then 'OUI' else 'non' end ||
              case when p.prosecdef then ' · security definer' else '' end ||
              ' · search_path=' || coalesce(array_to_string(p.proconfig, ';'), '(aucun)'),
              case when p.proname in ('pseudo_disponible') then 'OUI%'
                   when p.prorettype = 'trigger'::regtype then '%'
                   else 'non%' end)
  from pg_proc p where p.pronamespace = 'public'::regnamespace order by p.proname;

-- ═══ 9. search_path : pg_temp implicitement en tête dans les fonctions definer ═══
-- (non exploitable par l'API REST, qui n'exécute pas de SQL libre ; démontre
--  seulement que les noms non qualifiés peuvent être masqués par une table temporaire)
select t.note('signaler_patron()','masquage par table temporaire pg_temp.patrons_signalements','autre',
  t.essai('authenticated', :B, 'create temp table if not exists patrons_signalements(patron_id uuid, user_id uuid, cree timestamptz default now(), primary key(patron_id,user_id)); '
    || 'insert into pg_temp.patrons_signalements select id, gen_random_uuid() from public.patrons_publics cross join generate_series(1,5); '
    || 'select public.signaler_patron(id) from public.patrons_publics where titre = ''Faux'''), 'OK%');
select t.note('signaler_patron()','compteur du patron « Faux » après masquage (3 = retrait par une seule personne)','—',
  (select signalements::text || ' / retire=' || retire::text from public.patrons_publics where titre = 'Faux'), '% / retire=false');

\o
-- ═══ Résultat ════════════════════════════════════════════════════════════════
\pset format unaligned
\pset fieldsep ' | '
\echo
\echo '=== MATRICE RLS / RPC ==='
select n, objet, op, qui, resultat, attendu, verdict from t.res order by n;
\echo '=== ÉCARTS ==='
select n, objet, op, qui, resultat, attendu from t.res where verdict <> 'conforme' order by n;
select count(*) filter (where verdict = 'conforme') as conformes, count(*) filter (where verdict <> 'conforme') as ecarts, count(*) as total from t.res;
