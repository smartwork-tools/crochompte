# RGPD — ce qui est fait, ce qui reste à faire

À partir du moment où tu héberges les données d'autres personnes, tu deviens
**responsable de traitement**. Ce document liste précisément ce qui est couvert
par le code, et ce qui ne peut l'être que par toi.

Ce n'est pas un avis juridique : c'est une liste de contrôle honnête.

---

## Fait — dans le code

| Obligation | Comment c'est couvert |
|---|---|
| **Minimisation** (art. 5.1.c) | À l'inscription, seuls le pseudo, l'adresse de courriel, le mot de passe et une attestation datée « 15 ans ou plus » sont demandés. Prénom, nom, ville, pays et type d'activité sont facultatifs, ajoutés plus tard si l'utilisatrice le souhaite. La date de naissance n'est plus collectée. Aucun traceur, aucune mesure d'audience, aucun profilage |
| **Transparence avant collecte** (art. 13) | Avant le bouton de connexion, l'application annonce ce qui sera enregistré et lie la politique de confidentialité |
| **Droit à la portabilité** (art. 20) | L'export de sauvegarde rend l'atelier entier dans un fichier JSON lisible |
| **Droit de rectification** (art. 16) | Tout est modifiable dans l'application |
| **Droit à l'effacement** (art. 17) | Bouton « Effacer mon compte » : photos, atelier, puis identité de connexion. Double confirmation, irréversible |
| **Sécurité** (art. 32) | Séparation par compte au niveau du serveur (RLS), stockage privé cloisonné, HTTPS, mot de passe chiffré (jamais en clair), pseudo jamais exposé au navigateur ni à d'autres utilisatrices |
| **Effacement en cascade** | `on delete cascade` : supprimer le compte supprime l'atelier |

### Un point à ne pas manquer
Le bouton d'effacement supprime **l'atelier et les photos** par lui-même. Pour
supprimer aussi **l'identité de connexion**, il faut déployer la fonction
serveur fournie :

```bash
supabase functions deploy supprimer-compte
```

Sans elle, l'application le dit clairement à l'utilisatrice au lieu de lui
faire croire que tout est parti. **Déploie-la avant d'ouvrir à des tiers** :
sinon le droit à l'effacement n'est pas complètement honoré.

---

## À faire — par toi, avant la première utilisatrice hors famille

### 1. Compléter la politique de confidentialité
Ouvre `confidentialite.html` et remplis les passages entre crochets : ton nom
ou ta raison sociale, ton statut, ton adresse postale, ton SIRET, ton courriel
de contact, et les régions d'hébergement réellement retenues.

**Ce n'est pas optionnel.** Le règlement impose que le responsable soit
identifiable et joignable. Une politique sans nom ni adresse ne protège
personne — ni tes utilisatrices, ni toi.

Puis supprime le bloc d'avertissement en haut de la page.

### 2. Tenir un registre des traitements (art. 30)
Obligatoire, y compris pour une micro-entreprise. La CNIL fournit un modèle
prêt à remplir. Une seule ligne suffit ici :

- **Traitement** : gestion des comptes et sauvegarde des ateliers
- **Finalité** : permettre à l'utilisatrice de retrouver son atelier sur ses
  appareils
- **Base légale** : exécution du service (art. 6.1.b)
- **Catégories de personnes** : utilisatrices inscrites
- **Catégories de données** : pseudo, adresse de courriel, mot de passe
  (chiffré), attestation « 15 ans ou plus » datée, données d'atelier, photos ;
  facultatif : prénom, nom, ville, pays, type d'activité
