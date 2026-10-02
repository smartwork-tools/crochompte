# Crochompte — version hébergée, avec comptes

L'application de gestion et de prix de revient pour les artisanes du crochet.

Ce dossier contient **la même application** que la version publique, plus ce
qu'il faut pour l'héberger avec des comptes et retrouver son atelier d'un
appareil à l'autre.

---

## Ce qu'il y a dans le dossier

**L'application (servie telle quelle, sans construction)**

| Fichier | Rôle |
|---|---|
| `index.html` | la page : styles, structure, politique de sécurité (balise `meta`) |
| `boot.js` | ce qui démarre avant tout (anti-cadre, thème) |
| `app.js` | l'application elle-même (calculs, écrans). Voir « Carte du code » plus bas |
| `sync.js` | comptes, synchronisation, abonnement. **Facultatif** (sans `config.js`, rien ne part nulle part) |
| `pdf.js` | fabrique les documents en vrai PDF : factures, avoirs, devis, bons de commande et de livraison, relevé mensuel (écriture directe du fichier, sans bibliothèque) |
| `sw.js` | copie de l'application sur l'appareil, pour l'ouvrir sans réseau |
| `config.js` / `config.example.js` | adresse du projet Supabase, clé publique, liens de paiement. Public et versionné |
| `manifest.webmanifest`, `icones/`, `polices/` | « Ajouter à l'écran d'accueil », icônes, polices (licence SIL OFL) |
| `vendor/supabase/`, `vendor/pdfjs/` | bibliothèques servies par le site lui-même (aucun CDN extérieur) |
| `confidentialite.html`, `cgv.html` | politique de confidentialité ; conditions générales (à compléter : identité, SIREN, médiateur) |
| `CNAME`, `_headers` | le nom de domaine (GitHub Pages) ; les en-têtes HTTP (pris en compte par Cloudflare Pages ou Netlify, ignorés par GitHub Pages) |

**Le serveur (Supabase)** — à coller ou déployer, dans l'ordre de la mise en ligne

