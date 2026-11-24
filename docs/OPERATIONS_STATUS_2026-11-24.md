# MALACHITE — état opérationnel vérifié

Date de contrôle : 24 novembre 2026  
Dépôt : `famousnadroj-sys/malachite`  
Production Supabase : `tscsmemsvgacqioncash`

## 1. Sauvegarde / restauration

- Plan Supabase de l'organisation vérifié : Free.
- Aucun export complet ni restauration de test n'a été exécuté par cette revue.
- La sauvegarde complète restaurable reste bloquée. Voir [BACKUP_RESTORE_RUNBOOK.md](BACKUP_RESTORE_RUNBOOK.md).
- Ne pas activer PITR ou un service payant sans validation du prix.

## 2. MALACHITE Match — PR #72

- PR #72 ouverte, brouillon, non fusionnée.
- Branche : `integration/match-frontend-mainline-2026-11-23`.
- Commit contrôlé : `6d2c2779c1ce1bd465ca15984799a6477f998cc5`.
- Vérification directe GitHub : checks `validate` et `match-runtime` tous deux terminés avec succès.
- Tests réels à deux comptes/appareils non effectués.
- Revue sécurité publiée dans la conversation de PR : la validation d'éligibilité des destinataires doit être faite côté serveur, et testée contre des appels REST directs (profil privé/suspendu/incompatible), pas seulement dans le frontend.
- Ne pas fusionner / déployer avant sauvegarde restaurable, correction/retest de cette revue, tests réels et autorisation.

## 3. Worker IA — état actuel (révision du 24 novembre)

Le worker est **ACTIF** en production, version 14, déploiement SHA :
`2da2b4aec51b87b5f67e1605c124fb66dd8abed770708ea231803f9245724f3b`.

Vérifications en lecture seule :
- Les logs Edge sur les dernières 24 h montrent des appels périodiques du worker avec HTTP 200.
- Les derniers enregistrements `ai_ops_runs` consultés sont `success`, sans `error_code`.
- Les briefings IA ne sont générés qu'avec le réglage activé et une clé fournisseur configurée ; les autres exécutions restent des tâches de supervision.
- L'authentification du worker repose sur une signature HMAC courte durée vérifiée en base et une clé Vault, non sur un JWT public.
- Le worker prépare des recommandations et brouillons ; les actions sensibles restent soumises à approbation humaine. Les brouillons support approuvés sont enregistrés dans le support mais ne sont pas envoyés automatiquement.

Cette vérification confirme le fonctionnement périodique actuel, pas une garantie de disponibilité continue ni un test de bout en bout de chaque action.

## 4. Avis Supabase — sécurité

Contrôle en lecture seule du 24 novembre :
- 10 tables avec RLS activé sans politique : principalement tables administratives/privées. Contrôle SQL complémentaire : `anon` et `authenticated` n'ont aucun privilège direct SELECT/INSERT sur ces 10 tables ; l'alerte est donc informative et le refus par défaut est confirmé.
- Alerte `anon_security_definer_function_executable` sur `public.get_malachite_referrer_preview(uuid)` : c'est la seule des 5 fonctions examinées exécutable par `anon`. Elle renvoie seulement le prénom et le nom d'utilisateur d'un profil non privé, ce qui semble correspondre à l'aperçu public de parrainage. Le risque est limité aux champs publics, mais la fonction doit rester minimaliste et son intention doit être confirmée.
- 5 fonctions `SECURITY DEFINER` sont exécutables par `authenticated` ; aucun accès `anon` pour les 4 autres : `admin_malachite_referrals`, `founder_business_overview`, `founder_finance_summary`, `start_call_session`. Les définitions examinées vérifient les permissions administrateur pour les RPC admin/finance ; `start_call_session` vérifie l'identité, l'abonnement, le blocage et le match mutuel. Ne pas supprimer ces contrôles ni changer en `SECURITY INVOKER` sans tests inter-comptes.
- Aucun DDL de production n'a été appliqué pendant cet audit.

## 5. Suite recommandée

1. Réaliser et tester la sauvegarde complète selon le runbook.
2. Terminer les tests Match avec deux comptes dans l'environnement de test et corriger la validation serveur.
3. Faire la revue ciblée des RPC `SECURITY DEFINER` et documenter les décisions sur les alertes.
4. Vérifier la restauration et les parcours de base sur staging.
5. Seulement ensuite demander une approbation explicite pour fusion/déploiement.

## Limites de cette revue

Les contrôles Supabase étaient en lecture seule. Aucun backup binaire complet n'a été téléchargé, aucun fichier Storage n'a été copié, aucune restauration n'a été exécutée, aucun changement de paiement/secret/fonction Edge n'a été déployé.
