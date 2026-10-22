/* V66 — atelier de démonstration (crochompte.com/?demo) :
   un atelier pro rempli et cohérent, isolé du vrai atelier, sans compte ni
   réseau, avec bandeau, « Recommencer » et « Quitter ». */
const {chromium} = require('./outils').playwright;
const path = require('path'); const fs = require('fs');
const R = {}; const errs = [];
(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  try {
    const ctx = await b.newContext({serviceWorkers:'block', viewport:{width:1440, height:900}});
    const p = await ctx.newPage();
    p.on('pageerror', e=>errs.push(e.message));
    p.on('dialog', d=>d.dismiss());
    const externes = [];
    p.on('request', r=>{ if (!/^http:\/\/127\.0\.0\.1/.test(r.url()) && !/^data:|^blob:/.test(r.url())) externes.push(r.url()); });
    const appEval = async r=>{
      const src = fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
      const i = src.lastIndexOf('})();');
      await r.fulfill({contentType:'text/javascript; charset=utf-8', body: src.slice(0,i) + 'window.__eval = function(c){ return eval(c); };\n' + src.slice(i)});
    };
    await p.route('**/app.js*', appEval);
    /* Le faux serveur : s'il était appelé en démo, on le verrait. */
    await p.route('**/vendor/supabase/**', r=>r.fulfill({path:path.join(__dirname,'faux-supabase-persistant.js'),contentType:'application/javascript'}));

    /* 0. Un VRAI atelier existe déjà dans ce navigateur */
    await p.goto('http://127.0.0.1:8934/index.html'); await p.waitForTimeout(400);
    await p.evaluate(()=>{ localStorage.setItem('crochompte-v1', JSON.stringify({reglages:{tauxHoraire:99}, matieres:[], creations:[{id:'vrai', nom:'Mon vrai bonnet'}], pieces:[], commandes:[], canaux:[], marqueVraie:true})); });
    const vraiAvant = await p.evaluate(()=>localStorage.getItem('crochompte-v1'));

    /* 1. Ouverture de la démo : directement dans l'atelier, sans portail ni question */
    await p.goto('http://127.0.0.1:8934/index.html?demo'); await p.waitForTimeout(1500);
    R.demo_active = await p.evaluate(()=>window.__eval('DEMO === true && KEY === "crochompte-demo-v1"'));
    R.pas_de_portail = (await p.locator('#portail-sans-compte').count()) === 0;
    R.pas_de_question_profil = !/Tu crochètes en amateur ou en pro/.test(await p.locator('#main').innerText());
    R.aucune_fenetre_ouverte = (await p.locator('.dlg-fond').count()) === 0;
    R.bandeau_visible = /Atelier de démonstration/.test(await p.locator('.bandeau-demo').innerText());
    R.profil_pro = await p.evaluate(()=>window.__eval('estPro() && state.reglages.statut === "marchandises"'));

    /* 2. Contenu cohérent */
    const c = await p.evaluate(()=>window.__eval('(' + function(){
      var cmds = commandes();
      var statuts = {}; cmds.forEach(function(x){ statuts[x.statut] = true; });
      return {
        creations: state.creations.length,
        vendues: state.pieces.filter(function(x){ return x.com === 'vendu'; }).length,
        enStock: state.pieces.filter(pieceLibre).length,
        enCours: state.pieces.filter(function(x){ return x.prod === 'encours'; }).length,
        statuts: Object.keys(statuts).sort().join(','),
        aFacturer: cmds.filter(function(x){ return x.statut === 'livree' && !x.factureNum; }).length,
        retard: cmds.some(function(x){ return x.statut === 'encours' && joursRestants(x) < 0; }),
        acomptes: cmds.filter(function(x){ return Number(x.versement && x.versement.montant) > 0; }).length,
        negatifs: state.matieres.filter(function(m){ return (Number(m.stock)||0) < -1e-9; }).length,
        lotsCoton: lotsDe(matiere('coton_dk')).length,
        patron: patrons().length === 1 && !!creation('cr_lapin').patron,
        fournisseurs: fournisseurs().length,
        marche: (state.marches || []).length === 1,
        incoherences: typeof incoherences === 'function' ? incoherences().length : 0,
        ventesMois: lignesVentes(periodeVentes('mois')).length,
        ventesJour: lignesVentes(periodeVentes('jour')).length
      };
    }.toString() + ')()'));
    R.contenu = c;
    R.contenu_complet = c.creations === 6 && c.vendues >= 16 && c.enStock > 0 && c.enCours >= 1 &&
      c.statuts === 'acceptee,annulee,devis,encours,livree,terminee' && c.aFacturer === 2 && c.retard &&
      c.acomptes >= 5 && c.negatifs === 0 && c.lotsCoton === 2 && c.patron && c.fournisseurs === 2 && c.marche &&
      c.incoherences === 0 && c.ventesMois >= 1 && c.ventesJour >= 1;

    /* 3. Tous les écrans s'ouvrent sans erreur, avec des données (pas d'état vide) */
    const vides = [];
    for (const [id, code] of [['accueil','aller("accueil")'], ['creations','aller("creations")'], ['commandes','view.cmdVue=null; aller("commandes")'],
                              ['ventes','view.ventesPeriode="mois"; aller("ventes")'], ['stock','view.sub="matieres"; aller("stock")'],
                              ['historique','view.sub="stock"; aller("stock")'], ['fournisseurs','view.sub="fournisseurs"; aller("stock")'],
                              ['indicateurs','view.indPer="mois"; aller("indicateurs")'], ['patrons','aller("patrons")']]){
      await p.evaluate(x=>window.__eval('(function(){ ' + x + ' })()'), code); await p.waitForTimeout(350);
      const t = await p.locator('#main').innerText();
      if (/Aucune commande pour l'instant|Pas encore de matière à toi|Tes indicateurs se remplissent tout seuls|Aucune vente sur cette période|n'as pas encore de patron/.test(t)) vides.push(id);
    }
    if (vides.length) console.log('Écrans vides :', vides.join(', '));
    R.aucun_ecran_vide = vides.length === 0;
    R.releve_mensuel_present = await p.evaluate(()=>window.__eval('(function(){ aller("indicateurs"); return /Relevé mensuel/.test(document.getElementById("main").innerText); })()'));

    /* 4. La facture se fait en démonstration (numérotation locale) */
    const fac = await p.evaluate(()=>window.__eval('(' + function(){
      var c = commandes().filter(function(x){ return x.statut === 'livree' && !x.factureNum; })[0];
      return {manques: manquesFacture(c).map(function(x){ return x.t; }), numerotation: numerotationPossible()};
    }.toString() + ')()'));
    R.facture_possible = fac.manques.length === 0 && fac.numerotation === true;

    /* 5. Isolation : le vrai atelier n'a pas bougé, rien n'est parti en ligne */
    await p.evaluate(()=>window.__eval('(function(){ var c = state.creations[0]; c.prix = 77; sauverTout(); })()'));
    R.vrai_atelier_intact = (await p.evaluate(()=>localStorage.getItem('crochompte-v1'))) === vraiAvant;
    R.demo_enregistree_a_part = await p.evaluate(()=>{ try{ return JSON.parse(localStorage.getItem('crochompte-demo-v1')).creations[0].prix === 77; }catch(e){ return false; } });
    if (externes.length) console.log('Appels externes :', externes.slice(0, 3).join(' | '));
    R.aucun_appel_externe = externes.length === 0;
    R.module_comptes_eteint = await p.evaluate(()=>!(window.CrochompteSync && window.CrochompteSync.connecte));

    /* 6. Actualiser garde la démo et ses modifications */
    await p.reload(); await p.waitForTimeout(1200);
    R.f5_garde_la_demo = await p.evaluate(()=>window.__eval('DEMO && state.creations[0].prix === 77'));

    /* 7. Recommencer la démo : état de départ ; vrai atelier toujours intact */
    await p.locator('.bandeau-demo button', {hasText:'Recommencer la démo'}).click(); await p.waitForTimeout(300);
    await p.locator('.dlg [data-oui]').click(); await p.waitForTimeout(600);
    R.recommencer_remet_a_zero = await p.evaluate(()=>window.__eval('state.creations[0].prix !== 77 && state.creations.length === 6'));
    R.vrai_atelier_toujours_intact = (await p.evaluate(()=>localStorage.getItem('crochompte-v1'))) === vraiAvant;

    /* 8. Quitter la démo : retour au vrai site, vrai atelier */
    await p.locator('.bandeau-demo button', {hasText:'Quitter la démo'}).click(); await p.waitForTimeout(1200);
    R.quitter_sans_demo = !/demo/.test(p.url());
    R.quitter_vrai_atelier = await p.evaluate(()=>window.__eval('DEMO === false && KEY === "crochompte-v1"'));

    /* 9. Téléphone : pas de débordement avec le bandeau */
    const pm = await ctx.newPage();
    await pm.route('**/app.js*', appEval);
    await pm.setViewportSize({width:390, height:844});
    await pm.goto('http://127.0.0.1:8934/index.html?demo'); await pm.waitForTimeout(1200);
    R.mobile_sans_debordement = await pm.evaluate(()=>document.documentElement.scrollWidth - innerWidth <= 1);
    R.mobile_bandeau = await pm.locator('.bandeau-demo').isVisible();
    await pm.close();

    /* 10. En anglais : le bandeau est traduit */
    const pe = await ctx.newPage();
    await pe.route('**/app.js*', appEval);
    await pe.goto('http://127.0.0.1:8934/index.html?demo'); await pe.waitForTimeout(500);
    await pe.evaluate(()=>localStorage.setItem('crochompte-langue', 'en'));
    await pe.reload(); await pe.waitForTimeout(1500);
    R.bandeau_anglais = /Demo workshop/.test(await pe.locator('.bandeau-demo').innerText());
    await pe.evaluate(()=>localStorage.setItem('crochompte-langue', 'fr'));
    await pe.close();
    await ctx.close();
  } catch(e){ console.log('Error:', e.message); }
  console.log(JSON.stringify(R, null, 2));
  console.log('ERREURS JS: ' + (errs.length ? errs.join(' | ') : 'aucune'));
  await b.close();
})();