| Fichier | Rôle |
|---|---|
| `schema.sql` → `schema-abonnement.sql` (9 fichiers) | les tables, les règles de sécurité et les fonctions de la base, **dans l'ordre de l'étape 1** |
| `supabase/functions/inscription`, `connexion`, `mot-de-passe-oublie` | compte : création, connexion par pseudo ou adresse, lien de réinitialisation (l'adresse e-mail ne passe jamais par le navigateur) |
| `supabase/functions/supprimer-compte` | effacement complet d'un compte (mot de passe vérifié côté serveur, abonnement Stripe résilié) |
| `supabase/functions/stripe-webhook` | réception des paiements Stripe |
| `emails/` | gabarits des courriels de confirmation et de mot de passe oublié (à coller dans Supabase › Authentication › Emails) |

**Pour travailler dessus**

| Fichier | Rôle |
|---|---|
| `REGLES-METIER.md` | **les règles de calcul et de gestion**, à relire avant toute modification |
| `CHANGELOG.md` | le journal des versions : sa première ligne est **le** numéro de version |
| `outils/version.js` | recopie ce numéro partout (`node outils/version.js`) ; les tests vérifient qu'il concorde |
| `tests/` | les tests automatiques (navigateur et base de données), voir `tests/README.md` |
| `RGPD.md` | liste de contrôle : ce qui est fait, ce qui reste à ta charge |
| `LICENSE`, `.gitignore` | tous droits réservés (le dépôt GitHub est public) ; fichiers à ne pas envoyer |

**Sans `config.js`, l'application marche exactement comme avant** : tout reste
dans le navigateur, rien ne part nulle part. C'est ce qui permet de servir la
même application en version publique et en version avec comptes.

**Dès que `config.js` est rempli, se connecter devient obligatoire** : la
personne voit un écran de connexion avant l'outil, et doit créer un compte ou
se connecter pour continuer — il n'y a plus d'usage anonyme sur cette
installation-ci. C'est un choix voulu (voir `RGPD.md`), pas une étape
oubliée : si tu préfères garder un accès sans compte en plus de la
synchronisation, dis-le-moi, ça se change.

---

## Mise en ligne, étape par étape

Compte 30 minutes la première fois. Tout est gratuit à cette échelle.

### 1. Créer la base — Supabase

1. Va sur **supabase.com**, crée un compte, puis un nouveau projet.
   Choisis une région européenne : les données d'artisanes françaises n'ont
   aucune raison de traverser l'Atlantique. La politique de confidentialité
   indique la région du projet : si tu en changes, mets-la à jour (la région
   se lit dans *Project Settings → General*).
2. Note le mot de passe de la base quand il s'affiche — il ne sera plus montré.
3. Ouvre **SQL Editor** et colle, **un fichier à la fois et dans cet ordre**
   (coller, **Run**, *Success*, fichier suivant) :

   1. `schema.sql` — les ateliers, le stockage des photos, les règles qui font
      que personne ne lit l'atelier d'une autre ;
   2. `schema-pseudo.sql` — pseudo et profil, sans jamais exposer l'adresse ;
   3. `schema-versions.sql` — l'historique des versions (30 par compte) ;
   4. `schema-patrons-publics.sql` — la bibliothèque de patrons partagés ;
   5. `schema-signalements.sql` — un signalement par personne et par patron ;
   6. `schema-fiabilite.sql` — heure serveur, limites de tentatives, taille maximale ;
   7. `schema-factures.sql` — numérotation et registre des factures ;
   8. `schema-securite-moderation.sql` — protections des fonctions, revue des signalements ;
   9. `schema-abonnement.sql` — abonnement, codes cadeaux, administration,
      envoi atomique, **accès vérifié par le serveur** (un compte expiré ne
      peut plus écrire). Il fait de `karimfarhani01@gmail.com` un administrateur.

   Tous sont rejouables sans risque. Si tu rejoues un fichier plus tard,
   rejoue aussi **tous ceux qui le suivent** dans la liste : c'est l'ordre
   qui garantit que la dernière définition de chaque fonction est la bonne.
   Le même ordre est utilisé par les tests (`tests/sql/LISEZMOI.md`).
4. **Authentication → Sign In / Providers → Email** : règle la longueur
   minimale du mot de passe à **12** et active la protection contre les mots
   de passe divulgués si ton offre la propose. (L'application l'exige déjà ;
   ce réglage l'impose aussi à quelqu'un qui appellerait le serveur
   directement.)
5. Va dans **Project Settings → API** et copie deux valeurs :
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon public** (une longue chaîne qui commence par `eyJ`)

> La clé `anon` est **faite pour être publique** : elle est dans le navigateur
> de chaque utilisatrice. Ce n'est pas elle qui protège les données — ce sont
> les règles du `schema.sql`. En revanche, la clé **`service_role`** ne doit
> jamais sortir d'un serveur : elle contourne toutes les règles.

> L'adresse du projet est écrite à **trois endroits** : `config.js`, la
> politique de sécurité dans `index.html` (`connect-src`) et `_headers`. Si tu
> changes de projet Supabase, change les trois.

### 2. Déployer les fonctions serveur

L'application se connecte par pseudo et mot de passe, mais **l'adresse e-mail
ne doit jamais être visible depuis le navigateur** : ces opérations passent
par des fonctions serveur, qui tournent avec la clé `service_role`.

- `inscription` : crée le compte (pseudo, courriel, mot de passe), envoie le
  courriel de confirmation, exige « J'ai 15 ans ou plus » ;
- `connexion` : pseudo **ou** adresse + mot de passe (le pseudo est résolu
  côté serveur) ; seuls les échecs comptent dans la limite de tentatives ;
- `mot-de-passe-oublie` : même principe, sans jamais révéler si l'identifiant
  existe (réponse identique et délai constant) ;
- `supprimer-compte` : effacement complet, mot de passe vérifié côté serveur,
  abonnement Stripe résilié avant l'effacement ;
- `stripe-webhook` : réception des paiements (voir « Abonnement »).

Les cinq commandes, une fois pour toutes (puis à chaque modification d'une
fonction) :

```bash
npm install -g supabase
supabase login
supabase link --project-ref TON-REF-DE-PROJET      # Project Settings → General
supabase functions deploy inscription --no-verify-jwt
supabase functions deploy connexion --no-verify-jwt
supabase functions deploy mot-de-passe-oublie --no-verify-jwt
supabase functions deploy supprimer-compte
supabase functions deploy stripe-webhook --no-verify-jwt
```

`--no-verify-jwt` : ces fonctions sont appelées **avant** d'avoir une session
(ou par Stripe, qui signe ses appels) ; elles vérifient elles-mêmes ce qu'il
faut. `supprimer-compte`, elle, exige la session de la personne.

Secrets (Supabase → Edge Functions → Secrets, ou en ligne de commande) :
`SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` sont fournis
par Supabase ; `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` viennent de
Stripe (étape « Abonnement »).

> L'outil `supabase` exige que chaque fonction soit dans
> `supabase/functions/<nom>/index.ts`, exactement à cet endroit.

**Sans les quatre premières fonctions déployées, personne ne peut créer de
compte, se connecter, ni effacer son compte.** Fais-le avant d'annoncer le
site à qui que ce soit.

## Abonnement

1. `schema-abonnement.sql` est collé (étape 1, dernier fichier). Sans rien
   d'autre, tout fonctionne déjà : essai de 14 jours, codes cadeaux
   (Réglages › Administration pour les créer, Réglages › Mon abonnement pour
   les saisir), écran « essai terminé », écritures refusées par le serveur
   quand l'accès est fermé (l'atelier reste lisible et exportable).
   Le bouton de paiement dit « Demander un code d'accès » tant que Stripe
   n'est pas configuré.
