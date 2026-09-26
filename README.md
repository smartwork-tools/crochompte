# Crochompte — version hébergée, avec comptes

L'application de gestion et de prix de revient pour les artisanes du crochet.

Ce dossier contient **la même application** que la version publique, plus ce
qu'il faut pour l'héberger avec des comptes et retrouver son atelier d'un
appareil à l'autre.

---

## Ce qu'il y a dans le dossier

| Fichier | Rôle |
|---|---|
| `index.html` | l'application entière. Elle fonctionne seule, sans rien d'autre |
| `sync.js` | comptes et synchronisation. **Facultatif** |
| `config.example.js` | modèle de `config.js` (adresse du projet Supabase et clé publique) |
| `schema.sql` | les tables et les règles de sécurité, à coller dans Supabase |
| `schema-pseudo.sql` | la table des pseudos et les fonctions de vérification, à coller dans Supabase |
| `schema-patrons-publics.sql` | la bibliothèque de patrons partagés, à coller dans Supabase |
| `LICENSE` | tous droits réservés — nécessaire parce que le dépôt GitHub est public |
| `.gitignore` | fichiers à ne pas envoyer sur GitHub |
| `confidentialite.html` | politique de confidentialité — **à compléter** |
| `RGPD.md` | liste de contrôle : ce qui est fait, ce qui reste à ta charge |
| `supabase/functions/inscription/` | fonction serveur : création du compte (pseudo, adresse e-mail, mot de passe, « 15 ans ou plus ») |
| `supabase/functions/connexion/` | fonction serveur : connexion avec pseudo **ou** adresse e-mail + mot de passe |
| `supabase/functions/mot-de-passe-oublie/` | fonction serveur : envoi du lien de réinitialisation à partir du pseudo ou de l'adresse e-mail |
| `supabase/functions/supprimer-compte/` | fonction serveur pour l'effacement complet du compte |
| `schema-signalements.sql` | un signalement par personne et par patron partagé, à coller dans Supabase |
| `sw.js` | garde une copie de l'application sur l'appareil, pour l'ouvrir sans réseau |
| `manifest.webmanifest`, `icones/` | nom et icônes pour « Ajouter à l'écran d'accueil » sur téléphone |
| `polices/` | les polices, hébergées sur le site (licence SIL OFL) |
| `vendor/pdfjs/` | pdf.js (Mozilla, licence Apache 2.0) : lecture des PDF sur l'appareil, chargé seulement à l'import d'un PDF |
| `tests/` | les tests automatiques (voir `tests/README.md`) |

> Pas de `netlify.toml` dans ce dossier : ce fichier ne sert qu'avec l'hébergeur
> Netlify. Comme tu utilises **GitHub Pages**, il ne t'est d'aucune utilité —
> et un fichier inutile n'a rien à faire dans le dépôt.

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
   Choisis une région européenne (Francfort ou Paris) : les données d'artisanes
   françaises n'ont aucune raison de traverser l'Atlantique.
2. Note le mot de passe de la base quand il s'affiche — il ne sera plus montré.
3. Ouvre **SQL Editor**, colle tout le contenu de `schema.sql`, clique **Run**.
   Tu dois voir *Success*. Ça crée la table des ateliers, le stockage des
   photos, et les règles qui font que personne ne peut lire l'atelier d'un
   autre.
