/* V57 — la facture est un vrai PDF : aperçu fidèle, téléchargement, impression,
   texte juste (accents, euros), plusieurs pages, avoir, vendeur incomplet. */
const {chromium} = require('./outils').playwright;
const path = require('path'), fs = require('fs');
const {graine} = require('./aide.js');
const R = {}; const errs = [];
const dans = (p, fn) => p.evaluate(code => window.__eval('(' + code + ')()'), fn.toString());
/* Les chaînes « (…) » d'un PDF fabriqué par pdf.js (octets WinAnsi, échappements en octal) */
function textesPdf(buf){
  const s = buf.toString('latin1'); const out = [];
  const re = /\(((?:\\.|[^\\)])*)\) Tj/g; let m;
  while ((m = re.exec(s))){
    out.push(m[1].replace(/\\(\d{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8))).replace(/\\(.)/g, '$1'));
  }
  return out.join('\n');
}
const latin = t => t.replace(/€/g, '\x80');
async function page(b){
  const p = await b.newPage({serviceWorkers:'block', viewport:{width:1280, height:900}, acceptDownloads:true});
  p.on('pageerror', e=>errs.push(e.message));
  p.on('dialog', d=>d.dismiss());
  await p.route('**/app.js*', async r=>{
    const src = fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
    const i = src.lastIndexOf('})();');
    await r.fulfill({contentType:'text/javascript; charset=utf-8', body: src.slice(0,i) + 'window.__eval = function(c){ return eval(c); };\n' + src.slice(i)});
  });
  await p.route('**/vendor/supabase/**', r=>r.fulfill({path:path.join(__dirname,'faux-supabase-persistant.js'),contentType:'application/javascript'}));
  await p.route('**/functions/v1/connexion', r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'AT',refresh_token:'RT'})}));
  await p.goto('http://127.0.0.1:8934/index.html'); await p.waitForTimeout(500);
  if (await p.locator('#sy-c-identifiant').count()){ await p.fill('#sy-c-identifiant','LaineTest'); await p.fill('#sy-c-mdp','motdepasse123'); await p.click('#sy-c-valider'); await p.waitForTimeout(1000); }
  return p;
}
(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  try {
    const p = await page(b);
    await graine(p);
    await dans(p, function(){
      appliquerProfil('pro', {sansRendu:true}); state.reglages.confirmeLe = Date.now();
      var r = state.reglages; r.raisonSociale = 'Les Mailles de Zoé'; r.adresse = '12 rue des Tilleuls, 69003 Lyon'; r.siret = '123 456 789 00012'; r.contact = 'zoe@mailles.fr'; r.statut = 'marchandises';
      var c = nouvelleCommande(); c.client = {nom:'Camille Dupont', adresse:'4 allée des Roses, 31000 Toulouse'}; c.cid = 'c1'; c.prixConvenu = 32; c.statut = 'livree'; c.livreeLe = '2026-09-28'; delete c.brouillon; c.fraisLivraison = 4.9;
      c.versement = {montant:10, date:'2026-09-20', type:'acompte'};
      sauverTout(); aller('commandes');
    });
    await p.waitForTimeout(400);
    await p.locator('#main tr', {hasText:'Camille'}).getByRole('button', {name:/^Ouvrir la commande/}).click(); await p.waitForTimeout(300);
    await p.getByRole('button', {name:'Établir la facture'}).click(); await p.waitForTimeout(200);
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(1200);
    /* 1. la boîte de la facture : titre, trois gestes, aperçu dessiné */
    R.dialogue_facture = /^Facture /.test(await p.textContent('.dlg h2'));
    R.boutons = await p.locator('.dlg .fact-act button').allTextContents().then(t => t.includes('Télécharger le PDF') && t.includes('Imprimer'));
    await p.waitForSelector('.dlg .fact-apercu canvas', {timeout: 15000}).catch(()=>{});
    R.apercu_dessine = (await p.locator('.dlg .fact-apercu canvas').count()) >= 1;
    R.apercu_pas_vide = await p.evaluate(() => { const c = document.querySelector('.dlg .fact-apercu canvas'); if (!c) return false;
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let noirs = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 100 && d[i+1] < 100) noirs++; return noirs > 300; });
    /* 2. le fichier téléchargé */
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('.dlg .fact-act button:has-text("Télécharger le PDF")')]);
    const nom = dl.suggestedFilename(); const buf = fs.readFileSync(await dl.path());
    R.nom_fichier = /^Facture-.*\.pdf$/.test(nom);
    R.entete_pdf = buf.slice(0, 5).toString() === '%PDF-' && buf.slice(-6).toString().includes('%%EOF');
    const txt = textesPdf(buf);
    R.contient_vendeur_client = txt.includes('Les Mailles de Zo\xe9') && txt.includes('Camille Dupont') && txt.includes('4 all\xe9e des Roses');
    R.contient_montants = txt.includes('36,90') && txt.includes('26,90') && txt.includes('10,00');
    R.contient_mentions = txt.includes('TVA') && txt.includes('applicable') && txt.includes('293');
    R.pied_de_page = /Facture .* page|Facture K|Facture C|Facture F/.test(txt);
    /* 3. imprimer : le PDF s'ouvre dans un nouvel onglet */
    const [pop] = await Promise.all([p.context().waitForEvent('page', {timeout: 8000}).catch(()=>null), p.click('.dlg .fact-act button:has-text("Imprimer")')]);
    R.imprimer_ouvre_un_onglet = !!pop; if (pop) await pop.close().catch(()=>{});
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(300);
    R.dialogue_ferme = (await p.locator('.dlg').count()) === 0;
    /* 4. revoir depuis la commande + registre */
    await p.getByRole('button', {name:'Revoir la facture'}).click(); await p.waitForTimeout(600);
    R.revoir = /^Facture /.test(await p.textContent('.dlg h2')); await p.click('.dlg [data-oui]'); await p.waitForTimeout(200);
    /* 5. vendeur incomplet : avertissement visible, PDF avec crochets */
    const mq = await dans(p, function(){ var F = JSON.parse(JSON.stringify(commandes()[0].facture)); F.vendeur = {nom:'', adresse:'', siret:'', contact:''}; ouvrirDocument(F); return true; });
    await p.waitForTimeout(500);
    R.alerte_vendeur_incomplet = /pas encore valable/.test(await p.textContent('.dlg .fact-alerte')); await p.click('.dlg [data-oui]'); await p.waitForTimeout(200);
    /* 6. une longue facture tient sur plusieurs pages, aucune ligne perdue */
    const long = await dans(p, function(){ var F = JSON.parse(JSON.stringify(commandes()[0].facture)); F.numero = 'T-1'; F.lignes = []; for (var i = 1; i <= 45; i++) F.lignes.push({d:'Création ' + i + ' avec une désignation assez longue pour passer à la ligne dans la colonne', s:'', q:1, pu:10, m:10}); F.total = 450; F.solde = 450; F.versements = [];
      var o = octetsDocument(F); var s = ''; for (var k = 0; k < o.length; k++) s += String.fromCharCode(o[k]); return {pages: (s.match(/\/Type \/Page /g) || []).length, lignes: (s.match(/Cr\\351ation \d+/g) || []).length}; });
    R.longue_facture_plusieurs_pages = long.pages >= 2 && long.lignes >= 45;
    /* 7. les largeurs de lettres sont celles d'Helvetica (comparées à la police du système) */
    const ecarts = await p.evaluate(() => { const c = document.createElement('canvas').getContext('2d'); c.font = '1000px Arial'; const T = ['Facture', 'Reste à régler', 'Camille Dupont', '1 234,56 €', 'Les Mailles de Zoé']; return T.map(t => [c.measureText(t).width, window.CrochomptePdf.largeur(t, 1000, false)]).map(([a, b]) => Math.abs(a - b) / a); });
    R.largeurs_helvetica = ecarts.every(e => e < 0.03);
    await p.close();
  } catch (e) { R._echec = String(e && e.stack || e); }
  console.log(JSON.stringify(R, null, 1));
  console.log("ERREURS JS: " + (errs.length ? errs.join(" | ") : "aucune"));
  await b.close();
})();
