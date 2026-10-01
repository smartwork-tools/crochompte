# Crochompte — règles métier

Ce document décrit ce que l'application calcule et comment elle se comporte.
Il sert de référence : **toute modification du code qui change une de ces
règles doit d'abord changer ce document**, et les tests correspondants
(`tests/test-v37.js` à `tests/test-v56.js`, `tests/sql/`).

Dernière mise à jour : V56 (1er octobre 2026). Journal des versions : `CHANGELOG.md`.

---

## 0. Profils (V44, revu en V51)

- Une seule question à la première ouverture, en tête de l'Accueil : « Tu
  crochètes en amateur ou en pro ? ». Deux profils : **Créateur ou
  créatrice amateur** (pas de statut déclaré : coûts, prix, ventes ; pas de
  facture, de registres, de seuils ni de rubrique Facturation ; statut
  « pas encore déclarée » par défaut) et **Artisan ou artisane pro**
  (activité déclarée : tout est affiché). Le profil se change dans Réglages ›
  Mon activité. Un atelier d'avant reçoit un profil deviné (pro si un statut
  déclaré ou une facture existe). Les cinq profils du rapport de test
  (loisir, quelques ventes, créateur, artisan, marchés) servaient aux tests ;
  leurs identifiants sont ramenés aux deux profils.
- Onglets : Accueil, Mes créations, Commandes, Mes ventes, Mes patrons,
  Matières, Mes chiffres, Réglages. Catalogue et Mise en route n'apparaissent
  que pendant qu'on y est.
- Le mode « pour le plaisir » (matières et temps sans euros) reste dans le
  code (`profil = "passion"`) mais n'est plus proposé.

## 0.1 Vendre (V45)

- **Vendre une pièce** : quoi, prix, moyen de paiement (espèces, carte,
  virement, PayPal, chèque, autre), où, quand, à qui. La pièce en stock la
  plus ancienne passe en « Vendue » ; sans stock, une pièce terminée et
  vendue est créée et ses matières sortent. Annulable depuis le message.
- **Mes ventes** (onglet, profils vente) : toutes les ventes au même endroit,
  par période (ce jour, 7 jours, ce mois, cette année, tout). Une ligne par
  pièce vendue hors commande (payée sur le champ) et par commande livrée
  (montant, reçu, reste à recevoir, bouton « Encaisser » qui ouvre la
  commande). Filtres : payées en entier, reste à recevoir, stand et vente
  directe, commandes livrées. Tuiles : vendu, reçu (par moyen), reste à
  recevoir, caisse du jour (reçu − frais du stand). Le stand (« Vendre
  vite ») est en haut sur la vue d'un jour : moyen de paiement et lieu
  (marché / main propre) choisis une fois, une touche « Vendu » par
  création, lieu et frais du jour. `state.marches[]` garde lieu et frais
  par date ; une vente de stand porte `p.marche` = date.
- Les règlements de commande ont un moyen de paiement en liste.

## 0.2 Listes et commandes (V46–V47)

- Mes créations : au-delà de trois créations, chaque création est une ligne
  repliée ; vingt à la fois ; un filtre ou une recherche déplie. Les pièces
  vendues, offertes ou ratées vont dans un historique replié. Pièces triées
  par numéro décroissant. Cases à cocher et actions groupées (terminer,
  vendre, remettre en stock, supprimer).
- Nouvelle commande en quatre questions (qui, quoi, combien, pour quand ;
  « déjà accepté » coché par défaut). Une frise d'étapes en tête de la fiche
  avec un seul bouton pour l'étape suivante. Adresse, achat professionnel et
  pièce personnalisée sont repliés. Un devis à date dépassée est « à
  relancer », jamais en retard. La liste s'ouvre sur « En cours ». Le temps
  d'une commande se saisit en heures et minutes.

## 0.3 Registres (V49)

- **Livre des recettes** : ventes au comptant (date, nature, montant, moyen),
  acomptes et règlements de commandes (référence facture ou commande),
  remboursements en négatif. **Registre des achats** : achats de matières
  au prix noté (les achats estimés sont exclus), frais de stand. Par année,
  en tableur (CSV) ou à imprimer (PDF). Sous le statut « pas encore
  déclarée » : encart « Faut-il déclarer mes ventes ? » avec le guichet
  unique et l'URSSAF.

