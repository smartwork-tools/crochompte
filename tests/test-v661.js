/* V66.1 — le compteur de rangs retrouvé :
   accessible depuis « Mes créations » en un geste, présent sur toute fiche
   (avec ou sans patron relié), visible sur téléphone (onglet Fabrication
   ouvert directement), et compter ne marque pas la fiche « modifiée ». */
const {chromium} = require('./outils').playwright;
const path = require('path'); const fs = require('fs');
const R = {}; const errs = [];
async function page(b, w){
  const p = await b.newPage({serviceWorkers:'block', viewport:{width:w, height:900}, isMobile: w < 500, hasTouch: w < 500});
  p.on('pageerror', e=>errs.push(w + ': ' + e.message));
  p.on('dialog', d=>d.dismiss());
  await p.route('**/app.js*', async r=>{
    const src = fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
    const i = src.lastIndexOf('})();');
    await r.fulfill({contentType:'text/javascript; charset=utf-8', body: src.slice(0,i) + 'window.__eval = function(c){ return eval(c); };\n' + src.slice(i)});
  });
  /* l'atelier de démonstration : le lapin a un patron relié, le bonnet non */
  await p.goto('http://127.0.0.1:8934/index.html?demo'); await p.waitForTimeout(1300);
  return p;
}
const ev = (p, code) => p.evaluate(c => window.__eval(c), code);
(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  try {
    for (const w of [1440, 390]){
      const p = await page(b, w);
      await ev(p, 'aller("creations")'); await p.waitForTimeout(400);

      /* 1. Un bouton par création dans « Mes créations » */
      R['bouton_liste_' + w] = (await p.locator('#main button', {hasText:'Compter les rangs'}).count()) >= 6;

      /* 2. Création SANS patron : le bouton ouvre la fiche sur le compteur */
      const carteBonnet = p.locator('section', {has: p.locator('h2', {hasText:'Bonnet côtelé'})}).first();
      await carteBonnet.locator('button', {hasText:'Compter les rangs'}).click(); await p.waitForTimeout(700);
      R['fiche_ouverte_' + w] = await ev(p, 'view.tab === "fiche" && view.ficheId === "cr_bonnet"');
      R['compteur_visible_sans_patron_' + w] = await p.locator('#compteur-fiche .zoneTap').isVisible();
      if (w === 390) R.telephone_onglet_fabrication = await ev(p, 'view.voletFiche === "fab"');
      /* compter trois rangs */
      for (let i = 0; i < 3; i++){ await p.locator('#compteur-fiche .zoneTap').click(); await p.waitForTimeout(80); }
      R['compte_3_rangs_' + w] = (await p.locator('#compteur-fiche .zoneTap .gros').innerText()).trim() === '3';
      R['fiche_pas_modifiee_' + w] = await ev(p, '!ficheModifiee()');
      R['enregistre_' + w] = await ev(p, 'state.compteurs && state.compteurs.cr_bonnet && state.compteurs.cr_bonnet.rang === 3');

      /* 3. Après actualisation, le rang est gardé et affiché dans la liste */
      await p.reload(); await p.waitForTimeout(1200);
      await ev(p, 'aller("creations")'); await p.waitForTimeout(400);
      R['rang_garde_dans_liste_' + w] = (await p.locator('#main button', {hasText:'Compter les rangs (rang 3)'}).count()) === 1;

      /* 4. Création AVEC patron : c'est le compteur du patron (le même partout) */
      const carteLapin = p.locator('section', {has: p.locator('h2', {hasText:'Lapin des bois'})}).first();
      const rangPatronAvant = await ev(p, 'patronPerso(creation("cr_lapin").patron).rang || 0');
      await carteLapin.locator('button', {hasText:'Compter les rangs'}).click(); await p.waitForTimeout(700);
      R['compteur_visible_avec_patron_' + w] = await p.locator('#compteur-fiche .zoneTap').isVisible();
      await p.locator('#compteur-fiche .zoneTap').click(); await p.waitForTimeout(150);
      R['compteur_du_patron_' + w] = await ev(p, 'patronPerso(creation("cr_lapin").patron).rang') === rangPatronAvant + 1;

      /* 5. Hors démonstration, une fiche neuve (pas encore enregistrée) n'a pas de compteur orphelin */
      await ev(p, 'nouvelleFiche("vide")'); await p.waitForTimeout(500);
      if (w === 390 && await p.locator('.volets-fiche button[data-v="fab"]').count()) { await p.locator('.volets-fiche button[data-v="fab"]').click(); await p.waitForTimeout(200); }
      R['fiche_neuve_sans_compteur_' + w] = (await p.locator('#compteur-fiche').count()) === 0;
      await p.close();
    }
  } catch(e){ console.log('Error:', e.message); }
  console.log(JSON.stringify(R, null, 2));
  console.log('ERREURS JS: ' + (errs.length ? errs.join(' | ') : 'aucune'));
  await b.close();
})();
