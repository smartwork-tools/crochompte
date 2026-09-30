/* V44 (revue V51) — deux profils : question en tête de l'Accueil d'un atelier
   neuf (amateur ou pro), amateur sans facture ni registres ni seuils ni
   rubrique Facturation, pro avec tout, changement dans Réglages, onglets,
   Accueil sans doublon, mise en route accessible, ancien atelier deviné. */
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
    /* 1. atelier neuf : la question est sur l'Accueil, 2 cartes, pas de boîte modale */
    R.question_accueil = (await p.locator('.profil-accueil .profil-carte').count()) === 2 && (await p.locator('.dlg-fond').count()) === 0 && /amateur ou en pro/.test(await p.textContent('.profil-accueil'));
    await p.click('.profil-carte[data-p="amateur"]'); await p.getByRole('button', {name:"C'est moi"}).click(); await p.waitForTimeout(400);
    const tabs = await p.$$eval('#nav button', bs => bs.map(b => b.textContent.trim()));
    R.onglets_amateur = tabs.join(',') === 'Accueil,Mes créations,Commandes,Mes ventes,Mes patrons,Matières,Mes chiffres,Réglages';
    R.profil_applique = await dans(p, function(){ return state.reglages.profilType === 'amateur' && state.reglages.profil === 'vend' && state.reglages.mode === 'complet' && state.reglages.statut === 'non_declare' && !estPro(); });
    R.question_disparue = (await p.locator('.profil-accueil').count()) === 0;

    /* 2. amateur : pas de rubrique Facturation, pas de facture sur une commande, pas de registres ni de seuils */
    await graine(p); await p.waitForTimeout(300);
    await dans(p, function(){ view.regSection = null; aller('reglages'); }); await p.waitForTimeout(300);
    R.amateur_sans_facturation = !/Facturation/.test(await p.textContent('#main')) && /Canaux de vente/.test(await p.textContent('#main'));
    await dans(p, function(){ var c = nouvelleCommande(); c.client = {nom:'Sam', contact:'', note:''}; c.cid = 'c1'; c.prixConvenu = 30; c.statut = 'livree'; c.livreeLe = aujourdhuiISO(); c.brouillon = false; sauverTout(); view.cmdVue = c.id; aller('commandes', {garderVue:true}); });
    await p.waitForTimeout(300);
    R.amateur_sans_facture = (await p.locator('#cmd-facture').count()) === 0 && /Pas de facture en profil amateur/.test(await p.textContent('#main'));
    await dans(p, function(){ allerOnglet('indicateurs'); }); await p.waitForTimeout(300);
    R.amateur_sans_registres = !/Tes registres|Tes seuils/.test(await p.textContent('#main'));

    /* 3. passer en pro dans Réglages */
    await dans(p, function(){ view.regSection = 'activite'; aller('reglages', {garderVue:true}); }); await p.waitForTimeout(300);
    R.reglage_profil = /Créateur ou créatrice amateur/.test(await p.textContent('#main')) && !/Je crée…|Suivi des pièces/.test(await p.textContent('#main'));
    await p.getByRole('button', {name:'Changer de profil'}).click(); await p.waitForTimeout(200);
    R.dialogue_deux_cartes = (await p.locator('.dlg .profil-carte').count()) === 2;
    await p.click('.dlg .profil-carte[data-p="pro"]'); await p.click('.dlg [data-oui]'); await p.waitForTimeout(400);
    R.pro_applique = await dans(p, function(){ return state.reglages.profilType === 'pro' && state.reglages.statut === '' ; });
    await dans(p, function(){ state.reglages.statut = 'marchandises'; view.regSection = null; aller('reglages'); }); await p.waitForTimeout(300);
    R.pro_facturation = /Facturation/.test(await p.textContent('#main')) && await dans(p, function(){ return estPro(); });
    await dans(p, function(){ view.cmdVue = commandes()[0].id; aller('commandes', {garderVue:true}); }); await p.waitForTimeout(300);
    R.pro_facture = (await p.locator('#cmd-facture').count()) === 1;
    await dans(p, function(){ allerOnglet('indicateurs'); }); await p.waitForTimeout(300);
    R.pro_registres = /Tes registres/.test(await p.textContent('#main')) && /Tes seuils/.test(await p.textContent('#main'));

    /* 4. onglets pro, catalogue et mise en route seulement pendant qu'on y est */
    const tabs2 = (await p.$$eval('#nav button', bs => bs.map(b => b.textContent.trim()))).filter(x => !/^Fiche/.test(x));
    R.onglets_pro = tabs2.indexOf('Commandes') >= 0 && tabs2.indexOf('Mes ventes') >= 0 && tabs2.indexOf('Catalogue') < 0 && tabs2.indexOf('Mise en route') < 0 && tabs2.length === 8;
    await dans(p, function(){ view.modeleVu = 'bonnet'; aller('catalogue', {garderVue:true}); }); await p.waitForTimeout(300);
    R.onglet_catalogue_visible_pendant = (await p.$$eval('#nav button', bs => bs.map(b => b.textContent.trim()))).indexOf('Catalogue') >= 0;

    /* 5. Accueil : une seule liste de créations, mise en route accessible */
    await dans(p, function(){ allerOnglet('accueil'); }); await p.waitForTimeout(300);
    R.accueil_sans_doublon = (await p.locator('.crea-mini').count()) === 0 && (await p.locator('#lien-mise-en-route').count()) === 1;
    await p.click('#lien-mise-en-route'); await p.waitForTimeout(300);
    R.mise_en_route_ouverte = (await p.$$eval('#nav button', bs => bs.map(b => b.textContent.trim()))).indexOf('Mise en route') >= 0 && /Mise en route/.test(await p.textContent('#main h1, #main h2'));

    /* 6. atelier ancien sans profil : deviné (pro si statut déclaré), pas de question ; anciens identifiants ramenés */
    await dans(p, function(){ delete state.reglages.profilType; state.reglages.statut = 'marchandises'; sauverTout(); allerOnglet('accueil'); }); await p.waitForTimeout(300);
    R.ancien_atelier_devine = (await p.locator('.profil-accueil').count()) === 0 && await dans(p, function(){ return state.reglages.profilType === 'pro'; });
    R.alias_anciens = await dans(p, function(){ appliquerProfil('loisir', {sansRendu:true}); var a = state.reglages.profilType; appliquerProfil('marche', {sansRendu:true}); return a === 'amateur' && state.reglages.profilType === 'pro'; });

    await p.setViewportSize({width:390, height:844}); await p.waitForTimeout(300);
    R.tel_sans_debordement = await p.evaluate(()=> document.documentElement.scrollWidth <= window.innerWidth + 1);
    await p.close();
  } catch (e) { R._echec = String(e && e.stack || e); }
  console.log(JSON.stringify(R, null, 1));
  console.log("ERREURS JS: " + (errs.length ? errs.join(" | ") : "aucune"));
  await b.close();
})();
