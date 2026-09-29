/* V37 — vérifie une à une les corrections de l'audit complet :
   virgule décimale, stock traçable et réversible, factures (prérequis,
   confirmation, avoir, verrouillage, registre qui survit à une remise à
   zéro), arrondis au centime, double comptage pièce/commande, ventes
   figées, verdicts, archivage, brouillon gardé, unité protégée, achats
   conservés, signalement motivé, accessibilité de base. */
const {chromium} = require('./outils').playwright;
const path = require('path');
const {graine} = require('./aide.js');
const R = {}; const errs = [];
async function page(b, vp, init){
  const p = await b.newPage({serviceWorkers:'block', viewport: vp || {width:1280, height:900}});
  p.on('pageerror', e=>errs.push(e.message));
  p.on('dialog', d=>d.dismiss());
  if (init) await p.addInitScript(init);
  await p.route('**/vendor/supabase/**', r=>r.fulfill({path:path.join(__dirname,'faux-supabase-persistant.js'),contentType:'application/javascript'}));
  await p.route('**/functions/v1/connexion', r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'AT',refresh_token:'RT'})}));
  await p.goto('http://127.0.0.1:8934/index.html'); await p.waitForTimeout(500);
  if (await p.locator('#sy-c-identifiant').count()){
    await p.fill('#sy-c-identifiant','LaineTest'); await p.fill('#sy-c-mdp','motdepasse123');
    await p.click('#sy-c-valider'); await p.waitForTimeout(1000);
  }
  return p;
}
const lire = p => p.evaluate(()=>window.CrochomptePont.lire());
async function onglet(p, nom){
  await p.evaluate(n=>{ const b=[...document.querySelectorAll('#nav button')].find(b=>b.textContent.trim()===n); if (b) b.click(); }, nom);
  await p.waitForTimeout(250);
}
async function ecrire(p, fn, arg){ await p.evaluate(({fn, arg})=>{ const s = window.CrochomptePont.lire(); new Function('s','arg', fn)(s, arg); window.CrochomptePont.ecrire(s); }, {fn: fn.toString().replace(/^[^{]*{|}$/g,''), arg}); await p.waitForTimeout(250); }
const auj = () => { const d = new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };

(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  try {
    let p = await page(b);
    await graine(p);
    await ecrire(p, function(){ s.reglages.mode = "complet"; s.reglages.raisonSociale = "Marie Dupont"; s.reglages.adresse = "1 rue des Lilas, Lyon"; s.reglages.statut = "non_declare"; });

    /* 1. Virgule décimale : 45,50 reste 45,50 */
    await onglet(p, 'Mes créations');
    await p.locator('.crea-card', {hasText:'Lapin Céleste'}).locator('.crea-id').click(); await p.waitForTimeout(250);
    await p.fill('#f-prix', '32,5'); await p.waitForTimeout(150);
    R.virgule_affichee = (await p.inputValue('#f-prix')) === '32,5';
    await p.getByRole('button', {name:'Enregistrer', exact:true}).click(); await p.waitForTimeout(300);
    R.virgule_comprise = (await lire(p)).creations.find(c=>c.id==='c1').prix === 32.5;
    await p.fill('#f-prix', '').catch(()=>{});

    /* 2. Stock : récapitulatif, alerte d'improbabilité, annulation exacte */
    await onglet(p, 'Matières');
    await p.getByRole('button', {name:'Stock et mouvements'}).click(); await p.waitForTimeout(200);
    const mid = await p.evaluate(()=>document.querySelector('#mv-mid').value);
    const avant = (await lire(p)).matieres.find(m=>m.id===mid);
    await p.fill('#mv-q', '150'); await p.fill('#mv-p', '810');
    await p.getByRole('button', {name:'Enregistrer le mouvement'}).click(); await p.waitForTimeout(200);
    const dlg = await p.textContent('.dlg');
    R.stock_recap_affiche = dlg.includes('Vérifie') || dlg.includes('différent');
    R.stock_alerte_prix_improbable = dlg.includes('très différent');
    await p.click('.dlg [data-non]'); await p.waitForTimeout(150);
    R.stock_rien_si_corriger = (await lire(p)).matieres.find(m=>m.id===mid).mouv.length === avant.mouv.length;
    await p.fill('#mv-p', '8,10');
    await p.getByRole('button', {name:'Enregistrer le mouvement'}).click(); await p.waitForTimeout(150);
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(300);
    let mm = (await lire(p)).matieres.find(m=>m.id===mid);
    R.stock_achat_8_10 = Math.abs(mm.mouv[0].p - 8.1) < 1e-9 && mm.stock === (Number(avant.stock)||0) + 150;
    await p.getByRole('button', {name:/^Annuler ce mouvement/}).first().click(); await p.waitForTimeout(150);
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(300);
    mm = (await lire(p)).matieres.find(m=>m.id===mid);
    R.stock_annulation_exacte = mm.stock === (Number(avant.stock)||0) && mm.prix === avant.prix && Math.abs((mm.pmp||0) - (avant.pmp||0)) < 1e-9
      && mm.mouv[0].t === 'annulation' && !!mm.mouv[1].annule;
    /* stock négatif puis achat : −30 + 100 = 70 */
    await ecrire(p, function(){ const m = s.matieres.find(x=>x.id===arg); m.stock = -30; }, mid);
    await p.fill('#mv-q', '100'); await p.fill('#mv-p', '5');
    await p.getByRole('button', {name:'Enregistrer le mouvement'}).click(); await p.waitForTimeout(150);
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(300);
    R.stock_negatif_puis_achat = (await lire(p)).matieres.find(m=>m.id===mid).stock === 70;
    /* journal complet (plus de coupure à 60) */
    await ecrire(p, function(){ const m = s.matieres.find(x=>x.id===arg); for (let i=0;i<80;i++) m.mouv.push({d:1, t:'entree', q:1, p:1, n:'ancien'}); }, mid);
    R.journal_non_tronque = (await lire(p)).matieres.find(m=>m.id===mid).mouv.length >= 80;

    /* 3. Factures */
    await ecrire(p, function(){
      const iso = arg;
      const cmd = (id, nom, statut, extra) => Object.assign({id, client:{nom}, cid:'c1', prixConvenu:30.3, fraisLivraison:0, statut,
        versement:{montant:0, date:null, type:'acompte'}, paiements:[], dateCommande:new Date().toISOString(), canal:'direct',
        note:'', variantes:'', libelle:'Lapin', datePromise:iso, factureNum:null, factureLe:null}, extra || {});
      s.commandes = [cmd('q1','Devisée','devis'), cmd('q2','Alice','livree', {paiements:[{montant:10.1, date:iso},{montant:20.2, date:iso}]})];
    }, auj());
    await onglet(p, 'Commandes');
    await p.locator('#main tr', {hasText:'Alice'}).getByRole('button', {name:/^Ouvrir la commande/}).click(); await p.waitForTimeout(250);
    R.centimes_soldee = (await p.textContent('#main')).includes('0,00 €') && (await lire(p)).commandes.find(c=>c.id==='q2').paiements.length === 2;
    const soldeAff = await p.evaluate(()=>{ const t=[...document.querySelectorAll('.tile')].find(x=>x.textContent.includes('Reste à recevoir')); return t ? t.textContent : ''; });
    R.centimes_pas_de_residu = soldeAff.includes('0,00') && !/e-15/.test(await p.inputValue('#cmd-p-m'));
    const [f1] = await Promise.all([p.waitForEvent('popup'), (async()=>{ await p.getByRole('button', {name:'Établir la facture'}).click(); await p.waitForTimeout(150); await p.click('.dlg [data-oui]'); })()]);
    await p.waitForTimeout(400); const t1 = await f1.title(); await f1.close();
    let q2 = (await lire(p)).commandes.find(c=>c.id==='q2');
    R.facture_emise_et_figee = !!q2.factureNum && !!q2.facture && t1.includes(q2.factureNum) && !!q2.facture.dateVente && !!q2.facture.nature;
    R.facture_verrouille = await p.isDisabled('[data-c="prixConvenu"]') && await p.isDisabled('[data-c="nom"]');
    R.facture_journal = (q2.journal||[]).some(x=>x.txt.includes('Facture'));
    const [f2] = await Promise.all([p.waitForEvent('popup'), (async()=>{ await p.getByRole('button', {name:'Annuler la facture par un avoir'}).click(); await p.waitForTimeout(150); await p.click('.dlg [data-oui]'); })()]);
    await p.waitForTimeout(400); const t2 = await f2.title(); const txtAvoir = await f2.textContent('body'); await f2.close();
    q2 = (await lire(p)).commandes.find(c=>c.id==='q2');
    const n1 = Number(q2.factureNum.split('-').pop()), n2 = Number(q2.avoirNum.split('-').pop());
    R.avoir_numero_suivant = t2.startsWith('Avoir') && n2 === n1 + 1 && txtAvoir.includes('Annule la facture');
    R.avoir_deverrouille = !(await p.isDisabled('[data-c="prixConvenu"]'));
    /* prérequis visibles et devis bloqué */
    await onglet(p, 'Commandes');
    await p.locator('#main tr', {hasText:'Devisée'}).getByRole('button', {name:/^Ouvrir la commande/}).click(); await p.waitForTimeout(250);
    R.facture_devis_bloquee = (await p.textContent('.manques')).includes("l'accord de la cliente") && await p.isDisabled('button:has-text("Établir la facture")');
    /* registre : 2 documents, et il survit à une remise à zéro */
    await onglet(p, 'Commandes');
    R.registre_liste = (await p.locator('#main tr', {hasText:'Avoir'}).count()) >= 1 && (await p.textContent('#main')).includes('Registre des factures');
    await onglet(p, 'Réglages');
    await p.locator('#main').getByText('Mes données', {exact:true}).first().click(); await p.waitForTimeout(200);
    await p.getByRole('button', {name:'Tout remettre à zéro'}).click(); await p.waitForTimeout(150);
    await p.fill('#dlg-champ', 'EFFACER'); await p.click('.dlg [data-oui]'); await p.waitForTimeout(400);
    const apresRaz = await lire(p);
    R.registre_survit_remise_a_zero = apresRaz.registreFactures.length === 2 && apresRaz.commandes.length === 0;
    await p.close();

    /* 4. Double comptage pièce ↔ commande, vente figée, verdicts, archivage */
    p = await page(b);
    await graine(p);
    await ecrire(p, function(){
      s.reglages.mode = "complet";
      s.commandes = [{id:'k9', client:{nom:'Zoé'}, cid:'c1', prixConvenu:40, fraisLivraison:0, statut:'encours', versement:{montant:40, date:arg, type:'acompte'},
                      paiements:[], dateCommande:new Date().toISOString(), canal:'direct', note:'', variantes:'', libelle:'', datePromise:arg}];
      s.pieces = [{id:'pc', cid:'c1', prod:'termine', com:'commande', prix:null, mesure:{crochet:120}, sessions:[], cree:Date.now(), maj:Date.now()}];
    }, auj());
    await onglet(p, 'Mes créations');
    await p.selectOption('tr[data-pid="pc"] select[data-role="com"]', 'vendu'); await p.waitForTimeout(300);
    let s4 = await lire(p);
    R.piece_reliee_commande = s4.pieces[0].cmdId === 'k9' && s4.commandes[0].pieceId === 'pc';
    await onglet(p, 'Indicateurs');
    R.pas_de_double_comptage = /Encaissé\s*40,00/.test((await p.textContent('#main')).replace(/ | /g,' '));
    R.vente_figee = !!s4.pieces[0].fige && s4.pieces[0].fige.tempsMesure === true;
    const gainAvant = s4.pieces[0].fige.gainHoraire;
    await ecrire(p, function(){ s.matieres.forEach(m=>{ m.prix = m.prix * 3; m.pmp = (m.pmp||0) * 3; }); s.reglages.tauxHoraire = 40; });
    R.vente_ne_bouge_plus = (await lire(p)).pieces[0].fige.gainHoraire === gainAvant;
    /* verdict à prix 0 */
    await ecrire(p, function(){ s.creations[0].prix = 0; });
    await onglet(p, 'Mes créations');
    const ligne0 = await p.locator('.crea-card', {hasText:'Lapin Céleste'}).locator('.crea-tete').textContent();
    R.verdict_prix_a_fixer = ligne0.includes('Prix à fixer') && !ligne0.includes('À perte');
    /* archivage d'une création qui a des ventes */
    await p.locator('.crea-card', {hasText:'Lapin Céleste'}).locator('.crea-id').click(); await p.waitForTimeout(250);
    await p.getByRole('button', {name:'Supprimer la création'}).click(); await p.waitForTimeout(150);
    R.archivage_propose = (await p.textContent('.dlg h2')).includes('Archiver');
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(300);
    s4 = await lire(p);
    R.archive_garde_ventes = s4.creations.find(c=>c.id==='c1').archive && s4.pieces.length === 1;
    R.archive_masquee_liste = !(await p.locator('#main .crea-card', {hasText:'Lapin Céleste'}).count()) && (await p.textContent('#main')).includes('Créations archivées');
    R.ligne_clavier = await p.evaluate(()=>{ const b = document.querySelector('#main .crea-id'); return !!b && b.tagName === 'BUTTON' && /Ouvrir la fiche de/.test(b.getAttribute('aria-label')); });

    /* 5. Brouillon gardé après rechargement */
    await p.getByRole('button', {name:'+ Nouvelle création'}).click(); await p.waitForTimeout(250);
    await p.fill('#f-nom', 'Bonnet du brouillon'); await p.waitForTimeout(700);
    await p.reload(); await p.waitForTimeout(1500);
    const acc = await p.textContent('#main');
    R.brouillon_propose = acc.includes('Bonnet du brouillon');
    await p.getByRole('button', {name:'Reprendre la fiche'}).click(); await p.waitForTimeout(300);
    R.brouillon_repris = (await p.inputValue('#f-nom')) === 'Bonnet du brouillon';

    /* 6. Unité protégée, achats conservés à la suppression */
    await onglet(p, 'Matières');
    await p.getByRole('button', {name:'Mes matières'}).click(); await p.waitForTimeout(250);
    const uniteAvant = await p.evaluate(()=>{ const s = window.CrochomptePont.lire(); const m = s.matieres.find(m=>s.creations.some(c=>c.lignes.some(l=>l.mid===m.id))); return {id:m.id, u:m.unite}; });
    await p.fill('tr[data-mid="'+uniteAvant.id+'"] [data-role="unite"]', 'pelote');
    await p.press('tr[data-mid="'+uniteAvant.id+'"] [data-role="unite"]', 'Tab'); await p.waitForTimeout(200);
    R.unite_demande_confirmation = (await p.textContent('.dlg h2')).includes("Changer l'unité");
    await p.click('.dlg [data-non]'); await p.waitForTimeout(200);
    R.unite_inchangee = (await lire(p)).matieres.find(m=>m.id===uniteAvant.id).unite === uniteAvant.u;

    /* 7. Accessibilité de base */
    R.titre_de_page = (await p.title()).includes('Matières');
    R.lien_evitement = (await p.locator('a.saut').count()) === 1;
    await p.close();

    /* 8 bis. Corrections issues de la vérification indépendante */
    p = await page(b);
    await graine(p);
    await ecrire(p, function(){ s.reglages.mode = "complet"; s.reglages.raisonSociale = "Marie Dupont"; s.reglages.adresse = "1 rue des Lilas, Lyon"; s.reglages.statut = "non_declare";
      s.commandes = [{id:'w1', client:{nom:'Wanda'}, cid:'c2', prixConvenu:1.07, fraisLivraison:0, statut:'livree',
        versement:{montant:0.47, date:arg, type:'acompte'}, paiements:[{montant:0.6, date:arg}], dateCommande:new Date().toISOString(),
        canal:'direct', note:'', variantes:'', libelle:'', datePromise:arg}]; }, auj());
    await onglet(p, 'Matières');
    await p.getByRole('button', {name:'Stock et mouvements'}).click(); await p.waitForTimeout(200);
    R.v04_clavier_decimal = (await p.getAttribute('#mv-q', 'inputmode')) === 'decimal';
    await onglet(p, 'Commandes');
    await p.locator('#main tr', {hasText:'Wanda'}).getByRole('button', {name:/^Ouvrir la commande/}).click(); await p.waitForTimeout(250);
    const [fw] = await Promise.all([p.waitForEvent('popup'), (async()=>{ await p.getByRole('button', {name:'Établir la facture'}).click(); await p.waitForTimeout(150); await p.click('.dlg [data-oui]'); })()]);
    await p.waitForTimeout(400); const txtW = await fw.textContent('body'); await fw.close();
    R.v05_facture_reglee = txtW.includes('Réglée') && !txtW.includes('0,00 € à régler');
    /* V-08 : passer une commande facturée en « Annulée » propose l'avoir */
    await p.selectOption('[data-c="statut"]', 'annulee'); await p.waitForTimeout(400);
    R.v08_avoir_propose = (await p.locator('.dlg').count()) === 1 && (await p.textContent('.dlg h2')).includes('facture active');
    await p.click('.dlg [data-non]'); await p.waitForTimeout(200);
    /* V-06 : une deuxième facture pour la même commande est refusée */
    await ecrire(p, function(){ const c = s.commandes[0]; c.statut = 'livree'; c.factureNum = null; c.facture = null; });
    await onglet(p, 'Commandes');
    await p.locator('#main tr', {hasText:'Wanda'}).getByRole('button', {name:/^Ouvrir la commande/}).click(); await p.waitForTimeout(250);
    await p.getByRole('button', {name:'Établir la facture'}).click(); await p.waitForTimeout(150);
    const popW2 = p.waitForEvent('popup').catch(()=>null);
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(600);
    R.v06_deuxieme_facture_refusee = (await lire(p)).commandes[0].factureNum === null && /déjà une facture active/.test(await p.textContent('body'));
    const fw2 = await popW2; if (fw2 && !fw2.isClosed()) await fw2.close();
    /* V-20 : « 1.234,56 » compris comme 1 234,56 */
    await p.fill('[data-c="prixConvenu"]', '1.234,56'); await p.waitForTimeout(200);
    R.v20_milliers = (await lire(p)).commandes[0].prixConvenu === 1234.56;
    /* V-11 : temps 0 + heures hors crochet → « Temps à indiquer », pas un gain inventé */
    await ecrire(p, function(){ s.reglages.heuresIndirectesMois = 20; s.reglages.piecesParMois = 10; s.creations[0].temps = {prep:0,crochet:0,assemb:0,finition:0,emball:0}; });
    await onglet(p, 'Mes créations');
    R.v11_temps_a_indiquer = (await p.locator('.crea-card', {hasText:'Lapin Céleste'}).locator('.crea-tete').textContent()).includes('Temps à indiquer');
    /* V-13 : vendre au « prix juste » affiché paie vraiment l'objectif */
    await ecrire(p, function(){ s.reglages.heuresIndirectesMois = 0; s.reglages.tauxHoraire = 18; s.creations[1].temps = {prep:17,crochet:233,assemb:31,finition:11,emball:7}; });
    await p.locator('.crea-card', {hasText:'Bonnet côtelé'}).locator('.crea-id').click(); await p.waitForTimeout(300);
    const objTxt = await p.textContent('#r-obj');
    const m13 = objTxt.replace(/\u202f|\u00a0/g,' ').match(/vendre ([0-9 ]+,[0-9]{2}) €/);
    if (m13){ await p.fill('#f-prix', m13[1].replace(/ /g,'')); await p.waitForTimeout(250); }
    R.v13_prix_juste_suffit = !!m13 && (await p.textContent('#r-chip')).includes("Tu t'y retrouves");
    /* V-27 : pas de perte sur les articles comptés à l'unité */
    await ecrire(p, function(){ const oeil = s.matieres.find(m=>/pi[eè]ce|paire/i.test(m.unite)); s.__oeil = oeil ? oeil.id : null;
      if (oeil){ oeil.stock = 10; s.creations[0].lignes.push({mid:oeil.id, qte:2}); } s.reglages.tauxPerte = 10; });
    const oeilId = (await lire(p)).__oeil;
    await ecrire(p, function(){ s.pieces = [{id:'po', cid:'c1', prod:'encours', com:'atelier', prix:null, mesure:{}, sessions:[], cree:Date.now(), maj:Date.now()}]; });
    await onglet(p, 'Mes créations');
    await p.selectOption('tr[data-pid="po"] select[data-role="prod"]', 'termine'); await p.waitForTimeout(300);
    R.v27_pas_de_perte_unite = !oeilId || (await lire(p)).matieres.find(m=>m.id===oeilId).stock === 8;
    await p.close();

    /* 8. Tablette : plus de barre d'onglets qui déborde */
    p = await page(b, {width:820, height:1000});
    R.tablette_menu = await p.isVisible('#menu-btn') && !(await p.isVisible('#nav'));
    R.tablette_sans_debordement = await p.evaluate(()=>document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
    await p.close();

    /* 9. Téléphone : le résultat reste visible en bas de la fiche */
    p = await page(b, {width:390, height:844});
    await graine(p);
    await p.click('#menu-btn'); await p.click('#mm-liste >> text=Mes créations'); await p.waitForTimeout(500);
    await p.locator('.crea-card', {hasText:'Panier'}).locator('.crea-id').click(); await p.waitForTimeout(300);
    R.tel_barre_resultat = await p.isVisible('.barre-fiche') && (await p.textContent('#bf-g')).includes('/ h');
    await p.close();
  } catch (e) { R._echec = String(e && e.stack || e); }
  console.log(JSON.stringify(R, null, 1));
  console.log("ERREURS JS: " + (errs.length ? errs.join(" | ") : "aucune"));
  await b.close();
})();
