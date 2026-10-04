/* V61 — retours des tests « en vrai » : le lancement de fabrication survit à
   « J'ai acheté », chrono par étapes en tuiles, matières jamais achetées sans
   fausse alerte, « Nouvelle création » vide, accord validé = même effet que
   la frise, Accueil amateur sans commandes, salut seulement utile, fiche
   commencée reprise depuis Mes créations, matière créée depuis la fiche. */
const {chromium} = require('./outils').playwright;
const path = require('path'); const fs = require('fs');
const R = {}; const errs = [];
async function page(b, o){
  o = o || {};
  const p = await b.newPage({serviceWorkers:'block', viewport:{width:o.w || 1440, height:900}});
  p.on('pageerror', e=>errs.push(e.message));
  p.on('dialog', d=>d.dismiss());
  await p.route('**/app.js*', async r=>{
    const src = fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
    const i = src.lastIndexOf('})();');
    await r.fulfill({contentType:'text/javascript; charset=utf-8', body: src.slice(0,i) + 'window.__eval = function(c){ return eval(c); };\n' + src.slice(i)});
  });
  await p.route('**/vendor/supabase/**', r=>r.fulfill({path:path.join(__dirname,'faux-supabase-persistant.js'),contentType:'application/javascript'}));
  await p.route('**/functions/v1/connexion', r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'AT',refresh_token:'RT'})}));
  await p.goto('http://127.0.0.1:8934/index.html'); await p.waitForTimeout(500);
  if (await p.locator('#sy-c-identifiant').count()){ await p.fill('#sy-c-identifiant','LaineTest'); await p.fill('#sy-c-mdp','motdepasse123'); await p.click('#sy-c-valider'); await p.waitForTimeout(1000); }
  return p;
}
const dans = (p, fn) => p.evaluate(code => window.__eval('(' + code + ')()'), fn.toString());
const txt = async (p, sel) => ((await p.locator(sel).first().textContent()) || '').replace(/ | /g, ' ');
const oui = async (p) => { await p.locator('.dlg [data-oui]:visible').last().click(); await p.waitForTimeout(400); };
(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  try {
    const p = await page(b);
    await dans(p, function(){ appliquerProfil('pro', {sansRendu:true}); var r = state.reglages; r.confirmeLe = Date.now(); r.tauxHoraire = 14; r.tauxPerte = 0;
      state.creations = []; state.pieces = []; state.commandes = [];
      var m = {id:'lin', nom:'Coton Lila · jaune', nomBase:'Coton Lila', couleur:'jaune', cat:'fil', prix:2.5, contenance:50, unite:'g', stock:0, pmp:0.05, mouv:[], variantes:[], perso:true, prixIndicatif:false, cree:1};
      state.matieres.push(m); mouvementMatiere(m, 'inventaire', 100, null, 'départ');
      var ex = {id:'etq', nom:'Étiquette test', cat:'fin', prix:5, contenance:50, unite:'pièce', stock:0, pmp:0.1, mouv:[], variantes:[], perso:false, prixIndicatif:true, cree:2};
      state.matieres.push(ex);
      state.creations.push({id:'cL', nom:'Lapin', canal:'direct', prix:26, lignes:[{mid:'lin', qte:40}, {mid:'etq', qte:1}], temps:{prep:8, crochet:105, assemb:18, finition:12, emball:7}, seuilFini:0, expedition:0});
      sauverTout(); aller('creations'); });
    await p.waitForTimeout(300);

    /* 1. Fabriquer → il manque → « J'ai acheté » → on revient au lancement, qui se fait */
    await p.locator('#main button', {hasText:'Fabriquer'}).first().click(); await p.waitForTimeout(300);
    R.fabriquer_titre_clair = /Fabriquer « Lapin »/.test(await txt(p, '.dlg')) && (await p.inputValue('#ap-prod')) === 'encours';
    await p.fill('#ap-n', '3'); await p.locator('#ap-n').dispatchEvent('input'); await p.waitForTimeout(150);
    R.manque_annonce_avant = /Il manquera de la matière : Coton Lila · jaune/.test(await txt(p, '.dlg'));
    await oui(p);
    R.fenetre_manque = /Il te manque de la matière/.test(await txt(p, '.dlg'));
    R.etiquette_jamais_achetee_ignoree = !/Étiquette test/.test(await txt(p, '.dlg'));
    await p.locator('.manque-liste .lien-mini').first().click(); await p.waitForTimeout(450);
    R.achat_prerempli_avec_le_manque = (await p.inputValue('#am-n')) === '1' && /Une fois l'achat noté, tu reviens au lancement/.test(await txt(p, '.dlg'));
    await oui(p); await oui(p); await p.waitForTimeout(500);
    const f1 = await dans(p, function(){ return {n: piecesDe('cL').length, prod: piecesDe('cL').map(function(x){ return x.prod; }).join(','), stock: matiere('lin').stock}; });
    R.lancement_repris_apres_achat = f1.n === 3 && f1.prod === 'encours,encours,encours' && (await p.locator('.dlg:visible').count()) === 0;
    /* achat abandonné : on retrouve la fenêtre du manque, pas le vide */
    await dans(p, function(){ state.pieces = []; mouvementMatiere(matiere('lin'), 'inventaire', 10, null, 't'); sauverTout(); render(); });
    await p.locator('#main button', {hasText:'Fabriquer'}).first().click(); await p.waitForTimeout(300); await oui(p);
    await p.locator('.manque-liste .lien-mini').first().click(); await p.waitForTimeout(400);
    await p.locator('.dlg [data-non]:visible').last().click(); await p.waitForTimeout(450);
    R.achat_abandonne_revient_au_manque = /Il te manque de la matière/.test(await txt(p, '.dlg'));
    await p.getByRole('button', {name:/Pas maintenant/}).click(); await p.waitForTimeout(300);
    R.pas_maintenant_rien_cree = await dans(p, function(){ return piecesDe('cL').length === 0; });

    /* 2. Une matière jamais achetée n'alerte pas, même après fabrication */
    await dans(p, function(){ mouvementMatiere(matiere('lin'), 'inventaire', 500, null, 't'); ajouterPieces('cL', 2, 'termine', 'atelier'); sauverTout(); });
    const al = await dans(p, function(){ return {neg: pointsAFaire().some(function(x){ return /négatif/.test(x.t) && /Étiquette/.test(x.d); }), suivie: matiereSuivie(matiere('etq')), etat: etatStock(matiere('etq')).lib}; });
    R.pas_d_alerte_matiere_jamais_achetee = !al.neg && !al.suivie && al.etat === 'Non suivie';

    /* 3. Chrono par étapes : une tuile par étape, toucher = lancer / changer / pause */
    await dans(p, function(){ state.pieces = []; sauverTout(); ouvrirFiche('cL'); });
    await p.waitForTimeout(400);
    R.tuiles_etapes = (await p.locator('.ch-et').count()) === 5 && /prévu 1 h 45/.test(await txt(p, '.ch-et[data-k="crochet"]'));
    R.pas_de_seance_en_cours_a_tort = !/Première séance en cours/.test(await txt(p, '.chrono-card'));
    await p.locator('.ch-et[data-k="crochet"]').click(); await p.waitForTimeout(1300);
    const c1 = await dans(p, function(){ var c = chronoEnCours(); return c ? c.poste : null; });
    R.tuile_lance_le_chrono = c1 === 'crochet' && (await p.locator('.ch-et.on[data-k="crochet"]').count()) === 1;
    await p.locator('.ch-et[data-k="finition"]').click(); await p.waitForTimeout(400);
    R.tuile_change_d_etape = await dans(p, function(){ var c = chronoEnCours(); return !!c && c.poste === 'finition'; });
    await p.locator('.ch-et[data-k="finition"]').click(); await p.waitForTimeout(400);
    R.retoucher_met_en_pause = await dans(p, function(){ return !chronoEnCours(); });

    /* 4. « Nouvelle création » part d'une fiche vide */
    await dans(p, function(){ view.draft = null; aller('creations'); }); await p.waitForTimeout(250);
    await p.locator('#main button', {hasText:'Nouvelle création'}).first().click(); await p.waitForTimeout(400);
    R.nouvelle_creation_vide = await dans(p, function(){ return view.draft && view.draft.lignes.length === 0; });
    /* 5. créer une matière depuis la fiche : la vraie fenêtre, puis retour dans la fiche */
    await p.locator('#main button', {hasText:'Ajouter une matière'}).first().click(); await p.waitForTimeout(300);
    await p.fill('#pk-q', 'Mohair kid'); await p.waitForTimeout(250);
    await p.locator('#pk-list button', {hasText:'Créer la matière'}).click(); await p.waitForTimeout(400);
    R.creer_matiere_vraie_fenetre = (await p.inputValue('#nm-nom')) === 'Mohair kid' && (await p.locator('#nm-catalogue').count()) === 0;
    await p.fill('#nm-prix', '7,5'); await p.fill('#nm-cont', '25'); await oui(p); await p.waitForTimeout(400);
    R.matiere_creee_dans_la_fiche = await dans(p, function(){ var m = state.matieres.filter(function(x){ return x.nom === 'Mohair kid'; })[0]; return !!m && m.prix === 7.5 && view.tab === 'fiche' && view.draft.lignes.some(function(l){ return l.mid === m.id; }); });
    /* 6. la fiche commencée se reprend depuis Mes créations */
    await p.fill('#f-nom', 'Snood brouillon'); await p.waitForTimeout(700);
    await dans(p, function(){ view.draft = null; aller('creations'); }); await p.waitForTimeout(300);
    R.reprendre_depuis_mes_creations = /Snood brouillon/.test(await txt(p, '#main')) && (await p.locator('#main button', {hasText:'Reprendre la fiche'}).count()) === 1;

    /* 7. « Valider l'accord » réserve aussi le stock prêt */
    await dans(p, function(){ state.pieces = []; ajouterPieces('cL', 1, 'termine', 'atelier');
      var c = nouvelleCommande(); c.client = {nom:'Inès'}; c.cid = 'cL'; c.qte = 1; c.prixConvenu = 26; delete c.brouillon; window.__c = c.id; sauverTout(); view.cmdVue = c.id; aller('commandes', {garderVue:true}); });
    await p.waitForTimeout(300);
    await p.getByRole('button', {name:/Valider l'accord/}).click(); await p.waitForTimeout(600);
    R.valider_accord_propose_reservation = /Des pièces prêtes sont en stock/.test(await txt(p, '.dlg'));
    await oui(p);
    R.valider_accord_reserve = await dans(p, function(){ var c = commande(window.__c); return c.statut === 'acceptee' && piecesCommande(c).length === 1; });

    /* 8. amateur : pas de commandes à l'Accueil */
    await dans(p, function(){ state.commandes = []; appliquerProfil('amateur', {sansRendu:true}); state.reglages.prendCommandes = false; sauverTout(); aller('accueil'); });
    await p.waitForTimeout(300);
    R.amateur_sans_tuile_commandes = !/Commandes à fabriquer/.test(await txt(p, '#main')) && !/vente ou commande/.test(await txt(p, '#main'));
    await dans(p, function(){ appliquerProfil('pro', {sansRendu:true}); render(); });

    /* 9. téléphone : tuiles sur une ligne, rien ne déborde */
    await p.setViewportSize({width:390, height:844}); await dans(p, function(){ ouvrirFiche('cL'); }); await p.waitForTimeout(400);
    const tops = await p.$$eval('.ch-et', xs => xs.map(x => Math.round(x.getBoundingClientRect().top)));
    R.tel_tuiles_une_ligne = tops.length === 5 && tops.every(t => t === tops[0]);
    R.tel_sans_debordement = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    await p.close();
  } catch (e) { R._echec = String(e && e.stack || e); }
  console.log(JSON.stringify(R, null, 1));
  console.log("ERREURS JS: " + (errs.length ? errs.join(" | ") : "aucune"));
  await b.close();
})();
