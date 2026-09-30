/* V52 — gain = prix de vente − coût de revient (sans le temps), le même sens
   dans la ligne, le détail et le gain de l'heure ; temps saisi à la main sur
   toute pièce, vendue comprise, et vente refigée dessus. */
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
      appliquerProfil('pro', {sansRendu:true}); state.reglages.confirmeLe = Date.now(); state.reglages.tauxHoraire = 12;
      var cr = creation('c1'); cr.prix = 160; cr.temps = {prep:5, crochet:700, assemb:10, finition:5, emball:5};
      state.pieces = [{id:'g1', cid:'c1', prod:'termine', com:'vendu', prix:160, mesure:{}, sessions:[], cree:Date.now()-1e6, maj:Date.now(), venduLe:Date.now(), termineLe:Date.now(), sortie:true}];
      var pv = piece('g1'); pv.fige = figerVente(cr, 160, cr.canal, 0);
      sauverTout(); view.fPieces = 'tous'; view.creaQ = ''; view.creaOuvert = {c1:true}; view.creaHist = {c1:true}; aller('creations');
    });
    await p.waitForTimeout(400);
    /* 1. la ligne : gain = prix − coût de revient, cohérent avec le €/h */
    const k = await dans(p, function(){ var k = coutPiece(piece('g1'), creation('c1')); return {gain:k.gain, cr:k.coutRevient, prix:k.prix, tot:k.total, mo:k.mainOeuvre, h:k.heures, gainH:k.gainH, ga:k.gainApresObjectif}; });
    R.gain_est_prix_moins_cout = Math.abs(k.gain - (k.prix - k.cr)) < 0.001 && k.cr < k.tot && Math.abs(k.tot - k.cr - k.mo) < 0.011;
    R.gain_horaire_coherent = Math.abs(k.gainH - k.gain / k.h) < 0.001 && k.gain > 0;
    R.gain_apres_objectif_a_part = Math.abs(k.ga - (k.prix - k.tot)) < 0.011;
    const ligne = (await p.locator('tr[data-pid="g1"]').textContent()).replace(/ | /g, ' ');
    R.ligne_affiche_gain_positif = new RegExp(eurTxt(k.gain).replace('.', ',')).test(ligne) && /\/ h pour 12 h 05/.test(ligne) && !/−/.test(ligne.split('Gain')[1] || ligne);
    function eurTxt(n){ return n.toFixed(2).replace('.', ','); }
    /* 2. le détail : coût de revient, gain, temps, objectif, prix conseillé ; lignes additionnées */
    await p.click('tr[data-pid="g1"] [data-role="cout"]'); await p.waitForTimeout(250);
    const lignes = await p.$$eval('.dlg .cout-piece .row', rs => rs.map(x => [x.firstElementChild.textContent, x.lastElementChild.textContent]));
    const nb = t => parseFloat(t.replace(/[^\d,\-−]/g,'').replace('−','-').replace(',','.'));
    const val = m => { const l = lignes.find(x => m.test(x[0])); return l ? nb(l[1]) : NaN; };
    R.detail_coherent = Math.abs(val(/^Prix de vente/) - val(/^Coût de revient/) - val(/^Gain/)) < 0.02 && lignes.some(x => /^Temps de travail/.test(x[0])) && lignes.some(x => /^Ton objectif/.test(x[0])) && !lignes.some(x => /Main-d/.test(x[0]) || /Gain en plus/.test(x[0]));
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(200);
    /* 3. saisir le temps à la main sur une pièce vendue */
    R.bouton_temps_visible = await p.locator('tr[data-pid="g1"] [data-role="temps"]').isVisible();
    await p.click('tr[data-pid="g1"] [data-role="temps"]'); await p.waitForTimeout(250);
    await p.fill('#tp-h', '8'); await p.fill('#tp-h-min', '30'); await p.click('.dlg [data-oui]'); await p.waitForTimeout(400);
    const k2 = await dans(p, function(){ var x = piece('g1'); var k = coutPiece(x, creation('c1')); return {min:k.minutes, saisi:!!x.tempsSaisi, mes:k.tempsMesure, fige: x.fige && x.fige.tempsMesure, gainH:k.gainH, gain:k.gain}; });
    R.temps_saisi = k2.min === 510 && k2.saisi && k2.mes && k2.fige === true;
    R.gain_horaire_suit_le_temps = Math.abs(k2.gainH - k2.gain / 8.5) < 0.01 && k2.gainH > k.gainH;
    R.ligne_dit_8h30 = /8 h 30/.test(await p.locator('tr[data-pid="g1"]').textContent());
    /* 4. le chronomètre reprend la main sur la saisie */
    await dans(p, function(){ var x = piece('g1'); x.com = 'atelier'; x.prod = 'encours'; x.fige = null; sauverTout(); demarrerChrono('g1', 'crochet'); });
    R.chrono_efface_la_saisie = await dans(p, function(){ return !piece('g1').tempsSaisi; });
    await dans(p, function(){ arreterChrono(true); });
    await p.close();
  } catch (e) { R._echec = String(e && e.stack || e); }
  console.log(JSON.stringify(R, null, 1));
  console.log("ERREURS JS: " + (errs.length ? errs.join(" | ") : "aucune"));
  await b.close();
})();
