/* V48 — alléger : stock visible dans « Mes matières » avec « J'ai acheté »,
   catalogue (recherche dans tous les types, bouton de création en haut, droits
   photo repliés), fiche (marges repliées), Mes chiffres (quatre chiffres puis
   des sections repliées), un seul bouton pour ajouter un patron. */
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
    await dans(p, function(){ appliquerProfil('pro', {sansRendu:true}); state.reglages.confirmeLe = Date.now(); definirVue('stock', 'liste'); view.mfExemples = true; sauverTout(); view.sub = 'matieres'; aller('stock'); });
    await p.waitForTimeout(300);
    /* 1. Mes matières : stock visible et achat en place */
    R.colonne_stock = /En stock/.test(await p.textContent('#main thead'));
    const ligne = p.locator('tr[data-mid]').first();
    const mid = await ligne.getAttribute('data-mid');
    await p.evaluate(id => window.__mid = id, mid);
    const avant = await dans(p, function(){ var m = matiere(window.__mid); return {stock:Number(m.stock)||0, cont:m.contenance, prix:m.prix}; });
    await ligne.getByRole('button', {name:"J'ai acheté"}).click(); await p.waitForTimeout(250);
    R.dialogue_achat = (await p.locator('.dlg #am-n').count()) === 1 && /en stock/.test(await p.textContent('#am-aide'));
    await p.fill('#am-n', '2'); await p.fill('#am-p', '7'); await p.click('.dlg [data-oui]'); await p.waitForTimeout(200);
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(400);   /* V53 : récapitulatif */
    const apres = await dans(p, function(){ var m = matiere(window.__mid); return {stock:Number(m.stock)||0, prix:m.prix, indic:m.prixIndicatif, mv:(m.mouv||[])[0]}; });
    R.achat_note = Math.abs(apres.stock - (avant.stock + 2 * avant.cont)) < 0.001 && apres.mv && apres.mv.t === 'entree' && Math.abs(apres.mv.p - 7) < 0.001 && !apres.indic && Math.abs(apres.prix - 3.5) < 0.001;

    /* 2. catalogue : la recherche trouve tous les types ; bouton en haut ; droits repliés */
    await dans(p, function(){ view.catMode = 'modeles'; view.filtre = 'tous'; view.recherche = 'bonnet'; view.catPat = 'tous'; view.modeleVu = null; aller('catalogue', {garderVue:true}); });
    await p.waitForTimeout(300);
    R.recherche_tous_types = (await p.textContent('#main')).indexOf('Bonnet adulte') >= 0;
    await dans(p, function(){ view.modeleVu = 'bonnet'; render(); }); await p.waitForTimeout(300);
    const boutons = await p.$$eval('#main button', bs => bs.map(b => b.textContent.trim()));
    R.bouton_fiche_en_haut = boutons.indexOf('En faire une création') >= 0 && boutons.indexOf('En faire une création') < 4;
    R.droits_replies = (await p.locator('details:has-text("Photo du modèle et droits")').count()) === 1 && !(await p.locator('details:has-text("Photo du modèle et droits")').evaluate(d => d.open));

    /* 3. fiche : marges repliées, prix conseillé visible */
    await dans(p, function(){ ouvrirFiche('c1'); }); await p.waitForTimeout(300);
    R.marges_repliees = (await p.locator('details.marges-d').count()) === 1 && !(await p.locator('details.marges-d').evaluate(d => d.open)) && /Prix conseillé :/.test(await p.textContent('#r-obj'));

    /* 4. Mes chiffres : quatre tuiles en haut, le reste replié */
    await dans(p, function(){ ajouterPieces('c1', 1, 'termine', 'vendu'); sauverTout(); allerOnglet('indicateurs'); }); await p.waitForTimeout(300);
    R.titre_mes_chiffres = /Mes chiffres/.test(await p.textContent('#main h1'));
    R.quatre_tuiles = (await p.locator('#main > .tiles').first().locator('.tile').count()) === 5;   /* V59 : + « Vendu » */
    const plis = await p.$$eval('details.ind-pli', ds => ds.map(d => [d.querySelector('summary').textContent.trim(), d.open]));
    R.sections_repliees = plis.length >= 2 && plis.every(x => !x[1]);
    R.seuils_visibles = (await p.locator('#main').textContent()).indexOf('Tes seuils') >= 0;

    /* 5. patrons : un seul bouton */
    await dans(p, function(){ allerOnglet('patrons'); }); await p.waitForTimeout(300);
    R.un_bouton_patron = (await p.getByRole('button', {name:'+ Ajouter un patron'}).count()) >= 1 && (await p.getByRole('button', {name:'Charger un fichier'}).count()) === 0;
    await p.setViewportSize({width:390, height:844}); await dans(p, function(){ view.sub = 'matieres'; aller('stock'); }); await p.waitForTimeout(300);
    R.tel_sans_debordement = await p.evaluate(()=> document.documentElement.scrollWidth <= window.innerWidth + 1);
    await p.close();
  } catch (e) { R._echec = String(e && e.stack || e); }
  console.log(JSON.stringify(R, null, 1));
  console.log("ERREURS JS: " + (errs.length ? errs.join(" | ") : "aucune"));
  await b.close();
})();
