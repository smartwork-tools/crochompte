/* V65.2 — langues fiables (rapport de test B, M7) :
   1. Règle d'or du moteur : jamais une phrase moitié français moitié langue
      cible — si la traduction complète manque, le texte reste entièrement
      en français et il est relevé comme manquant.
   2. Les dictionnaires couvrent tous les textes des écrans : le relevé des
      manques ne doit remonter que des données (noms, e-mails), jamais un
      texte de l'application.
   3. Détecteur de mélange : sur chaque écran, aucun nœud de texte ne doit
      contenir à la fois des mots français de l'interface et la langue cible. */
const {chromium} = require('./outils').playwright;
const path = require('path'); const fs = require('fs');
const R = {}; const errs = [];
const LANGUES = ['en', 'ar', 'zh'];
async function pagePour(b, langue){
  const p = await b.newPage({serviceWorkers:'block', viewport:{width:1440, height:900}});
  p.on('pageerror', e=>errs.push(langue + ': ' + e.message));
  p.on('dialog', d=>d.dismiss());
  await p.route('**/app.js*', async r=>{
    const src = fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
    const i = src.lastIndexOf('})();');
    await r.fulfill({contentType:'text/javascript; charset=utf-8', body: src.slice(0,i) + 'window.__eval = function(c){ return eval(c); };\n' + src.slice(i)});
  });
  await p.route('**/vendor/supabase/**', r=>r.fulfill({path:path.join(__dirname,'faux-supabase-persistant.js'),contentType:'application/javascript'}));
  await p.goto('http://127.0.0.1:8934/index.html'); await p.waitForTimeout(600);
  await p.click('#portail-sans-compte'); await p.waitForTimeout(600);
  await p.getByText('Artisan ou artisane pro').click(); await p.getByText("C'est moi").click(); await p.waitForTimeout(400);
  while (await p.locator('.dlg-fond').count()){ await p.keyboard.press('Escape'); await p.waitForTimeout(200); }
  /* Atelier vivant : retards, acomptes, règlements, pertes, stand, chrono. */
  await p.evaluate(()=>window.__eval('(' + function(){
    var t0 = Date.now() - 90*864e5;
    state.reglages.statut='marchandises'; state.reglages.cotisations=12.4; state.reglages.confirmeLe=Date.now();
    state.fournisseurs=[{id:'f1',nom:'Mercerie Alpha',site:'',note:''}];
    for (var i=0;i<4;i++){ var m={id:'tm'+i,nom:'Fil Oro '+i,nomBase:'Fil Oro '+i,couleur:'',cat:'fil',prix:3,contenance:50,unite:'g',stock:100,seuil:60,pmp:0.06,mouv:[],perso:true,maj:Date.now(),variantes:[]};
      mouvementMatiere(m,'entree',100,6,'',{fid:'f1'}); state.matieres.push(m); }
    for (i=0;i<5;i++) state.creations.push({id:'tc'+i,nom:'Mod Alta '+i,lignes:[{mid:'tm'+(i%4),qte:40}],temps:{crochet:150},canal:i%2?'etsy':'marche',prix:30,expedition:0,migre:true,photo:null});
    for (i=0;i<12;i++){ var v=i<8; state.pieces.push({id:'tp'+i,cid:'tc'+(i%5),prod:v?'termine':'encours',com:v&&i%2?'vendu':'atelier',prix:v&&i%2?30:null,venduLe:v&&i%2?t0+i*864e5*5:null,paiement:'carte',mesure:{crochet:60},sessions:[],cree:t0,maj:Date.now(),sortie:v}); }
    var st=['devis','acceptee','encours','terminee','livree','annulee'];
    for (i=0;i<9;i++){ var c=nouvelleCommande(); c.client={nom:'Nora '+i,contact:'n'+i+'@x.fr'}; c.cid='tc'+(i%5); c.qte=1; c.prixConvenu=45; c.statut=st[i%6];
      c.accordLe=t0; c.dateCommande=new Date(t0).toISOString(); c.datePromise=new Date(Date.now()+((i%4)-2)*15*864e5).toISOString().slice(0,10);
      if (i%2) c.versement={montant:12,date:'2026-09-01',type:'acompte',moyen:'carte'};
      if (c.statut==='livree'){ c.livreeLe='2026-10-01'; c.paiements=[{montant:20,moyen:'cheque',date:'2026-10-02',saisiLe:t0}]; }
      delete c.brouillon; }
    state.chrono={pid:'tp9',poste:'crochet',debut:Date.now()-60000};
    sauverTout();
  }.toString() + ')()'));
  await p.waitForTimeout(300);
  await p.evaluate(l=>{ localStorage.setItem('crochompte-langue', l); }, langue);
  await p.reload(); await p.waitForTimeout(1400);
  return p;
}
/* Mélange = mots français de l'interface ET marqueur de la langue cible dans
   le même nœud (les noms de données du banc n'emploient aucun de ces mots). */
