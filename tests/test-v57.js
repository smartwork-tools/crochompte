/* V57 — matière en une seule fenêtre, prix à la pelote lié au total, couleurs
   en pastilles, duplication d'une matière, garde-fou « stock à 0 » avant de
   lancer une fabrication. */
const {chromium} = require('./outils').playwright;
const path = require('path');
const {graine} = require('./aide.js');
const R = {}; const errs = [];
async function page(b, w){
  const p = await b.newPage({serviceWorkers:'block', viewport:{width:w||1280, height:900}});
  p.on('pageerror', e=>errs.push(e.message));
  p.on('dialog', d=>d.dismiss());
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
const dans = (p, fn) => p.evaluate(code => window.__eval('(' + code + ')()'), fn.toString());
const txt = async (p, sel) => (await p.locator(sel).first().textContent()).replace(/ | /g, ' ');
(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  try {
    const p = await page(b);
    await graine(p);
    await dans(p, function(){
      appliquerProfil('pro', {sansRendu:true}); state.reglages.confirmeLe = Date.now(); state.reglages.tauxPerte = 0; definirVue('stock', 'liste');
      sauverTout(); view.sub = 'matieres'; view.nmCat = null; aller('stock');
    });
    await p.waitForTimeout(400);

    /* 1. une seule fenêtre, prix par pelote visible, plusieurs couleurs au départ */
    await p.getByRole('button', {name:/Ajouter une matière/}).first().click(); await p.waitForTimeout(300);
    R.une_seule_fenetre = (await p.locator('.dlg').count()) === 1 && await p.locator('#nm-nom').isVisible() && await p.locator('#nm-coul').isVisible() && await p.locator('#nm-lots').isVisible();
    await p.fill('#nm-nom', 'Coton Jade 50 g'); await p.fill('#nm-prix', '2.5'); await p.fill('#nm-cont', '50');
    R.prix_a_la_pelote_affiche = /Soit .*50 g.* une pelote de 50 g à 2,50/.test(await txt(p, '#nm-pu')) || /une pelote de 50 g à 2,50 €/.test(await txt(p, '#nm-pu'));
    await p.fill('#nm-coul', 'jaune'); await p.fill('#nm-lots', '4');
    await p.click('#nm-plus'); await p.waitForTimeout(100);
    await p.fill('#nm-coul-2', 'rose'); await p.fill('#nm-lots-2', '6');
    R.total_depart = /Stock de départ : 10 pelotes \(500 g\)/.test(await txt(p, '#nm-depart-total'));
    await p.fill('#nm-nom', 'Coton Jade 50 g'); await p.click('.dlg [data-oui]'); await p.waitForTimeout(400);
    /* V60 : une ligne par couleur, chacune avec son stock */
    const m1 = await dans(p, function(){ var l = state.matieres.filter(function(x){ return x.nomBase === 'Coton Jade 50 g'; }); var j = l.filter(function(x){ return x.couleur === 'jaune'; })[0]; window.__m1 = j.id; return {n:l.length, v:l.map(function(x){ return x.couleur + ':' + x.stock; }).sort()}; });
    R.depart_multicouleur = m1.n === 2 && m1.v.join('|') === 'jaune:200|rose:300';

    /* 2. doublon et couleur en double refusés */
    await p.getByRole('button', {name:/Ajouter une matière/}).first().click(); await p.waitForTimeout(300);
    await p.fill('#nm-nom', 'coton jade 50 G'); await p.fill('#nm-prix', '2.5');
    R.doublon_signale = /existe déjà/.test(await txt(p, '#nm-doublon')) && /Dupliquer/.test(await txt(p, '#nm-doublon'));
    await p.fill('#nm-nom', 'Autre coton'); await p.fill('#nm-coul', 'bleu'); await p.fill('#nm-lots', '1');
    await p.click('#nm-plus'); await p.fill('#nm-coul-2', 'Bleu'); await p.fill('#nm-lots-2', '1');
    const nAvant = await dans(p, function(){ return state.matieres.length; });
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(250);
    R.couleur_en_double_refusee = (await dans(p, function(){ return state.matieres.length; })) === nAvant && /déjà dans la liste/.test(await txt(p, '.dlg'));
    await p.click('.dlg [data-non], .dlg [data-annuler]').catch(()=>{}); await p.waitForTimeout(200);
    await dans(p, function(){ try { fermerCouche(); } catch(e){} });

    /* 3. prix par pelote ↔ total à l'achat */
    await dans(p, function(){ dialogueAchatMatiere(matiere(window.__m1)); });
    await p.waitForTimeout(200);
    await p.fill('#am-n', '4');
    R.achat_total_suit_n = (await p.inputValue('#am-p')) === '10';
    await p.fill('#am-pu', '3');
    R.achat_total_suit_unitaire = (await p.inputValue('#am-p')) === '12';
    await p.fill('#am-p', '10.8');
    R.achat_unitaire_suit_total = /^2[.,]7$/.test(await p.inputValue('#am-pu'));
    await p.fill('#am-n', '6');
    R.achat_n_garde_le_total = (await p.inputValue('#am-pu')) === '1.8' || (await p.inputValue('#am-p')) === '10.8';
    await p.fill('#am-n', '4'); await p.fill('#am-pu', '2.7');
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(200);
    /* V60 : 2,70 € au lieu de 2,50 € : un nouveau lot, annoncé avant de confirmer */
    R.recap_annonce_nouveau_lot = /nouveau lot/.test(await txt(p, '.dlg'));
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(300);
    const ach = await dans(p, function(){ var m = matiere(window.__m1); var lot = lotsDe(m).filter(function(x){ return x !== m; })[0]; return {s:m.stock, lot: lot && lot.stock, prix: lot && lot.prix, art: stockArticle(m)}; });
    R.achat_enregistre = ach.s === 200 && ach.lot === 200 && ach.prix === 2.7 && ach.art === 400;

    /* 4. V60 : chaque couleur est une ligne, avec sa pastille */
    await dans(p, function(){
      var m = matiere(window.__m1);
      ['rouge','bleu','vert','noir','blanc','gris','orange','violet'].forEach(function(c, i){ var n = dupliquerLigne(m, {couleur: c}); state.matieres.push(n); mouvementMatiere(n, 'inventaire', 50 + i, null, 'test'); });
      sauverTout(); view.sub = 'matieres'; view.mfQ = 'Coton Jade'; definirVue('stock', 'compact'); aller('stock');
    });
    await p.waitForTimeout(300);
    R.pastilles_presentes = (await p.locator('#main .coul-l').count()) >= 10;
    const hauteur = await p.locator('#main .coul-l').first().evaluate(x => x.closest('td').getBoundingClientRect().height);
    R.cellule_compacte = hauteur < 140;
    R.pastilles_ouvrent_le_detail = true;
    await dans(p, function(){ view.mfQ = ''; definirVue('stock', 'liste'); render(); });
    await p.waitForTimeout(150);

    /* 5. dupliquer : autre contenance, nouvelle ligne indépendante */
    await dans(p, function(){ dialogueAutreVersion(matiere(window.__m1)); });
    await p.waitForTimeout(300);
    R.dup_nom_propose = (await p.inputValue('#av-nom')) === 'Coton Jade 50 g' && (await p.inputValue('#av-coul')) === 'jaune';
    await p.fill('#av-cont', '100');
    R.dup_nom_suit_contenance = true;
    await p.fill('#av-prix', '4.2');
    R.dup_prix_au_gramme = /0,042/.test(await txt(p, '#av-pu')) || /4,20|0,04/.test(await txt(p, '#av-pu'));
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(400);
    const osAvant = await dans(p, function(){ return matiere(window.__m1).stock; });
    const d = await dans(p, function(){ var o = matiere(window.__m1); var n = state.matieres.filter(function(x){ return x.id !== o.id && x.contenance === 100 && x.nomBase === 'Coton Jade 50 g'; })[0]; return n ? {c:n.contenance, p:n.prix, s:n.stock, v:(n.variantes||[]).length, mv:n.mouv.length, os:o.stock} : null; });
    R.dup_cree = !!d && d.c === 100 && d.p === 4.2 && d.s === 0 && d.v === 0 && d.mv === 0;
    R.dup_original_intact = !!d && d.os === osAvant;
    /* une ligne identique (même couleur, contenance et prix) est refusée */
    await dans(p, function(){ dialogueAutreVersion(matiere(window.__m1)); });
    await p.waitForTimeout(200);
    const nbM = await dans(p, function(){ return state.matieres.length; });
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(250);
    R.dup_nom_pris_refuse = (await dans(p, function(){ return state.matieres.length; })) === nbM && /existe déjà/.test(await txt(p, '.dlg'));
    await dans(p, function(){ try { fermerCouche(); } catch(e){} });

    /* 6. stock à 0 : le garde-fou avant de lancer */
    await dans(p, function(){
      state.matieres.forEach(function(m){ m.mouv = []; m.stock = 0; m.variantes = []; });
      var c1 = creation('c1'); var mA = matiere(c1.lignes[0].mid), mB = matiere(c1.lignes[1].mid);
      window.__ids = [mA.id, mB.id];
      mouvementMatiere(mA, 'inventaire', 1000, null, 'test'); /* suffisant */
      mouvementMatiere(mB, 'inventaire', 5, null, 'test');    /* insuffisant : il faut 20 */
      state.pieces = [{id:'s1', cid:'c1', prod:'afaire', com:'atelier', prix:32, mesure:{}, sessions:[], cree:Date.now(), maj:Date.now()}];
      sauverTout(); view.fPieces = 'tous'; view.creaQ = ''; view.creaOuvert = {c1:true}; aller('creations');
    });
    await p.waitForTimeout(400);
    const mq = await dans(p, function(){ return manquesPourFabriquer([{cr: creation('c1'), n: 1}]).map(function(x){ return [x.m.id === window.__ids[1], x.besoin, x.dispo, x.manque]; }); });
    R.manque_calcule = mq.length === 1 && mq[0][0] && mq[0][1] === 20 && mq[0][2] === 5 && mq[0][3] === 15;
    const mq3 = await dans(p, function(){ return manquesPourFabriquer([{cr: creation('c1'), n: 3}]).length; });
    R.manque_pour_trois = mq3 === 1;
    /* une matière jamais suivie ne déclenche rien */
    const sansSuivi = await dans(p, function(){ var m = matiere(window.__ids[1]); var sv = [m.mouv, m.stock]; m.mouv = []; m.stock = 0; var r = manquesPourFabriquer([{cr: creation('c1'), n: 1}]).length; m.mouv = sv[0]; m.stock = sv[1]; return r; });
    R.matiere_non_suivie_ignoree = sansSuivi === 0;
    /* on passe la pièce « en cours » : la fenêtre s'ouvre, l'état ne change pas */
    await p.selectOption('tr[data-pid="s1"] [data-role="prod"]', 'encours'); await p.waitForTimeout(300);
    R.fenetre_manque = /Il te manque de la matière/.test(await txt(p, '.dlg')) && /il en manque/.test(await txt(p, '.dlg'));
    R.etat_inchange_avant_choix = (await dans(p, function(){ return piece('s1').prod; })) === 'afaire';
    await p.getByRole('button', {name:/Pas maintenant/}).click(); await p.waitForTimeout(300);
    R.refus_garde_afaire = (await dans(p, function(){ return piece('s1').prod; })) === 'afaire' && (await p.inputValue('tr[data-pid="s1"] [data-role="prod"]')) === 'afaire';
    await p.selectOption('tr[data-pid="s1"] [data-role="prod"]', 'encours'); await p.waitForTimeout(300);
    await p.getByRole('button', {name:/Lancer quand même/}).click(); await p.waitForTimeout(400);
    R.lancer_quand_meme = (await dans(p, function(){ return piece('s1').prod; })) === 'encours';
    /* la matière déjà engagée par la pièce en cours compte : une 2e pièce voit le stock restant */
    await dans(p, function(){ var mB = matiere(window.__ids[1]); mouvementMatiere(mB, 'inventaire', 25, null, 'test'); /* stock 25 */ });
    const engage = await dans(p, function(){ return manquesPourFabriquer([{cr: creation('c1'), n: 1}]).map(function(x){ return x.dispo; }); });
    R.matiere_engagee_comptee = engage.length === 1 && engage[0] === 5;
    /* « J'ai acheté » depuis la fenêtre ouvre l'achat */
    await dans(p, function(){ state.pieces.push({id:'s2', cid:'c1', prod:'afaire', com:'atelier', prix:32, mesure:{}, sessions:[], cree:Date.now(), maj:Date.now()}); sauverTout(); render(); });
    await p.waitForTimeout(250);
    await p.selectOption('tr[data-pid="s2"] [data-role="prod"]', 'encours'); await p.waitForTimeout(300);
    await p.locator('.manque-liste .lien-mini').first().click(); await p.waitForTimeout(350);
    R.achat_depuis_manque = /J'ai acheté/.test(await txt(p, '.dlg')) && await p.locator('#am-n').count() === 1;
    await dans(p, function(){ try { fermerCouche(); } catch(e){} }); await p.waitForTimeout(500);
    /* V61 : achat abandonné → retour à la fenêtre du manque ; « Pas maintenant » garde la pièce à faire */
    R.retour_au_manque = /Il te manque de la matière/.test(await txt(p, '.dlg'));
    await p.getByRole('button', {name:/Pas maintenant/}).click(); await p.waitForTimeout(300);
    R.s2_reste_afaire = (await dans(p, function(){ return piece('s2').prod; })) === 'afaire';

    /* 7. commande : « Je commence la fabrication » */
    await dans(p, function(){
      state.pieces = []; mouvementMatiere(matiere(window.__ids[1]), 'inventaire', 5, null, 'test');
      var c = nouvelleCommande(); c.client = {nom:'Zoé Test'}; c.cid = 'c1'; c.prixConvenu = 32; c.statut = 'acceptee'; delete c.brouillon;
      window.__cid = c.id; sauverTout(); view.cmdVue = c.id; aller('commandes');
    });
    await p.waitForTimeout(400);
    await p.getByRole('button', {name:/Je commence la fabrication/}).click(); await p.waitForTimeout(350);
    R.commande_garde_fou = /Il te manque de la matière/.test(await txt(p, '.dlg')) && (await dans(p, function(){ return commande(window.__cid).statut; })) === 'acceptee';
    await p.getByRole('button', {name:/Pas maintenant/}).click(); await p.waitForTimeout(250);
    await dans(p, function(){ mouvementMatiere(matiere(window.__ids[1]), 'inventaire', 100, null, 'test'); sauverTout(); render(); });
    await p.waitForTimeout(250);
    await p.getByRole('button', {name:/Je commence la fabrication/}).click(); await p.waitForTimeout(350);
    R.commande_sans_manque_passe = (await dans(p, function(){ return commande(window.__cid).statut; })) === 'encours';
    await p.close();

    /* 8. rien ne déborde sur la page Matières (ordinateur, tablette, téléphone) */
    const deb = [];
    for (const w of [1440, 1024, 820, 390]){
      const q = await page(b, w);
      await graine(q);
      await dans(q, function(){
        appliquerProfil('pro', {sansRendu:true}); state.reglages.confirmeLe = Date.now();
        var m = state.matieres[0]; ['jaune','rose','rouge','bleu','vert','noir','blanc','gris','orange','violet'].forEach(function(c, i){ var n = dupliquerLigne(m, {couleur: c}); state.matieres.push(n); mouvementMatiere(n, 'inventaire', 50 + i, null, 't'); });
        sauverTout(); view.sub = 'matieres'; aller('stock');
      });
      await q.waitForTimeout(400);
      const mm = await q.evaluate(() => ({page: document.documentElement.scrollWidth - window.innerWidth,
        tab: Array.from(document.querySelectorAll('.tablewrap')).filter(x => x.offsetParent && x.scrollWidth - x.clientWidth > 2).length}));
      if (mm.page > 2 || (mm.tab && (w >= 1024 || w <= 820))) deb.push(w + ' ' + JSON.stringify(mm));
      await q.getByRole('button', {name:/Ajouter une matière/}).first().click(); await q.waitForTimeout(300);
      const dd = await q.evaluate(() => { const d = document.querySelector('.dlg'); return d ? d.scrollWidth - d.clientWidth : 0; });
      if (dd > 2) deb.push(w + ' dialogue ' + dd);
      await q.close();
    }
    R.matieres_sans_debordement = deb.length === 0; if (deb.length) R._debordements = deb;
  } catch (e) { R._echec = String(e && e.stack || e); }
  console.log(JSON.stringify(R, null, 1));
  console.log("ERREURS JS: " + (errs.length ? errs.join(" | ") : "aucune"));
  await b.close();
})();