## 0.4 Gain d'une pièce et temps réel (V52)

- **Coût de revient** d'une pièce = matières (pesées ou de la fiche) +
  emballage + transport + frais de vente + cotisations + part des frais
  fixes. **Sans ton temps** : le temps n'est pas une dépense.
- **Gain** = prix de vente − coût de revient. C'est ce qui paie ton temps.
  **Gain de l'heure** = gain ÷ heures réelles. Un seul sens partout : ligne
  de « Mes créations », détail de la pièce, Accueil, Mes chiffres.
- Le temps valorisé à ton objectif sert seulement au **prix conseillé**
  (celui qui paierait ce temps à ton objectif) et au « coût complet »
  (`total`, `gainApresObjectif`) gardés pour information.
- **Temps saisi à la main** : sur toute pièce, vendue comprise (« saisir le
  temps » / « corriger » sous le chrono). Il remplace le chronomètre, vaut
  pour tous les postes (`tempsSaisi`), refige la vente. Relancer le chrono
  efface la marque.

## 0.5 Matières : formulaire par catégorie, couleurs, outils, recherche (V53)

- **Le formulaire « Ajouter une matière » suit la catégorie** choisie en premier (`FORM_MAT`).
  Fil : prix d'une pelote, poids (g ou m), métrage, composition, grosseur, crochet conseillé.
  Rembourrage : prix du sac, poids, composition, norme EN 71. Accessoires et finitions : prix du
  lot, nombre dans le lot, unité, taille, matériau, norme EN 71 (accessoires). Outils : type
  d'outil, diamètre (seulement pour un crochet), matériau, marque, prix d'un outil.
  Changer de catégorie garde le nom et le prix déjà tapés. Seuls nom, prix et contenance servent
  au calcul.
- **Catégorie « Outils »** (`outil`) : un outil ne se consomme pas. Il n'est pas proposé dans les
  fiches (sélecteur de matière), il ne compte ni dans la valeur du stock ni dans l'inventaire des
  matières ; son achat relève des frais fixes. Un outil sans nom prend « Crochet 4 mm »
  (type + diamètre).
- **Tailles de crochet** : de 0,5 mm (acier, dentelle) à 30 mm (`CROCHETS`).
- **Couleurs et bains** (`m.variantes` = `{id, coloris, bain, stock}`) : une matière = un format
  (« Laine X 50 g » et « Laine X 100 g » sont deux matières). Chaque couleur (et chaque bain d'une
  couleur) a son stock. `m.stock` reste le total ; la part non rattachée à une couleur est
  « sans couleur précisée » (`stockLibre`). Un mouvement porte `vid` (couleur) et `vav` (stock de
  la couleur avant) : l'annulation remet aussi la couleur. Un inventaire d'une couleur ne change
  que cette couleur ; l'inventaire « sans couleur précisée » ne touche pas les couleurs.
  L'ancien champ texte « Coloris / bain » devient la première couleur, avec tout le stock.
- **Fabrication** : la couleur retirée est celle choisie sur la ligne de la fiche (`l.vid`) ; une
  matière à une seule couleur (et sans stock sans couleur) n'en demande pas ; sinon, quand la pièce
  passe en « Terminée », rien n'est retiré pour ce fil tant que la couleur n'est pas choisie
  (`p.couleursAttente`) : une boîte la demande, et « À faire » et le stock le rappellent. Une pesée
  s'applique sur la même couleur (`p.couleurs`).
- **Mes fils par couleur** (onglet Historique du stock) : tous les fils, couleur par couleur, en
  pelotes et en grammes, avec le crochet conseillé.
