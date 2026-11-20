# Malachite — audit GO / NO-GO immédiat

Date de contrôle : 20 novembre 2026  
Dépôt : `famousnadroj-sys/malachite`  
Branche publiée : `main`

## Verdict actuel : GO pour une phase de tests techniques limitée ; NO-GO pour un lancement commercial

Le frontend a été fusionné dans `main` et le déploiement GitHub Pages a réussi. Les contrôles automatiques du dépôt sont verts. Les tests sur appareils réels, les tests RLS/Storage avec deux comptes, la restauration et les intégrations marchandes/IA restent à effectuer avant tout lancement commercial.

## Vérifications positives

- Déploiement GitHub Pages réussi depuis `main` (commit `0a6cc8bc1b4277a30f2347ab8d820c0deb05c72d`) : https://github.com/famousnadroj-sys/malachite/actions/runs/44812589031. URL générée par GitHub Pages : https://famousnadroj-sys.github.io/malachite/.
- Validation CI du commit fusionné réussie : https://github.com/famousnadroj-sys/malachite/actions/runs/44812589089.
- La PR #29 a été fusionnée dans `main` après validation CI : https://github.com/famousnadroj-sys/malachite/pull/29.
- Après publication du nouveau frontend, la politique stricte de justificatif `20261120170000` a été appliquée en production. Le script `payment_receipts_security_checks.sql` a été exécuté sans exception.
- La migration `restrict_private_payment_rpc` a révoqué l'exécution des deux surcharges privées de `traiter_paiement` pour `PUBLIC` et `anon`, en conservant `authenticated` ; les vérifications SQL confirment `anon=false`, `authenticated=true`.
- Le test de durcissement SQL ajouté vérifie RLS sur toutes les tables publiques, l'absence de privilèges de table `anon`, les droits des RPC de paiement et les garde-fous de `start_call_session` ; il a été exécuté avec succès en production.

