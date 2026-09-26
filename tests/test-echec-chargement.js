const {chromium} = require('./outils').playwright;

(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  const p = await b.newPage({serviceWorkers:'block', viewport:{width:420, height:1000}});

  // sync.js ne peut pas se charger (bibliothèque injoignable) : le portail
  // ne recevra jamais d'annonce d'état -> l'écran d'erreur doit apparaître
  // après le délai, plutôt qu'un spinner infini.
  await p.route('**/cdn.jsdelivr.net/**', route => route.abort());

  const resultats = {};
  try {
    await p.goto('http://127.0.0.1:8934/index.html');
    await p.waitForTimeout(1200);
    // Le module ne peut pas se charger : plus besoin d'attendre 7 secondes.
    resultats.ecran_erreur_immediat = await p.isVisible('#ea-reessayer');
    resultats.message_sans_jargon = (await p.textContent('body')).includes("La page de connexion n'a pas pu se charger");
    resultats.rien_de_sensible_affiche = !(await p.isVisible('#sy-push')) && (await p.locator('#nav button').count()) === 0;
  } catch (e) {
    resultats._echec = e.message;
  }
  console.log(JSON.stringify(resultats, null, 2));
  await b.close();
})();
