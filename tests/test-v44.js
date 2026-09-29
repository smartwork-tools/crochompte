/* V44 — profils : question d'accueil sur un atelier neuf, vrai mode loisir
   (fiche sans prix, créations sans gain, catalogue sans plancher), onglets
   selon le profil, Accueil sans doublon, réglage du profil dans Mon activité. */
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
    /* 1. atelier neuf : la question est sur l'Accueil, 5 cartes, pas de boîte modale */
    R.question_accueil = (await p.locator('.profil-accueil .profil-carte').count()) === 5 && (await p.locator('.dlg-fond').count()) === 0;
    await p.click('.profil-carte[data-p="loisir"]'); await p.getByRole('button', {name:"C'est moi"}).click(); await p.waitForTimeout(400);
    const tabs = await p.$$eval('#nav button', bs => bs.map(b => b.textContent.trim()));
    R.onglets_loisir = tabs.join(',') === 'Accueil,Mes créations,Mes patrons,Matières,Mes chiffres,Réglages';
    R.profil_applique = await dans(p, function(){ return state.reglages.profilType === 'loisir' && state.reglages.profil === 'passion' && state.reglages.mode === 'complet'; });
    R.question_disparue = (await p.locator('.profil-accueil').count()) === 0;
    const acc = await p.textContent('#main');
    R.accueil_loisir_sans_vente = !/à perte|Prix conseillé|encaissé|Nouvelle commande/i.test(acc);

    /* 2. fiche en mode loisir : matières et temps, rien sur le prix */
    await graine(p); await p.waitForTimeout(300);
    await dans(p, function(){ ouvrirFiche('c1'); }); await p.waitForTimeout(400);
    const f = (await p.textContent('#main')).replace(/\s+/g, ' ');
    R.fiche_loisir_cout_matieres = /Cette pièce te coûte/.test(f) && /de matières/.test(f) && !/Prix de vente|cotisations|Prix conseillé|Tes marges|Comment tu la vends/i.test(f);
    R.fiche_loisir_temps_en_heures = /Temps de travail/.test(f) && !/de l'heure/.test(f);
    R.fiche_barre_bas = /de matières/.test(await p.textContent('#bf-t'));

    /* 3. Mes créations en mode loisir */
    await dans(p, function(){ allerOnglet('creations'); }); await p.waitForTimeout(300);
    const c = (await p.textContent('#main')).replace(/\s+/g, ' ');
    R.creations_loisir = /Matières par pièce/.test(c) && !/Gain de l'heure|À revoir|objectif|sous-payée|Prix conseillé/i.test(c);
    R.colonne_matieres = /Matières/.test(await p.textContent('#main thead').catch(()=>'')) || !(await p.locator('#main thead').count());

    /* 4. catalogue : pas de plancher ni de prix conseillé */
    await dans(p, function(){ view.modeleVu = 'bonnet'; aller('catalogue', {garderVue:true}); }); await p.waitForTimeout(300);
    const cat = await p.textContent('#main');
    R.catalogue_loisir = /Matières et emballage/.test(cat) && !/Plancher|Prix conseillé|dépasse le prix du marché/.test(cat);
    R.onglet_catalogue_visible_pendant = (await p.$$eval('#nav button', bs => bs.map(b => b.textContent.trim()))).indexOf('Catalogue') >= 0;

    /* 5. changer de profil dans Réglages */
    await dans(p, function(){ view.regSection = 'activite'; aller('reglages', {garderVue:true}); }); await p.waitForTimeout(300);
    R.reglage_profil = /Je crochète pour le plaisir/.test(await p.textContent('#main')) && !/Je crée…|Suivi des pièces/.test(await p.textContent('#main'));
    await p.getByRole('button', {name:'Changer de profil'}).click(); await p.waitForTimeout(200);
    await p.click('.dlg .profil-carte[data-p="marche"]'); await p.click('.dlg [data-oui]'); await p.waitForTimeout(400);
    const tabs2 = (await p.$$eval('#nav button', bs => bs.map(b => b.textContent.trim()))).filter(x => !/^Fiche/.test(x));
    R.onglets_vente = tabs2.indexOf('Commandes') >= 0 && tabs2.indexOf('Marché') >= 0 && tabs2.indexOf('Catalogue') < 0 && tabs2.indexOf('Mise en route') < 0 && tabs2.length === 8;
    R.mode_vente = await dans(p, function(){ return state.reglages.profil === 'vend' && state.reglages.profilType === 'marche'; });

    /* 6. Accueil en mode vente : une seule liste de créations, mise en route accessible */
    await dans(p, function(){ allerOnglet('accueil'); }); await p.waitForTimeout(300);
    R.accueil_sans_doublon = (await p.locator('.crea-mini').count()) === 0 && (await p.locator('#lien-mise-en-route').count()) === 1;
    await p.click('#lien-mise-en-route'); await p.waitForTimeout(300);
    R.mise_en_route_ouverte = (await p.$$eval('#nav button', bs => bs.map(b => b.textContent.trim()))).indexOf('Mise en route') >= 0 && /Mise en route/.test(await p.textContent('#main h1, #main h2'));

    /* 7. atelier ancien sans profil : deviné, pas de question */
    await dans(p, function(){ delete state.reglages.profilType; state.reglages.profil = 'vend'; sauverTout(); allerOnglet('accueil'); }); await p.waitForTimeout(300);
    R.ancien_atelier_devine = (await p.locator('.profil-accueil').count()) === 0 && await dans(p, function(){ return !!state.reglages.profilType; });

    await p.setViewportSize({width:390, height:844}); await p.waitForTimeout(300);
    R.tel_sans_debordement = await p.evaluate(()=> document.documentElement.scrollWidth <= window.innerWidth + 1);
    await p.close();
  } catch (e) { R._echec = String(e && e.stack || e); }
  console.log(JSON.stringify(R, null, 1));
  console.log("ERREURS JS: " + (errs.length ? errs.join(" | ") : "aucune"));
  await b.close();
})();
