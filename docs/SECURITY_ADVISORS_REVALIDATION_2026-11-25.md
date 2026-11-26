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


## Blocage GitHub Pages confirmé par les exécutions

- Le workflow personnalisé `.github/workflows/deploy-production.yml` a échoué fermé le 25 novembre à 18:04 UTC sur le commit `40b91735d1565e6899264bf08dc152eebeab1e30` (run `45671283575`) : le contrôle `MALACHITE_DB_SECURITY_READY` n'était pas approuvé.
- Au même instant, le workflow généré `pages build and deployment` (path `dynamic/pages/pages-build-deployment`) s'est terminé avec succès sur le même commit (run `45671282973`).
- Cette preuve confirme que le chemin de publication Pages par branche reste actif et contourne le verrou du workflow personnalisé.
- Le réglage du dépôt n'est pas modifiable via les actions GitHub disponibles dans cette session. Un administrateur doit aller dans Settings → Pages → Build and deployment → Source et sélectionner **GitHub Actions**. Après modification, vérifier qu'un push de test ne déclenche plus le workflow dynamique de publication par branche et que seul le workflow contrôlé publie.
- Ne pas fusionner de PR ou pousser de changement sur `main` avant cette fermeture : la publication du site peut être déclenchée indépendamment du garde-fou applicatif.


## Protection de la branche main

- Lecture de `GET /repos/.../rulesets` : aucune ruleset de dépôt renvoyée (`[]`).
- Lecture de `branches/main/protection` : refusée par GitHub avec HTTP 403 « Resource not accessible by integration ». L'état de la protection classique de branche est donc **inconnu**, pas réputé désactivé.
- Les outils GitHub disponibles ne permettent pas de créer ou modifier les protections de branche. Après fermeture du contournement Pages, l'administrateur doit vérifier que `main` exige une PR, les checks `Malachite validation`, `Match isolated PostgreSQL runtime` et `Malachite release integration contract`, et interdit les pushes directs/force pushes.


## Recontrôle indépendant — 26 novembre 2026, 05:58 UTC

Les deux projets Supabase sont actifs en PostgreSQL 17.12. Contrôles en lecture seule uniquement.

### Security Advisors

Les deux environnements signalent 12 tables avec RLS activé sans policy (niveau INFO, donc refus par défaut), une fonction SECURITY DEFINER exécutable par `anon`, neuf exécutables par `authenticated`, et la protection Auth contre les mots de passe compromis désactivée.

La fonction publique relue directement en production reste `public.get_malachite_referrer_preview(uuid)` : `SECURITY DEFINER`, `search_path` vide, EXECUTE accordé à `anon` et `authenticated`; elle ne retourne que `prenom` et `username` pour un profil dont `profile_private=false`. Cette surface publique est limitée mais doit rester surveillée.

### Performance Advisors

- Production : 19 index signalés comme non utilisés. Aucun n'a été supprimé.
- Staging : 25 index signalés comme non utilisés et deux clés étrangères sans index couvrant : `messages.sender_id` et `conversation_pair_index.member_high`.
- La vérification des index confirme que `messages.sender_id` n'a pas d'index dédié dans la staging et que la clé primaire composite `(member_low, member_high)` ne couvre pas le préfixe `member_high`. La table `conversation_pair_index` et la FK `messages.sender_id` ne sont pas présentes en production au contrôle effectué.

Ne pas transposer automatiquement ces index staging vers la production : ils concernent un schéma de prévisualisation différent. Ajouter un index de production sans vérifier la présence de la colonne et l'ordre des migrations serait incorrect.

### Journaux Supabase — fenêtre des dernières 24 heures

- Staging : 228 événements agrégés ; deux avertissements Auth ; aucun événement avec niveau `error` dans l'agrégation retournée.
- Production : 13 585 événements agrégés ; un événement `error` dans `realtime_logs`, deux avertissements Storage et deux avertissements Auth.
- Les champs de détail du seul événement Realtime en erreur étaient vides dans la réponse du flux unifié. Sa cause n'est donc pas déterminable à partir de cette extraction ; ne pas le qualifier de panne applicative sans détail supplémentaire.

### GitHub Pages — contournement encore observé après PR #139

La PR #139 est maintenant fusionnée. Sur le commit `ec23afd50842634b2c84149071964f63ed02a5d6` (push main du 26 novembre à 05:52 UTC) :

- Le workflow contrôlé `MALACHITE production and isolated Match preview`, run `45764414260`, a échoué sur le garde `MALACHITE_DB_SECURITY_READY` absent. Les étapes de build, upload et publication de ce workflow ont été ignorées.
- Le workflow Pages dynamique `pages build and deployment`, run `45764413941`, s'est néanmoins terminé avec succès sur le même commit.
- La vérification du site public, run `45764414334`, a réussi.

Le workflow de publication personnalisé n'a donc pas publié cet artefact, mais le chemin Pages dynamique a encore abouti. La source Pages du dépôt doit être réglée manuellement sur **GitHub Actions** dans Settings → Pages → Build and deployment → Source, puis le résultat doit être vérifié par un nouveau push contrôlé. Le connecteur ne permet pas de lire ni modifier ce paramètre. Jusqu'à cette vérification, le verrou de publication n'est pas considéré comme fermé.

Aucune migration, modification de configuration Supabase, fusion ou publication n'a été effectuée par ce contrôle.
