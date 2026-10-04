/* V47 — commandes : nouvelle commande en quatre questions, frise d'étapes avec
   un seul bouton, devis jamais « en retard » (à relancer), filtre « En cours »
   au départ, temps en heures et minutes, détails repliés. */
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
    await dans(p, function(){ appliquerProfil('pro', {sansRendu:true}); state.reglages.confirmeLe = Date.now(); sauverTout(); allerOnglet('commandes'); });
    await p.waitForTimeout(300);
    /* 1. nouvelle commande en 4 questions */
    await p.getByRole('button', {name:'+ Nouvelle commande'}).first().click(); await p.waitForTimeout(250);
    R.dialogue_4_questions = (await p.locator('.dlg #dlgc-nom').count()) === 1 && (await p.locator('.dlg #nc-cid').count()) === 1 && (await p.locator('.dlg #nc-prix').count()) === 1 && (await p.locator('.dlg #nc-date').count()) === 1;
    R.prix_prerempli = (await p.inputValue('#nc-prix')) === '32';
    await p.fill('#dlgc-nom', 'Sam'); await p.selectOption('#nc-cid', 'c2'); await p.waitForTimeout(100);
    R.prix_suit_creation = (await p.inputValue('#nc-prix')) === '28';
    await p.fill('#nc-date', '2026-12-20'); await p.click('.dlg [data-oui]'); await p.waitForTimeout(200);
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(400);   /* V53 : récapitulatif */
    const c1 = await dans(p, function(){ var c = commandes()[0]; return {nom:c.client.nom, cid:c.cid, prix:c.prixConvenu, date:c.datePromise, st:c.statut, accord:!!c.accordLe, brouillon:!!c.brouillon, vue:view.cmdVue === c.id}; });
    R.commande_creee = c1.nom === 'Sam' && c1.cid === 'c2' && c1.prix === 28 && c1.date === '2026-12-20' && c1.st === 'acceptee' && c1.accord && !c1.brouillon && c1.vue;
    /* 2. frise et bouton d'étape */
    R.frise = (await p.locator('.frise li').count()) === 7 && /À fabriquer/.test(await p.locator('.frise li.cur').textContent());
    R.details_replies = !(await p.locator('.cmd-plus').evaluate(d => d.open)) && (await p.locator('.cmd-plus summary').count()) === 1;
    await p.getByRole('button', {name:'Je commence la fabrication'}).click(); await p.waitForTimeout(400);
    R.etape_fabrication = await dans(p, function(){ return commandes()[0].statut === 'encours'; }) && /En fabrication/.test(await p.locator('.frise li.cur').textContent());
    await p.getByRole('button', {name:"C'est prêt"}).click(); await p.waitForTimeout(400);
    await p.getByRole('button', {name:"C'est livré"}).click(); await p.waitForTimeout(400);
    R.etape_livree = await dans(p, function(){ var c = commandes()[0]; return c.statut === 'livree' && !!c.livreeLe; }) && (await p.getByRole('button', {name:'Établir la facture'}).count()) >= 1;
    /* 3. heures et minutes */
    await p.fill('#cmd-h', '2'); await p.fill('#cmd-h-min', '30'); await p.waitForTimeout(200);
    R.heures_minutes = await dans(p, function(){ return Math.abs(commandes()[0].heuresEstimees - 2.5) < 0.001; });
    if (!R.heures_minutes) R._dbg = await dans(p, function(){ return {h: commandes()[0].heuresEstimees, n: document.querySelectorAll('#cmd-h').length, v: document.getElementById('cmd-h') && document.getElementById('cmd-h').value, m: document.getElementById('cmd-h-min') && document.getElementById('cmd-h-min').value}; });
    /* 4. devis en retard = à relancer, pas en retard ; filtre En cours par défaut */
    await dans(p, function(){
      var d = nouvelleCommande(); d.client = {nom:'Zoé', contact:'', note:''}; d.cid = 'c1'; d.prixConvenu = 30; d.statut = 'devis'; d.brouillon = false; d.datePromise = '2026-09-01';
      var e = nouvelleCommande(); e.client = {nom:'Lou', contact:'', note:''}; e.cid = 'c1'; e.prixConvenu = 30; e.statut = 'acceptee'; e.brouillon = false; e.datePromise = '2026-09-01';
      sauverTout(); view.cmdVue = null; view.fCmd = null; aller('commandes');
    });
    await p.waitForTimeout(300);
    R.filtre_en_cours_defaut = (await p.locator('.fchip[aria-pressed="true"]').textContent()).indexOf('En cours') === 0;
    R.livree_hors_en_cours = (await p.locator('#main table.t-cmd tbody tr', {hasText:'Sam'}).count()) === 0;
    await p.getByRole('button', {name:/^Toutes/}).click(); await p.waitForTimeout(300);
    const zoe = await p.locator('#main table.t-cmd tbody tr', {hasText:'Zoé'}).textContent();
    const lou = await p.locator('#main table.t-cmd tbody tr', {hasText:'Lou'}).textContent();
    R.devis_a_relancer = /à relancer/.test(zoe) && !/en retard/.test(zoe) && /À relancer : pas de réponse/.test(zoe);
    R.acceptee_en_retard = /en retard/.test(lou);
    const ordre = await p.$$eval('#main table.t-cmd tbody tr', rs => rs.map(r => r.textContent));
    R.retard_avant_devis = ordre.findIndex(t => /Lou/.test(t)) < ordre.findIndex(t => /Zoé/.test(t));
    R.accueil_pas_devis_en_retard = await dans(p, function(){ return pointsAFaire().every(function(x){ return !/en retard/.test(x.t) || !/Zoé/.test(x.d || ''); }); });
    await p.setViewportSize({width:390, height:844}); await p.waitForTimeout(300);
    R.tel_sans_debordement = await p.evaluate(()=> document.documentElement.scrollWidth <= window.innerWidth + 1);
    const hTel = await p.evaluate(() => document.documentElement.scrollHeight);
    R.tel_lignes_compactes = hTel < 2400;   /* V55 : + le bandeau d'essai (≈ 150 px) */
    await p.close();
  } catch (e) { R._echec = String(e && e.stack || e); }
  console.log(JSON.stringify(R, null, 1));
  console.log("ERREURS JS: " + (errs.length ? errs.join(" | ") : "aucune"));
  await b.close();
})();
