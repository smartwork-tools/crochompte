# Tests de Crochompte

Chaque fichier `test-*.js` ouvre l'application dans un vrai navigateur (Chromium, piloté par Playwright), clique comme une utilisatrice et vérifie le résultat. Supabase est remplacé par une imitation (`faux-supabase.js`) : **aucun test ne touche au vrai serveur ni aux vrais comptes**.

## Lancer les tests

Depuis le dossier `crochompte` :

```
npm install --no-save playwright-core
npx playwright install chromium
node tests/lancer.js
```

Pour ne lancer que certains tests : `node tests/lancer.js v33 auth`.

## Ce qui est vérifié

| Fichier | Ce qu'il vérifie |
|---|---|
| `test-v35.js` | Synchronisation (rien n'est envoyé sans modification, la modification arrive au serveur), chronomètre oublié plus de 4 h, remboursement d'une commande annulée, sauvegarde avec photos et restauration, sauvegarde abîmée refusée, numéros de facture (code propre au compte, suite sans trou, refus propre sans réseau), tous les onglets et rubriques sur ordinateur et téléphone sans « NaN », sans erreur et sans débordement |
| `test-v33.js` | Accueil (tableau de bord et points « À faire »), bouton « précédent », confirmations, « Annuler » après une suppression, remise à zéro, déconnexion, changement de compte, suppression des anciennes données d'exemple |
| `test-auth2.js` | Création de compte, libellés, afficher le mot de passe, mot de passe oublié, connexion, Mon compte, changement de mot de passe, suppression du compte |
| `test-sw.js` | Ouverture de l'application sans réseau |
| `test-pdf.js` | Import d'un patron en PDF (pages et texte), visionneuse de pages, photo d'une création tirée d'un PDF (fichier d'essai : `patron-test.pdf`) |
| `test-hors-ligne.js` | Travail hors ligne et envoi au retour du réseau |
| `test-indic.js` | Indicateurs : encaissements, commandes, téléphone |
| `test-patron-fiche.js` | Relier un patron à une création |
| `test-portail.js`, `test-entete.js`, `vue-reglages.js` | Écran de connexion, en-tête, rubriques des réglages |
| `test-echec-chargement.js`, `test-lien-perime.js`, `test-doublon-connexion.js`, `test-recuperation-et-regression.js`, `test-polices.js` | Cas d'erreur, liens expirés, polices hébergées sur le site |

Les captures d'écran produites vont dans `tests/captures/` (non versé dans le dépôt).
