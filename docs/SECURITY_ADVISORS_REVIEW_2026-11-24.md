# Malachite — revue des alertes Supabase (24 novembre 2026)

## Périmètre et méthode

Revue en lecture seule du projet de production Supabase `tscsmemsvgacqioncash`, le 24/11/2026. Aucun SQL DDL/DML, aucune modification de configuration Auth, aucun déploiement et aucune migration n'ont été exécutés pendant cette revue.

Les alertes ci-dessous proviennent des Security Advisors et Performance Advisors Supabase. Les définitions SQL et privilèges des fonctions signalées ont été vérifiés séparément.

## Alertes de sécurité

### 1. Protection contre les mots de passe compromis désactivée — action recommandée

Supabase Auth signale que la protection contre les mots de passe divulgués (vérification HaveIBeenPwned) est désactivée.

**Décision :** ne pas tenter de l'activer sur le forfait actuel. La documentation officielle Supabase confirme que cette protection est disponible uniquement sur Pro et supérieur ; l'organisation MALACHITE est sur Free. L'activation nécessiterait donc une montée de forfait payante, qui n'est ni prévue ni autorisée. Conserver cette alerte comme limitation connue, renforcer gratuitement les exigences de longueur/complexité et la limitation des tentatives, puis réévaluer seulement si le propriétaire approuve explicitement un budget.

### 2. Fonction SECURITY DEFINER accessible à anon — exception limitée à documenter

`public.get_malachite_referrer_preview(uuid)` est exécutable par `anon` et `authenticated`. Son corps ne renvoie que `prenom` et `username` pour le profil correspondant lorsque `profile_private = false`, avec une seule ligne maximum.

**Évaluation :** l'exposition paraît cohérente avec l'aperçu public du parrain lors d'une inscription. Elle doit rester limitée à ces deux champs publics. Ne pas élargir la fonction à des coordonnées, données privées ou informations de compte. Si le parcours d'inscription n'a pas besoin de cet aperçu avant connexion, retirer le droit `EXECUTE` à `anon` dans une migration dédiée après test du parcours.

### 3. Fonctions SECURITY DEFINER réservées aux utilisateurs authentifiés — contrôle d'accès présent

Les quatre autres fonctions signalées sont :
- `public.admin_malachite_referrals()`
- `public.founder_business_overview(timestamptz, timestamptz)`
- `public.founder_finance_summary(timestamptz, timestamptz)`
- `public.start_call_session(uuid, uuid, text, text, timestamptz)`

L'inspection confirme que `anon` ne peut pas les exécuter. Les trois fonctions d'administration/finance vérifient explicitement `auth.uid()` et `private.is_admin()`. La fonction d'appel exige une session authentifiée et contrôle les droits d'appel, le blocage mutuel, le match réciproque et l'absence d'appel déjà actif.

**Évaluation :** alerte à conserver dans le suivi, mais pas de révocation automatique recommandée sans test des parcours admin, finance et appels. Les fonctions utilisent un `search_path` vide.

### 4. Tables avec RLS activé mais sans policy — accès par défaut fermé, à surveiller

L'advisor signale 10 tables :
- `private.admins`
- `private.founder_finance_ledger`
- `public.admin_push_queue`
- `public.admin_push_subscriptions`
- `public.ai_manager_audit`
- `public.ai_ops_runs`
- `public.malachite_ai_alerts`
- `public.malachite_ai_review_queue`
- `public.malachite_ai_settings`
- `public.malachite_referrals`

La revue précédente des privilèges directs avait confirmé l'absence de droits directs anon/authenticated sur ces tables. Avec RLS activé et aucune policy, l'accès via ces rôles reste refusé par défaut. Ne pas ajouter de policies génériques pour faire disparaître l'alerte : toute ouverture doit être justifiée table par table et testée avec les rôles concernés.

## Alertes de performance

19 index sont actuellement signalés comme inutilisés. L'application et la base étant encore jeunes, l'absence d'utilisation observée ne prouve pas qu'ils sont inutiles. **Aucun index ne doit être supprimé sur la seule base de cette alerte.** Revoir les statistiques après une période de trafic représentative, puis analyser les plans de requête et les contraintes avant toute suppression.

## Actions proposées, dans l'ordre

1. Sur le forfait Free actuel, ne pas activer la protection HaveIBeenPwned (fonctionnalité Pro+). Renforcer les contrôles Auth disponibles sans surcoût ; réévaluer un éventuel upgrade uniquement après approbation explicite du coût.
2. Ajouter un test d'intégration qui confirme que l'aperçu parrain ne révèle que les champs publics et ne retourne rien pour un profil privé.
3. Ajouter des tests négatifs anon/non-admin pour les RPC d'administration et de finance, ainsi que des tests de droits d'appel.
4. Maintenir les tables sans policies en accès fermé tant qu'aucun besoin fonctionnel validé ne justifie une policy.
5. Revoir les index seulement après collecte de statistiques sous trafic réel.

## Tests d'accès exécutés sur staging isolé

Le 24 novembre 2026, des tests SQL transactionnels ont été exécutés sur le projet de staging isolé `malachite-match-test` (pas sur la production) :
- le rôle `anon` ne dispose pas du droit EXECUTE sur les trois RPC admin/finance ;
- un JWT simulé avec un UUID de test non administrateur est refusé par `admin_malachite_referrals`, `founder_business_overview` et `founder_finance_summary` ;
- l'aperçu parrain ne retourne aucune ligne pour un UUID inconnu ;
- la transaction de test est annulée (`ROLLBACK`) et ne conserve aucune modification.

Limite : la base de staging ne contient aucun profil. Le comportement runtime pour un profil privé et un profil public n'a donc pas pu être exercé avec des fixtures. Les assertions de définition SQL vérifient néanmoins que la fonction filtre `profile_private = false` et ne retourne que `prenom` et `username`. Ce contrôle runtime devra être complété avec des comptes de test avant lancement.

## État de production

Aucune correction n'a été appliquée en production pendant cette revue. Les alertes sont classées et les contrôles vérifiés ; les changements de configuration Auth ou de privilèges devront faire l'objet d'une modification isolée, testée et validée avant déploiement.