2. Pour encaisser : dans Stripe, crée un produit « Crochompte » avec trois
   prix récurrents (7,90 € / mois, 42 € / 6 mois, 75 € / an ; donne à chaque
   prix la clé de recherche `mensuel`, `semestriel`, `annuel`), puis un **lien
   de paiement** par prix, et active le **portail client**. Colle les trois
   liens et le lien du portail dans `config.js › abonnement`.
3. Donne ses deux secrets à la fonction de paiement, puis (re)déploie-la :
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_live_... STRIPE_WEBHOOK_SECRET=whsec_...
   supabase functions deploy stripe-webhook --no-verify-jwt
   supabase functions deploy supprimer-compte      # elle lit STRIPE_SECRET_KEY pour résilier
   ```
   Dans Stripe → Développeurs → Webhooks, ajoute l'adresse
   `https://<projet>.supabase.co/functions/v1/stripe-webhook` avec les
   événements `checkout.session.completed`, `invoice.paid`,
   `customer.subscription.updated`, `customer.subscription.deleted`.
   Chaque événement n'est traité qu'une fois (table `stripe_evenements`).
4. Complète `cgv.html` (identité, SIREN, adresse, médiateur) avant d'ouvrir
   les paiements.

### 3. Régler l'envoi des courriels

Par défaut Supabase envoie les liens de connexion depuis ses propres serveurs,
avec une limite basse — suffisant pour tester à deux, pas pour ouvrir au
public.

Pour de vrai : **Authentication → Emails → SMTP Settings**, et branche un
service d'envoi (Brevo, Resend, Postmark…). Sans ça, les liens n'arriveront
plus passé quelques dizaines par jour.

Pendant ce temps, vérifie **Authentication → URL Configuration** :
- *Site URL* = l'adresse de ton site (voir étape 4) ;
- ajoute cette même adresse dans *Redirect URLs*.

Sans ça, le lien du courriel ramène au mauvais endroit.

### 4. Mettre le site en ligne — GitHub Pages

**4.1 — Créer le dépôt**

1. Sur **github.com** : *New repository*.
   Nom : `crochompte`. **Public** (GitHub Pages ne sert que les dépôts
   publics sur le plan gratuit) — le code d'une application qui tourne dans
   le navigateur est de toute façon lisible par n'importe quel visiteur,
   dépôt public ou non ; c'est le `LICENSE` qui protège, pas le secret du
   dépôt.
2. Ne coche ni README ni .gitignore : le dossier les contient déjà.

**4.2 — Envoyer le dossier**

Copie `config.example.js` en `config.js` et remplis les deux valeurs, puis
depuis le dossier, dans un terminal :

```bash
cd crochompte
git init
git add .
git commit -m "Crochompte — première version"
git branch -M main
git remote add origin https://github.com/TON-COMPTE/crochompte.git
git push -u origin main
```

Si tu préfères ne pas toucher au terminal : **GitHub Desktop** fait la même
chose en glissant le dossier et en cliquant *Publish repository*.

> **Règle unique pour `config.js` : il est public et versionné.** Il ne contient
> que l'adresse du projet Supabase et la clé publique (`anon` / publishable),
> faite pour être visible dans le navigateur. **Aucun secret n'y va jamais** —
> ni la clé `service_role`, ni un mot de passe, ni une clé Brevo : ceux-là
> restent dans les secrets des fonctions Supabase. Ce qui protège les données,
> ce sont les règles RLS des fichiers `schema*.sql`, pas le secret de la clé.

