/* V65 — téléphone et documents (corrections du rapport de test B) :
   barres du bas qui ne se recouvrent plus, PDF avec nom long, tableaux
   larges avec actions visibles, Fournisseurs par matière, cartes « à
   acheter » sur téléphone, focus retenu dans les fenêtres, volet gardé
   après F5, stock de départ « déjà chez moi ». */
const {chromium} = require('./outils').playwright;
const path = require('path'); const fs = require('fs');
const cp = require('child_process');
const R = {}; const errs = [];
async function page(b, o){
  o = o || {};
  const p = await b.newPage({serviceWorkers:'block', viewport:{width:o.w || 1440, height:o.h || 900}, isMobile:!!o.mobile, hasTouch:!!o.mobile});
  p.on('pageerror', e=>errs.push(e.message));
  p.on('dialog', d=>d.dismiss());
  await p.route('**/app.js*', async r=>{
    const src = fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
    const i = src.lastIndexOf('})();');
    await r.fulfill({contentType:'text/javascript; charset=utf-8', body: src.slice(0,i) + 'window.__eval = function(c){ return eval(c); };\n' + src.slice(i)});
  });
  await p.route('**/vendor/supabase/**', r=>r.fulfill({path:path.join(__dirname,'faux-supabase-persistant.js'),contentType:'application/javascript'}));
  await p.route('**/functions/v1/connexion', r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'AT',refresh_token:'RT'})}));
  await p.goto('http://127.0.0.1:8934/index.html'); await p.waitForTimeout(700);
  if (await p.locator('#sy-c-identifiant').count()){ await p.fill('#sy-c-identifiant','LaineTest'); await p.fill('#sy-c-mdp','motdepasse123'); await p.click('#sy-c-valider'); await p.waitForTimeout(1000); }
  await require('./aide.js').graine(p);
  await p.evaluate(()=>window.__eval('(' + function(){
    appliquerProfil('pro', {sansRendu:true});
    state.reglages.confirmeLe = Date.now(); state.reglages.statut = 'marchandises'; state.reglages.cotisations = 12.4;
    state.reglages.raisonSociale = 'Camille Roux'; state.reglages.adresse = '8 rue des Lilas, Nantes'; state.reglages.siret = '93245678900015';
    sauverTout(); aller('accueil');
  }.toString() + ')()'));
  await p.waitForTimeout(400);
  return p;
}
const dans = (p, fn, a) => p.evaluate(([code, x]) => window.__eval('(' + code + ')')(x), [fn.toString(), a === undefined ? null : a]);
const tabsRepondent = async (p) => p.evaluate(() => {
  const btns = [].slice.call(document.querySelectorAll('.tabbar button'));
  if (!btns.length) return {n:0};
  let ok = 0;
  btns.forEach(b => {
    const r = b.getBoundingClientRect();
    const e = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
    if (e && (e === b || b.contains(e))) ok++;
  });
  return {n: btns.length, ok: ok};
});
(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  try {
    /* ── 1. Téléphone : la fiche et le chrono ne couvrent plus la barre du bas ── */
    const pm = await page(b, {w:390, mobile:true});
    await dans(pm, function(){ ouvrirFiche('c1'); }); await pm.waitForTimeout(500);
    let t1 = await tabsRepondent(pm);
    R.m1_onglets_libres_fiche_390 = t1.n === 5 && t1.ok === 5;
    await pm.locator('.tabbar button', {hasText:'Accueil'}).click(); await pm.waitForTimeout(500);
    R.m1_toucher_accueil_marche = await dans(pm, function(){ return view.tab === 'accueil'; });
    /* chrono en route */
    await dans(pm, function(){ var pc = {id:'pch', cid:'c1', prod:'encours', com:'atelier', prix:null, mesure:{}, sessions:[], cree:Date.now(), maj:Date.now()}; state.pieces.push(pc); state.chrono = {pid:'pch', poste:'crochet', debut:Date.now()-60000}; sauverTout(); render(); });
    await pm.waitForTimeout(500);
    R.m2_chrono_present = (await pm.locator('.chronobar').count()) === 1;
    t1 = await tabsRepondent(pm);
    R.m2_onglets_libres_chrono_390 = t1.n === 5 && t1.ok === 5;
    /* fiche + chrono en même temps */
    await dans(pm, function(){ ouvrirFiche('c1'); }); await pm.waitForTimeout(500);
    t1 = await tabsRepondent(pm);
    R.m2_onglets_libres_fiche_et_chrono = t1.n === 5 && t1.ok === 5;
    R.m2_chrono_au_dessus_de_la_barre_fiche = await pm.evaluate(() => {
      const c = document.querySelector('.chronobar'), bf = document.querySelector('.barre-fiche');
      if (!c || !bf) return false;
      return c.getBoundingClientRect().bottom <= bf.getBoundingClientRect().top + 1;
    });

    /* ── 2. Téléphone : « ce que tu dois acheter » en cartes, rien hors écran ── */
    R.m10_achats_fiche_en_cartes = await pm.evaluate(() => {
      const t = document.getElementById('f-achat');
      if (!t) return 'tableau introuvable';
      const w = t.closest('.tablewrap');
      const horsEcran = [].slice.call(t.querySelectorAll('td')).filter(x => x.getBoundingClientRect().right > window.innerWidth + 2).length;
      return w.scrollWidth - w.clientWidth <= 2 && horsEcran === 0;
    });
    await dans(pm, function(){
      var c = nouvelleCommande(); c.client = {nom:'Clémence'}; c.cid = 'c1'; c.qte = 3; c.prixConvenu = 30;
      c.statut = 'acceptee'; c.accordLe = Date.now(); delete c.brouillon; sauverTout();
      view.cmdVue = c.id; aller('commandes', {garderVue:true});
    });
    await pm.waitForTimeout(600);
    R.m10_besoins_commande_en_cartes = await pm.evaluate(() => {
      const c = document.querySelector('#main .achats-resp');
      if (!c) return 'tableau introuvable';
      const horsEcran = [].slice.call(c.querySelectorAll('td')).filter(x => x.getBoundingClientRect().right > window.innerWidth + 2).length;
      return horsEcran === 0 && !!c.querySelector('td[data-l]');
    });

    /* ── 3. F5 garde le volet choisi ── */
    await dans(pm, function(){ ouvrirFiche('c1'); }); await pm.waitForTimeout(400);
    if (await pm.locator('.volets-fiche button[data-v="fab"]').count()){
      await pm.locator('.volets-fiche button[data-v="fab"]').click(); await pm.waitForTimeout(600);
      await pm.reload(); await pm.waitForTimeout(1200);
      R.m5_volet_garde_apres_f5 = await dans(pm, function(){ return view.tab === 'fiche' && view.voletFiche === 'fab'; });
    } else R.m5_volet_garde_apres_f5 = 'volets introuvables';
    await pm.close();

    /* ── 4. PDF : nom long à la ligne, montant lisible ── */
    const p = await page(b);
    const b64 = await dans(p, function(){
      var c = nouvelleCommande();
      c.client = {nom:"Mme Françoise d'Aubigné-Lefèvre de la Tour du Pin 19"};
      c.cid = 'c2'; c.qte = 1; c.prixConvenu = 51.5; c.statut = 'acceptee'; c.accordLe = Date.now(); delete c.brouillon;
      sauverTout();
      var F = instantaneDocument(c, 'commande');
      var octets = window.CrochomptePdf.document(F, {eur: eur, date: dateFrDocument});
      var s = ''; for (var i = 0; i < octets.length; i++) s += String.fromCharCode(octets.charCodeAt ? octets.charCodeAt(i) : octets[i]);
      return btoa(s);
    });
    const pdfPath = '/tmp/v65-bon.pdf';
    fs.writeFileSync(pdfPath, Buffer.from(b64, 'base64'));
    const texte = cp.execSync('pdftotext -layout ' + pdfPath + ' -', {encoding:'utf8'});
    R.pdf_commence_bien = fs.readFileSync(pdfPath).slice(0,5).toString() === '%PDF-';
    R.pdf_nom_long_pas_colle_au_montant = !/Pin 1\s*51,50/.test(texte) && !/151,50/.test(texte);
    R.pdf_montant_juste = /51,50/.test(texte);
    /* les deux colonnes sont extraites côte à côte : on vérifie les deux
       morceaux du nom replié, chacun sur sa ligne */
    R.pdf_nom_complet_present = /Aubign/.test(texte) && /Tour du/.test(texte) && /^Pin 19/m.test(texte);

    /* ── 5. Tableaux larges : colonne d'actions collée au bord, ombre de défilement ── */
    await dans(p, function(){ for (var i = 0; i < 8; i++){ var c = nouvelleCommande(); c.client = {nom:'Personne ' + i}; c.cid = 'c1'; c.prixConvenu = 20 + i; c.statut = 'acceptee'; c.accordLe = Date.now(); delete c.brouillon; } sauverTout(); view.cmdVue = null; aller('commandes'); });
    await p.waitForTimeout(500);
    R.m8_actions_commandes_visibles = await p.evaluate(() => {
      const t = document.querySelector('.t-cmd'); if (!t) return 'tableau introuvable';
      const td = t.querySelector('tbody tr:first-child td:last-child');
      const st = getComputedStyle(td);
      const visible = td.getBoundingClientRect().right <= window.innerWidth + 2;
      return st.position === 'sticky' && visible;
    });
    R.m8_ombre_defilement = await p.evaluate(() => {
      const w = document.querySelector('.tablewrap');
      return !!w && getComputedStyle(w).backgroundAttachment.indexOf('local') !== -1;
    });

    /* ── 6. Fournisseurs et prix : une ligne par matière, fenêtre de saisie ── */
    await dans(p, function(){
      state.fournisseurs = [];
      for (var i = 1; i <= 6; i++) state.fournisseurs.push({id:'f' + i, nom:'Fournisseur ' + i, site:'', note:''});
      sauverTout(); view.sub = 'fournisseurs'; aller('stock');
    });
    await p.waitForTimeout(500);
    R.m9_tri_numerique = await p.evaluate(() => {
      const l = [].slice.call(document.querySelectorAll('.fourn-ligne b')).map(x => x.textContent);
      return l.length === 6 && l[1] === 'Fournisseur 2';
    });
    R.m9_tableau_contenu = await p.evaluate(() => {
      const w = document.querySelector('.fourn-comp'); const t = w && w.querySelector('table');
      return !!t && t.scrollWidth < 1100 && [].slice.call(t.querySelectorAll('thead th')).length === 5;
    });
    await p.locator('.fourn-comp button', {hasText:'Noter les prix'}).first().click(); await p.waitForTimeout(400);
    R.m9_fenetre_six_fournisseurs = (await p.locator('.dlg [data-k="prix"]').count()) === 6;
    await p.locator('.dlg [data-k="prix"]').first().fill('2,4');
    await p.locator('.dlg').getByRole('button', {name:'Enregistrer les prix'}).click(); await p.waitForTimeout(500);
    R.m9_prix_note = await dans(p, function(){
      var m = state.matieres.filter(function(x){ return offresDe(x).some(function(o){ return o.fid === 'f1' && Math.abs(o.prix - 2.4) < 0.001; }); })[0];
      return !!m && !!meilleureOffre(m) && meilleureOffre(m).fid === 'f1';
    });

    /* ── 7. Le focus clavier reste dans la fenêtre « Nouvelle commande » ── */
    await dans(p, function(){ aller('commandes'); }); await p.waitForTimeout(300);
    await p.getByText('+ Nouvelle commande').first().click(); await p.waitForTimeout(400);
    let sorti = 0;
    for (let i = 0; i < 25; i++){
      await p.keyboard.press('Tab');
      const dedans = await p.evaluate(() => { const d = document.querySelector('.dlg'); return !!d && d.contains(document.activeElement); });
      if (!dedans) sorti++;
    }
    R.m11_focus_retenu = sorti === 0;
    await p.keyboard.press('Escape'); await p.waitForTimeout(250);

    /* ── 8. Nouvelle matière avec du stock : « déjà chez moi » par défaut ── */
    await dans(p, function(){ view.sub = 'matieres'; aller('stock'); }); await p.waitForTimeout(300);
    await p.locator('#main button', {hasText:'+ Ajouter une matière'}).first().click(); await p.waitForTimeout(400);
    await p.fill('#nm-nom', 'Laine Héritage'); await p.fill('#nm-prix', '4,20'); await p.fill('#nm-cont', '50');
    await p.fill('.nm-ligne:nth-child(1) [data-k=lots]', '5'); await p.waitForTimeout(200);
    R.depart_choix_par_defaut = (await p.locator('#nm-achat').inputValue()) === 'avant';
    await p.locator('.dlg').getByRole('button', {name:'Ajouter la matière'}).click(); await p.waitForTimeout(300);
    if (await p.locator('.dlg [data-oui]').count()) { await p.locator('.dlg [data-oui]').click(); await p.waitForTimeout(400); }
    R.depart_sans_faux_achat = await dans(p, function(){
      var m = state.matieres.filter(function(x){ return x.nomBase === 'Laine Héritage'; })[0];
      if (!m) return 'matière introuvable';
      var achats = registreAchats(new Date().getFullYear()).filter(function(a){ return /Laine Héritage/.test(a.nature || '') || /Laine Héritage/.test(a.qui || ''); });
      return m.stock === 250 && (m.mouv || []).some(function(x){ return x.t === 'inventaire'; }) && !achats.length;
    });

    /* ── 9. Segments lisibles en thème sombre ── */
    R.m1s_segment_lisible_sombre = await p.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      const z = document.createElement('div'); z.className = 'segs';
      z.innerHTML = '<button aria-pressed="true">Test</button>';
      document.body.appendChild(z);
      const c = getComputedStyle(z.querySelector('button')).color;
      const onP = getComputedStyle(document.body).getPropertyValue('--on-primary').trim();
      z.remove(); document.documentElement.removeAttribute('data-theme');
      function rgb(x){ const m2 = x.match(/\d+/g); return m2 ? m2.slice(0,3).join(',') : x; }
      function hex(h){ h = h.replace('#',''); return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)].join(','); }
      return onP ? rgb(c) === (onP[0] === '#' ? hex(onP) : rgb(onP)) : false;
    });
    await p.close();
  } catch(e){ console.log('Error:', e.message); }
  console.log(JSON.stringify(R, null, 2));
  console.log('ERREURS JS: ' + (errs.length ? errs.join(' | ') : 'aucune'));
  await b.close();
})();
