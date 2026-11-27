# Malachite — tables RLS sans policies : revue des grants (27 novembre 2026)

## Résultat de l'inspection des privilèges effectifs

La présence d'une table avec RLS activé et zéro policy n'est pas automatiquement une fuite : sans policy, PostgreSQL refuse les lignes même si un rôle possède un grant SQL. Il faut toutefois examiner les privilèges directs.

- **Production :** la seule table du schéma `public` sans policy mais avec des grants API est `public.campagnes`; authenticated conserve SELECT/INSERT/UPDATE/DELETE. RLS bloque actuellement toutes les lignes, donc ce n'est pas un accès effectif, mais les grants sont inutiles et trop larges.
- **Staging :** aucune table `public` RLS-sans-policy ne conserve de privilège anon/authenticated.
- Les autres tables publiques sans policies (queues IA, audit, paramètres privés, referrals, etc.) ne donnent aucun privilège de table direct à anon/authenticated.
- Les tables `auth` et `private` sans policies ne donnent aucun privilège de table direct aux rôles API.
- Les tables internes `storage` ont des grants standards de service/Storage, mais RLS sans policy bloque les accès directs en ligne; ne pas ajouter de policies permissives ni modifier ces tables système sans vérifier le contrat Supabase Storage.

## Correctif candidat

`supabase/migrations/20261126230000_revoke_retired_campaign_table_access.sql` retire les grants de `public.campagnes` à `PUBLIC`, `anon` et `authenticated`. C'est cohérent avec la décision produit de retirer les campagnes sponsorisées du périmètre de lancement. Le test `supabase/tests/retired_campaign_acl_checks.sql` vérifie l'absence de grants résiduels; le job CI `retired-campaign-acl` est vert.

## Décision

Ne pas créer de policies sur les tables privées/IA/audit simplement pour faire disparaître les avis Advisor. Garder les tables sans policy inaccessibles aux clients. La migration de révocation des campagnes reste candidate à la séquence de production réconciliée; aucune modification production n'a été appliquée.
