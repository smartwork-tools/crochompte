/* Le scénario du marché : l'artisane s'est déjà connectée chez elle, puis elle
   ouvre l'outil sans réseau. Elle doit pouvoir travailler, et son travail doit
   repartir au retour du réseau — pas être recouvert par la version du serveur. */
const {chromium} = require('./outils').playwright;
const path = require('path');
const R = {};

(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  const ctx = await b.newContext({serviceWorkers:'block', viewport:{width:1100, height:1200}});
  const errs = [];

  /* ── 1. une première visite NORMALE, en ligne : la session est mémorisée ── */
  let p = await ctx.newPage();
  p.on('pageerror', e => errs.push('A:' + e.message));
  await p.route('**/cdn.jsdelivr.net/**', r=>r.fulfill({path:path.join(__dirname,'faux-supabase-persistant.js'),contentType:'application/javascript'}));
  await p.route('**/functions/v1/connexion', r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'AT',refresh_token:'RT'})}));
  await p.goto('http://127.0.0.1:8936/index.html');
  await p.waitForTimeout(400);
  await p.fill('#sy-c-identifiant','LaineTest');
  await p.fill('#sy-c-mdp','motdepasse123');
  await p.click('#sy-c-valider');
  await p.waitForTimeout(700);
  R.nav_apres_connexion = (await p.textContent('#nav')).trim().slice(0,90);
  R.connectee_en_ligne = (await p.textContent('#nav')).includes('Mes créations');
  R.session_memorisee = await p.evaluate(()=> !!localStorage.getItem('crochompte-v1.session'));
  await p.close();

  /* ── 2. retour SANS RÉSEAU : le module ne peut pas se charger du tout ── */
  p = await ctx.newPage();
  p.on('pageerror', e => errs.push('B:' + e.message));
  await p.route('**/cdn.jsdelivr.net/**', r=>r.abort());   // plus de réseau
  await p.goto('http://127.0.0.1:8936/index.html');
  await p.waitForTimeout(8200);                            // au-delà du délai de 7 s
  const t = await p.textContent('#main');
  R.nav_hors_ligne = (await p.textContent('#nav')).trim().slice(0,90);
  R.atelier_ouvert = (await p.textContent('#nav')).includes('Mes créations');
  R.bandeau_visible = t.includes('Tu travailles hors ligne');
  R.dit_que_ca_repartira = t.includes('dès que la connexion');
  R.pas_de_cul_de_sac = !t.includes("n'a pas pu se charger");

  /* elle crée une fiche, par l'interface, comme sur un marché */
  await p.click('button:has-text("Nouvelle création")');
  await p.waitForTimeout(400);
  await p.fill('#f-nom', 'Bonnet du marche c-marche');
  await p.click('button:has-text("Ajouter à mes créations")');
  await p.waitForTimeout(700);
  R.travail_enregistre = await p.evaluate(()=>
    (JSON.parse(localStorage.getItem('crochompte-v1')).creations||[]).some(c=>/c-marche/.test(c.nom||'')));
  R.file_dattente_posee = await p.evaluate(()=> !!localStorage.getItem('crochompte-v1.aEnvoyer'));
  R.file_porte_le_compte = await p.evaluate(()=>{
    try{ return !!JSON.parse(localStorage.getItem('crochompte-v1.aEnvoyer')).uid; }catch(e){ return false; }
  });
  await p.screenshot({path:require('path').join(__dirname,'captures','horsligne.png')});
  await p.close();

  /* ── 3. le réseau revient : le travail doit PARTIR, pas être recouvert ── */
  p = await ctx.newPage();
  p.on('pageerror', e => errs.push('C:' + e.message));
  let envoye = null;
  await p.route('**/cdn.jsdelivr.net/**', r=>r.fulfill({path:path.join(__dirname,'faux-supabase-persistant.js'),contentType:'application/javascript'}));
  await p.goto('http://127.0.0.1:8936/index.html');
  await p.waitForTimeout(1500);
  envoye = await p.evaluate(()=> window.__fauxEnvois || null);
  R.envoi_declenche_au_retour = !!(envoye && envoye.length);
  R.envoi_contient_le_travail = !!(envoye && JSON.stringify(envoye).includes('c-marche'));
  R.travail_toujours_la = await p.evaluate(()=>
    (JSON.parse(localStorage.getItem('crochompte-v1')).creations||[]).some(c=>/c-marche/.test(c.nom||'')));

  R.erreurs = errs;
  console.log(JSON.stringify(R, null, 1));
  await b.close();
})().catch(e => { console.log(JSON.stringify({...R, _echec:String(e)}, null, 1)); process.exit(1); });
