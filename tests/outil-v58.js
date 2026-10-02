/* Captures d'écran pour la V58 : ordinateur, tablette, téléphone. */
const {chromium} = require('./outils').playwright;
const path = require('path'); const {graine} = require('./aide.js');
const ecrans = (process.argv[2] || 'accueil,creations,stock,commandes,ventes,indicateurs,reglages').split(',');
const largeurs = (process.argv[3] || '1440,1024,390').split(',').map(Number);
const pal = process.argv[4] || '';
(async()=>{
  const b = await chromium.launch(require('./outils').lancement);
  for (const w of largeurs){
    const p = await b.newPage({serviceWorkers:'block', viewport:{width:w, height:900}});
    p.on('pageerror', e=>console.log('ERREUR JS', w, e.message));
    await p.route('**/app.js*', async r=>{ const src = require('fs').readFileSync(path.join(__dirname,'..','app.js'),'utf8'); const i = src.lastIndexOf('})();');
      await r.fulfill({contentType:'text/javascript; charset=utf-8', body: src.slice(0,i) + 'window.__eval = function(c){ return eval(c); };\n' + src.slice(i)}); });
    await p.route('**/vendor/supabase/**', r=>r.fulfill({path:path.join(__dirname,'faux-supabase-persistant.js'),contentType:'application/javascript'}));
    await p.route('**/functions/v1/connexion', r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'AT',refresh_token:'RT'})}));
    await p.goto('http://127.0.0.1:8934/index.html'); await p.waitForTimeout(500);
    if (await p.locator('#sy-c-identifiant').count()){ await p.fill('#sy-c-identifiant','LaineTest'); await p.fill('#sy-c-mdp','motdepasse123'); await p.click('#sy-c-valider'); await p.waitForTimeout(1000); }
    await graine(p);
    await p.evaluate((pal)=>window.__eval('(function(){ appliquerProfil("pro",{sansRendu:true}); state.reglages.confirmeLe=Date.now(); state.reglages.tauxHoraire=12; '+
      'var m=state.matieres[0]; ["jaune","rose","rouge","bleu","vert","noir","blanc","gris","orange","violet"].forEach(function(c,i){ mouvementMatiere(m,"inventaire",50+i,null,"t",{vid:creerVariante(m,c,"").id}); });'+
      'var t=Date.now(); state.pieces=[{id:"h1",cid:"c1",prod:"encours",com:"atelier",prix:32,mesure:{crochet:70},sessions:[],cree:t-2e6,maj:t},{id:"h2",cid:"c2",prod:"termine",com:"atelier",prix:28,mesure:{crochet:150},sessions:[],cree:t-3e6,maj:t,termineLe:t,sortie:true},{id:"h3",cid:"c2",prod:"termine",com:"vendu",prix:28,mesure:{crochet:140},sessions:[],cree:t-4e6,maj:t,venduLe:t-1e5,termineLe:t-2e5,sortie:true}];'+
      'state.pieces[2].fige = figerVente(creation("c2"), 28, creation("c2").canal, 140, state.pieces[2]);'+
      'var c=nouvelleCommande(); c.client={nom:"Zoé Marchand"}; c.cid="c1"; c.prixConvenu=32; c.statut="encours"; c.datePromise=new Date(t+5*864e5).toISOString().slice(0,10); delete c.brouillon;'+
      'var c2=nouvelleCommande(); c2.client={nom:"Léa Dubois"}; c2.cid="c3"; c2.prixConvenu=35; c2.statut="acceptee"; delete c2.brouillon;'+
      'var c3=nouvelleCommande(); c3.client={nom:"Marc Petit"}; c3.cid="c2"; c3.qte=3; c3.prixConvenu=28; c3.statut="livree"; c3.versement={montant:40,date:null,type:"acompte"}; delete c3.brouillon;'+
      (pal ? 'appliquerPalette("'+pal.split(':')[0]+'");' + (pal.split(':')[1] ? 'appliquerTheme("'+pal.split(':')[1]+'");' : '') : '') + 'sauverTout(); })()'), pal);
    for (const e of ecrans){
      await p.evaluate((e)=>window.__eval('(function(){ view.sub = "matieres"; view.creaOuvert={c1:true,c2:true,c3:true}; aller("'+e+'"); })()'), e);
      await p.waitForTimeout(400);
      await p.screenshot({path:'/tmp/v58-'+e+'-'+w+(pal?'-'+pal:'')+'.png'});
      const deb = await p.evaluate(()=>document.documentElement.scrollWidth - innerWidth);
      if (deb > 1) console.log('DEBORDEMENT', e, w, deb);
    }
    await p.close();
  }
  await b.close();
})();
