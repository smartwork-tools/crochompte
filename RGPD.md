# RGPD — ce qui est fait, ce qui reste à faire

À partir du moment où tu héberges les données d'autres personnes, tu deviens
**responsable de traitement**. Ce document liste précisément ce qui est couvert
par le code, et ce qui ne peut l'être que par toi.

Ce n'est pas un avis juridique : c'est une liste de contrôle honnête.

---

## Fait — dans le code

| Obligation | Comment c'est couvert |
|---|---|
| **Minimisation** (art. 5.1.c) | Seuls le pseudo, l'identité de base (prénom, nom, date de naissance, ville, pays, type d'activité), l'adresse de courriel et l'atelier sont enregistrés. Pas d'adresse postale complète : ville + pays suffisent. Aucun traceur, aucune mesure d'audience, aucun profilage |
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
- **Catégories de données** : pseudo, prénom, nom, date de naissance, ville,
  pays, type d'activité, adresse de courriel, mot de passe (chiffré),
  données d'atelier, photos
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

1. **Le mode sans compte reste entier.** Une utilisatrice qui ne veut rien
   confier a une application complète. Peu de services peuvent en dire autant.
2. **Le mot de passe n'est jamais stocké en clair.** Il est chiffré par la
   brique d'authentification de Supabase dès son arrivée sur le serveur —
   même une fuite de la base ne le rendrait pas lisible.
3. **La sécurité est dans la base, pas dans l'application.** Même une faille
   dans le code du navigateur ne donnerait pas accès aux données des autres :
   c'est le serveur qui refuse.

---

## Ressources
- [CNIL — le registre des traitements](https://www.cnil.fr/fr/RGPD-le-registre-des-activites-de-traitement)
- [CNIL — notifier une violation de données](https://www.cnil.fr/fr/notifier-une-violation-de-donnees-personnelles)
- [CNIL — déposer une plainte](https://www.cnil.fr/fr/plaintes)
