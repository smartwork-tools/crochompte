/* V63 — présentation vidéo sur l'écran de connexion, page « Qui sommes-nous »,
   et appli traduisible (français par défaut, anglais complet ; arabe et
   chinois cachés tant que leur traduction n'est pas terminée). */
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
  if (o.langue) await p.addInitScript(l => { try{ if (!sessionStorage.getItem('t63')){ sessionStorage.setItem('t63','1'); localStorage.setItem('crochompte-langue', l); } }catch(e){} }, o.langue);
  await p.goto('http://127.0.0.1:8934/index.html'); await p.waitForTimeout(700);
  if (o.portail) return p;
  if (await p.locator('#sy-c-identifiant').count()){ await p.fill('#sy-c-identifiant','LaineTest'); await p.fill('#sy-c-mdp','motdepasse123'); await p.click('#sy-c-valider'); await p.waitForTimeout(1000); }
  return p;
}
const dans = (p, fn, a) => p.evaluate(([code, x]) => window.__eval('(' + code + ')')(x), [fn.toString(), a === undefined ? null : a]);
const txt = async (p, sel) => ((await p.locator(sel).first().textContent()) || '').replace(/ | /g, ' ');
(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  try {
    /* 1. Portail : bouton vidéo et lien « Qui sommes-nous » */
    const p0 = await page(b, {portail:true});
    R.bouton_video = await p0.locator('#portail-video').isVisible();
    await p0.click('#portail-video'); await p0.waitForTimeout(300);
    R.video_ouverte = await p0.evaluate(()=>{ const v = document.querySelector('video'); return !!v && /media\/presentation\.mp4/.test(v.currentSrc || v.querySelector('source')?.src || v.src); });
    await p0.keyboard.press('Escape'); await p0.waitForTimeout(200);
    R.video_fermee = (await p0.locator('video').count()) === 0;
    R.lien_qui_sommes_nous = (await p0.locator('a[href="a-propos.html"]').count()) >= 1;
    R.fichiers_video = fs.existsSync(path.join(__dirname,'..','media','presentation.mp4')) && fs.existsSync(path.join(__dirname,'..','media','presentation-poster.jpg'));
    await p0.goto('http://127.0.0.1:8934/a-propos.html'); await p0.waitForTimeout(150);
    const ap = await p0.locator('main').textContent();
    R.page_a_propos = /Karim/.test(ap) && /Domitille/.test(ap) && await p0.evaluate(()=>document.documentElement.scrollWidth - innerWidth <= 1);
    await p0.close();

    /* 2. Français par défaut, sélecteur : seulement les langues terminées */
    const p = await page(b);
    R.francais_par_defaut = await p.evaluate(()=>document.documentElement.lang === 'fr');
    R.selecteur_fr_en = JSON.stringify(await p.$$eval('#langue-sel option', os => os.map(o => o.value))) === '["fr","en"]';
    await p.close();

    /* 3. Une langue pas terminée, demandée quand même : on reste en français */
    const pz = await page(b, {langue:'ar'});
    R.arabe_pas_propose = await pz.evaluate(()=>document.documentElement.lang === 'fr' && document.documentElement.dir !== 'rtl');
    await pz.close();

    /* 4. Anglais : l'appli est traduite, nombres à l'anglaise */
    const pe = await page(b, {langue:'en'});
    await pe.waitForTimeout(500);
    R.anglais_lang = await pe.evaluate(()=>document.documentElement.lang === 'en');
    for (const t of ['accueil','creations','commandes','stock','indicateurs','reglages']){
      await dans(pe, function(t){ aller(t); }, t); await pe.waitForTimeout(350);
    }
    await dans(pe, function(){ aller('creations'); }); await pe.waitForTimeout(400);
    const m = await txt(pe, '#main');
    R.anglais_creations = !/Mes créations|Nouvelle création/.test(m);
    R.anglais_menu = /Home|Dashboard/.test(await txt(pe, 'body')) && !/Mes ventes/.test(await txt(pe, 'nav'));
    R.anglais_separateur = await pe.evaluate(()=>window.__eval('sepDecimal()') === '.');
    R.manques_anglais = await pe.evaluate(()=>{ window.CrochompteI18n.releverManques(); return window.CrochompteI18n.manques().filter(x => /[a-zà-ÿ]{4,} [a-zà-ÿ]{3,}/i.test(x) && /[éèàêç]|\b(les|des|une|pour|avec|dans|ton|tes)\b/.test(x)).length; }) <= 3;
    /* retour au français */
    await pe.selectOption('#langue-sel', 'fr'); await pe.waitForTimeout(900);
    R.retour_francais = await pe.evaluate(()=>document.documentElement.lang === 'fr' && localStorage.getItem('crochompte-langue') === 'fr');
    await pe.close();
  } catch(e){ console.log('Error:', e.message); }
  console.log(JSON.stringify(R, null, 2));
  console.log('ERREURS JS: ' + (errs.length ? errs.join(' | ') : 'aucune'));
  await b.close();
})();
