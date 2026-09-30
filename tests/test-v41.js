/* V41 — « Mes créations » épurée et cohérente : en-tête « d'après ta fiche »,
   prix cible propre à chaque pièce (à ce prix, le gain est nul), moins de
   tuiles, pas de filtre vide, temps passé face au temps prévu. */
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
    await graine(p);
    await dans(p, function(){
      state.reglages.mode = "complet"; state.reglages.confirmeLe = Date.now();
      var cr = clone(creation('c1')); cr.id = 'cv41'; cr.nom = 'Doudou test'; cr.expedition = 5; cr.prix = 70; cr.canal = 'direct';
      cr.temps = {prep:0, crochet:120, assemb:0, finition:0, emball:0};
      state.creations = [cr]; state.pieces = [];
      state.pieces.push({id:'a1', cid:'cv41', prod:'termine', com:'atelier', prix:null, mesure:{crochet:95}, sessions:[], cree:Date.now(), maj:Date.now(), client:'', sortie:true});
      sauverTout(); view.fPieces = 'tous'; view.creaQ = ''; aller('creations');
    });
    await p.waitForTimeout(300);

    /* prix cible d'une pièce : à ce prix, le gain est (presque) nul ; au-dessus, positif */
    const c = await dans(p, function(){
      var a = piece('a1'), cr = creation('cv41'), k = coutPiece(a, cr);
      a.prix = k.prixCible; var k0 = coutPiece(a, cr);
      a.prix = k.prixCible + 10; var k1 = coutPiece(a, cr);
      a.prix = null;
      return {cible: k.prixCible, g0: k0.gainApresObjectif, g1: k1.gainApresObjectif, fiche: k.prixCibleFiche};
    });
    R.cible_piece_gain_nul = c.cible > 0 && Math.abs(c.g0) < 0.03 && c.g1 > 0;
    R.cible_piece_differe_de_la_fiche = c.cible > 0 && c.fiche > 0 && Math.abs(c.cible - c.fiche) > 0.01;

    /* écran */
    const card = p.locator('.crea-card');
    const txt = await card.textContent();
    R.entete_dit_estimation = /D'après ta fiche \(estimation\)/.test(txt) && !/Coût complet/.test(await card.locator('.crea-tete').textContent());
    R.colonne_cout_reel = (await card.locator('thead').textContent()).includes('Coût réel') && !(await card.locator('thead').textContent()).includes('Prix cible');
    const ligne = await p.locator('tr[data-pid="a1"]').textContent();
    R.temps_passe_et_prevu = /1 h 35/.test(ligne) && /prévu 2 h/.test(ligne);
    R.cible_sous_le_prix = /conseillé \d/.test(ligne);
    R.tuiles_reduites = (await p.locator('#main .tiles .tile').count()) <= 4;
    const chips = await p.$$eval('.fchip', xs => xs.map(x => x.textContent.trim()));
    R.pas_de_filtre_vide = chips.every(t => !/\s0$/.test(t) || /^Tout/.test(t)) && chips.some(t => /^En stock/.test(t));
    R.aide_repliee = (await p.locator('details:has-text("Comment ça marche")').count()) === 1 && !(await p.locator('details:has-text("Comment ça marche")').evaluate(d => d.open));
    /* le détail affiche le prix cible de la pièce */
    await p.click('tr[data-pid="a1"] [data-role="cout"]'); await p.waitForTimeout(250);
    R.detail_cible_piece = /Prix conseillé d'après son temps réel/.test(await p.textContent('.dlg'));
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(200);

    /* téléphone */
    await p.setViewportSize({width:390, height:844}); await p.waitForTimeout(300);
    R.tel_sans_debordement = await p.evaluate(()=> document.documentElement.scrollWidth <= window.innerWidth + 1);
    await p.close();
  } catch (e) { R._echec = String(e && e.stack || e); }
  console.log(JSON.stringify(R, null, 1));
  console.log("ERREURS JS: " + (errs.length ? errs.join(" | ") : "aucune"));
  await b.close();
})();
