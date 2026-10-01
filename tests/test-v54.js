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
    /* 1. profil amateur : 0 % de cotisations, pas de facture, pas de TVA */
    const am = await dans(p, function(){
      state.reglages.cotisations = 12.4; appliquerProfil('amateur', {sansRendu:true});
      var r = calculer(creation('c1'));
      var c = nouvelleCommande(); c.client = {nom:'Zoé'}; c.cid = 'c1'; c.prixConvenu = 32; c.statut = 'livree'; c.livreeLe = aujourdhuiISO(); delete c.brouillon;
      sauverTout();
      return {cot: state.reglages.cotisations, rc: r.cotisations, etape: etapeCommande(c).k, pro: estPro()};
    });
    R.amateur_sans_cotisations = am.cot === 0 && am.rc === 0 && !am.pro;
    R.amateur_commande_sans_facture = am.etape === 'aencaisser';
    await dans(p, function(){ view.cmdVue = null; aller('commandes'); });
    await p.waitForTimeout(300);
    const txtCmd = await p.locator('#main').textContent();
    R.amateur_pas_de_facture_a_lecran = !/À facturer/.test(txtCmd) && !/Registre des factures/.test(txtCmd) && !/Livrées à facturer/.test(txtCmd);
    const mig = await dans(p, function(){ var s2 = clone(state); s2.reglages.statut = 'non_declare'; s2.reglages.cotisations = 12.4; migrer(s2); return s2.reglages.cotisations; });
    R.migration_non_declare_zero = mig === 0;
    /* 2. pro, Accueil à trois tuiles, relances */
    await dans(p, function(){
      appliquerProfil('pro', {sansRendu:true}); state.reglages.statut = 'marchandises'; state.reglages.cotisations = 12.4; state.reglages.confirmeLe = Date.now();
      state.commandes = [];
      ajouterPieces('c1', 1, 'termine'); var p1 = piecesDe('c1')[0]; majCom(p1, 'vendu', 32);
      var c = nouvelleCommande(); c.client = {nom:'Camille'}; c.cid = 'c2'; c.prixConvenu = 28; c.statut = 'livree'; c.livreeLe = '2026-08-01'; delete c.brouillon;
      var d = nouvelleCommande(); d.client = {nom:'Léa'}; d.statut = 'devis'; d.dateCommande = new Date(Date.now() - 10*86400000).toISOString(); delete d.brouillon;
      sauverTout(); aller('accueil');
    });
    await p.waitForTimeout(400);
    const sm = await dans(p, function(){ var s = syntheseMois(); var p1 = piecesDe('c1')[0]; return {gain:s.gain, attendu:coutPiece(p1, creation('c1')).gain, reste:s.reste, devis:s.devis}; });
    R.tuiles_presentes = await p.locator('.acc3 .t3').count() === 3;
    R.gagne_ce_mois_coherent = Math.abs(sm.gain - sm.attendu) < 0.01 && sm.reste === 28 && sm.devis === 1;
    const todo = await p.locator('.card', {hasText:'À faire'}).first().textContent();
    R.relance_impaye_30j = /impayés depuis plus de 30 jours/.test(todo);
    R.relance_devis_7j = /devis sans réponse depuis plus de 7 jours/.test(todo);
    R.relance_a_facturer = /livrée à facturer/.test(todo);
    R.aucun_toast_ouverture = !(await p.locator('.toast', {hasText:'Profil'}).count());
    /* 3. recherche globale */
    await p.fill('#rech-g', 'lapin celest'); await p.waitForTimeout(200);
    R.recherche_globale = /Lapin Céleste/.test(await p.locator('#rech-res').textContent()) && /Créations/.test(await p.locator('#rech-res').textContent());
    await p.fill('#rech-g', 'camile'); await p.waitForTimeout(200);
    R.recherche_globale_tolerante = /Camille/.test(await p.locator('#rech-res').textContent());
    await p.fill('#rech-g', 'lapin'); await p.waitForTimeout(150); await p.press('#rech-g', 'Enter'); await p.waitForTimeout(300);
    R.entree_ouvre_le_premier = await dans(p, function(){ return view.tab === 'fiche' && view.ficheId === 'c1'; });
    /* 4. dupliquer */
    await dans(p, function(){ view.draft = null; view.ficheId = null; view.creaQ = ''; aller('creations'); });
    await p.waitForTimeout(300);
    await p.locator('.crea-card', {hasText:'Bonnet côtelé'}).getByRole('button', {name:'Dupliquer'}).click(); await p.waitForTimeout(300);
    R.dupliquer = await dans(p, function(){ return view.tab === 'fiche' && view.draft && view.draft.nom === 'Bonnet côtelé (copie)' && view.draft.id !== 'c2' && !view.draft.photo && view.draft.lignes.length === creation('c2').lignes.length; });
    /* 5. quitter « Vendue » : avertissement */
    await dans(p, function(){ view.draft = null; view.creaOuvert = {c1:true}; view.creaHist = {c1:true}; view.fPieces = 'tous'; aller('creations'); });
    await p.waitForTimeout(300);
    const pid = await dans(p, function(){ return piecesDe('c1').filter(function(x){ return x.com === 'vendu'; })[0].id; });
    await p.selectOption('tr[data-pid="'+pid+'"] [data-role="com"]', 'atelier'); await p.waitForTimeout(250);
    R.avertit_avant_de_quitter_vendue = /n'est plus vendue/.test(await p.locator('.dlg').textContent()) && /32,00/.test(await p.locator('.dlg').textContent());
    await p.click('.dlg [data-non]'); await p.waitForTimeout(250);
    R.garder_vendue = await dans(p, function(x){ return true; }) && await dans(p, function(){ return piecesDe('c1').some(function(x){ return x.com === 'vendu' && x.prix === 32; }); });
    /* 6. gain de l'heure invraisemblable signalé */
    await dans(p, function(){ var cr = creation('c3'); cr.prix = 70; cr.temps = {prep:0, crochet:19, assemb:0, finition:0, emball:0}; ajouterPieces('c3', 1, 'afaire'); view.creaOuvert = {c3:true}; view.creaHist = {c3:true}; sauverTout(); render(); });
    await p.waitForTimeout(300);
    const pid3 = await dans(p, function(){ return piecesDe('c3')[0].id; });
    R.gain_invraisemblable_signale = /temps à vérifier : 19 min/.test(await p.locator('tr[data-pid="'+pid3+'"]').textContent());
    await p.click('tr[data-pid="'+pid3+'"] [data-role="cout"]'); await p.waitForTimeout(250);
    R.detail_explique_le_temps = /temps prévu dans la fiche/.test(await p.locator('.dlg').textContent());
    /* 7. aide « ? » */
    await p.locator('.dlg .aide-q').first().click(); await p.waitForTimeout(250);
    R.aide_contextuelle = /Exemple/.test(await p.locator('.dlg').last().textContent());
    await p.keyboard.press('Escape'); await p.waitForTimeout(150); await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    R.carte_a_verifier = /À vérifier/.test(await p.locator('.crea-card', {hasText:'Panier'}).textContent());
    /* 8. thème, nouveautés, signalement, conflit */
    const th = await dans(p, function(){ appliquerTheme('dark'); var a = document.documentElement.getAttribute('data-theme'); appliquerTheme('auto'); return [a, document.documentElement.getAttribute('data-theme')]; });
    R.theme = th[0] === 'dark' && th[1] === null;
    await dans(p, function(){ aller('accueil'); });
    await p.waitForTimeout(300);
    R.pastille_nouveau = await p.locator('#lien-nouveautes .nouv-pastille').count() === 1;
    R.signaler_un_probleme = /mailto:bonjour@crochompte\.com\?subject=.*V5[0-9]/.test(await p.locator('a', {hasText:'Signaler un problème'}).getAttribute('href'));
    await p.click('#lien-nouveautes'); await p.waitForTimeout(250);
    R.nouveautes = /Ce qui a changé/.test(await p.locator('.dlg').textContent()) && await dans(p, function(){ return /^V5[0-9](\.\d+)?$/.test(state.reglages.nouveautesVues); });
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(250);
    await dans(p, function(){ window.CrochomptePont.conflit(Date.now() - 3600000); });
    await p.waitForTimeout(200);
    R.conflit_visible_partout = await p.locator('#main .bandeau-global').count() === 1;
    /* 9. réglages : avancés repliés, 3 tailles de titre */
    await dans(p, function(){ view.conflit = null; view.regSection = 'charges'; aller('reglages'); });
    await p.waitForTimeout(250);
    R.reglages_avances_replies = await p.locator('details.reg-avance').count() === 1 && !(await p.locator('details.reg-avance').evaluate(d => d.open));
    const tailles = await p.evaluate(() => [...document.querySelectorAll('.card > header h2')].map(h => getComputedStyle(h).fontSize));
    R.titres_de_carte_uniformes = tailles.length > 0 && tailles.every(t => t === '18px');
    R.chiffres_tabulaires = await p.evaluate(() => getComputedStyle(document.body).fontVariantNumeric.indexOf('tabular-nums') >= 0);
    await p.close();
    /* 10. téléphone : cibles tactiles d'au moins 44 px */
    const ctx = await b.newContext({viewport:{width:390, height:844}, isMobile:true, hasTouch:true, serviceWorkers:'block'});
    const t = await ctx.newPage();
    t.on('pageerror', e=>errs.push(e.message));
    await t.route('**/vendor/supabase/**', r=>r.fulfill({path:path.join(__dirname,'faux-supabase-persistant.js'),contentType:'application/javascript'}));
    await t.route('**/functions/v1/connexion', r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'AT',refresh_token:'RT'})}));
    await t.goto('http://127.0.0.1:8934/index.html'); await t.waitForTimeout(600);
    if (await t.locator('#sy-c-identifiant').count()){ await t.fill('#sy-c-identifiant','LaineTest'); await t.fill('#sy-c-mdp','motdepasse123'); await t.click('#sy-c-valider'); await t.waitForTimeout(1000); }
    const petits = await t.evaluate(() => [...document.querySelectorAll('#main button.btn, #main .fchip')].filter(x => x.offsetParent && x.getBoundingClientRect().height < 43.5).map(x => x.textContent.trim().slice(0,30)));
    R.cibles_44px = petits.length === 0 ? true : petits;
    R.pas_de_debordement_tel = await t.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    await ctx.close();
  } catch (e) { R._echec = String(e && e.stack || e); }
  console.log(JSON.stringify(R, null, 1));
  console.log("ERREURS JS: " + (errs.length ? errs.join(" | ") : "aucune"));
  await b.close();
})();
