const {chromium} = require('./outils').playwright;
const path = require('path'); const fs = require('fs'); const {graine} = require('./aide.js');
(async()=>{
  const b = await chromium.launch(require('./outils').lancement);
  const p = await b.newPage({serviceWorkers:'block', viewport:{width:1440, height:900}});
  p.on('pageerror', e=>console.log('ERREUR JS', e.message));
  await p.route('**/app.js*', async r=>{ const src = fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8'); const i = src.lastIndexOf('})();');
    await r.fulfill({contentType:'text/javascript; charset=utf-8', body: src.slice(0,i) + 'window.__eval = function(c){ return eval(c); };\n' + src.slice(i)}); });
  await p.route('**/vendor/supabase/**', r=>r.fulfill({path:path.join(__dirname,'faux-supabase-persistant.js'),contentType:'application/javascript'}));
  await p.route('**/functions/v1/connexion', r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'AT',refresh_token:'RT'})}));
  await p.goto('http://127.0.0.1:8934/index.html'); await p.waitForTimeout(500);
  if (await p.locator('#sy-c-identifiant').count()){ await p.fill('#sy-c-identifiant','LaineTest'); await p.fill('#sy-c-mdp','motdepasse123'); await p.click('#sy-c-valider'); await p.waitForTimeout(1000); }
  await graine(p);
  const out = await p.evaluate(()=>window.__eval('(function(){ appliquerProfil("pro",{sansRendu:true}); var r=state.reglages; r.confirmeLe=Date.now(); r.statut="micro"; r.raisonSociale="Laine & Lune"; r.adresse="12 rue des Tisserands\\n69004 Lyon"; r.siret="912 345 678 00019"; r.contact="bonjour@laine-et-lune.fr";'+
    'var t=Date.now(); var c=nouvelleCommande(); c.client={nom:"Zoé Marchand", contact:"06 12 34 56 78", adresse:"4 place des Terreaux, 69001 Lyon"}; c.cid="c1"; c.qte=2; c.prixConvenu=32; c.statut="terminee"; c.accordLe=t-5*864e5; c.datePromise=new Date(t+5*864e5).toISOString().slice(0,10); c.versement={montant:20,date:null,type:"acompte"}; c.fraisLivraison=6.5; c.personnalisee=true; delete c.brouillon;'+
    'var m=state.matieres[0]; mouvementMatiere(m,"entree",200,9.6,"Mercerie"); var p1={id:"h3",cid:"c2",prod:"termine",com:"vendu",prix:28,mesure:{crochet:140},sessions:[],cree:t-4e6,maj:t,venduLe:t-1e5,termineLe:t-2e5,sortie:true}; state.pieces.push(p1);'+
    'sauverTout(); var res={}; ["devis","commande","livraison"].forEach(function(ty){ var F=instantaneDocument(c,ty); res[ty]=Array.from(new Uint8Array(octetsDocument(F))); });'+
    'var d=new Date(); var R=donneesReleve(d.getFullYear(), d.getMonth()); res.releve=Array.from(new Uint8Array(octetsDocument(R))); res.apercu=R.totalRecettes+" / "+R.totalAchats+" / "+R.resultat; return res; })()'));
  for (const k of ['devis','commande','livraison','releve']) fs.writeFileSync('/tmp/doc-'+k+'.pdf', Buffer.from(out[k]));
  console.log('apercu', out.apercu);
  await b.close();
})();
