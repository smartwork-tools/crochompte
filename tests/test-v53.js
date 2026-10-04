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
    await dans(p, function(){
      appliquerProfil('pro', {sansRendu:true}); state.reglages.confirmeLe = Date.now(); state.reglages.tauxPerte = 0; definirVue('stock', 'liste');
      sauverTout(); view.sub = 'matieres'; view.nmCat = null; aller('stock');
    });
    await p.waitForTimeout(400);
    await p.getByRole('button', {name:/Ajouter une matière/}).first().click(); await p.waitForTimeout(300);
    /* 1. le formulaire suit la catégorie */
    const champs = async () => p.$$eval('#nm-champs input, #nm-champs select', xs => xs.map(x => x.id).filter(Boolean));
    const cFil = await champs();
    R.fil_champs_pelote = ['nm-met','nm-gros','nm-cro','nm-coul','nm-bain','nm-lots'].every(x => cFil.includes(x)) && !cFil.includes('nm-type');
    await p.fill('#nm-nom', 'Mon essai'); await p.fill('#nm-prix', '4');
    await p.selectOption('#nm-cat', 'acc'); await p.waitForTimeout(150);
    const cAcc = await champs();
    R.acc_champs = ['nm-taille','nm-materiau','nm-en71','nm-coul'].every(x => cAcc.includes(x)) && !cAcc.includes('nm-met') && !cAcc.includes('nm-bain');
    R.nom_prix_gardes = (await p.inputValue('#nm-nom')) === 'Mon essai' && (await p.inputValue('#nm-prix')) === '4';
    await p.selectOption('#nm-cat', 'outil'); await p.waitForTimeout(150);
    const cOut = await champs();
    R.outil_champs = cOut.includes('nm-type') && cOut.includes('nm-diam') && !cOut.includes('nm-cont') && !cOut.includes('nm-coul');
    /* 2. un crochet de 0,5 mm, avec confirmation */
    R.petites_tailles = await dans(p, function(){ return CROCHETS.indexOf(0.5) >= 0 && CROCHETS.indexOf(0.6) >= 0 && CROCHETS.indexOf(30) >= 0; });
    await p.fill('#nm-nom', ''); await p.fill('#nm-prix', '3');
    await p.selectOption('#nm-type', 'crochet'); await p.selectOption('#nm-diam', '0.5');
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(400);
    const out = await dans(p, function(){ var m = state.matieres.filter(function(x){ return x.nom === 'Crochet 0,5 mm'; })[0]; return m ? {cat:m.cat, d:m.diametre, t:m.typeOutil} : null; });
    R.crochet_ajoute = !!out && out.cat === 'outil' && out.d === 0.5 && out.t === 'crochet';
    const noms = async () => p.$$eval('#main table input[data-role="nom"]', xs => xs.map(x => x.value));
    R.outils_dans_la_liste = /Outils/.test(await p.locator('#main table').first().textContent()) && (await noms()).includes('Crochet 0,5 mm');
    /* 3. un fil avec son stock de départ en couleur */
    await p.getByRole('button', {name:/Ajouter une matière/}).first().click(); await p.waitForTimeout(300);
    await p.selectOption('#nm-cat', 'fil'); await p.waitForTimeout(150);
    await p.fill('#nm-nom', 'Laine test 50 g'); await p.fill('#nm-prix', '2.7'); await p.fill('#nm-cont', '50');
    await p.fill('#nm-coul', 'jaune'); await p.fill('#nm-bain', '4821'); await p.fill('#nm-lots', '10');
    R.recap_stock_depart = /Stock de départ : 10 pelotes \(500 g\)/.test((await p.locator('.dlg').textContent()).replace(/ | /g,' '));
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(400);
    /* V60 : chaque couleur devient sa propre ligne, avec son stock. */
    const lt = await dans(p, function(){ var m = state.matieres.filter(function(x){ return x.nom === 'Laine test 50 g · jaune · bain 4821'; })[0]; window.__mid = m.id; return {s:m.stock, c:m.couleur, b:m.nomBase, v:(m.variantes||[]).length}; });
    R.stock_par_couleur = lt.s === 500 && lt.c === 'jaune · bain 4821' && lt.b === 'Laine test 50 g' && lt.v === 0;
    /* 4. une autre couleur : une autre ligne, avec son stock (Dupliquer) */
    await dans(p, function(){ dialogueAutreVersion(matiere(window.__mid)); });
    await p.waitForTimeout(200);
    await p.fill('#av-coul', 'rose'); await p.fill('#av-stock', '4');
    R.recap_achat = /Une autre ligne de « Laine test 50 g »/.test(await p.locator('.dlg').textContent());
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(400);
    const la = await dans(p, function(){ var r = state.matieres.filter(function(x){ return x.nom === 'Laine test 50 g · rose'; })[0]; window.__rose = r && r.id; return {s:matiere(window.__mid).stock, rose: r && r.stock}; });
    R.achat_couleur = la.s === 500 && la.rose === 200;
    /* 5. « Mes fils par couleur » */
    await dans(p, function(){ view.sub = 'stock'; render(); });
    await p.waitForTimeout(300);
    const fc = (await p.locator('table.fils-coul').textContent()).replace(/ | /g,' ');
    R.fils_par_couleur = /jaune/.test(fc) && /rose/.test(fc) && /10 pelotes \(500 g\)/.test(fc) && /4 pelotes \(200 g\)/.test(fc);
    /* 6. la fabrication retire la ligne de la fiche ; si elle est vide, elle demande la ligne sœur */
    await dans(p, function(){
      creation('c1').lignes = [{mid:window.__mid, qte:40}];
      creation('c2').lignes = [{mid:window.__mid, qte:30}];
      ajouterPieces('c1', 1, 'termine'); sauverTout();
    });
    const j1 = await dans(p, function(){ return matiere(window.__mid).stock; });
    R.fiche_couleur_retiree = j1 === 460;
    await dans(p, function(){ mouvementMatiere(matiere(window.__mid), 'inventaire', 0, null, 'vide'); ajouterPieces('c2', 1, 'termine'); sauverTout(); });
    await p.waitForTimeout(300);
    R.couleur_demandee = await p.locator('.dlg .dlg-couleurs').count() === 1 && await dans(p, function(){ return piecesCouleurAttente().length === 1 && matiere(window.__mid).stock === 0; });
    const vRose = await dans(p, function(){ return window.__rose; });
    await p.selectOption('.dlg .dlg-couleurs select', vRose);
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(300);
    const r6 = await dans(p, function(){ return {rose:matiere(window.__rose).stock, att:piecesCouleurAttente().length, tot:matiere(window.__mid).stock}; });
    R.couleur_choisie_retiree = r6.rose === 170 && r6.att === 0 && r6.tot === 0;
    /* 7. recherche tolérante */
    await dans(p, function(){ state.matieres.push({id:'mx', nom:'Laine mérinos fine', cat:'fil', prix:8, contenance:50, unite:'g', stock:0, seuil:0, pmp:0.16, mouv:[], variantes:[]}); sauverTout(); view.sub = 'matieres'; view.mfQ = 'merinos'; render(); });
    await p.waitForTimeout(250);
    R.sans_accent = (await noms()).includes('Laine mérinos fine');
    await dans(p, function(){ view.mfQ = 'lainne'; render(); });
    await p.waitForTimeout(250);
    const noteM = await p.locator('.note-rech').first().textContent().catch(()=>'');
    R.faute_de_frappe = /plus proches/.test(noteM) && /« laine »/.test(noteM) && (await noms()).includes('Laine test 50 g');
    await p.locator('.note-rech .lien-mini').first().click(); await p.waitForTimeout(250);
    R.suggestion_cliquable = await dans(p, function(){ return view.mfQ === 'laine'; });
    await dans(p, function(){ view.mfQ = ''; view.creaQ = 'lapin celeste'; aller('creations'); });
    await p.waitForTimeout(300);
    R.creations_sans_accent = /Lapin Céleste/.test(await p.locator('#main').textContent());
    await dans(p, function(){ view.cmQ = 'pelluche'; view.sub = 'catalogue'; aller('stock'); });
    await p.waitForTimeout(300);
    R.catalogue_approche = /Fil peluche poil long/.test(await p.locator('#main').textContent()) && /plus proches/.test(await p.locator('#main').textContent());
    const plus = await dans(p, function(){ return rechercheFloue([{n:'Coton peigné DK'}], 'cotton', function(x){ return x.n; }); });
    R.moteur_suggestion = plus.approx && plus.suggestion === 'coton' && plus.liste.length === 1;
    /* 8. le sélecteur de la fiche ne propose pas les outils */
    await dans(p, function(){ view.cmQ = ''; ouvrirPicker(function(){}); });
    await p.waitForTimeout(200);
    await p.fill('#pk-q', 'crochet'); await p.waitForTimeout(200);
    R.picker_sans_outils = !/Crochet 0,5 mm/.test(await p.locator('#pk-list').textContent()) && !/Crochet aluminium/.test(await p.locator('#pk-list').textContent());
    await dans(p, function(){ retirerPicker(); });
    /* 9. confirmations : fournisseur, commande, création */
    await dans(p, function(){ view.sub = 'fournisseurs'; aller('stock'); });
    await p.waitForTimeout(250);
    await p.getByRole('button', {name:/Nouveau fournisseur|Ajouter un fournisseur/}).first().click(); await p.waitForTimeout(200);
    await p.fill('#dlgc-nom', 'Mercerie du centre'); await p.click('.dlg [data-oui]'); await p.waitForTimeout(200);
    R.fournisseur_recap = /Voici le fournisseur/.test(await p.locator('.dlg').textContent()) && await dans(p, function(){ return !fournisseurs().length; });
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(300);
    R.fournisseur_ajoute = await dans(p, function(){ return fournisseurs().length === 1; });
    await dans(p, function(){ dialogueNouvelleCommande(); });
    await p.waitForTimeout(200);
    await p.fill('#dlgc-nom', 'Camille'); await p.fill('#nc-prix', '30'); await p.click('.dlg [data-oui]'); await p.waitForTimeout(200);
    R.commande_recap = /Voici la commande/.test(await p.locator('.dlg').textContent()) && /Camille/.test(await p.locator('.dlg').textContent());
    const nAv = await dans(p, function(){ return commandes().filter(function(c){ return !c.brouillon; }).length; });
    await p.click('.dlg [data-non]'); await p.waitForTimeout(150);
    R.corriger_revient_au_formulaire = await p.locator('#dlgc-nom').isVisible() && (await p.inputValue('#dlgc-nom')) === 'Camille';
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(150); await p.click('.dlg [data-oui]'); await p.waitForTimeout(400);
    R.commande_creee = await dans(p, function(){ return commandes().filter(function(c){ return !c.brouillon; }).length; }) === nAv + 1;
    /* V60 : une pièce prête est en stock : la réservation est proposée ; ici, non. */
    if (await p.locator('.dlg [data-non]:visible').count()){ await p.locator('.dlg [data-non]:visible').last().click(); await p.waitForTimeout(300); }
    await dans(p, function(){ nouvelleFiche('bonnet'); });
    await p.waitForTimeout(300);
    await p.fill('#f-nom', 'Bonnet test V53');
    const nC = await dans(p, function(){ return state.creations.length; });
    await p.getByRole('button', {name:'Ajouter à mes créations'}).first().click(); await p.waitForTimeout(250);
    R.creation_recap = /Ajouter cette création/.test(await p.locator('.dlg').textContent()) && await dans(p, function(){ return state.creations.length; }) === nC;
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(400);
    R.creation_ajoutee = await dans(p, function(){ return state.creations.some(function(c){ return c.nom === 'Bonnet test V53'; }); });
    /* 10. l'ancien champ « Coloris / bain » devient une couleur */
    const mig = await dans(p, function(){
      var s2 = clone(state); s2.matieres.push({id:'old', nom:'Vieux coton', cat:'fil', prix:3, contenance:50, unite:'g', stock:120, seuil:0, pmp:0.06, mouv:[], bain:'écru · bain 12'});
      migrer(s2); var m = s2.matieres.filter(function(x){ return x.id === 'old'; })[0];
      return {n:(m.variantes||[]).length, c:m.couleur, s:m.stock, b:m.bain, nom:m.nom};
    });
    /* V60 : la couleur devient celle de la ligne elle-même */
    R.migration_coloris = mig.n === 0 && mig.c === 'écru · bain 12' && mig.s === 120 && mig.b === '' && mig.nom === 'Vieux coton · écru · bain 12';
    await p.close();
  } catch (e) { R._echec = String(e && e.stack || e); }
  console.log(JSON.stringify(R, null, 1));
  console.log("ERREURS JS: " + (errs.length ? errs.join(" | ") : "aucune"));
  await b.close();
})();
