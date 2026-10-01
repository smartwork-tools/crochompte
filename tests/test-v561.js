/* V56.1 — « 8 min » saisies sur une pièce pas terminée ne donnent plus un gain
   de l'heure absurde : tant que la pièce n'est pas finie, le temps compté est
   au moins celui de la fiche. Une fois terminée, le temps saisi fait foi. */
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
      appliquerProfil('pro', {sansRendu:true}); state.reglages.confirmeLe = Date.now(); state.reglages.tauxHoraire = 15;
      var cr = creation('c1'); cr.prix = 160; cr.temps = {prep:5, crochet:470, assemb:10, finition:5, emball:5};
      state.pieces = [{id:'h1', cid:'c1', prod:'encours', com:'atelier', prix:160, mesure:{crochet:8}, tempsSaisi:true, sessions:[], cree:Date.now(), maj:Date.now()}];
      sauverTout(); view.fPieces = 'tous'; view.creaQ = ''; view.creaOuvert = {c1:true}; aller('creations');
    });
    await p.waitForTimeout(400);
    /* 1. pièce en cours, 8 min saisies : on compte le temps de la fiche (8 h 15) */
    const k = await dans(p, function(){ var k = coutPiece(piece('h1'), creation('c1')); return {min:k.minutes, gainH:k.gainH, gain:k.gain, prov:k.provisoire, chrono:k.minutesChrono, cible:k.prixCible, doute:doutePiece(k)}; });
    R.en_cours_compte_le_temps_de_la_fiche = k.prov && k.min === 495 && k.chrono === 8;
    R.gain_horaire_plausible = Math.abs(k.gainH - k.gain / 8.25) < 0.01 && k.gainH < 100;
    R.prix_conseille_realiste = k.cible > 100;
    R.plus_de_faux_avertissement = k.doute === '';
    const ligne = (await p.locator('tr[data-pid="h1"]').textContent()).replace(/ | /g, ' ');
    R.ligne_dit_8h15_provisoire = /\/ h pour 8 h 15/.test(ligne) && /provisoire/.test(ligne);
    R.ligne_garde_les_8_min = /8 min/.test(ligne);
    /* 2. si la saisie dépasse la fiche (9 h), c'est elle qui compte */
    const k2 = await dans(p, function(){ piece('h1').mesure = {crochet:540, prep:0, assemb:0, finition:0, emball:0}; return coutPiece(piece('h1'), creation('c1')).minutes; });
    R.saisie_plus_longue_gagne = k2 === 540;
    /* 3. pièce terminée : le temps saisi fait foi, même court */
    const k3 = await dans(p, function(){ var x = piece('h1'); x.mesure = {crochet:60, prep:0, assemb:0, finition:0, emball:0}; x.prod = 'termine'; return coutPiece(x, creation('c1')).minutes; });
    R.terminee_le_temps_saisi_fait_foi = k3 === 60;
    /* 4. rien ne déborde de l'écran : ordinateur, tablette en portrait, téléphone */
    await dans(p, function(){ var t = Date.now(); state.pieces = [
      {id:'h1', cid:'c1', prod:'encours', com:'atelier', prix:160, mesure:{crochet:8}, tempsSaisi:true, sessions:[], cree:t, maj:t},
      {id:'h4', cid:'c2', prod:'termine', com:'vendu', prix:28, mesure:{crochet:120}, sessions:[], cree:t-1e6, maj:t, venduLe:t, termineLe:t, sortie:true}];
      state.pieces[1].fige = figerVente(creation('c2'), 28, creation('c2').canal, 120, state.pieces[1]);
      var c = nouvelleCommande(); c.client = {nom:'Zoé Marchand-Delaunay'}; c.cid = 'c2'; c.prixConvenu = 28; c.statut = 'encours'; delete c.brouillon; sauverTout(); });
    const debordements = [];
    for (const w of [1440, 1024, 820, 390]){
      await p.setViewportSize({width:w, height:900});
      for (const o of ['accueil','creations','commandes','ventes','patrons','stock','indicateurs','reglages']){
        await dans(p, new Function('return function(){ view.creaOuvert = {c1:true,c2:true,c3:true}; view.fPieces = "tous"; aller("' + o + '"); }')());
        await p.waitForTimeout(250);
        const m = await p.evaluate(() => ({
          page: document.documentElement.scrollWidth - window.innerWidth,
          tab: Array.from(document.querySelectorAll('.tablewrap')).filter(x => x.offsetParent && x.scrollWidth - x.clientWidth > 2).length}));
        if (m.page > 2 || (m.tab && (w >= 1024 || w <= 820))) debordements.push(w + ' ' + o + ' ' + JSON.stringify(m));
      }
    }
    R.aucun_debordement = debordements.length === 0; if (debordements.length) R._debordements = debordements;
    await p.close();
  } catch (e) { R._echec = String(e && e.stack || e); }
  console.log(JSON.stringify(R, null, 1));
  console.log("ERREURS JS: " + (errs.length ? errs.join(" | ") : "aucune"));
  await b.close();
})();
