/* V65.1 — vitesse (corrections du rapport de test B, M4-M5-M6) :
   index des créations, matières et pièces par commande ; calculs d'ensemble
   gardés entre deux enregistrements ; Mes ventes et Commandes découpées.
   Le test vérifie que les caches ne faussent JAMAIS les données, que le
   découpage fonctionne, et pose un garde-fou de vitesse large. */
const {chromium} = require('./outils').playwright;
const path = require('path'); const fs = require('fs');
const R = {}; const errs = [];
async function page(b){
  const p = await b.newPage({serviceWorkers:'block', viewport:{width:1440, height:900}});
  p.on('pageerror', e=>errs.push(e.message));
  p.on('dialog', d=>d.dismiss());
  await p.route('**/app.js*', async r=>{
    const src = fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
    const i = src.lastIndexOf('})();');
    await r.fulfill({contentType:'text/javascript; charset=utf-8', body: src.slice(0,i) + 'window.__eval = function(c){ return eval(c); };\n' + src.slice(i)});
  });
  await p.route('**/vendor/supabase/**', r=>r.fulfill({path:path.join(__dirname,'faux-supabase-persistant.js'),contentType:'application/javascript'}));
  await p.route('**/functions/v1/connexion', r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'AT',refresh_token:'RT'})}));
  await p.goto('http://127.0.0.1:8934/index.html'); await p.waitForTimeout(700);
  if (await p.locator('#sy-c-identifiant').count()){ await p.fill('#sy-c-identifiant','LaineTest'); await p.fill('#sy-c-mdp','motdepasse123'); await p.click('#sy-c-valider'); await p.waitForTimeout(1000); }
  await require('./aide.js').graine(p);
  await p.evaluate(()=>window.__eval('(' + function(){
    appliquerProfil('pro', {sansRendu:true});
    state.reglages.confirmeLe = Date.now(); state.reglages.statut = 'marchandises'; state.reglages.cotisations = 12.4;
    sauverTout(); aller('accueil');
  }.toString() + ')()'));
  await p.waitForTimeout(400);
  return p;
}
const dans = (p, fn, a) => p.evaluate(([code, x]) => window.__eval('(' + code + ')')(x), [fn.toString(), a === undefined ? null : a]);
(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  try {
    const p = await page(b);

    /* ── 1. Les index restent justes quand les données changent ── */
    R.index_justes = await dans(p, function(){
      var ok = true;
      ok = ok && creation('c1') && creation('c1').nom === 'Lapin Céleste';
      var avantM = state.matieres[0];
      ok = ok && matiere(avantM.id) === avantM;
      /* ajout : l'index se reconstruit (longueur) */
      state.creations.push({id:'cNEU', nom:'Toute neuve', lignes:[], temps:{crochet:30}, canal:'direct', prix:10, migre:true, photo:null});
      ok = ok && creation('cNEU') && creation('cNEU').nom === 'Toute neuve';
      /* remplacement du tableau (restauration, réception) : identité */
      state.creations = state.creations.slice();
      ok = ok && creation('cNEU') !== null;
      /* suppression */
      state.creations = state.creations.filter(function(x){ return x.id !== 'cNEU'; });
      ok = ok && creation('cNEU') === null;
      /* pièces par commande */
      var c = nouvelleCommande(); c.client = {nom:'Idx'}; c.cid = 'c1'; c.qte = 2; c.prixConvenu = 10;
      c.statut = 'acceptee'; c.accordLe = Date.now(); delete c.brouillon;
      changerStatutCommande(c, 'encours'); sauverTout();
      ok = ok && piecesCommande(c).length === 2;
      detacherPieces(c.id); sauverTout();
      ok = ok && piecesCommande(c).length === 0;
      state.commandes = commandes().filter(function(x){ return x !== c; }); sauverTout();
      return ok;
    });

    /* ── 2. Les calculs gardés en mémoire suivent bien les modifications ── */
    R.points_a_faire_suivent = await dans(p, function(){
      var avant = pointsAFaire().length;
      var deux = pointsAFaire().length;   /* relecture : même résultat, depuis le cache */
      /* une commande en retard crée un point à faire */
      var c = nouvelleCommande(); c.client = {nom:'Retard'}; c.cid = 'c1'; c.qte = 1; c.prixConvenu = 10;
      c.statut = 'acceptee'; c.accordLe = Date.now(); c.datePromise = '2026-01-01'; delete c.brouillon;
      sauverTout();
      var apres = pointsAFaire().length;
      state.commandes = commandes().filter(function(x){ return x !== c; }); sauverTout();
      var fin = pointsAFaire().length;
      return avant === deux && apres > avant && fin === avant;
    });
    R.besoins_suivent = await dans(p, function(){
      /* la matière doit être suivie (un inventaire suffit) pour entrer dans la liste d'achats */
      var m = matiere(creation('c1').lignes[0].mid);
      mouvementMatiere(m, 'inventaire', 100, null, 'comptage test');
      sauverTout();
      var avant = JSON.stringify(besoinsMatieres());
      var c = nouvelleCommande(); c.client = {nom:'Besoin'}; c.cid = 'c1'; c.qte = 5; c.prixConvenu = 10;
      c.statut = 'acceptee'; c.accordLe = Date.now(); delete c.brouillon;
      sauverTout();
      var apres = JSON.stringify(besoinsMatieres());
      state.commandes = commandes().filter(function(x){ return x !== c; }); sauverTout();
      return avant !== apres;
    });

    /* ── 3. Mes ventes : 150 ventes, 60 lignes puis la suite ── */
    await dans(p, function(){
      var t0 = Date.now() - 10 * 864e5;
      for (var i = 0; i < 150; i++){
        state.pieces.push({id:'pv'+i, cid:'c1', prod:'termine', com:'vendu', prix:20, venduLe:t0 + i * 36e5,
                           paiement:'carte', mesure:{}, sessions:[], cree:t0, maj:Date.now(), sortie:true,
                           fige:null});
      }
      sauverTout(); view.ventesPeriode = 'tout'; aller('ventes');
    });
    await p.waitForTimeout(500);
    R.ventes_decoupees = (await p.locator('.t-ventes tbody tr').count()) === 60;
    const bPlusV = p.locator('#main button', {hasText:'Afficher les'});
    R.ventes_bouton_suite = /encore 90/.test(await bPlusV.first().textContent());
    await bPlusV.first().click(); await p.waitForTimeout(500);
    R.ventes_suite_affichee = (await p.locator('.t-ventes tbody tr').count()) === 150;
    R.ventes_bouton_disparu = (await p.locator('#main button', {hasText:'Afficher les'}).count()) === 0;
    /* la tuile « Vendu » compte TOUTES les ventes, pas seulement les lignes affichées */
    await dans(p, function(){ view.ventesPeriode = 'tout'; aller('ventes'); }); await p.waitForTimeout(400);
    R.ventes_tuile_total_complet = /150/.test(await p.locator('.tiles .tile').first().innerText());
    /* changer de période repart à 60 */
    await dans(p, function(){ view.ventesPeriode = 'mois'; aller('ventes'); }); await p.waitForTimeout(400);
    R.ventes_retour_60 = (await p.locator('.t-ventes tbody tr').count()) === 60;

    /* ── 4. Commandes : 150 commandes, 60 lignes puis la suite ── */
    await dans(p, function(){
      for (var i = 0; i < 150; i++){
        var c = nouvelleCommande(); c.client = {nom:'Cliente ' + i}; c.cid = 'c1'; c.qte = 1; c.prixConvenu = 10 + i;
        c.statut = 'devis'; delete c.brouillon;
      }
      sauverTout(); view.cmdVue = null; aller('commandes');
    });
    await p.waitForTimeout(600);
    R.commandes_decoupees = (await p.locator('.t-cmd tbody tr').count()) === 60;
    await p.locator('#main button', {hasText:'Afficher les'}).first().click(); await p.waitForTimeout(500);
    R.commandes_suite_affichee = (await p.locator('.t-cmd tbody tr').count()) >= 150;
    /* une recherche repart au début de la liste */
    await p.fill('#cmd-q', 'Cliente 12'); await p.dispatchEvent('#cmd-q', 'input'); await p.waitForTimeout(400);
    R.commandes_recherche_ok = (await p.locator('.t-cmd tbody tr').count()) <= 60;

    /* ── 5. Garde-fou de vitesse (seuils très larges pour l'intégration) ── */
    const vit = await dans(p, function(){
      function mesure(id){ var d = performance.now(); aller(id); return performance.now() - d; }
      var m = {};
      ['accueil','creations','commandes','ventes','stock','indicateurs','reglages'].forEach(function(id){ m[id] = Math.round(mesure(id)); });
      return m;
    });
    R.vitesse_onglets_sous_800ms = Object.keys(vit).every(function(k){ return vit[k] < 800; }) || vit;

    await p.close();
  } catch(e){ console.log('Error:', e.message); }
  console.log(JSON.stringify(R, null, 2));
  console.log('ERREURS JS: ' + (errs.length ? errs.join(' | ') : 'aucune'));
  await b.close();
})();
