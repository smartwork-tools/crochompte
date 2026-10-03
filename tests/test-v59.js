/* V59 — un mini-ERP relié : essai sans compte qui reprend, retour d'écran après
   « Ajouter à mes créations », commande reliée aux pièces et au stock,
   règlement en un geste, stock de départ = achat, matières d'exemple à part,
   modèles avec mes matières, couleur retenue, chiffres unifiés, clientèle,
   planning, import Etsy, canaux à soi, menu amateur. */
const {chromium} = require('./outils').playwright;
const path = require('path'); const fs = require('fs');
const R = {}; const errs = [];
async function page(b, o){
  o = o || {};
  const p = await b.newPage({serviceWorkers:'block', viewport:{width:o.w || 1440, height:900}});
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
  return p;
}
const dans = (p, fn) => p.evaluate(code => window.__eval('(' + code + ')()'), fn.toString());
const txt = async (p, sel) => ((await p.locator(sel).first().textContent()) || '').replace(/ | /g, ' ');
const oui = async (p) => { await p.locator('.dlg [data-oui]:visible').last().click(); await p.waitForTimeout(350); };
(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  try {
    /* 1. essai sans compte : la création ajoutée ramène à la liste */
    const ctx = await b.newContext({serviceWorkers:'block', viewport:{width:1440, height:900}});
    let p = await ctx.newPage();
    p.on('pageerror', e=>errs.push(e.message));
    const brancher = async (pp) => {
      await pp.route('**/app.js*', async r=>{ const src = fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8'); const i = src.lastIndexOf('})();');
        await r.fulfill({contentType:'text/javascript; charset=utf-8', body: src.slice(0,i) + 'window.__eval = function(c){ return eval(c); };\n' + src.slice(i)}); });
      await pp.route('**/vendor/supabase/**', r=>r.fulfill({path:path.join(__dirname,'faux-supabase-persistant.js'),contentType:'application/javascript'}));
    };
    await brancher(p);
    await p.goto('http://127.0.0.1:8934/index.html'); await p.waitForTimeout(600);
    await p.click('#portail-sans-compte'); await p.waitForTimeout(500);
    R.bienvenue_premiere_visite = /Bienvenue/.test(await p.locator('#salut').textContent().catch(()=>''));
    await p.click('.profil-carte[data-p="pro"]'); await p.click('text=C\'est moi'); await p.waitForTimeout(300);
    if (await p.locator('.dlg [data-non]:visible').count()) await p.locator('.dlg [data-non]:visible').last().click();
    await p.waitForTimeout(300);
    await p.locator('#nav button', {hasText:'Mes créations'}).click(); await p.waitForTimeout(300);
    await p.locator('#main button:visible', {hasText:'+ Nouvelle création'}).first().click(); await p.waitForTimeout(400);
    await p.locator('#main button:visible', {hasText:'Ajouter à mes créations'}).first().click(); await p.waitForTimeout(300);
    await oui(p); await p.waitForTimeout(600);
    R.retour_liste_apres_ajout = (await txt(p, '#main h1')) === 'Mes créations' && await dans(p, function(){ return state.creations.length === 1; });
    /* 2. revenir le lendemain : l'atelier d'essai s'ouvre tout seul */
    await p.reload(); await p.waitForTimeout(800);
    R.essai_repris_sans_portail = (await p.locator('#portail-sans-compte').count()) === 0 && await dans(p, function(){ return modeSansCompte === true && state.creations.length === 1; });
    /* 3. facture en essai : on le dit avant, avec « Créer mon compte » */
    const fac = await dans(p, function(){
      var r = state.reglages; r.raisonSociale = 'Camille'; r.siret = '93245678900015'; r.adresse = 'Nantes'; r.statut = 'marchandises';
      var c = nouvelleCommande(); c.client = {nom:'Julie Martin', contact:'julie@exemple.fr'}; c.prixConvenu = 30; c.statut = 'livree'; c.livreeLe = aujourdhuiISO(); delete c.brouillon;
      sauverTout(); view.cmdVue = c.id; aller('commandes', {garderVue:true}); return c.id;
    });
    await p.waitForTimeout(300);
    await p.locator('#cmd-facture button', {hasText:'Établir la facture'}).click(); await p.waitForTimeout(300);
    R.facture_sans_compte_prevenue = /Crée ton compte pour numéroter/.test(await txt(p, '.dlg')) && /Créer mon compte/.test(await txt(p, '.dlg [data-oui]'));
    await p.locator('.dlg [data-non]').last().click(); await p.waitForTimeout(250);
    /* 4. le montant du règlement est déjà rempli */
    R.reglement_prerempli = (await p.inputValue('#cmd-p-m')) === '30';
    await ctx.close();

    /* --- le reste en compte connecté --- */
    p = await page(b);
    if (await p.locator('#sy-c-identifiant').count()){ await p.fill('#sy-c-identifiant','LaineTest'); await p.fill('#sy-c-mdp','motdepasse123'); await p.click('#sy-c-valider'); await p.waitForTimeout(1000); }
    await dans(p, function(){ appliquerProfil('pro', {sansRendu:true}); var r = state.reglages; r.confirmeLe = Date.now(); r.tauxHoraire = 14; r.statut = 'marchandises';
      r.raisonSociale = 'Camille Roux'; r.adresse = '8 rue des Lilas, Nantes'; r.siret = '93245678900015'; sauverTout(); aller('stock'); });
    await p.waitForTimeout(300);

    /* 5. matière ajoutée avec du stock : c'est un achat, et elle se voit */
    await dans(p, function(){ view.sub = 'matieres'; render(); }); await p.waitForTimeout(200);
    await p.locator('#main button', {hasText:'+ Ajouter une matière'}).first().click(); await p.waitForTimeout(300);
    await p.fill('#nm-nom', 'Ricorumi'); await p.fill('#nm-prix', '2,15'); await p.fill('#nm-cont', '25');
    await p.selectOption('#nm-gros', 'Très fin');
    await p.fill('.nm-ligne:nth-child(1) [data-k=coul]', 'blanc'); await p.fill('.nm-ligne:nth-child(1) [data-k=lots]', '4');
    await p.click('#nm-plus'); await p.fill('.nm-ligne:nth-child(2) [data-k=coul]', 'rose'); await p.fill('.nm-ligne:nth-child(2) [data-k=lots]', '2');
    await p.waitForTimeout(150);
    R.choix_achat_visible = await p.locator('#nm-achat-w').isVisible();
    await oui(p);
    const ach = await dans(p, function(){ var m = state.matieres.filter(function(x){ return x.nom === 'Ricorumi'; })[0]; window.__ric = m.id;
      return {achats: achatsMatieres().filter(function(a){ return a.mid === m.id; }).reduce(function(s, a){ return s + a.montant; }, 0), stock: m.stock, vue: view.mfQ}; });
    R.stock_de_depart_compte_en_achat = Math.abs(ach.achats - 12.9) < 0.01 && ach.stock === 150 && ach.vue === 'Ricorumi';
    R.nouvelle_matiere_mise_en_avant = /Ricorumi/.test(await txt(p, '#main')) && !/Acrylique bébé/.test(await txt(p, '#main'));
    /* 6. matières d'exemple : masquées, et « exemple » dans le sélecteur */
    await dans(p, function(){ view.mfQ = ''; render(); }); await p.waitForTimeout(200);
    R.exemples_masques = /matières d'exemple masquées/.test(await txt(p, '#main')) && !/Acrylique bébé/.test(await txt(p, '#main'));
    /* 7. un modèle prend MES matières, et un prix dans la fourchette */
    const mod = await dans(p, function(){
      var cr = creationDepuisModele('ami_petit', 'Petit', 0, 'direct'); var f = adapterAMesMatieres(cr);
      var m = modele('ami_petit'), pr = prixDepartModele(m, 57);
      return {ric: cr.lignes.some(function(l){ return l.mid === window.__ric; }), f: f.length, pr: pr, four: m[7]};
    });
    R.modele_avec_mes_matieres = mod.ric && mod.f >= 1;
    R.prix_modele_dans_la_fourchette = mod.pr <= mod.four[1] && mod.pr >= mod.four[0];

    /* 8. une commande : pièces créées, stock sorti à « prêt », vendues à « livré » */
    const cmd = await dans(p, function(){
      var cr = creationDepuisModele('vide', 'Lapin test', 30, 'etsy'); cr.lignes = [{mid: window.__ric, qte: 20}]; cr.temps = {prep:5,crochet:60,assemb:10,finition:5,emball:5};
      state.creations.push(cr); window.__cr = cr.id;
      var c = nouvelleCommande(); c.client = {nom:'Sophie Durand', contact:'sophie@exemple.fr'}; c.cid = cr.id; c.qte = 2; c.prixConvenu = 30; c.statut = 'acceptee'; c.accordLe = Date.now();
      c.datePromise = new Date(Date.now() + 10*864e5).toISOString().slice(0,10); delete c.brouillon; window.__cmd = c.id;
      sauverTout(); view.cmdVue = c.id; aller('commandes', {garderVue:true}); return c.id;
    });
    await p.waitForTimeout(300);
    await p.locator('.frise-act button.primary').click(); await p.waitForTimeout(400);
    if (await p.locator('.dlg [data-oui]:visible').count()) await oui(p);
    const e1 = await dans(p, function(){ return piecesCommande(commande(window.__cmd)).map(function(x){ return x.prod + '/' + x.com; }).join(','); });
    R.fabrication_cree_les_pieces = e1 === 'encours/commande,encours/commande';
    R.carte_pieces_atelier = /Les pièces dans l'atelier/.test(await txt(p, '#main'));
    await p.locator('.frise-act button.primary').click(); await p.waitForTimeout(400);
    if (await p.locator('.dlg [data-oui]:visible').count()) await oui(p);   /* couleur utilisée */
    const st = await dans(p, function(){ var m = matiere(window.__ric); return {stock: m.stock, hab: (creation(window.__cr).couleursHabituelles || {})[window.__ric]}; });
    R.pret_sort_le_stock = Math.abs(st.stock - (150 - 2 * 20 * 1.08)) < 0.01;
    R.couleur_retenue = !!st.hab;
    await p.locator('.frise-act button.primary').click(); await p.waitForTimeout(400);
    const e3 = await dans(p, function(){ var c = commande(window.__cmd); var pc = piecesCommande(c);
      var enc = encaissements().filter(function(x){ return x.source === 'atelier' && x.cid === window.__cr; }).length;
      return {com: pc.map(function(x){ return x.com; }).join(','), enc: enc, stat: c.statut}; });
    R.livre_marque_vendu_sans_double_compte = e3.com === 'vendu,vendu' && e3.enc === 0 && e3.stat === 'livree';
    /* 9. vente directe : la couleur retenue évite la question */
    await dans(p, function(){ vendrePiece(window.__cr, 30, 'especes', {canal:'marche'}); }); await p.waitForTimeout(300);
    R.vente_sans_question_couleur = (await p.locator('.dlg-couleurs').count()) === 0;
    /* 10. règlement depuis la frise : une boîte, montant rempli, un geste */
    await dans(p, function(){ view.cmdVue = window.__cmd; aller('commandes', {garderVue:true}); }); await p.waitForTimeout(300);
    const lib = await txt(p, '.frise-act button.primary');
    if (/facture/i.test(lib)){
      await dans(p, function(){ var c = commande(window.__cmd); c.factureNum = 'TEST-1'; c.factureLe = Date.now(); sauverTout(); render(); }); await p.waitForTimeout(250);
    }
    await p.locator('.frise-act button.primary').click(); await p.waitForTimeout(300);
    R.reglement_en_un_geste = (await p.inputValue('#rg-m')) === '60';
    await oui(p);
    R.reglement_enregistre_et_paye = await dans(p, function(){ return soldeDu(commande(window.__cmd)) <= 0.004 && etapeCommande(commande(window.__cmd)).k === 'soldee'; });
    R.frise_payee_cochee = (await p.locator('.frise li.faite').count()) === 7;

    /* 11. chiffres : une seule définition */
    const ch = await dans(p, function(){
      var c2 = nouvelleCommande(); c2.client = {nom:'Léa Bernard'}; c2.cid = window.__cr; c2.prixConvenu = 35; c2.statut = 'livree'; c2.livreeLe = aujourdhuiISO(); delete c2.brouillon;
      var c3 = nouvelleCommande(); c3.client = {nom:'Paul'}; c3.cid = window.__cr; c3.prixConvenu = 20; c3.statut = 'encours'; delete c3.brouillon;
      var c4 = nouvelleCommande(); c4.client = {nom:'Emma'}; c4.prixConvenu = 10; c4.statut = 'devis'; delete c4.brouillon;
      sauverTout();
      var rae = resteAEncaisser(), bm = bornesIndicateur('mois'), vg = venteEtGain(bm.debut, bm.fin);
      return {total: rae.total, livre: rae.livre, vendu: vg.vendu, devis: pluriel(3, 'devis')};
    });
    R.a_recevoir_unifie = ch.total === 55 && ch.livre === 35;
    R.vendu_du_mois = ch.vendu === 60 + 30 + 35;
    R.pluriel_devis = ch.devis === '3 devis';
    await dans(p, function(){ aller('accueil'); }); await p.waitForTimeout(300);
    R.accueil_a_recevoir = /À recevoir/.test(await txt(p, '#main .acc3')) && /dont 35,00 € déjà livrés/.test(await txt(p, '#main .acc3'));

    /* 12. clientèle et planning */
    await dans(p, function(){ view.cmdVue = null; view.cmdSous = 'clientele'; aller('commandes'); }); await p.waitForTimeout(300);
    R.clientele_liste = /Sophie Durand/.test(await txt(p, '#main')) && /Léa Bernard/.test(await txt(p, '#main'));
    await p.locator('#main tr', {hasText:'Sophie Durand'}).first().locator('td').first().click(); await p.waitForTimeout(300);
    R.fiche_cliente = /Ses commandes/.test(await txt(p, '#main')) && /Nouvelle commande pour Sophie Durand/.test(await txt(p, '#main'));
    await dans(p, function(){ view.clienteVue = null; view.cmdSous = 'planning'; aller('commandes'); }); await p.waitForTimeout(300);
    R.planning = /travail/.test(await txt(p, '#main .planning')) && /Paul/.test(await txt(p, '#main .planning'));
    await dans(p, function(){ view.cmdSous = 'liste'; render(); });

    /* 13. import Etsy : associer, importer, ne pas réimporter */
    const csv = 'Sale Date,Item Name,Buyer,Quantity,Price,Coupon Code,Coupon Details,Discount Amount,Shipping Discount,Order Shipping,Order Sales Tax,Item Total,Currency,Transaction ID,Listing ID,Date Paid,Date Shipped,Ship Name,Order ID\n' +
      '09/14/26,"Lapin test, doudou",marion_b,1,30.00,,,0,0,4.50,0,30.00,EUR,111,9,09/14/26,09/15/26,Marion B,501\n' +
      '09/21/26,"Lapin test, doudou",julien,2,30.00,,,0,0,4.50,0,60.00,EUR,112,9,09/21/26,09/22/26,Julien,502\n';
    await dans(p, new Function('return function(){ importerEtsy(' + JSON.stringify(csv) + '); }')()); await p.waitForTimeout(300);
    R.etsy_association_proposee = (await p.locator('.etsy-assoc select').count()) === 1 && (await p.locator('.etsy-assoc select').inputValue()) !== '';
    await oui(p);
    const et = await dans(p, function(){ var l = state.pieces.filter(function(x){ return x.etsyTx; }); return {n: l.length, sept: l.filter(function(x){ return new Date(x.venduLe).getMonth() === 8; }).length}; });
    R.etsy_importe = et.n === 3 && et.sept === 3;
    await dans(p, new Function('return function(){ importerEtsy(' + JSON.stringify(csv) + '); }')()); await p.waitForTimeout(300);
    R.etsy_pas_de_doublon = (await p.locator('.dlg [data-oui]:visible').count()) === 0 && await dans(p, function(){ return state.pieces.filter(function(x){ return x.etsyTx; }).length === 3; });

    /* 14. canal à soi */
    await dans(p, function(){ view.regSection = 'canaux'; aller('reglages'); }); await p.waitForTimeout(300);
    await p.locator('#main button', {hasText:'+ Ajouter un canal de vente'}).click(); await p.waitForTimeout(250);
    await p.fill('#dlgc-nom', 'Vinted'); await p.fill('#nc-ppct', '0'); await oui(p);
    R.canal_perso = await dans(p, function(){ return state.canaux.some(function(c){ return c.nom === 'Vinted' && c.perso; }); }) && /Vinted/.test(await txt(p, '#main'));

    /* 15. stock de départ d'avant la V59 : le compter comme achat */
    const sd = await dans(p, function(){
      var m = {id:'m_old', nom:'Phil Coton 3', cat:'fil', prix:2.95, contenance:50, unite:'g', stock:0, seuil:0, pmp:0.059, mouv:[], perso:true, prixIndicatif:false, variantes:[]};
      state.matieres.push(m); mouvementMatiere(m, 'inventaire', 200, null, 'Stock de départ');
      var l = stocksDeDepartNonComptes().filter(function(x){ return x.m.id === 'm_old'; }); return l.length ? l[0].valeur : 0;
    });
    R.stock_depart_detecte = Math.abs(sd - 11.8) < 0.01;
    await dans(p, function(){ dialogueStockDepart(stocksDeDepartNonComptes()); }); await p.waitForTimeout(250); await oui(p);
    R.stock_depart_converti = await dans(p, function(){ var m = matiere('m_old'); return m.stock === 200 && achatsMatieres().some(function(a){ return a.mid === 'm_old' && Math.abs(a.montant - 11.8) < 0.01; }); });

    /* 16. menu amateur allégé */
    await dans(p, function(){ appliquerProfil('amateur', {sansRendu:true}); state.commandes = []; sauverTout(); aller('accueil'); }); await p.waitForTimeout(300);
    const navA = await p.$$eval('#nav button', bs => bs.map(x => x.textContent.trim()));
    R.amateur_sans_commandes_ni_chiffres = navA.indexOf('Commandes') < 0 && navA.indexOf('Mes chiffres') < 0;
    await dans(p, function(){ state.reglages.prendCommandes = true; sauverTout(); render(); }); await p.waitForTimeout(200);
    R.amateur_commandes_sur_demande = (await p.$$eval('#nav button', bs => bs.map(x => x.textContent.trim()))).indexOf('Commandes') >= 0;
    await dans(p, function(){ appliquerProfil('pro', {sansRendu:true}); render(); });

    /* 17. téléphone : Mes ventes dans la barre */
    await p.setViewportSize({width:390, height:844}); await p.waitForTimeout(300);
    R.tel_ventes_dans_la_barre = /Ventes/.test(await txt(p, '#tabbar'));
    const deb = [];
    for (const e of ['accueil','creations','commandes','ventes','stock','indicateurs']){
      await dans(p, new Function('return function(){ view.cmdSous = "planning"; aller("' + e + '"); }')()); await p.waitForTimeout(200);
      const d = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (d > 1) deb.push(e + ':' + d);
    }
    R.tel_sans_debordement = deb.length === 0; if (deb.length) R._deb = deb;
    await p.close();
  } catch (e) { R._echec = String(e && e.stack || e); }
  console.log(JSON.stringify(R, null, 1));
  console.log("ERREURS JS: " + (errs.length ? errs.join(" | ") : "aucune"));
  await b.close();
})();
