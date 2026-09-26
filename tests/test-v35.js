/* V35 — vérifie une à une les corrections de la revue complète :
   synchronisation (rien n'est envoyé sans modification, un atelier vide
   n'écrase jamais un atelier plein), chronomètre (pièce supprimée, séance de
   plus de 4 h), remboursement d'une commande annulée, sauvegarde avec photos,
   et tous les écrans, sur ordinateur et téléphone, sans erreur ni « NaN ». */
const {chromium} = require('./outils').playwright;
const path = require('path');
const {graine} = require('./aide.js');
const R = {}; const errs = [];
async function page(b, vp, init){
  const p = await b.newPage({serviceWorkers:'block', viewport: vp || {width:1280, height:900}, acceptDownloads:true});
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
const envois = p => p.evaluate(()=> (window.__fauxEnvois||[]).length);
/* Clique chaque onglet du menu, dans l'ordre ; rend la liste des noms. */
async function toutParcourir(p, surEcran){
  const noms = await p.$$eval('#nav button', l=>l.map(b=>b.textContent.trim()));
  for (let i = 0; i < noms.length; i++){
    await p.evaluate(i=>document.querySelectorAll('#nav button')[i].click(), i);
    await p.waitForTimeout(150);
    if (surEcran) await surEcran(noms[i]);
  }
  return noms;
}
async function onglet(p, nom){
  await p.evaluate(n=>[...document.querySelectorAll('#nav button')].find(b=>b.textContent.trim()===n).click(), nom);
  await p.waitForTimeout(250);
}
async function modeComplet(p){
  await p.evaluate(()=>{ const s = window.CrochomptePont.lire(); s.reglages.mode = "complet"; window.CrochomptePont.ecrire(s); });
}

(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  try {
    /* 1. Synchronisation */
    let p = await page(b); await connecter(p);
    const e0 = await envois(p);
    R.sync_vierge_non_envoye = e0 === 0;                       // atelier vide : rien à envoyer
    await graine(p); await modeComplet(p);
    /* Une vraie modification, faite à l'écran : renommer une création */
    await onglet(p, 'Mes créations');
    await p.getByText('Lapin Céleste').first().click(); await p.waitForTimeout(250);
    await p.fill('#f-nom', 'Lapin Céleste modifié');
    await p.getByRole('button', {name:'Enregistrer', exact:true}).click();
    await p.waitForTimeout(3500);
    const e1 = await envois(p);
    R.sync_modif_envoyee = e1 >= 1;
    const noms = await toutParcourir(p);
    R.nb_onglets_parcourus = noms.length;
    await p.waitForTimeout(3000);
    R.sync_navigation_sans_envoi = (await envois(p)) === e1;   // naviguer n'envoie rien
    const srv = await p.evaluate(()=>window.__serveur && window.__serveur.atelier);
    R.sync_serveur_a_jour = !!srv && srv.donnees.creations.some(c=>c.nom === 'Lapin Céleste modifié');

    /* 2. Chronomètre : pièce supprimée pendant qu'il tourne */
    await p.evaluate(()=>{
      const s = window.CrochomptePont.lire();
      s.pieces = [{id:"pz", cid:"c1", prod:"encours", com:"atelier", mesure:{}, sessions:[]}];
      s.chrono = {pid:"pz", poste:"crochet", debut: Date.now() - 5*3600e3};
      window.CrochomptePont.ecrire(s);
    });
    await p.waitForTimeout(300);
    R.chrono_barre_visible = await p.locator('#barre-chrono').count() === 1;
    await onglet(p, 'Accueil');
    R.accueil_signale_chrono = /Chronomètre en marche depuis 5 h/.test(await p.textContent('.todo'));
    R.accueil_bande_verte = (await p.locator('.acc-hero h1').count()) === 1 && (await p.locator('.acc-hero .preuve .big').count()) === 1;
    /* Plus de 4 h : on demande avant d'ajouter */
    await p.click('#cb-stop'); await p.waitForTimeout(200);
    R.chrono_4h_demande = await p.locator('.dlg').count() === 1;
    await p.click('.dlg [data-non]'); await p.waitForTimeout(200);
    const pz = await p.evaluate(()=>window.CrochomptePont.lire().pieces.find(x=>x.id==="pz"));
    R.chrono_4h_refus_rien_ajoute = !(pz.sessions||[]).length;
    R.chrono_4h_arrete = await p.locator('#barre-chrono').count() === 0;

    /* 3. Commande annulée : remboursement = ligne négative, encaissé corrigé */
    await p.evaluate(()=>{
      const s = window.CrochomptePont.lire();
      const iso = new Date().toISOString().slice(0,10);
      s.commandes = [{id:"ka", client:{nom:"Zoé"}, cid:"c1", prixConvenu:50, fraisLivraison:0, statut:"annulee",
        versement:{montant:20, date:iso, type:"acompte"}, paiements:[], dateCommande:new Date().toISOString(),
        canal:"direct", note:"", variantes:"", libelle:"", datePromise:""}];
      window.CrochomptePont.ecrire(s);
    });
    await onglet(p, 'Commandes');
    await p.locator('#main').getByRole('button', {name:'Ouvrir'}).first().click(); await p.waitForTimeout(300);
    const bR = p.getByRole('button', {name:/J'ai remboursé/});
    R.remb_bouton = await bR.count() === 1;
    if (!R.remb_bouton) R.remb_ecran = (await p.textContent('#main')).slice(0, 600);
    if (await bR.count()){
      await bR.click(); await p.click('.dlg [data-oui]'); await p.waitForTimeout(300);
      const ka = await p.evaluate(()=>window.CrochomptePont.lire().commandes[0]);
      R.remb_ligne_negative = ka.paiements.length === 1 && ka.paiements[0].montant === -20;
    }

    /* 4. Sauvegarde : le fichier contient les photos, la restauration les remet */
    await p.evaluate(async ()=>{
      const s = window.CrochomptePont.lire();
      s.creations[0].photo = "ph_test";
      window.CrochomptePont.ecrire(s);
      const c = document.createElement('canvas'); c.width = c.height = 8;
      const blob = await new Promise(r=>c.toBlob(r, 'image/jpeg'));
      await window.CrochomptePont.photo.ecrire("ph_test", blob);
    });
    await onglet(p, 'Réglages');
    await p.locator('#main').getByText('Mes données', {exact:true}).first().click(); await p.waitForTimeout(250);
    const dlP = p.waitForEvent('download', {timeout:5000}).catch(()=>null);
    await p.getByRole('button', {name:'Télécharger ma sauvegarde'}).click().catch(()=>{});
    const dl = await dlP;
    let contenu = null;
    if (dl){ const f = await dl.path(); contenu = require('fs').readFileSync(f, 'utf8'); }
    R.sauvegarde_telechargee = !!contenu;
    R.sauvegarde_avec_photo = !!contenu && /"_photos":\{"ph_test":"data:image\/jpeg;base64,/.test(contenu);
    if (contenu){
      /* On efface la photo, puis on restaure le fichier */
      await p.evaluate(()=>new Promise(r=>{ const q = indexedDB.open("atelier-photos",1); q.onsuccess=()=>{ const tx=q.result.transaction("img","readwrite"); tx.objectStore("img").clear(); tx.oncomplete=()=>r(); }; }));
      await p.fill('#reg-restaurer', contenu);
      await p.getByRole('button', {name:'Restaurer cette sauvegarde'}).click();
      await p.click('.dlg [data-oui]'); await p.waitForTimeout(800);
      R.restauration_photo_remise = await p.evaluate(()=>window.CrochomptePont.photo.lire("ph_test").then(b=>!!b));
      R.restauration_sans_champ_photos = await p.evaluate(()=>!("_photos" in window.CrochomptePont.lire()));
      /* Une sauvegarde abîmée ne remplace rien */
      await onglet(p, 'Réglages');
      await p.locator('#main').getByText('Mes données', {exact:true}).first().click(); await p.waitForTimeout(250);
      const avant = await p.evaluate(()=>window.CrochomptePont.lire().creations.length);
      await p.fill('#reg-restaurer', '{"matieres":[],"creations":"pas une liste"');
      await p.getByRole('button', {name:'Restaurer cette sauvegarde'}).click(); await p.waitForTimeout(200);
      R.sauvegarde_abimee_refusee = (await p.locator('.dlg').count()) === 0 &&
        (await p.evaluate(()=>window.CrochomptePont.lire().creations.length)) === avant;
    }
    /* 5. Numéros de facture : code propre au compte, à la suite, sans trou */
    await p.evaluate(()=>{
      const s = window.CrochomptePont.lire();
      Object.assign(s.reglages, {raisonSociale:"Marie Dupont", adresse:"1 rue des Lilas, 69000 Lyon", statut:"non_declare", mode:"complet"});
      const an = new Date().getFullYear(), iso = new Date().toISOString().slice(0,10);
      const cmd = (id, nom, num) => ({id, client:{nom}, cid:null, prixConvenu:40, fraisLivraison:0, statut:"livree",
        versement:{montant:0, date:null, type:"acompte"}, paiements:[], dateCommande:new Date().toISOString(),
        canal:"direct", note:"", variantes:"", libelle:"Bonnet", datePromise:iso, factureNum:num, factureLe:num ? new Date().toISOString() : null});
      s.commandes = [cmd("f0","Ancienne", an + "-0003"), cmd("f1","Nina", null), cmd("f2","Lou", null), cmd("f3","Ana", null)];
      window.CrochomptePont.ecrire(s);
    });
    const emettre = async nom => {
      await onglet(p, 'Commandes');
      const ligne = p.locator('#main tr', {hasText: nom});
      await ligne.getByRole('button', {name:'Ouvrir'}).click(); await p.waitForTimeout(250);
      const [fen] = await Promise.all([p.waitForEvent('popup'), p.getByRole('button', {name:'Établir la facture'}).click()]);
      await p.waitForTimeout(400);
      const titre = await fen.title(); await fen.close();
      return titre;
    };
    const an = new Date().getFullYear();
    const t1 = await emettre('Nina');
    const nums = () => p.evaluate(()=>window.CrochomptePont.lire().commandes.map(c=>c.factureNum));
    let n = await nums();
    R.facture_code_et_suite = n[1] === "K7R2M-" + an + "-0004";          // suit l'ancienne 2026-0003, avec le code du compte
    R.facture_fenetre_remplie = t1.includes(n[1]);
    await emettre('Lou'); n = await nums();
    R.facture_suivante = n[2] === "K7R2M-" + an + "-0005";
    /* Sans réseau : pas de numéro, un message clair, rien d'émis */
    await p.evaluate(()=>{ window.__fauxEchecFacture = true; });
    await onglet(p, 'Commandes');
    await p.locator('#main tr', {hasText:'Ana'}).getByRole('button', {name:'Ouvrir'}).click(); await p.waitForTimeout(250);
    const pop = p.waitForEvent('popup').catch(()=>null);
    await p.getByRole('button', {name:'Établir la facture'}).click(); await p.waitForTimeout(500);
    n = await nums();
    R.facture_sans_reseau_rien_emis = n[3] === null;
    R.facture_sans_reseau_message = /Réessaie/.test(await p.textContent('body'));
    const fenAna = await pop; R.facture_sans_reseau_fenetre_fermee = !fenAna || fenAna.isClosed();
    await p.close();

    /* 6. Tous les écrans, ordinateur et téléphone : pas de NaN, pas de
       « undefined », pas de défilement horizontal */
    for (const vp of [{width:1280,height:900},{width:390,height:844}]){
      p = await page(b, vp); await connecter(p); await graine(p); await modeComplet(p);
      let defauts = [];
      await toutParcourir(p, async t=>{
        const txt = await p.textContent('#main');
        if (/\bNaN\b|undefined|\[object Object\]|Infinity/.test(txt)) defauts.push(t + ": texte suspect");
        const deb = await p.evaluate(()=>document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (deb > 2) defauts.push(t + ": déborde de " + deb + " px");
      });
      /* Chaque rubrique des Réglages */
      await onglet(p, 'Réglages');
      for (const r of ["Mon compte","Mon activité","Mes charges","Canaux de vente","Facturation","Mes données"]){
        const l = p.locator('#main').getByText(r, {exact:true}).first();
        if (!(await l.count())) { defauts.push("rubrique absente : " + r); continue; }
        await l.click(); await p.waitForTimeout(200);
        const txt = await p.textContent('#main');
        if (/\bNaN\b|undefined|\[object Object\]/.test(txt)) defauts.push(r + ": texte suspect");
        const deb = await p.evaluate(()=>document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (deb > 2) defauts.push(r + ": déborde de " + deb + " px");
        await onglet(p, 'Réglages');
      }
      R["ecrans_" + vp.width] = defauts.length ? defauts.join(" ; ") : true;
      await p.close();
    }
  } catch (e) { R._echec = String(e && e.stack || e); }
  console.log(JSON.stringify(R, null, 1));
  console.log("ERREURS JS: " + (errs.length ? errs.join(" | ") : "aucune"));
  await b.close();
})();
