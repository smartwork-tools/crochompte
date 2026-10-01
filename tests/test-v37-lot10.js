/* V37 — lot 10 : défauts trouvés par la contre-vérification finale.
   - corriger le prix d'une vente ne réécrit pas ses coûts figés ;
   - quitter « Vendue » défait la vente (date, chiffres, lien de commande) ;
   - la pièce se relie à la commande la plus urgente ;
   - un aller-retour de statut garde le bilan figé d'une commande ;
   - l'encaissé de l'Atelier ne compte pas une pièce reliée à une commande ;
   - moyenne par poste du chronomètre divisée par les pièces où CE poste est mesuré ;
   - une commande facturée ne redevient pas un devis, et l'annuler depuis
     « Supprimer » passe par l'historique et propose l'avoir ;
   - « Partir d'une fiche vide » ouvre une fiche vide ;
   - jamais « −0,00 € » ; un seul taux de cotisations par défaut ;
   - mémoire pleine : la copie locale n'est pas déclarée « à jour ». */
const {chromium} = require('./outils').playwright;
const path = require('path');
const {graine} = require('./aide.js');
const R = {}; const errs = [];
async function page(b, init){
  const p = await b.newPage({serviceWorkers:'block', viewport:{width:1280, height:900}});
  p.on('pageerror', e=>errs.push(e.message));
  p.on('dialog', d=>d.dismiss());
  if (init) await p.addInitScript(init);
  /* Accès aux fonctions internes de l'application (enfermées dans une
     fonction) : copie servie avec une porte d'évaluation, pour ce test seul. */
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
const lire = p => p.evaluate(()=>window.CrochomptePont.lire());
/* Exécute fn DANS l'application (accès à state, calculer, majCom…). */
const dans = (p, fn) => p.evaluate(code => window.__eval('(' + code + ')()'), fn.toString());

(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  try {
    let p = await page(b);
    await graine(p);
    await p.evaluate(()=>{ const s = window.CrochomptePont.lire(); s.reglages.mode = "complet"; window.CrochomptePont.ecrire(s); });

    /* 1. Prix corrigé : matières, temps et taux horaire figés ne bougent pas */
    const r1 = await dans(p, function(){
      const cr = creation('c1');
      const fg = figerVente(cr, 32, cr.canal, 0);
      /* Six mois plus tard : le fil a doublé, le taux horaire a changé. */
      state.matieres.forEach(m=>{ m.prix = (Number(m.prix)||0) * 2; });
      state.reglages.tauxHoraire = 25;
      const n = reprixVente(fg, cr, 40, cr.canal);
      const attenduReste = cts(40 - (fg.matieres + fg.fixe + fg.fraisFixesVente + cts(40*fg.pctVente) + cts(40*fg.tauxCotis)));
      return {mat: n.matieres === fg.matieres, taux: n.tauxHoraire === fg.tauxHoraire, min: n.minutes === fg.minutes,
              prix: n.prix === 40, reste: Math.abs(n.reste - attenduReste) < 1e-9,
              gain: Math.abs(n.gainHoraire - n.reste / fg.heures) < 1e-9};
    });
    R.prix_corrige_garde_couts_figes = r1.mat && r1.taux && r1.min && r1.prix;
    R.prix_corrige_reste_juste = r1.reste && r1.gain;
    await p.reload(); await p.waitForTimeout(800);

    /* 2. Quitter « Vendue » : date, chiffres et lien de commande défaits */
    const r2 = await dans(p, function(){
      state.commandes = state.commandes || [];
      const cA = nouvelleCommande(); cA.cid = 'c1'; cA.statut = 'acceptee'; cA.datePromise = '2099-12-01'; cA.dateCommande = '2026-01-01T00:00:00Z';
      const cB = nouvelleCommande(); cB.cid = 'c1'; cB.statut = 'acceptee'; cB.datePromise = '2099-06-01'; cB.dateCommande = '2026-02-01T00:00:00Z';
      const p = {id:'pz', cid:'c1', prod:'termine', com:'commande', prix:null, mesure:{}, sessions:[], cree:Date.now(), maj:Date.now()};
      state.pieces.push(p);
      majCom(p, 'vendu');
      const lieeB = p.cmdId === cB.id;           /* échéance la plus proche */
      majCom(p, 'stock');
      const defait = !p.venduLe && !p.fige && !p.cmdId && !cB.pieceId &&
                     (cB.journal || []).some(x=>/détachée/.test(x.txt));
      return {lieeB, defait};
    });
    R.piece_reliee_commande_la_plus_urgente = r2.lieeB;
    R.quitter_vendue_defait_la_vente = r2.defait;

    /* 3. Aller-retour de statut : le bilan figé d'une commande livrée reste */
    const r3 = await dans(p, function(){
      const c = nouvelleCommande(); c.cid = 'c2'; c.prixConvenu = 50; c.statut = 'acceptee'; c.brouillon = false;
      view.cmdVue = c.id; aller('commandes'); render();
      const sel = document.querySelector('[data-c="statut"]');
      sel.value = 'livree'; sel.dispatchEvent(new Event('change', {bubbles:true}));
      const c1 = commande(c.id); const le1 = c1.bilanFige && c1.bilanFige.le;
      /* Le taux horaire change ensuite ; on repasse en « Terminée » puis « Livrée ». */
      state.reglages.tauxHoraire = 40;
      let s2 = document.querySelector('[data-c="statut"]'); s2.value = 'terminee'; s2.dispatchEvent(new Event('change', {bubbles:true}));
      let s3 = document.querySelector('[data-c="statut"]'); s3.value = 'livree'; s3.dispatchEvent(new Event('change', {bubbles:true}));
      const c2 = commande(c.id);
      return {garde: !!le1 && c2.bilanFige && c2.bilanFige.le === le1 && c2.bilanFige.tauxHoraire !== 40};
    });
    R.aller_retour_statut_garde_bilan = !!r3.garde;

    /* 4. Encaissé de l'Atelier : la pièce reliée n'est comptée qu'une fois (dans la commande) */
    const r4 = await dans(p, function(){
      state.pieces = [
        {id:'q1', cid:'c3', prod:'termine', com:'vendu', prix:35, venduLe:Date.now(), mesure:{}, sessions:[], cree:Date.now(), maj:Date.now()},
        {id:'q2', cid:'c3', prod:'termine', com:'vendu', prix:35, venduLe:Date.now(), mesure:{}, sessions:[], cree:Date.now(), maj:Date.now()}];
      const c = nouvelleCommande(); c.cid = 'c3'; c.statut = 'livree'; c.pieceId = 'q2'; state.pieces[1].cmdId = c.id;
      return {atelier: statsPieces().ca, fiche: bilanCreation('c3').ca};
    });
    R.encaisse_atelier_sans_piece_reliee = r4.atelier === 35 && r4.fiche === 35;

    /* 5. Chronomètre : moyenne d'un poste mesuré sur une pièce sur deux */
    const r5 = await dans(p, function(){
      state.pieces = [
        {id:'t1', cid:'c1', prod:'termine', com:'stock', prix:null, mesure:{crochet:100, assemb:30}, sessions:[], cree:Date.now(), maj:Date.now()},
        {id:'t2', cid:'c1', prod:'termine', com:'stock', prix:null, mesure:{crochet:120}, sessions:[], cree:Date.now(), maj:Date.now()}];
      const bt = bilanTemps('c1');
      return bt && bt.moyPoste ? {cro: bt.moyPoste.crochet, ass: bt.moyPoste.assemb} : null;
    });
    R.moyenne_par_poste_juste = !!r5 && r5.cro === 110 && r5.ass === 30;

    /* 6. Commande facturée : pas de retour en devis ; annulation tracée + avoir proposé */
    const r6 = await dans(p, function(){
      const c = nouvelleCommande(); c.cid = 'c1'; c.statut = 'livree'; c.brouillon = false; c.prixConvenu = 40;
      c.client = {nom:'Claire', contact:'', note:''};
      c.factureNum = 'TEST-2026-0001'; c.factureLe = '2026-09-27';
      c.facture = {num:'TEST-2026-0001', type:'facture'};
      view.cmdVue = c.id; aller('commandes'); render();
      const opt = document.querySelector('[data-c="statut"] option[value="devis"]');
      return {id: c.id, devisBloque: !!opt && opt.disabled, active: factureActive(c)};
    });
    R.facturee_pas_de_retour_en_devis = r6.devisBloque || !r6.active;
    if (r6.active){
      await p.getByRole('button', {name:'Supprimer cette commande'}).click(); await p.waitForTimeout(200);
      await p.click('.dlg [data-oui]'); await p.waitForTimeout(400);
      const c6 = (await lire(p)).commandes.find(c=>c.id===r6.id);
      const dlg6 = (await p.locator('.dlg').count()) ? await p.textContent('.dlg') : '';
      R.annulation_depuis_supprimer_tracee = c6.statut === 'annulee' && (c6.journal||[]).some(x=>/Annulée/.test(x.txt));
      R.annulation_depuis_supprimer_propose_avoir = /avoir/i.test(dlg6);
      if (dlg6) await p.click('.dlg [data-non]').catch(()=>{});
    } else {
      R.annulation_depuis_supprimer_tracee = 'facture de test non reconnue comme active';
    }

    /* 7. « Partir d'une fiche vide » : aucune matière, aucun temps */
    const r7 = await dans(p, function(){
      state.creations = []; view.draft = null; aller('creations'); render();
      const bt = [...document.querySelectorAll('#main button')].find(x=>x.textContent.trim() === "Partir d'une création vide");
      if (!bt) return null;
      bt.click();
      const d = view.draft; let t = 0; for (const k in d.temps) t += Number(d.temps[k])||0;
      return {lignes: d.lignes.length, temps: t};
    });
    R.fiche_vide_est_vide = !!r7 && r7.lignes === 0 && r7.temps === 0;

    /* 7b. Changement de personne sur l'appareil : la photo pas encore
       envoyée de la précédente n'est pas effacée ; une photo déjà en ligne l'est. */
    const r7b = await dans(p, async function(){
      const pont = window.CrochomptePont;
      const uidA = 'uid-A-' + Date.now();
      pont.ouvrirCompte(uidA);
      const blob = new Blob(['x'], {type:'image/jpeg'});
      await ecrirePhoto('ph_pas_envoyee', blob); await ecrirePhoto('ph_envoyee', blob);
      state.pieces.push({id:'pp1', cid:'c1', prod:'termine', com:'stock', photo:'ph_pas_envoyee', mesure:{}, sessions:[]}, {id:'pp2', cid:'c1', prod:'termine', com:'stock', photo:'ph_envoyee', mesure:{}, sessions:[]});
      localStorage.setItem('crochompte-v1.photosEnvoyees', JSON.stringify({uid: uidA, ids: {ph_envoyee: 1}}));
      pont.ouvrirCompte('uid-B');
      await new Promise(r=>setTimeout(r, 300));
      const a = await lirePhoto('ph_pas_envoyee'), b = await lirePhoto('ph_envoyee');
      return {gardee: !!a, effacee: !b};
    });
    R.photo_non_envoyee_gardee = r7b.gardee;
    R.photo_envoyee_effacee = r7b.effacee;
    await p.reload(); await p.waitForTimeout(800); await graine(p);

    /* 8. Affichage et réglages par défaut */
    R.jamais_moins_zero = await dans(p, function(){ return eur(-0.001) === eur(0) && eur(-0.004).indexOf('−') === -1; });
    R.cotisations_defaut_unique = await dans(p, function(){ return etatInitial().reglages.cotisations === STATUTS.find(x=>x.id==='marchandises').taux; });
    await p.close();

    /* 9. Mémoire pleine : la base notée localement est effacée */
    p = await page(b);
    await graine(p);
    await p.evaluate(()=>window.CrochompteSync.signaler());
    await p.waitForTimeout(4000);   /* premier envoi : la base est notée */
    const r9 = await p.evaluate(async ()=>{
      const cleBase = localStorage.getItem('crochompte-v1.versionConnue') !== null ? 'crochompte-v1.versionConnue' : null;
      const avant = cleBase ? JSON.parse(localStorage.getItem(cleBase)).maj : null;
      const orig = Storage.prototype.setItem;
      Storage.prototype.setItem = function(k, v){ if (k === window.CrochomptePont.cle) throw new DOMException('plein', 'QuotaExceededError'); return orig.call(this, k, v); };
      const s = window.CrochomptePont.lire(); s.creations[0].nom = 'Lapin mémoire pleine'; window.CrochomptePont.ecrire(s);
      const ok = window.CrochomptePont.memoireOk();
      window.CrochompteSync && window.CrochompteSync.signaler && window.CrochompteSync.signaler();
      await new Promise(r=>setTimeout(r, 4000));
      const apres = cleBase ? JSON.parse(localStorage.getItem(cleBase)).maj : 'pas de cle';
      Storage.prototype.setItem = orig;
      return {cleBase: !!cleBase, avant, ok, apres};
    });
    R.memoire_pleine_detectee = r9.ok === false;
    R.memoire_pleine_base_non_notee = r9.cleBase && !!r9.avant && r9.apres === null;
    if (!R.memoire_pleine_base_non_notee) R._diag9 = JSON.stringify(r9);
    await p.close();
  } catch (e) { R._echec = String(e && e.stack || e); }
  console.log(JSON.stringify(R, null, 1));
  console.log("ERREURS JS: " + (errs.length ? errs.join(" | ") : "aucune"));
  await b.close();
})();
