# Tests de la base de données (PostgreSQL 16)

Ces fichiers vérifient, sur une vraie base PostgreSQL, les règles qui
protègent les données : chaque compte ne voit que ses données (RLS), les
fonctions serveur refusent les appels non autorisés, la modération de la
bibliothèque et le registre des factures fonctionnent comme prévu.

`01-socle-imitation-supabase.sql` et `02-droits-par-defaut-supabase.sql`
imitent ce que fournit Supabase (rôles `anon` / `authenticated`,
`auth.uid()`, stockage). Ils ne servent qu'aux tests : **ne jamais les
exécuter dans le vrai projet Supabase**.

## Lancer

```bash
createdb crochompte_test
psql -d crochompte_test -f 01-socle-imitation-supabase.sql -f 02-droits-par-defaut-supabase.sql
cd ../..   # racine du projet
for f in schema.sql schema-pseudo.sql schema-versions.sql schema-patrons-publics.sql \
         schema-signalements.sql schema-fiabilite.sql schema-factures.sql schema-securite-moderation.sql schema-abonnement.sql; do   # même ordre que README.md
  psql -d crochompte_test -f $f
done
cd tests/sql
psql -d crochompte_test -f 10-matrice-rls.sql            # tableau conforme / écart
psql -d crochompte_test -f 20-moderation.sql             # scénario de modération
psql -d crochompte_test -f 30-contournements-et-factures.sql
psql -d crochompte_test -f 31-registre-factures.sql
psql -d crochompte_test -f 32-limites.sql
psql -d crochompte_test -f 40-abonnement.sql             # abonnement, codes cadeaux, administration, envoi atomique (V55)
```

## Résultats attendus

- `10-matrice-rls.sql` : aucune lecture ni écriture des données d'un autre
  compte. Les « écarts » restants sont attendus : ils décrivent l'ancien
  comportement de la bibliothèque (retrait automatique au 3e signalement,
  désormais remplacé par une revue), et des fonctions internes de
  l'extension `citext`, sans danger.
  Détail des écarts hors `citext` (vérifié le 1er octobre 2026, V56) :
  - 44 et 47 : la date de naissance n'est plus conservée, l'appel réussit
    donc au lieu d'être refusé (voulu) ;
  - 56 : l'usurpation du pseudo d'une autre est désormais **refusée** (mieux
    qu'attendu à l'origine) ;
  - 64 : le changement de propriétaire « réussit » mais le serveur remet
    l'ancienne propriétaire (le patron ne change pas de main) ;
  - 71, 73, 74, 76, 190 : plus de retrait automatique au 3e signalement
    (revue humaine à la place, voir `20-moderation.sql`).
- `20-moderation.sql` : 3 signalements → en revue, pas retiré ; 2 graves →
  masqué ; décision réservée à l'administration ; republication refusée.
- `30-…` : décision forcée ignorée, usurpation de pseudo et republication
  par modification refusées, une seule facture active par commande.
- `31-…` : numéros à la suite, avoir compris, registre ni modifiable ni
  supprimable, invisible des autres comptes.
- `32-limites.sql` : un atelier de plus de 25 Mo est refusé
- `40-abonnement.sql` : essai de 14 jours, accès fermé à l'expiration, codes cadeaux (format, usage unique, cumul des jours, désactivation), fonctions d'administration refusées aux autres et à `anon`, administrateur toujours admis, envoi atomique de l'atelier (archive seulement quand la base connue est périmée), plafond de 30 versions ; V56 : `acces_actif()` (un compte expiré ne peut plus écrire : atelier, versions, patrons, facture), atelier vide refusé face à un atelier rempli (`vierge`), journal `stripe_evenements`
  (`atelier_trop_gros`), le 301e patron d'un compte aussi (`trop_de_patrons`).
