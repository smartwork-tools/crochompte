/* Outil de contrôle (pas un test) : chaque onglet, trois largeurs, avec des
   données variées. Signale tout ce qui déborde de l'écran et garde une capture. */
const {chromium} = require('./outils').playwright;
const path = require('path');
const {graine} = require('./aide.js');
const largeurs = (process.argv[2] || '1440,1024,820,390').split(',').map(Number);
const onglets = ['accueil','creations','commandes','ventes','patrons','stock','indicateurs','reglages'];
(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  for (const w of largeurs){
    const p = await b.newPage({serviceWorkers:'block', viewport:{width:w, height:900}});
    const errs = []; p.on('pageerror', e=>errs.push(e.message)); p.on('dialog', d=>d.dismiss());
    await p.route('**/app.js*', async r=>{
      const src = require('fs').readFileSync(path.join(__dirname,'..','app.js'),'utf8');
      const i = src.lastIndexOf('})();');
      await r.fulfill({contentType:'text/javascript; charset=utf-8', body: src.slice(0,i) + 'window.__eval = function(c){ return eval(c); };\n' + src.slice(i)});
    });
    await p.route('**/vendor/supabase/**', r=>r.fulfill({path:path.join(__dirname,'faux-supabase-persistant.js'),contentType:'application/javascript'}));
    await p.route('**/functions/v1/connexion', r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'AT',refresh_token:'RT'})}));
    await p.goto('http://127.0.0.1:8934/index.html'); await p.waitForTimeout(500);
    if (await p.locator('#sy-c-identifiant').count()){ await p.fill('#sy-c-identifiant','LaineTest'); await p.fill('#sy-c-mdp','motdepasse123'); await p.click('#sy-c-valider'); await p.waitForTimeout(1000); }
    await graine(p);
    await p.evaluate(() => window.__eval('(' + function(){
      appliquerProfil('pro', {sansRendu:true}); state.reglages.confirmeLe = Date.now(); state.reglages.tauxHoraire = 15;
      var cr = creation('c1'); cr.prix = 160; cr.temps = {prep:5, crochet:470, assemb:10, finition:5, emball:5};
      var t = Date.now();
      state.pieces = [
        {id:'h1', cid:'c1', prod:'encours', com:'atelier', prix:160, mesure:{crochet:8}, tempsSaisi:true, sessions:[], cree:t, maj:t},
        {id:'h2', cid:'c2', prod:'afaire', com:'commande', client:'Zoé', prix:28, mesure:{}, sessions:[], cree:t, maj:t},
        {id:'h3', cid:'c3', prod:'termine', com:'atelier', prix:35, mesure:{crochet:150}, sessions:[], cree:t, maj:t, termineLe:t, sortie:true},
        {id:'h4', cid:'c2', prod:'termine', com:'vendu', prix:28, mesure:{crochet:120}, sessions:[], cree:t-1e6, maj:t, venduLe:t, termineLe:t, sortie:true}
      ];
      state.pieces[3].fige = figerVente(creation('c2'), 28, creation('c2').canal, 120, state.pieces[3]);
      var c = nouvelleCommande(); c.client = {nom:'Zoé Marchand-Delaunay'}; c.cid = 'c2'; c.prixConvenu = 28; c.statut = 'encours'; delete c.brouillon;
      sauverTout();
    }.toString() + ')()'));
    for (const o of onglets){
      await p.evaluate(id => window.__eval('(function(){ view.fPieces="tous"; view.creaOuvert={c1:true,c2:true,c3:true}; aller("' + id + '"); })()'), o);
      await p.waitForTimeout(350);
      const m = await p.evaluate(() => {
        var de = document.documentElement;
        var tw = Array.from(document.querySelectorAll('.tablewrap')).filter(x => x.offsetParent && x.scrollWidth - x.clientWidth > 2).map(x => { var t = x.querySelector('table'); return (t ? t.className : '?') + ' [' + Array.from(x.querySelectorAll('th')).slice(0,3).map(h => h.textContent.trim()).join('|') + '] +' + (x.scrollWidth - x.clientWidth); });
        var larges = Array.from(document.querySelectorAll('body *')).filter(x => x.offsetParent && x.getBoundingClientRect().right > window.innerWidth + 2 && !x.closest('.tablewrap') && !x.closest('#toasts')).slice(0,3).map(x => x.tagName + '.' + (x.className||'').toString().slice(0,40));
        var coupes = Array.from(document.querySelectorAll('button, .chip, .tile .v, h1, h2, h3, .btn')).filter(x => x.offsetParent && getComputedStyle(x).overflow !== 'visible' && x.scrollWidth - x.clientWidth > 2).map(x => (x.textContent || '').trim().slice(0, 30));
        return {page: de.scrollWidth - window.innerWidth, tableaux: tw, hors: larges, coupes: coupes.slice(0, 5)};
      });
      const bad = m.page > 2 || m.tableaux.length || m.coupes.length || m.hors.length;
      console.log((bad ? 'X ' : '  ') + w + ' ' + o + ' ' + JSON.stringify(m));
      if (bad || o === 'creations') await p.screenshot({path: '/tmp/audit-' + w + '-' + o + '.png', fullPage: false});
    }
    if (errs.length) console.log('ERREURS JS', w, errs.join(' | '));
    await p.close();
  }
  await b.close();
})();
