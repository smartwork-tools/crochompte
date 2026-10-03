/* V58 — charpente (menu latéral, barre d'onglets), ambiances, accueil et
   salutation, affichages cartes / liste / compacte, documents PDF (devis,
   bon de commande, bon de livraison, relevé), correction des mouvements. */
const {chromium} = require('./outils').playwright;
const path = require('path'); const fs = require('fs');
const {graine} = require('./aide.js');
const R = {}; const errs = [];
async function page(b, w){
  const p = await b.newPage({serviceWorkers:'block', viewport:{width:w || 1440, height:900}});
  p.on('pageerror', e=>errs.push(e.message));
  p.on('dialog', d=>d.dismiss());
  await p.route('**/app.js*', async r=>{
    const src = fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
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
const txt = async (p, sel) => (await p.locator(sel).first().textContent()).replace(/ | /g, ' ');
(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  try {
    const p = await page(b);
    await graine(p);
    await dans(p, function(){
      appliquerProfil('pro', {sansRendu:true}); var r = state.reglages; r.confirmeLe = Date.now(); r.tauxHoraire = 12; r.mode = 'complet';
      r.statut = 'micro'; r.raisonSociale = 'Laine & Lune'; r.adresse = '12 rue des Tisserands, 69004 Lyon'; r.siret = '912 345 678 00019';
      var t = Date.now();
      state.pieces = [{id:'h1', cid:'c1', prod:'encours', com:'atelier', prix:32, mesure:{crochet:70}, sessions:[], cree:t-2e6, maj:t},
                      {id:'h2', cid:'c2', prod:'termine', com:'atelier', prix:28, mesure:{crochet:150}, sessions:[], cree:t-3e6, maj:t, termineLe:t, sortie:true}];
      var c = nouvelleCommande(); c.client = {nom:'Zoé Marchand', contact:'06 12 34 56 78'}; c.cid = 'c1'; c.qte = 2; c.prixConvenu = 32; c.statut = 'terminee'; c.accordLe = t - 5*864e5;
      c.datePromise = new Date(t + 5*864e5).toISOString().slice(0,10); c.versement = {montant:20, date:null, type:'acompte'}; c.fraisLivraison = 6.5; delete c.brouillon; window.__cid = c.id;
      var c2 = nouvelleCommande(); c2.client = {nom:'Inès Garnier'}; c2.cid = 'c3'; c2.prixConvenu = 35; c2.statut = 'devis'; delete c2.brouillon; window.__cid2 = c2.id;
      sauverTout(); aller('accueil');
    });
    await p.waitForTimeout(500);

    /* 1. la charpente : menu latéral avec icônes, compteur, salutation */
    R.menu_lateral_visible = await p.locator('#side').isVisible() && (await p.locator('#side #nav button').count()) >= 7;
    R.menu_avec_icones = (await p.locator('#side #nav button svg').count()) >= 7;
    R.accueil_courant = (await p.locator('#nav [aria-current="true"]').textContent()).includes('Accueil');
    R.barre_onglets_cachee_ordinateur = !(await p.locator('#tabbar').isVisible());
    R.salutation = /Bonjour|Bonsoir|Bienvenue/.test(await txt(p, '#salut'));
    R.pas_de_bande_sombre = (await p.locator('.acc-hero').count()) === 0 && /Bonjour/.test(await txt(p, '#main h1'));
    R.accueil_a_faire_et_crochet = /À faire/.test(await txt(p, '#main')) && /Sur le crochet/.test(await txt(p, '#main'));
    R.pas_de_debordement = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);

    /* 2. ambiances : terre cuite, prune, retour au vert ; clair et sombre */
    await dans(p, function(){ appliquerPalette('terre'); });
    const pal1 = await p.evaluate(() => [document.documentElement.getAttribute('data-pal'), getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(), document.querySelector('meta[name=theme-color]').content, localStorage.getItem('crochompte-palette')]);
    R.ambiance_terre = pal1[0] === 'terre' && pal1[1] === '#b4502e' && pal1[2] === '#b4502e' && pal1[3] === 'terre';
    await dans(p, function(){ appliquerPalette('prune'); appliquerTheme('dark'); });
    const pal2 = await p.evaluate(() => [document.documentElement.getAttribute('data-pal'), getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(), getComputedStyle(document.documentElement).getPropertyValue('--ground').trim()]);
    R.ambiance_prune_sombre = pal2[0] === 'prune' && pal2[1] === '#d9a6d6' && pal2[2] === '#161216';
    await dans(p, function(){ appliquerPalette('vert'); appliquerTheme('auto'); });
    R.retour_vert = await p.evaluate(() => !document.documentElement.hasAttribute('data-pal') && localStorage.getItem('crochompte-palette') === null);
    await p.click('#apparence-btn'); await p.waitForTimeout(200);
    R.fenetre_apparence = (await p.locator('.dlg .amb').count()) === 3 && /Apparence/.test(await txt(p, '.dlg'));
    await p.click('.dlg .amb:nth-child(2)'); await p.waitForTimeout(150);
    R.clic_ambiance = await p.evaluate(() => document.documentElement.getAttribute('data-pal') === 'terre');
    await dans(p, function(){ appliquerPalette('vert'); fermerCouche(); });
    await p.waitForTimeout(200);

    /* 3. créations : cartes, compacte, liste ; choix mémorisé */
    await dans(p, function(){ definirVue('creations', 'cartes'); aller('creations'); }); await p.waitForTimeout(300);
    R.creations_cartes = (await p.locator('#main .cr-carte').count()) === 3 && /Te paie de l’heure|Te paie de l'heure/.test(await txt(p, '#main .cr-carte'));
    await p.click('#main .vues button:nth-child(3)'); await p.waitForTimeout(300);
    R.creations_compact = (await p.locator('#main table.t-compact tbody tr').count()) === 3 && /Conseillé/.test(await txt(p, '#main table.t-compact thead'));
    R.choix_memorise = await p.evaluate(() => JSON.parse(localStorage.getItem('crochompte-vues')).creations === 'compact');
    await p.click('#main .t-compact .lien-nom'); await p.waitForTimeout(300);
    R.compact_ouvre_la_fiche = await dans(p, function(){ return view.tab === 'fiche'; });
    await dans(p, function(){ definirVue('creations', 'liste'); aller('creations'); }); await p.waitForTimeout(300);
    R.creations_liste_inchangee = (await p.locator('#main .crea-card').count()) === 3;

    /* 4. matières : cartes et compacte, mêmes gestes ; fenêtre de modification */
    await dans(p, function(){ definirVue('stock', 'cartes'); view.mfExemples = true; view.sub = 'matieres'; aller('stock'); }); await p.waitForTimeout(300);
    R.matieres_cartes = (await p.locator('#main .mat-carte').count()) > 10;
    await p.click('#main .mat-carte .mc-nom'); await p.waitForTimeout(200);
    R.modifier_matiere = /Modifier/.test(await txt(p, '.dlg h2')) && await p.locator('#dlgc-prix').count() === 1;
    await p.fill('#dlgc-prix', '4,10'); await p.click('.dlg [data-oui]'); await p.waitForTimeout(300);
    R.matiere_modifiee = await dans(p, function(){ return state.matieres.some(function(m){ return Math.abs(m.prix - 4.1) < 0.001 && m.prixIndicatif === false; }); });
    await dans(p, function(){ definirVue('stock', 'compact'); render(); }); await p.waitForTimeout(300);
    R.matieres_compact = (await p.locator('#main table.t-compact tbody tr').count()) > 10 && /Coût unitaire/.test(await txt(p, '#main table.t-compact thead'));
    await dans(p, function(){ definirVue('stock', 'liste'); render(); }); await p.waitForTimeout(300);
    R.matieres_liste_inchangee = (await p.locator('#main table.t-mat').count()) === 1;

    /* 5. commandes : tableau par étape */
    await dans(p, function(){ definirVue('commandes', 'tableau'); aller('commandes'); }); await p.waitForTimeout(300);
    R.tableau_etapes = (await p.locator('#main .kol').count()) === 5 && (await p.locator('#main .kcarte').count()) === 2;
    R.tableau_colonnes_justes = /Devis/.test(await txt(p, '#main .kol:nth-child(1)')) && /Inès/.test(await txt(p, '#main .kol:nth-child(1)')) && /Zoé/.test(await txt(p, '#main .kol:nth-child(4)'));
    await p.click('#main .kcarte .kc-q'); await p.waitForTimeout(300);
    R.tableau_ouvre_commande = await dans(p, function(){ return !!view.cmdVue; });
    await dans(p, function(){ definirVue('commandes', 'liste'); });

    /* 6. documents : devis, bon de commande, bon de livraison, et leur disponibilité */
    await dans(p, function(){ view.cmdVue = window.__cid; render(); }); await p.waitForTimeout(300);
    const docs = await p.$$eval('#cmd-documents .doc-btn', bs => bs.map(b => [b.textContent.replace(/\s+/g,' ').trim().slice(0,18), b.disabled]));
    R.trois_documents_disponibles = docs.length === 3 && docs.every(d => !d[1]);
    const F = await dans(p, function(){ var c = commande(window.__cid); return ['devis','commande','livraison'].map(function(t){ var F = instantaneDocument(c, t); var o = octetsDocument(F); return {t:t, n:F.numero, tot:F.total, solde:F.solde, lignes:F.lignes.length, ok: o.length > 1500, acompte:F.acompteDemande, validite:F.validite}; }); });
    R.devis_calcule = F[0].n === 'C-2026-0001' && Math.abs(F[0].tot - 70.5) < 0.001 && F[0].acompte === 20 && /^\d{4}-\d{2}-\d{2}$/.test(F[0].validite) && F[0].ok;
    R.bon_commande_calcule = F[1].ok && Math.abs(F[1].solde - 50.5) < 0.001 && F[1].lignes === 2;
    R.bon_livraison_sans_frais = F[2].ok && F[2].lignes === 1;
    await p.click('#cmd-documents .doc-btn:nth-child(1)'); await p.waitForTimeout(400);
    R.fenetre_devis = /Devis C-2026-0001/.test(await txt(p, '.dlg h2')) && /Télécharger le PDF/.test(await txt(p, '.dlg'));
    await dans(p, function(){ fermerCouche(); });
    await dans(p, function(){ view.cmdVue = window.__cid2; render(); }); await p.waitForTimeout(300);
    const docs2 = await p.$$eval('#cmd-documents .doc-btn', bs => bs.map(b => b.disabled));
    R.devis_seul_disponible_au_devis = docs2[0] === false && docs2[1] === true && docs2[2] === true;

    /* 7. relevé mensuel */
    await dans(p, function(){ var t = Date.now(); var m = state.matieres[0]; mouvementMatiere(m, 'entree', 200, 9.6, 'Mercerie');
      state.pieces.push({id:'h3', cid:'c2', prod:'termine', com:'vendu', prix:28, mesure:{crochet:140}, sessions:[], cree:t-4e6, maj:t, venduLe:t-1e5, termineLe:t-2e5, sortie:true}); sauverTout(); aller('indicateurs'); });
    await p.waitForTimeout(400);
    R.carte_releve = (await p.locator('#rel-mois').count()) === 1 && /Relevé PDF/.test(await txt(p, '#main'));
    const rel = await dans(p, function(){ var d = new Date(); var Rv = donneesReleve(d.getFullYear(), d.getMonth()); return {rec:Rv.totalRecettes, ach:Rv.totalAchats, res:Rv.resultat, n:Rv.recettes.length, ok: octetsDocument(Rv).length > 1500, mention: Rv.mentions.join(' ')}; });
    R.releve_juste = Math.abs(rel.rec - 48) < 0.001 && Math.abs(rel.ach - 9.6) < 0.001 && Math.abs(rel.res - 38.4) < 0.001 && rel.n === 2 && rel.ok && /Micro-entreprise/.test(rel.mention);
    await p.click('#main .releve-ligne .btn.primary'); await p.waitForTimeout(400);
    R.fenetre_releve = /Relevé/.test(await txt(p, '.dlg h2'));
    await dans(p, function(){ fermerCouche(); });

    /* 8. corriger un mouvement ancien : le stock et le prix moyen sont rejoués */
    const mv = await dans(p, function(){
      var m = state.matieres[1]; m.mouv = []; m.stock = 0; m.pmp = 0; m.variantes = [];
      mouvementMatiere(m, 'entree', 100, 20, 'achat 1');      /* 100 g à 0,20 */
      mouvementMatiere(m, 'entree', 100, 40, 'achat 2');      /* 100 g à 0,40 → pmp 0,30 */
      mouvementMatiere(m, 'sortie', 50, null, 'utilisé');     /* reste 150 */
      var ancien = m.mouv[2];                                  /* l'achat 1, le plus ancien */
      window.__mid = m.id; window.__mvid = ancien.id;
      return {stock:m.stock, pmp:m.pmp, peut: peutModifierMouvement(ancien), dernier: peutAnnulerMouvement(m, ancien)};
    });
    R.avant_correction = mv.stock === 150 && Math.abs(mv.pmp - 0.3) < 1e-9 && mv.peut && !mv.dernier;
    const apres = await dans(p, function(){
      var m = matiere(window.__mid); var a = m.mouv.filter(function(x){ return x.id === window.__mvid; })[0];
      a.q = 200; a.p = 20; a.modif = Date.now(); rejouerMouvements(m);   /* en fait c'était 200 g pour 20 € */
      return {stock:m.stock, pmp:m.pmp, n:m.mouv.length, ordre:m.mouv.map(function(x){ return x.t; }).join(','), sa:m.mouv.map(function(x){ return x.sa; }).join(',')};
    });
    /* 200 g à 20 € (0,10) + 100 g à 40 € (0,40) → 300 g, pmp 0,20 ; − 50 → 250 g */
    R.correction_rejouee = apres.stock === 250 && Math.abs(apres.pmp - 0.2) < 1e-9 && apres.n === 3 && apres.ordre === 'sortie,entree,entree' && apres.sa === '250,300,200';
    const annul = await dans(p, function(){
      var m = matiere(window.__mid); var a = m.mouv.filter(function(x){ return x.id === window.__mvid; })[0];
      annulerMouvementQuelconque(m, a);
      return {stock:m.stock, pmp:m.pmp, barre:!!a.annule, n:m.mouv.length, t0:m.mouv[0].t};
    });
    /* sans l'achat 1 : 100 g à 0,40, − 50 → 50 g, pmp 0,40 */
    R.annulation_ancienne_rejouee = annul.stock === 50 && Math.abs(annul.pmp - 0.4) < 1e-9 && annul.barre && annul.n === 4 && annul.t0 === 'annulation';
    /* la fenêtre de correction depuis le journal */
    await dans(p, function(){ view.sub = 'stock'; aller('stock'); }); await p.waitForTimeout(300);
    const nbCrayons = await p.locator('#main .mv-act').count();
    R.journal_propose_la_correction = nbCrayons >= 2;
    const okDlg = await (async () => { const b = p.locator('#main .mv-act .btn[title="Modifier"]').first(); if (!(await b.count())) return false; await b.click(); await p.waitForTimeout(250); return /Modifier l/.test(await txt(p, '.dlg h2')) && await p.locator('#mm-n').count() === 1; })();
    R.fenetre_correction = okDlg;
    await dans(p, function(){ fermerCouche(); });

    /* 9. téléphone : barre d'onglets, « Plus », pas de débordement */
    await p.setViewportSize({width:390, height:844}); await p.waitForTimeout(300);
    await dans(p, function(){ aller('accueil'); }); await p.waitForTimeout(300);
    R.tel_barre_onglets = await p.locator('#tabbar').isVisible() && (await p.locator('#tabbar button').count()) === 5 && !(await p.locator('#side').isVisible());
    await p.click('#tabbar button:nth-child(4)'); await p.waitForTimeout(300);
    /* V59 : « Mes ventes » remplace Matières dans la barre (Matières est dans « Plus »). */
    R.tel_onglet_matieres = await dans(p, function(){ return view.tab === 'ventes'; }) && (await p.locator('#tabbar [aria-current="true"]').textContent()).includes('Ventes');
    await p.click('#tabbar button:nth-child(5)'); await p.waitForTimeout(300);
    R.tel_plus_ouvre_le_menu = !(await p.evaluate(() => document.getElementById('menu-mobile').hidden)) && /Mes chiffres/.test(await txt(p, '#mm-liste'));
    await p.click('#mm-liste >> text=Mes chiffres'); await p.waitForTimeout(400);
    R.tel_plus_courant = await dans(p, function(){ return view.tab === 'indicateurs'; }) && (await p.locator('#tabbar [aria-current="true"]').textContent()).includes('Plus');
    const deb = [];
    for (const e of ['accueil','creations','commandes','stock','ventes','indicateurs']){
      for (const v of ['cartes','compact']){
        await dans(p, new Function('return function(){ definirVue("creations","' + v + '"); definirVue("stock","' + v + '"); definirVue("commandes","' + (v === 'cartes' ? 'tableau' : 'liste') + '"); view.sub = "matieres"; aller("' + e + '"); }')());
        await p.waitForTimeout(250);
        const d = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        if (d > 1) deb.push(e + '/' + v + ':' + d);
      }
    }
    R.tel_sans_debordement = deb.length === 0; if (deb.length) R._deb = deb;
    await p.close();
  } catch (e) { R._echec = String(e && e.stack || e); }
  console.log(JSON.stringify(R, null, 1));
  console.log("ERREURS JS: " + (errs.length ? errs.join(" | ") : "aucune"));
  await b.close();
})();
