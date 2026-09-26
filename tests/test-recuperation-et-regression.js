const {chromium} = require('./outils').playwright;
const path = require('path');

(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  const p = await b.newPage({serviceWorkers:'block', viewport:{width:420, height:1000}});
  const erreurs = [];
  p.on('pageerror', e => erreurs.push('PAGEERROR: ' + e.message));

  await p.route('**/cdn.jsdelivr.net/**', route => {
    route.fulfill({ path: path.join(__dirname,'faux-supabase.js'), contentType: 'application/javascript' });
  });
  await p.route('**/functions/v1/connexion', route => {
    route.fulfill({ status: 200, contentType:'application/json',
      body: JSON.stringify({access_token:'AT', refresh_token:'RT'}) });
  });

  await p.goto('http://127.0.0.1:8934/index.html');
  await p.waitForTimeout(400);   // écran de connexion obligatoire au démarrage

  const resultats = {};

  try {
    // ── Connexion normale, pour avoir une session ──
    await p.fill('#sy-c-identifiant', 'LaineTest');
    await p.fill('#sy-c-mdp', 'motdepasse123');
    await p.click('#sy-c-valider');
    await p.waitForTimeout(400);
    // Une fois connectée, le portail s'efface et l'outil s'ouvre (accueil,
    // pas Réglages) : le panneau de compte reste dans Réglages.
    resultats.outil_ouvert = (await p.locator('#nav button').count()) > 0;
    await p.click('#menu-btn'); await p.click('#mm-liste >> text=Réglages'); await p.waitForTimeout(150); await p.click('.reg-item[data-section="compte"]');
    await p.waitForTimeout(300);
    resultats.connectee = await p.isVisible('#sy-push');

    // ── Régression : les boutons du compte connecté existent toujours ──
    resultats.boutons_presents = await p.isVisible('#sy-push') 
      && await p.isVisible('#sy-hist') && await p.isVisible('#sy-out') && await p.isVisible('#sy-del');

    await p.click('#sy-push');
    await p.waitForTimeout(300);
    resultats.envoi_ok = !(await p.textContent('[data-sync]')).includes('undefined');

    // ── Déconnexion ──
    await p.click('#sy-out');
    await p.waitForTimeout(200);
    resultats.deconnexion_ok = await p.isVisible('#sy-c-identifiant');

    // ── Récupération de mot de passe : on simule l'événement Supabase ──
    await p.evaluate(() => {
      window.__cbAuth('PASSWORD_RECOVERY', { user: { id: 'u1', email: 'test@exemple.fr' }, access_token:'X', refresh_token:'Y' });
    });
    await p.waitForTimeout(200);
    resultats.ecran_recuperation_affiche = await p.isVisible('#sy-np1') && await p.isVisible('#sy-np2');
    resultats.pas_de_vue_atelier_directe = !(await p.isVisible('#sy-push'));  // ne pas entrer directement dans l'atelier

    // Mots de passe différents -> rejeté
    await p.fill('#sy-np1', 'nouveaumdp123');
    await p.fill('#sy-np2', 'autrechose999');
    await p.click('#sy-np-valider');
    await p.waitForTimeout(150);
    resultats.recup_rejette_mdp_differents = (await p.textContent('.banner')).includes('ne sont pas identiques');

    // Bons mots de passe -> passe en vue connectée, portail refermé
    await p.fill('#sy-np1', 'nouveaumdp123');
    await p.fill('#sy-np2', 'nouveaumdp123');
    await p.click('#sy-np-valider');
    await p.waitForTimeout(300);
    resultats.recup_ferme_le_portail = (await p.locator('#nav button').count()) > 0;
    await p.click('#menu-btn'); await p.click('#mm-liste >> text=Réglages'); await p.waitForTimeout(150); await p.click('.reg-item[data-section="compte"]');
    await p.waitForTimeout(300);
    resultats.recup_termine_connectee = await p.isVisible('#sy-push');
    resultats.recup_affiche_pseudo = (await p.textContent('body')).includes('LaineTest');

  } catch (e) {
    resultats._echec = e.message;
  }

  console.log(JSON.stringify(resultats, null, 2));
  console.log('ERREURS JS:', erreurs.length ? erreurs.join(' | ') : 'aucune');
  await b.close();
})();
