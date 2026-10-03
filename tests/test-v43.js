/* V43 — écriture neutre, un seul nom par notion, messages allégés : plus de
   « connectée », colonnes « Commandé par / Reçu / Reste à recevoir », étapes
   cohérentes, un seul message de stock, « Prix conseillé » partout. */
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
    /* 1. Plus de message « connectée » quand tout va bien ; le menu dit « Session ouverte » */
    const corps = await p.textContent('body');
    R.pas_de_toast_connexion = !/connectée/i.test(corps) && !(await p.locator('.toast').allTextContents()).join(' ').match(/connect/i);
    R.menu_session_ouverte = /Session ouverte/.test(corps);

    /* 2. Aucun texte genré visible sur les écrans principaux */
    const genre = /\b(connectée|déconnectée|cliente|clientes|créatrice|créatrices|utilisatrice|utilisatrices|autrice|artisane|artisanes|toi seule|sous-payée|particulière|professionnelle)\b/i;
    const fautes = [];
    for (const t of ['accueil','catalogue','creations','commandes','patrons','stock','indicateurs','reglages']){
      await dans(p, function(t){ allerOnglet(t); }, t); await p.waitForTimeout(150);
      const txt = await p.textContent('#main');
      const m = txt.match(genre); if (m) fautes.push(t + ':' + m[0]);
    }
    for (const s of ['activite','charges','canaux','facturation','donnees']){
      await dans(p, function(s){ view.regSection = s; aller('reglages', {garderVue:true}); }, s);
      const m = (await p.textContent('#main')).match(genre); if (m) fautes.push('reg-' + s + ':' + m[0]);
    }
    R.ecrans_sans_texte_genre = fautes.length ? fautes.join(' | ') : true;

    /* 3. Commande : libellés neutres, étapes cohérentes, argent « reçu / reste à recevoir » */
    await dans(p, function(){
      state.reglages.mode = "complet"; state.reglages.confirmeLe = Date.now();
      var c = nouvelleCommande(); c.client = {nom:'Sam', contact:'', note:''}; c.cid = 'c1'; c.prixConvenu = 30; c.qte = 1; c.statut = 'livree'; c.brouillon = false;
      c.paiements = [{montant:30, date:new Date().toISOString().slice(0,10), saisiLe:Date.now()}]; c.factureNum = 'K7R2M-2026-0001';
      window.__c = c.id; sauverTout(); view.cmdVue = null; view.fCmd = 'tous'; aller('commandes');
    });
    await p.waitForTimeout(300);
    const tete = await p.textContent('#main thead');
    R.colonnes_neutres = /Commandé par/.test(tete) && /Reçu/.test(tete) && /(Reste à recevoir|À recevoir)/.test(tete) && !/Cliente|Versé|Reste dû/.test(tete);
    R.etape_payee_en_entier = (await p.locator('#main tbody tr', {hasText:'Sam'}).locator('.chip', {hasText:'Payée en entier'}).count()) === 1;
    const opts = await dans(p, function(){ return STATUTS_CMD.map(function(s){ return s.nom; }); });
    R.statuts_parlent_comme_les_etapes = opts.indexOf('À fabriquer') >= 0 && opts.indexOf('Prête') >= 0 && opts.indexOf('Acceptée') < 0 && opts.indexOf('Terminée') < 0;
    await dans(p, function(){ view.cmdVue = window.__c; aller('commandes'); }); await p.waitForTimeout(300);
    const det = await p.textContent('#main');
    R.formulaire_neutre = /Commandé par/.test(det) && /Achat professionnel/.test(det) && /Déjà reçu/.test(det) && !/cliente/i.test(det);

    /* 4. Un seul message de stock, même pour plusieurs sorties */
    await dans(p, function(){ allerOnglet('creations'); state.matieres[0].mouv = [{d: Date.now(), t:'entree', q:100, p:5, pu:0.05, sa:100}];   /* V55 : stock suivi */
      prevenirManques(['Coton DK']); prevenirManques(['Ouate', 'Fil noir']); prevenirManques(['Coton DK']); });
    await p.waitForTimeout(200);
    const toasts = await p.locator('.toast').allTextContents();
    R.un_seul_message_stock = toasts.filter(t => /stock négatif/.test(t)).length === 1 && /3 matières/.test(toasts.join(' '));

    /* 5. Vocabulaire : un seul nom */
    await dans(p, function(){ ouvrirFiche('c1'); }); await p.waitForTimeout(300);
    const f = await p.textContent('#main');
    R.prix_conseille_unique = /Prix conseillé/.test(f) && !/Prix juste|Prix cible|Prix pour atteindre/.test(f);
    if (!R.prix_conseille_unique) R._dbg = (f.match(/.{40}Prix (juste|cible|pour atteindre).{40}|.{30}conseill.{30}/g) || []).slice(0,4);
    R.etape_pas_poste = /Où tu la vends/.test(f) && !/Poste de travail|Canal de vente/.test(f);
    await p.close();
  } catch (e) { R._echec = String(e && e.stack || e); }
  console.log(JSON.stringify(R, null, 1));
  console.log("ERREURS JS: " + (errs.length ? errs.join(" | ") : "aucune"));
  await b.close();
})();