- GitHub Actions : validation du commit `b6e51cf54a7846da0d8538fe3859ee40996e9d2c` terminée avec succès ([run 44806673988](https://github.com/famousnadroj-sys/malachite/actions/runs/44806673988)).
- Les migrations RPC, stockage privé additif et optimisation support ont été appliquées en production et vérifiées. La politique stricte des reçus (`20261120170000`) n'est volontairement pas appliquée tant que le nouveau frontend n'est pas déployé et testé. Le script SQL de contrôle a été validé lors d'un essai transactionnel antérieur avec rollback, mais les tests multi-comptes réels restent à faire.
- Le déploiement des reçus est scindé en deux étapes pour ne pas casser l'ancien formulaire : migration additive `20261120140000` d'abord, puis déploiement du nouveau frontend, puis politique stricte `20261120170000`.
- Le projet conserve son application existante ; les changements sont isolés dans une branche et une pull request.
- Le contrôle statique a détecté puis permis de corriger un ancien bouton d'appel encore désactivé après un match.
- Le PWA avertit maintenant les sessions déjà ouvertes lorsqu'une nouvelle version prend le contrôle, avec une action explicite d'actualisation.
- Le formulaire de paiement secondaire dans `calls.js` affichait encore 3 USD et contournait le justificatif ; il utilise maintenant le tarif de 2 USD, le téléversement privé commun et l'affichage correct de l'opérateur.
- Les migrations de justificatifs privés et de restriction RPC sont présentes dans GitHub.
- La migration de reçus exige désormais que le chemin corresponde à un objet réellement présent dans le bucket privé, dans le dossier de l'utilisateur connecté. Le contrôle reste à tester avec deux comptes authentifiés réels.
- La fonction de modération administrateur est active dans Supabase et exige une session authentifiée.

## Bloqueurs confirmés dans Supabase actif

1. **Parcours justificatif désormais strict** : le frontend compatible est publié ; la politique `20261120170000` est appliquée en production. Toute nouvelle demande authentifiée doit inclure un reçu réellement téléversé dans le bucket privé et placé dans le dossier du compte connecté. Les 7 demandes historiques sont conservées ; aucune n'avait de `receipt_path` au moment du contrôle. Les tests multi-comptes réels restent à effectuer.
2. **AI Manager non opérationnel** : seules les fonctions Edge `admin-user-moderation` et `username-login` sont déployées. Aucune fonction AI Manager n'est présente. Le panneau visible est une maquette, pas un agent permanent.
3. **Paiements opérateurs non automatisés** : aucun webhook Airtel Money ou Orange Money n'est configuré dans le périmètre vérifié. Une capture ou une référence saisie ne prouve pas le paiement.
4. **Alerte SECURITY DEFINER à examiner, non supprimée artificiellement** : `public.start_call_session` doit vérifier des droits sur plusieurs utilisateurs (correspondance mutuelle, droits d'appel et appels déjà actifs). En `SECURITY INVOKER`, les politiques RLS et les privilèges actuels empêchent certaines lectures nécessaires (notamment `profiles` et les correspondances de l'autre utilisateur). La fonction existante est limitée à `authenticated`, vérifie `auth.uid()`, utilise `search_path` vide et des noms de tables qualifiés. L'alerte Supabase reste visible et exige une revue ciblée ; ne pas basculer en invoker sans refonte des contrôles.
5. **Privilèges RPC paiement durcis en production** : `anon` ne peut exécuter aucune surcharge publique ni privée de `traiter_paiement`. Les deux fonctions privées restent exécutables par `authenticated`, mais vérifient elles-mêmes `private.is_admin()`. Les 7 paiements historiques sont conservés.
6. **Protection des mots de passe compromis désactivée** dans Supabase Auth.
7. **Optimisations de support appliquées** : les deux index FK de `demandes_support` et les deux politiques RLS utilisant `(select auth.uid())` / `(select private.is_admin())` ont été appliqués et vérifiés. Relancer les advisors après le déploiement complet pour confirmer la disparition de ces alertes.
8. **Table d'administration privée** : `private.admins` a RLS activé sans politique. Cela ferme l'accès direct par défaut ; la fonction `private.is_admin()` doit rester le seul chemin contrôlé utilisé par les vérifications.

## Actions à terminer avant publication

- [x] Révoquer le droit `EXECUTE` de `anon` sur les deux surcharges `public.traiter_paiement`, inscrire la migration et vérifier les droits effectifs en production.
- [x] Appliquer la migration additive des reçus en production : colonne nullable, bucket privé, règles Storage et index anti-doublon ; vérifier la présence de chaque élément.
- [x] Déployer le frontend compatible sur GitHub Pages et appliquer ensuite `20261120170000` (politique d'insertion stricte).
- [ ] Tester avec deux comptes distincts les politiques RLS, l'upload privé, la lecture par propriétaire/admin, la suppression, l'existence obligatoire du reçu, la non-réutilisation d'une référence et l'expiration des URL signées.
- [ ] Revoir `start_call_session` avec tests de deux comptes et conserver le contrôle `SECURITY DEFINER` actuel tant qu'une alternative sûre ne permet pas les vérifications inter-utilisateurs.
- [ ] Activer la protection contre les mots de passe compromis dans la configuration Auth.
- [x] Appliquer et vérifier les deux index FK ainsi que les deux optimisations RLS de support en production.
- [ ] Connecter le fournisseur IA côté serveur avec secret, authentification admin, liste d'outils autorisés, quotas, journal d'audit et approbation humaine des actions sensibles.
- [ ] Obtenir les accès marchands officiels et tester les webhooks signés ; à défaut, conserver une validation manuelle explicitement présentée comme telle.
- [ ] Effectuer les tests réels Android, réseau lent, inscription, connexion, profils, avatars, messagerie, signalements, blocages, appels, paiement, support et restauration.
- [ ] Vérifier les pages légales, les coordonnées d'assistance, le domaine, le certificat TLS, la sauvegarde et le retour arrière.

## Vérifications de production supplémentaires

- GitHub Pages a confirmé `Reported success!` pour le déploiement `0a6cc8bc1b4277a30f2347ab8d820c0deb05c72d` ; URL retournée : `https://famousnadroj-sys.github.io/malachite/`.
- Migration `enforce_payment_receipt_policy` appliquée après déploiement ; le contrôle SQL de reçu a terminé sans exception.
- Migration `restrict_private_payment_rpc` appliquée ; aucune exécution anonyme des deux signatures privées n'est possible ; les deux restent disponibles à `authenticated` avec contrôle interne administrateur.
- Contrôles SQL : aucune table publique sans RLS, aucun privilège de table `anon`, `start_call_session` est réservée à `authenticated` avec `search_path` vide.

- Migration `restrict_payment_review_rpc` enregistrée dans Supabase sous `20261120195441` : `anon` refusé sur les deux surcharges ; `authenticated` autorisé.
- Migration `private_payment_receipts_additive` appliquée : `receipt_path` présent, bucket privé confirmé, limite 5 242 880 octets, trois types MIME autorisés, index unique présent.
- Migration `support_rls_performance` appliquée : les deux index support présents.
- Les 7 paiements existants sont toujours présents après les migrations.
- Le frontend est fusionné et déployé pour les testeurs. La politique stricte des reçus est active.

## Politique de décision

La phase de tests techniques limitée est autorisée. Ne pas annoncer le lancement commercial ni activer les paiements automatiques ou l'AI Manager avant les tests Android, multi-comptes, restauration, exigences légales, sécurité Auth et accès marchand. Une CI verte et un déploiement réussi ne remplacent pas ces tests réels.
