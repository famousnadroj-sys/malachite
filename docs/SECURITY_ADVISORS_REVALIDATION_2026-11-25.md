# MALACHITE — revalidation des Security Advisors Supabase

Date de contrôle : 25 novembre 2026, 19:40 UTC  
Projet : `tscsmemsvgacqioncash`  
Périmètre : lecture seule de la production ; aucun DDL/DML ni changement de configuration appliqué.

## Résultat observé

Les Security Advisors signalent :
- 12 tables avec RLS activé et sans policy (niveau INFO).
- 1 fonction `SECURITY DEFINER` exécutable par `anon`.
- 9 fonctions `SECURITY DEFINER` exécutables par `authenticated`.
- 1 avertissement Auth : protection contre les mots de passe compromis désactivée.

Les Performance Advisors signalent 19 index non utilisés. Aucun n'a été supprimé : les statistiques d'une application jeune ne suffisent pas à prouver qu'un index est inutile.

## Fonctions SECURITY DEFINER — privilèges et logique relus

Toutes les fonctions ci-dessous ont un `search_path` vide (`SET search_path TO ''`) et appartiennent à `postgres`.

### Exception publique limitée

`public.get_malachite_referrer_preview(uuid)`
- `anon` : EXECUTE autorisé ; `authenticated` : EXECUTE autorisé.
- Le corps ne retourne que `prenom` et `username`, une seule ligne, uniquement lorsque `profile_private = false`.
- Cette fonction sert l'aperçu public du parrain avant inscription. L'exception doit rester strictement limitée à ces deux champs. Toute extension des données renvoyées nécessite une nouvelle revue.
- Test complémentaire requis : compte public, compte privé, UUID inconnu, et parcours réel d'inscription.

### RPC réservées aux membres connectés

Les fonctions suivantes sont exécutables par `authenticated`, mais pas par `anon` :
- `public.admin_malachite_referrals()`
- `public.est_match(uuid)`
- `public.founder_business_overview(timestamptz,timestamptz)`
- `public.founder_finance_summary(timestamptz,timestamptz)`
- `public.match_like_quota()`
- `public.match_received_likes()`
- `public.match_relation_compatible_ids()`
- `public.start_call_session(uuid,uuid,text,text,timestamptz)`

Contrôles de corps :
- Les RPC d'administration et de finance vérifient `auth.uid()` et `private.is_admin()`.
- `private.est_match` vérifie une identité connectée, la visibilité publique du profil, la compatibilité et le match réciproque.
- Les fonctions privées de quota, de likes reçus et de compatibilité vérifient l'identité, l'état de suspension et appliquent les filtres de visibilité/blocage.
- `start_call_session` exige une identité, une entitlement valide, un match réciproque, l'absence de blocage, une salle et une expiration bornées, et l'absence d'appel déjà actif.

Décision : ne pas révoquer en bloc les droits EXECUTE des membres connectés ; cela casserait les parcours attendus. Les tests de non-admin et les tests de rôles anonymes doivent rester dans la CI. Les wrappers publics ne doivent jamais exposer directement les fonctions privées aux rôles API.

## Tables RLS sans policy

Le contrôle actuel signale 12 tables :
- `private.admins`
- `private.founder_finance_ledger`
- `private.match_daily_like_events`
- `public.admin_push_queue`
- `public.admin_push_subscriptions`
- `public.ai_manager_audit`
- `public.ai_ops_runs`
- `public.campagnes`
- `public.malachite_ai_alerts`
- `public.malachite_ai_review_queue`
- `public.malachite_ai_settings`
- `public.malachite_referrals`

L'absence de policy avec RLS activé est un refus par défaut, pas une permission implicite. Ne pas ajouter de policy générique pour faire disparaître l'alerte. Vérifier périodiquement les privilèges SQL directs `anon`/`authenticated` et l'accès par RPC/service role.

## Autres avertissements

### Protection des mots de passe compromis
La protection contre les mots de passe divulgués est désactivée. Le projet est sur le plan Free au moment du contrôle. Ne pas activer de plan payant ni modifier l'abonnement sans approbation explicite du propriétaire. Conserver les protections gratuites disponibles (limitation des tentatives, politique de mots de passe) et signaler cette limite avant lancement.

### Index inutilisés
19 index sont marqués non utilisés. Ne pas les supprimer sur cette seule base. Réévaluer après une période de trafic représentative, avec plans EXPLAIN, contraintes et impact de chaque index.

## État et actions restantes

- [x] Relire les privilèges anon/authenticated des 9 fonctions.
- [x] Relire les corps des wrappers et des fonctions privées appelées.
- [x] Vérifier que le `search_path` est vide sur les fonctions auditées.
- [x] Classer les 12 tables RLS sans policy comme fermées par défaut.
- [x] Confirmer que les 19 index ne sont pas supprimés.
- [ ] Compléter le test runtime de l'aperçu parrain avec profils public/privé.
- [ ] Rejouer les tests d'administration/finance et d'appel sur une staging alignée sur la séquence de migrations actuelle.
- [ ] Vérifier les paramètres Auth disponibles sans upgrade payant.
- [ ] Refaire les Advisors après déploiement contrôlé, sans traiter mécaniquement chaque avertissement comme une vulnérabilité.

**Décision :** aucune modification de production n'est justifiée par ces alertes seules. Maintenir le verrou de déploiement jusqu'à la sauvegarde/restauration certifiée, à la fermeture du chemin Pages alternatif et à la validation des migrations de sécurité.
