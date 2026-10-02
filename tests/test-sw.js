/* Ouverture sans réseau : le test sert le site sur son propre port, puis
   COUPE ce serveur. Le service worker ne peut alors plus rien télécharger :
   c'est la vraie situation d'un téléphone sans réseau. */
const {chromium} = require('./outils').playwright;
const path = require('path'), http = require('http'), fs = require('fs');
const racine = path.join(__dirname, '..');
const T = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
  '.webmanifest':'application/manifest+json','.png':'image/png','.woff2':'font/woff2','.json':'application/json','.wasm':'application/wasm'};
const imitation = fs.readFileSync(path.join(__dirname, 'faux-supabase-persistant.js'));
function serveur(port){
  return http.createServer(function(req, res){
    let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
    /* La bibliothèque de connexion est remplacée par l'imitation, y compris
       pour le service worker qui la met en cache. */
    if (u.indexOf('/vendor/supabase/') === 0){ res.writeHead(200, {'Content-Type':'text/javascript'}); return res.end(imitation); }
    fs.readFile(path.join(racine, path.normalize(u)), function(err, data){
      if (err){ res.writeHead(404); return res.end('introuvable'); }
      res.writeHead(200, {'Content-Type': T[path.extname(u)] || 'application/octet-stream'}); res.end(data);
    });
  }).listen(port, '127.0.0.1');
}
(async () => {
  const srv = serveur(8940);
  const b = await chromium.launch(require('./outils').lancement);
  const ctx = await b.newContext({viewport:{width:1100, height:800}});
  const p = await ctx.newPage(); const R = {}; const errs = [];
  p.on('pageerror', e=>errs.push(e.message));
  await p.route('**/functions/v1/connexion', r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'AT',refresh_token:'RT'})}));
  await p.goto('http://127.0.0.1:8940/index.html'); await p.waitForTimeout(500);
  R.manifeste = await p.evaluate(()=> fetch('manifest.webmanifest').then(r=>r.json()).then(m=>m.name));
  await p.fill('#sy-c-identifiant','LaineTest'); await p.fill('#sy-c-mdp','motdepasse123');
  await p.click('#sy-c-valider'); await p.waitForTimeout(1200);
  R.sw_actif = await p.evaluate(()=> navigator.serviceWorker.ready.then(r=>!!r.active));
  await p.waitForTimeout(1500);
  R.en_cache = await p.evaluate(async ()=>{
    const k = await caches.keys(); if (!k.length) return [];
    const c = await caches.open(k[0]);
    const l = ['index.html','boot.js?v=581','pdf.js?v=581','app.js?v=581','sync.js?v=581','vendor/supabase/supabase.min.mjs'];
    const ok = await Promise.all(l.map(u=>c.match(u).then(r=>!!r)));
    return ok.every(Boolean);
  });
  await new Promise(r=>srv.close(r)); srv.closeAllConnections && srv.closeAllConnections();
  await ctx.setOffline(true);
  await p.reload(); await p.waitForTimeout(2500);
  const texte = await p.textContent('#main');
  R.accueil_hors_ligne = texte.includes('Bonjour') || texte.includes('Pour bien démarrer') || texte.includes('Qu\'est-ce qui te ressemble');
  R.pas_ecran_connexion = !(await p.locator('#sy-c-identifiant').count());
  R.erreurs = errs;
  console.log(JSON.stringify(R,null,1));
  await b.close();
})();
