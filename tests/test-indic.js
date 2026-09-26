const {chromium} = require('./outils').playwright;
const path = require('path');
const R = {};
const {graine} = require('./aide.js');
async function connecter(p){
  await p.route('**/cdn.jsdelivr.net/**', r=>r.fulfill({path:path.join(__dirname,'faux-supabase.js'),contentType:'application/javascript'}));
  await p.route('**/functions/v1/connexion', r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'AT',refresh_token:'RT'})}));
  await p.goto('http://127.0.0.1:8934/index.html'); await p.waitForTimeout(400);
  await p.fill('#sy-c-identifiant','LaineTest'); await p.fill('#sy-c-mdp','motdepasse123');
  await p.click('#sy-c-valider'); await p.waitForTimeout(1100);
}
(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  const errs=[];
  // 1. compte neuf : seulement les exemples
  let p = await b.newPage({serviceWorkers:'block', viewport:{width:1280, height:1000}});
  p.on('pageerror', e=>errs.push('1:'+e.message));
  await connecter(p);
  R.onglet_visible_mode_simple = (await p.textContent('#nav')).includes('Indicateurs');
  await p.click('#nav >> text=Indicateurs'); await p.waitForTimeout(400);
  let t = await p.textContent('#main');
  R.neuf_guide = t.includes('se remplissent tout seuls');
  R.neuf_pas_dargent_fictif = (await p.locator('#main .tile').count()) === 0;
  await p.screenshot({path:require('path').join(__dirname,'captures','ind-neuf.png')});
  await p.close();

  // 2. à la commande, sans Atelier
  p = await b.newPage({serviceWorkers:'block', viewport:{width:1280, height:1000}});
  p.on('pageerror', e=>errs.push('2:'+e.message));
  await connecter(p);
  await graine(p);
  await p.evaluate(()=>{
    const s = window.CrochomptePont.lire();
    s.reglages.statut = "marchandises"; s.reglages.cotisations = 12.3; s.reglages.mode = "simple";
    const d = new Date(), iso = x => x.toISOString().slice(0,10);
    const ceMois = new Date(d.getFullYear(), d.getMonth(), 2);
    const cid = s.creations[0].id;
    s.commandes = [
      {id:"k1", num:null, client:{nom:"Alice",contact:"",note:""}, cid:cid, libelle:"", variantes:"", personnalisee:true, clientePro:false,
       prixConvenu:120, fraisLivraison:0, versement:{montant:40, date:iso(ceMois), type:"acompte"},
       paiements:[{montant:80, date:iso(ceMois), moyen:"virement"}], dateCommande:ceMois.toISOString(), datePromise:"",
       statut:"livree", canal:"direct", note:"", accordLe:null, heuresEstimees:0, pieceId:null, factureNum:null, factureLe:null},
      {id:"k2", num:null, client:{nom:"Béa",contact:"",note:""}, cid:cid, libelle:"", variantes:"", personnalisee:false, clientePro:false,
       prixConvenu:90, fraisLivraison:0, versement:{montant:30, date:iso(ceMois), type:"arrhes"},
       paiements:[], dateCommande:ceMois.toISOString(), datePromise:"", statut:"encours", canal:"direct", note:"",
       accordLe:null, heuresEstimees:4, pieceId:null, factureNum:null, factureLe:null}
    ];
    const m = s.matieres[0]; m.mouv = m.mouv || [];
    m.mouv.unshift({d: ceMois.getTime(), t:"entree", q:200, p:25, pu:0.125, sa:200, pmp:null, n:"Achat test"});
    window.CrochomptePont.ecrire(s);
  });
  await p.waitForTimeout(500);
  await p.click('#nav >> text=Indicateurs'); await p.waitForTimeout(500);
  t = await p.textContent('#main');
  R.cmd_encaisse_150 = t.includes('150,00');       // 40 + 80 + 30
  R.cmd_achats_25 = t.includes('25,00');
  R.cmd_cotis = t.includes('18,45');                // 150 × 12,3 %
  R.cmd_reste_60 = t.includes('60,00');             // Béa : 90 − 30
  R.cmd_seuils_commandes = t.includes('encaissés sur tes commandes');
  R.cmd_pas_de_production = !t.includes('Ce que tu as produit');
  R.cmd_rentabilite = t.includes('Ce qui te rapporte le plus');
  await p.screenshot({path:require('path').join(__dirname,'captures','ind-commandes.png'), fullPage:true});
  // période « Cette année »
  await p.click('.fchip >> text=Cette année'); await p.waitForTimeout(300);
  R.periode_annee_ok = (await p.textContent('.ind-groupe')).includes('cette année');
  await p.close();

  // 3. téléphone
  p = await b.newPage({serviceWorkers:'block', viewport:{width:390, height:844}, isMobile:true, hasTouch:true});
  p.on('pageerror', e=>errs.push('3:'+e.message));
  await connecter(p);
  await p.click('#menu-btn'); await p.click('#mm-liste >> text=Indicateurs'); await p.waitForTimeout(400);
  await p.screenshot({path:require('path').join(__dirname,'captures','ind-tel.png'), fullPage:true});
  R.tel_pas_de_debordement = await p.evaluate(()=> document.documentElement.scrollWidth <= window.innerWidth + 1);
  R.erreurs = errs;
  console.log(JSON.stringify(R,null,1));
  await b.close();
})();
