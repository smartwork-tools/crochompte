# Journal des versions de Crochompte

Ce qui a changé, version par version, la plus récente en haut. Le détail de
chaque version (raisons, choix, tests) est dans les notes de version du
projet ; les règles de calcul sont dans `REGLES-METIER.md`.

| Version | Date | Ce qui change |
|---|---|---|
| V59 | 03/10/2026 | Mini-ERP relié de bout en bout : une commande pilote ses pièces dans l'atelier (lancer la fabrication, pièces prises dans le stock, terminées, vendues à la livraison, retour arrière propre), bouton « étape suivante » partout (liste, tableau, planning), règlement en une fenêtre pré-remplie (montant, moyen, date) ; nouvelles vues Clientèle (fiche par personne, total, à recevoir) et Planning (charge cumulée face aux heures disponibles) ; « À recevoir » distingue ce qui est déjà livré (à réclamer) de ce qui est à venir, tuile « Vendu » dans Mes chiffres ; stock de départ avec date et prix d'achat, conversion des anciens stocks de départ non comptés ; couleur habituelle par matière ; matières d'exemple masquées tant qu'elles ne servent pas ; modèles du catalogue adaptés à tes matières avec un prix de départ dans la fourchette pratiquée ; canaux de vente personnels ; patron en mode lecture (grande page, suivante/précédente, compteur et chrono) ; import des ventes Etsy (CSV) ; envoi des documents par e-mail ; écrans allégés (vues compactes par défaut quand les données grossissent, lignes cliquables, tableaux sans débordement) ; menu amateur sans Commandes ni Indicateurs sauf choix contraire ; essai sans compte reprenable ; pluriels corrigés. |
| V58.1 | 02/10/2026 | Le catalogue de modèles a une place fixe dans le menu (après Mes créations), pour tous les profils ; sur téléphone, il est dans « Plus ». |
| V58 | 02/10/2026 | Nouvelle interface : menu latéral (ordinateur), barre d'onglets (téléphone), trois ambiances de couleurs en clair ou sombre, Accueil refait (en-tête clair, priorités, « Sur le crochet », salutation avec récapitulatif depuis la dernière visite). Affichages Cartes / Liste / Compacte sur Créations et Matières, Tableau par étape sur Commandes, mémorisés par écran. Documents PDF d'une commande : devis, bon de commande, bon de livraison (pdf.js généralisé) ; relevé mensuel PDF dans Mes chiffres. Correction ou annulation de n'importe quel mouvement de stock avec recalcul (rejeu de l'historique). Fenêtre de modification d'une matière depuis les cartes et le tableau compact. |
| V57 | 01/10/2026 | Matières et factures : ajout d'une matière en une seule fenêtre (couleurs et stock de départ compris), prix à la pelote lié au total à l'achat, couleurs en pastilles compactes, bouton Dupliquer (autre contenance ou autre crochet), tableau des matières sans débordement ; factures en vrai PDF (nouveau fichier pdf.js : téléchargement, impression, partage, aperçu) ; garde-fou avant de lancer une fabrication quand la matière manque (pièce, ajout de pièces, chrono, commande). |
| V56.1 | 01/10/2026 | Correctif : « 8 min » saisies ou chronométrées sur une pièce pas terminée ne donnent plus un gain de l'heure absurde (957 €/h) ni un prix conseillé trop bas ; tant que la pièce n'est pas finie, le temps compté est au moins celui de la fiche, et le temps saisi fait foi une fois la pièce terminée. |
| V56 | 01/10/2026 | Solidité : audit croisé (métier, parcours, sécurité, maintenance) et corrections. Vente reliée à une commande = règlement noté sur la commande ; bilan d'une commande livrée recalculé sur prix / quantité / livraison ; commande annulée rend ses pièces aux ventes ; bilan minimal pour un article sans création ; gain d'une vente figé aussi pour le temps et le taux ; « saisir le temps » garde les matières figées ; bornes de période par calendrier (fin = aujourd'hui) ; registre des achats avec les matières supprimées ; recettes sans vente à 0 € ; libellés de règlement ; Accueil qui ne clignote plus sur téléphone (base connue fiable) ; « Imprimer » (factures, registres) et replis d'image compatibles CSP ; abonnement vérifié par le serveur (acces_actif, écritures refusées, lecture conservée) ; envoi sans retéléchargement (vierge vérifié côté serveur) ; IP réelle, échecs seuls comptés, délai constant (fonctions serveur) ; mot de passe vérifié côté serveur et abonnement Stripe résilié à la suppression du compte ; webhook Stripe idempotent, statuts impayés, accès offert conservé ; service worker sans mélange de versions ; textes alignés (modèle / création, Désignation / Précisions, étape Facturée en pro seulement, confirmation visible dans Mon activité) ; code mort retiré (edge/, netlify.toml, fonctions, CSS, SQL en double) ; dates par un seul formateur ; version écrite une fois (outils/version.js). |
| V55 | 01/10/2026 | Audit complet et abonnement : atelier récupéré avant l'Accueil (plus de question de profil à chaque connexion, base connue effacée à la déconnexion, réglages faits avant réception conservés, envoi en une transaction, conflit signalé des deux côtés) ; abonnement (14 jours d'essai, 7,90 € / mois, 42 € / 6 mois, 75 € / an, codes cadeaux, panneau d'administration, paiement Stripe prêt, essai sans compte 14 jours) ; « Vendre » propose la pièce en fabrication et relie la vente à la commande qui l'attend ; gain d'une vente figé (matières réelles) ; facture exigeant statut déclaré, SIRET et livraison ; pièce jetée sortie du stock ; situation demandée au choix du profil pro ; mobile (noms de matières, saisir le temps, achats en cartes, frise) ; messages limités à deux ; stock négatif seulement si suivi ; pluriels ; vocabulaire modèle / création ; CSP sans script inline (boot.js), mot de passe pour supprimer le compte, déconnexion confirmée. |
| V54 | 30/09/2026 | Clair et cohérent : Accueil à trois chiffres (gagné ce mois, en attente, ce qui te coûte), relances (devis de plus de 7 jours, livrée à facturer, impayé de plus de 30 jours), recherche dans tout l'atelier, aides « ? », dupliquer une création, avertissement avant de quitter « Vendue », gain de l'heure invraisemblable signalé, conflit d'appareils visible partout, profil amateur sans cotisations ni factures, réglages avancés repliés, thème clair / sombre, trois tailles de titre, chiffres alignés, cibles tactiles de 44 px, nouveautés et signalement d'un problème. |
| V53 | 30/09/2026 | Formulaire de matière adapté à la catégorie (fil, rembourrage, accessoire, emballage, outil) ; catégorie Outils ; crochets de 0,5 à 30 mm ; stock par couleur et par bain ; « Mes fils par couleur » ; recherche tolérante aux accents et aux fautes ; confirmation avant chaque ajout. |
| V52 | 30/09/2026 | Gain d'une pièce = prix − coût de revient (sans le temps) partout ; temps réel saisi à la main sur toute pièce. |
| V51 | 30/09/2026 | Deux profils seulement : amateur et pro. |
| V50 | 30/09/2026 | « Mes ventes » : ventes au stand et commandes livrées, reste à recevoir. |
| V44–V49 | 29/09/2026 | Profils, vendre en un geste, listes repliées, nouvelle commande en quatre questions, registres allégés. |
| V43 | 29/09/2026 | Écriture neutre, un seul nom par notion, messages revus. |
| V42 | 29/09/2026 | Commandes : tris, patrons, saisies vérifiées. |
| V41 | 29/09/2026 | « Mes créations » épurée et cohérente. |
| V40 | 29/09/2026 | Coût d'une pièce provisoire, garde-fou sur le temps. |
| V39 | 28/09/2026 | Accueil, créations fusionnées, commandes, partage. |
| V38 | 28/09/2026 | Fournisseurs, pertes, estimé et réel, commandes. |
| V37 | 28/09/2026 | Audit complet et fiabilisation. |
| V36 | 26/09/2026 | Accueil en bande verte, tri, suite d'un audit externe. |
| V35 | 26/09/2026 | Revue complète de fiabilité. |
| V34 | 25/09/2026 | Import de patrons en PDF, patrons reliés aux créations. |
| V33 | 25/09/2026 | Accueil en tableau de bord, navigation, confirmations, textes, performance. |
| V32 | 24/09/2026 | Inscription allégée. |
| V31 | 24/09/2026 | Vérification d'un audit externe et corrections. |
| V30 | 24/09/2026 | Envoi des courriels par Brevo ; une adresse, un compte. |
| V29 | 23/09/2026 | En-tête avec le compte, réglages en rubriques, indicateurs ouverts. |
| V28 | 23/09/2026 | Seuils fiscaux surveillés, mode hors ligne. |
| V27 | 21/09/2026 | Audit produit sur trois profils, module Commandes. |
| V26 | 19/09/2026 | Catalogue illustré, matières libres, stock, bibliothèque partagée. |
| V25 | 18/09/2026 | Audit professionnel complet. |
| V24 | 16/09/2026 | Comptes, effacement du compte (RGPD). |
| V23 | 16/09/2026 | Projet déployable : comptes et hébergement. |
| V22 | 16/09/2026 | Compteur de rangs mains libres. |
| V21 | 16/09/2026 | « Mes patrons ». |
| V20 | 16/09/2026 | Modèle et type d'ouvrage distingués. |
| V18 | 16/09/2026 | Le visuel dit la vérité. |
| V17 | 16/09/2026 | Plus rien à chercher. |
| V16 | 16/09/2026 | Mise en route, import de photos. |
| V15 | 16/09/2026 | Fiche autoportante. |
| V14 | 16/09/2026 | Patrons complets, liens ciblés. |
| V13 | 16/09/2026 | Patrons intégrés. |
| V10 | 16/09/2026 | Chronomètre, vocabulaire. |
| V9 | 16/09/2026 | Photos réelles (Wikimedia). |
| V8 | 15/09/2026 | Catalogue des matières, droits des photos. |
| V7 | 15/09/2026 | Catalogue de 71 types d'ouvrage, couleurs. |
| V6 | 15/09/2026 | Photos et visuel. |
| V5 | 15/09/2026 | Audit et corrections. |
| V4 | 15/09/2026 | Atelier et indicateurs. |
| V3 | 15/09/2026 | Notes produit. |
| V1 | 15/09/2026 | Premier atelier : le juste prix d'une création. |
