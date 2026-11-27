# Malachite — revue des fonctions SECURITY DEFINER (27 novembre 2026)

## Résultat exécutif

Les alertes Supabase ne signifient pas que les 27 RPC authentifiés sont toutes exploitables sans contrôle. Chaque fonction a été examinée sur le staging : les fonctions publiques sont des RPC métier, des wrappers vers des implémentations privées ou des opérations administrateur. Elles utilisent `search_path = ''`. Les implémentations privées ne doivent pas rester directement exécutables par les rôles API.

**Correctif préparé et appliqué au staging :** retrait de EXECUTE sur toutes les fonctions du schéma `private` pour `PUBLIC`, `anon` et `authenticated`, puis réattribution minimale aux prédicats utilisés par les politiques RLS. En staging, cinq helpers sont requis : `is_admin()`, `is_blocked_with(uuid)`, `is_suspended(uuid)`, `account_exists(uuid)`, `blocked_text(text)`. En production actuelle, seules les quatre premières politiques listées sans `account_exists` sont référencées; la migration utilise donc un grant conditionnel pour rester compatible avec les deux schémas.

Le contrôle de régression staging a réussi : aucune fonction privée n'est exécutable par `anon`; `authenticated` ne peut exécuter que les cinq prédicats nécessaires aux policies; les wrappers RPC publics gardent leurs grants; les politiques RLS ont été exercées sous le rôle authenticated. Un test de fonction temporaire confirme aussi que les futures fonctions privées créées par `postgres` sont fermées par défaut, tandis que les futures fonctions `public` conservent les grants API existants.

## Classification des RPC publiques en staging

- **Administration / données financières :** `admin_duplicate_pending_payment_ids`, `admin_malachite_referrals`, `founder_business_overview`, `moderate_user`, `publish_user_announcement`, `traiter_lot_paiements`, `traiter_paiement` (deux signatures). Elles exigent un contrôle administrateur dans leur implémentation privée ou dans la fonction elle-même.
- **Profil / compte / préférences :** `save_my_profile`, `update_my_avatar`, `update_my_preferences`. Elles s'attachent à `auth.uid()`, valident les données et n'acceptent pas l'identité d'un autre membre.
- **Match / visibilité :** `est_match`, `match_like_quota`, `match_received_likes`, `match_relation_compatible_ids`, `public_status_badges`. Elles sont limitées au membre connecté et filtrent profils privés, suspensions et blocages; les likes reçus non-Premium sont limités à trois identifiants visibles.
- **Blocage / listes personnelles :** `blocked_user_ids`, `is_blocked_with`, `my_blocked_profiles`. Elles retournent uniquement l'état relatif au membre appelant.
- **Contact privé :** `contact_de` exige une relation de match, aucun blocage, et Premium ou déblocage ciblé.
- **Notifications :** `create_my_notification`, `create_my_action_notification`, `check_my_entitlement_expirations`. Les créations sont destinées à `auth.uid()`; les entrées sont bornées et validées. Le contrôle d'expiration ne traite que les avantages du membre appelant.
- **Appels :** `start_call_session`, `update_my_call_session_status`. Les participants sont authentifiés, l'éligibilité et le match réciproque sont vérifiés, les blocages/suspensions sont refusés, les transitions sont limitées aux participants et le fournisseur doit être activé.
- **Administration IA :** `malachite_ai_manager_is_admin` ne révèle que le statut admin du compte appelant.

## Alerte anonyme

`get_malachite_referrer_preview(uuid)` est la seule fonction SECURITY DEFINER exécutable par `anon` en staging et production. Son usage public est nécessaire au parcours de parrainage et ne renvoie que prénom/nom d'utilisateur d'un profil public. La version staging vérifie aussi suspension et blocage pour les visiteurs connectés. **La version production était plus faible** : elle ne vérifiait que `profile_private = false`. Une migration candidate corrige cela en excluant les profils suspendus et les relations bloquées pour les visiteurs authentifiés, tout en conservant l'aperçu anonyme d'un profil public.

## Différences staging / production et limites

- Staging signale 27 RPC SECURITY DEFINER accessibles à `authenticated`; production en signale actuellement 9, dont une fonction de synthèse financière supplémentaire et une version ancienne de l'aperçu de parrainage.
- Les 27 alertes Advisor restantes ne doivent pas être traitées par un REVOKE global sur `public` : elles correspondent à des RPC exposées qui ont besoin d'un EXECUTE explicite et dont les contrôles doivent rester testés.
- Les fonctions privées de déclencheurs (triggers) n'ont pas besoin d'être appelables directement par les rôles API; leur exécution par le mécanisme trigger continue malgré la révocation d'EXECUTE aux rôles API.
- Les tests d'intégration d'appels existants n'ont pas pu être exécutés intégralement sur ce staging : le jeu de test utilise des identifiants Auth fixes absents de ce projet et l'insertion a été refusée par une FK. Le test PostgreSQL isolé CI reste requis; aucun contournement ni utilisateur de test n'a été créé en staging.
- Les migrations sont des candidates GitHub. La production n'a reçu aucun changement; sa réconciliation reste bloquée par l'absence de sauvegarde/restauration vérifiée et par l'historique de migrations divergent.

## Fichiers candidats

- `supabase/migrations/20261127223000_restrict_private_function_execution.sql`
- `supabase/migrations/20261127224000_private_function_default_privileges.sql`
- `supabase/migrations/20261127225000_restrict_postgres_function_defaults.sql`
- `supabase/migrations/20261127230000_harden_public_referrer_preview.sql`
- `supabase/tests/private_function_execution_checks.sql`

**Décision :** amélioration de sécurité validée en staging; ne pas appliquer à la production avant la sauvegarde restaurable, la migration forward-only réconciliée et l'approbation du propriétaire.


## Risques spécifiques constatés en production

- La version production de `public.start_call_session` est antérieure au verrou JaaS : elle n'exige pas le fournisseur privé activé et ne vérifie pas la suspension des deux participants. Elle reste exécutable par `authenticated`. La migration candidate de verrouillage des appels doit être appliquée dans une séquence cohérente avec la publication frontend; ne pas activer les appels avec la fonction actuelle.
- Production conserve également les droits DML directs trop larges sur `public.call_sessions` et `public.profiles`, constatés dans l'audit ACL précédent. Les RPC SECURITY DEFINER ne compensent pas ces grants directs.
- `founder_finance_summary`, présent en production mais absent du staging courant, vérifie `auth.uid()` et `private.is_admin()` avant de lire le ledger financier; son accès reste réservé aux administrateurs.

Ces points sont distincts du décompte Advisor des fonctions SECURITY DEFINER et restent des portes de sécurité production non franchies.
