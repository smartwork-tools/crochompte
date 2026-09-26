const {chromium} = require('./outils').playwright;
const path = require('path');
const {graine} = require('./aide.js');
const R = {}; const errs = [];
async function page(b, vp, init){
  const p = await b.newPage({serviceWorkers:'block', viewport: vp || {width:1280, height:900}});
  p.on('pageerror', e=>errs.push(e.message));
  if (init) await p.addInitScript(init);
  await p.route('**/cdn.jsdelivr.net/**', r=>r.fulfill({path:path.join(__dirname,'faux-supabase.js'),contentType:'application/javascript'}));
  await p.route('**/functions/v1/connexion', r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'AT',refresh_token:'RT'})}));
  await p.goto('http://127.0.0.1:8934/index.html'); await p.waitForTimeout(400);
  return p;
}
async function connecter(p){
  await p.fill('#sy-c-identifiant','LaineTest'); await p.fill('#sy-c-mdp','motdepasse123');
  await p.click('#sy-c-valider'); await p.waitForTimeout(900);
}
(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  try {
    // 1. Anciennes données d'exemple purgées, données réelles intactes
    const ancien = {reglages:{tauxHoraire:15}, canaux:[], matieres:[{id:"coton_dk", nom:"Coton", cat:"fil", prix:3, contenance:50, unite:"g", stock:600, seuil:0, pmp:0.06,
      mouv:[{d:1, t:"entree", q:250, p:13.5, n:"Achat d'exemple"}]}],
      creations:[{id:"ex1", nom:"Lapin Céleste", modele:"ami_moyen", lignes:[], temps:{}, canal:"etsy", prix:32, exemple:true},
                 {id:"moi", nom:"Mon sac", modele:"ami_moyen", lignes:[], temps:{}, canal:"direct", prix:40}],
      pieces:[{id:"ex0", cid:"ex1", prod:"termine", com:"vendu", exemple:true},{id:"p1", cid:"moi", prod:"encours", com:"atelier"}],
      commandes:[], vuAccueil:true};
    let p = await page(b, null, `localStorage.setItem("crochompte-v1", ${JSON.stringify(JSON.stringify(ancien))});`);
    await connecter(p);
    const s1 = await p.evaluate(()=>window.CrochomptePont.lire());
    R.purge_creations = s1.creations.length === 1 && s1.creations[0].id === "moi";
    R.purge_pieces = s1.pieces.length === 1 && s1.pieces[0].id === "p1";
    const dk = s1.matieres.find(m=>m.id==="coton_dk");
    R.purge_achats = dk.mouv.length === 0 && dk.stock === 0;
    R.accueil_malgre_vuAccueil = (await p.textContent('#nav [aria-current="true"]')).trim() === 'Accueil';
    await p.close();

    // 2. Accueil : points à traiter calculés sur les vraies données
    p = await page(b); await connecter(p); await graine(p);
    await p.evaluate(()=>{
      const s = window.CrochomptePont.lire();
      const iso = d => d.toISOString().slice(0,10);
      const hier = new Date(Date.now()-2*864e5), bientot = new Date(Date.now()+3*864e5);
      const base = {num:null, variantes:"", personnalisee:false, clientePro:false, fraisLivraison:0, paiements:[], dateCommande:new Date().toISOString(),
        canal:"direct", note:"", accordLe:null, heuresEstimees:2, pieceId:null, factureNum:null, factureLe:null, libelle:""};
      s.commandes = [
        Object.assign({}, base, {id:"k1", client:{nom:"Alice"}, cid:"c1", prixConvenu:60, versement:{montant:20, date:iso(new Date()), type:"acompte"}, datePromise:iso(hier), statut:"encours"}),
        Object.assign({}, base, {id:"k2", client:{nom:"Bea"}, cid:"c2", prixConvenu:30, versement:{montant:0, date:null, type:"acompte"}, datePromise:iso(bientot), statut:"acceptee"}),
        Object.assign({}, base, {id:"k3", client:{nom:"Chloé"}, cid:"c3", prixConvenu:50, versement:{montant:10, date:iso(new Date()), type:"acompte"}, datePromise:"", statut:"livree"})
      ];
      s.matieres[0].seuil = 500; s.matieres[0].stock = 10;
      window.CrochomptePont.ecrire(s);
    });
    await p.click('#brand'); await p.waitForTimeout(300);
    const todo = await p.textContent('.todo');
    R.todo_retard = todo.includes('1 commande en retard') && todo.includes('Alice');
    R.todo_bientot = todo.includes('à remettre dans les 7 jours') && todo.includes('Bea');
    R.todo_encaisser = todo.includes('40,00') && todo.includes('à réclamer');
    R.todo_stock = todo.includes('sous ton seuil');
    R.todo_ordre_rouge_en_premier = (await p.getAttribute('.todo li:first-child .pt', 'class')).includes('bad');
    R.tuiles_mois = (await p.textContent('#main')).includes('Encaissé');
    R.creations_recentes = (await p.locator('.crea-mini .trow').count()) === 3;
    await p.screenshot({path:require('path').join(__dirname,'captures','accueil.png'), fullPage:true});

    // 3. Historique : fiche → précédent → liste
    await p.click('#nav >> text=Mes créations'); await p.waitForTimeout(300);
    await p.locator('table tbody tr').first().click(); await p.waitForTimeout(300);
    R.fiche_ouverte = (await p.textContent('#nav [aria-current="true"]')).includes('Fiche');
    await p.goBack(); await p.waitForTimeout(400);
    R.precedent_revient_liste = (await p.textContent('#nav [aria-current="true"]')).trim() === 'Mes créations';
    await p.goBack(); await p.waitForTimeout(400);
    R.precedent_revient_accueil = (await p.textContent('#nav [aria-current="true"]')).trim() === 'Accueil';
    await p.goForward(); await p.waitForTimeout(300);
    R.suivant_fonctionne = (await p.textContent('#nav [aria-current="true"]')).trim() === 'Mes créations';

    // 4. Quitter une fiche modifiée : confirmation
    await p.locator('table tbody tr').first().click(); await p.waitForTimeout(300);
    await p.click('.savebar button:has-text("Fermer")'); await p.waitForTimeout(400);
    R.fermer_sans_modif_direct = (await p.textContent('#nav [aria-current="true"]')).trim() === 'Mes créations' && !(await p.isVisible('.dlg'));
    await p.locator('table tbody tr').first().click(); await p.waitForTimeout(300);
    const champNom = p.locator('#main input[type=text]').first();
    await champNom.fill('Nom modifié'); await p.waitForTimeout(150);
    await p.click('.savebar button:has-text("Fermer")'); await p.waitForTimeout(250);
    R.fermer_modifiee_demande = await p.isVisible('.dlg') && (await p.textContent('.dlg h2')).includes('Quitter sans enregistrer');
    await p.click('.dlg [data-non]'); await p.waitForTimeout(600);
    R.continuer_garde_saisie = (await champNom.inputValue()) === 'Nom modifié';

    // 5. Suppression d'une création : boîte de confirmation
    await p.click('.savebar button:has-text("Supprimer la création")'); await p.waitForTimeout(250);
    R.dialogue_supprimer = (await p.textContent('.dlg h2')).includes('Supprimer');
    R.focus_sur_annuler = await p.evaluate(()=> document.activeElement && document.activeElement.hasAttribute('data-non'));
    await p.keyboard.press('Escape'); await p.waitForTimeout(600);
    R.echap_annule = !(await p.isVisible('.dlg')) && (await p.evaluate(()=>window.CrochomptePont.lire().creations.length)) === 3;
    await p.click('.savebar button:has-text("Supprimer la création")'); await p.waitForTimeout(250);
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(700);
    R.suppression_confirmee = (await p.evaluate(()=>window.CrochomptePont.lire().creations.length)) === 2;
    R.commande_deliee = await p.evaluate(()=> { const s = window.CrochomptePont.lire(); return s.commandes.every(c=> c.cid === null || s.creations.some(x=>x.id===c.cid)) && s.commandes.some(c=>c.cid===null); });

    // 6. Tout remettre à zéro : il faut taper EFFACER
    await p.click('#nav >> text=Réglages'); await p.waitForTimeout(200);
    await p.click('.reg-item[data-section="donnees"]'); await p.waitForTimeout(200);
    await p.click('button:has-text("Tout remettre à zéro")'); await p.waitForTimeout(250);
    R.zero_bloque = await p.isDisabled('.dlg [data-oui]');
    await p.fill('#dlg-champ', 'effacer'); 
    R.zero_debloque = !(await p.isDisabled('.dlg [data-oui]'));
    await p.click('.dlg [data-oui]'); await p.waitForTimeout(700);
    R.zero_fait = await p.evaluate(()=> window.CrochomptePont.lire().creations.length === 0 && window.CrochomptePont.lire().commandes.length === 0);
    R.zero_retour_accueil = (await p.textContent('#nav [aria-current="true"]')).trim() === 'Accueil';

    // 7. Déconnexion : l'atelier quitte le navigateur
    await graine(p);
    await p.click('#entete-deconnexion'); await p.waitForTimeout(700);
    R.deconnexion_vide_local = await p.evaluate(()=> { const s = localStorage.getItem("crochompte-v1"); return !s || JSON.parse(s).creations.length === 0; });
    await p.close();

    // 8. Changement de compte sur un même navigateur
    const autre = {reglages:{}, matieres:[], creations:[{id:"a1", nom:"Création d'une autre", modele:"ami_moyen", lignes:[], temps:{}, canal:"direct", prix:10}], pieces:[], commandes:[]};
    p = await page(b, null, `if (!sessionStorage.getItem("init")){ sessionStorage.setItem("init","1"); localStorage.setItem("crochompte-v1", ${JSON.stringify(JSON.stringify(autre))}); localStorage.setItem("crochompte-v1.compte", JSON.stringify("autre-uid")); }`);
    await connecter(p);
    R.autre_compte_pas_herite = await p.evaluate(()=> window.CrochomptePont.lire().creations.length === 0);
    await p.close();

    // 9. Téléphone : pièce supprimée puis « Annuler »
    p = await page(b, {width:390, height:844}); await connecter(p); await graine(p);
    await p.evaluate(()=>{ const s = window.CrochomptePont.lire(); s.reglages.mode = "complet";
      s.pieces = [{id:"pz", cid:"c1", prod:"encours", com:"atelier", cree:Date.now(), maj:Date.now(), termineLe:null, venduLe:null, prix:null, canal:"etsy", client:"", note:"", sortie:false, coutFige:0, mesure:{prep:0,crochet:0,assemb:0,finition:0,emball:0}, sessions:[]}];
      window.CrochomptePont.ecrire(s); });
    await p.click('#menu-btn'); await p.click('#mm-liste >> text=Atelier'); await p.waitForTimeout(700);
    await p.click('tr[data-pid="pz"] [data-role="del"]'); await p.waitForTimeout(250);
    R.piece_supprimee = await p.evaluate(()=> window.CrochomptePont.lire().pieces.length === 0);
    R.toast_annuler = await p.isVisible('.toast button');
    await p.click('.toast button'); await p.waitForTimeout(250);
    R.piece_restauree = await p.evaluate(()=> window.CrochomptePont.lire().pieces.length === 1);
    R.pas_de_debordement = await p.evaluate(()=> document.documentElement.scrollWidth <= window.innerWidth + 1);
    await p.click('#brand'); await p.waitForTimeout(300);
    await p.screenshot({path:require('path').join(__dirname,'captures','accueil-tel.png'), fullPage:true});
    await p.close();

    // 10. Écran de connexion sur téléphone : le formulaire d'abord
    p = await page(b, {width:390, height:844});
    const yForm = await p.evaluate(()=> document.querySelector('.portail-form').getBoundingClientRect().top);
    const yPres = await p.evaluate(()=> document.querySelector('.portail-pres').getBoundingClientRect().top);
    R.tel_formulaire_avant_presentation = yForm < yPres;
    await p.screenshot({path:require('path').join(__dirname,'captures','portail-tel.png'), fullPage:true});
    await p.close();
    p = await page(b);
    await p.screenshot({path:require('path').join(__dirname,'captures','portail.png')});
    await p.close();
  } catch(e){ R._echec = e.message.slice(0,400); }
  R.erreurs = errs;
  console.log(JSON.stringify(R,null,1));
  await b.close();
})();
