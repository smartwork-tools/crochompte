/* V37 — lot 11 : corrections restantes de l'audit (fiabilité, vocabulaire,
   accessibilité). Pièce vendue reliée à une commande sur demande, prix
   changé après l'accord tracé, invraisemblances signalées, conflit de fiche
   annoncé, stock négatif sur l'Accueil, achat en lots, seuils, graphique et
   boutons nommés, police des montants, trop-perçu, statut assaini, deux
   onglets, écran vide sans tuiles, onglet « Mes pièces ». */
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
    await dans(p, function(){ state.reglages.mode = "complet"; sauverTout(); render(); });

    /* 1. Plus d'onglet « Atelier » ni « Mes pièces » : les pièces vivent dans « Mes créations » (V39) */
    R.onglet_mes_pieces = await p.evaluate(()=>{ const n=[...document.querySelectorAll('#nav button')].map(b=>b.textContent.trim()); return n.includes('Mes créations') && !n.includes('Atelier') && !n.includes('Mes pièces'); });

    /* 2. Pièce vendue « à part » alors qu'une commande attend : on propose de la relier */
    await dans(p, function(){
      state.pieces = [{id:'s1', cid:'c1', prod:'termine', com:'stock', prix:null, mesure:{}, sessions:[], cree:Date.now(), maj:Date.now()},
                      {id:'s2', cid:'c1', prod:'termine', com:'stock', prix:null, mesure:{}, sessions:[], cree:Date.now(), maj:Date.now()}];
      state.commandes = [];
      var c = nouvelleCommande(); c.cid = 'c1'; c.statut = 'acceptee'; c.client = {nom:'Lina', contact:'', note:''}; c.brouillon = false;
      sauverTout(); aller('atelier');
    });
    await p.selectOption('tr[data-pid="s1"] select[data-role="com"]', 'vendu'); await p.waitForTimeout(300);
    R.relier_propose = (await p.locator('.dlg').count()) === 1 && /pour une commande/.test(await p.textContent('.dlg'));
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(400);
    let st = await lire(p);
    R.relier_oui_relie = !!st.pieces.find(x=>x.id==='s1').cmdId;
    await p.selectOption('tr[data-pid="s2"] select[data-role="com"]', 'vendu'); await p.waitForTimeout(300);
    /* la seule commande est déjà reliée : plus de question */
    R.pas_de_question_sans_commande = (await p.locator('.dlg').count()) === 0;
    st = await lire(p);
    R.vente_a_part = st.pieces.find(x=>x.id==='s2').com === 'vendu' && !st.pieces.find(x=>x.id==='s2').cmdId;
    /* « Non, vente à part » : vendue, non reliée */
    await dans(p, function(){
      var c = nouvelleCommande(); c.cid = 'c1'; c.statut = 'acceptee'; c.brouillon = false;
      state.pieces.push({id:'s3', cid:'c1', prod:'termine', com:'stock', prix:null, mesure:{}, sessions:[], cree:Date.now(), maj:Date.now()});
      sauverTout(); render();
    });
    await p.selectOption('tr[data-pid="s3"] select[data-role="com"]', 'vendu'); await p.waitForTimeout(300);
    await p.click('.dlg [data-non]'); await p.waitForTimeout(400);
    st = await lire(p);
    R.relier_non_vend_a_part = st.pieces.find(x=>x.id==='s3').com === 'vendu' && !st.pieces.find(x=>x.id==='s3').cmdId;

    /* 3. Prix changé après l'accord : tracé dans l'historique */
    const cid3 = await dans(p, function(){
      var c = nouvelleCommande(); c.cid = 'c2'; c.statut = 'acceptee'; c.accordLe = Date.now(); c.prixConvenu = 40; c.brouillon = false;
      view.cmdVue = c.id; aller('commandes'); return c.id;
    });
    await p.focus('[data-c="prixConvenu"]'); await p.fill('[data-c="prixConvenu"]', '55'); await p.press('[data-c="prixConvenu"]', 'Tab'); await p.waitForTimeout(300);
    st = await lire(p);
    const c3 = st.commandes.find(c=>c.id===cid3);
    R.prix_apres_accord_trace = c3.prixConvenu === 55 && (c3.journal||[]).some(j=>/Prix convenu : 40,00.*55,00.*après l'accord/.test(j.txt.replace(/\s/g,' ')));
    /* 4. Prix convenu invraisemblable : bandeau */
    await dans(p, function(){ var c = state.commandes.find(function(x){ return x.cid === 'c2' && x.accordLe; }); c.prixConvenu = 5000; sauverTout(); render(); });
    R.commande_prix_invraisemblable = /Vérifie le prix convenu/.test(await p.textContent('#main'));

    /* 5. Fiche : gain de l'heure invraisemblable signalé */
    await dans(p, function(){ ouvrirFiche('c3'); });
    await p.waitForTimeout(300);
    await p.fill('#f-prix', '3500'); await p.waitForTimeout(300);
    R.fiche_invraisemblance = await p.isVisible('#r-vrai') && /virgule/.test(await p.textContent('#r-vrai'));
    await p.fill('#f-prix', '35'); await p.waitForTimeout(300);
    R.fiche_normale_sans_alerte = !(await p.isVisible('#r-vrai'));

    /* 6. Fiche modifiée ailleurs pendant l'édition : avertissement avant d'écraser */
    await dans(p, function(){ var c = creation('c3'); c.prix = 99; sauverTout(); });
    await p.fill('#f-prix', '36'); await p.waitForTimeout(200);
    await p.getByRole('button', {name:'Enregistrer', exact:true}).click(); await p.waitForTimeout(300);
    R.conflit_fiche_signale = (await p.locator('.dlg').count()) === 1 && /changé ailleurs/.test(await p.textContent('.dlg'));
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(400);
    R.conflit_fiche_ma_version = (await lire(p)).creations.find(c=>c.id==='c3').prix === 36;

    /* 7. Stock négatif : alerte sur l'Accueil même sans seuil */
    /* V55 : signalé seulement si le stock est suivi (ici : un achat noté sur une autre matière) */
    await dans(p, function(){ state.matieres[1].mouv = [{d: Date.now(), t:'entree', q:100, p:5, pu:0.05, sa:100}]; state.matieres[0].stock = -40; state.matieres[0].seuil = 0; sauverTout(); aller('accueil'); });
    R.accueil_stock_negatif = /stock négatif/.test(await p.textContent('#main'));

    /* 8. Achat en lots : 3 lots remplissent la quantité */
    await dans(p, function(){ aller('stock'); });
    await p.getByRole('button', {name:'Historique du stock'}).click(); await p.waitForTimeout(200);
    const r8 = await dans(p, function(){ var m = matiere(document.querySelector('#mv-mid').value); return {c: m.contenance}; });
    if (r8.c > 1){
      await p.fill('#mv-lots', '3'); await p.waitForTimeout(150);
      R.achat_en_lots = (await p.inputValue('#mv-q')).replace(/\s/g,'').replace(',','.') === String(3 * r8.c);
    } else R.achat_en_lots = true;

    /* 9. Indicateurs : seuils avec bouton, graphique nommé */
    await dans(p, function(){ state.reglages.statut = null; sauverTout(); aller('indicateurs'); });
    R.seuils_bouton = await p.getByRole('button', {name:'Choisir mon statut'}).count() === 1;
    R.graphique_nomme = await p.evaluate(()=>{ const s = document.querySelector('#main svg[role="img"]'); return !s || /Graphique/.test(s.getAttribute('aria-label')||''); });

    /* 10. Accessibilité : colonnes d'actions nommées, boutons ✕ qui disent quoi */
    await dans(p, function(){ definirVue('stock', 'liste'); view.sub = 'matieres'; aller('stock'); });
    R.colonne_actions_nommee = await p.locator('#main th .sr-only').count() > 0;
    R.bouton_supprimer_nomme = await p.evaluate(()=>{ const b = document.querySelector('#main [data-role="del"]'); return !!b && /Supprimer la matière .+/.test(b.getAttribute('aria-label')); });

    /* 11. Montants dans la police du texte */
    await dans(p, function(){ aller('creations'); });
    R.montants_police_texte = await p.evaluate(()=>{ const v = document.querySelector('.tile .v'); return !!v && /Public Sans/.test(getComputedStyle(v).fontFamily); });

    /* 12. Commande avec trop-perçu : tuile dédiée */
    await dans(p, function(){
      var c = nouvelleCommande(); c.cid = 'c1'; c.statut = 'acceptee'; c.prixConvenu = 30; c.brouillon = false;
      c.paiements = [{montant: 45, moyen:'espèces', date:'2026-09-01', saisiLe:Date.now()}];
      view.cmdVue = c.id; aller('commandes');
    });
    R.trop_percu_affiche = /Trop-perçu\s*15,00/.test((await p.textContent('#main')).replace(/\s+/g,' '));

    /* 13. Statut de commande inconnu à l'import : ramené à « devis » */
    await p.evaluate(()=>{ const s = window.CrochomptePont.lire(); s.commandes.push({id:'cmd_x', statut:'xyz', client:{nom:'Test'}, paiements:[]}); window.CrochomptePont.ecrire(JSON.parse(JSON.stringify(s))); });
    R.statut_inconnu_assaini = (await lire(p)).commandes.find(c=>c.id==='cmd_x').statut === 'devis';

    /* 14. Deux onglets : la frappe en attente de CET onglet n'est pas perdue */
    const r14 = await dans(p, function(){
      var s2 = JSON.parse(localStorage.getItem(KEY)); s2.creations[0].nom = 'Nom venu de l\'autre onglet';
      state.creations[1].nom = 'Frappe en cours'; sauver();
      window.dispatchEvent(new StorageEvent('storage', {key: KEY, newValue: JSON.stringify(s2)}));
      return {garde: state.creations[1].nom === 'Frappe en cours', ecrit: JSON.parse(localStorage.getItem(KEY)).creations[1].nom === 'Frappe en cours'};
    });
    R.deux_onglets_frappe_gardee = r14.garde && r14.ecrit;
    R.deux_onglets_averti = /autre onglet/.test(await p.textContent('#toasts').catch(()=>''));

    /* 15. Mes créations vide : pas de tuiles à zéro */
    await dans(p, function(){ state.creations = []; aller('creations'); });
    R.vide_sans_tuiles = (await p.locator('#main .tiles').count()) === 0;
    await p.close();
  } catch (e) { R._echec = String(e && e.stack || e); }
  console.log(JSON.stringify(R, null, 1));
  console.log("ERREURS JS: " + (errs.length ? errs.join(" | ") : "aucune"));
  await b.close();
})();
