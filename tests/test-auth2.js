const {chromium} = require('./outils').playwright;
const path = require('path');

(async () => {
  const b = await chromium.launch(require('./outils').lancement);
  const p = await b.newPage({serviceWorkers:'block', viewport:{width:420, height:1400}});
  const erreurs = [];
  p.on('pageerror', e => erreurs.push('PAGEERROR: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') erreurs.push('CONSOLE: ' + m.text()); });

  await p.route('**/cdn.jsdelivr.net/**', route => {
    route.fulfill({ path: path.join(__dirname,'faux-supabase.js'), contentType: 'application/javascript' });
  });

  let dernierCorpsInscription = null, dernierCorpsConnexion = null, dernierCorpsOubli = null;
  await p.route('**/functions/v1/inscription', route => {
    dernierCorpsInscription = JSON.parse(route.request().postData());
    route.fulfill({ status: 200, contentType:'application/json', body: JSON.stringify({inscrite:true}) });
  });
  await p.route('**/functions/v1/connexion', route => {
    dernierCorpsConnexion = JSON.parse(route.request().postData());
    route.fulfill({ status: 200, contentType:'application/json',
      body: JSON.stringify({access_token:'AT', refresh_token:'RT'}) });
  });
  await p.route('**/functions/v1/mot-de-passe-oublie', route => {
    dernierCorpsOubli = JSON.parse(route.request().postData());
    route.fulfill({ status: 200, contentType:'application/json', body: JSON.stringify({envoye:true}) });
  });

  await p.goto('http://127.0.0.1:8934/index.html');
  await p.waitForTimeout(400);   // écran de connexion obligatoire au démarrage

  const resultats = {};

  try {
    // ── Connexion : libellés professionnels ──
    resultats.titre_connexion = (await p.textContent('.auth-titre')).trim() === 'Se connecter';
    resultats.libelle_identifiant = (await p.textContent('label[for="sy-c-identifiant"]')).includes('Pseudo ou adresse e-mail');
    resultats.lien_oubli_pres_du_mdp = await p.isVisible('label[for="sy-c-mdp"] #sy-vers-oubli');
    resultats.presentation_portail = (await p.textContent('.portail-pres h1')).length > 10;

    await p.click('#sy-vers-inscription');
    await p.waitForTimeout(150);
    resultats.titre_inscription = (await p.textContent('.auth-titre')).trim() === 'Créer un compte';
    resultats.libelle_confirmer = (await p.textContent('label[for="sy-i-mdp2"]')).includes('Confirmer le mot de passe');
    resultats.plus_de_confirme_le = !(await p.textContent('#main')).includes('Confirme-le');
    resultats.formulaire_allege =
      await p.isVisible('#sy-i-pseudo') && await p.isVisible('#sy-i-mail') &&
      await p.isVisible('#sy-i-mdp1') && await p.isVisible('#sy-i-mdp2') && await p.isVisible('#sy-i-age');

    // Afficher / masquer le mot de passe
    await p.fill('#sy-i-mdp1', 'secret123');
    await p.click('[data-voir="sy-i-mdp1"]');
    resultats.afficher_mdp = (await p.getAttribute('#sy-i-mdp1', 'type')) === 'text';
    await p.click('[data-voir="sy-i-mdp1"]');
    resultats.masquer_mdp = (await p.getAttribute('#sy-i-mdp1', 'type')) === 'password';

    await p.fill('#sy-i-pseudo', 'dejapris');
    await p.waitForTimeout(700);
    resultats.pseudo_pris_signale = (await p.textContent('#sy-i-pseudo-etat')).includes('déjà pris');
    await p.fill('#sy-i-pseudo', 'LaineEtCie');
    await p.waitForTimeout(700);
    resultats.pseudo_dispo_signale = (await p.textContent('#sy-i-pseudo-etat')).includes('disponible');

    // Sans la case : refus, champ signalé, rien d'envoyé
    await p.fill('#sy-i-mail', 'marie@exemple.fr');
    await p.fill('#sy-i-mdp1', 'motdepasse123');
    await p.fill('#sy-i-mdp2', 'motdepasse123');
    await p.press('#sy-i-mdp2', 'Enter');          // la touche Entrée valide
    await p.waitForTimeout(150);
    resultats.refuse_sans_case_age = (await p.textContent('.auth-erreur')).includes('15 ans ou plus') && !dernierCorpsInscription;
    resultats.saisie_preservee = (await p.inputValue('#sy-i-pseudo')) === 'LaineEtCie' && (await p.inputValue('#sy-i-mail')) === 'marie@exemple.fr';

    // Mots de passe différents : message clair, champ en erreur
    await p.check('#sy-i-age');
    await p.fill('#sy-i-mdp1', 'motdepasse123');
    await p.fill('#sy-i-mdp2', 'autrechose12');
    await p.click('#sy-i-valider');
    await p.waitForTimeout(150);
    resultats.mdp_differents = (await p.textContent('.auth-erreur')).includes('ne sont pas identiques')
      && (await p.getAttribute('#sy-i-mdp2', 'aria-invalid')) === 'true';

    // Inscription valide → écran « Confirme ton adresse e-mail »
    await p.fill('#sy-i-mdp1', 'motdepasse123');
    await p.fill('#sy-i-mdp2', 'motdepasse123');
    if (!(await p.isChecked('#sy-i-age'))) await p.check('#sy-i-age');
    await p.click('#sy-i-valider');
    await p.waitForTimeout(300);
    resultats.corps_inscription_minimal = !!(dernierCorpsInscription
      && dernierCorpsInscription.pseudo === 'LaineEtCie' && dernierCorpsInscription.email === 'marie@exemple.fr'
      && dernierCorpsInscription.motDePasse === 'motdepasse123' && dernierCorpsInscription.age15 === true
      && !('prenom' in dernierCorpsInscription));
    resultats.ecran_verifier = (await p.textContent('.auth-titre')).includes('Confirme ton adresse e-mail')
      && (await p.textContent('.auth')).includes('marie@exemple.fr');
    await p.click('#sy-vers-connexion-btn');
    await p.waitForTimeout(150);
    resultats.identifiant_prerempli = (await p.inputValue('#sy-c-identifiant')) === 'LaineEtCie';

    // ── Mot de passe oublié → écran de confirmation ──
    await p.click('#sy-vers-oubli');
    await p.waitForTimeout(150);
    resultats.oubli_prerempli = (await p.inputValue('#sy-o-identifiant')) === 'LaineEtCie';
    await p.fill('#sy-o-identifiant', 'marie@exemple.fr');
    await p.click('#sy-o-valider');
    await p.waitForTimeout(300);
    resultats.oubli_avec_adresse_ok = !!(dernierCorpsOubli && dernierCorpsOubli.identifiant === 'marie@exemple.fr');
    resultats.ecran_lien_envoye = (await p.textContent('.auth-titre')).includes('Vérifie ta boîte mail');
    await p.click('#sy-vers-connexion-btn');
    await p.waitForTimeout(150);

    // ── Connexion ──
    await p.fill('#sy-c-identifiant', 'marie@exemple.fr');
    await p.fill('#sy-c-mdp', 'motdepasse123');
    await p.click('#sy-c-valider');
    await p.waitForTimeout(600);
    resultats.connexion_avec_adresse_ok = !!(dernierCorpsConnexion && dernierCorpsConnexion.identifiant === 'marie@exemple.fr');

    // ── Premier écran : l'accueil (tableau de bord) ──
    resultats.accueil_en_premier = (await p.textContent('#nav [aria-current="true"]')).trim() === 'Accueil';
    resultats.bonjour_pseudo = (await p.textContent('.acc-hero h1')).includes('Bonjour LaineTest');
    resultats.premiers_pas = (await p.textContent('#main')).includes('Pour bien démarrer');
    resultats.aucune_creation_exemple = await p.evaluate(()=> window.CrochomptePont.lire().creations.length === 0);

    // ── Mon compte ──
    await p.click('#menu-btn'); await p.waitForTimeout(150);
    resultats.menu_ouvert = await p.isVisible('#mm-liste');
    await p.goBack(); await p.waitForTimeout(300);
    resultats.retour_ferme_menu = !(await p.isVisible('#mm-liste')) && (await p.textContent('.acc-hero h1')).includes('Bonjour');
    await p.click('#menu-btn'); await p.click('#mm-liste >> text=Réglages'); await p.waitForTimeout(600);
    await p.click('.reg-item[data-section="compte"]'); await p.waitForTimeout(300);
    resultats.profil_affiche = (await p.textContent('.compte-infos')).includes('LaineTest') && (await p.textContent('.compte-infos')).includes('test@exemple.fr');
    resultats.profil_prerempli = (await p.inputValue('#sy-p-prenom')) === 'Marie' && (await p.inputValue('#sy-p-ville')) === 'Lyon';
    await p.fill('#sy-p-ville', 'Marseille');
    await p.click('#sy-p-valider');
    await p.waitForTimeout(250);
    const profilModifie = await p.evaluate(() => window.__dernierProfilModifie);
    resultats.modification_profil = !!(profilModifie && profilModifie.p_ville === 'Marseille' && profilModifie.p_prenom === 'Marie');

    // Changer le mot de passe
    await p.click('#sy-mdp-ouvrir');
    await p.fill('#sy-m1', 'nouveaumdp1'); await p.fill('#sy-m2', 'nouveaumdp2');
    await p.click('#sy-mdp-form button[type=submit]'); await p.waitForTimeout(150);
    resultats.changement_mdp_refuse_si_differents = (await p.textContent('#sy-m-err')).includes('identiques');
    await p.fill('#sy-m2', 'nouveaumdp1');
    await p.click('#sy-mdp-form button[type=submit]'); await p.waitForTimeout(300);
    resultats.changement_mdp_ok = (await p.textContent('body')).includes('Mot de passe modifié');

    // Suppression du compte : boîte de confirmation avec saisie du pseudo
    await p.click('#sy-del'); await p.waitForTimeout(200);
    resultats.dialogue_suppression = await p.isVisible('.dlg') && (await p.textContent('.dlg')).includes('LaineTest');
    resultats.bouton_bloque_sans_saisie = await p.isDisabled('.dlg [data-oui]');
    await p.click('.dlg [data-non]'); await p.waitForTimeout(600);
    resultats.annuler_ferme = !(await p.isVisible('.dlg'));

    await p.click('#sy-out');
    await p.waitForTimeout(400);
    resultats.deconnexion_ok = await p.isVisible('#sy-c-identifiant');
  } catch (e) {
    resultats._echec = e.message;
  }

  console.log(JSON.stringify(resultats, null, 2));
  console.log('ERREURS JS:', erreurs.length ? erreurs.join(' | ') : 'aucune');

  await b.close();
})();
