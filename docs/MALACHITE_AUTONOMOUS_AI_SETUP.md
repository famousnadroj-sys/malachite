# Malachite — fondation de supervision autonome

## État
Cette fondation ajoute un worker serveur isolé. Il collecte des indicateurs agrégés et journalise ses exécutions. Elle n'altère aucune table métier existante.

## Sécurité du déclencheur
La clé HMAC est créée côté base dans Supabase Vault. pg_cron calcule une signature courte et transmet uniquement le timestamp, le corps et la signature via pg_net. L'Edge Function vérifie la signature par une RPC limitée à service_role. La clé HMAC ne quitte jamais Vault et n'est jamais placée dans la file pg_net.

## Planification
Une tâche nommée `malachite-ai-ops-worker` est planifiée toutes les 15 minutes. Le job ne doit pas être confondu avec le job existant `malachite-entitlement-expiry-notifications`, qui reste inchangé.

## Données lues
Uniquement des décomptes agrégés : nombre de profils, nouveaux profils sur 7 jours, abonnements Premium actifs, paiements en attente, signalements nouveaux, demandes de support ouvertes et comptes suspendus. Aucun message privé, texte de support, justificatif de paiement ou profil individuel n'est transmis au modèle.

## Rapports IA
Si `MALACHITE_AI_AUTONOMY_ENABLED=true` et `GEMINI_API_KEY` est configurée dans Supabase Edge Function Secrets, un rapport de synthèse peut être généré au maximum toutes les six heures. Si l'une de ces conditions manque, le worker continue les mesures et consigne l'état partiel.

## Limites
Cette fondation ne traite pas encore automatiquement les tickets, les signalements ou les opérations métier. Aucune action sur les comptes, paiements, abonnements, sanctions, remboursements ou suppressions n'est exécutée. Ces workflows nécessitent des règles métier spécifiques, un journal d'audit, l'idempotence, des tests et un circuit d'approbation pour les décisions sensibles.

## Contrôles avant activation
- Vérifier le type-check Deno et la migration SQL.
- Vérifier que les rôles anon/authenticated ne peuvent ni lire le journal ni appeler la RPC de vérification.
- Vérifier qu'un appel sans signature et avec signature altérée est refusé.
- Vérifier une exécution planifiée et sa trace dans `ai_ops_runs`.
- Configurer Gemini seulement après validation des quotas et du budget.
