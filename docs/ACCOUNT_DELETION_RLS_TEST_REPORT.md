# MALACHITE — Rapport de test RLS pour la suppression de compte

**Branche :** `security/account-deletion-design-v1`  
**Commit testé :** `27a062028c3a240ce46f39a7973a4174d93b795d`  
**Workflow :** [GitHub Actions — run 45488037670](https://github.com/famousnadroj-sys/malachite/actions/runs/45488037670)  
**Résultat :** succès sur PostgreSQL 17 jetable.

## Portée du test

Le fichier `supabase/tests/account_deletion_rls_contract.sql` crée un schéma isolé dans une base PostgreSQL jetable, active RLS sur les tables de conversation et de membres, et teste la lecture sous quatre identités synthétiques :

- **A (compte supprimé)** : aucune appartenance active ; ne peut lire aucun message du fil A-B.
- **B (membre restant)** : lit les deux messages conservés dans le fil A-B, dont le message de A avec `sender_id = NULL` et une date d’anonymisation.
- **C et D (fil indépendant)** : chacun ne lit que le message de son propre fil ; ils ne lisent pas les messages A-B.

Les trois contrats SQL — comportement, RLS et backfill — s’exécutent dans la même étape GitHub Actions. Le job est terminé avec `success`.

Le contrat de backfill vérifie également que les messages A→B et B→A sont rattachés au même identifiant de conversation stable, que les participants sont créés une seule fois et que tous les messages historiques du jeu d’essai sont migrés.

## Ce que ce succès prouve

Le modèle proposé d’appartenance active à une conversation peut appliquer, dans PostgreSQL, la règle d’accès attendue : un membre retiré ne lit plus le fil, le membre restant conserve l’historique anonymisé, et un tiers ne lit pas les conversations d’autrui.

## Ce que ce succès ne prouve pas

- Il ne teste pas les policies de production existantes sur `public.messages`, `message_receipts` ou `storage.objects`.
- Il ne migre pas les messages historiques réels ni leurs reçus.
- Il ne vérifie pas les URLs signées, les objets Storage ou la propriété de fichiers.
- Il ne révoque pas les sessions Supabase Auth et ne supprime aucun compte.
- Il ne teste pas encore le workflow serveur, les reprises après interruption, les rendez-vous, paiements, signalements et notifications dans un schéma complet.

## Garde-fous Supabase à intégrer à l’implémentation

La documentation officielle Supabase consultée pour cette étape confirme deux contraintes opérationnelles :
1. La suppression d’un utilisateur dans Auth ne déconnecte pas automatiquement ses sessions existantes ; ses JWT peuvent rester valides jusqu’à leur expiration. Le workflow devra donc révoquer les sessions avant la suppression et maintenir une vérification d’accès côté serveur/RLS pendant la transition.
2. Supabase Auth refuse la suppression d’un utilisateur qui possède encore des objets Storage. Les fichiers doivent être inventoriés et supprimés via l’API Storage ou transférés uniquement si une règle explicite l’autorise ; ne jamais supprimer directement les lignes de `storage.objects` par SQL.

Référence : [Supabase — User Management](https://supabase.com/docs/guides/auth/managing-user-data).

## Étape suivante

Avant d’écrire une migration de production, construire une base de test intégrant les définitions réelles des tables, fonctions, triggers et policies de Malachite. Y rejouer les migrations nécessaires, puis ajouter le modèle de conversation en migration additive et vérifier le backfill des conversations existantes, les reçus, les médias, les rendez-vous et les accès A/B/C. Aucun changement de production n’est autorisé à ce stade.
