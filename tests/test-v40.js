/* V40 — le coût d'une pièce doit s'additionner exactement (transport compris),
   et une pièce pas terminée reste « provisoire » : quelques minutes de
   chronomètre n'effacent pas le temps prévu de la fiche. */
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
    await dans(p, function(){ state.reglages.mode = "complet"; state.reglages.confirmeLe = Date.now(); sauverTout(); });

    /* La situation de la capture : fiche de 6 h 35 (tout au crochet), transport 5 €,
       vendue 70 €, pièce en cours avec 19 min chronométrées. */
    const r = await dans(p, function(){
      var cr = clone(creation('c1')); cr.id = 'cv40'; cr.nom = 'test piece V40';
      cr.temps = {prep:0, crochet:395, assemb:0, finition:0, emball:0}; cr.expedition = 5; cr.prix = 70; cr.canal = 'direct';
      state.creations.push(cr);
      function pz(id, prod, com, mes){ var x = {id:id, cid:'cv40', prod:prod, com:com, prix:null, mesure:mes, sessions:[], cree:Date.now(), maj:Date.now(), client:''}; state.pieces.push(x); return x; }
      var enc = pz('pe40', 'encours', 'atelier', {crochet:19});
      var fin = pz('pf40', 'termine', 'atelier', {crochet:19});
      var kE = coutPiece(enc, cr), kF = coutPiece(fin, cr);
      function somme(k){ return cts(k.matieres + k.mainOeuvre + k.transport + k.fraisVente + k.cotisations + k.fixe); }
      /* vente figée : le transport n'est compté qu'une fois */
      var vend = pz('pv40', 'termine', 'atelier', {crochet:395}); majCom(vend, 'vendu', 70);
      var kV = coutPiece(vend, cr);
      return {kE: kE, kF: kF, kV: kV, sE: somme(kE), sF: somme(kF), sV: somme(kV), minE: minutesReellesPiece(enc, cr), minF: minutesReellesPiece(fin, cr)};
    });
    R.total_compte_le_transport = r.kE.transport === 5 && Math.abs(r.kE.total - r.sE) < 0.011 && Math.abs(r.kF.total - r.sF) < 0.011;
    R.en_cours_garde_le_temps_de_la_fiche = r.minE === 395 && r.kE.provisoire === true && r.kE.mainOeuvre > 50;
    R.terminee_prend_le_chronometre = r.minF === 19 && r.kF.provisoire === false && r.kF.tempsMesure === true;
    R.en_cours_moins_bien_paye_que_terminee = r.kE.gainH < r.kF.gainH && r.kE.gain < r.kF.gain;
    R.vente_figee_transport_une_fois = r.kV.transport === 5 && Math.abs(r.kV.total - r.sV) < 0.011 && Math.abs(r.kV.gain - (r.kV.prix - r.kV.total)) < 0.011;
    /* cotisations calculées sur le prix de la pièce, pas sur celui de la fiche */
    const c2 = await dans(p, function(){
      var cr = creation('cv40'), e = piece('pe40'); e.prix = 200; var k = coutPiece(e, cr); e.prix = null;
      var c200 = clone(cr); c200.prix = 200;
      return {cot: k.cotisations, attendu: calculer(c200).cotisations, cotFiche: calculer(cr).cotisations};
    });
    R.cotisations_sur_le_prix_de_la_piece = Math.abs(c2.cot - c2.attendu) < 0.011 && (c2.attendu === 0 || c2.cot !== c2.cotFiche);

    /* Les fenêtres le disent, et leurs lignes s'additionnent */
    await dans(p, function(){ view.fPieces = 'tous'; view.creaQ = ''; view.creaOuvert = {}; state.creations.forEach(function(c){ view.creaOuvert[c.id] = true; }); aller('creations'); });
    await p.waitForTimeout(300);
    R.liste_dit_provisoire = /provisoire/.test(await p.locator('tr[data-pid="pe40"]').textContent()) && !/provisoire/.test(await p.locator('tr[data-pid="pf40"]').textContent());
    await p.click('tr[data-pid="pe40"] [data-role="cout"]'); await p.waitForTimeout(250);
    const d = await p.textContent('.dlg');
    R.detail_dit_provisoire = /Pièce pas encore terminée/.test(d) && /Coût de revient complet \(provisoire\)/.test(d) && /19 min déjà chronométrées/.test(d);
    const lignes = await p.$$eval('.dlg .cout-piece .row', rs => rs.map(x => [x.firstElementChild.textContent, x.lastElementChild.textContent]));
    const nb = t => parseFloat(t.replace(/[^\d,\-−]/g,'').replace('−','-').replace(',','.'));
    const val = m => { const l = lignes.find(x => m.test(x[0])); return l ? nb(l[1]) : 0; };
    const somme = val(/^Matières/) + val(/^Conditionnement/) + val(/^Main-d/) + val(/^Transport/) + val(/^Frais de vente/) + val(/^Cotisations/);
    R.lignes_affichees_egales_au_total = Math.abs(somme - val(/^Coût de revient complet/)) < 0.02;
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(200);
    await p.click('tr[data-pid="pe40"] [data-role="reel"]'); await p.waitForTimeout(300);
    R.prevu_reel_dit_pas_terminee = /pas terminée : au moins le temps de la fiche/.test(await p.textContent('.dlg')) && !/6 h 35\s*→\s*19 min/.test(await p.textContent('.dlg'));

    /* Le bouton « Utiliser le temps réel » demande avant d'écrire un temps très court dans la fiche */
    await p.click('.dlg [data-non]'); await p.waitForTimeout(200);
    await dans(p, function(){ piece('pv40').mesure = {crochet:19}; ouvrirFiche('cv40'); }); await p.waitForTimeout(300);
    R.fiche_previent_temps_trop_court = /C'est énorme/.test(await p.textContent('#main'));
    await p.getByRole('button', {name:'Utiliser le temps réel dans ma fiche'}).click(); await p.waitForTimeout(250);
    R.confirmation_avant_remplacement = /Ce temps semble très court/.test(await p.textContent('.dlg')) && (await p.inputValue('[data-poste="crochet"]')) === '395';
    await p.click('.dlg [data-non]'); await p.waitForTimeout(200);
    R.garder_la_fiche = (await p.inputValue('[data-poste="crochet"]')) === '395';
    await p.getByRole('button', {name:'Utiliser le temps réel dans ma fiche'}).click(); await p.waitForTimeout(250);
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(250);
    R.remplacer_quand_meme = (await p.inputValue('[data-poste="crochet"]')) === '19';
  } catch (e) { R._echec = String(e && e.stack || e); }
  console.log(JSON.stringify(R, null, 1));
  console.log("ERREURS JS: " + (errs.length ? errs.join(" | ") : "aucune"));
  await b.close();
})();
