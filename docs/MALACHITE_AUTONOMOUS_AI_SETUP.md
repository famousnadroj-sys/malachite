# Malachite — supervision autonome (état réel)

## Déjà actif dans Supabase
- Edge Function `malachite-ai-worker` déployée, protégée par une signature HMAC courte durée.
- Secret HMAC créé directement dans Supabase Vault ; sa valeur n'est ni dans GitHub ni dans la file pg_net.
- Extension `pg_net` activée dans le schéma `extensions`.
- Tâche Cron `malachite-ai-ops-worker` active toutes les 15 minutes.
- Table `ai_ops_runs` pour les exécutions et leurs résultats.
- Le job existant `malachite-entitlement-expiry-notifications` reste intact.

## Vérifications déjà exécutées
- Appel signé de bout en bout : HTTP 200, exécution enregistrée et indicateurs retournés.
- Appel sans signature : HTTP 401.
- Fausse signature : refusée.
- Rôles `anon` et `authenticated` : aucun droit de lecture sur `ai_ops_runs`, aucun droit d'exécution sur la RPC de vérification.
- `service_role` : accès autorisé comme prévu.
- Les mesures sont agrégées ; aucun message privé, texte de support, justificatif de paiement ou profil individuel n'est transmis au modèle.

## Ce que le worker fait actuellement
Toutes les 15 minutes, il compte les profils, les inscriptions récentes, les abonnements Premium actifs, les paiements en attente, les signalements nouveaux, les demandes de support ouvertes et les comptes suspendus. Il journalise le résultat.

## IA générative : non activée pour les tâches de fond
La génération Gemini du briefing est volontairement désactivée tant que la configuration et le budget d'utilisation de l'API ne sont pas confirmés. Le worker expose seulement un indicateur booléen de présence de la clé, jamais sa valeur. Le fournisseur peut appliquer des limites ou des frais selon le niveau du projet ; la gratuité ne peut pas être garantie par le code.

Pour activer le briefing, définir dans Supabase Edge Function Secrets :
- `GEMINI_API_KEY` (si elle n'existe pas déjà) ;
- `MALACHITE_AI_AUTONOMY_ENABLED=true` après vérification du niveau tarifaire et des quotas.

Le modèle et le volume de génération restent plafonnés à un briefing au maximum toutes les six heures.

## Ce qui n'est pas encore automatisé
Le worker n'exécute pas encore le support, la modération, les réponses aux membres, les remboursements, les décisions de paiement ou les actions sur les comptes. Il ne faut pas le présenter comme un gestionnaire complet du site. Ces workflows demandent des actions métier autorisées individuellement, une file de tâches idempotente, des journaux d'audit, des tests par cas et un circuit d'approbation pour les actions sensibles.

## Garde-fous
Aucune validation de paiement, remboursement, bannissement définitif, suppression de données, changement de sécurité ou modification de moyens de réception n'est effectuée automatiquement. Ces décisions restent réservées au fondateur.
