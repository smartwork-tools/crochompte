const {chromium} = require('./outils').playwright;
const path = require('path');
const R = {};
async function connecter(p){
  await p.route('**/cdn.jsdelivr.net/**', r=>r.fulfill({path:path.join(__dirname,'faux-supabase.js'),contentType:'application/javascript'}));
  await p.route('**/functions/v1/connexion', r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'AT',refresh_token:'RT'})}));
  await p.goto('http://127.0.0.1:8934/index.html'); await p.waitForTimeout(400);
  await p.fill('#sy-c-identifiant','LaineTest'); await p.fill('#sy-c-mdp','motdepasse123');
  await p.click('#sy-c-valider'); await p.waitForTimeout(900);
}
(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  const errs = [];
  // ordinateur
  let p = await b.newPage({serviceWorkers:'block', viewport:{width:1280, height:800}});
  p.on('pageerror', e=>errs.push('D:'+e.message));
  await connecter(p);
  R.ordi_pseudo_visible = await p.isVisible('.compte-entete .pseudo');
  R.ordi_pseudo = (await p.textContent('.compte-entete .pseudo').catch(()=>'')).trim();
  R.ordi_bouton_deconnexion = await p.isVisible('#entete-deconnexion');
  R.ordi_menu_cache = !(await p.isVisible('#menu-btn'));
  await p.click('nav >> text=Matières'); await p.waitForTimeout(300);
  R.ordi_deconnexion_partout = await p.isVisible('#entete-deconnexion');
  await p.screenshot({path:require('path').join(__dirname,'captures','entete-ordi.png'), clip:{x:0,y:0,width:1280,height:200}});
  await p.click('#entete-deconnexion'); await p.waitForTimeout(900);
  R.ordi_retour_portail = await p.isVisible('#sy-c-identifiant');
  R.ordi_entete_vide = !(await p.isVisible('#entete-deconnexion'));
  await p.close();
  // téléphone
  p = await b.newPage({serviceWorkers:'block', viewport:{width:390, height:844}, isMobile:true, hasTouch:true});
  p.on('pageerror', e=>errs.push('M:'+e.message));
  await connecter(p);
  R.tel_nav_cachee = !(await p.isVisible('nav#nav'));
  R.tel_bouton_menu = await p.isVisible('#menu-btn');
  await p.screenshot({path:require('path').join(__dirname,'captures','entete-tel.png')});
  await p.click('#menu-btn'); await p.waitForTimeout(300);
  R.tel_menu_ouvert = await p.isVisible('#menu-mobile .mm-panneau');
  R.tel_liste = (await p.$$eval('#mm-liste button', bs=>bs.map(b=>b.textContent))).join(' | ');
  R.tel_deconnexion_dans_menu = await p.isVisible('#menu-deconnexion');
  await p.screenshot({path:require('path').join(__dirname,'captures','menu-tel.png')});
  await p.click('#mm-liste >> text=Matières'); await p.waitForTimeout(300);
  R.tel_menu_referme = !(await p.isVisible('#menu-mobile .mm-panneau'));
  R.tel_navigue = (await p.textContent('#main h1')).trim();
  await p.click('#menu-btn'); await p.waitForTimeout(200);
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  R.tel_echap_ferme = !(await p.isVisible('#menu-mobile .mm-panneau'));
  await p.click('#menu-btn'); await p.waitForTimeout(200);
  await p.click('#menu-deconnexion'); await p.waitForTimeout(900);
  R.tel_retour_portail = await p.isVisible('#sy-c-identifiant');
  R.tel_menu_masque_au_portail = !(await p.isVisible('#menu-btn'));
  R.erreurs = errs;
  console.log(JSON.stringify(R,null,1));
  await b.close();
})();
