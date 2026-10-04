/* V55 — reconnexion sans question de profil, abonnement (essai, blocage,
   code cadeau, administration), essai sans compte, vente d'une pièce en
   cours, gain figé, messages, pluriels, facture exigeant un statut. */
const {chromium} = require('./outils').playwright;
const path = require('path');
const {graine} = require('./aide.js');
const R = {}; const errs = [];
async function page(b, opts){
  opts = opts || {};
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
  if (opts.avant) await p.addInitScript(opts.avant);
  await p.goto('http://127.0.0.1:8934/index.html'); await p.waitForTimeout(500);
  if (!opts.sansConnexion && await p.locator('#sy-c-identifiant').count()){
    await p.fill('#sy-c-identifiant','LaineTest'); await p.fill('#sy-c-mdp','motdepasse123');
    await p.click('#sy-c-valider'); await p.waitForTimeout(1200);
  }
  return p;
}
const dans = (p, fn) => p.evaluate(code => window.__eval('(' + code + ')()'), fn.toString());
async function seConnecter(p){
  await p.fill('#sy-c-identifiant','LaineTest'); await p.fill('#sy-c-mdp','motdepasse123');
  await p.click('#sy-c-valider'); await p.waitForTimeout(1500);
}
(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  try {
    /* ── 1. Reconnexion : l'atelier en ligne revient, pas la question de profil ── */
    const p = await page(b);
    await graine(p);
    await dans(p, function(){ appliquerProfil('amateur', {sansRendu:true}); sauverTout(); });
    await p.waitForTimeout(3200);   /* envoi automatique (2,5 s) */
    R.atelier_envoye = await p.evaluate(()=> !!(window.__serveur && window.__serveur.atelier && window.__serveur.atelier.donnees.creations.length === 3));
    R.essai_bandeau = /Essai gratuit.*encore 14 jours/.test(await p.locator('#main').textContent());
    await p.click('#entete-deconnexion'); await p.waitForTimeout(300);
    R.deconnexion_confirmee = /Fermer ta session/.test(await p.locator('.dlg').textContent());
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(1200);
    R.portail_apres_deconnexion = await p.locator('#sy-c-identifiant').count() === 1;
    R.base_connue_oubliee = await p.evaluate(()=> localStorage.getItem('crochompte-v1.versionConnue') === null);
    await seConnecter(p);
    const txt1 = await p.locator('#main').textContent();
    R.atelier_recupere_a_la_reconnexion = /Lapin Céleste|Pour bien démarrer|Bonjour/.test(txt1) && await dans(p, function(){ return state.creations.length === 3 && state.reglages.profilType === 'amateur'; });
    R.pas_de_question_profil = !/Tu crochètes en amateur ou en pro/.test(txt1);
    R.pas_de_recuperation_bloquee = !/Récupération de ton atelier/.test(txt1);

    /* ── 2. Réglage fait avant réception : conservé ── */
    R.fusion_reglages = await p.evaluate(async ()=>{
      /* local vierge avec profil pro, serveur sans profil : le profil doit survivre à la réception */
      const srv = window.__serveur.atelier.donnees; delete srv.reglages.profilType;
      localStorage.setItem('__fauxServeur', JSON.stringify(window.__serveur));
      localStorage.removeItem('crochompte-v1.aEnvoyer');
      const local = window.CrochomptePont.lire();
      const vide = JSON.parse(JSON.stringify(local)); vide.creations = []; vide.pieces = []; vide.commandes = []; vide.patrons = [];
      vide.reglages.profilType = 'pro'; vide.reglages.tauxHoraire = 23;
      window.CrochomptePont.ecrire(vide);
      localStorage.removeItem('crochompte-v1.versionConnue');
      return true;
    });
    await p.reload(); await p.waitForTimeout(1800);
    /* le profil (absent en ligne) est repris ; le taux horaire déjà réglé en ligne (15) garde la main */
    R.fusion_reglages = await dans(p, function(){ return state.creations.length === 3 && state.reglages.profilType === 'pro' && Number(state.reglages.tauxHoraire) === 15; });
    await p.waitForTimeout(3000);
    R.fusion_renvoyee = await p.evaluate(()=> window.__serveur.atelier.donnees.reglages.profilType === 'pro');

    /* ── 3. Essai terminé : écran des offres, puis code cadeau ── */
    await p.evaluate(()=>{ localStorage.setItem('__fauxAbonnement', JSON.stringify({statut:'expire', acces:false, admin:false, essai_fin:new Date(Date.now()-864e5).toISOString(), fin:null, offre:null, jours_restants:0, illimite:false, annulation_prevue:false, stripe:false, code_utilise:null})); });
    await p.reload(); await p.waitForTimeout(1800);
    const txtB = await p.locator('#main').textContent();
    R.acces_bloque_ecran = /Ton essai gratuit est terminé/.test(txtB) && /7,90 €/.test(txtB) && /42,00 €|42 €/.test(txtB) && /75,00 €|75 €/.test(txtB);
    R.acces_bloque_nav_cachee = await p.evaluate(()=> getComputedStyle(document.getElementById('nav')).display === 'none');
    R.acces_bloque_donnees_ouvertes = await dans(p, function(){ view.regSection = 'donnees'; aller('reglages'); return /Télécharger ma sauvegarde/.test(document.getElementById('main').textContent); });
    await dans(p, function(){ aller('accueil'); });
    await p.fill('#abo-code', 'crochet-zzzz-zzzz'); await p.click('button:has-text("Utiliser ce code")'); await p.waitForTimeout(400);
    R.code_inconnu_message = /n'existe pas/.test(await p.locator('#abo-code-msg').textContent());
    await p.fill('#abo-code', 'crochet-test-ok12'); await p.click('button:has-text("Utiliser ce code")'); await p.waitForTimeout(600);
    const txtC = await p.locator('#main').textContent();
    R.code_accepte_acces_rendu = !/Ton essai gratuit est terminé/.test(txtC) && await p.evaluate(()=> getComputedStyle(document.getElementById('nav')).display !== 'none');
    R.code_normalise_envoye = await p.evaluate(()=> window.__dernierCode === 'CROCHETTESTOK12');
    await dans(p, function(){ view.regSection = 'abonnement'; aller('reglages'); });
    await p.waitForTimeout(200);
    R.reglages_mon_abonnement = /Accès offert/.test(await p.locator('#main').textContent());

    /* ── 4. Administration ── */
    await p.evaluate(()=>{ localStorage.setItem('__fauxAbonnement', JSON.stringify({statut:'offert', acces:true, admin:true, essai_fin:null, fin:null, offre:null, jours_restants:null, illimite:true, annulation_prevue:false, stripe:false, code_utilise:null})); });
    await p.reload(); await p.waitForTimeout(1800);
    R.pas_de_bandeau_admin = !/Essai gratuit/.test(await p.locator('#main').textContent());
    await dans(p, function(){ view.regSection = 'administration'; aller('reglages'); });
    await p.waitForTimeout(600);
    const txtA = await p.locator('#main').textContent();
    R.admin_section = /Vue d'ensemble/.test(txtA) && /Codes cadeaux/.test(txtA) && /bea@x.fr/.test(txtA) && /Comptes/.test(txtA);
    await p.selectOption('#adm-duree', 'illimite'); await p.fill('#adm-note', 'Pour ma femme');
    await p.click('button:has-text("Créer le code")'); await p.waitForTimeout(500);
    R.admin_code_cree = /CROCHET-AB12-CD34/.test(await p.locator('#adm-codes').textContent()) && /illimité/.test(await p.locator('#adm-codes').textContent());
    await p.fill('#adm-mail', 'bea@x.fr'); await p.click('button:has-text("Offrir")'); await p.waitForTimeout(300);
    R.admin_offrir = await p.evaluate(()=> window.__dernierOffert && window.__dernierOffert.p_email === 'bea@x.fr' && window.__dernierOffert.p_jours === 30);
    await p.evaluate(()=>{ window.__fauxAbonnement = null; localStorage.removeItem('__fauxAbonnement'); });

    /* ── 5. Vendre une pièce en fabrication : pas de doublon, temps gardé, gain figé ── */
    await p.reload(); await p.waitForTimeout(1500);
    await dans(p, function(){ appliquerProfil('pro', {sansRendu:true}); state.reglages.statut = 'marchandises'; state.reglages.cotisations = 12.4; state.pieces = []; state.commandes = [];
      ajouterPieces('c1', 1, 'encours'); var p1 = piecesDe('c1')[0]; p1.mesure = {prep:5, crochet:120, assemb:0, finition:0, emball:0}; sauverTout(); aller('creations'); });
    await p.waitForTimeout(300);
    await dans(p, function(){ dialogueVente('c1'); });
    await p.waitForTimeout(300);
    R.vente_propose_piece_en_cours = await p.evaluate(()=> !document.getElementById('vt-piece-w').hidden && /En cours/.test(document.getElementById('vt-piece').textContent) && /2 h 05/.test(document.getElementById('vt-piece').textContent) && /N° 1/.test(document.getElementById('vt-piece').textContent));
    await p.fill('#vt-prix', '40'); await p.click('.dlg [data-oui], .dlg button.primary'); await p.waitForTimeout(400);
    const v = await dans(p, function(){ var l = piecesDe('c1'); var k = coutPiece(l[0], creation('c1')); return {n: l.length, com: l[0].com, prod: l[0].prod, min: k.minutes, gain: k.gain, mat: k.matieres}; });
    R.vente_sans_doublon = v.n === 1 && v.com === 'vendu' && v.prod === 'termine' && v.min >= 125;   /* 125 min mesurées + postes non chronométrés pris à la fiche */
    const apres = await dans(p, function(){ var m = matiere(creation('c1').lignes[0].mid); m.prix = (Number(m.prix) || 1) * 3; var k = coutPiece(piecesDe('c1')[0], creation('c1')); return {gain: k.gain, mat: k.matieres}; });
    R.gain_fige_apres_changement_de_prix = Math.abs(apres.gain - v.gain) < 0.005 && Math.abs(apres.mat - v.mat) < 0.005;
    /* une commande attend la création : le dialogue propose de relier */
    await dans(p, function(){ var c = nouvelleCommande(); c.client = {nom:'Zoé'}; c.cid = 'c2'; c.prixConvenu = 28; c.statut = 'encours'; delete c.brouillon; sauverTout(); dialogueVente('c2'); });
    await p.waitForTimeout(300);
    R.vente_propose_commande = await p.evaluate(()=> !document.getElementById('vt-cmd-w').hidden && /Zoé/.test(document.getElementById('vt-cmd').textContent));
    await p.selectOption('#vt-cmd', {index:1}); await p.fill('#vt-prix', '28');
    await p.check('#vt-faite');   /* V60 : aucune pièce en stock, on dit qu'elle a été faite */
    await p.click('.dlg [data-oui], .dlg button.primary'); await p.waitForTimeout(400);
    R.vente_reliee_commande = await dans(p, function(){ var l = piecesDe('c2'); return l.length === 1 && !!l[0].cmdId && !!commandeLiee(l[0]) && lignesVentes({d0:0, d1:Date.now()+864e5}).filter(function(x){ return x.type === 'piece'; }).length === 1; });

    /* ── 6. Facture : statut déclaré exigé, livraison exigée ── */
    R.facture_exige_statut = await dans(p, function(){ var c = commandes()[0]; state.reglages.statut = ''; var m1 = manquesFacture(c).map(function(x){ return x.t; }).join(' ');
      state.reglages.statut = 'marchandises'; state.reglages.siret = '12345678900012'; state.reglages.raisonSociale = 'Atelier'; state.reglages.adresse = '1 rue'; var m2 = manquesFacture(c).map(function(x){ return x.t; }).join(' ');
      c.statut = 'livree'; c.livreeLe = aujourdhuiISO(); var m3 = manquesFacture(c);
      return /activité déclarée/.test(m1) && /livraison/.test(m2) && !/activité déclarée|livraison/.test(m3.map(function(x){ return x.t; }).join(' ')); });

    /* ── 7. Messages : deux au plus, effacés au changement d'onglet ── */
    R.toasts_deux_max = await dans(p, function(){ toast('a'); toast('b'); toast('c'); return document.querySelectorAll('#toasts .toast').length === 2; });
    R.toasts_effaces_onglet = await dans(p, function(){ aller('accueil'); return document.querySelectorAll('#toasts .toast').length === 0; });

    /* ── 8. Pluriels, textes, statut pro proposé ── */
    R.pluriels_unites = await dans(p, function(){ return qte(2, 'pièce') === '2 pièces' && qte(50, 'g') === '50 g' && qte(1, 'pelote') === '1 pelote' && qte(20, 'utilisation') === '20 utilisations' && qte(1.5, 'm') === '1,5 m'; });
    R.stock_negatif_silencieux_sans_suivi = await dans(p, function(){ state.matieres.forEach(function(m){ m.mouv = []; m.stock = 0; (m.variantes||[]).forEach(function(v){ v.stock = 0; }); }); return !suitLeStock(); });
    await dans(p, function(){ state.reglages.statut = ''; appliquerProfil('amateur', {sansRendu:true}); dialogueProfil({premiere:true}); });
    await p.waitForTimeout(200);
    await p.click('.dlg .profil-carte[data-p="pro"]'); await p.click('.dlg [data-oui]'); await p.waitForTimeout(300);
    R.statut_demande_apres_pro = /quel taux de cotisations/.test(await p.locator('.dlg').textContent());
    await p.click('.dlg .profil-carte[data-p="marchandises"]'); await p.click('.dlg [data-oui]'); await p.waitForTimeout(300);
    R.statut_applique = await dans(p, function(){ return state.reglages.statut === 'marchandises' && Number(state.reglages.cotisations) === 12.4; });
    R.vocabulaire_modele = await dans(p, function(){ view.catMode = 'types'; aller('catalogue'); return /Catalogue des modèles/.test(document.getElementById('main').textContent) && !/type d'ouvrage/.test(document.getElementById('main').textContent); });
    await p.close();

    /* ── 9. Essai sans compte ── */
    const p2 = await page(b, {sansConnexion:true});
    R.portail_essayer_sans_compte = await p2.locator('#portail-sans-compte').count() === 1;
    await p2.click('#portail-sans-compte'); await p2.waitForTimeout(500);
    const txtS = await p2.locator('#main').textContent();
    R.sans_compte_ouvert = /Essai sans compte/.test(txtS) && await p2.locator('#entete-creer-compte').count() === 1 && await p2.locator('#sy-c-identifiant').count() === 0;
    await p2.evaluate(()=>{ localStorage.setItem('crochompte-v1.sansCompte', JSON.stringify({depuis: Date.now() - 20 * 864e5})); });
    await p2.reload(); await p2.waitForTimeout(800);
    R.sans_compte_portail_fin = /essai sans compte est terminé/.test(await p2.locator('#main').textContent()) && await p2.locator('#portail-sans-compte').count() === 0;
    await p2.close();
  } catch (e) { R.exception = String(e && e.stack || e); }
  R.erreurs = errs;
  console.log(JSON.stringify(R, null, 1));
  console.log('ERREURS JS: ' + (errs.length ? errs.join(' | ') : 'aucune'));
  await b.close();
})();