const detecteur = function(langue){
  const MOTS = /(^|[^a-z])(le|la|les|une|des|du|aux|et|pour|avec|sans|dans|deja|encore|jour|jours|retard|livree|livrees|facture|factures|commande|commandes|vente|ventes|pelote|pelotes|acompte|devis|chiffres|reglages|matiere|matieres)([^a-z]|$)/;
  const CIBLE = {
    en: /(^|[^a-z])(the|your|you|with|and|for|from|late|left|delivered|order|orders|sale|sales|price|stock|still|days|remaining|invoice|deposit)([^a-z]|$)/i,
    ar: /[؀-ۿ]/,
    zh: /[一-鿿]/
  }[langue];
  function sansAcc(x){ return x.toLowerCase().replace(/[àâä]/g,'a').replace(/[éèêë]/g,'e').replace(/[îï]/g,'i').replace(/[ôö]/g,'o').replace(/[ùûü]/g,'u').replace(/ç/g,'c'); }
  const problemes = [];
  const w = document.createTreeWalker(document.body, 4, null, false);
  let n;
  while ((n = w.nextNode())){
    if (n.parentNode && /SCRIPT|STYLE/.test(n.parentNode.tagName)) continue;
    const t = (n.data || '').replace(/\s+/g, ' ').trim();
    if (t.length < 4) continue;
    if (MOTS.test(sansAcc(t)) && CIBLE.test(t)) problemes.push(t.slice(0, 90));
  }
  return problemes.slice(0, 6);
};
(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  try {
    for (const langue of LANGUES){
      const p = await pagePour(b, langue);
      const ecrans = [
        ['accueil', 'aller("accueil")'],
        ['creations', 'aller("creations")'],
        ['commandes', 'view.cmdVue=null; aller("commandes")'],
        ['commande', 'view.cmdVue=commandes()[4].id; aller("commandes", {garderVue:true})'],
        ['ventes', 'view.ventesPeriode="tout"; aller("ventes")'],
        ['stock', 'view.sub="matieres"; aller("stock")'],
        ['historique', 'view.sub="stock"; aller("stock")'],
        ['indicateurs', 'aller("indicateurs")'],
        ['reglages', 'view.regSection="abonnement"; aller("reglages")']
      ];
      let melanges = [];
      let manquesInterface = [];
      for (const [nom, code] of ecrans){
        await p.evaluate(c=>window.__eval('(function(){ ' + c + ' })()'), code);
        await p.waitForTimeout(400);
        const mix = await p.evaluate(([f, l]) => (new Function('return ' + f)())(l), [detecteur.toString(), langue]);
        if (mix.length) melanges.push(nom + ': ' + mix.join(' || '));
        const mq = await p.evaluate(()=>{ const I = window.CrochompteI18n; I.releverManques(); return I.manques(); });
        /* seules les données du banc sont tolérées sans traduction */
        const interdit = mq.filter(x => !/^(Nora \d+|Fil Oro \d+|Mod Alta \d+|Mercerie Alpha|n\d+@x\.fr|LaineTest|C-\d{4}-\d{4}.*|Nora \d+(, Nora \d+)*\.?)$/.test(x));
        interdit.forEach(x => { if (manquesInterface.indexOf(x) === -1) manquesInterface.push(x); });
      }
      R['melange_' + langue] = melanges.length ? melanges.slice(0, 4) : 'aucun';
      R['manques_interface_' + langue] = manquesInterface.length ? manquesInterface.slice(0, 6) : 'aucun';
      R['traduit_' + langue] = await p.evaluate(()=>document.documentElement.lang !== 'fr' && !/Mes créations/.test(document.querySelector('#nav').textContent));

      /* Le moteur lui-même : un texte inconnu reste entier, jamais mélangé. */
      if (langue === 'en'){
        R.moteur_inconnu_reste_entier = await p.evaluate(()=>{
          const t = window.CrochompteI18n.t('Phrase inventée pour ce test avec des mots. Une deuxième phrase inventée aussi.');
          return t === 'Phrase inventée pour ce test avec des mots. Une deuxième phrase inventée aussi.';
        });
        R.moteur_segments_tout_ou_rien = await p.evaluate(()=>{
          /* un texte à segments dont une partie n'a pas de traduction reste
             ENTIÈREMENT français (pas un segment traduit, l'autre non) */
          const o = 'Texte inventé jamais vu · encore des mots pour le test · Zoé';
          return window.CrochompteI18n.t(o) === o;
        });
        R.moteur_gabarit_pelotes = await p.evaluate(()=>{
          const t = window.CrochompteI18n.t('3,8 pelotes (190 g)');
          return !/pelotes/.test(t) && /190/.test(t) && /3,8/.test(t);
        });
        R.moteur_traduction_normale = await p.evaluate(()=>{
          return window.CrochompteI18n.t('Mes créations') !== 'Mes créations';
        });
      }
      await p.close();
    }
  } catch(e){ console.log('Error:', e.message); }
  console.log(JSON.stringify(R, null, 2));
  console.log('ERREURS JS: ' + (errs.length ? errs.join(' | ') : 'aucune'));
  await b.close();
})();
