/* V64.2 — « l'argent juste » (corrections du rapport de test A) :
   commande annulée sans ventes fictives, pièce réservée invendable ailleurs,
   pro → amateur sans cotisations cachées, achat corrigé vers le bon lot,
   prix conseillé au centime le plus bas, totaux = somme des lignes,
   moyen de l'acompte partout, commande annulée sans reste à recevoir,
   liste « il manque » à jour, « pièces par mois » entier. */
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
  return p;
}
const dans = (p, fn, a) => p.evaluate(([code, x]) => window.__eval('(' + code + ')')(x), [fn.toString(), a === undefined ? null : a]);
(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  try {
    const p = await page(b);
    await require('./aide.js').graine(p);
    await dans(p, function(){
      appliquerProfil('pro', {sansRendu:true});
      state.reglages.confirmeLe = Date.now(); state.reglages.statut = 'marchandises';
      state.reglages.cotisations = 12.4; state.reglages.tauxHoraire = 18; state.reglages.fraisFixes = 0;
      sauverTout(); aller('accueil');
    });
    await p.waitForTimeout(400);

    /* ── 1. B1 : annuler une commande livrée ne crée pas de ventes « payées » ── */
    const b1 = await dans(p, function(){
      var c = nouvelleCommande(); c.client = {nom:'Eva E'}; c.cid = 'c1'; c.qte = 2; c.prixConvenu = 30;
      c.statut = 'acceptee'; c.accordLe = Date.now(); delete c.brouillon;
      c.versement = {montant:20, date:aujourdhuiISO(), type:'acompte', moyen:'especes'};
      changerStatutCommande(c, 'livree'); sauverTout();
      var avant = {enc: encaisse(c), vendues: piecesCommande(c).filter(function(x){ return x.com === 'vendu'; }).length};
      changerStatutCommande(c, 'annulee'); sauverTout();
      var lr = livreRecettes(new Date().getFullYear());
      return {avant: avant, enc: encaisse(c), solde: soldeDu(c),
              vendues: (state.pieces||[]).filter(function(x){ return x.com === 'vendu'; }).length,
              enStockC1: piecesDe('c1').filter(function(x){ return x.com === 'atelier' && x.prod === 'termine'; }).length,
              ventesFictives: lr.filter(function(x){ return /Vente de/.test(x.nature); }).length,
              acompteLR: lr.filter(function(x){ return /Acompte/.test(x.nature); }).length,
              moyenAcompte: (lr.filter(function(x){ return /Acompte/.test(x.nature); })[0] || {}).moyen,
              lignesVente: lignesVentes({d0:0, d1:Date.now()+864e5}).length};
    });
    R.b1_pieces_vendues_a_la_livraison = b1.avant.vendues === 2 && b1.avant.enc === 20;
    R.b1_annulation_remet_en_stock = b1.vendues === 0 && b1.enStockC1 === 2;
    R.b1_pas_de_vente_fictive = b1.ventesFictives === 0 && b1.lignesVente === 0;
    R.b1_encaisse_reste_20 = b1.enc === 20;
    R.m6_annulee_sans_reste = b1.solde === 0;
    R.m5_moyen_acompte_livre = b1.acompteLR === 1 && b1.moyenAcompte === 'Espèces';

    /* ── 2. M1 : « Vendre une pièce » ne propose pas une pièce réservée ── */
    const m1 = await dans(p, function(){
      var c = nouvelleCommande(); c.client = {nom:'Yann Y'}; c.cid = 'c2'; c.qte = 2; c.prixConvenu = 45;
      c.statut = 'acceptee'; c.accordLe = Date.now(); delete c.brouillon;
      changerStatutCommande(c, 'encours'); sauverTout();
      dialogueVente('c2');
      return piecesDe('c2').filter(function(x){ return x.cmdId; }).length;
    });
    await p.waitForTimeout(300);
    R.m1_deux_pieces_reservees = m1 === 2;
    R.m1_pas_de_choix_de_piece_reservee = (await p.locator('#vt-piece-w:not([hidden])').count()) === 0;
    R.m1_case_fabriquee_proposee = (await p.locator('#vt-vide:not([hidden])').count()) === 1;
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);

    /* ── 3. M2 : pro → amateur : cotisations à 0, retour en pro : statut retrouvé ── */
    const m2 = await dans(p, function(){
      appliquerProfil('amateur', {sansRendu:true});
      var am = {statut: state.reglages.statut, cotis: Number(state.reglages.cotisations)};
      var r = calculer(creation('c1'));
      am.cotisCalcul = r.cotisations;
      appliquerProfil('pro', {sansRendu:true});
      return {am: am, statut: state.reglages.statut, cotis: Number(state.reglages.cotisations)};
    });
    R.m2_amateur_sans_cotisations = m2.am.statut === 'non_declare' && m2.am.cotis === 0 && m2.am.cotisCalcul === 0;
    R.m2_retour_pro_statut_retrouve = m2.statut === 'marchandises' && m2.cotis === 12.4;

    /* ── 4. M3 : corriger le prix d'un achat le déplace vers le lot de ce prix ── */
    const m3 = await dans(p, function(){
      var m = {id:'mx1', nom:'Coton Test · Rose', nomBase:'Coton Test', couleur:'Rose', cat:'fil', prix:3.2, contenance:50,
               unite:'g', stock:0, seuil:0, pmp:0.064, mouv:[], perso:true, maj:Date.now(), variantes:[]};
      state.matieres.push(m);
      mouvementMatiere(m, 'entree', 200, 12.8, 'stock de départ', {});
      noterAchatLigne(m, 100, 6.4, 'achat au même prix', {});
      noterAchatLigne(m, 150, 12, 'achat à 4 €', {});
      sauverTout();
      var lots = lotsDe(m);
      return {nLots: lots.length, prix: lots.map(function(x){ return Number(x.prix); }).sort(),
              stocks: lots.map(function(x){ return Number(x.stock); }).sort(function(a,b){ return a-b; })};
    });
    R.m3_deux_lots_avant = m3.nLots === 2 && m3.prix.join(',') === '3.2,4' && m3.stocks.join(',') === '150,300';
    /* La vraie fenêtre : corriger l'achat de 2 pelotes à 3,20 € en 4 € la pelote. */
    await dans(p, function(){
      var m = matiere('mx1');
      var mv = (m.mouv || []).filter(function(x){ return x.t === 'entree' && /même prix/.test(x.n || ''); })[0];
      dialogueModifierMouvement(m, mv);
    });
    await p.waitForTimeout(300);
    await p.fill('#mm-pu', '4'); await p.dispatchEvent('#mm-pu', 'input');
    await p.getByRole('button', {name:'Enregistrer la correction'}).click(); await p.waitForTimeout(400);
    const m3b = await dans(p, function(){
      var lots = lotsDe(matiere('mx1'));
      return {nLots: lots.length, prix: lots.map(function(x){ return Number(x.prix); }).sort(),
              stocks: lots.map(function(x){ return Number(x.stock); }).sort(function(a,b){ return a-b; }),
              doublons: lots.filter(function(x){ return Math.abs(Number(x.prix) - 4) < 0.005; }).length};
    });
    R.m3_correction_deplace_vers_le_lot = m3b.prix.join(',') === '3.2,4' && m3b.doublons === 1 && m3b.stocks.join(',') === '200,250';

    /* ── 5. m1/m2/m3 : prix conseillé minimal et totaux exacts ── */
    const calc = await dans(p, function(){
      var ok = {conseilleMin: true, plancherMin: true, lignes: true, besoin: true};
      for (var t = 0; t < 400; t++){
        var cr = {id:'t'+t, nom:'T', lignes:[], temps:{crochet: 30 + (t % 300)}, canal:(t % 2) ? 'etsy' : 'direct', prix: 10 + t, expedition:0};
        state.matieres.slice(0, 3).forEach(function(m, i){ cr.lignes.push({mid:m.id, qte: 5 + ((t * 7 + i * 13) % 90) / 3}); });
        var r = calculer(cr);
        if (!r.impossible && r.prixObjectif > 0.01){
          var fv = function(px){ return cts(px - (r.matieres + r.fixePiece + r.fraisFixesVente + cts(px * r.pctVente) + cts(px * r.tauxCotis))); };
          var mo = r.heures * (Number(state.reglages.tauxHoraire) || 0);
          if (fv(r.prixObjectif) + 0.0001 < mo) ok.conseilleMin = false;                   /* paie bien l'objectif */
          if (fv(cts(r.prixObjectif - 0.01)) + 0.0001 >= mo) ok.conseilleMin = false;      /* et le centime en dessous ne suffit pas */
          if (fv(r.prixPlancher) < 0) ok.plancherMin = false;
          if (r.prixPlancher > 0.01 && fv(cts(r.prixPlancher - 0.01)) >= 0) ok.plancherMin = false;
        }
        var somme = 0; r.detail.forEach(function(d){ somme += d.cout; });
        if (Math.abs(cts(somme) + r.perte - (r.matieres)) > 0.0051 && Math.abs(cts(somme + r.perte) - r.matieres) > 0.0051) ok.lignes = false;
        var ba = besoinAchat(cr, 3, false);
        if (Math.abs(ba.consomme - cts(3 * r.matieres)) > 0.0001) ok.besoin = false;
      }
      return ok;
    });
    R.calc_prix_conseille_minimal = calc.conseilleMin;
    R.calc_plancher_minimal = calc.plancherMin;
    R.calc_lignes_sadditionnent = calc.lignes;
    R.calc_besoin_meme_valeur = calc.besoin;
    R.calc_eur_arrondi_cts = await dans(p, function(){ return eur(0.175) === '0,18 €' && eur(7.465) === '7,47 €'; });

    /* ── 6. m4 : le moyen du versement apparaît dans Mes ventes ── */
    const m4 = await dans(p, function(){
      var c = nouvelleCommande(); c.client = {nom:'Rita R'}; c.cid = 'c3'; c.qte = 1; c.prixConvenu = 100;
      c.statut = 'acceptee'; c.accordLe = Date.now(); delete c.brouillon;
      c.versement = {montant:30, date:aujourdhuiISO(), type:'acompte', moyen:'carte'};
      enregistrerReglement(c, 70, 'cheque', aujourdhuiISO());
      changerStatutCommande(c, 'livree'); c.livreeLe = aujourdhuiISO(); sauverTout();
      var l = lignesVentes({d0:0, d1:Date.now()+864e5}).filter(function(x){ return x.type === 'cmd' && x.c === c; })[0];
      return l ? l.moyen : '';
    });
    R.m4_moyens_complets = /Carte/.test(m4) && /Chèque/.test(m4);

    /* ── 7. m7 : la liste « il manque » suit la saisie du nom ── */
    await dans(p, function(){ var c = commandes().filter(function(x){ return x.client && x.client.nom === 'Rita R'; })[0]; view.cmdVue = c.id; aller('commandes', {garderVue:true}); });
    await p.waitForTimeout(500);
    R.m7_facture_possible_avant = !(await p.locator('#cmd-facture .manques').count()) || !/nom de la personne/.test(await p.locator('#cmd-facture').innerText());
    await p.fill('[data-c="nom"]', ''); await p.dispatchEvent('[data-c="nom"]', 'input'); await p.waitForTimeout(300);
    R.m7_manque_affiche_sans_rouvrir = /nom de la personne qui commande/.test(await p.locator('#cmd-facture').innerText());
    await p.fill('[data-c="nom"]', 'Rita R'); await p.dispatchEvent('[data-c="nom"]', 'input'); await p.waitForTimeout(300);
    R.m7_manque_disparait = !/nom de la personne qui commande/.test(await p.locator('#cmd-facture').innerText());

    /* ── 8. c3 : « pièces vendues par mois » refuse 2,5 ── */
    await dans(p, function(){ view.regSection = 'charges'; aller('reglages'); });
    await p.waitForTimeout(400);
    if (await p.locator('[data-r="piecesParMois"]').count()){
      await p.fill('[data-r="piecesParMois"]', '2,5');
      await p.dispatchEvent('[data-r="piecesParMois"]', 'input'); await p.waitForTimeout(200);
      R.c3_pieces_mois_entier = await dans(p, function(){ return state.reglages.piecesParMois === 3; });
    } else R.c3_pieces_mois_entier = 'champ introuvable';

    /* ── 9. c4 : annuler une vente efface bien le prix de la pièce ── */
    R.c4_prix_efface = await dans(p, function(){
      var pce = {id:'pz9', cid:'c1', prod:'termine', com:'atelier', prix:null, mesure:{}, sessions:[], cree:Date.now(), maj:Date.now(), sortie:true};
      state.pieces.push(pce);
      majCom(pce, 'vendu', 40);
      var apresVente = Number(pce.prix) === 40;
      majCom(pce, 'atelier');
      return apresVente && pce.prix === null && !pce.venduLe;
    });

    await p.close();
  } catch(e){ console.log('Error:', e.message); }
  console.log(JSON.stringify(R, null, 2));
  console.log('ERREURS JS: ' + (errs.length ? errs.join(' | ') : 'aucune'));
  await b.close();
})();
