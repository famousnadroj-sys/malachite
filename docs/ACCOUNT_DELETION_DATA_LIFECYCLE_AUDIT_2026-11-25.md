# MALACHITE — audit technique de suppression de compte

Date : 25 novembre 2026  
Projet audité en lecture seule : `tscsmemsvgacqioncash`  
Aucune suppression de compte, aucune modification SQL et aucune lecture de contenu utilisateur n'ont été effectuées.

## Conclusion

La migration `20261124120000_account_deletion_fk_cleanup.sql` ne réalise pas la suppression de compte. Elle prépare seulement trois références d'audit à devenir nulles lors d'une future suppression :
- `campagnes.cree_par`
- `demandes_support.traite_par`
- `signalements.traite_par`

Elle ne supprime pas les utilisateurs, profils, messages, paiements, rendez-vous, avis ou fichiers Storage. Le workflow complet de suppression reste donc **non implémenté**.

## Relations Auth avec suppression référentielle

La lecture de `pg_constraint` a relevé 34 clés étrangères vers `auth.users` :
- `ON DELETE CASCADE` pour les identités/sessions/facteurs Auth, profils, préférences, noms de connexion, blocages, sessions d'appel, reçus de message, notifications personnelles, suspensions, événements Match, demandes support, abonnements push admin et références de parrainage.
- `ON DELETE SET NULL` pour les références d'acteur/auteur de campagnes, actions admin, demandes support, signalements, suspensions et notifications.

Ces relations ne prouvent pas que la suppression est complète : plusieurs tables métier qui contiennent des UUID d'utilisateur n'ont pas de FK vers `auth.users`.

## Tables liées à un membre sans FK vers Auth constatée

Le contrôle des colonnes et contraintes a relevé les surfaces suivantes :

| Table | Références utilisateur | Risque / décision nécessaire |
|---|---|---|
| `avis_match` | `user_id`, `autre` | Les likes reçus/émis peuvent rester orphelins ; supprimer les deux côtés ou anonymiser selon la règle Match |
| `avis_site` | `user_id` | Décider suppression ou anonymisation de l'avis et du texte libre |
| `deblocages` | `user_id`, `cible` | Nettoyer les relations dans les deux sens |
| `messages` | `de`, `a` | Définir la conservation des messages dans les conversations partagées et la suppression des médias associés |
| `paiements` | `user_id`, `cible` | Ne pas effacer automatiquement les preuves financières ; définir une durée légale/comptable et anonymiser les identifiants lorsque permis |
| `rendez_vous` | `de`, `a` | Nettoyer ou anonymiser les rendez-vous liés aux deux participants |
| `signalements` | `de`, `profil` | Préserver les dossiers de modération nécessaires, mais supprimer/anonymiser les identifiants selon une politique approuvée |

Les reçus de paiement référencent `paiements.receipt_path` et les objets sont dans le bucket privé `payment-receipts`. Les médias de messages et photos de profil sont aussi dans Storage ; une suppression SQL seule ne supprime pas les objets binaires. Les chemins de fichiers sont également conservés dans `profiles.photos` et `profiles.avatar`.

## Politique à définir avant le code destructif

Une suppression irréversible ne doit pas être conçue sans règles de conservation explicites. Faire valider par un juriste et un professionnel comptable connaissant la RDC :
1. délais de conservation des transactions, reçus, litiges et dossiers de signalement ;
2. distinction entre suppression du compte, anonymisation et conservation légale restreinte ;
3. traitement des messages d'une conversation partagée (suppression globale, retrait pour soi, ou conservation côté destinataire) ;
4. traitement des rendez-vous, avis, blocages, likes et parrainages ;
5. délai de grâce éventuel, annulation de la demande et authentification renforcée ;
6. journal d'audit minimal à conserver sans identifiants personnels inutiles.

Aucune durée légale n'est inventée dans ce document.

## Architecture recommandée — à tester avant déploiement

1. RPC serveur authentifiée `request_account_deletion()` : exige la session courante, une réauthentification récente, confirmation explicite et un idempotency key ; refuse les demandes non autorisées.
2. Marquer la demande comme `pending` et bloquer immédiatement les nouvelles connexions/actions sensibles ; ne pas supprimer directement depuis le client.
3. Worker serveur idempotent avec étapes explicites : sessions/tokens, données de profil/préférences, Match/blocages, messages et médias, rendez-vous, Storage, données de support/modération, données financières, Auth.
4. Appliquer les règles de conservation approuvées : supprimer ce qui doit l'être, anonymiser le strict minimum qui doit être conservé, limiter l'accès et journaliser l'opération.
5. Purger les objets Storage par liste de chemins possédés vérifiée côté serveur ; ne jamais accepter une liste de chemins arbitraire fournie par le client.
6. Révoquer toutes les sessions et finaliser Auth uniquement après les étapes requises.
7. Prévoir reprises, erreurs partielles, réconciliation, alertes admin et preuve de fin sans exposer les données.
8. Ajouter des tests PostgreSQL isolés couvrant chaque table, les deux côtés des relations, les fichiers Storage, les paiements conservés/anonymisés, les demandes répétées et les échecs à mi-parcours.

## Critères de validation avant lancement

- [ ] Politique de conservation signée/validée pour les données financières, modération et messages.
- [ ] Inventaire de toutes les colonnes UUID/JSON/Storage qui peuvent identifier un membre.
- [ ] RPC de demande protégée et idempotente.
- [ ] Worker de suppression par étapes, reprenable et audité.
- [ ] Tests d'intégration sur deux comptes de test et données synthétiques.
- [ ] Tests Storage confirmant la suppression des objets possédés sans toucher ceux d'autres membres.
- [ ] Tests de conservation/anonymisation pour paiements et signalements.
- [ ] Révocation des sessions et impossibilité de se reconnecter après finalisation.
- [ ] Aucun résidu de fixture et preuve de suppression/anonymisation.
- [ ] Exercice de restauration disponible avant toute suppression réelle.

**Statut : BLOQUÉ avant lancement.** Les FKs existantes sont une préparation partielle, pas un système de suppression de compte.
