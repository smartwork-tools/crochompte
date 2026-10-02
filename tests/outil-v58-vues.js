const {chromium} = require('./outils').playwright;
const path = require('path'); const {graine} = require('./aide.js');
(async()=>{
  const b = await chromium.launch(require('./outils').lancement);
  const p = await b.newPage({serviceWorkers:'block', viewport:{width:1440, height:900}});
  p.on('pageerror', e=>console.log('ERREUR JS', e.message));
  await p.route('**/app.js*', async r=>{ const src = require('fs').readFileSync(path.join(__dirname,'..','app.js'),'utf8'); const i = src.lastIndexOf('})();');
    await r.fulfill({contentType:'text/javascript; charset=utf-8', body: src.slice(0,i) + 'window.__eval = function(c){ return eval(c); };\n' + src.slice(i)}); });
  await p.route('**/vendor/supabase/**', r=>r.fulfill({path:path.join(__dirname,'faux-supabase-persistant.js'),contentType:'application/javascript'}));
  await p.route('**/functions/v1/connexion', r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'AT',refresh_token:'RT'})}));
  await p.goto('http://127.0.0.1:8934/index.html'); await p.waitForTimeout(500);
  if (await p.locator('#sy-c-identifiant').count()){ await p.fill('#sy-c-identifiant','LaineTest'); await p.fill('#sy-c-mdp','motdepasse123'); await p.click('#sy-c-valider'); await p.waitForTimeout(1000); }
  await graine(p);
  await p.evaluate(()=>window.__eval('(function(){ appliquerProfil("pro",{sansRendu:true}); state.reglages.confirmeLe=Date.now(); state.reglages.tauxHoraire=12; state.reglages.mode="complet"; '+
    'var m=state.matieres[0]; ["jaune","rose","rouge","bleu","vert","noir","blanc","gris","orange","violet"].forEach(function(c,i){ mouvementMatiere(m,"inventaire",50+i,null,"t",{vid:creerVariante(m,c,"").id}); });'+
    'var t=Date.now(); state.pieces=[{id:"h1",cid:"c1",prod:"encours",com:"atelier",prix:32,mesure:{crochet:70},sessions:[],cree:t-2e6,maj:t},{id:"h2",cid:"c2",prod:"termine",com:"atelier",prix:28,mesure:{crochet:150},sessions:[],cree:t-3e6,maj:t,termineLe:t,sortie:true}];'+
    'var c=nouvelleCommande(); c.client={nom:"Zoé Marchand"}; c.cid="c1"; c.prixConvenu=32; c.statut="encours"; c.datePromise=new Date(t+5*864e5).toISOString().slice(0,10); delete c.brouillon;'+
    'var c2=nouvelleCommande(); c2.client={nom:"Léa Dubois"}; c2.cid="c3"; c2.prixConvenu=35; c2.statut="acceptee"; delete c2.brouillon;'+
    'var c3=nouvelleCommande(); c3.client={nom:"Marc Petit"}; c3.cid="c2"; c3.qte=3; c3.prixConvenu=28; c3.statut="livree"; c3.versement={montant:40,date:null,type:"acompte"}; delete c3.brouillon;'+
    'var c4=nouvelleCommande(); c4.client={nom:"Inès Garnier"}; c4.cid="c3"; c4.qte=2; c4.prixConvenu=35; c4.statut="devis"; delete c4.brouillon; sauverTout(); })()'));
  const shots = [['creations','cartes'],['creations','compact'],['stock','cartes'],['stock','compact'],['commandes','tableau']];
  for (const [e,v] of shots){
    await p.evaluate(([e,v])=>window.__eval('(function(){ definirVue("'+e+'","'+v+'"); view.sub="matieres"; aller("'+e+'"); })()'), [e,v]);
    await p.waitForTimeout(400);
    await p.screenshot({path:'/tmp/v58-'+e+'-'+v+'.png'});
    const deb = await p.evaluate(()=>document.documentElement.scrollWidth - innerWidth); if (deb>1) console.log('DEBORDEMENT',e,v,deb);
  }
  await p.setViewportSize({width:390,height:844});
  for (const [e,v] of [['creations','cartes'],['stock','compact'],['commandes','tableau']]){
    await p.evaluate(([e,v])=>window.__eval('(function(){ definirVue("'+e+'","'+v+'"); aller("'+e+'"); })()'), [e,v]);
    await p.waitForTimeout(400); await p.screenshot({path:'/tmp/v58-tel-'+e+'-'+v+'.png'});
    const deb = await p.evaluate(()=>document.documentElement.scrollWidth - innerWidth); if (deb>1) console.log('DEBORDEMENT tel',e,v,deb);
  }
  await b.close();
})();
