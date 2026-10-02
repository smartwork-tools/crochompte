/* V39 — l'écran d'accueil (ce mois-ci en chiffres, reprendre son travail),
   le catalogue en liste complet, « Mes créations » qui réunit les modèles et
   chaque pièce fabriquée (coût réel poste par poste, retouches, gain avec
   code couleur), l'onglet de la fiche nommé, le suivi des commandes par
   étape, et le partage d'un patron en deux temps depuis « Mes patrons ». */
const {chromium} = require('./outils').playwright;
const path = require('path');
const {graine} = require('./aide.js');
const R = {}; const errs = [];
async function page(b, init){
  const p = await b.newPage({serviceWorkers:'block', viewport:{width:1280, height:900}});
  p.on('pageerror', e=>errs.push(e.message));
  p.on('dialog', d=>d.dismiss());
  if (init) await p.addInitScript(init);
  /* Accès aux fonctions internes de l'application (enfermées dans une
     fonction) : copie servie avec une porte d'évaluation, pour ce test seul. */
  await p.route('**/app.js*', async r=>{
    const src = require('fs').readFileSync(path.join(__dirname,'..','app.js'),'utf8');
    const i = src.lastIndexOf('})();');
    await r.fulfill({contentType:'text/javascript; charset=utf-8', body: src.slice(0,i) + 'window.__eval = function(c){ return eval(c); };\n' + src.slice(i)});
  });
  await p.route('**/vendor/supabase/**', r=>r.fulfill({path:path.join(__dirname,'faux-supabase-persistant.js'),contentType:'application/javascript'}));
  await p.route('**/functions/v1/connexion', r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'AT',refresh_token:'RT'})}));
  await p.goto('http://127.0.0.1:8934/index.html'); await p.waitForTimeout(500);
  if (await p.locator('#sy-c-identifiant').count()){
    await p.fill('#sy-c-identifiant','LaineTest'); await p.fill('#sy-c-mdp','motdepasse123');
    await p.click('#sy-c-valider'); await p.waitForTimeout(1000);
  }
  return p;
}
const lire = p => p.evaluate(()=>window.CrochomptePont.lire());
/* Exécute fn DANS l'application (accès à state, calculer, majCom…). */
const dans = (p, fn) => p.evaluate(code => window.__eval('(' + code + ')()'), fn.toString());