- **Destinataires** : Supabase (hébergement), [hébergeur des pages],
  [service d'envoi de courriels]
- **Transferts hors UE** : aucun si les régions européennes sont retenues —
  **à vérifier réellement**
- **Durée de conservation** : jusqu'à effacement du compte par l'utilisatrice
- **Mesures de sécurité** : RLS, stockage privé cloisonné, HTTPS, mot de passe
  chiffré (jamais en clair), pseudo jamais exposé au navigateur ni à d'autres
  utilisatrices

Garde ce registre à jour : c'est le premier document demandé en cas de contrôle.

### 3. Vérifier les régions d'hébergement
- Supabase : la région se choisit **à la création du projet** et ne se change
  plus après. Vérifie dans *Project Settings → General*.
- L'hébergeur des pages : vérifie où il sert le site.
- Le service d'envoi de courriels : Brevo est français, Resend et Postmark sont
  américains — ça change ce que tu dois déclarer.

### 4. Décider d'une durée de conservation des comptes inactifs
Le règlement n'aime pas les données gardées indéfiniment « au cas où ».
Trois ans sans connexion est une durée couramment retenue. Deux options :
supprimer, ou prévenir par courriel avant de supprimer. Écris la règle dans la
politique, et tiens-la.

### 5. Prévoir la violation de données (art. 33)
Si des données fuitent, tu as **72 heures** pour notifier la CNIL. Sache à
l'avance qui fait quoi. Sur un projet à une personne, cela veut simplement
dire : avoir le lien de notification sous la main et ne pas découvrir
l'obligation le jour venu.

---

## Ce qui est déjà bien, et qui compte

Trois choix d'architecture réduisent le risque à la racine :

1. **La version publique (sans `config.js` rempli) reste sans compte.**
   Une utilisatrice de cette version-là ne confie rien : tout reste dans son
   navigateur. **Cette installation-ci en revanche demande un compte pour
   utiliser l'outil** (l'écran de connexion s'affiche avant tout le reste) :
   c'est un choix produit assumé, pas une omission technique — vérifie que le
   point suivant est bien couvert dans ton registre et ta politique.
   > ✅ Réglé (septembre 2026) : l'inscription ne demande plus que le pseudo,
   > l'adresse, le mot de passe et la case « J'ai 15 ans ou plus » (horodatée
   > dans le compte). Le reste est facultatif, dans « Mes informations ».
   > Enregistrer ces informations efface une date de naissance saisie avec
   > l'ancienne version.
2. **Le mot de passe n'est jamais stocké en clair.** Il est chiffré par la
   brique d'authentification de Supabase dès son arrivée sur le serveur —
   même une fuite de la base ne le rendrait pas lisible.
3. **La sécurité est dans la base, pas dans l'application.** Même une faille
   dans le code du navigateur ne donnerait pas accès aux données des autres :
   c'est le serveur qui refuse.

---

## La bibliothèque de patrons partagés — en clair

C'est un **espace d'échange entre utilisatrices**, pas un catalogue que tu
publies. L'application le dit à trois endroits : sur la bibliothèque, dans la
déclaration signée avant de publier, et sous chaque patron lu.

### Ce que tu ne peux pas faire disparaître par une clause

Dès qu'on héberge les textes d'autres personnes, on est **hébergeur** au sens
de la loi (LCEN, article 6). Ça ne se refuse pas et aucune mention « je décline
toute responsabilité » ne l'efface. Mais ce statut est **fait pour protéger
l'hébergeur** : tu n'es pas responsable de ce que publient tes utilisatrices.
Tu ne le deviendrais que si on te signalait un contenu manifestement illicite
et que tu le laissais en ligne.

### Concrètement, ton obligation tient en deux lignes

1. **Être joignable** — l'adresse de contact de `confidentialite.html` suffit.
2. **Retirer quand on te le signale.**

Et le deuxième point est **déjà automatisé** : chaque patron a un bouton
Signaler, et il se retire tout seul au 3ᵉ signalement, sans intervention de ta
part. Le reste est déjà verrouillé dans la base : texte seul publiable (jamais
les pages scannées), déclaration de droits obligatoire et horodatée, et chacune
ne peut toucher qu'à ses propres lignes.

Autrement dit : **tu n'as rien à faire au quotidien.** Jette un œil de temps en
temps aux signalements, c'est tout :

```sql
select id, titre, auteur_affiche, signalements, retire
  from patrons_publics where signalements > 0 order by signalements desc;
```

Deux choses valent quand même le détour, une fois :
- **Mentionner dans `confidentialite.html`** qu'un patron publié devient visible
  par les autres, avec le nom d'autrice choisi — c'est une donnée rendue
  publique volontairement, donc elle s'annonce.
- **Ne pas supprimer les colonnes `user_id` et `droits_le`** : ce sont elles qui
  te permettent de répondre en deux minutes si quelqu'un réclame.

> Ce n'est pas un avis juridique. Si la bibliothèque prend vraiment de l'ampleur,
> ce sera le moment de faire relire tes conditions d'utilisation — pas avant.

---

## Ressources
- [CNIL — le registre des traitements](https://www.cnil.fr/fr/RGPD-le-registre-des-activites-de-traitement)
- [CNIL — notifier une violation de données](https://www.cnil.fr/fr/notifier-une-violation-de-donnees-personnelles)
- [CNIL — déposer une plainte](https://www.cnil.fr/fr/plaintes)
