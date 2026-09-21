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
| `config.example.js` | à copier en `config.js` avec tes deux clés |
| `schema.sql` | les tables et les règles de sécurité, à coller dans Supabase |
| `schema-pseudo.sql` | la table des pseudos et les fonctions de vérification, à coller dans Supabase |
| `schema-patrons-publics.sql` | la bibliothèque de patrons partagés, à coller dans Supabase |
| `LICENSE` | tous droits réservés — nécessaire parce que le dépôt GitHub est public |
| `.gitignore` | fichiers à ne pas envoyer sur GitHub |
| `confidentialite.html` | politique de confidentialité — **à compléter** |
| `RGPD.md` | liste de contrôle : ce qui est fait, ce qui reste à ta charge |
| `supabase/functions/inscription/` | fonction serveur : création du compte (pseudo, identité de base, courriel, mot de passe) |
| `supabase/functions/connexion/` | fonction serveur : connexion avec pseudo **ou** courriel + mot de passe |
| `supabase/functions/mot-de-passe-oublie/` | fonction serveur : envoi du lien de réinitialisation à partir du pseudo ou du courriel |
| `supabase/functions/supprimer-compte/` | fonction serveur pour l'effacement complet du compte |

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
   identité de base (prénom, nom, date de naissance, ville, pays, type
   d'activité) et compte, et les fonctions qui permettent de la consulter ou
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

- `inscription` : crée le compte (pseudo, prénom, nom, date de naissance,
  ville, pays, type d'activité, courriel, mot de passe), envoie le courriel
  de confirmation, et vérifie que la personne a au moins 15 ans.
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

> `config.js` **doit** partir sur GitHub, sinon il n'est pas servi : retire-le
> du `.gitignore` avant l'envoi. Cette clé (`anon`) est faite pour être
> publique — ce qui protège vraiment les données, ce sont les règles de
> `schema.sql`, pas le secret de la clé.

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
   (l'application te dit tout de suite s'il est disponible), renseigne
   prénom, nom, date de naissance, ville, pays, type d'activité, une adresse
   courriel et un mot de passe. Ouvre le courriel de confirmation **sur le
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
- **La récupération est manuelle**, volontairement. Elle remplace ce qui est
  dans le navigateur : c'est un geste qu'on fait en arrivant sur un appareil,
  pas au milieu d'un travail.
- **Les conflits ne sont jamais tranchés en silence.** Si un autre appareil a
  écrit après ta dernière lecture, l'application refuse d'envoyer et te le dit,
  avec la date. À toi de choisir.
- **Les photos** sont envoyées à la demande, par le bouton dédié. Elles pèsent
  lourd : c'est un geste conscient, pas un transfert permanent.

### Ce qui reste à faire un jour
- La fusion fine (deux appareils modifiant deux créations différentes en même
  temps : aujourd'hui, l'un des deux gagne).
- Le transfert des photos en tâche de fond.
- L'application mobile native.

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
- `config.js` est dans `.gitignore`.
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

Le bouton « Effacer mon compte » supprime l'atelier et les photos par lui-même.
Pour supprimer aussi **l'identité de connexion**, il faut déployer la fonction
serveur fournie dans `supabase/functions/supprimer-compte/` :

```bash
npm install -g supabase
supabase login
supabase link --project-ref TON-REF-DE-PROJET
supabase functions deploy supprimer-compte
```

(La référence du projet se trouve dans *Project Settings → General*.)

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
3. **L'effacement du compte** : un bouton qui supprime la ligne et les photos.
   Le `on delete cascade` du schéma fait déjà le travail côté base ; il manque
   le bouton.
4. **L'export des données** : déjà là, c'est la sauvegarde JSON des Réglages.
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

Les tests (hors de ce dossier, dans l'espace de travail) se lancent avec
Playwright, avec un faux client Supabase pour ne dépendre d'aucun projet réel.
Ils couvrent : l'inscription complète (identité, âge minimum, disponibilité
du pseudo en direct), la connexion et le mot de passe oublié par pseudo comme
par adresse, la lecture et la modification du profil, la récupération de mot
de passe, et le repli hors ligne sans configuration.
