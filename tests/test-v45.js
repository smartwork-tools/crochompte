/* V45 — vendre : vente en un geste (pièce en stock ou créée), jour de marché
   (une touche par vente, total par moyen de paiement, frais du stand, caisse
   du soir, annulation), moyens de paiement en liste. */
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
    await dans(p, function(){ appliquerProfil('pro', {sansRendu:true}); state.reglages.confirmeLe = Date.now(); ajouterPieces('c1', 2, 'termine', 'envente'); sauverTout(); allerOnglet('accueil'); });
    await p.waitForTimeout(300);
    R.bouton_vendre_accueil = (await p.getByRole('button', {name:'Vendre une pièce'}).count()) === 1 && (await p.getByRole('button', {name:'Mes ventes du jour'}).count()) === 1;

    /* 1. vente rapide d'une pièce en stock */
    await p.getByRole('button', {name:'Vendre une pièce'}).click(); await p.waitForTimeout(250);
    R.dialogue_vente = (await p.locator('.dlg #vt-cid').count()) === 1 && /2 pièces prêtes/.test(await p.textContent('#vt-stock'));
    await p.selectOption('#vt-moyen', 'carte'); await p.fill('#vt-prix', '35');
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(300);
    const s1 = await dans(p, function(){ var v = state.pieces.filter(function(x){ return x.com === 'vendu'; }); return {n:v.length, prix:v[0] && v[0].prix, moyen:v[0] && v[0].paiement, stock:enStock('c1'), total:state.pieces.length}; });
    R.vente_stock = s1.n === 1 && s1.prix === 35 && s1.moyen === 'carte' && s1.stock === 1 && s1.total === 2;
    R.toast_vente = /Vendu : Lapin Céleste · 35,00 € · Carte/.test(await p.locator('.toast').allTextContents().then(l => l.join(' ')));

    /* 2. vente d'une création sans stock : la pièce est créée */
    await dans(p, function(){ dialogueVente('c3'); }); await p.waitForTimeout(250);
    R.sans_stock_prevenu = /Aucune pièce en stock/.test(await p.textContent('#vt-stock'));
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(300);
    const s2 = await dans(p, function(){ var v = state.pieces.filter(function(x){ return x.com === 'vendu' && x.cid === 'c3'; }); return {n:v.length, prix:v[0] && v[0].prix, prod:v[0] && v[0].prod}; });
    R.vente_cree_piece = s2.n === 1 && s2.prix === 35 && s2.prod === 'termine';

    /* 3. Mes ventes : le stand */
    await dans(p, function(){ view.ventesPeriode = 'jour'; view.ventesDate = null; aller('ventes'); }); await p.waitForTimeout(300);
    R.onglet_marche_pendant = (await p.$$eval('#nav button', bs => bs.map(b => b.textContent.trim()))).indexOf('Mes ventes') >= 0;
    R.stand_lignes = (await p.locator('.stand-ligne').count()) === 3;
    await p.locator('.stand-ligne', {hasText:'Panier'}).locator('input').fill('40');
    await p.locator('.stand-ligne', {hasText:'Panier'}).getByRole('button', {name:'Vendu'}).click(); await p.waitForTimeout(300);
    await p.getByRole('radio', {name:'Carte'}).click(); await p.waitForTimeout(300);
    await p.locator('.stand-ligne', {hasText:'Bonnet'}).getByRole('button', {name:'Vendu'}).click(); await p.waitForTimeout(300);
    const m = (await p.textContent('#main')).replace(/ | /g, ' ');
    R.total_jour = /Vendu\s*138,00 €/.test(m) && /(Espèces 75,00 € · Carte 63,00 €|Carte 63,00 € · Espèces 75,00 €)/.test(m);
    R.ventes_listees = (await p.locator('.t-ventes tbody tr').count()) === 4;
    await p.fill('#mk-frais', '15'); await p.locator('#mk-frais').dispatchEvent('change'); await p.waitForTimeout(300);
    R.caisse_du_soir = /Caisse du jour\s*123,00 €/.test((await p.textContent('#main')).replace(/\u202f|\u00a0/g, ' '));
    R.marche_enregistre = await dans(p, function(){ return state.marches.length === 1 && state.marches[0].frais === 15; });
    await p.locator('.t-ventes tbody tr', {hasText:'Bonnet'}).getByRole('button', {name:'Annuler'}).click(); await p.waitForTimeout(300);
    R.annulation_confirmee = /n'est plus vendue/.test(await p.locator('.dlg').textContent());   /* V56 : confirmation avant d'effacer la vente */
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(300);
    R.annulation = (await p.locator('.t-ventes tbody tr').count()) === 3 && await dans(p, function(){ return state.pieces.filter(function(x){ return x.com === 'vendu'; }).length === 3 && state.pieces.filter(function(x){ return x.com === 'atelier' && x.cid === 'c2'; }).length === 1; });
    R.canal_marche = await dans(p, function(){ return state.pieces.filter(function(x){ return x.com === 'vendu' && x.canal === 'marche' && x.paiement === 'especes'; }).length === 1; });

    /* 4. profil marché : onglet permanent ; règlement d'une commande en liste */
    await dans(p, function(){ appliquerProfil('pro'); allerOnglet('accueil'); }); await p.waitForTimeout(300);
    R.onglet_marche_profil = (await p.$$eval('#nav button', bs => bs.map(b => b.textContent.trim()))).indexOf('Mes ventes') >= 0 && (await p.getByRole('button', {name:'Mes ventes du jour'}).count()) === 1;
    await dans(p, function(){ var c = nouvelleCommande(); c.client = {nom:'Sam', contact:'', note:''}; c.cid = 'c1'; c.prixConvenu = 30; c.statut = 'livree'; c.livreeLe = aujourdhuiISO(); c.brouillon = false; c.versement = {montant:10, date:aujourdhuiISO(), type:'acompte'}; sauverTout(); view.cmdVue = c.id; aller('commandes', {garderVue:true}); });
    await p.waitForTimeout(300);
    R.moyen_en_liste = (await p.locator('select#cmd-p-moy option').count()) === 6;
    /* 5. la commande livrée apparaît dans Mes ventes avec son reste à recevoir */
    await dans(p, function(){ view.ventesFiltre = 'toutes'; aller('ventes'); }); await p.waitForTimeout(300);
    const v = (await p.textContent('#main')).replace(/\u202f|\u00a0/g, ' ');
    R.commande_dans_ventes = (await p.locator('.t-ventes tbody tr', {hasText:'Sam'}).count()) === 1 && /20,00 €/.test(await p.locator('.t-ventes tbody tr', {hasText:'Sam'}).textContent()) && /Reste à recevoir\s*20,00 €/.test(v);
    R.bouton_encaisser = (await p.locator('.t-ventes tbody tr', {hasText:'Sam'}).getByRole('button', {name:'Encaisser'}).count()) === 1;
    await p.getByRole('button', {name:/^Reste à recevoir/}).click(); await p.waitForTimeout(300);
    R.filtre_reste = (await p.locator('.t-ventes tbody tr').count()) === 1;
    await p.getByRole('button', {name:/^Payées en entier/}).click(); await p.waitForTimeout(300);
    R.filtre_payees = (await p.locator('.t-ventes tbody tr', {hasText:'Sam'}).count()) === 0 && (await p.locator('.t-ventes tbody tr').count()) === 3;

    await p.setViewportSize({width:390, height:844}); await dans(p, function(){ view.ventesFiltre = 'toutes'; aller('ventes'); }); await p.waitForTimeout(300);
    R.tel_sans_debordement = await p.evaluate(()=> document.documentElement.scrollWidth <= window.innerWidth + 1);
    await p.close();
  } catch (e) { R._echec = String(e && e.stack || e); }
  console.log(JSON.stringify(R, null, 1));
  console.log("ERREURS JS: " + (errs.length ? errs.join(" | ") : "aucune"));
  await b.close();
})();
