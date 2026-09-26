const {chromium} = require('./outils').playwright;
const path = require('path');

(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  const p = await b.newPage({serviceWorkers:'block', viewport:{width:420, height:1000}});
  const erreurs = [];
  p.on('pageerror', e => erreurs.push('PAGEERROR: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') erreurs.push('CONSOLE: ' + m.text()); });

  await p.route('**/cdn.jsdelivr.net/**', route => {
    route.fulfill({ path: path.join(__dirname,'faux-supabase.js'), contentType: 'application/javascript' });
  });
  await p.route('**/functions/v1/connexion', route => {
    route.fulfill({ status: 200, contentType:'application/json',
      body: JSON.stringify({access_token:'AT', refresh_token:'RT'}) });
  });

  const resultats = {};

  try {
    // ── 1. Premier chargement : le portail doit s'afficher, jamais l'atelier ──
    await p.goto('http://127.0.0.1:8934/index.html');
    await p.waitForTimeout(500);
    resultats.pas_de_nav_visible = (await p.locator('#nav button').count()) === 0;
    resultats.formulaire_connexion_visible = await p.isVisible('#sy-c-identifiant');
    resultats.atelier_absent = !(await p.isVisible('#sy-push'));

    // ── 2. Connexion depuis le portail ──
    await p.fill('#sy-c-identifiant', 'LaineTest');
    await p.fill('#sy-c-mdp', 'motdepasse123');
    await p.click('#sy-c-valider');
    await p.waitForTimeout(500);
    resultats.nav_visible_apres_connexion = (await p.locator('#nav button').count()) > 0;
    resultats.toast_connectee = (await p.textContent('body')).includes('Connectée');

    // ── 3. Réglages : le panneau de compte connecté est toujours là ──
    await p.click('#menu-btn'); await p.click('#mm-liste >> text=Réglages'); await p.waitForTimeout(150); await p.click('.reg-item[data-section="compte"]');
    await p.waitForTimeout(300);
    resultats.reglages_montre_compte = await p.isVisible('#sy-push') && await p.isVisible('#sy-out');

    // ── 4. Déconnexion : retour au portail, pas d'accès à l'outil ──
    await p.click('#sy-out');
    await p.waitForTimeout(400);
    resultats.retour_au_portail = await p.isVisible('#sy-c-identifiant');
    resultats.nav_de_nouveau_vide = (await p.locator('#nav button').count()) === 0;
    resultats.toast_deconnectee = (await p.textContent('body')).includes('déconnectée');

  } catch (e) {
    resultats._echec = e.message;
  }

  console.log(JSON.stringify(resultats, null, 2));
  console.log('ERREURS JS:', erreurs.length ? erreurs.join(' | ') : 'aucune');
  await b.close();
})();
