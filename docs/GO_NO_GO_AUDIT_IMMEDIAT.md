# Malachite — audit GO / NO-GO immédiat

Date de contrôle : 20 novembre 2026  
Dépôt : `famousnadroj-sys/malachite`  
Branche contrôlée : `work/ai-manager-payment-ux-2026-11-20`

## Verdict actuel : NO-GO pour une mise en production immédiate

Le dépôt a une validation CI verte, mais plusieurs dépendances de production ne sont pas encore prouvées. Mettre en ligne cette branche sans les traiter exposerait les utilisateurs à des paiements bloqués ou à des fonctions annoncées mais non opérationnelles.

## Vérifications positives

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

1. **Parcours reçu en phase de bascule** : la colonne `public.paiements.receipt_path`, le bucket privé `payment-receipts` (5 Mo, JPEG/PNG/WebP), les règles Storage propriétaire/admin et l'index unique opérateur/référence sont maintenant présents en production. La colonne reste nullable et l'ancienne politique INSERT reste active pour préserver la compatibilité avec l'ancien frontend. Le nouveau frontend peut être déployé uniquement après validation du parcours ; ensuite appliquer la politique stricte `20261120170000` et exécuter les tests multi-comptes.
2. **AI Manager non opérationnel** : seules les fonctions Edge `admin-user-moderation` et `username-login` sont déployées. Aucune fonction AI Manager n'est présente. Le panneau visible est une maquette, pas un agent permanent.
3. **Paiements opérateurs non automatisés** : aucun webhook Airtel Money ou Orange Money n'est configuré dans le périmètre vérifié. Une capture ou une référence saisie ne prouve pas le paiement.
4. **Alerte SECURITY DEFINER à examiner, non supprimée artificiellement** : `public.start_call_session` doit vérifier des droits sur plusieurs utilisateurs (correspondance mutuelle, droits d'appel et appels déjà actifs). En `SECURITY INVOKER`, les politiques RLS et les privilèges actuels empêchent certaines lectures nécessaires (notamment `profiles` et les correspondances de l'autre utilisateur). La fonction existante est limitée à `authenticated`, vérifie `auth.uid()`, utilise `search_path` vide et des noms de tables qualifiés. L'alerte Supabase reste visible et exige une revue ciblée ; ne pas basculer en invoker sans refonte des contrôles.
5. **Privilèges RPC paiement corrigés en production** : après autorisation explicite du propriétaire, la migration `restrict_payment_review_rpc` a été appliquée et inscrite dans l'historique Supabase (`20261120195441`). Vérification SQL après application : `anon` ne peut exécuter aucune des deux surcharges publiques ; `authenticated` conserve EXECUTE sur les deux. Les 7 paiements existants sont toujours présents. Cette opération n'a modifié ni les lignes de paiement, ni le schéma, ni le frontend.
6. **Protection des mots de passe compromis désactivée** dans Supabase Auth.
7. **Optimisations de support appliquées** : les deux index FK de `demandes_support` et les deux politiques RLS utilisant `(select auth.uid())` / `(select private.is_admin())` ont été appliqués et vérifiés. Relancer les advisors après le déploiement complet pour confirmer la disparition de ces alertes.
8. **Table d'administration privée** : `private.admins` a RLS activé sans politique. Cela ferme l'accès direct par défaut ; la fonction `private.is_admin()` doit rester le seul chemin contrôlé utilisé par les vérifications.

## Actions à terminer avant publication

- [x] Révoquer le droit `EXECUTE` de `anon` sur les deux surcharges `public.traiter_paiement`, inscrire la migration et vérifier les droits effectifs en production.
- [x] Appliquer la migration additive des reçus en production : colonne nullable, bucket privé, règles Storage et index anti-doublon ; vérifier la présence de chaque élément.
- [ ] Déployer le frontend compatible, vérifier l'actualisation des clients PWA, puis seulement appliquer `20261120170000` (politique d'insertion stricte).
- [ ] Tester avec deux comptes distincts les politiques RLS, l'upload privé, la lecture par propriétaire/admin, la suppression, l'existence obligatoire du reçu, la non-réutilisation d'une référence et l'expiration des URL signées.
- [ ] Revoir `start_call_session` avec tests de deux comptes et conserver le contrôle `SECURITY DEFINER` actuel tant qu'une alternative sûre ne permet pas les vérifications inter-utilisateurs.
- [ ] Activer la protection contre les mots de passe compromis dans la configuration Auth.
- [x] Appliquer et vérifier les deux index FK ainsi que les deux optimisations RLS de support en production.
- [ ] Connecter le fournisseur IA côté serveur avec secret, authentification admin, liste d'outils autorisés, quotas, journal d'audit et approbation humaine des actions sensibles.
- [ ] Obtenir les accès marchands officiels et tester les webhooks signés ; à défaut, conserver une validation manuelle explicitement présentée comme telle.
- [ ] Effectuer les tests réels Android, réseau lent, inscription, connexion, profils, avatars, messagerie, signalements, blocages, appels, paiement, support et restauration.
- [ ] Vérifier les pages légales, les coordonnées d'assistance, le domaine, le certificat TLS, la sauvegarde et le retour arrière.

## Vérifications de production supplémentaires

- Migration `restrict_payment_review_rpc` enregistrée dans Supabase sous `20261120195441` : `anon` refusé sur les deux surcharges ; `authenticated` autorisé.
- Migration `private_payment_receipts_additive` appliquée : `receipt_path` présent, bucket privé confirmé, limite 5 242 880 octets, trois types MIME autorisés, index unique présent.
- Migration `support_rls_performance` appliquée : les deux index support présents.
- Les 7 paiements existants sont toujours présents après les migrations.
- Aucun déploiement du frontend, aucune fusion de PR et aucune politique stricte de reçus n'ont encore été effectués.

## Politique de décision

Ne pas fusionner ni publier tant qu'un bloqueur de sécurité, de paiement ou de parcours principal reste non testé. Une CI verte valide les contrôles automatisés du dépôt ; elle ne prouve pas le bon fonctionnement de l'application en production.
