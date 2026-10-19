/* V62 — finalisation : essai de 6 mois (bandeau seulement dans le dernier
   mois, date de fin dans la barre latérale), fiche et commande en volets sur
   téléphone (tout visible sur ordinateur), pièces de la commande sous la
   frise, « Facturer » ouvre le bon volet, Accueil du tout début allégé,
   recherche du catalogue avant les filtres, import Etsy seulement s'il sert,
   vocabulaire « ligne » au lieu de « lot », pages légales. */
const {chromium} = require('./outils').playwright;
const path = require('path'); const fs = require('fs');
const R = {}; const errs = [];
async function page(b, o){
  o = o || {};
  const p = await b.newPage({serviceWorkers:'block', viewport:{width:o.w || 1440, height:o.h || 900}});
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
  if (o.portail) return p;
  if (await p.locator('#sy-c-identifiant').count()){ await p.fill('#sy-c-identifiant','LaineTest'); await p.fill('#sy-c-mdp','motdepasse123'); await p.click('#sy-c-valider'); await p.waitForTimeout(1000); }
  return p;
}
const dans = (p, fn, a) => p.evaluate(([code, x]) => window.__eval('(' + code + ')')(x), [fn.toString(), a === undefined ? null : a]);
const txt = async (p, sel) => ((await p.locator(sel).first().textContent()) || '').replace(/ | /g, ' ');
const vis = async (p, sel) => p.locator(sel).first().isVisible().catch(()=>false);
function graine(){
  appliquerProfil('pro', {sansRendu:true}); var r = state.reglages; r.confirmeLe = Date.now(); r.tauxHoraire = 14; r.tauxPerte = 0;
  var ms = state.matieres.filter(function(m){ return m.cat === 'fil'; }).slice(0,2);
  ms.forEach(function(m){ m.perso = true; m.prixIndicatif = false; mouvementMatiere(m, 'inventaire', 600, null, 'départ'); });
  state.creations = [{id:'c1', nom:'Lapin', modele:'ami_moyen', lignes:[{mid:ms[0].id, qte:40}], temps:{prep:10, crochet:180, assemb:30, finition:15, emball:5}, canal:'direct', prix:32, expedition:0, seuilFini:0, migre:true, photo:null}];
  sauverTout();
  var c = nouvelleCommande(); c.client = {nom:'Léa', contact:'', note:''}; c.cid = 'c1'; c.prixConvenu = 32; c.statut = 'acceptee'; c.accordLe = new Date().toISOString(); delete c.brouillon;
  sauverTout(); return c.id;
}
(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  try {
    /* 1. Écran de connexion : l'essai de 6 mois est annoncé */
    const p0 = await page(b, {portail:true, w:390, h:844});
    R.connexion_annonce_6_mois = /6 mois d'essai gratuit/.test(await txt(p0, '#main, body'));
    R.liens_legaux_portail = (await p0.locator('a[href="mentions-legales.html"]').count()) >= 1;
    await p0.close();

    /* 2. Accueil du tout début : ni « À faire » vide, ni compteurs à zéro, ni message flottant */
    const p = await page(b, {w:390, h:844});
    await dans(p, function(){ appliquerProfil('amateur', {sansRendu:true}); state.creations = []; state.pieces = []; aller('accueil'); });
    await p.waitForTimeout(400);
    const acc = await txt(p, '#main');
    R.accueil_debut_sans_a_faire_vide = !/Rien ne demande ton attention/.test(acc);
    R.accueil_debut_sans_compteurs_zero = !/Du 1er à aujourd'hui/.test(acc);
    R.pas_de_message_bienvenue_flottant = (await p.locator('#salut').count()) === 0;

    /* 3. Fiche sur téléphone : deux volets */
    const cmdId = await dans(p, graine);
    await dans(p, function(){ ouvrirFiche('c1'); }); await p.waitForTimeout(400);
    R.fiche_volets_visibles_telephone = await vis(p, '.volets-fiche');
    R.volet_calcul_montre_le_prix = await vis(p, '#f-prix') && await vis(p, '#r-gain');
    R.volet_calcul_cache_le_chrono = !(await vis(p, '.chrono-card'));
    await p.locator('.volets-fiche button[data-v="fab"]').click(); await p.waitForTimeout(250);
    R.volet_fab_montre_le_chrono = await vis(p, '.chrono-card') && !(await vis(p, '#f-prix'));
    R.carte_temps_reel_vide_retiree = !/Aucune pièce chronométrée pour l'instant/.test(await txt(p, '#main'));
    /* une autre création s'ouvre sur « Prix et coûts », même si on était sur « Fabrication » */
    await dans(p, function(){ var c2 = clone(creation('c1')); c2.id = 'c2'; c2.nom = 'Bonnet'; state.creations.push(c2); sauverTout(); ouvrirFiche('c2'); }); await p.waitForTimeout(350);
    R.autre_fiche_repart_sur_le_calcul = await p.evaluate(()=>document.querySelector('.fiche-corps').getAttribute('data-actif') === 'calcul');
    await dans(p, function(){ ouvrirFiche('c1'); }); await p.waitForTimeout(300);

    /* 4. Commande sur téléphone : trois volets, pièces sous la frise, « Facturer » ouvre Documents */
    await dans(p, function(id){ view.tab = 'commandes'; view.cmdVue = id; render(); }, cmdId); await p.waitForTimeout(400);
    R.commande_trois_volets = (await p.locator('.volets-fiche button').count()) === 3;
    const ordre = await p.evaluate(()=>{ const z = document.querySelector('.fiche-corps'); const cartes = [...z.querySelectorAll(':scope > [data-volet="cmd"]')].map(x=>(x.querySelector('h2')||{}).textContent||''); return cartes; });
    R.pieces_sous_la_frise = /pièces dans l'atelier/.test(ordre[0] || '') && /Ce qui est convenu/.test(ordre[1] || '');
    await p.locator('.volets-fiche button[data-v="argent"]').click(); await p.waitForTimeout(200);
    R.argent_tuiles_sur_une_ligne = await p.evaluate(()=>{ const t = [...document.querySelectorAll('.tiles-3 .tile')].filter(x=>x.offsetParent); return t.length === 3 && Math.abs(t[0].getBoundingClientRect().top - t[2].getBoundingClientRect().top) < 2; });
    await p.locator('.volets-fiche button[data-v="cmd"]').click(); await p.waitForTimeout(200);
    await dans(p, function(id){ var c = commande(id); c.statut = 'livree'; sauverTout(); render(); }, cmdId); await p.waitForTimeout(300);
    await dans(p, function(){ view.voletCmd = 'cmd'; render(); }); await p.waitForTimeout(300);
    const bF = p.locator('#main button', {hasText:/^Facturer$/}).first();
    if (await bF.count()){ await bF.click(); await p.waitForTimeout(500); }
    R.facturer_ouvre_documents = await p.evaluate(()=>document.querySelector('.fiche-corps').getAttribute('data-actif') === 'docs') || !(await bF.count());

    /* 5. Essai de 6 mois : pas de bandeau à 120 jours, bandeau dans le dernier mois */
    await dans(p, function(){ definirAbonnement({statut:'essai', acces:true, admin:false, essai_fin:new Date(Date.now()+120*864e5).toISOString(), jours_restants:120}); aller('accueil'); });
    await p.waitForTimeout(300);
    R.pas_de_bandeau_a_120_jours = (await p.locator('.abo-bandeau').count()) === 0;
    await dans(p, function(){ definirAbonnement({statut:'essai', acces:true, admin:false, essai_fin:new Date(Date.now()+20*864e5).toISOString(), jours_restants:20}); render(); });
    await p.waitForTimeout(300);
    R.bandeau_dans_le_dernier_mois = /encore 20 jours/.test(await txt(p, '.abo-bandeau'));
    await dans(p, function(){ definirAbonnement({statut:'essai', acces:true, admin:false, essai_fin:new Date(Date.now()+120*864e5).toISOString(), jours_restants:120}); view.regSection = 'abonnement'; aller('reglages'); view.regSection = 'abonnement'; render(); });
    await p.waitForTimeout(300);
    const ab = await txt(p, '#main');
    R.abonnement_6_mois_sans_stripe = /6 mois d'essai gratuit/.test(ab) && !/Stripe/.test(ab) && /Proposé à la fin de l'essai/.test(ab);

    /* 6. Catalogue : la recherche avant les filtres */
    await dans(p, function(){ aller('catalogue'); }); await p.waitForTimeout(400);
    R.recherche_catalogue_en_premier = await p.evaluate(()=>{ const q = document.querySelector('#cat-q'), f = document.querySelector('.filtres-defile'); return !!q && !!f && !!(q.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING); });
    R.pas_de_debordement_catalogue = await p.evaluate(()=>document.documentElement.scrollWidth - innerWidth <= 1);

    /* 7. Mes ventes en amateur, sans Etsy : pas d'import Etsy */
    await dans(p, function(){ appliquerProfil('amateur', {sansRendu:true}); state.creations.forEach(function(c){ c.canal = 'marche'; }); sauverTout(); aller('ventes'); });
    await p.waitForTimeout(300);
    R.import_etsy_masque_si_inutile = !/Importer mes ventes Etsy/.test(await txt(p, '#main'));

    /* 8. Achat à un autre prix : « ligne », plus « lot » */
    const t8 = await dans(p, function(){ var m = state.matieres.filter(function(x){ return x.perso; })[0]; dialogueAchatMatiere(m, {n:1}); return true; });
    await p.waitForTimeout(300);
    if (await p.locator('#am-pu, #am-prix').count()){
      const sel = (await p.locator('#am-pu').count()) ? '#am-pu' : '#am-prix';
      await p.fill(sel, '9.9'); await p.locator(sel).dispatchEvent('input'); await p.waitForTimeout(200);
    }
    const d8 = await txt(p, '.dlg');
    R.vocabulaire_ligne_pas_lot = !/nouveau lot/.test(d8);
    await p.keyboard.press('Escape');

    /* 9. Ordinateur : pas de volets, tout est visible */
    await p.setViewportSize({width:1440, height:900});
    await dans(p, function(){ appliquerProfil('pro', {sansRendu:true}); ouvrirFiche('c1'); }); await p.waitForTimeout(400);
    R.ordinateur_sans_volets = !(await vis(p, '.volets-fiche')) && await vis(p, '#f-prix') && await vis(p, '.chrono-card');
    R.ordinateur_essai_jusqu_au = /Jusqu'au/.test(await txt(p, '#side-bas'));

    /* 10. Pages légales */
    for (const [f, re, interdit] of [['mentions-legales.html', /Hébergement/, null], ['confidentialite.html', /Responsable du traitement/, /Stripe/], ['cgv.html', /six mois/, /Stripe/]]){
      await p.goto('http://127.0.0.1:8934/' + f); await p.waitForTimeout(150);
      const t = await p.locator('main').textContent();
      R['page_' + f.replace(/\W/g, '_')] = re.test(t) && !(interdit && interdit.test(t)) && await p.evaluate(()=>document.documentElement.scrollWidth - innerWidth <= 1);
    }
    await p.close();
  } catch(e){ console.log('Error:', e.message); }
  console.log(JSON.stringify(R, null, 2));
  console.log('ERREURS JS: ' + (errs.length ? errs.join(' | ') : 'aucune'));
  await b.close();
})();
