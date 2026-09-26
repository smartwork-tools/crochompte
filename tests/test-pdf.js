const {chromium} = require('./outils').playwright;
const path = require('path');
const {graine} = require('./aide.js');
(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  const p = await b.newPage({serviceWorkers:'block', viewport:{width:1200, height:900}});
  const R = {}, errs = [];
  p.on('pageerror', e=>errs.push(e.message));
  p.on('console', m=>{ if (m.type()==='error') errs.push('console: '+m.text()); });
  await p.route('**/cdn.jsdelivr.net/**', r=>r.fulfill({path:path.join(__dirname,'faux-supabase.js'),contentType:'application/javascript'}));
  await p.route('**/functions/v1/connexion', r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'AT',refresh_token:'RT'})}));
  await p.goto('http://127.0.0.1:8934/index.html'); await p.waitForTimeout(400);
  await p.fill('#sy-c-identifiant','LaineTest'); await p.fill('#sy-c-mdp','motdepasse123');
  await p.click('#sy-c-valider'); await p.waitForTimeout(900);
  await graine(p);
  const pdf = path.join(__dirname, 'patron-test.pdf');
  // 1. Mes patrons → « Importer un PDF » crée le patron
  await p.click('#nav >> text=Mes patrons'); await p.waitForTimeout(300);
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('button:has-text("Importer un PDF")')]);
  await fc.setFiles(pdf);
  await p.waitForFunction(()=> (window.CrochomptePont.lire().patrons||[]).some(x=>(x.pages||[]).length===3), null, {timeout:30000});
  await p.waitForTimeout(500);
  const pat = await p.evaluate(()=> window.CrochomptePont.lire().patrons[0]);
  R.patron_cree = pat.titre === 'patron-test';
  R.trois_pages = pat.pages.length === 3;
  R.texte_extrait = /Rang 1 : 6 ms/.test(pat.texte) && /Rang 21/.test(pat.texte);
  R.fiche_patron_ouverte = (await p.textContent('#main')).includes('Les pages du patron');
  await p.waitForTimeout(600);
  R.images_affichees = await p.evaluate(()=> [...document.querySelectorAll('.pages img')].filter(i=>!i.hidden && i.naturalWidth>500).length);
  await p.screenshot({path:path.join(__dirname,'captures','pdf-patron.png'), fullPage:false});
  await p.locator('.pages img').first().click(); await p.waitForTimeout(300);
  R.visionneuse_ouverte = await p.isVisible('.visio') && (await p.textContent('.visio-num')) === 'Page 1 sur 3';
  await p.click('.visio [data-v="suiv"]');
  R.page_suivante = (await p.textContent('.visio-num')) === 'Page 2 sur 3';
  await p.screenshot({path:path.join(__dirname,'captures','visio.png')});
  await p.goBack(); await p.waitForTimeout(500);
  R.precedent_ferme_visionneuse = !(await p.isVisible('.visio')) && (await p.textContent('#main')).includes('Les pages du patron');
  // 2. Photo d'une création depuis un PDF
  await p.click('#nav >> text=Mes créations'); await p.waitForTimeout(300);
  await p.locator('table tbody tr').first().click(); await p.waitForTimeout(400);
  const [fc2] = await Promise.all([p.waitForEvent('filechooser'), p.click('button:has-text("Ajouter une photo")')]);
  await fc2.setFiles(pdf);
  await p.waitForTimeout(3000);
  R.photo_creation_depuis_pdf = await p.evaluate(()=> window.CrochomptePont.lire().creations.some(c=>!!c.photo));
  // 3. fichier invalide
  R.erreurs = errs;
  console.log(JSON.stringify(R,null,1));
  await b.close();
})();
