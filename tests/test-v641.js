/* V64.1 — corrections après le test automatique (TestSprite) :
   matière prise dans le catalogue visible dans « Mes matières », « Noter une
   vente » sans création ouvre une vraie fenêtre, la fiche ouverte depuis le
   catalogue y ramène, versement à la commande vide au départ. */
const {chromium} = require('./outils').playwright;
const path = require('path'); const fs = require('fs');
const R = {}; const errs = [];
async function page(b, profil){
  const p = await b.newPage({serviceWorkers:'block', viewport:{width:1440, height:900}});
  p.on('pageerror', e=>errs.push(e.message));
  await p.route('**/app.js*', async r=>{
    const src = fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
    const i = src.lastIndexOf('})();');
    await r.fulfill({contentType:'text/javascript; charset=utf-8', body: src.slice(0,i) + 'window.__eval = function(c){ return eval(c); };\n' + src.slice(i)});
  });
  await p.route('**/vendor/supabase/**', r=>r.fulfill({path:path.join(__dirname,'faux-supabase-persistant.js'),contentType:'application/javascript'}));
  await p.goto('http://127.0.0.1:8934/index.html'); await p.waitForTimeout(700);
  await p.click('#portail-sans-compte'); await p.waitForTimeout(700);
  await p.getByText(profil === 'pro' ? 'Artisan ou artisane pro' : 'Créateur ou créatrice amateur').click();
  await p.getByText("C'est moi").click(); await p.waitForTimeout(700);
  while (await p.locator('.dlg-fond').count()){ await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
  return p;
}
const ev = (p, code) => p.evaluate(c => window.__eval(c), code);
(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  try {
    /* 1. « Noter une vente » sans création : une fenêtre, qui mène au catalogue */
    const p = await page(b, 'amateur');
    await p.getByRole('button', {name:'Noter une vente'}).click(); await p.waitForTimeout(400);
    R.vente_sans_creation_fenetre = (await p.locator('.dlg-fond').count()) === 1 && /D'abord, ta première création/.test(await p.locator('.dlg-fond').innerText());
    await p.locator('.dlg-fond').getByText('Choisir un modèle').click(); await p.waitForTimeout(600);
    R.vente_sans_creation_vers_catalogue = await ev(p, 'view.tab') === 'catalogue';

    /* 2. Matière du catalogue : visible dans « Mes matières » */
    await ev(p, 'view.sub = "catalogue"; aller("stock")'); await p.waitForTimeout(500);
    const ligne = p.locator('tr[data-cid]').filter({has: p.getByRole('button', {name:'Ajouter à mes matières'})}).first();
    const cid = await ligne.getAttribute('data-cid');
    await ligne.getByRole('button', {name:'Ajouter à mes matières'}).click(); await p.waitForTimeout(300);
    await p.locator('.dlg-fond').getByText("Confirmer l'ajout").click(); await p.waitForTimeout(500);
    R.adoptee_marquee = await ev(p, 'state.matieres.some(function(m){ return m.refCat === ' + JSON.stringify(cid) + ' && m.adoptee && !estExemple(m); })');
    await ev(p, 'view.sub = "matieres"; aller("stock")'); await p.waitForTimeout(500);
    const nom = await ev(p, 'catObjet(catMat(' + JSON.stringify(cid) + ')).nom');
    const txtM = await p.locator('#main').innerText();
    R.adoptee_visible = txtM.includes(nom) && !/Pas encore de matière à toi/.test(txtM);

    /* 3. Fiche ouverte depuis le catalogue : « ← Catalogue », et retour au catalogue */
    await ev(p, 'view.catMode = "types"; view.modeleVu = null; aller("catalogue")'); await p.waitForTimeout(400);
    const mid = await ev(p, 'MODELES[0][0]');
    await ev(p, 'view.modeleVu = ' + JSON.stringify(mid) + '; aller("catalogue")'); await p.waitForTimeout(500);
    await p.getByRole('button', {name:'En faire une création'}).first().click(); await p.waitForTimeout(600);
    R.fiche_ouverte = await ev(p, 'view.tab') === 'fiche';
    R.bouton_retour_catalogue = (await p.getByRole('button', {name:'← Catalogue'}).count()) === 1;
    await p.getByRole('button', {name:'← Catalogue'}).click(); await p.waitForTimeout(400);
    if (await p.locator('.dlg-fond').count()){ await p.locator('.dlg-fond').getByRole('button', {name:'Quitter sans enregistrer'}).click(); await p.waitForTimeout(600); }
    R.retour_au_catalogue = await ev(p, 'view.tab') === 'catalogue';
    /* Une fiche ouverte depuis « Mes créations » garde son retour habituel */
    await ev(p, 'aller("creations")'); await p.waitForTimeout(300);
    await ev(p, 'nouvelleFiche("vide")'); await p.waitForTimeout(500);
    R.bouton_retour_creations = (await p.getByRole('button', {name:'← Mes créations'}).count()) === 1;
    await p.close();

    /* 4. Versement à la commande : champ vide, 30 tapés donnent 30 */
    const q = await page(b, 'pro');
    await q.locator('#nav').getByText('Commandes', {exact:true}).click(); await q.waitForTimeout(500);
    await q.getByText('+ Nouvelle commande').first().click(); await q.waitForTimeout(400);
    await q.getByLabel('Commandé par').fill('Client de test');
    await q.getByLabel('Prix convenu, une pièce (€)').fill('100');
    await q.getByText('Créer la commande').click(); await q.waitForTimeout(400);
    await q.getByText('Confirmer la commande').click(); await q.waitForTimeout(800);
    R.versement_vide = (await q.locator('#cmd-ac-m').inputValue()) === '';
    await q.locator('#cmd-ac-m').click(); await q.keyboard.type('30'); await q.keyboard.press('Tab'); await q.waitForTimeout(700);
    R.versement_30 = await ev(q, 'state.commandes[0].versement.montant') === 30;
    const t = await q.locator('#main').innerText();
    R.reste_70 = /Reste à recevoir\s*70,00/.test(t);
    await q.close();
  } catch(e){ console.log('Error:', e.message); }
  console.log(JSON.stringify(R, null, 2));
  console.log('ERREURS JS: ' + (errs.length ? errs.join(' | ') : 'aucune'));
  await b.close();
})();
