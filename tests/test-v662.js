/* V66.2 — l'application installée se met à jour toute seule.
   Le test sert le site sur son propre port avec un vrai service worker,
   puis « publie » une nouvelle version (nouveau sw.js et nouvel app.js),
   et vérifie que la page déjà ouverte passe à la nouvelle version :
   1. au retour au premier plan, tout de suite si rien n'est en cours ;
   2. avec une fenêtre ouverte : pas de rechargement sous les doigts,
      un bouton « Mettre à jour », puis la mise à jour au passage en
      arrière-plan. */
const {chromium} = require('./outils').playwright;
const path = require('path'), http = require('http'), fs = require('fs');
const racine = path.join(__dirname, '..');
const T = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
  '.webmanifest':'application/manifest+json','.png':'image/png','.woff2':'font/woff2','.json':'application/json'};
const imitation = fs.readFileSync(path.join(__dirname, 'faux-supabase-persistant.js'));
let version = 1;   /* la version « publiée » sur le serveur */
function serveur(port){
  return http.createServer(function(req, res){
    let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
    if (u.indexOf('/vendor/supabase/') === 0){ res.writeHead(200, {'Content-Type':'text/javascript'}); return res.end(imitation); }
    fs.readFile(path.join(racine, path.normalize(u)), function(err, data){
      if (err){ res.writeHead(404); return res.end('introuvable'); }
      let corps = data;
      /* Publier la version N : un sw.js différent (nouveau cache) et un
         app.js qui porte la marque N. */
      if (u === '/sw.js') corps = Buffer.from(String(data).replace(/var CACHE = "([^"]+)";/, 'var CACHE = "$1-pub' + version + '";'));
      if (u === '/app.js') corps = Buffer.from(String(data) + '\nwindow.__versionPubliee = ' + version + ';\n');
      res.writeHead(200, {'Content-Type': T[path.extname(u)] || 'application/octet-stream', 'Cache-Control': 'no-cache'}); res.end(corps);
    });
  }).listen(port, '127.0.0.1');
}
const attendre = ms => new Promise(r => setTimeout(r, ms));
async function versionAffichee(p){ try{ return await p.evaluate(() => window.__versionPubliee || 0); }catch(e){ return -1; } }
async function attendreVersion(p, v, ms){
  const fin = Date.now() + ms;
  while (Date.now() < fin){ if (await versionAffichee(p) === v) return true; await attendre(300); }
  return false;
}
(async () => {
  const srv = serveur(8946);
  const b = await chromium.launch(require('./outils').lancement);
  const ctx = await b.newContext({viewport:{width:390, height:844}});
  const p = await ctx.newPage(); const R = {}; const errs = [];
  p.on('pageerror', e=>errs.push(e.message));
  try {
    /* 0. Première ouverture : le service worker s'installe et prend la main */
    await p.goto('http://127.0.0.1:8946/index.html?demo'); await attendre(1500);
    await p.evaluate(() => navigator.serviceWorker.ready);
    await p.reload(); await attendre(1500);
    R.premiere_version = await versionAffichee(p) === 1;
    R.sw_aux_commandes = await p.evaluate(() => !!navigator.serviceWorker.controller);

    /* 1. Version 2 publiée ; l'application revient au premier plan */
    version = 2;
    await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    R.maj_auto_au_retour = await attendreVersion(p, 2, 15000);
    R.donnees_intactes = await p.evaluate(() => !!localStorage.getItem('crochompte-demo-v1'));

    /* 2. Version 3 publiée pendant qu'une fenêtre est ouverte */
    await attendre(21000);   /* l'application est ouverte depuis un moment */
    await p.evaluate(() => { var b = document.querySelector('.bandeau-demo button'); if (b) b.click(); });
    await attendre(400);
    R.fenetre_ouverte = (await p.locator('.dlg-fond').count()) === 1;
    version = 3;
    await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    /* l'installation se fait, mais pas de rechargement sous les doigts */
    let bouton = false;
    for (let i = 0; i < 40 && !bouton; i++){ await attendre(300); bouton = (await p.locator('#toasts', {hasText:'Mettre à jour'}).count()) > 0; }
    R.pas_de_rechargement_force = await versionAffichee(p) === 2 && (await p.locator('.dlg-fond').count()) === 1;
    R.bouton_mettre_a_jour = bouton;
    /* passage en arrière-plan : la mise à jour se fait */
    await p.evaluate(() => { Object.defineProperty(document, 'hidden', {value: true, configurable: true}); document.dispatchEvent(new Event('visibilitychange')); });
    R.maj_en_arriere_plan = await attendreVersion(p, 3, 15000);
  } catch(e){ console.log('Error:', e.message); }
  console.log(JSON.stringify(R, null, 2));
  console.log('ERREURS JS: ' + (errs.length ? errs.join(' | ') : 'aucune'));
  await b.close();
  srv.close();
})();
