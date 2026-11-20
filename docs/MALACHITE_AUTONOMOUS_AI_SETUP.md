# Malachite — agent opérationnel autonome (fondation)

## État de cette branche

Cette proposition est isolée dans `feature/ai-autonomous-operations`. Elle ne modifie pas `main`, ne touche pas les interfaces existantes et n'est pas déployée en production.

Elle ajoute une fondation de supervision :
- un journal serveur de chaque exécution ;
- des indicateurs agrégés (membres, inscriptions récentes, Premium, paiements en attente, signalements nouveaux, support ouvert, suspensions) ;
- un rapport IA périodique, limité à un rapport toutes les six heures ;
- aucune lecture de messages privés, pièces de paiement ou profils individuels ;
- aucune modification de compte, validation de paiement, sanction, remboursement ou suppression.

## Prérequis manuels avant activation

1. Vérifier la clé Gemini dans Supabase Dashboard → Edge Functions → Secrets. Ne jamais la transmettre dans le chat ou la committer dans GitHub.
2. Générer un secret aléatoire long pour `MALACHITE_WORKER_SECRET` et le définir dans les secrets Edge Functions.
3. Définir `MALACHITE_AI_AUTONOMY_ENABLED=true` uniquement après validation du budget et des quotas Gemini.
4. Déployer `malachite-ai-worker` avec `verify_jwt=false`. La fonction exige alors `x-malachite-worker-token` et refuse les appels sans le secret dédié.
5. Appliquer la migration additive avant le déploiement de la fonction.
6. Activer `pg_net` uniquement après examen des implications de sécurité ci-dessous.

## Planification Supabase

Le projet dispose déjà de `pg_cron`, mais `pg_net` n'était pas activé lors de l'audit du 20 novembre 2026. La planification HTTP exige `pg_net` et un secret stocké dans Vault. La documentation Supabase avertit que les en-têtes déchiffrés peuvent rester temporairement dans `net.http_request_queue`; les privilèges d'accès à cette file doivent donc être vérifiés avant d'y placer un secret.

Après configuration du Vault et activation de `pg_net`, planifier un appel toutes les 15 minutes vers :
`/functions/v1/malachite-ai-worker`
avec l'en-tête `x-malachite-worker-token` et le corps `{"trigger":"cron"}`.

Ne pas créer le job cron tant que le secret Vault, les privilèges d'accès à la file et le test d'appel authentifié ne sont pas confirmés. Ne pas réutiliser la clé service_role comme secret de worker.

## Ce que cette fondation ne fait pas encore

Ce n'est pas encore un agent qui exécute toutes les opérations du site. Elle supervise et produit un briefing agrégé. Pour automatiser le support, la modération ou d'autres workflows, il faudra :
- une base de réponses approuvées et des règles de qualité ;
- des actions métier étroites et explicitement autorisées, chacune idempotente ;
- une file de tâches avec reprise, limites de tentatives et journalisation ;
- un système d'approbation pour les actions sensibles ;
- des tests multi-comptes, de charge, de sécurité et de reprise.

Les demandes de support et signalements ne sont pas envoyés au fournisseur IA dans cette première étape : leurs textes peuvent contenir des données personnelles. Aucun paiement n'est confirmé par une capture ou une référence saisie. Les suspensions définitives, remboursements, transferts d'argent, suppressions et modifications des moyens de réception restent sous contrôle du fondateur.

## Vérifications requises

- Deno type-check de la fonction.
- Parsing SQL de la migration.
- Tests d'appel : token absent/refusé, token correct, secret IA absent, erreur Gemini, succès.
- Vérifier que les lignes `ai_ops_runs` sont inaccessibles à `anon` et `authenticated`.
- Vérifier que le rapport ne contient aucune donnée personnelle.
- Vérifier les exécutions cron et le heartbeat avant toute activation durable.