**4.3 — Activer GitHub Pages**

*Settings → Pages → Source : Deploy from a branch → main → / (root)*. Le
site sort sur `https://ton-compte.github.io/crochompte/`.

Vérifie ensuite dans Supabase que *Table Editor → ateliers → RLS enabled* est
**vert**. S'il est rouge, n'importe qui avec la clé lirait tout. **Vérifie-le
avant d'ouvrir à qui que ce soit.**

**4.4 — Publier une nouvelle version**

1. Ajoute une ligne en tête du tableau de `CHANGELOG.md` (`| V57 | date | … |`).
2. `node outils/version.js` : le numéro est recopié dans `app.js`,
   `index.html`, `sw.js` et le test du service worker (un seul endroit à
   écrire ; les tests refusent de tourner si ça diverge).
3. Décris ce qui change pour les utilisatrices dans `NOUVEAUTES` (`app.js`,
   section « NOUVEAUTÉS ET SIGNALEMENT »), et dans `REGLES-METIER.md` si une
   règle de calcul change.
4. `node tests/lancer.js`, puis :

```bash
git add .
git commit -m "V57 : ce qui a changé"
git push
```

GitHub Pages redéploie en une à trois minutes. Le nouveau `sw.js` (nom de
cache différent) fait recharger l'application complète au passage suivant,
sans jamais mélanger deux versions.

---

### 5. Vérifier que ça marche

Avec `config.js` rempli, se connecter est **obligatoire** : le site affiche un
écran de connexion avant tout le reste, il n'y a plus de bouton à chercher
dans Réglages.

1. Ouvre le site : l'écran de connexion doit s'afficher directement, avant
   l'outil. S'il affiche plutôt l'accueil sans rien demander, c'est que
   `config.js` n'est pas lu : vérifie qu'il est bien à la racine, à côté de
   `index.html`.
2. Sur cet écran, clique sur « Créer un compte » : choisis un pseudo
   (l'application te dit tout de suite s'il est disponible), une adresse
   courriel, un mot de passe, et coche « J'ai 15 ans ou plus ». Ouvre le courriel de confirmation **sur le
   même appareil**, clique sur le lien.
3. Reviens sur le site, connecte-toi cette fois avec **ton pseudo et ton mot
   de passe** : l'écran de connexion doit s'effacer et laisser place à
   l'outil.
4. Va dans Réglages → « Mes informations » : tes réponses de l'inscription
   doivent apparaître déjà remplies. Modifie-en une et enregistre.
5. Crée une création, attends trois secondes, puis ouvre le même site sur ton
   téléphone : l'écran de connexion s'affiche à nouveau (chaque appareil doit
   se connecter séparément). Connecte-toi cette fois avec **ton adresse
   courriel** (au lieu du pseudo) et ton mot de passe, puis clique sur
   **Récupérer depuis le serveur** dans Réglages.
6. Pour vérifier le mot de passe oublié : depuis l'écran de connexion,
   clique sur « Mot de passe oublié », saisis le pseudo ou l'adresse, ouvre
   le courriel reçu et choisis un nouveau mot de passe.
7. Pour vérifier la déconnexion : dans Réglages, clique sur « Se
   déconnecter ». L'écran de connexion doit revenir immédiatement — l'outil
   ne doit plus être accessible tant que tu ne t'es pas reconnectée.

---

## Comment fonctionne la synchronisation

- **L'atelier entier** (réglages, matières, créations, pièces, patrons) est un
  seul document JSON, enregistré sous ton compte.
- **L'envoi est automatique**, deux secondes et demie après la dernière
  modification, et une dernière fois quand tu fermes l'onglet.
- **La mise à jour est automatique** à l'ouverture et au retour sur l'onglet :
  s'il y a une version plus récente en ligne, elle est récupérée.
- **Rien n'est écrasé sans filet.** Quand une version en remplace une autre,
  l'ancienne est rangée dans l'historique des versions (Réglages › Mon compte).
- **Les photos** partent toutes seules en arrière-plan après chaque
  enregistrement, et reviennent toutes seules sur un nouvel appareil.
- **À la déconnexion**, l'atelier et les photos sont retirés de l'appareil,
  seulement une fois tout bien envoyé. Sur un ordinateur partagé, la personne
  suivante part d'un atelier vierge.

