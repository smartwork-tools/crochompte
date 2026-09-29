/* V41 — « Mes créations » épurée et cohérente : en-tête « d'après ta fiche »,
   prix cible propre à chaque pièce (à ce prix, le gain est nul), moins de
   tuiles, pas de filtre vide, temps passé face au temps prévu. */
const {chromium} = require('./outils').playwright;
const path = require('path');
const {graine} = require('./aide.js');
const R = {}; const errs = [];
async function page(b){
  const p = await b.newPage({serviceWorkers:'block', viewport:{width:1280, height:900}});
  p.on('pageerror', e=>errs.push(e.message));
  p.on('dialog', d=>d.dismiss());
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
const dans = (p, fn) => p.evaluate(code => window.__eval('(' + code + ')()'), fn.toString());

(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  try {
    const p = await page(b);
    await graine(p);
    await dans(p, function(){
      state.reglages.mode = "complet"; state.reglages.confirmeLe = Date.now();
      var c1 = nouvelleCommande(); c1.client = {nom:'Marie', contact:'', note:''}; c1.cid = 'c1'; c1.prixConvenu = 30; c1.qte = 1; c1.statut = 'acceptee'; c1.brouillon = false;
      var c2 = nouvelleCommande(); c2.client = {nom:'Zoé', contact:'', note:''}; c2.cid = 'c1'; c2.prixConvenu = 90; c2.qte = 1; c2.statut = 'acceptee'; c2.brouillon = false;
      window.__c1 = c1.id;
      sauverTout(); view.cmdVue = null; view.fCmd = 'tous'; view.cmdQ = ''; aller('commandes');
    });
    await p.waitForTimeout(300);

    /* tris : bouton sens + choix du critère */
    R.tri_present = (await p.locator('.tri-barre[data-cle="cmd"]').count()) === 1;
    const ordre = async () => p.$$eval('#main table.t-cmd tbody tr', xs => xs.map(x => x.textContent.replace(/\s+/g,' ')));
    await p.selectOption('.tri-barre[data-cle="cmd"] select', 'client'); await p.waitForTimeout(200);
    const sens = p.locator('.tri-barre[data-cle="cmd"] .tri-sens');
    const t0 = await sens.textContent();
    await sens.click(); await p.waitForTimeout(200);
    R.tri_sens_bascule = (await sens.textContent()) !== t0;
    const o1 = await ordre();
    await sens.click(); await p.waitForTimeout(200);
    const o2 = await ordre();
    R.tri_inverse_l_ordre = o1.length === 2 && o2.length === 2 && o1[0] === o2[1];

    /* vérifications de saisie sur la commande */
    await dans(p, function(){ view.cmdVue = window.__c1; aller('commandes'); });
    await p.waitForTimeout(300);
    const err = async sel => (await p.locator(sel).evaluate(i => (i.closest('label').querySelector('.champ-err')||{}).textContent || ''));
    await p.fill('[data-c="contact"]', 'abc'); await p.locator('[data-c="contact"]').blur();
    R.contact_invalide = /ni à un e-mail/.test(await err('[data-c="contact"]'));
    await p.fill('[data-c="contact"]', 'marie@exemple.fr'); await p.locator('[data-c="contact"]').blur();
    R.contact_email_ok = (await err('[data-c="contact"]')) === '';
    await p.fill('[data-c="contact"]', '06 12 34 56 78'); await p.locator('[data-c="contact"]').blur();
    R.contact_tel_ok = (await err('[data-c="contact"]')) === '';
    await p.fill('[data-c="qte"]', '2.5'); await p.locator('[data-c="qte"]').blur();
    R.qte_entier = /entier/.test(await err('[data-c="qte"]'));
    await p.fill('[data-c="qte"]', '1'); await p.locator('[data-c="qte"]').blur();
    await p.evaluate(()=>{ var i=document.querySelector('[data-c="prixConvenu"]'); i.focus(); i.value='-4'; i.dispatchEvent(new Event('input',{bubbles:true})); i.dispatchEvent(new Event('change',{bubbles:true})); i.blur(); });
    await p.waitForTimeout(150);
    /* le signe moins est refusé dès la frappe ; un prix vidé est signalé */
    R.prix_moins_refuse = (await p.locator('[data-c="prixConvenu"]').inputValue()) === '4';
    await p.fill('[data-c="prixConvenu"]', ''); await p.locator('[data-c="prixConvenu"]').blur();
    R.prix_vide_signale = /nécessaire/.test(await err('[data-c="prixConvenu"]'));
    await p.click('[data-c="prixConvenu"]'); await p.fill('[data-c="prixConvenu"]', '30');
    /* SIREN : seulement pour une professionnelle, avec clé de contrôle */
    await p.locator('.cmd-plus summary').click(); await p.waitForTimeout(150);
    await p.check('[data-c="clientePro"]'); await p.waitForTimeout(150);
    await p.fill('[data-c="siren"]', '123456789'); await p.locator('[data-c="siren"]').blur();
    R.siren_cle_fausse = /n'existe pas|9 chiffres/.test(await err('[data-c="siren"]'));
    await p.fill('[data-c="siren"]', '732 829 320'); await p.locator('[data-c="siren"]').blur();
    R.siren_valide = (await err('[data-c="siren"]')) === '';
    await p.uncheck('[data-c="clientePro"]'); await p.waitForTimeout(150);

    /* bouton Enregistrer : refuse avec une erreur, accepte quand tout est bon */
    await p.fill('[data-c="contact"]', 'zzz'); 
    const bt = p.locator('#main .enreg button', {hasText:'Enregistrer'}).first();
    R.bouton_enregistrer_present = (await bt.count()) === 1;
    await bt.click(); await p.waitForTimeout(200);
    R.enregistrer_refuse = /à corriger/.test(await p.locator('#main .enreg-etat').first().textContent());
    await p.fill('[data-c="contact"]', 'marie@exemple.fr');
    await bt.click(); await p.waitForTimeout(200);
    R.enregistrer_accepte = /Enregistré à \d\d:\d\d/.test(await p.locator('#main .enreg-etat').first().textContent());

    /* matière : un prix illisible n'est pas enregistré, le formulaire d'ajout refuse */
    await dans(p, function(){ view.cmdVue = null; view.sub = 'matieres'; aller('stock'); });
    await p.waitForTimeout(200);
    const nbAvant = await dans(p, function(){ return state.matieres.length; });
    const ouvre = p.getByRole('button', {name:/Ajouter une matière|Nouvelle matière/}).first();
    if (await ouvre.count()) { await ouvre.click(); await p.waitForTimeout(200); }
    if (await p.locator('#nm-nom').count()){
      await p.fill('#nm-prix', '-3');
      await p.getByRole('button', {name:'Ajouter cette matière'}).click(); await p.waitForTimeout(200);
      R.matiere_refusee = (await dans(p, function(){ return state.matieres.length; })) === nbAvant && /nom|nécessaire|minimum/i.test(await p.locator('#nm-nom').evaluate(i => (i.closest('label').querySelector('.champ-err')||{}).textContent || ''));
    } else R.matiere_refusee = 'formulaire introuvable';

    /* téléphone */
    await p.setViewportSize({width:390, height:844}); await p.waitForTimeout(300);
    R.tel_sans_debordement = await p.evaluate(()=> document.documentElement.scrollWidth <= window.innerWidth + 1);

    /* numéro de pièce stable */
    const nums = await dans(p, function(){
      var cr = state.creations[0]; state.pieces = [];
      var a = {id:'n1', cid:cr.id, prod:'afaire', com:'atelier', mesure:{}, sessions:[], cree:1000, maj:1000};
      var b2 = {id:'n2', cid:cr.id, prod:'afaire', com:'atelier', mesure:{}, sessions:[], cree:2000, maj:2000};
      state.pieces.push(b2, a);
      return [numeroPiece(a), numeroPiece(b2)];
    });
    R.numero_piece_stable = nums[0] === 1 && nums[1] === 2;
    await p.close();
  } catch (e) { R._echec = String(e && e.stack || e); }
  console.log(JSON.stringify(R, null, 1));
  console.log("ERREURS JS: " + (errs.length ? errs.join(" | ") : "aucune"));
  await b.close();
})();