4. Toujours dans **SQL Editor**, colle maintenant tout le contenu de
   `schema-pseudo.sql`, clique **Run**. Ça crée la table qui associe pseudo,
   identité facultative (prénom, nom, ville, pays, type d'activité) et
   compte, et les fonctions qui permettent de la consulter ou
   de la corriger sans jamais exposer les adresses courriel au navigateur.
   > Tu avais déjà exécuté une version précédente de ce fichier (sans les
   > colonnes de profil) ? Recolle celle-ci et relance **Run** : elle est
   > écrite pour être rejouée sans rien casser.
5. Toujours dans **SQL Editor**, colle enfin `schema-patrons-publics.sql` et
   clique **Run**. Ça crée la bibliothèque de patrons partagés : la table, ses
   règles d'accès, et la fonction de signalement.
   > Sans ce fichier, l'application fonctionne normalement — l'onglet
   > « Bibliothèque partagée » affiche simplement qu'elle n'est pas installée.
   > Lis la section correspondante de `RGPD.md` avant de l'ouvrir au public :
   > héberger les patrons d'autres personnes t'engage.
6. Va dans **Project Settings → API** et copie deux valeurs :
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon public** (une longue chaîne qui commence par `eyJ`)

> La clé `anon` est **faite pour être publique** : elle est dans le navigateur
> de chaque utilisatrice. Ce n'est pas elle qui protège les données — ce sont
> les règles du `schema.sql`. En revanche, la clé **`service_role`** ne doit
> jamais sortir d'un serveur : elle contourne toutes les règles.

### 2. Déployer les fonctions serveur de connexion

L'application ne se connecte plus par lien magique : elle utilise un pseudo et
un mot de passe, mais **l'adresse courriel ne doit jamais être visible depuis
le navigateur**. C'est pour ça que trois opérations passent par des fonctions
serveur plutôt que par du code exécuté chez l'utilisatrice :

- `inscription` : crée le compte (pseudo, courriel, mot de passe ; le reste
  est facultatif), envoie le courriel de confirmation, et exige la case
  « J'ai 15 ans ou plus », dont la date est gardée dans le compte.
- `connexion` : accepte le pseudo **ou** l'adresse de courriel. Si c'est un
  pseudo, retrouve le courriel correspondant côté serveur uniquement ; sinon
  utilise directement l'adresse fournie.
- `mot-de-passe-oublie` : même principe (pseudo ou courriel) pour envoyer le
  lien de réinitialisation, sans jamais confirmer si l'un ou l'autre existe.

```bash
npm install -g supabase
supabase login
supabase link --project-ref TON-REF-DE-PROJET
supabase functions deploy inscription
supabase functions deploy connexion
supabase functions deploy mot-de-passe-oublie
```

(La référence du projet se trouve dans *Project Settings → General*.)

> **Important** : l'outil `supabase` exige que chaque fonction se trouve dans
> `supabase/functions/<nom>/index.ts`, exactement à cet endroit — c'est pour
> ça que ce dossier contient un sous-dossier `supabase/functions/`, et non
> plus le dossier `edge/` d'une version antérieure de ce guide.

**Sans ces trois fonctions déployées, personne ne peut créer de compte ni se
connecter.** Fais-le avant d'annoncer le site à qui que ce soit.

### 3. Régler l'envoi des courriels

Par défaut Supabase envoie les liens de connexion depuis ses propres serveurs,
avec une limite basse — suffisant pour tester à deux, pas pour ouvrir au
public.

Pour de vrai : **Authentication → Emails → SMTP Settings**, et branche un
service d'envoi (Brevo, Resend, Postmark…). Sans ça, les liens n'arriveront
plus passé quelques dizaines par jour.

Pendant ce temps, vérifie **Authentication → URL Configuration** :
- *Site URL* = l'adresse de ton site (voir étape 3) ;
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

**4.4 — Modifier le site ensuite**

```bash
git add .
git commit -m "ce que j'ai changé"
git push
```

GitHub Pages redéploie en une à trois minutes.

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

## Effacement du compte — une étape à ne pas oublier

Le bouton « Supprimer mon compte » (Réglages › Mon compte) efface les photos,
l'historique des versions et l'atelier, puis appelle la fonction serveur
`supprimer-compte`, qui supprime l'identité de connexion (et, par cascade, le
profil et le compteur de factures). Cette fonction doit être déployée :
*Supabase → Edge Functions → supprimer-compte → Code*, coller le contenu de
`supabase/functions/supprimer-compte/index.ts`, puis *Deploy*.

Sans cette fonction, l'application le **dit** à l'utilisatrice au lieu de lui
faire croire que tout est parti. Mais déploie-la avant d'ouvrir à des tiers :
sinon le droit à l'effacement n'est pas complètement honoré.

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