### Ce qui reste à faire un jour
- La fusion fine (deux appareils modifiant deux créations différentes en même
  temps : aujourd'hui, le dernier enregistrement gagne, l'autre est dans
  l'historique).
- L'application mobile native (en attendant, « Ajouter à l'écran d'accueil »
  installe Crochompte comme une application).

---

## Sécurité — ce qui est déjà fait

- **Row Level Security** activée sur la table, avec une politique par action
  (lecture, création, modification, suppression). La comparaison porte sur
  `auth.uid()` : la base elle-même refuse de servir la ligne d'un autre. Ce
  n'est pas l'application qui protège, c'est le serveur.
- La politique de modification porte `using` **et** `with check` : impossible
  de réattribuer sa ligne à quelqu'un d'autre.
- **Le seau de photos est privé** (`public = false`), et chaque compte est
  cloisonné dans un dossier à son nom, vérifié par la politique de stockage.
- `config.js` est public et versionné : il ne contient que l'adresse du projet
  et la clé publique. La clé `service_role` n'existe que dans les secrets des
  fonctions serveur.
- **Mot de passe jamais stocké en clair** : chiffré dès son arrivée sur le
  serveur, par la brique d'authentification de Supabase. Personne — pas même
  toi — ne peut le lire.
- **Le pseudo ne mène jamais à l'adresse courriel dans le navigateur.** La
  table qui les associe est verrouillée (RLS sans aucune permission pour
  `anon`/`authenticated`) ; seules les fonctions serveur `inscription`,
  `connexion` et `mot-de-passe-oublie` — qui tournent avec la clé
  `service_role`, jamais exposée au navigateur — peuvent la consulter. La
  connexion et la réinitialisation par pseudo passent par cette résolution
  côté serveur ; se connecter directement par adresse n'a évidemment rien à
  résoudre.
- **Réponses génériques** en cas d'échec de connexion ou de mot de passe
  oublié : impossible de deviner, identifiant par identifiant, lesquels
  correspondent à un compte existant.
- **Une seule information est volontairement publique** : la disponibilité
  d'un pseudo (`pseudo_disponible`), pour prévenir en direct à l'inscription
  qu'il est déjà pris — comme sur la plupart des sites qui laissent choisir
  un identifiant. Elle ne renvoie qu'un vrai/faux, jamais l'identité derrière.
- **Chaque utilisatrice ne lit et ne modifie que son propre profil**
  (`mon_profil`, `modifier_mon_profil`) : les fonctions filtrent sur
  `auth.uid()`, jamais sur un identifiant fourni par le navigateur.
- **Âge minimum vérifié à deux niveaux** : un message clair dans la fonction
  `inscription`, et une contrainte dans la base en filet de sécurité.

## Modération de la bibliothèque partagée

Un signalement est motivé (catégorie + explication). Trois signalements
mettent le patron **en revue** sans le retirer ; deux signalements graves
(contenu illicite ou dangereux) le **masquent** en attendant. La décision
t'appartient, avec un motif que l'autrice verra :

1. **SQL Editor** → `select * from public.moderation_a_traiter;` (patrons à
   examiner, avec le détail des signalements et les contestations).
2. Pour décider :
   `select public.decider_moderation('<id>', 'maintenu', 'Patron original, signalement non fondé.');`
   ou
   `select public.decider_moderation('<id>', 'retire', 'Reproduction du patron d''une autre créatrice.');`

Seule l'administration (le SQL Editor) peut appeler cette fonction.

## Effacement du compte

Le bouton « Supprimer mon compte » (Réglages › Mon compte) demande le mot de
passe, puis appelle la fonction serveur `supprimer-compte` (étape 2) : elle
vérifie le mot de passe, résilie l'abonnement Stripe s'il y en a un, vide le
dossier de photos et supprime l'identité de connexion ; la base efface en
cascade l'atelier, l'historique, le profil, l'abonnement et le registre des
factures. Si la fonction n'est pas joignable, l'application efface ce qu'elle
peut elle-même (photos, historique, atelier) et **le dit** à l'utilisatrice
au lieu de lui faire croire que tout est parti.

---

## RGPD — ce qu'il reste à faire avant d'ouvrir au public

Ce n'est pas du code, c'est du sérieux administratif. À traiter avant la
première utilisatrice qui n'est pas de ta famille :

1. Une **page de politique de confidentialité** : quelles données, pourquoi,
   combien de temps, qui les héberge.
2. Le **registre des traitements** — obligatoire, même pour une micro-entreprise.
3. **L'effacement du compte** : fait (bouton dans Réglages › Mon compte et
   fonction `supprimer-compte`). À tester une fois en production avec un
   compte d'essai.
