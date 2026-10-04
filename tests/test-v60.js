/* V60 — gestion cohérente : l'écran reste le même après actualisation, une
   ligne de matière par couleur et par prix d'achat (lots, premier entré
   premier sorti), ligne sœur quand la sienne est vide, pas de vente sans
   stock (sauf « faite mais pas notée »), pièces prêtes réservées dès
   l'accord d'une commande, besoins en matières, contrôle de cohérence. */
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
  if (await p.locator('#sy-c-identifiant').count()){ await p.fill('#sy-c-identifiant','LaineTest'); await p.fill('#sy-c-mdp','motdepasse123'); await p.click('#sy-c-valider'); await p.waitForTimeout(1000); }
  return p;
}
const dans = (p, fn) => p.evaluate(code => window.__eval('(' + code + ')()'), fn.toString());
const txt = async (p, sel) => ((await p.locator(sel).first().textContent()) || '').replace(/ | /g, ' ');
const oui = async (p) => { await p.locator('.dlg [data-oui]:visible').last().click(); await p.waitForTimeout(350); };
(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  try {
    const p = await page(b);
    await dans(p, function(){ appliquerProfil('pro', {sansRendu:true}); var r = state.reglages; r.confirmeLe = Date.now(); r.tauxHoraire = 14; r.tauxPerte = 0; r.statut = 'marchandises';
      state.matieres = []; state.creations = []; state.pieces = []; state.commandes = []; sauverTout(); render(); });

    /* 1. Reprise des anciennes couleurs : une ligne par couleur */
    const mig = await dans(p, function(){
      var s = clone(state);
      s.matieres = [{id:'lainex', nom:'Laine 50 g', cat:'fil', prix:5, contenance:50, unite:'g', stock:300, pmp:0.1, mouv:[],
        variantes:[{id:'vj', coloris:'jaune', bain:'', stock:200}, {id:'vr', coloris:'rouge', bain:'', stock:100}]}];
      s.creations = [{id:'cA', nom:'Lapin', canal:'direct', prix:30, lignes:[{mid:'lainex', qte:40, vid:'vr'}], temps:{crochet:60}}];
      s.pieces = [{id:'pA', cid:'cA', prod:'termine', com:'atelier', couleurs:{lainex:'vr'}, sortie:true}];
      s = migrer(s);
      var lignes = s.matieres.filter(function(m){ return /Laine 50 g/.test(m.nom); });
      var j = lignes.filter(function(m){ return m.couleur === 'jaune'; })[0], rg = lignes.filter(function(m){ return m.couleur === 'rouge'; })[0];
      return {n: lignes.length, j: j && j.stock, r: rg && rg.stock, jId: j && j.id, rId: rg && rg.id, sansVar: lignes.every(function(m){ return !(m.variantes||[]).length; }),
              ligneCrea: s.creations[0].lignes[0].mid, vid: s.creations[0].lignes[0].vid, coulPiece: JSON.stringify(s.pieces[0].couleurs), nomJ: j && j.nom};
    });
    R.migration_une_ligne_par_couleur = mig.n === 2 && mig.j === 200 && mig.r === 100 && mig.sansVar && mig.nomJ === 'Laine 50 g · jaune';
    R.migration_creation_suit_sa_couleur = mig.ligneCrea === mig.rId && mig.vid === undefined && mig.coulPiece === "{}"; if (!R.migration_creation_suit_sa_couleur) R._mig = mig;
    const mig2 = await dans(p, function(){ var s = clone(state); s.matieres = [{id:'x', nom:'Coton', cat:'fil', prix:2, contenance:50, unite:'g', stock:150, mouv:[], variantes:[{id:'v1', coloris:'écru', stock:100}]}]; s = migrer(s);
      var l = s.matieres.filter(function(m){ return /^Coton( ·|$)/.test(m.nom); }); return l.map(function(m){ return m.nom + '=' + m.stock; }).sort().join(','); });
    R.migration_stock_sans_couleur_garde = mig2 === 'Coton · écru=100,Coton=50'; if (!R.migration_stock_sans_couleur_garde) R._mig2 = mig2;

    /* 2. Achat à un autre prix : un nouveau lot ; même prix : même ligne */
    const lots = await dans(p, function(){
      var m = {id:'ly', nom:'Laine 50 g · jaune', nomBase:'Laine 50 g', couleur:'jaune', cat:'fil', prix:5, contenance:50, unite:'g', stock:0, pmp:0.1, mouv:[], variantes:[], perso:true, prixIndicatif:false, cree:1};
      state.matieres.push(m);
      noterAchatLigne(m, 100, 10);   /* 2 pelotes à 5 € */
      var r1 = noterAchatLigne(m, 100, 8);   /* 2 pelotes à 4 € : nouveau lot */
      var r2 = noterAchatLigne(m, 50, 4);    /* 1 pelote à 4 € : même lot */
      var r3 = noterAchatLigne(m, 50, 5);    /* 1 pelote à 5 € : la ligne */
      return {n: lotsDe(m).length, nouv: r1.nouvelle, memeLot: r2.m === r1.m && !r2.nouvelle, ligne: r3.m === m, stockM: m.stock, stockL: r1.m.stock, prixL: r1.m.prix, art: stockArticle(m), nomL: r1.m.nom};
    });
    R.achat_autre_prix_nouveau_lot = lots.n === 2 && lots.nouv && lots.prixL === 4 && lots.nomL === 'Laine 50 g · jaune';
    R.achat_meme_prix_meme_ligne = lots.memeLot && lots.ligne && lots.stockM === 150 && lots.stockL === 150 && lots.art === 300;

    /* 3. Fabrication : le plus ancien lot d'abord */
    const fifo = await dans(p, function(){
      var cr = {id:'cY', nom:'Poussin', canal:'direct', prix:20, lignes:[{mid:'ly', qte:200}], temps:{crochet:60}, seuilFini:0, expedition:0};
      state.creations.push(cr);
      var p0 = {id:'pY', cid:'cY', prod:'encours', com:'atelier', cree:Date.now(), maj:Date.now(), mesure:{crochet:0}, sessions:[]};
      state.pieces.push(p0); majProd(p0, 'termine');
      var m = matiere('ly'), l2 = lotsDe(m)[1];
      return {m: m.stock, l2: l2.stock, sortiesM: m.mouv.filter(function(x){ return x.t === 'sortie'; }).length, sortiesL2: l2.mouv.filter(function(x){ return x.t === 'sortie'; }).length};
    });
    R.fabrication_premier_lot_d_abord = fifo.m === 0 && fifo.l2 === 100 && fifo.sortiesM === 1 && fifo.sortiesL2 === 1;

    /* 4. Ligne vide : on demande quelle ligne sœur a servi */
    await dans(p, function(){
      var r = {id:'lr', nom:'Laine 50 g · rouge', nomBase:'Laine 50 g', couleur:'rouge', cat:'fil', prix:5, contenance:50, unite:'g', stock:0, pmp:0.1, mouv:[], variantes:[], perso:true, cree:2};
      state.matieres.push(r); mouvementMatiere(r, 'inventaire', 500, null, 'test');
      var cr = {id:'cR', nom:'Coeur', canal:'direct', prix:12, lignes:[{mid:'ly', qte:400}], temps:{crochet:30}, seuilFini:0, expedition:0};
      state.creations.push(cr);
      var p1 = {id:'pR', cid:'cR', prod:'encours', com:'atelier', cree:Date.now(), maj:Date.now(), mesure:{crochet:0}, sessions:[]};
      state.pieces.push(p1); majProd(p1, 'termine'); sauverTout(); render();
    });
    await p.waitForTimeout(400);
    R.ligne_vide_demande_la_soeur = /Quelle ligne as-tu utilisée/.test(await txt(p, '.dlg')) && /rouge/.test(await txt(p, '.dlg select'));
    await p.selectOption('.dlg select', await dans(p, function(){ return 'lr'; }));
    await oui(p);
    const soeur = await dans(p, function(){ return {r: matiere('lr').stock, hab: (creation('cR').couleursHabituelles || {}).ly, att: (piece('pR').couleursAttente || []).length, ly: matiere('ly').stock}; });
    R.ligne_soeur_retiree_et_retenue = soeur.r === 100 && soeur.hab === 'lr' && soeur.att === 0 && soeur.ly === 0;

    /* 5. Pas de vente dans le vide */
    await dans(p, function(){ definirVue('creations', 'compact'); aller('creations'); });
    await p.waitForTimeout(300);
    const btns = await dans(p, function(){
      var out = {};
      ['cY', 'cR'].forEach(function(id){ var tr = document.querySelector('#main tr .lien-nom') ? Array.from(document.querySelectorAll('#main tr')).filter(function(t){ return t.textContent.indexOf(creation(id).nom) !== -1; })[0] : null; out[id] = tr ? tr.querySelector('.act-col button').textContent : null; });
      return out;
    });
    R.creation_en_stock_vendre_avec_nombre = btns.cY === 'Vendre (1)' && btns.cR === 'Vendre (1)';
    await dans(p, function(){ var cr = {id:'cV', nom:'Sac vide', canal:'direct', prix:25, lignes:[], temps:{crochet:30}, seuilFini:0, expedition:0}; state.creations.push(cr); sauverTout(); render(); });
    await p.waitForTimeout(250);
    R.creation_sans_stock_fabriquer = (await dans(p, function(){ var tr = Array.from(document.querySelectorAll('#main tr')).filter(function(t){ return t.textContent.indexOf('Sac vide') !== -1; })[0]; return tr ? tr.querySelector('.act-col button').textContent : ''; })) === 'Fabriquer';
    R.vente_sans_stock_refusee_par_defaut = await dans(p, function(){ return vendrePiece('cV', 25, 'especes', {creer:false}) === null; });
    await dans(p, function(){ dialogueVente('cV'); }); await p.waitForTimeout(300);
    R.dialogue_vente_dit_aucune_piece = !(await p.locator('#vt-vide').isHidden()) && /Aucune pièce de « Sac vide » en stock/.test(await txt(p, '#vt-stock'));
    await p.locator('.dlg [data-oui]').last().click(); await p.waitForTimeout(250);
    R.dialogue_vente_bloque_sans_case = /coche la case/.test(await txt(p, '.dlg'));
    await p.check('#vt-faite'); await p.locator('.dlg [data-oui]').last().click(); await p.waitForTimeout(400);
    R.faite_pas_notee_un_geste = await dans(p, function(){ var l = piecesDe('cV'); return l.length === 1 && l[0].prod === 'termine' && l[0].com === 'vendu'; });

    /* 6. Commande acceptée : la pièce prête est réservée tout de suite */
    await dans(p, function(){ dialogueNouvelleCommande({client:'Inès'}); });
    await p.waitForTimeout(300);
    await p.selectOption('#nc-cid', 'cY');
    await oui(p); await oui(p); await p.waitForTimeout(500);
    R.reservation_proposee_a_l_accord = /Des pièces prêtes sont en stock/.test(await txt(p, '.dlg')) && /Poussin : 1 pièce prête pour 1 demandée/.test(await txt(p, '.dlg'));
    await oui(p); await p.waitForTimeout(300);
    const res = await dans(p, function(){ var c = commandes()[0]; var pY = piece('pY'); return {lie: pY.cmdId === c.id && pY.com === 'commande', stock: enStock('cY'), reserv: reserveesDe('cY'), manque: piecesManquantes(c).length}; });
    R.piece_reservee_plus_vendable = res.lie && res.stock === 0 && res.reserv === 1 && res.manque === 0;

    /* 7. Besoins en matières : une pièce à faire qui demande plus que le stock */
    const bes = await dans(p, function(){
      var cr = {id:'cB', nom:'Plaid', canal:'direct', prix:90, lignes:[{mid:'lr', qte:300}], temps:{crochet:600}, seuilFini:0, expedition:0};
      state.creations.push(cr);
      state.pieces.push({id:'pB', cid:'cB', prod:'afaire', com:'atelier', cree:Date.now(), maj:Date.now(), mesure:{crochet:0}, sessions:[]});
      sauverTout();
      var b = besoinsMatieres().filter(function(x){ return x.m.id === 'lr'; })[0];
      return b ? {besoin: b.besoin, stock: b.stock, manque: b.manque} : null;
    });
    R.besoins_matieres_calcules = !!bes && bes.besoin === 300 && bes.stock === 100 && bes.manque === 200;
    await dans(p, function(){ view.sub = 'matieres'; aller('stock'); }); await p.waitForTimeout(300);
    R.carte_besoins_dans_matieres = /Pour ta production/.test(await txt(p, '#besoins-mat')) && /200 g|4 pelotes/.test(await txt(p, '#besoins-mat'));
    R.accueil_dit_quoi_acheter = await dans(p, function(){ return pointsAFaire().some(function(x){ return /matière à acheter/.test(x.t); }); });

    /* 8. Contrôle de cohérence */
    const coh = await dans(p, function(){
      var c = commandes()[0]; c.statut = 'annulee'; sauverTout();
      var avant = incoherences().filter(function(x){ return /commande annulée/.test(x.t); }).length;
      incoherences().filter(function(x){ return /commande annulée/.test(x.t); })[0].a();
      var apres = incoherences().filter(function(x){ return /commande annulée/.test(x.t); }).length;
      return {avant: avant, apres: apres, libre: enStock('cY')};
    });
    R.coherence_reservation_orpheline_reparee = coh.avant === 1 && coh.apres === 0 && coh.libre === 1;

    /* 9. Actualiser la page garde l'écran */
    await dans(p, function(){ view.cmdSous = 'liste'; view.cmdVue = commandes()[0].id; aller('commandes', {garderVue:true}); });
    await p.waitForTimeout(300);
    await p.reload(); await p.waitForTimeout(1200);
    R.actualiser_garde_la_commande = await dans(p, function(){ return view.tab === 'commandes' && view.cmdVue === commandes()[0].id; });
    await dans(p, function(){ view.cmdVue = null; aller('creations'); }); await p.waitForTimeout(300);
    await p.reload(); await p.waitForTimeout(1200);
    R.actualiser_garde_mes_creations = (await txt(p, '#main h1')) === 'Mes créations';
    await dans(p, function(){ ouvrirFiche('cY'); }); await p.waitForTimeout(300);
    await p.reload(); await p.waitForTimeout(1200);
    R.actualiser_garde_la_fiche = await dans(p, function(){ return view.tab === 'fiche' && view.ficheId === 'cY' && view.draft && view.draft.nom === 'Poussin'; });

    /* 10. Une autre ligne en un geste (couleur) */
    await dans(p, function(){ view.sub = 'matieres'; view.mfQ = ''; definirVue('stock', 'liste'); aller('stock'); dialogueAutreVersion(matiere('ly')); });
    await p.waitForTimeout(300);
    await p.fill('#av-coul', 'vert'); await p.fill('#av-stock', '3');
    await oui(p);
    R.dupliquer_autre_couleur = await dans(p, function(){ var v = state.matieres.filter(function(m){ return m.nom === 'Laine 50 g · vert'; })[0]; return !!v && v.stock === 150 && v.couleur === 'vert'; });

    /* 11. Téléphone : rien ne déborde */
    await p.setViewportSize({width:390, height:844}); await p.waitForTimeout(300);
    const deb = [];
    for (const e of ['accueil','creations','commandes','ventes','stock','reglages']){
      await dans(p, new Function('return function(){ view.regSection = "donnees"; aller("' + e + '"); }')()); await p.waitForTimeout(200);
      const d = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (d > 1) deb.push(e + ':' + d);
    }
    R.tel_sans_debordement = deb.length === 0; if (deb.length) R._deb = deb;
    R.reglages_controle_coherence = /Contrôle de cohérence/.test(await txt(p, '#main'));
    await p.close();
  } catch (e) { R._echec = String(e && e.stack || e); }
  console.log(JSON.stringify(R, null, 1));
  console.log("ERREURS JS: " + (errs.length ? errs.join(" | ") : "aucune"));
  await b.close();
})();
