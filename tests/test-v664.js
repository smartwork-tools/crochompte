/* V66.4 — parcours depuis les réseaux sociaux et compteur de visites.
   1. Accueil sur téléphone : promesse + bouton démo, PUIS formulaire, puis vidéo.
   2. Accueil sur ordinateur : formulaire à droite, bouton démo visible.
   3. Compteur : un appel anonyme par événement et par onglet, provenance
      lue dans ?src= (puis retirée de l'adresse) ou dans le site d'origine.
   4. Démo : « Créer mon atelier gratuit » ouvre l'inscription, adresse nettoyée.
   5. Salutation : le titre et le message du bas disent la même chose. */
const {chromium} = require('./outils').playwright;
const path = require('path');
const R = {}; const errs = [];
const BASE = 'http://127.0.0.1:8934/index.html';
(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  const appels = [];
  async function contexte(vp, opts, muet){
    const ctx = await b.newContext(Object.assign({serviceWorkers:'block', viewport: vp}, opts || {}));
    /* Sur 127.0.0.1, le compteur se tait sauf si le test le demande. */
    if (!muet) await ctx.addInitScript(()=>{ window.__compteurEnTest = true; });
    const p = await ctx.newPage();
    p.on('pageerror', e=>errs.push(e.message));
    await p.route('**/vendor/supabase/**', r=>r.fulfill({path:path.join(__dirname,'faux-supabase-persistant.js'),contentType:'application/javascript'}));
    await p.route('**/rest/v1/rpc/compter_visite', r=>{
      const h = r.request().headers();
      appels.push({corps: JSON.parse(r.request().postData() || '{}'), cookie: h['cookie'] || '', ctx: vp.width + 'x' + vp.height});
      r.fulfill({status:204, body:''});
    });
    return {ctx, p};
  }
  const haut = (p, sel)=> p.evaluate(s=>{ const e = document.querySelector(s); return e ? e.getBoundingClientRect().top : null; }, sel);
  try {
    /* 1. Téléphone, arrivée depuis TikTok */
    let {ctx, p} = await contexte({width:390, height:844});
    await p.goto(BASE + '?src=tiktok'); await p.waitForTimeout(1500);
    const yPres = await haut(p, '.portail-pres'), yForm = await haut(p, '.portail-form'), yPlus = await haut(p, '.portail-plus');
    R.tel_promesse_puis_formulaire_puis_video = yPres !== null && yPres < yForm && yForm < yPlus;
    R.tel_bouton_demo_premier_ecran = await p.evaluate(()=>{ const a = document.querySelector('#portail-demo'); if (!a) return false; const r = a.getBoundingClientRect(); return r.bottom <= window.innerHeight && /(^|[?&])demo$/.test(a.getAttribute('href')); });
    R.tel_formulaire_commence_premier_ecran = yForm < 844;
    R.tel_pas_de_debordement = await p.evaluate(()=> document.documentElement.scrollWidth <= window.innerWidth + 1);
    R.src_retire_de_adresse = await p.evaluate(()=> !/src=/.test(location.search));
    R.compte_accueil_tiktok = appels.some(a=>a.corps.p_evenement === 'accueil' && a.corps.p_source === 'tiktok');
    R.aucun_cookie_envoye = appels.every(a=>!a.cookie);
    /* rechargement dans le même onglet : pas compté deux fois, provenance gardée */
    await p.reload(); await p.waitForTimeout(1000);
    R.une_fois_par_onglet = appels.filter(a=>a.corps.p_evenement === 'accueil').length === 1;
    /* « Créer un compte » */
    await p.click('#sy-vers-inscription'); await p.waitForTimeout(500);
    R.compte_creer = appels.some(a=>a.corps.p_evenement === 'creer' && a.corps.p_source === 'tiktok');
    await ctx.close();

    /* 2. Ordinateur, arrivée depuis Instagram (site d'origine, sans ?src) */
    ({ctx, p} = await contexte({width:1280, height:800}, {extraHTTPHeaders:{}}));
    await p.goto(BASE, {referer: 'https://l.instagram.com/'}); await p.waitForTimeout(1500);
    R.pc_formulaire_a_droite = await p.evaluate(()=>{ const f = document.querySelector('.portail-form').getBoundingClientRect(), pr = document.querySelector('.portail-pres').getBoundingClientRect(); return f.left > pr.right; });
    R.pc_video_sous_promesse = await p.evaluate(()=>{ const v = document.querySelector('.portail-plus').getBoundingClientRect(), pr = document.querySelector('.portail-pres').getBoundingClientRect(); return v.top >= pr.bottom - 1 && Math.abs(v.left - pr.left) < 2; });
    R.pc_bouton_demo_visible = await p.locator('#portail-demo').isVisible();
    R.compte_accueil_instagram = appels.some(a=>a.ctx === '1280x800' && a.corps.p_evenement === 'accueil' && a.corps.p_source === 'instagram');
    await ctx.close();

    /* 3. Une provenance inconnue devient « autre » */
    ({ctx, p} = await contexte({width:1280, height:801}));
    await p.goto(BASE + '?src=n_importe_quoi'); await p.waitForTimeout(1200);
    R.provenance_inconnue_autre = appels.some(a=>a.ctx === '1280x801' && a.corps.p_source === 'autre');
    await ctx.close();

    /* 4. La démo : comptée, puis « Créer mon atelier gratuit » */
    ({ctx, p} = await contexte({width:390, height:845}));
    await p.goto(BASE + '?demo&src=tiktok'); await p.waitForTimeout(1800);
    R.compte_demo = appels.some(a=>a.ctx === '390x845' && a.corps.p_evenement === 'demo' && a.corps.p_source === 'tiktok');
    R.demo_toujours_active = await p.evaluate(()=> /(^|[?&])demo(&|$)/.test(location.search.replace(/^\?/, '?')) || /demo/.test(location.search));
    /* salutation cohérente */
    const h1 = (await p.locator('#main h1').first().innerText()).trim();
    const attendu = await p.evaluate(()=>{ const h = new Date().getHours(); return h >= 18 || h < 5 ? 'Bonsoir' : 'Bonjour'; });
    R.salutation_titre_selon_heure = h1.indexOf(attendu) === 0;
    R.bouton_creer_dans_bandeau = await p.locator('.bandeau-demo button', {hasText:'Créer mon atelier gratuit'}).isVisible();
    await p.locator('.bandeau-demo button', {hasText:'Créer mon atelier gratuit'}).click();
    await p.waitForTimeout(2000);
    R.inscription_ouverte = await p.locator('#sy-i-pseudo').isVisible();
    R.adresse_nettoyee = await p.evaluate(()=> !/inscription|demo/.test(location.search));
    R.provenance_suit_inscription = appels.some(a=>a.ctx === '390x845' && a.corps.p_evenement === 'creer' && a.corps.p_source === 'tiktok');
    await ctx.close();
    /* 5. Poste de développement : rien n'est compté sans demande explicite */
    ({ctx, p} = await contexte({width:1280, height:802}, null, true));
    await p.goto(BASE + '?src=tiktok'); await p.waitForTimeout(1200);
    R.poste_local_rien_compte = !appels.some(a=>a.ctx === '1280x802');
    await ctx.close();
  } catch(e){ console.log('Error:', e.message.slice(0, 300)); }
  R.erreurs = errs;
  console.log(JSON.stringify(R, null, 1));
  await b.close();
})();