4. **L'export des données** : fait — « Télécharger ma sauvegarde » (Réglages ›
   Mes données) produit un fichier avec toutes les données de l'atelier et ses
   photos.
5. Vérifier que l'hébergement reste **dans l'Union européenne** (région du
   projet Supabase). GitHub Pages est servi depuis les États-Unis (Microsoft),
   encadré par le *Data Privacy Framework* UE–États-Unis — voir
   `confidentialite.html`.

---

## Développement

Il n'y a ni dépendance ni étape de construction. Pour travailler en local :

```bash
python3 -m http.server 8000
# puis http://localhost:8000
```

Les tests sont dans `tests/` et se lancent avec `node tests/lancer.js`
(Playwright, avec un faux client Supabase : aucun projet réel n'est touché).
Le détail est dans `tests/README.md`.

## Carte du code (`app.js`)

Un seul fichier, ES5, sans construction, découpé en sections marquées
`/* ═════ … ═════ */` (cherche le titre dans l'éditeur). Dans l'ordre :

| Section | Ce qu'on y trouve |
|---|---|
| 1. CATALOGUE MÉTIER | les familles de matières (`CATS`), les modèles, les canaux de vente |
| 2. ÉTAT | `state` (tout l'atelier), `etatInitial()`, `migrer()` (reprise des anciens formats), `sauverTout()` |
| PONT DE SYNCHRONISATION | `window.CrochomptePont` : ce que `sync.js` lit et écrit |
| 3. MOTEUR DE CALCUL | `calculer(création)` : matières, temps, frais, cotisations, prix conseillé |
| 4. STOCK, COULEURS, FOURNISSEURS, PERTES | mouvements de stock, variantes de couleur, prix comparés |
| 5. FORMATS | `eur`, `nb`, `qte`, `pluriel`, `dateCourte` / `dateLongue` / `dateISO` : **tout affichage passe par là** |
| BOÎTE DE CONFIRMATION, HISTORIQUE | `confirmer`, `dialogueChamps`, `avecAnnulation`, bouton « Précédent » |
| 6. NAVIGATION, PROFILS, EN-TÊTE, RECHERCHE, ABONNEMENT, CONNEXION | `aller()`, `render()`, profils amateur / pro, menu, recherche globale, offres et codes, portail |
| 7. ACCUEIL | la bande verte, les trois chiffres, les relances, les premiers pas |
| NOUVEAUTÉS | `VERSION_APP`, `NOUVEAUTES` (texte vu par les utilisatrices) |
| 8. CATALOGUE, 9. MES CRÉATIONS, VENDRE, MES VENTES, 10. FICHE CRÉATION | les écrans de création et de vente |
| 11. STOCK, 12. MES MATIÈRES, 13. RÉGLAGES | les matières de l'atelier, les réglages par rubrique |
| 15. PIÈCES, ESTIMÉ ET RÉEL, COÛT D'UNE PIÈCE | le suivi pièce par pièce, `coutPiece`, `figerVente` / `reprixVente` / `refigerTemps` |
| 16-19. SÉRIES, GRAPHIQUES, INDICATEURS, REGISTRES | « Mes chiffres », livre des recettes, registre des achats, seuils |
| 20-27. ILLUSTRATIONS, PHOTOS, PDF, CATALOGUE DE MATIÈRES (référentiel), SÉLECTEUR | ce qui sert à plusieurs écrans |
| 29-30. CHRONOMÈTRE | le compteur de temps, dans la fiche et en mains libres (39) |
| 32-37. PATRONS D'ORIGINE, MISE EN ROUTE, STATUTS, SEUILS, PRIX MARCHÉ, PLANCHE, MODÈLES D'ÉPOQUE | données de référence |
| 38. MES PATRONS, COMMANDES (liste, détail), FACTURES ET AVOIRS, BIBLIOTHÈQUE PARTAGÉE | commandes clientes, factures, patrons personnels et partagés |
| 40. DÉMARRAGE | lecture de l'atelier, inscription du service worker, message de repli du compte |

Règles de maison : une chose = un mot (modèle du catalogue, création = ta
fiche, pièce = un exemplaire suivi, commande, règlement) ; tout texte passe
par `esc()` avant d'entrer dans du HTML ; tout montant par `cts()` ; toute
date par les trois formateurs de la section 5 ; aucune donnée d'exemple
n'est fournie par l'application.
