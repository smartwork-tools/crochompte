const {chromium} = require('./outils').playwright;
const path = require('path');
(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  const p = await b.newPage({serviceWorkers:'block', viewport:{width:1100, height:900}});
  const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  await p.route('**/cdn.jsdelivr.net/**', r=>r.fulfill({path:path.join(__dirname,'faux-supabase.js'),contentType:'application/javascript'}));
  await p.goto('http://127.0.0.1:8934/index.html#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
  await p.waitForTimeout(900);
  const t = await p.textContent('#main');
  const R = {
    message_clair: t.includes("Ce lien n'est plus valable"),
    explique_quoi_faire: t.includes('réinscris-toi avec la même adresse'),
    pas_de_phrase_hors_sujet: !t.includes('Tes données restent intactes'),
    adresse_nettoyee: !(await p.evaluate(()=>location.hash)).includes('error'),
  };
  await p.screenshot({path:require('path').join(__dirname,'captures','lien-perime.png'), clip:{x:0,y:0,width:1100,height:520}});
  await p.click('#sy-c-valider');   // une action : le message doit céder la place
  await p.waitForTimeout(500);
  R.efface_apres_action = !(await p.textContent('#main')).includes("Ce lien n'est plus valable");
  R.erreurs = errs;
  console.log(JSON.stringify(R,null,1));
  await b.close();
})();
