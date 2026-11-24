# Audit sécurité et préparation au lancement — 24 novembre 2026

## État vérifié

- PR GitHub : #113 — ouverte, non fusionnée.
- Branche : `security/private-profile-access-v3`.
- Commit audité : à re-vérifier sur le HEAD courant de la PR avant fusion.
- CI sur ce commit : tous les jobs de validation réussis, y compris le runtime PostgreSQL isolé.
- Aucune fusion, aucun déploiement et aucune modification SQL du projet Supabase connecté n'ont été effectués.

## Corrections présentes dans la PR

### Appels — verrou serveur et navigateur

- `SECURE_JITSI_PROVIDER_READY` reste à `false` côté client.
- L'interface ne crée plus de session, ne présente plus les appels entrants et refuse l'accès à une salle tant que le fournisseur sécurisé n'est pas configuré.
- La migration `20261124170000_harden_call_and_referrer_access.sql` crée `private.call_provider_config` avec `enabled=false` par défaut.
- `public.start_call_session` refuse toute création tant que ce drapeau est désactivé.
- `public.call_provider_is_enabled()` expose uniquement l'état booléen aux utilisateurs authentifiés.
- Les politiques RLS empêchent l'acceptation d'un appel quand le fournisseur est désactivé.
- La migration `20261124241000_restrict_direct_call_session_writes.sql` révoque INSERT/DELETE directs sur `call_sessions` et supprime l'ancienne politique d'insertion. La création doit passer par le RPC contrôlé.
- Les tests couvrent le refus par défaut, l'absence de ligne créée, l'impossibilité d'accepter sans fournisseur, les suspensions, les blocages et les sessions/rendez-vous.

**Important :** JaaS n'est pas encore configuré. Le code contient toujours l'ancien domaine public `meet.jit.si`, mais le chemin applicatif est verrouillé et le RPC serveur refuse les nouvelles sessions tant que le drapeau reste désactivé. Ne jamais activer le drapeau avant d'avoir déployé et testé l'émetteur JWT JaaS.

### Inscription — âge minimum vérifié côté serveur

- Le formulaire d'inscription vérifie déjà 18 à 100 ans côté navigateur, mais ce contrôle client ne suffit pas.
- L'audit de la fonction RPC `public.save_my_profile` a confirmé qu'elle acceptait auparavant une absence d'âge dans le champ privé `profile_age` ; la contrainte SQL `age >= 18` accepte également `NULL`.
- La migration `20261124250000_enforce_profile_age_server_side.sql` exige désormais un âge entier de 18 à 100 ans dans le stockage privé du propriétaire, impose la cohérence avec l'âge public quand le profil est public et conserve l'âge hors de la ligne publique pour les profils privés.
- Le test PostgreSQL isolé couvre âge absent, âge inférieur à 18, âge public absent, âge incohérent, âge valide de 18 ans et profil privé avec âge de 100 ans.
- CI vérifiée sur le commit `a084a8590552b658a985a211e0ab72010b4f2ea7` : validation statique, tests SQL d'accès privé, tests d'âge, tests d'appels, de reçus, de suppressions FK et runtime Match réussis.

### Publicités et campagnes

- Le chargement public des campagnes a été retiré de l'interface.
- Les références aux scripts publicitaires absents ont été retirées du cache PWA.
- La version du cache est passée à `malachite-static-v107`.
- La migration `20261124240000_revoke_retired_campaign_table_access.sql` révoque les privilèges directs sur `public.campagnes`.
- La validation statique interdit le retour des anciens points d'entrée publicitaires.

Cela respecte le périmètre de lancement retenu : Premium, Boost et appels payants uniquement ; pas de publicité ni de sponsoring.

## Audit du projet Supabase connecté — lecture seule

Le projet connecté n'est pas explicitement identifié comme production ou staging. Il a donc été traité comme protégé : aucune migration, aucun changement Auth, aucun secret et aucune écriture n'ont été appliqués.

