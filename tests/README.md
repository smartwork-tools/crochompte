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
| `test-v37.js` | Audit complet V37 (45 vérifications) : virgule décimale et « 1.234,56 », stock (récapitulatif, alerte de prix, annulation exacte, stock négatif, journal complet), factures (prérequis, confirmation, verrouillage, avoir numéroté, une seule facture active, registre conservé après remise à zéro, facture réglée au centime, avoir proposé à l'annulation), double comptage pièce/commande, ventes figées, verdicts (prix à fixer, temps à indiquer), prix juste suffisant, pas de perte sur les articles à l'unité, archivage, brouillon repris après rechargement, unité protégée, titre de page et lien d'évitement, menu tablette, barre de résultat sur téléphone |
| `test-v37-lot10.js` | Contre-vérification finale (17 vérifications) : correction du prix d'une vente sans réécrire ses coûts, pièce qui quitte « Vendue », liaison à la commande la plus urgente, bilan de commande gardé après un aller-retour de statut, encaissé de l'Atelier sans double compte, moyenne par poste du chronomètre, commande facturée qui ne redevient pas un devis et annulation tracée avec avoir proposé, fiche vraiment vide, photos non envoyées gardées au changement de personne, jamais « −0,00 € », taux de cotisations par défaut unique, mémoire pleine qui ne déclare pas l'appareil « à jour ». Utilise une copie de `app.js` avec une porte d'évaluation, servie au test seul. |
| `test-v37-lot11.js` | Corrections restantes de l'audit (24 vérifications) : onglet « Mes pièces », pièce vendue reliée à une commande sur demande (oui / non), prix changé après l'accord tracé, prix de commande et gain de l'heure invraisemblables signalés, fiche modifiée ailleurs annoncée avant d'écraser, stock négatif sur l'Accueil, achat en lots, bouton des seuils, graphique et boutons nommés pour les lecteurs d'écran, police des montants, trop-perçu, statut inconnu assaini, deux onglets, écran vide sans tuiles. |
| `test-v38.js` | Fournisseurs, pertes, prévu / réel, commandes (29 vérifications) : moins cher au gramme malgré des lots différents, prix saisi dans le tableau comparatif et surligné, achat qui met à jour le tarif (et annulation qui le rétablit), perte avec motif et équivalent en pelotes, base de calcul « moins cher », pièce ratée comptée en perte et annulable, pesée qui corrige le stock et le coût réel, « Prévu et réel » et quantités réelles dans la fiche, marges (taux de marge, de marque, coefficient), commande numérotée à plusieurs articles, facture avec lignes par article, numéro de commande et bon de commande client, registre relié, pièces reliées dans la limite de la quantité, anciennes commandes numérotées, patron de la bibliothèque partagée copié et relié, tuile des pertes dans les Indicateurs. |
| `test-v39.js` | Écrans repensés (42 vérifications) : plus d'onglet « Mes pièces » (ancien lien redirigé), onglet de la fiche nommé, « Mes créations » avec une carte par création et ses pièces (coût réel, filtres, recherche, retouche notée, gain qui suit le prix, détail poste par poste, ajout de pièces), Accueil (encaissé et pièces terminées, « Reprendre », chronomètre en cours), catalogue en liste complet, commandes (versé, facturée / à facturer, filtres, recherche), partage d'un patron en deux temps depuis la liste (refus sans texte, autrice et droits exigés, confirmation, annulation, publication), téléphone sans débordement. |
| `sql/` | Tests de la base PostgreSQL (cloisonnement RLS, modération, registre des factures) : voir `sql/LISEZMOI.md` |
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
