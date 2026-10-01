/* V55.1 — l'Accueil ne clignote plus à l'ouverture sur téléphone : atelier
   vide (compte neuf), plusieurs rechargements de la page de suite. */
const {chromium} = require('./outils').playwright;
const path = require('path');
const R = {}; const errs = [];
(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  const ctx = await b.newContext({serviceWorkers:'block', viewport:{width:400, height:850}});
  const p = await ctx.newPage();
  p.on('pageerror', e=>errs.push(e.message));
  await p.route('**/vendor/supabase/**', r=>r.fulfill({path:path.join(__dirname,'faux-supabase-persistant.js'),contentType:'application/javascript'}));
  await p.route('**/functions/v1/connexion', r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'AT',refresh_token:'RT'})}));
  // Compte neuf : atelier en ligne avec les réglages seulement, rien de saisi.
  await p.addInitScript(() => {
    if (!localStorage.getItem('__fauxServeur')) window.__serveur = {atelier:{user_id:'u1', maj:'2026-10-01T10:00:00.000Z', donnees:{version:1, creations:[], pieces:[], commandes:[], patrons:[], reglages:{profilType:'amateur', profil:'passion'}}}, versions:[]};
  });
  await p.goto('http://127.0.0.1:8934/index.html'); await p.waitForTimeout(500);
  await p.fill('#sy-c-identifiant','LaineTest'); await p.fill('#sy-c-mdp','motdepasse123');
  await p.click('#sy-c-valider'); await p.waitForTimeout(1800);
  R.accueil_apres_connexion = (await p.textContent('body')).includes('Bonjour');
  // Plusieurs ouvertures de suite (comme Safari qui recharge l'onglet) :
  // on regarde l'écran toutes les 40 ms pendant l'ouverture.
  let recup = 0, maj = 0;
  for (let i = 0; i < 4; i++){
    await p.addInitScript(() => {
      window.__vus = {recup:0, maj:0};
      setInterval(() => {
        const t = document.body ? document.body.innerText : '';
        if (t.indexOf('Récupération de ton atelier') !== -1) window.__vus.recup++;
        if (t.indexOf('Atelier mis à jour') !== -1) window.__vus.maj++;
      }, 40);
    });
    await p.reload(); await p.waitForTimeout(2200);
    const v = await p.evaluate(() => window.__vus); recup += v.recup; maj += v.maj;
  }
  console.log('ouvertures : récupération vue', recup, 'fois ; message maj vu', maj, 'fois');
  R.pas_d_ecran_recuperation_aux_ouvertures = recup === 0;
  R.pas_de_message_maj_pour_rien = maj === 0;
  R.accueil_visible = (await p.textContent('body')).includes('Bonjour');
  R.pas_d_erreur = errs.length === 0;
  console.log(JSON.stringify(R, null, 1), errs.join(' | '));
  const ko = Object.keys(R).filter(k => !R[k]);
  console.log(ko.length ? 'ECHEC : ' + ko.join(', ') : 'TOUT OK (' + Object.keys(R).length + ')');
  await b.close();
  process.exit(ko.length ? 1 : 0);
})();
