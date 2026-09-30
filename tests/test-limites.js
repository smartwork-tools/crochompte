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
/* Seuils légaux datés, cas limites de calcul, et un atelier chargé.
   Quand un seuil change (loi de finances, arrêté), ce test échoue : c'est le
   rappel de mettre à jour l'outil ET la date affichée. */
(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  try {
    const p = await page(b);
    await graine(p);
    /* 1. seuils et taux (sources : BOFiP BOI-TVA-DECLA-40-10-10 du 01/07/2026 ;
       arrêté du 27/01/2026 pour les plafonds micro 2026-2028 ; taux URSSAF
       au 1er janvier 2026, relevés le 16/09/2026) */
    const lg = await dans(p, function(){
      function t(id){ var x = statutCotis(id); return x ? x.taux : null; }
      return {b:SEUILS.biens, s:SEUILS.services, date:SEUILS_DATE,
              taux:[t('marchandises'), t('services_art'), t('services_com'), t('bnc'), t('cipav'), t('non_declare')]};
    });
    R.seuils_ventes = lg.b.tva === 85000 && lg.b.tvaMajore === 93500 && lg.b.micro === 203100;
    R.seuils_services = lg.s.tva === 37500 && lg.s.tvaMajore === 41250 && lg.s.micro === 83600;
    R.seuils_dates = /2026/.test(lg.date);
    R.taux_2026 = JSON.stringify(lg.taux) === JSON.stringify([12.4, 21.5, 21.3, 25.8, 23.4, 0]);
    /* 2. cas limites de calcul : jamais de NaN ni d'infini */
    const cl = await dans(p, function(){
      function fini(r){ return Object.keys(r).every(function(k){ return typeof r[k] !== 'number' || isFinite(r[k]); }); }
      var base = clone(creation('c1'));
      var t0 = clone(base); t0.temps = {prep:0, crochet:0, assemb:0, finition:0, emball:0}; t0.prix = 20;
      var r0 = calculer(t0), v0 = verdictCalcul(r0);
      var q0 = clone(base); q0.lignes = [{mid: q0.lignes[0].mid, qte: 0}]; var rq = calculer(q0);
      var sup = clone(base); sup.lignes = sup.lignes.concat([{mid:'matiere-disparue', qte:50}]); var rs = calculer(sup), rb = calculer(base);
      var c9 = clone(base); c9.prix = 30; var anc = state.reglages.cotisations; state.reglages.cotisations = 50;
      var cn = canal(c9.canal), sauvComm = cn.comm; cn.comm = 0.6; var r9 = calculer(c9); cn.comm = sauvComm; state.reglages.cotisations = anc;
      var rr = calculer(base);
      var somme = cts(rr.matieres + rr.fixePiece + rr.fraisFixesVente + rr.fraisVar + rr.cotisations);
      return {t0: fini(r0) && v0.k === 'warn' && /Temps/.test(v0.t), q0: fini(rq) && rq.matieres >= 0,
              sup: fini(rs) && Math.abs(rs.matieres - rb.matieres) < 0.001,
              extreme: fini(r9) && r9.prixObjectif === 0, arrondi: Math.abs(cts(rr.prix - somme) - rr.reste) < 0.001};
    });
    R.temps_nul = cl.t0; R.quantite_nulle = cl.q0; R.matiere_supprimee = cl.sup; R.frais_extremes_sans_infini = cl.extreme; R.arrondis_au_centime = cl.arrondi;
    const neg = await dans(p, function(){ var m = state.matieres[0]; mouvementMatiere(m, 'inventaire', 0, null, 'test'); creation('c1').lignes = [{mid:m.id, qte:40}]; ajouterPieces('c1', 1, 'termine'); return pointsAFaire().some(function(x){ return /stock négatif/.test(x.t); }); });
    R.stock_negatif_signale = neg;
    /* 3. un atelier chargé : 200 matières, 50 créations, 2 000 pièces, 300 commandes */
    const tps = await dans(p, function(){
      var s = state;
      for (var i = 0; i < 200; i++) s.matieres.push({id:'mz'+i, nom:'Fil test '+i, cat:'fil', prix:3, contenance:50, unite:'g', stock:500, seuil:0, pmp:0.06, mouv:[], variantes:[]});
      for (var j = 0; j < 50; j++) s.creations.push({id:'cz'+j, nom:'Création '+j, modele:'vide', lignes:[{mid:'mz'+j, qte:60},{mid:'mz'+(j+50), qte:20}], temps:{prep:10,crochet:180,assemb:20,finition:10,emball:5}, canal:'direct', prix:40, expedition:0, seuilFini:0, migre:true, photo:null});
      var now = Date.now();
      for (var k = 0; k < 2000; k++) s.pieces.push({id:'pz'+k, cid:'cz'+(k%50), prod:'termine', com: k%3 ? 'vendu' : 'atelier', prix: k%3 ? 40 : null, venduLe: k%3 ? now - k*3600000 : null, cree:now - k*3600000, maj:now, termineLe:now - k*3600000, sortie:true, mesure:{}, sessions:[]});
      for (var c = 0; c < 300; c++){ var cm = nouvelleCommande(); cm.client = {nom:'Cliente '+c}; cm.cid = 'cz'+(c%50); cm.prixConvenu = 40; cm.statut = c%2 ? 'livree' : 'encours'; delete cm.brouillon; }
      sauverTout();
      var mesures = {};
      ['accueil','creations','stock','commandes','indicateurs','ventes'].forEach(function(tab){
        var t0 = performance.now(); view.sub = null; aller(tab); mesures[tab] = Math.round(performance.now() - t0);
      });
      var t1 = performance.now(); resultatsGlobaux('creation 12'); mesures.recherche = Math.round(performance.now() - t1);
      return mesures;
    });
    R.charge_temps_ms = tps;
    R.charge_ecrans_moins_de_3s = Object.keys(tps).every(function(k){ return k === 'recherche' || tps[k] < 3000; });
    R.charge_recherche_moins_de_500ms = tps.recherche < 500;
    /* 4. contraste des textes secondaires (au moins 4,5:1 sur le fond des cartes) */
    const ct = await p.evaluate(() => {
      function rgb(c){ return c.match(/\d+(\.\d+)?/g).slice(0,3).map(Number); }
      function lum(c){ return c.map(v => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }).reduce((a,v,i)=>a+v*[0.2126,0.7152,0.0722][i],0); }
      function ratio(a,b){ var l1 = lum(rgb(a)), l2 = lum(rgb(b)); return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05); }
      var cs = getComputedStyle(document.documentElement);
      var d = document.createElement('div'); document.body.appendChild(d);
      function coul(v){ d.style.color = 'var(' + v + ')'; return getComputedStyle(d).color; }
      var r = {muted: ratio(coul('--muted'), coul('--surface')), ink: ratio(coul('--ink'), coul('--surface')), warn: ratio(coul('--warn'), coul('--surface')), bad: ratio(coul('--bad'), coul('--surface')), good: ratio(coul('--good'), coul('--surface'))};
      d.remove(); return r;
    });
    R.contraste = Object.keys(ct).every(k => ct[k] >= 4.5) ? true : ct;
    await p.close();
  } catch (e) { R._echec = String(e && e.stack || e); }
  console.log(JSON.stringify(R, null, 1));
  console.log("ERREURS JS: " + (errs.length ? errs.join(" | ") : "aucune"));
  await b.close();
})();
