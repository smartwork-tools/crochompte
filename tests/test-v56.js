/* V56 — Solidité : vente reliée à une commande comptée (règlement), bilan
   figé recalculé, commande annulée, bilan minimal sans création, temps figé,
   bornes de période, registre des achats, impression sans script inline,
   repli d'image, accès refusé par le serveur, textes alignés. */
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
    await p.click('#sy-c-valider'); await p.waitForTimeout(1200);
  }
  return p;
}
const dans = (p, fn) => p.evaluate(code => window.__eval('(' + code + ')()'), fn.toString());
(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  try {
    const p = await page(b);
    await graine(p);
    await dans(p, function(){ appliquerProfil('pro', {sansRendu:true}); state.reglages.statut = 'marchandises'; state.reglages.cotisations = 12.4; state.reglages.tauxHoraire = 15; state.pieces = []; state.commandes = []; sauverTout(); });

    /* ── 1. Vente reliée à une commande : règlement noté, compté une fois ── */
    await dans(p, function(){ var c = nouvelleCommande(); c.client = {nom:'Zoé'}; c.cid = 'c2'; c.prixConvenu = 28; c.statut = 'encours'; delete c.brouillon; sauverTout(); dialogueVente('c2'); });
    await p.waitForTimeout(300);
    await p.selectOption('#vt-cmd', {index:1}); await p.fill('#vt-prix', '28'); await p.selectOption('#vt-moyen', 'carte');
    await p.click('.dlg [data-oui], .dlg button.primary'); await p.waitForTimeout(400);
    const v1 = await dans(p, function(){ var c = commandes()[0], pc = piecesDe('c2')[0]; var e = encaissements().filter(function(x){ return x.montant === 28; });
      return {paiements: (c.paiements||[]).length, montant: c.paiements && c.paiements[0] && c.paiements[0].montant, moyen: c.paiements && c.paiements[0] && c.paiements[0].moyen, pieceId: c.paiements && c.paiements[0] && c.paiements[0].pieceId === pc.id, solde: soldeDu(c), enc: e.length, lie: !!commandeLiee(pc)}; });
    R.vente_liee_reglement_note = v1.paiements === 1 && v1.montant === 28 && v1.moyen === 'carte' && v1.pieceId && v1.solde === 0 && v1.lie;
    R.vente_liee_comptee_une_fois = v1.enc === 1;
    R.toast_dit_commande = /noté sur la commande/.test(await p.locator('#toasts, .toast, body').first().textContent());
    /* commande déjà réglée : la pièce est reliée, aucun règlement ajouté ; et un changement de statut ne note rien */
    R.deja_reglee_rien_ajoute = await dans(p, function(){ var c = nouvelleCommande(); c.client = {nom:'Ana'}; c.cid = 'c3'; c.prixConvenu = 35; c.statut = 'encours'; delete c.brouillon; c.versement = {montant:35, date:aujourdhuiISO(), type:'acompte'};
      var pv = vendrePiece('c3', 35, 'especes', {cmdId: c.id}); var ok1 = (c.paiements||[]).length === 0 && pv.cmdId === c.id && encaisse(c) === 35;
      ajouterPieces('c3', 1, 'termine'); var p2 = piecesDe('c3').filter(function(x){ return x.com !== 'vendu'; })[0]; p2.com = 'commande'; majCom(p2, 'vendu', 35);
      var ok2 = (c.paiements||[]).length === 0; state.commandes = state.commandes.filter(function(k){ return k.id !== c.id; }); state.pieces = state.pieces.filter(function(x){ return x.cid !== 'c3'; }); return ok1 && ok2; });
    /* annuler la vente retire le règlement */
    await dans(p, function(){ majCom(piecesDe('c2')[0], 'atelier'); sauverTout(); });
    R.annulation_retire_reglement = await dans(p, function(){ var c = commandes()[0]; return (c.paiements||[]).length === 0 && !piecesDe('c2')[0].cmdId; });

    /* ── 2. Bilan figé d'une commande livrée : suit le prix tant qu'elle n'est pas facturée ── */
    await dans(p, function(){ var c = commandes()[0]; c.statut = 'livree'; c.livreeLe = aujourdhuiISO(); c.bilanFige = bilanCommande(c, true); view.cmdVue = c.id; sauverTout(); aller('commandes', {garderVue:true}); });
    await p.waitForTimeout(400);
    const avantB = await dans(p, function(){ return bilanCommande(commandes()[0]).r.prix; });
    await p.fill('[data-c="prixConvenu"]', '60'); await p.dispatchEvent('[data-c="prixConvenu"]', 'input'); await p.dispatchEvent('[data-c="prixConvenu"]', 'change'); await p.waitForTimeout(300);
    const apresB = await dans(p, function(){ return {fige: commandes()[0].bilanFige.r.prix, lu: bilanCommande(commandes()[0]).r.prix}; });
    R.bilan_fige_suit_le_prix = avantB === 28 && apresB.fige === 60 && apresB.lu === 60;

    /* ── 3. Commande annulée : la pièce reliée redevient une vente à part ── */
    await dans(p, function(){ var c = commandes()[0]; c.statut = 'encours'; sauverTout(); dialogueVente('c2'); });
    await p.waitForTimeout(300); await p.selectOption('#vt-cmd', {index:1}); await p.fill('#vt-prix', '60'); await p.click('.dlg [data-oui], .dlg button.primary'); await p.waitForTimeout(400);
    await p.selectOption('[data-c="statut"]', 'annulee'); await p.waitForTimeout(400);
    R.commande_annulee_detache = await dans(p, function(){ var pc = piecesDe('c2').filter(function(x){ return x.com === 'vendu'; })[0]; return !!pc && !pc.cmdId && lignesVentes({d0:0, d1:Date.now()+864e5}).some(function(x){ return x.type === 'piece' && x.montant === 60; }); });

    /* ── 4. Commande sans création (article libre) : bilan minimal ── */
    R.bilan_article_libre = await dans(p, function(){ var c = nouvelleCommande(); c.client = {nom:'Léa'}; c.cid = null; c.libelle = 'Réparation'; c.prixConvenu = 20; c.statut = 'livree'; c.livreeLe = aujourdhuiISO(); delete c.brouillon;
      var bq = bilanCommande(c, true); return !!bq && bq.sansMatieres && bq.r.prix === 20 && bq.r.cotisations > 0 && bq.r.matieres === 0; });

    /* ── 5. Temps et taux figés pour une vente passée ── */
    await dans(p, function(){ state.pieces = []; ajouterPieces('c1', 1, 'termine'); var x = piecesDe('c1')[0]; x.mesure = {prep:0, crochet:60, assemb:0, finition:0, emball:0}; x.prix = 40; majCom(x, 'vendu', 40); sauverTout(); });
    const t0 = await dans(p, function(){ var k = coutPiece(piecesDe('c1')[0], creation('c1')); return {h: k.heures, gh: k.gainH !== undefined ? k.gainH : k.gainHeure, mo: k.mainOeuvre}; });
    const t1 = await dans(p, function(){ creation('c1').temps.crochet = 900; state.reglages.tauxHoraire = 50; state.reglages.heuresIndirectesMois = 40; var k = coutPiece(piecesDe('c1')[0], creation('c1')); return {h: k.heures, gh: k.gainH, mo: k.mainOeuvre}; });
    R.temps_et_taux_figes = Math.abs(t0.h - t1.h) < 1e-9 && Math.abs(t0.gh - t1.gh) < 1e-6 && Math.abs(t0.mo - t1.mo) < 0.005;
    /* saisir le temps sur la vente garde les matières figées */
    R.saisir_temps_garde_matieres = await dans(p, function(){ var x = piecesDe('c1')[0]; var m0 = x.fige.matieresReelles; var m = matiere(creation('c1').lignes[0].mid); m.prix = (Number(m.prix)||1) * 4; x.fige = refigerTemps(x.fige, creation('c1'), 90); return x.fige.matieresReelles === m0 && x.fige.minutes === 90; });

    /* ── 6. Bornes de période : une vente datée demain n'entre dans aucun total ── */
    R.bornes_fin_aujourdhui = await dans(p, function(){ var per = periodeVentes('mois'); var fin = new Date(); fin.setHours(24,0,0,0); return per.d1 === fin.getTime() && per.d0 === new Date(fin.getFullYear(), fin.getMonth(), 1).getTime(); });

    /* ── 7. Registre des achats : matière supprimée conservée ── */
    R.registre_garde_achats_supprimes = await dans(p, function(){ state.achatsArchives = [{id:'zz', nom:'Fil disparu', unite:'g', mouv:[{t:'entree', q:100, p:7.5, d:Date.now()}]}]; return registreAchats(new Date().getFullYear()).some(function(x){ return /Fil disparu/.test(x.nature) && x.montant === 7.5; }); });

    /* ── 8. Formats de date : jamais « Invalid Date » ── */
    R.dates_sures = await dans(p, function(){ return dateCourte(null) === '—' && dateCourte('n importe quoi') === '—' && dateCourte('2026-03-12') === '12/03/2026' && dateLongue('2026-03-12') === '12 mars 2026' && /^\d{4}-\d{2}-\d{2}$/.test(dateISO()); });

    /* ── 9. Impression : pas de script inline (CSP), bouton branché ── */
    const [fen] = await Promise.all([p.waitForEvent('popup'), dans(p, function(){ state.reglages.raisonSociale = 'Atelier'; imprimerRegistre('Livre des recettes', new Date().getFullYear(), []); })]);
    await fen.waitForTimeout(300);
    R.impression_sans_onclick = await fen.evaluate(()=> !document.querySelector('.barre button').hasAttribute('onclick'));
    await fen.evaluate(()=>{ window.__imprime = 0; window.print = function(){ window.__imprime++; }; });
    await fen.click('.barre button');
    R.impression_bouton_branche = await fen.evaluate(()=> window.__imprime === 1);
    await fen.close();

    /* ── 10. Repli d'image sans onerror inline ── */
    R.repli_image = await p.evaluate(async ()=>{
      const im = document.createElement('img'); im.setAttribute('data-repli', 'carte'); const card = document.createElement('div'); card.className = 'card'; card.appendChild(im); document.body.appendChild(card);
      window.__eval('hydraterPhotos(document.body)'); im.src = 'http://127.0.0.1:8934/inexistante-' + Date.now() + '.png';
      await new Promise(r => setTimeout(r, 800)); const ok = card.hidden; card.remove(); return ok;
    });

    /* ── 11. Accès refusé par le serveur : rien ne part, l'écran d'offres s'affiche, puis reprise ── */
    await p.evaluate(()=>{ localStorage.setItem('__fauxAbonnement', JSON.stringify({statut:'expire', acces:false, admin:false, essai_fin:new Date(Date.now()-864e5).toISOString(), fin:null, offre:null, jours_restants:0, illimite:false, annulation_prevue:false, stripe:false, code_utilise:null})); window.__fauxAccesFerme = true; });
    await dans(p, function(){ state.reglages.note = 'x' + Date.now(); sauverTout(); });
    await p.waitForTimeout(3500);
    const refus = await p.evaluate(()=>({ bloque: !!document.querySelector('.acces-bloque'), err: window.CrochompteSync.etatEnvoi().erreur, attente: window.CrochompteSync.etatEnvoi().enAttente }));
    R.acces_refuse_bloque = refus.bloque && /abonnement est terminé/.test(refus.err || '') && refus.attente;
    await p.evaluate(()=>{ localStorage.setItem('__fauxAbonnement', JSON.stringify({statut:'offert', acces:true, admin:false, essai_fin:null, fin:null, offre:null, jours_restants:null, illimite:true, annulation_prevue:false, stripe:false, code_utilise:null})); window.__fauxAccesFerme = false; });
    await p.evaluate(()=> window.CrochompteSync.relireAbonnement()); await p.waitForTimeout(2500);
    R.acces_rouvert_envoi_repart = await p.evaluate(()=> !document.querySelector('.acces-bloque') && !window.CrochompteSync.etatEnvoi().enAttente);

    /* ── 12. Textes alignés ── */
    await dans(p, function(){ view.cmdVue = commandes()[0].id; aller('commandes', {garderVue:true}); });
    await p.waitForTimeout(300);
    const txtC = await p.locator('#main').textContent();
    R.libelles_articles = /Désignation \(sur la facture\)/.test(txtC) && /Précisions/.test(txtC) && !/demandé en plus/.test(txtC);
    await dans(p, function(){ appliquerProfil('amateur', {sansRendu:true}); var c = commandes()[0]; c.statut = 'livree'; sauverTout(); render(); });
    await p.waitForTimeout(300);
    const txtA = await p.locator('#main').textContent();
    R.frise_amateur_sans_facturee = !/Facturée/.test(txtA) && /Livrée/.test(txtA) && /Désignation(?! \()/.test(txtA);
    await dans(p, function(){ aller('catalogue'); });
    await p.waitForTimeout(300);
    R.catalogue_sans_type = !/Tous les types|types affichés|type affiché/.test(await p.locator('#main').textContent());
    R.categories_unifiees = await dans(p, function(){ return CATS === FAMILLES_MAT && famNomMat('garn') === 'Rembourrage'; });
    R.version_56 = await dans(p, function(){ return VERSION_APP === 'V57' && NOUVEAUTES.some(function(n){ return n.v === 'V56'; }); });
  } catch (e) { errs.push('TEST: ' + e.message); }
  R.pas_d_erreur = errs.length === 0;
  console.log(JSON.stringify(R, null, 1)); console.log('ERREURS JS: ' + (errs.length ? errs.join(' | ') : 'aucune'));
  await b.close();
  process.exit(Object.keys(R).some(k => !R[k]) ? 1 : 0);
})();
