# Crochompte — règles métier

Ce document décrit ce que l'application calcule et comment elle se comporte.
Il sert de référence : **toute modification du code qui change une de ces
règles doit d'abord changer ce document**, et les tests correspondants
(`tests/test-v37.js`, `tests/test-v37-lot10.js`, `tests/test-v37-lot11.js`,
`tests/test-v38.js`, `tests/test-v39.js`, `tests/sql/`).

Dernière mise à jour : V39 (28 septembre 2026).

---

## 1. Vocabulaire

| Terme | Ce que c'est |
|---|---|
| **Modèle** | Une pièce précise du catalogue, avec sa photo et son patron d'origine. |
| **Type d'ouvrage** | Une base de calcul du catalogue (matières et temps habituels), sans photo : « Amigurumi moyen ». |
| **Création** | Ce que l'artisane vend, avec son calcul : matières, temps, lieu de vente, prix. |
| **Pièce** | Un exemplaire fabriqué d'une création (suivi dans l'onglet « Mes pièces », anciennement « Atelier »). |
| **Commande** | Ce qu'une cliente a demandé : prix convenu, échéance, paiements, facture. |
| **Matière** | Ce qu'on achète pour fabriquer ou emballer (fil, rembourrage, yeux, étiquettes…). |
| **Lieu de vente** (canal) | Où la pièce est vendue : main propre, marché, Etsy… avec ses frais. |
| **Tes frais** | Tout ce que coûte une pièce sauf ton temps : matières, chutes, emballage, frais de vente, cotisations, part des frais fixes. |
| **Prix juste** | Le prix qui paie tous les frais ET le temps au taux horaire visé. |
| **Plancher** | Le prix en dessous duquel on paie pour travailler (frais couverts, temps non payé). |
| **Gain de l'heure** | Ce qui reste après tous les frais, divisé par les heures de travail. |

---

## 2. Coût et prix d'une création (fonction `calculer`)

Toutes les lignes sont **arrondies au centime**, et chaque total est calculé
à partir des lignes arrondies : ce qui est affiché s'additionne toujours
exactement.

