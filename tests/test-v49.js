/* V49 — registres : livre des recettes et registre des achats tirés des ventes,
   règlements, achats de matières et frais de stand (tableur et impression),
   encart « faut-il déclarer mes ventes ? » sous le statut. */
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
      appliquerProfil('pro', {sansRendu:true}); state.reglages.confirmeLe = Date.now(); state.reglages.statut = 'marchandises';
      var y = new Date().getFullYear();
      /* une vente au comptant, une commande avec acompte et solde, un achat, un marché */
      var pv = vendrePiece('c1', 35, 'carte', {le: new Date(y, 2, 10).getTime()});
      var c = nouvelleCommande(); c.client = {nom:'Sam', contact:'', note:''}; c.cid = 'c2'; c.prixConvenu = 28; c.statut = 'livree'; c.brouillon = false; c.factureNum = 'K7R2M-' + y + '-0001';
      c.versement = {montant:10, date: y + '-04-01', type:'acompte'}; c.paiements = [{montant:18, moyen:'virement', date: y + '-05-02', saisiLe:Date.now()}];
      var m = state.matieres[0]; mouvementMatiere(m, 'entree', 100, 6.5, 'Achat'); m.mouv[0].d = new Date(y, 1, 3).getTime();
      var m2 = state.matieres[1]; mouvementMatiere(m2, 'entree', 50, null, 'Achat estimé');
      var mk = marcheDuJour(y + '-06-15'); mk.frais = 12; mk.lieu = 'Place du village';
      sauverTout(); allerOnglet('indicateurs');
    });
    await p.waitForTimeout(400);
    const y = new Date().getFullYear();
    const r = await dans(p, function(){ return livreRecettes(new Date().getFullYear()); });
    R.recettes_trois_lignes = r.length === 3 && r.map(x => x.montant).join(',') === '35,10,18' || (r.length === 3 && r.reduce((a, x) => a + x.montant, 0) === 63);
    R.recettes_details = r.some(x => /Vente de Lapin/.test(x.nature) && x.moyen === 'Carte') && r.some(x => /Acompte/.test(x.nature) && /Facture K7R2M/.test(x.ref)) && r.some(x => x.moyen === 'Virement' && x.montant === 18);
    const a = await dans(p, function(){ return registreAchats(new Date().getFullYear()); });
    R.achats_sans_estimation = a.length === 2 && a.some(x => x.montant === 6.5 && /Matière/.test(x.nature)) && a.some(x => x.montant === 12 && /Frais de stand/.test(x.nature) && x.qui === 'Place du village');
    const txt = (await p.textContent('#main')).replace(/ | /g, ' ');
    R.carte_registres = /Tes registres/.test(txt) && /3 lignes · 63,00 € encaissés/.test(txt) && /2 lignes · 18,50 € d'achats/.test(txt);
    R.boutons = (await p.getByRole('button', {name:'Télécharger (tableur)'}).count()) === 2 && (await p.getByRole('button', {name:'Imprimer / PDF'}).count()) === 2;
    const [dl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', {name:'Télécharger (tableur)'}).first().click()]);
    R.csv_nom = dl.suggestedFilename() === 'crochompte-livre-recettes-' + y + '.csv';
    const csv = require('fs').readFileSync(await dl.path(), 'utf8');
    R.csv_contenu = /Date;Référence/.test(csv.replace(/"/g, '')) && /35,00/.test(csv) && csv.split('\n').length >= 4;
    /* année sans rien */
    await p.selectOption('#reg-annee', String(y - 1)); await p.waitForTimeout(300);
    R.autre_annee_vide = /0 ligne · 0,00 €/.test((await p.textContent('#main')).replace(/ | /g, ' '));
    /* encart déclaration */
    await dans(p, function(){ state.reglages.statut = null; view.regSection = 'activite'; aller('reglages', {garderVue:true}); }); await p.waitForTimeout(300);
    R.encart_declarer = /Faut-il déclarer mes ventes/.test(await p.textContent('#main')) && (await p.locator('#main a[href="https://formalites.entreprises.gouv.fr"]').count()) === 1;
    await p.selectOption('#r-statut', 'marchandises'); await p.waitForTimeout(300);
    R.encart_disparait = !/Faut-il déclarer mes ventes/.test(await p.textContent('#main'));
    /* loisir : pas de registres */
    await dans(p, function(){ appliquerProfil('amateur'); allerOnglet('indicateurs'); }); await p.waitForTimeout(300);
    R.loisir_sans_registres = !/Tes registres/.test(await p.textContent('#main'));
    await p.close();
  } catch (e) { R._echec = String(e && e.stack || e); }
  console.log(JSON.stringify(R, null, 1));
  console.log("ERREURS JS: " + (errs.length ? errs.join(" | ") : "aucune"));
  await b.close();
})();
