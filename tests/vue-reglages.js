const {chromium} = require('./outils').playwright;
const path = require('path');
const R = {};
async function connecter(p){
  await p.route('**/cdn.jsdelivr.net/**', r=>r.fulfill({path:path.join(__dirname,'faux-supabase.js'),contentType:'application/javascript'}));
  await p.route('**/functions/v1/connexion', r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'AT',refresh_token:'RT'})}));
  await p.goto('http://127.0.0.1:8934/index.html'); await p.waitForTimeout(400);
  await p.fill('#sy-c-identifiant','LaineTest'); await p.fill('#sy-c-mdp','motdepasse123');
  await p.click('#sy-c-valider'); await p.waitForTimeout(1200);
}
(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  const errs=[];
  let p = await b.newPage({serviceWorkers:'block', viewport:{width:1280, height:900}});
  p.on('pageerror', e=>errs.push('D:'+e.message));
  await connecter(p);
  await p.click('nav >> text=Réglages'); await p.waitForTimeout(400);
  R.rubriques = (await p.$$eval('.reg-item b', x=>x.map(e=>e.textContent))).join(' | ');
  R.badges = (await p.$$eval('.reg-item', x=>x.map(e=>e.textContent.replace(/\s+/g,' ').trim()).filter(t=>/à /.test(t)))).join(' || ');
  R.ouverte = (await p.textContent('.reg-tete h2')).trim();
  await p.screenshot({path:require('path').join(__dirname,'captures','reg-ordi-compte.png')});
  await p.click('.reg-item[data-section="activite"]'); await p.waitForTimeout(300);
  await p.screenshot({path:require('path').join(__dirname,'captures','reg-ordi-activite.png')});
  await p.click('.reg-item[data-section="donnees"]'); await p.waitForTimeout(300);
  await p.screenshot({path:require('path').join(__dirname,'captures','reg-ordi-donnees.png'), fullPage:true});
  // saisie : le taux horaire garde sa valeur et le focus
  await p.click('.reg-item[data-section="activite"]'); await p.waitForTimeout(300);
  await p.fill('[data-r="tauxHoraire"]', '18'); await p.waitForTimeout(400);
  await p.click('.reg-item[data-section="charges"]'); await p.waitForTimeout(200);
  await p.click('.reg-item[data-section="activite"]'); await p.waitForTimeout(200);
  R.taux_garde = await p.inputValue('[data-r="tauxHoraire"]');
  await p.close();
  p = await b.newPage({serviceWorkers:'block', viewport:{width:390, height:844}, isMobile:true, hasTouch:true});
  p.on('pageerror', e=>errs.push('M:'+e.message));
  await connecter(p);
  await p.click('#menu-btn'); await p.click('#mm-liste >> text=Réglages'); await p.waitForTimeout(400);
  R.tel_liste_seule = (await p.$$('.reg-contenu')).length === 0;
  await p.screenshot({path:require('path').join(__dirname,'captures','reg-tel-liste.png'), fullPage:true});
  await p.click('.reg-item[data-section="facturation"]'); await p.waitForTimeout(300);
  R.tel_retour_visible = await p.isVisible('.reg-retour');
  await p.screenshot({path:require('path').join(__dirname,'captures','reg-tel-fact.png')});
  await p.click('.reg-retour'); await p.waitForTimeout(300);
  R.tel_retour_liste = (await p.$$('.reg-contenu')).length === 0;
  // « Mon compte » depuis le menu ouvre la bonne rubrique
  await p.click('#menu-btn'); await p.click('.mm-compte >> text=Mon compte'); await p.waitForTimeout(400);
  R.tel_mon_compte = (await p.textContent('.reg-tete h2').catch(()=>'')).trim();
  R.erreurs = errs;
  console.log(JSON.stringify(R,null,1));
  await b.close();
})();