1. **Coût unitaire d'une matière**, selon le réglage « base de calcul » :
   dernier prix payé ÷ contenance (par défaut), prix moyen payé (si connu),
   ou **le moins cher** de ses fournisseurs (prix du lot ÷ contenance du lot ;
   à défaut d'offre, dernier prix payé).
2. **Matières** = Σ (coût unitaire × quantité), en deux parts :
   - consommables (tout sauf l'emballage) ;
   - emballage (catégorie « fin »).
3. **Chutes et ratés** = taux de perte × consommables **qui se coupent ou se
   mesurent** (fil, rembourrage, tissu). Pas de perte sur ce qui se compte à
   l'unité (unités : pièce, paire, unité, utilisation, bouton, yeux, anneau,
   lot) ni sur l'emballage. Même règle pour la sortie de stock et la liste
   d'achats.
4. **Temps** = Σ minutes des postes (préparation, crochet, assemblage,
   finition, emballage) + **temps hors crochet** (réglage « heures par mois
   hors crochet » ÷ pièces vendues par mois ; 0 par défaut).
5. **Main-d'œuvre** = heures × taux horaire visé.
6. **Part des frais fixes** = frais fixes du mois ÷ max(1, pièces par mois).
7. **Frais de vente** : pourcentage (commission + paiement + publicité ×
   part des ventes), TVA sur ces frais comprise, plus frais fixes par vente
   et expédition.
8. **Cotisations** = prix × taux de cotisations (sur le prix de vente).
9. **Reste** = prix − (matières + part des frais fixes + frais de vente +
   cotisations).
10. **Gain de l'heure** = reste ÷ heures (si le temps est indiqué).
11. **Prix juste** = (matières + frais fixes + frais fixes de vente +
    main-d'œuvre) ÷ (1 − taux cotisations − pourcentage de vente), **arrondi
    au centime supérieur**, puis vérifié : au prix affiché, le reste couvre
    vraiment la main-d'œuvre (sinon +1 centime).
12. **Plancher** : même calcul sans la main-d'œuvre, même vérification.
13. Si cotisations + pourcentage de vente ≥ 100 % : aucun prix ne peut
    couvrir les coûts (« impossible »).

**Verdict** (le même partout, fonction `verdictCalcul`) :
prix 0 → « Prix à fixer » ; reste < 0 → « À perte » ; temps 0 → « Temps à
indiquer » ; puis « Très sous-payée » (< 50 % de l'objectif), « Sous-payée »
(< 90 %), « Tu t'y retrouves ».

**Bornes** : les réglages, prix et quantités sont bornés à l'import et à la
saisie (ex. taux de perte 0–60 %, cotisations 0–50 %, frais de canal 0–100 %).
Une valeur ramenée à la borne est réaffichée.

**Saisie** : tous les champs numériques acceptent la virgule (« 45,50 ») et
« 1.234,56 » ; lettres et signe moins refusés.

**Vraisemblance** (signalée, jamais bloquée) : gain de l'heure supérieur à
100 € et à 5 fois l'objectif, ou prix supérieur à 10 fois le prix juste (fiche) ;
prix convenu supérieur à 10 fois le prix juste de la création (commande).

**Enregistrer une fiche** que quelqu'un a modifiée ailleurs depuis son
ouverture (autre appareil, autre onglet) demande confirmation.


### 2.1 Marges affichées dans la fiche (définitions Bpifrance)

Affichées dès que la fiche a un prix. Le **coût de revient complet** est celui
de `calculer` (matières, frais, cotisations **et** main-d'œuvre au taux visé).

- **Marge en plus de ton salaire** = prix − coût de revient complet.
- **Taux de marge** = marge ÷ coût de revient.
- **Taux de marque** = marge ÷ prix de vente.
- **Coefficient sur les matières** = prix ÷ coût des matières, comparé à la
  règle courante « matières × 3 » quand elle donne moins que le prix juste.
- **Pièces par mois pour payer les frais fixes** = frais fixes du mois ÷
  (prix − matières − frais de vente − cotisations), arrondi au-dessus
  (seuil de rentabilité, avant de se payer).

### 2.2 Prévu et réel

- **Temps réel** : moyenne chronométrée (voir §5). **Matières réelles** :
  l'artisane pèse ce qui reste à la fin d'une pièce, ou saisit ce qu'elle a
  utilisé (« Estimé / réel » dans Mes pièces), seulement pour ce qui se pèse
  ou se mesure.
- Prévu = quantité de la fiche × (1 + taux de perte). L'écart réel − prévu
  devient un mouvement de stock **« Pesée »** (correction, relié à la pièce) ;
  resaisir la pesée ne corrige que la différence avec la précédente. Pour une
  pièce pas encore sortie du stock, la correction se fait quand elle passe en
  Terminée.
- La fiche montre **ce qu'elle avait au début (estimé) et ce que coûtent
  vraiment les pièces** (matières et temps réels valorisés au taux visé), avec
  le bouton « Utiliser les quantités réelles dans ma fiche » (quantité nette =
  moyenne réelle ÷ (1 + taux de perte)). Rien ne change sans ce clic.

---

## 3. Historique : ce qui ne change plus

| Événement | Ce qui est figé | Où |
|---|---|---|
| Une pièce passe en **Vendue** | prix, matières, frais, cotisations, reste, temps (mesuré au chronomètre si disponible, poste par poste, sinon estimé), gain de l'heure, taux horaire du moment | `piece.fige` |
| Une commande passe en **Livrée** | bilan complet (coût, heures, gain de l'heure, taux horaire du moment) | `commande.bilanFige` |
| Une **facture** ou un **avoir** est émis | le document entier (vendeur, cliente, lignes, paiements, mentions) | `commande.facture`, registre local et serveur |

Changer ensuite le prix d'une matière, le taux horaire ou les cotisations ne
modifie **aucune** de ces valeurs. Les ventes antérieures à la V37 ont été
figées une fois, avec les chiffres connus (marquées « estimé »).

- **Corriger le prix** d'une pièce vendue ne change que ce qui dépend du prix
  (cotisations, frais de vente en %, reste, gain de l'heure), avec les taux du
  jour de la vente ; matières, frais fixes, temps et taux horaire restent ceux
  de la vente (`reprixVente`).
- Une pièce qui **quitte « Vendue »** perd sa date et ses chiffres de vente, et
  est détachée de sa commande (noté dans l'historique de la commande). Revendue,
  elle est figée à sa nouvelle date.
- Une commande qui quitte « Livrée » puis y revient **garde son bilan figé**
  si rien de ce qui le fonde n'a changé (prix, lieu de vente, création,
  livraison, heures) ; sinon le bilan est refait.

---

## 4. Stock des matières

- Chaque mouvement enregistre : date, type, quantité, prix unitaire, total,
  stock **avant** et **après**, prix moyen et dernier prix **avant**, note.
  Le journal n'est **jamais tronqué**.
- **Achat** : stock + quantité ; le prix moyen est recalculé sur ce qui était
  réellement en stock (un stock négatif est d'abord couvert par l'achat) ; le
  dernier prix payé devient la référence. Sans prix saisi, l'achat est
  **estimé** au prix de la fiche et marqué « prix estimé » (il ne change pas le
  dernier prix).
- Avant tout mouvement : **récapitulatif** et alerte si le prix du lot est
  plus de 4 fois supérieur ou inférieur au prix habituel.
- **Sortie** : stock − quantité (peut devenir négatif : alerte persistante).
- **Fabrication** (pièce passée en Terminée) : sortie automatique de
  quantité × (1 + taux de perte) pour ce qui a une perte (voir §2.3), une
  seule fois par pièce.
- **Inventaire** : remplace le stock par la quantité comptée, et enregistre
  l'**écart** (quantité et valeur).
- **Annulation** : seul le **dernier** mouvement d'une matière s'annule ; il
  remet exactement stock, prix moyen et dernier prix ; le journal garde les
  deux lignes. Un mouvement plus ancien se corrige par un inventaire.
- **Unité** d'une matière déjà utilisée : changement soumis à confirmation
  (rien n'est converti). **Contenance** d'une matière utilisée : confirmation
  avec le prix au g avant/après.
- **Suppression** d'une matière : confirmation dès qu'elle a du stock, des
  achats ou sert dans une création ; ses **achats restent** dans les
  indicateurs (`achatsArchives`).
- **Perte** : stock − quantité, avec un **motif** (ouvrage raté ou défait,
  pelote abîmée, chutes, perdue, autre), valorisée au prix moyen payé.
  **Utilisée hors pièce** : sortie simple. **Pesée** : correction signée
  issue du prévu / réel (§2.2).
- **Pièce ratée** (statut « Ratée / jetée ») : ce qu'elle a coûté en matières
  est figé comme perte le jour où elle est jetée ; elle sort du stock de
  pièces ; la remettre dans un autre statut annule la perte.
- Pertes affichées (Matières et Indicateurs) : total, par motif, pièces
  ratées, et **équivalent en pelotes** pour le fil (quantité ÷ contenance).
- **Bain de teinture** : noté librement sur l'achat.

### 4.1 Fournisseurs et prix comparés

- Un fournisseur = un nom (+ site, note). Chaque matière garde **un tarif par
  fournisseur** : prix du lot, contenance du lot (peut différer de celle de
  la matière), date du relevé, lien, et les 12 prix précédents.
- La comparaison se fait **à l'unité** (au g, au m, à la pièce) : le moins
  cher est surligné, avec l'économie en % face au dernier prix payé.
- Un achat noté chez un fournisseur **met à jour son tarif** ; annuler cet
  achat remet le tarif d'avant.
- **Économie possible** = Σ, sur les achats des 12 derniers mois,
  (prix unitaire payé − prix unitaire du moins cher) × quantité, quand c'est
  positif. Tous les prix sont ceux **saisis par l'artisane** : Crochompte
  n'invente aucun tarif.

---

## 5. Créations, pièces et commandes

- **Un seul écran « Mes créations »** : chaque création (le modèle et sa
  fiche de coût, l'estimation) avec, dessous, chaque **pièce** fabriquée
  (la réalité). Il n'y a plus d'onglet « Mes pièces » ; l'onglet de la fiche
  ouverte porte le nom de la création (« Fiche : Lapin »).
- **Coût d'une pièce** (`coutPiece`) = matières (pesées si on l'a fait, sinon
  celles de la fiche, + matières des retouches) + main-d'œuvre (temps
  chronométré, complété par la fiche pour les postes non mesurés, au taux
  visé) + part des frais fixes + frais de vente + cotisations. Le détail
  montre à part conditionnement (emballage) et transport (expédition).
  Prix de vente = celui saisi sur la pièce, sinon celui de la fiche ; prix
  cible = prix juste de la fiche ; **gain** = prix − coût complet ; gain de
  l'heure = (prix − coût hors main-d'œuvre) ÷ heures. Code couleur : vert
  (≥ 90 % de l'objectif), orange (sous l'objectif), rouge (< 50 %, à perte,
  ratée).
- **Retouche** : passer une pièce « À retoucher » ouvre une note (motif,
  matières ajoutées en €). Le temps chronométré pendant la retouche et ces
  matières s'ajoutent au coût de la pièce (« dont retouches »).
- **Pièce ratée** : son coût affiché = matières jetées (perte figée) + temps
  passé ; gain = − ce coût. Les Indicateurs, eux, ne comptent en « pertes »
  que les matières (voir §4).
- **Accueil** : la phrase du mois dit l'encaissé et le nombre de pièces
  terminées (ou le temps chronométré) ; le panneau « Reprendre » montre, dans
  l'ordre : le chronomètre en cours, la fiche non enregistrée, la pièce en
  cours ou à retoucher, sinon la dernière création touchée.

- Une création qui a des **ventes ou des commandes** ne se supprime pas : elle
  s'**archive** (masquée des listes et des choix, historique intact,
  « Ressortir » possible).
- Une pièce en « Commande client » passée en **Vendue** est **reliée** à la
  commande de la même création qui attend une pièce (la plus proche échéance
  d'abord, puis la plus ancienne) : l'argent est compté **une seule fois**,
  dans la commande — y compris dans l'« encaissé » de l'Atelier et de la fiche.
- **Partager un patron** se fait depuis la liste « Mes patrons » (bouton
  « Partager… »), jamais pendant la saisie, en deux temps : formulaire (nom
  d'autrice, niveau, matériel, licence, déclaration de droits obligatoire),
  puis rappel « visible par toutes » avec « Confirmer le partage » ou
  « Annuler ». Sans texte (80 caractères), pas de partage.
- **Patron d'une création** : au choix un patron personnel, ou un patron de
  la **bibliothèque partagée** (libre de droits, auteur et licence affichés) :
  il est d'abord copié dans « Mes patrons » puis relié à la fiche ; une
  deuxième liaison réutilise la copie. Les patrons personnels sont **privés** :
  ils n'apparaissent jamais dans la bibliothèque partagée tant qu'ils ne sont
  pas publiés volontairement (publication réservée aux patrons dont
  l'artisane a les droits).
- Chronomètre : la moyenne d'un poste (préparation, crochet…) se calcule sur
  les seules pièces où **ce poste** a été mesuré.
- Passer en « Vendue » une pièce qui n'était pas « Commande client » alors
  qu'une commande de la même création attend une pièce : Crochompte demande
  si elle est pour cette commande (« Oui » la relie, « Non » la vend à part).
- Après l'accord de la cliente, changer son nom, le prix convenu ou la
  livraison facturée est inscrit dans l'historique de la commande.
- **Plan de charge** : travail restant = estimation − temps déjà chronométré ;
  les commandes en retard passent en premier ; « 0 h par jour » est respecté.
- Paiements : montants au centime ; une erreur se corrige par une **ligne
  d'annulation** datée ; un remboursement est une ligne négative ; arrhes
  rendues au double possibles quand l'artisane renonce.
- Toute action importante sur une commande est inscrite dans son
  **historique** (statut, accord, paiements, facture, avoir).
- **Numéro de commande** `C-AAAA-NNNN`, attribué à la création, à la suite
  dans l'année (série distincte des factures, ce que la loi permet). Les
  anciennes commandes sans numéro sont numérotées dans l'ordre de leur date.
  Un brouillon vide supprimé peut laisser un trou : aucune obligation légale
  ne porte sur les numéros de commande.
- Une commande contient **un ou plusieurs articles** : création, variante,
  quantité, **prix unitaire** ; plus des articles libres. Total dû = Σ
  (quantité × prix unitaire) + livraison facturée. Temps, bilan et besoins en
  matières s'additionnent sur tous les articles.
- Une commande de N exemplaires d'une création relie **N pièces** au plus.
- **Suivi** : la liste se filtre par étape (en cours, devis, livrées à
  facturer, livrées et facturées, reste dû, annulées) et se cherche par
  cliente, numéro ou article ; colonnes prix convenu, versé, reste dû ; une
  commande livrée sans facture est marquée « à facturer ».
- « Ce qu'il faut pour la fabriquer » : matières nécessaires, en stock, à
  acheter (avec le fournisseur le moins cher connu).
- Cliente professionnelle : son **numéro de bon de commande** est repris sur
  la facture (obligatoire quand il existe, art. L441-9 du Code de commerce).

---

## 6. Factures et avoirs

- Émission seulement si : vendeur identifié (nom, adresse, SIRET si déclarée),
  cliente nommée (adresse obligatoire pour une professionnelle), prix > 0,
  commande **acceptée** (ni devis, ni annulée). Ce qui manque est affiché
  **avant** le clic, avec le moyen de le compléter.
- **Confirmation** avant émission (c'est définitif).
- Numéro : `CODE-AAAA-NNNN`. Le code appartient à un seul compte. Avec un
  compte, le **serveur** attribue le numéro **et** enregistre la facture figée
  dans la même opération (`emettre_facture`) : aucun trou, aucun doublon, même
  à plusieurs appareils. Sans compte : numérotation locale.
- **Une seule facture active par commande** (contrôlé par l'appareil et par le
  serveur).
- Après émission : cliente, prix, livraison, acompte **verrouillés**. Les
  paiements restent possibles. Une commande facturée ne peut pas redevenir un
  **devis** ; l'annuler (depuis la liste des statuts ou depuis « Supprimer »)
  est noté dans l'historique et propose l'avoir.
- Correction ou annulation : **avoir** (numéroté à la suite), puis nouvelle
  facture si besoin. Passer une commande facturée en « Annulée » propose
  l'avoir.
- **Lignes** : un article par ligne (quantité × prix unitaire), plus la
  livraison. La facture porte « Commande n° C-… » et, si la cliente en a
  donné un, « Votre bon de commande : … » ; l'avoir garde le numéro de
  commande. Le registre a une colonne Commande (et l'export aussi).
- Mentions : numéro, dates d'émission et de vente, vendeur (+ « EI »),
  cliente (+ SIREN et adresse de livraison si renseignés), lignes, total,
  paiements reçus, reste à régler, nature de l'opération, « TVA non
  applicable, art. 293 B du CGI » si en franchise, arrhes/acompte, pénalités
  et indemnité de 40 € pour une cliente professionnelle.
- **Registre** des factures et avoirs : conservé à la remise à zéro, à la
  restauration d'une sauvegarde et sur le serveur (ni modifiable ni
  supprimable) ; exportable en tableur. Conservation légale : 10 ans.
- Franchise de TVA (règle unique Accueil / Indicateurs / facture) : un seuil
  est « dépassé » seulement **au-delà** de son montant (85 000 € pile ne le
  dépasse pas) ; perdue au 1er janvier si le seuil a été dépassé l'année précédente ; perdue tout de
  suite au-delà du seuil majoré ; entre les deux, acquise jusqu'à la fin de
  l'année. Au-delà, Crochompte bloque la facture (il ne calcule pas la TVA).
- **Facturation électronique** : obligatoire entre professionnels pour les
  micro-entreprises à partir du 1er septembre 2027 (via une plateforme
  agréée). Crochompte n'en est pas une : à prévoir (export structuré ou
  raccordement).

---

## 7. Données, comptes et sécurité

- Les données de l'atelier sont un document par compte (table `ateliers`),
  cloisonné par RLS ; historique de 30 versions ; un appareil vide n'écrase
  jamais un atelier plein ; en cas de conflit, la version de l'autre appareil
  est archivée.
- Brouillon de fiche gardé sur l'appareil (rechargement) et oublié à
  l'enregistrement, à l'abandon et à la déconnexion.
- Sauvegarde : fichier avec les photos et le profil ; restauration vérifiée
  avant de remplacer quoi que ce soit ; le registre des factures et la
  numérotation ne reculent jamais.
- Mots de passe : 12 caractères minimum ; mot de passe actuel demandé pour le
  changer ; les autres appareils sont déconnectés.
- Mémoire de l'appareil pleine : l'atelier n'est pas déclaré « à jour » ; au
  démarrage suivant, la version en ligne est archivée avant d'être remplacée.
- Une autre personne se connecte sur le même appareil : l'atelier de la
  précédente est mis de côté s'il n'était pas parti (60 jours au plus) ; ses
  photos déjà en ligne sont effacées de l'appareil, les autres attendent son
  retour.
- Partager un patron : le nom d'autrice affiché est **choisi par la
  personne** ; le pseudo n'est jamais publié à sa place. 300 patrons partagés
  au plus par compte.
- Limites du serveur : 25 Mo par atelier (et par version gardée), 10 Mo par
  photo, images JPEG, PNG ou WebP seulement.
- Deux onglets ouverts : la dernière frappe de l'onglet actif est gardée et
  un message invite à fermer l'autre onglet.
- Import : un statut de commande inconnu devient « Devis envoyé » (jamais
  compté comme une vente).
- La date de naissance n'est pas conservée (l'âge est attesté à
  l'inscription).
- Bibliothèque partagée : signalement **motivé** ; 3 signalements → revue
  (reste visible) ; 2 signalements graves → masquage provisoire ; décision
  (maintenir / retirer) prise par l'administration avec un motif ;
  contestation possible ; pas de republication identique ; pas de nom
  d'autrice emprunté au pseudo d'une autre.
