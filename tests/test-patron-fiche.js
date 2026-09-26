const {chromium} = require('./outils').playwright;
const path = require('path');
(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  const p = await b.newPage({serviceWorkers:'block', viewport:{width:1200, height:1000}});
  const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  await p.route('**/cdn.jsdelivr.net/**', r=>r.fulfill({path:path.join(__dirname,'faux-supabase.js'),contentType:'application/javascript'}));
  await p.route('**/functions/v1/connexion', r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'AT',refresh_token:'RT'})}));
  await p.goto('http://127.0.0.1:8934/index.html'); await p.waitForTimeout(400);
  await p.fill('#sy-c-identifiant','LaineTest'); await p.fill('#sy-c-mdp','motdepasse123');
  await p.click('#sy-c-valider'); await p.waitForTimeout(900);
  await require('./aide.js').graine(p);
  // un patron à moi
  await p.evaluate(()=>{
    const s = window.CrochomptePont.lire();
    s.patrons = [{id:"pp_1", titre:"Mon lapin", auteur:"Moi", origine:"", notes:"", texte:"Rang 1 : 6 ms dans un cercle magique. Rang 2 : 2 ms dans chaque maille (12).", pages:[], rang:0, cree:Date.now()}];
    window.CrochomptePont.ecrire(s);
  });
  await p.waitForTimeout(300);
  const R = {};
  // ouvrir une création existante
  await p.click('#nav >> text=Mes créations'); await p.waitForTimeout(300);
  const cid = await p.evaluate(()=> window.CrochomptePont.lire().creations[0].id);
  await p.locator('table tbody tr').first().click(); await p.waitForTimeout(400);
  R.selecteur_present = await p.isVisible('#f-patron');
  R.options = (await p.$$eval('#f-patron option', os=>os.map(o=>o.textContent))).join(' | ');
  await p.selectOption('#f-patron', 'pp_1'); await p.waitForTimeout(400);
  R.carte_patron_affichee = (await p.textContent('#main')).includes('Ton patron');
  await p.click('button:has-text("Enregistrer")'); await p.waitForTimeout(400);
  R.lien_enregistre = await p.evaluate((id)=> window.CrochomptePont.lire().creations.find(c=>c.id===id).patron, cid);
  // rouvrir : le lien est toujours là
  await p.locator('table tbody tr').first().click(); await p.waitForTimeout(400);
  R.rouvert_meme_patron = await p.inputValue('#f-patron');
  // côté Mes patrons, le lien apparaît aussi
  await p.screenshot({path:require('path').join(__dirname,'captures','patron-fiche.png'), clip:{x:0,y:100,width:1200,height:700}});
  // « Ajouter un nouveau patron »
  await p.selectOption('#f-patron', '__nouveau'); await p.waitForTimeout(500);
  R.nouveau_ouvre_patrons = (await p.textContent('#nav [aria-current="true"]')).trim();
  R.nouveau_relie_au_brouillon = await p.evaluate(()=> { const s=window.CrochomptePont.lire(); return s.patrons.length; });
  R.erreurs = errs;
  console.log(JSON.stringify(R,null,1));
  await b.close();
})();