- **Recherche tolérante** (`rechercheFloue`, partout où l'on cherche : créations, types
  d'ouvrage, matières, catalogue, sélecteur, commandes, fils par couleur, bibliothèque partagée) :
  accents, majuscules et ponctuation ignorés ; une faute par mot de 4 à 6 lettres, deux au-delà.
  Les résultats exacts d'abord ; s'il n'y en a pas, les plus proches, avec « Tu voulais dire … ? »
  cliquable.
- **Confirmation avant chaque ajout** : matière (formulaire, catalogue, sélecteur), achat,
  mouvement de stock, couleurs, fournisseur, commande, création. Un récapitulatif dit ce qui va
  être enregistré ; « Corriger » revient au formulaire sans rien perdre ; un doublon de nom est
  signalé.

## 0.6 Clarté et cohérence (V54)

- **Profil amateur** : statut « non déclaré » ⇒ cotisations 0 % (aussi à la
  migration d'un atelier existant). Une commande livrée n'attend pas de
  facture (étape directe « Paiement à recevoir » puis « Payée en entier ») ;
  ni tuile « À facturer », ni registre des factures, ni achat professionnel /
  SIREN, ni alerte TVA, ni mention URSSAF dans les textes.
- **Accueil** : trois tuiles. *Gagné ce mois* = Σ (prix − coût de revient)
  des pièces vendues ce mois (hors commandes) + Σ `bilanCommande().r.reste`
  des commandes livrées ce mois. *En attente* = reste à recevoir (hors devis
  et annulées), commandes à livrer, devis. *Ce qui te coûte* = achats de
  matières + pertes du mois.
- **Relances** (« À faire ») : impayé depuis plus de 30 jours après livraison
  ou facture (rouge) ; livrée à facturer (pro) ; devis sans réponse depuis
  plus de 7 jours après la date de commande.
- **Recherche globale** (en-tête) : créations, pièces, matières, commandes,
  personnes, patrons ; même moteur tolérant que §0.5 ; Entrée ouvre le premier
  résultat.
- **Dupliquer** : copie de la fiche (nouvel identifiant, « (copie) », sans
  pièces ni photo), ouverte comme brouillon ; l'ajout demande confirmation.
- **Quitter « Vendue »** : confirmation qui liste ce qui sera effacé (prix,
  date, chiffres figés, lien de commande).
- **Gain de l'heure invraisemblable** (> max(100 €, 5 × objectif)) : pas de
  vert ; « temps à vérifier » quand le temps vient de la fiche ; badge « À
  vérifier » sur la création.
- **Conflit d'appareils** : bandeau sur l'écran courant (plus seulement dans
  Mon compte), lien vers l'historique.
- **Aides « ? »** : `AIDES` (perte, cotisations, frais fixes, frais de vente,
  coût de revient, gain de l'heure, prix conseillé, taux horaire, heures hors
  crochet) ; deux phrases et un exemple chiffré.
- **Affichage** : trois tailles de titre (24 / 18 / 15 px), chiffres
  tabulaires partout, une famille de couleurs de verdict, thème clair /
  sombre / automatique propre à l'appareil (`crochompte-theme`), cibles
  tactiles ≥ 44 px sur écran tactile.
- **Réglages** : « Réglages avancés » repliés (heures par jour, heures hors
  crochet, prix de référence des matières) ; rubrique « Affichage ».
- **Nouveautés** (`NOUVEAUTES`, `VERSION_APP`) et **Signaler un problème**
  (courriel prérempli : version, écran, navigateur ; rien de personnel).

## 0.7 Abonnement, comptes, cohérence des ventes (V55)

- **Accès** (décidé par le serveur, `mon_abonnement`, `schema-abonnement.sql`) :
  14 jours d'essai à l'inscription (`abonnements.essai_fin`), puis abonnement
  payé (`actif`, jusqu'à `fin`), accès offert (`offert`, `fin` nulle =
  illimité), résilié (`resilie` : accès jusqu'à `fin`), terminé (`expire`).
  Les **administrateurs** (`admins`) ont toujours accès. Tant que le serveur
  n'a pas répondu ou que la fonction n'est pas installée, rien n'est bloqué.
- **Accès terminé** : l'atelier n'est ni effacé ni modifiable ; l'écran
  propose les trois offres (7,90 € / mois, 42 € / 6 mois, 75 € / an), un
  code cadeau, la sauvegarde, Mon compte et la déconnexion.
- **Codes cadeaux** (`codes_cadeaux`, `utiliser_code`) : une durée (ou
  l'illimité), un nombre d'utilisations, une seule fois par compte ; les
  jours offerts **s'ajoutent** à ce qui reste (essai ou abonnement). Normalisés
  en majuscules sans tirets ni espaces à la saisie.
- **Paiement** : liens de paiement Stripe (`config.js › abonnement.liens`)
  ouverts avec `client_reference_id` = identifiant du compte ; la fonction
  serveur `stripe-webhook` met `abonnements` à jour (actif jusqu'à la fin de
  période, résiliation = accès jusqu'à la fin payée). Sans liens configurés :
  offres affichées, bouton « Bientôt disponible », code cadeau possible.
- **Essai sans compte** : 14 jours sur l'appareil (`crochompte-v1.sansCompte`),
  bandeau permanent, puis écran « crée un compte » ; l'atelier local est
  envoyé au compte à la première connexion (règle existante).
- **Profil** : la question amateur / pro n'est posée qu'une fois l'atelier en
  ligne reçu (« Récupération de ton atelier… » jusque-là, 8 s au plus). Un
  réglage fait sur un appareil vierge avant la réception (profil, taux,
  identité…) est reporté dans la version reçue quand elle ne l'a pas, puis
  renvoyé. Choisir « pro » enchaîne sur la situation (taux de cotisations).
- **Synchronisation** : la base connue (`versionConnue`) est effacée à la
  déconnexion ; un atelier local vierge est toujours récupéré du serveur ;
  l'envoi passe par `enregistrer_atelier` (archive + remplacement en une
  transaction) ; le perdant d'un conflit est prévenu lui aussi.
- **Vendre** : si une pièce est en fabrication, le dialogue propose de la
  vendre (elle passe en Terminée + Vendue, avec son temps) ou d'en créer une
  nouvelle ; si une commande attend cette création, il propose de relier la
  vente (l'argent n'est compté qu'une fois, dans la commande). L'action
  groupée « Marquer vendues » prévient quand des pièces sont attendues.
- **Gain figé** : à la vente, `piece.fige.matieresReelles` (pesée et
  retouches comprises) et `emballage` sont figés ; `coutPiece` les lit. Le
  gain d'une vente ne bouge plus avec le prix d'une pelote. Mes chiffres
  (« Ce qui te rapporte le plus ») utilise `coutPiece` et `doutePiece`.
- **Facture** : exige un statut déclaré **et** un SIRET, quel que soit le
  profil, et une commande **livrée** (la date de vente est la livraison).
- **Pièce jetée** : les matières sortent du stock si ce n'était pas fait ;
  perte figée = matières réelles − emballage.
- **Commande livrée sans facture** : le bilan figé suit les corrections de
  prix, livraison, quantité, création, canal. **Supprimer une commande**
  détache ses pièces (qui restent vendues à part), et la confirmation le dit.
- **Stock négatif** : signalé seulement si le stock est suivi (un achat, un
  inventaire ou une quantité saisie) ; sinon une seule invitation.
- **Messages** : deux au plus ; ceux sans action disparaissent au changement
  d'onglet. Unités au pluriel (« 2 pièces », « 50 g »).
- **Vocabulaire** : *modèle* (du catalogue) et *création* (ta fiche).
- **Sécurité** : CSP sans script inline (`boot.js`), `connect-src` limité au
  projet ; suppression de compte avec mot de passe, fonction serveur d'abord
  (cascade) ; adresse IP = dernier élément de `x-forwarded-for` ; service
  worker : le trio index / boot / app / sync servi d'un bloc par version.

## 0.8 Solidité (V56)

- **Vente reliée à une commande** (dialogue « Vendre ») : le « prix payé »
  est noté comme **règlement de la commande** (`noterVenteSurCommande` :
  montant, moyen, date de la vente, `pieceId`), seulement s'il lui reste
  quelque chose à recevoir (le dialogue propose ce reste comme prix) ; la
  pièce elle-même n'entre dans aucun total. Annuler la vente retire ce
  règlement (`retirerVenteDeCommande`). Un simple changement de statut
  (Mes créations › Vendue) relie la pièce sans rien noter : l'argent d'une
  commande se saisit dans ses règlements.
- **Commande annulée** : ses pièces vendues sont détachées (comme à la
  suppression) et redeviennent des ventes à part.
- **Article sans création** (réparation, pièce libre) : la commande livrée a
  un bilan minimal (`sansMatieres` : prix − frais du canal − cotisations,
  matières inconnues = 0) pour compter dans « Gagné ce mois ».
- **Bilan figé** d'une commande livrée sans facture : recalculé à chaque
  correction de prix convenu, livraison facturée, quantité, heures (et
  toujours création et canal). C'était écrit en V55, mais inatteignable.
- **Vente figée** : `fige.heures`, `fige.minutes` et `fige.tauxHoraire` sont
  lus par `coutPiece` : changer le temps de la fiche, « heures hors crochet »
  ou le taux n'affecte plus une vente passée. « Saisir le temps » sur une
  vente ne refige que le temps (`refigerTemps`), jamais les matières.
- **Périodes** (`periodeVentes`) : bornes construites par calendrier (jamais
  en ajoutant 86 400 000 ms) ; la fin est la fin de la journée courante : une
  vente datée demain n'entre dans aucun total.
- **Registre des achats** : les achats d'une matière supprimée
  (`achatsArchives`) y restent. **Livre des recettes** : pas de vente à 0 € ;
  un règlement négatif a pour moyen « — ».
- **Dates** : `dateCourte`, `dateLongue`, `dateISO` (section 5) sont les seuls
  formateurs ; une date absente ou invalide s'affiche « — ».
- **Pluriels** : `pluriel()` et `plurielNb()` (nombre à virgule) partout.
- **Tuile « Tes pièces »** : « 3 vendues (dont 1 pour une commande) · 40 €
  hors commandes ».
- **Accès (serveur)** : `acces_actif()` — même verdict que `mon_abonnement`
  sans rien écrire — est exigé pour écrire (`ateliers`, `ateliers_versions`,
  `patrons_publics`, photos, `emettre_facture`, `enregistrer_atelier`) ; la
  lecture reste ouverte (atelier consultable et exportable). Côté
  application : refus `abonnement_requis` → les modifications restent sur
  l'appareil (`aEnvoyer`), l'écran d'offres s'affiche, plus d'essai
  automatique tant que l'accès n'est pas rouvert ; un code ou un paiement
  rouvre l'accès et l'envoi repart. `lireAbonnement` ne donne l'accès
  « par défaut » que si la fonction n'existe pas (jamais sur une panne).
- **Envoi** : plus de téléchargement de l'atelier avant chaque envoi ; le
  serveur vérifie lui-même qu'un atelier vide (`atelier_vierge`) ne remplace
  pas un atelier rempli (`erreur: vierge`).
- **Base connue fiable** (`versionConnue.v = 2`) : un appareil qui a déjà
  reçu ou envoyé la version en ligne est à jour même si l'atelier est vide ;
  plus de re-téléchargement à chaque ouverture ni d'écran « Récupération… »
  qui revient.
- **Stripe** : un événement n'est traité qu'une fois (`stripe_evenements`) ;
  `past_due` / `unpaid` / `incomplete` ne prolongent jamais `fin` ; un accès
  offert illimité n'est pas écrasé par un paiement ; `client_reference_id`
  doit être un UUID. La suppression du compte résilie l'abonnement Stripe.
- **Fonctions serveur** : adresse IP = `cf-connecting-ip`, puis `x-real-ip`,
  puis dernier élément de `x-forwarded-for` ; `connexion` ne compte que les
  échecs (`oublier_tentatives` au succès) ; `mot-de-passe-oublie` répond
  après un délai constant (700 ms) ; `supprimer-compte` vérifie le mot de
  passe côté serveur (5 essais par quart d'heure).
- **Service worker** : le trio est servi uniquement depuis la copie
  d'installation (plus de réécriture au passage) ; `?v=` compte.
- **Textes** : « modèle » (catalogue), « création » (ta fiche) ; articles
  d'une commande : « Désignation » / « Précisions » ; étape « Facturée » en
  profil pro seulement ; la confirmation « ce sont bien mes chiffres » est
  visible dans Mon activité et Mes charges.
- **Version** : la première ligne de `CHANGELOG.md` fait foi ;
  `node outils/version.js` la recopie ; `tests/lancer.js` refuse de tourner
  si elle diverge.
- **Schéma des données** : `state.schema` (56) est posé par `migrer()`, pour
  pouvoir un jour retirer les reprises d'anciens formats.

## 1. Vocabulaire

### 1.0 Un seul nom par notion, et une écriture pour tout le monde (V43)

- L'outil s'adresse à tout le monde : tournures neutres, sans point médian,
  tutoiement gardé. « Commandé par » (pas « cliente »), « achat professionnel /
  achat personnel », « membres » de la bibliothèque, « Créé par » et
  « Signature affichée » pour les patrons, « Session ouverte / fermée ».
- **Prix conseillé** = le prix qui paie ton temps à ton objectif horaire
  (anciens noms : prix juste, prix cible, prix pour atteindre ton objectif).
  Pour une pièce : « Prix conseillé d'après son temps réel ».
- **Création** = ce que tu fabriques et vends (ta fiche). « Modèle » et
  « type d'ouvrage » ne désignent que le catalogue.
- **Coût de revient** (prévu / réel), jamais « prix de revient ».
- **Gain de l'heure** = ce que la création te rapporte réellement par heure.
- Argent : **Reçu** / **Reste à recevoir** / **Payée en entier** (plus de
  « versé », « soldée », « reste dû » à l'écran ; la facture garde « Reste à
  régler »).
- Une commande n'a qu'une suite d'étapes : Devis · À fabriquer · En
  fabrication · Prête · Livrée (puis À facturer · Paiement à recevoir · Payée
  en entier) · Annulée. Le sélecteur de statut utilise les mêmes mots.
- Jargon remplacé : « Étape » (poste de travail), « Où tu la vends » (canal),
  « Cotisations URSSAF (% de tes ventes) », « Historique du stock »
  (mouvements), « Nom de l'article sur la facture » (désignation), « SIRET
  (ton numéro d'entreprise, 14 chiffres) ».
- À l'ouverture, aucun message quand tout va bien ; un seul message de stock
  négatif, mis à jour, même quand plusieurs pièces sortent d'un coup.

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
| **Prix conseillé** | Le prix qui paie tous les frais ET le temps au taux horaire visé (anciennement « prix juste »). |
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
11. **Prix conseillé** = (matières + frais fixes + frais fixes de vente +
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

**Pourquoi ces chiffres** (V54) :
- *Perte plafonnée à 60 %* : au-delà, plus de la moitié du fil acheté serait
  jetée ; c'est presque toujours une faute de saisie (6 tapé 60). 8 % par
  défaut correspond aux chutes et rangs défaits courants.
- *Cotisations plafonnées à 50 %* : aucun taux de micro-entreprise n'approche
  ce niveau (25,8 % au plus en 2026) ; la marge couvre un cas particulier
  saisi à la main.
- *Pas de perte sur ce qui se compte* : un œil de sécurité ne se coupe pas ;
  l'ajouter gonflerait le coût sans raison.
- *Seuils du verdict (50 % et 90 % de l'objectif)* : sous la moitié, la pièce
  ne paie pas le travail ; entre les deux, elle s'en approche ; la marge de
  10 % évite qu'une pièce à 11,90 € de l'heure pour 12 € visés paraisse
  « sous-payée ».
- *Alerte d'achat à 4 fois le prix habituel* : un écart plus faible arrive
  (promotion, autre marque) ; au-delà, c'est une virgule oubliée.
- *Gain de l'heure « à vérifier » au-delà de 100 € ou de 5 fois l'objectif*
  (V54) : un temps de fiche trop court (quelques minutes pour une pièce de
  plusieurs heures) donne un chiffre flatteur et faux ; il n'est plus montré
  en vert, et l'écran dit quoi vérifier.

**Saisie** : tous les champs numériques acceptent la virgule (« 45,50 ») et
« 1.234,56 » ; lettres et signe moins refusés.

**Vraisemblance** (signalée, jamais bloquée) : gain de l'heure supérieur à
100 € et à 5 fois l'objectif, ou prix supérieur à 10 fois le prix conseillé (fiche) ;
prix convenu supérieur à 10 fois le prix conseillé de la création (commande).

**Enregistrer une fiche** que quelqu'un a modifiée ailleurs depuis son
ouverture (autre appareil, autre onglet) demande confirmation.


### 2.1 Marges affichées dans la fiche (définitions Bpifrance)

Affichées dès que la fiche a un prix. Le **coût de revient complet** est celui
de `calculer` (matières, frais, cotisations **et** main-d'œuvre au taux visé).

- **Marge en plus de ton salaire** = prix − coût de revient complet.
- **Taux de marge** = marge ÷ coût de revient.
- **Taux de marque** = marge ÷ prix de vente.
- **Coefficient sur les matières** = prix ÷ coût des matières, comparé à la
  règle courante « matières × 3 » quand elle donne moins que le prix conseillé.
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
| Une pièce passe en **Vendue** | prix, matières de la fiche **et matières réelles de la pièce** (pesée, retouches ; V55), emballage, frais, cotisations, reste, temps (mesuré au chronomètre si disponible, poste par poste, sinon estimé), gain de l'heure, taux horaire du moment | `piece.fige` |
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
  quantité × (1 + taux de perte) pour ce qui a une perte (voir §2, point 3), une
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
- **Coût de revient d'une pièce** (`coutPiece`) = matières (figées à la
  vente ; sinon pesées si on l'a fait, sinon celles de la fiche, + matières
  des retouches) + part des frais fixes + transport (expédition) + frais de
  vente + cotisations — **sans le temps** (§0.4). Le « coût complet » ajoute
  la main-d'œuvre (temps chronométré, complété par la fiche pour les postes
  non mesurés, au taux visé) ; il ne sert qu'à l'information. **Le total est toujours la somme exacte des lignes
  affichées** (le transport y est compté ; conditionnement = emballage,
  inclus dans les matières). Commission et cotisations se calculent sur le
  prix de la pièce, pas sur celui de la fiche.
  **Pièce pas terminée (à faire / en cours) = chiffres « provisoires »** : le
  chronomètre n'a compté que le début, donc chaque poste vaut au moins le
  temps de la fiche (`minutesReellesPiece`) ; le temps chronométré prend la
  place de l'estimation quand la pièce est terminée (ou vendue).
  Prix de vente = celui saisi sur la pièce, sinon celui de la fiche ; **prix
  cible d'une pièce** = le prix pour lequel son gain serait nul avec SON
  coût réel (matières pesées, temps réel ou provisoire) : au-dessus, elle
  paie plus que ton salaire ; le prix cible de l'en-tête est celui de la
  fiche (estimation) ; **gain** = prix − coût de revient (sans le temps,
  voir §0.4) ; gain de l'heure = gain ÷ heures. Code couleur : vert
  (≥ 90 % de l'objectif), orange (sous l'objectif), rouge (< 50 %, à perte,
  ratée).
- **Lecture de l'écran « Mes créations »** : en haut de chaque création,
  l'**estimation** de la fiche (prix de vente, prix cible, gain de l'heure,
  état) ; dans le tableau, le **réel** de chaque pièce (temps passé face au
  temps prévu, coût réel, prix de vente avec sa cible, gain). Quatre tuiles
  seulement (créations, gain habituel, à revoir, pièces) ; les filtres à
  zéro ne s'affichent pas ; le mode d'emploi est replié.
- **Retouche** : passer une pièce « À retoucher » ouvre une note (motif,
  matières ajoutées en €). Le temps chronométré pendant la retouche et ces
  matières s'ajoutent au coût de la pièce (« dont retouches »).
- **Pièce ratée** : son coût affiché = matières jetées (perte figée = matières
  réelles sans l'emballage, sorties du stock) ; gain = − ce coût. Les Indicateurs, eux, ne comptent en « pertes »
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
- **Étape unique** (V42) : chaque commande affiche une seule étape (devis,
  à faire, en cours, à livrer, à facturer, à encaisser, soldée, annulée) et
  la prochaine action à faire.
- **Tris** (V42) : commandes, registre, matières, patrons et catalogue se
  trient par critère, en croissant ou décroissant ; le choix est gardé
  pendant la session.
- **Temps passé par pièce** (V42) : chaque pièce garde son propre temps
  chronométré (numéro de pièce stable, par ordre de création) ; le chrono
  indique « nom · pièce N° x ». Aucun cumul entre pièces d'une même création.
- **Vérification des saisies** (V42) : sous chaque champ, contrôle en direct
  (e-mail, téléphone ou @pseudo ; nombre entier ; prix ≥ 0 ; date existante
  entre 2000 et 2100 ; SIREN à 9 chiffres avec clé de contrôle de Luhn).
  Le bouton « Enregistrer » relit tout, amène sur le premier champ à
  corriger, sinon enregistre et affiche l'heure. Un prix illisible ou vide
  n'écrase jamais le prix gardé.

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
