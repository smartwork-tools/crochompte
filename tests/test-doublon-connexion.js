const {chromium} = require('./outils').playwright;
const path = require('path');

(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  const p = await b.newPage({serviceWorkers:'block', viewport:{width:420, height:1000}});

  await p.route('**/cdn.jsdelivr.net/**', route => {
    route.fulfill({ path: path.join(__dirname,'faux-supabase.js'), contentType: 'application/javascript' });
  });
  let appelsProfil = 0;
  await p.route('**/functions/v1/connexion', route => {
    route.fulfill({ status: 200, contentType:'application/json',
      body: JSON.stringify({access_token:'AT', refresh_token:'RT'}) });
  });

  await p.goto('http://127.0.0.1:8934/index.html');
  await p.waitForTimeout(400);

  // Compte le nombre d'appels à mon_profil (RPC) via le mock, et le nombre
  // de toasts "Connectée" affichés.
  await p.evaluate(() => { window.__compteurProfil = 0; });

  await p.fill('#sy-c-identifiant', 'LaineTest');
  await p.fill('#sy-c-mdp', 'motdepasse123');
  await p.click('#sy-c-valider');
  await p.waitForTimeout(600);

  const nbToasts = await p.locator('.toast').count();
  const texteBody = await p.textContent('body');
  const occurrencesConnectee = (texteBody.match(/Connectée/g) || []).length;

  console.log(JSON.stringify({
    nb_toasts_presents_apres_600ms: nbToasts,
    occurrences_texte_connectee: occurrencesConnectee
  }, null, 2));

  await b.close();
})();
