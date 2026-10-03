/* V46 — listes : créations repliées (une ligne chacune au-delà de trois),
   pièces vendues dans un historique replié, vingt créations à la fois,
   actions groupées (cocher, terminer, vendre, remettre en stock, supprimer),
   pièces triées par numéro. */
const {chromium} = require('./outils').playwright;
const path = require('path');
const {graine} = require('./aide.js');
const R = {}; const errs = [];
async function page(b){
  const p = await b.newPage({serviceWorkers:'block', viewport:{width:1280, height:900}});
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
(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  try {
    const p = await page(b);
    await graine(p);
    await dans(p, function(){
      appliquerProfil('pro', {sansRendu:true}); state.reglages.confirmeLe = Date.now(); definirVue('creations', 'liste');
      /* 25 créations, 3 pièces chacune dont une vendue */
      for (var i = 0; i < 22; i++){ var cr = clone(creation('c1')); cr.id = 'x' + i; cr.nom = 'Création ' + (i + 10); state.creations.push(cr); }
      state.creations.forEach(function(c){ ajouterPieces(c.id, 1, 'termine', 'vendu'); ajouterPieces(c.id, 1, 'termine', 'envente'); ajouterPieces(c.id, 1, 'encours', 'atelier'); });
      sauverTout(); view.fPieces = 'tous'; view.creaQ = ''; view.creaOuvert = {}; view.creaPage = 1; allerOnglet('creations');
    });
    await p.waitForTimeout(400);
    R.vingt_a_la_fois = (await p.locator('.crea-card').count()) === 20 && (await p.getByRole('button', {name:/Afficher les 5 suivantes/}).count()) === 1;
    R.repliees = (await p.locator('.crea-deplier[aria-expanded="false"]').count()) === 20 && (await p.locator('.t-pieces').count()) === 0;
    const h0 = await p.evaluate(() => document.documentElement.scrollHeight);
    R.page_courte = h0 < 6000;
    await p.getByRole('button', {name:/Afficher les 5 suivantes/}).click(); await p.waitForTimeout(300);
    R.page_suivante = (await p.locator('.crea-card').count()) === 25;
    /* déplier une création : table des pièces actives, vendues dans l'historique */
    await p.locator('.crea-card').first().locator('.crea-deplier').click(); await p.waitForTimeout(300);
    const card = p.locator('.crea-card').first();
    const nomCard = await card.getAttribute('aria-label');
    await p.evaluate(n => window.__cid = (window.__eval('state').creations.filter(c => c.nom === n)[0] || {}).id, nomCard);
    R.depliee = (await card.locator('.t-pieces:not(.t-hist) tbody tr').count()) === 2 && (await card.locator('.crea-hist').count()) === 1 && /Historique : 1 vendue/.test(await card.locator('.crea-hist summary').textContent());
    R.ordre_numero = (await card.locator('.t-pieces:not(.t-hist) tbody tr td[data-l="Pièce"] b').allTextContents()).join(',') === 'N° 3,N° 2';
    await card.locator('.crea-hist summary').click(); await p.waitForTimeout(200);
    R.historique_ouvert = (await card.locator('.t-hist tbody tr').count()) === 1 && /N° 1/.test(await card.locator('.t-hist tbody tr').first().textContent());
    /* actions groupées */
    await card.locator('.t-pieces:not(.t-hist) tbody tr [data-role="sel"]').first().check(); await p.waitForTimeout(150);
    R.barre_selection = !(await p.locator('#sel-barre').isHidden()) && /1 pièce sélectionnée/.test(await p.textContent('#sel-barre'));
    await card.locator('.sel-tout').check(); await p.waitForTimeout(300);
    R.tout_selectionne = /2 pièces sélectionnées/.test(await p.textContent('#sel-barre'));
    await p.getByRole('button', {name:'Marquer terminées'}).click(); await p.waitForTimeout(300);
    R.terminees_groupe = await dans(p, function(){ return piecesDe(window.__cid).every(function(x){ return x.prod === 'termine'; }); });
    await p.locator('.crea-card').first().locator('.sel-tout').check(); await p.waitForTimeout(300);
    await p.getByRole('button', {name:'Marquer vendues'}).click(); await p.waitForTimeout(250);
    await p.selectOption('#sel-moyen', 'carte'); await p.fill('#dlgc-prix', '30'); await p.click('.dlg [data-oui]'); await p.waitForTimeout(400);
    R.vendues_groupe = await dans(p, function(){ var l = piecesDe(window.__cid); return l.length === 3 && l.every(function(x){ return x.com === 'vendu'; }) && l.filter(function(x){ return x.prix === 30 && x.paiement === 'carte'; }).length === 2; });
    /* filtre : déplie ce qui correspond */
    await dans(p, function(){ view.fPieces = 'encours'; view.creaOuvert = {}; render(); }); await p.waitForTimeout(300);
    R.filtre_deplie = (await p.locator('.t-pieces').count()) > 0 && (await p.locator('.crea-deplier[aria-expanded="false"]').count()) === 0;
    /* peu de créations : tout déplié */
    await dans(p, function(){ state.creations = state.creations.slice(0, 3); view.fPieces = 'tous'; sauverTout(); render(); }); await p.waitForTimeout(300);
    R.trois_depliees = (await p.locator('.crea-deplier').count()) === 0 && (await p.locator('.crea-card').count()) === 3;
    await p.setViewportSize({width:390, height:844}); await p.waitForTimeout(300);
    R.tel_sans_debordement = await p.evaluate(()=> document.documentElement.scrollWidth <= window.innerWidth + 1);
    const hTel = await p.evaluate(() => document.documentElement.scrollHeight);
    R.tel_hauteur_raisonnable = hTel < 9000;
    await p.close();
  } catch (e) { R._echec = String(e && e.stack || e); }
  console.log(JSON.stringify(R, null, 1));
  console.log("ERREURS JS: " + (errs.length ? errs.join(" | ") : "aucune"));
  await b.close();
})();
