/* V38 — métier : fournisseurs et prix comparés, pertes et pièces ratées,
   prévu / réel (pesée et chronomètre), marges, commandes numérotées à
   plusieurs articles reliées à leur facture, patron de la bibliothèque
   partagée relié à une création. */
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
    await dans(p, function(){ state.reglages.mode = "complet"; sauverTout(); render(); });

    /* 1. Fournisseurs : comparaison au gramme, même si les lots diffèrent */
    const r1 = await dans(p, function(){
      var fa = nouveauFournisseur('Mercerie'), fb = nouveauFournisseur('Web');
      var m = state.matieres[0];               /* lot de 25 g */
      noterOffre(m, fa.id, 2.20, 25);          /* 0,088 €/g */
      noterOffre(m, fb.id, 3.80, 50);          /* 0,076 €/g : moins cher malgré un prix de lot plus élevé */
      var best = meilleureOffre(m);
      return {best: fournisseur(best.fid).nom, pu: Math.round(puOffre(best, m) * 10000) / 10000, fa: fa.id, fb: fb.id, mid: m.id};
    });
    R.moins_cher_au_gramme = r1.best === 'Web' && r1.pu === 0.076;

    /* 2. Écran « Fournisseurs et prix » : saisie d'un prix dans le tableau */
    await dans(p, function(){ view.sub = 'fournisseurs'; view.fcQuoi = 'toutes'; aller('stock'); });
    const m1 = await dans(p, function(){ return state.matieres[1].id; });
    await p.fill('tr[data-mid="'+m1+'"] input[data-fid="'+r1.fa+'"]', '1,50'); await p.press('tr[data-mid="'+m1+'"] input[data-fid="'+r1.fa+'"]', 'Tab'); await p.waitForTimeout(250);
    R.prix_saisi_dans_tableau = (await lire(p)).matieres.find(m=>m.id===m1).offres.some(o=>o.fid===r1.fa && o.prix===1.5);
    R.moins_cher_en_vert = await p.locator('tr[data-mid="'+m1+'"] td.moins-cher').count() === 1;

    /* 3. Achat chez un fournisseur : son tarif est mis à jour ; l'annulation le rétablit */
    const r3 = await dans(p, function(){
      var m = matiere(state.matieres[0].id), f = fournisseurs()[0];
      var mv = mouvementMatiere(m, 'entree', 50, 5, 'test', {fid: f.id, bain: 'B12'});
      var apres = offreDe(m, f.id).prix;
      annulerMouvement(m, mv);
      return {apres: apres, retabli: offreDe(m, f.id).prix, bain: mv.bain};
    });
    R.achat_met_a_jour_tarif = r3.apres === 2.5 && r3.bain === 'B12';
    R.annulation_retablit_tarif = r3.retabli === 2.2;

    /* 4. Perte notée avec motif : stock, valeur, pelotes */
    const r4 = await dans(p, function(){
      var m = state.matieres[1]; m.stock = 200; m.pmp = 0.06;
      mouvementMatiere(m, 'perte', 50, null, '', {motif: 'abime'});
      var pe = pertesEntre(Date.now() - 1000, Date.now() + 1000);
      return {stock: m.stock, total: pe.total, pelotes: pe.pelotes, motif: pe.lignes[0] && pe.lignes[0].motif};
    });
    R.perte_stock_valeur = r4.stock === 150 && r4.total === 3 && r4.motif === 'abime';
    R.perte_en_pelotes = r4.pelotes === 1;

    /* 5. Base de calcul « moins cher » */
    const r5 = await dans(p, function(){ var m = state.matieres[0]; state.reglages.baseCout = 'moinsCher'; var a = pu(m); state.reglages.baseCout = 'dernier'; return Math.round(a * 10000) / 10000; });
    R.base_moins_cher = r5 === 0.076;

    /* 6. Pièce ratée : perte figée, hors stock, annulable */
    const r6 = await dans(p, function(){
      var pz = {id:'pj', cid:'c1', prod:'termine', com:'atelier', prix:null, mesure:{}, sessions:[], cree:Date.now(), maj:Date.now(), sortie:true};
      state.pieces.push(pz);
      var avant = enStock('c1');
      majCom(pz, 'jete');
      var perte = pz.perteFigee, apres = enStock('c1'), dans = pertesEntre(Date.now() - 1000, Date.now() + 1000).nbPieces;
      majCom(pz, 'atelier');
      return {perte: perte === calculer(creation('c1')).matieres, stock: avant - apres === 1, compte: dans === 1, annule: pz.perteFigee === null};
    });
    R.piece_ratee_perte = r6.perte && r6.stock && r6.compte && r6.annule;

    /* 7. Pesée : prévu / réel, correction du stock, moyenne dans la fiche */
    const r7 = await dans(p, function(){
      var cr = creation('c1'), mid = cr.lignes[0].mid, m = matiere(mid);
      m.stock = 500;
      var pz = {id:'pp', cid:'c1', prod:'encours', com:'atelier', prix:null, mesure:{}, sessions:[], cree:Date.now(), maj:Date.now()};
      state.pieces.push(pz);
      majProd(pz, 'termine');
      var prevu = consommationPrevue(cr)[mid], apresSortie = m.stock;
      var reel = {}; reel[mid] = prevu + 10;
      appliquerPesee(pz, cr, reel);
      var er = estimeReelPiece(pz, cr), br = bilanReel('c1');
      return {sortie: Math.round((500 - apresSortie) * 1000) / 1000 === prevu, corrige: Math.round((apresSortie - m.stock) * 1000) / 1000 === 10,
              plusCher: er.matReel > er.matEst, moy: Math.round(br.moy[mid] * 1000) / 1000 === Math.round((prevu + 10) * 1000) / 1000,
              mv: m.mouv[0].t === 'correction', pid: m.mouv[0].pid === 'pp'};
    });
    R.pesee_corrige_stock = r7.sortie && r7.corrige && r7.mv && r7.pid;
    R.pesee_cout_reel = r7.plusCher && r7.moy;
    await dans(p, function(){ sauverTout(); ouvrirFiche('c1'); });
    await p.waitForTimeout(300);
    R.fiche_prevu_reel = /Prévu et réel/.test(await p.textContent('#main'));
    const avantQ = await dans(p, function(){ return view.draft.lignes[0].qte; });
    await p.getByRole('button', {name:'Utiliser les quantités réelles dans ma fiche'}).click(); await p.waitForTimeout(200);
    const apresQ = await dans(p, function(){ return view.draft.lignes[0].qte; });
    R.fiche_quantites_reelles = apresQ > avantQ;
    await dans(p, function(){ view.draft = null; oublierBrouillon(); aller('atelier'); });

    /* 8. Marges dans la fiche */
    await dans(p, function(){ ouvrirFiche('c2'); });
    await p.waitForTimeout(300);
    const mg = await p.textContent('#r-marges');
    R.marges_affichees = /Taux de marge/.test(mg) && /Taux de marque/.test(mg) && /Coefficient sur les matières/.test(mg) && /Coût de revient complet/.test(mg);
    await dans(p, function(){ view.draft = null; oublierBrouillon(); });

    /* 9. Commandes : numéro, plusieurs articles, total, facture reliée */
    const r9 = await dans(p, function(){
      var n0 = commandes().length;
      var c1 = nouvelleCommande(), c2 = nouvelleCommande();
      c2.client = {nom:'Boutique Lina', contact:'', note:'', adresse:'3 rue X, Lyon'}; c2.clientePro = true; c2.refClient = 'BC-12';
      c2.cid = 'c2'; c2.qte = 3; c2.prixConvenu = 28; c2.fraisLivraison = 6; c2.statut = 'acceptee'; c2.brouillon = false;
      c2.articles = [{id:'a1', cid:'c3', d:'', s:'anses cuir', q:1, pu:35}];
      state.reglages.raisonSociale = 'Marie Dupont'; state.reglages.adresse = '1 rue des Lilas'; state.reglages.statut = 'marchandises'; state.reglages.siret = '12345678900012';
      sauverTout(); view.cmdVue = c2.id; aller('commandes');
      var F = instantaneFacture(c2);
      return {suite: +c2.num.slice(-4) === +c1.num.slice(-4) + 1, format: /^C-\d{4}-\d{4}$/.test(c2.num), total: totalDu(c2), id: c2.id, num: c2.num,
              lignes: F.lignes.map(function(l){ return l.q + '×' + l.pu; }).join('|'), cmdNum: F.commandeNum === c2.num, ref: F.refClient};
    });
    R.commande_numerotee = r9.suite && r9.format;
    R.commande_multi_articles_total = r9.total === 3 * 28 + 35 + 6;
    R.facture_lignes_articles = r9.lignes === '3×28|1×35|1×6';
    R.facture_reprend_commande = r9.cmdNum && r9.ref === 'BC-12';
    R.besoins_commande_affiches = /Ce qu'il faut pour la fabriquer/.test(await p.textContent('#main'));
    R.titre_commande = (await p.textContent('#main h1')).includes(r9.num);
    /* ajouter un article depuis l'écran */
    await p.click('#cmd-art-add'); await p.waitForTimeout(300);
    R.ajout_article_ecran = (await lire(p)).commandes.find(c=>c.id===r9.id).articles.length === 2;
    /* émettre la facture : le registre montre la commande */
    /* V55 : la facture s'établit une fois la commande livrée */
    await dans(p, function(){ var c = commande(state.commandes.find(function(x){ return x.refClient === 'BC-12'; }).id); c.articles = c.articles.slice(0, 1); c.statut = 'livree'; c.livreeLe = aujourdhuiISO(); sauverTout(); render(); });
    await p.getByRole('button', {name:'Établir la facture'}).click(); await p.waitForTimeout(200);
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(900);
    const st9 = await lire(p);
    const c9 = st9.commandes.find(c=>c.id===r9.id);
    R.facture_emise_multi = !!c9.factureNum && c9.facture.lignes.length === 3 && c9.facture.commandeNum === r9.num;
    await dans(p, function(){ view.cmdVue = null; aller('commandes'); });
    R.registre_lien_commande = await p.locator('[data-cmd="'+r9.id+'"]').count() === 1;

    /* 10. Commande de deux pièces : les pièces vendues se relient dans
       l'ordre (la commande précédente attend encore un sac c3), et une
       pièce de trop ne se relie à rien. */
    const r10 = await dans(p, function(){
      var ancienne = commandes().filter(function(x){ return attendPiece(x, 'c3'); })[0];
      var c = nouvelleCommande(); c.cid = 'c3'; c.qte = 2; c.prixConvenu = 30; c.statut = 'acceptee'; c.brouillon = false; c.dateCommande = '2099-01-01';
      function pz(id){ return {id:id, cid:'c3', prod:'termine', com:'commande', prix:null, mesure:{}, sessions:[], cree:Date.now(), maj:Date.now(), sortie:true}; }
      var l = [pz('x1'), pz('x2'), pz('x3'), pz('x4')];
      l.forEach(function(x){ state.pieces.push(x); majCom(x, 'vendu'); });
      var bil = bilanCommande(c, true);
      return {ordre: l[0].cmdId === (ancienne && ancienne.id) && l[1].cmdId === c.id && l[2].cmdId === c.id, deTrop: !l[3].cmdId,
              pieces: bil.r.nPieces, mat: Math.abs(bil.r.matieres - 2 * calculer(creation('c3')).matieres) < 0.011};
    });
    R.commande_quantite_relie_pieces = r10.ordre && r10.deTrop;
    R.bilan_commande_multi = r10.pieces === 2 && r10.mat;

    /* 11. Anciennes commandes sans numéro : numérotées dans l'ordre */
    const r11 = await p.evaluate(()=>{
      const s = window.CrochomptePont.lire();
      s.commandes.push({id:'vieille1', statut:'livree', client:{nom:'A'}, paiements:[], dateCommande:'2025-03-01T10:00:00Z', prixConvenu:10},
                       {id:'vieille2', statut:'livree', client:{nom:'B'}, paiements:[], dateCommande:'2025-01-01T10:00:00Z', prixConvenu:10});
      window.CrochomptePont.ecrire(JSON.parse(JSON.stringify(s)));
      const t = window.CrochomptePont.lire();
      return [t.commandes.find(c=>c.id==='vieille2').num, t.commandes.find(c=>c.id==='vieille1').num];
    });
    R.migration_numeros = r11[0] === 'C-2025-0001' && r11[1] === 'C-2025-0002';

    /* 12. Patron de la bibliothèque partagée relié à une création */
    /* (depuis V57, l'émission d'une facture laisse sa fenêtre PDF ouverte : on la ferme) */
    for (let i = 0; i < 3 && await p.locator('.dlg').count(); i++){ await dans(p, function(){ try { fermerCouche(); } catch(e){} }); await p.waitForTimeout(250); }
    await p.evaluate(()=>{ window.__biblio = [{id:'pubX', titre:'Bonnet côtes faciles', auteur_affiche:'Anne', licence:'CC BY 4.0',
      texte:'Rang 1 : 60 ms en rond. Rang 2 : 1 ms dans chaque m. Continuer jusqu\'à 20 cm, puis diminuer.', user_id:'autre', cree:Date.now(), retire:false}]; });
    await dans(p, function(){ ouvrirFiche('c2'); });
    await p.waitForTimeout(300);
    const aBiblio = await p.locator('#f-patron option[value="__biblio"]').count();
    if (aBiblio){
      await p.selectOption('#f-patron', '__biblio'); await p.waitForTimeout(600);
      R.biblio_bandeau_lien = /Choisis un patron pour/.test(await p.textContent('#main'));
      await p.locator('#main').getByText('Bonnet côtes faciles').first().click(); await p.waitForTimeout(400);
      await p.getByRole('button', {name:/^Copier et relier/}).click(); await p.waitForTimeout(400);
      const r12 = await dans(p, function(){ var pp = patronPerso(view.draft && view.draft.patron); return {tab: view.tab, lie: !!pp, source: pp && pp.source && pp.source.biblioId}; });
      R.biblio_copie_et_liee = r12.tab === 'fiche' && r12.lie && r12.source === 'pubX';
    } else { R.biblio_bandeau_lien = 'bibliothèque absente du faux serveur'; }

    /* 13. Indicateurs : tuile des pertes */
    await dans(p, function(){ view.draft = null; oublierBrouillon(); view.indPer = 'annee'; aller('indicateurs'); });
    R.indicateurs_pertes = /Tes matières et tes pertes/.test(await p.textContent('#main'));
    await p.close();
  } catch (e) { R._echec = String(e && e.stack || e); }
  console.log(JSON.stringify(R, null, 1));
  console.log("ERREURS JS: " + (errs.length ? errs.join(" | ") : "aucune"));
  await b.close();
})();