(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  try {
    let p = await page(b);
    await graine(p);
    await dans(p, function(){ state.reglages.mode = "complet"; state.reglages.confirmeLe = Date.now(); sauverTout(); render(); });

    /* 1. Un seul onglet pour les créations et leurs pièces */
    R.plus_d_onglet_pieces = await p.evaluate(()=>{ const n=[...document.querySelectorAll('#nav button')].map(b=>b.textContent.trim()); return n.includes('Mes créations') && !n.includes('Mes pièces'); });
    await dans(p, function(){ aller('atelier'); });
    R.ancien_lien_redirige = await dans(p, function(){ return view.tab === 'creations'; });

    /* 2. L'onglet de la fiche porte le nom de la création */
    await dans(p, function(){ ouvrirFiche('c1'); }); await p.waitForTimeout(200);
    R.onglet_fiche_nomme = (await p.textContent('#nav [aria-current="true"]')).replace(/\d+$/, '').trim() === 'Création : Lapin Céleste' && /Création : « Lapin Céleste »/.test(await p.textContent('#main h1'));
    await dans(p, function(){ nouvelleFiche('vide'); }); await p.waitForTimeout(200);
    R.onglet_nouvelle_fiche = (await p.textContent('#nav [aria-current="true"]')).replace(/\d+$/, '').trim() === 'Nouvelle création';
    await dans(p, function(){ view.draft = null; oublierBrouillon(); });

    /* 3. Mes créations : une carte par création, ses pièces dessous, avec le coût réel */
    await dans(p, function(){
      function pz(id, cid, prod, com, extra){ var x = {id:id, cid:cid, prod:prod, com:com, prix:null, mesure:{}, sessions:[], cree:Date.now(), maj:Date.now(), client:''}; Object.assign(x, extra||{}); state.pieces.push(x); return x; }
      var a = pz('pa','c1','termine','atelier',{mesure:{crochet:300}, sortie:true});
      var v = pz('pv','c1','termine','atelier',{mesure:{crochet:200}, sortie:true}); majCom(v,'vendu', 40);
      var j = pz('pj','c3','termine','atelier',{sortie:true}); majCom(j,'jete');
      pz('pe','c2','encours','atelier',{mesure:{crochet:30}});
      sauverTout(); view.fPieces = 'tous'; view.creaQ = ''; aller('creations');
    });
    await p.waitForTimeout(300);
    R.une_carte_par_creation = (await p.locator('.crea-card').count()) === 3;
    R.pieces_sous_la_creation = (await p.locator('.crea-card', {hasText:'Lapin Céleste'}).locator('tr[data-pid]').count()) === 2;
    const l1 = await p.locator('tr[data-pid="pa"]').textContent();
    R.ligne_piece_complete = /Coût de revient|détail/.test(l1) && /5 h/.test(l1) && /conseillé/.test(l1) && /D'après ta fiche/.test(await p.locator('.crea-card', {hasText:'Lapin Céleste'}).textContent());
    /* filtre « Ratées » : seule la pièce jetée reste */
    await p.getByRole('button', {name:/^Ratées/}).click(); await p.waitForTimeout(300);
    R.filtre_ratees = (await p.locator('tr[data-pid]').count()) === 1 && (await p.locator('tr[data-pid="pj"]').count()) === 1;
    await p.getByRole('button', {name:/^Tout/}).click(); await p.waitForTimeout(300);
    /* recherche par nom */
    await p.fill('#crea-q', 'panier'); await p.waitForTimeout(200);
    R.recherche_creation = (await p.locator('.crea-card').count()) === 1;
    await p.fill('#crea-q', ''); await p.waitForTimeout(200);

    /* 4. coutPiece : temps réel, pièce ratée, retouche */
    const r4 = await dans(p, function(){
      var cr = creation('c1'), r = calculer(cr);
      var a = piece('pa'), k = coutPiece(a, cr);
      var tauxH = Number(state.reglages.tauxHoraire);
      var j = piece('pj'), kj = coutPiece(j, creation('c3'));
      var e = piece('pe'); majProd(e, 'retouche'); e.retouches[0].mat = 2; ajouterTemps(e, 'crochet', 30, Date.now());
      var ke = coutPiece(e, creation('c2'));
      var minA = minutesReellesPiece(a, cr);   /* 300 min de crochet chronométrées + les autres postes de la fiche */
      return {mo: minA > 300 && Math.abs(k.mainOeuvre - cts((minA + (r.minutesIndirectes||0)) / 60 * tauxH)) < 0.011, mesure: k.tempsMesure, total: Math.abs(k.total - (k.matieres + k.mainOeuvre + k.fixe + k.fraisVente + k.cotisations)) < 0.011,
              /* une pièce ratée a coûté ses matières jetées ET le temps passé */
              jete: kj.jete && kj.matieres === cts(j.perteFigee) && kj.total === cts(j.perteFigee + kj.mainOeuvre) && kj.gain === -kj.coutRevient && kj.etat.k === 'bad' && kj.fraisVente === 0,
              retMin: ke.retouche.min === 30, retMat: ke.matieres === cts(calculer(creation('c2')).matieres + 2), retN: ke.retouche.n === 1};
    });
    R.cout_piece_temps_reel = r4.mo && r4.mesure && r4.total;
    R.cout_piece_ratee = r4.jete;
    R.retouche_ajoute_au_cout = r4.retMin && r4.retMat && r4.retN;

    /* 5. Passer en retouche depuis la liste ouvre la boîte de retouche */
    await dans(p, function(){ sauverTout(); render(); }); await p.waitForTimeout(200);
    await p.selectOption('tr[data-pid="pa"] select[data-role="prod"]', 'retouche'); await p.waitForTimeout(300);
    R.retouche_boite = (await p.locator('.dlg').count()) === 1 && /Retouche de « Lapin Céleste »/.test(await p.textContent('.dlg'));
    await p.fill('#dlgc-note', 'oreille à recoudre'); await p.fill('#dlgc-mat', '1,5');
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(400);
    const s5 = await lire(p); const pa5 = s5.pieces.find(x=>x.id==='pa');
    R.retouche_notee = pa5.prod === 'retouche' && pa5.retouches.length === 1 && pa5.retouches[0].note === 'oreille à recoudre' && pa5.retouches[0].mat === 1.5;
    R.chip_retouche = /1 retouche/.test(await p.locator('tr[data-pid="pa"]').textContent());

    /* 6. Le gain de la ligne suit le prix tapé ; le détail s'ouvre */
    await p.fill('tr[data-pid="pa"] input[data-role="prix"]', '120'); await p.waitForTimeout(250);
    const g6 = await p.locator('tr[data-pid="pa"] [data-l="Gain"]').textContent();
    const att6 = await dans(p, function(){ var k = coutPiece(piece('pa'), creation('c1')); return eur(k.gain) + eur(k.gainH) + ' / h pour ' + dureeLisible(k.minutes); });
    const nz = t => t.replace(/[\s\u00a0\u202f]/g,'');
    R.gain_suit_le_prix = /\/ h/.test(g6) && nz(g6) === nz(att6) && (await dans(p, function(){ var k = coutPiece(piece('pa'), creation('c1')); return Math.abs(k.prix - 120) < 0.001; }));
    await p.click('tr[data-pid="pa"] [data-role="cout"]'); await p.waitForTimeout(250);
    const d6 = await p.textContent('.dlg');
    R.detail_cout_complet = /Matières/.test(d6) && /Temps de travail/.test(d6) && /de retouche/.test(d6) && /Conditionnement/.test(d6) && /Transport/.test(d6) && /Prix conseillé/.test(d6) && /Coût de revient/.test(d6) && /Gain/.test(d6);
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(200);

    /* 7. Ajouter des pièces par la boîte */
    await p.locator('.crea-card', {hasText:'Panier'}).getByRole('button', {name:'+ Pièce'}).click(); await p.waitForTimeout(250);
    R.boite_ajout_preselectionne = await p.evaluate(()=> document.querySelector('#ap-cid').value === 'c3');
    await p.fill('#ap-n', '2'); await p.selectOption('#ap-prod', 'afaire'); await p.click('.dlg [data-oui]'); await p.waitForTimeout(400);
    R.pieces_ajoutees = (await lire(p)).pieces.filter(x=>x.cid==='c3').length === 3;

    /* 8. Accueil : ce mois-ci en chiffres, et « Reprendre » */
    await dans(p, function(){ piece('pa').termineLe = Date.now(); piece('pa').sessions = [{d: Date.now(), poste:'crochet', min: 90}]; sauverTout(); aller('accueil'); });
    await p.waitForTimeout(300);
    const h8 = await p.textContent('.acc-tete');
    R.accueil_encaisse_et_termine = /encaissés/.test(h8) && /1 pièce terminée/.test(h8);
    const pr8 = await p.textContent('#main .reprise');
    R.accueil_reprendre = /Reprendre/.test(pr8) && /Lapin Céleste/.test(pr8) && /Toutes mes créations/.test(pr8);
    R.accueil_pas_de_vitrine = !/Ta création/.test(pr8);
    R.accueil_temps_chrono = /Temps chronométré/.test(await p.textContent('#main')) && /2 h/.test(await p.textContent('#main'));   /* 90 min sur « pa » + 30 min de retouche sur « pe » */
    await dans(p, function(){ demarrerChrono('pe'); aller('accueil'); }); await p.waitForTimeout(200);
    R.accueil_chrono_en_cours = /Chronomètre en cours sur « Bonnet côtelé »/.test(await p.textContent('#main .reprise'));
    await dans(p, function(){ arreterChrono(true); });
    await p.getByRole('button', {name:'Voir la pièce'}).count();

    /* 9. Catalogue en liste : niveau, temps, matières, prix courant, patron */
    await dans(p, function(){ view.catMode = 'types'; view.modeleVu = null; view.filtre = 'tous'; view.recherche = ''; aller('catalogue'); }); await p.waitForTimeout(300);
    const l9 = await p.locator('.trow-type').first();
    const t9 = await l9.textContent();
    R.catalogue_liste_complete = (await l9.locator('.niv').count()) === 1 && /de travail/.test(t9) && /de matières/.test(t9) && /prix courant|pas de repère/.test(t9);
    R.catalogue_liste_patron = (await p.locator('.trow-type .chip', {hasText:'patron inclus'}).count()) > 0;
    R.catalogue_entete_colonnes = (await p.locator('.types-tete').count()) === 1;

    /* 10. Commandes : suivi par étape, versé, facturée */
    await dans(p, function(){
      var c1 = nouvelleCommande(); c1.client = {nom:'Boutique Lina', contact:'', note:''}; c1.cid = 'c2'; c1.prixConvenu = 28; c1.statut = 'encours'; c1.brouillon = false;
      c1.versement = {montant: 10, date: new Date().toISOString().slice(0,10), type:'acompte'};
      var c2 = nouvelleCommande(); c2.client = {nom:'Marie', contact:'', note:''}; c2.cid = 'c3'; c2.prixConvenu = 30; c2.statut = 'livree'; c2.brouillon = false; c2.factureNum = 'K7R2M-2026-0009';
      c2.paiements = [{montant:30, date:new Date().toISOString().slice(0,10), saisiLe:Date.now()}];
      var c3 = nouvelleCommande(); c3.client = {nom:'Sophie', contact:'', note:''}; c3.cid = 'c1'; c3.prixConvenu = 36; c3.statut = 'livree'; c3.brouillon = false;
      sauverTout(); view.cmdVue = null; view.fCmd = 'tous'; view.cmdQ = ''; aller('commandes');
    });
    await p.waitForTimeout(300);
    R.commandes_colonne_verse = /Reçu/.test(await p.textContent('#main thead')) && /10,00/.test(await p.locator('#main tbody tr', {hasText:'Boutique Lina'}).locator('[data-l="Reçu"]').textContent());
    R.commandes_chip_facturee = (await p.locator('#main tbody tr', {hasText:'Marie'}).locator('.chip', {hasText:'Payée en entier'}).count()) === 1 &&
                                (await p.locator('#main tbody tr', {hasText:'Sophie'}).locator('.chip', {hasText:'à facturer'}).count()) === 1;
    await p.getByRole('button', {name:/^Livrées et facturées/}).click(); await p.waitForTimeout(300);
    R.commandes_filtre = (await p.locator('#main tbody tr[data-l], #main table:first-of-type tbody tr').count()) === 1;
    await p.getByRole('button', {name:/^Toutes/}).click(); await p.waitForTimeout(300);
    await p.fill('#cmd-q', 'sophie'); await p.waitForTimeout(200);
    R.commandes_recherche = (await p.locator('#main table:first-of-type tbody tr').count()) === 1;

    /* 11. Partage d'un patron : plus dans la saisie, en deux temps depuis la liste */
    await dans(p, function(){ var np = nouveauPatron(); np.titre = 'Bonnet côtes faciles'; np.texte = 'Rang 1 : 60 ms en rond. Rang 2 : 1 ms dans chaque m. Continuer jusqu\'à 20 cm, puis diminuer. Rang 3 : répéter le rang 2.';
      var court = nouveauPatron(); court.titre = 'Trop court'; court.texte = 'trois mots'; sauverTout(); view.patronVu = np.id; aller('patrons'); });
    await p.waitForTimeout(300);
    R.saisie_sans_publication = (await p.locator('#pb-droits').count()) === 0 && /Ce patron est privé/.test(await p.textContent('#main'));
    await dans(p, function(){ view.patronVu = null; render(); }); await p.waitForTimeout(200);
    R.bouton_partager_liste = (await p.locator('[data-role="partager"]').count()) === 2;
    await p.locator('.pcard-wrap', {hasText:'Trop court'}).locator('[data-role="partager"]').click(); await p.waitForTimeout(300);
    R.partage_refuse_sans_texte = (await p.locator('.dlg').count()) === 0 && /80 caractères/.test(await p.textContent('#toasts'));
    await p.locator('.pcard-wrap', {hasText:'Bonnet côtes faciles'}).locator('[data-role="partager"]').click(); await p.waitForTimeout(300);
    R.partage_formulaire = (await p.locator('.dlg #pb-droits').count()) === 1;
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(200);
    R.partage_exige_autrice = (await p.locator('.dlg').count()) === 1 && /signature/.test(await p.textContent('#dlgc-aide'));
    await p.fill('#pb-auteur', 'Anne'); await p.click('.dlg [data-oui]'); await p.waitForTimeout(200);
    R.partage_exige_droits = (await p.locator('.dlg').count()) === 1 && /déclaration de droits/.test(await p.textContent('#dlgc-aide'));
    await p.check('#pb-droits'); await p.click('.dlg [data-oui]'); await p.waitForTimeout(300);
    const d11 = await p.textContent('.dlg');
    R.partage_confirmation = (await p.locator('.dlg').count()) === 1 && /visible par tous les membres/.test(d11) && /Bonnet côtes faciles/.test(d11) && /par Anne/.test(d11) &&
                             (await p.locator('.dlg [data-oui]').textContent()).trim() === 'Confirmer le partage';
    await p.click('.dlg [data-non]'); await p.waitForTimeout(200);
    R.partage_annulable = !(await lire(p)).patrons.find(x=>x.titre==='Bonnet côtes faciles').publie && (await p.evaluate(()=>!window.__publication));
    await p.locator('.pcard-wrap', {hasText:'Bonnet côtes faciles'}).locator('[data-role="partager"]').click(); await p.waitForTimeout(300);
    await p.fill('#pb-auteur', 'Anne'); await p.check('#pb-droits'); await p.click('.dlg [data-oui]'); await p.waitForTimeout(300);
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(600);
    R.partage_publie = (await lire(p)).patrons.find(x=>x.titre==='Bonnet côtes faciles').publie === true && (await p.evaluate(()=>window.__publication && window.__publication.auteur_affiche === 'Anne' && window.__publication.droits_declares === true));
    R.partage_badge = (await p.locator('.pcard-wrap', {hasText:'Bonnet côtes faciles'}).locator('.chip', {hasText:'partagé'}).count()) === 1 &&
                      (await p.locator('.pcard-wrap', {hasText:'Bonnet côtes faciles'}).locator('[data-role="partager"]').count()) === 0;

    /* 12. Téléphone : pas de débordement sur Mes créations */
    await p.close();
    p = await page(b); await p.setViewportSize({width:390, height:844}); await graine(p);
    await dans(p, function(){ state.reglages.mode = 'complet'; state.pieces.push({id:'pt', cid:'c1', prod:'encours', com:'atelier', prix:null, mesure:{crochet:20}, sessions:[], cree:Date.now(), maj:Date.now()}); sauverTout(); aller('creations'); });
    await p.waitForTimeout(400);
    R.tel_sans_debordement = await p.evaluate(()=> document.documentElement.scrollWidth <= window.innerWidth + 1) && (await p.locator('tr[data-pid="pt"]').count()) === 1;
    await p.close();
  } catch (e) { R._echec = String(e && e.stack || e); }
  console.log(JSON.stringify(R, null, 1));
  console.log("ERREURS JS: " + (errs.length ? errs.join(" | ") : "aucune"));
  await b.close();
})();