Constats vérifiés :

- Les migrations de cette PR ne sont pas encore installées dans ce projet : `private.call_provider_config` et `public.call_provider_is_enabled()` n'y existent pas encore.
- Les sessions d'appel existantes observées : 10 terminées et 2 en attente, mais les 2 en attente sont déjà expirées ; aucune session non expirée n'a été observée.
- L'advisor signale 12 tables RLS sans policy. Les vérifications de privilèges ont montré que 11 n'accordent aucun accès direct à `anon` ou `authenticated`. `public.campagnes` avait encore des privilèges directs pour `authenticated` ; la migration de la PR les révoque.
- `public.get_malachite_referrer_preview(uuid)` est volontairement exécutable par `anon` pour les liens de parrainage publics. La PR limite le résultat aux profils publics non suspendus et filtre également les blocages pour les utilisateurs authentifiés ; des tests couvrent les deux cas.
- Les wrappers SECURITY DEFINER de quotas, likes et compatibilité appellent les fonctions privées qui exigent une session authentifiée et filtrent les comptes suspendus/blocages. Les fonctions d'administration et de finance vérifient le rôle administrateur.
- La protection Supabase contre les mots de passe compromis est désactivée. Ce réglage Auth reste à activer manuellement dans le tableau de bord avant le lancement.

Références de remédiation :
- RLS sans policy : https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- SECURITY DEFINER exécutable par anon : https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- Protection des mots de passe compromis : https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

### Suppression de compte — fonction utilisateur manquante

- Aucun parcours « supprimer mon compte » n'a été trouvé dans `app-core.js` et aucun Edge Function de suppression n'est présent dans `supabase/functions`.
- L'audit en lecture seule des clés étrangères du projet Supabase montre que plusieurs données relationnelles se suppriment en cascade depuis `auth.users` (profil, données privées, blocages, sessions d'appel, statuts, notifications, reçus et références Match).
- Les objets Storage (photos et médias) ne sont pas supprimés par ces clés étrangères. Une suppression du compte sans nettoyage Storage laisserait des fichiers orphelins.
- Une suppression sûre nécessite une Edge Function authentifiée, une confirmation/réauthentification, un nettoyage ciblé des fichiers appartenant au compte, une suppression Admin Auth et des tests de non-suppression des données d'autres membres.
- Cette fonction n'a pas été créée ni déployée ; c'est un bloqueur de lancement.

## Bloqueurs et validations encore nécessaires

1. Créer/configurer un compte JaaS et une API key ; garder la clé privée uniquement dans les secrets Supabase.
2. Implémenter puis tester l'Edge Function qui vérifie l'identité, la participation à une session acceptée, l'état de la session, les suspensions et les blocages avant de signer un JWT RS256 à durée courte et limité à une salle exacte.
3. Utiliser le domaine JaaS `8x8.vc`, jamais `meet.jit.si`, pour les appels sécurisés.
4. Activer la protection des mots de passe compromis dans Supabase Auth.
5. Identifier formellement l'environnement du projet Supabase connecté avant toute application de migration.
6. Construire et tester le parcours de suppression de compte et le nettoyage des fichiers Storage appartenant au membre.\n7. Vérifier la stratégie de sauvegarde et effectuer un véritable test de restauration. Aucun flux applicatif complet de sauvegarde/restauration n'a été validé pendant cet audit.
8. Effectuer les essais réels avec deux comptes et deux appareils/navigateurs.
9. Préparer les paiements uniquement après accord explicite et après la SIM Airtel Money dédiée ; aucune intégration Airtel Developer ou Visa n'a été activée.

## Règle de sécurité

Ne pas fusionner la PR, ne pas déployer et ne pas activer les appels/paiements tant que les bloqueurs ci-dessus ne sont pas traités et que l'utilisateur n'a pas donné son accord explicite.
