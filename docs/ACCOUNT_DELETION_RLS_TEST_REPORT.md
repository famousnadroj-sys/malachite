# MALACHITE — Rapport de test RLS pour la suppression de compte

**Branche :** `security/account-deletion-design-v1`  
**Commit testé :** `01a7edeb18016c05dab76160804ce02597d67fd0`  
**Workflow :** [GitHub Actions — run 45500032210](https://github.com/famousnadroj-sys/malachite/actions/runs/45500032210) ; validation générale [run 45500032325](https://github.com/famousnadroj-sys/malachite/actions/runs/45500032325)  
**Résultat :** succès sur PostgreSQL 17 jetable.

## Portée du test

Le fichier `supabase/tests/account_deletion_rls_contract.sql` crée un schéma isolé dans une base PostgreSQL jetable, active RLS sur les tables de conversation et de membres, et teste la lecture sous quatre identités synthétiques :

- **A (compte supprimé)** : aucune appartenance active ; ne peut lire aucun message du fil A-B.
- **B (membre restant)** : lit les deux messages conservés dans le fil A-B, dont le message de A avec `sender_id = NULL` et une date d’anonymisation.
- **C et D (fil indépendant)** : chacun ne lit que le message de son propre fil ; ils ne lisent pas les messages A-B.

Les contrats SQL de comportement, RLS, backfill, forme du schéma de messagerie et migration Phase A s’exécutent dans la même étape GitHub Actions. Le brouillon Phase A est appliqué deux fois de suite dans la base jetable afin de vérifier sa relance sans doublons. Le job `45500032210` est terminé avec `success` ; les 11 jobs du workflow de validation `45500032325` sont également terminés avec `success`.

Le contrat de backfill vérifie également que les messages A→B et B→A sont rattachés au même identifiant de conversation stable, que les participants sont créés une seule fois et que tous les messages historiques du jeu d’essai sont migrés.

### Contrôle complémentaire Phase A

Le brouillon `docs/ACCOUNT_DELETION_PHASE_A_MIGRATION_DRAFT.sql` a été exécuté deux fois dans une base PostgreSQL 17 jetable préparée avec les colonnes réelles de `public.messages`. Le contrat vérifie :

- une paire A/B unique malgré les deux sens de messages ;
- un fil C/D indépendant ;
- un auteur Auth sans ligne `profiles` qui reste correctement rattaché ;
- les messages d'appel Jitsi conservés comme messages, sans les confondre avec des objets Storage ;
- les messages auto-adressés laissés sans fil plutôt que forcés dans le modèle A/B ;
- les messages auto-adressés et ceux dont un participant manque dans `auth.users` sont enregistrés dans `conversation_migration_quarantine`, sans identifiants de compte dans la table de quarantaine et sans lecture accordée aux clients ;
- l'accès RLS limité aux membres actifs ;
- à la suppression simulée du compte A dans Auth, la paire d'index et l'appartenance de A disparaissent, mais le fil et l'appartenance de B restent ; le nouveau `sender_id` devient NULL alors que l'ancien `de` subsiste pendant la compatibilité.

**Limite importante :** cette base est un fixture d'intégration construit à partir des colonnes observées en production ; elle ne charge pas encore l'intégralité des 65 migrations appliquées, des fonctions et des triggers Supabase réels. Le test de schéma de messagerie reproduit les comportements pertinents pour le contrat, mais ne remplace pas une restauration complète du schéma de production dans un projet de test.

**Évolution récente :** les assertions de quarantaine ajoutées au brouillon Phase A ont été exécutées dans PostgreSQL 17 jetable (run `45500032210`). Elles n'ont pas encore été rejouées dans le projet Supabase de test dédié décrit plus bas ; ce projet a testé la version précédente du brouillon.

### Vérification sur le vrai schéma Supabase de test

Un second test a été effectué dans le projet Supabase distinct `malachite-match-test` (`sbawknyxcjslvhknomkd`), qui était vide côté utilisateurs/messages et contenait déjà 51 migrations de schéma, dont les triggers et policies réels de messagerie, reçus et médias. Le brouillon Phase A a été enregistré dans ce projet de test sous la migration `account_deletion_phase_a_conversation_threads_test` (version `20261124213104`). **Aucune migration n'a été appliquée au projet de production.**

Dans une transaction ensuite annulée, des comptes synthétiques A/B/C/D/E et des messages ont été créés avec les vrais triggers de ce projet, y compris un appel Jitsi et un auteur sans ligne `profiles`. Le test a vérifié :

- le backfill de 5 messages vers 3 fils et 6 appartenances ;
- les règles RLS réelles : A ne voit que le fil A/B, C ne voit que C/D, B voit ses deux fils ;
- l'insertion d'un reçu de livraison sous l'identité B ;
- après suppression simulée de A dans `auth.users`, le fil A/B et l'appartenance de B restent, l'index de paire et l'appartenance de A disparaissent, et `sender_id` devient NULL ;
- le reçu lié à A disparaît par cascade, conformément aux FK actuelles.

Après `ROLLBACK`, les compteurs du projet de test sont revenus à zéro pour `auth.users`, `messages`, `profiles`, `message_receipts`, `conversation_threads` et `conversation_members`. La migration Phase A reste uniquement dans le schéma de ce projet de test.

**Conséquence métier :** les reçus de livraison/lecture ne sont actuellement pas conservés après suppression d'un des deux comptes. Si Malachite doit préserver un état de livraison anonymisé pour le membre restant, il faudra modifier les FK et la structure des reçus dans une phase ultérieure ; ne pas promettre cette conservation avec le schéma actuel.

## Ce que ce succès prouve

Le modèle proposé d’appartenance active à une conversation peut appliquer, dans PostgreSQL, la règle d’accès attendue : un membre retiré ne lit plus le fil, le membre restant conserve l’historique anonymisé, et un tiers ne lit pas les conversations d’autrui.

## Ce que ce succès ne prouve pas

- Il ne teste pas l'intégralité des policies de production existantes sur `public.messages`, `message_receipts` ou `storage.objects`.
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
