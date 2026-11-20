# Malachite — audit GO / NO-GO immédiat

Date de contrôle : 20 novembre 2026  
Dépôt : `famousnadroj-sys/malachite`  
Branche contrôlée : `work/ai-manager-payment-ux-2026-11-20`

## Verdict actuel : NO-GO pour une mise en production immédiate

Le dépôt a une validation CI verte, mais plusieurs dépendances de production ne sont pas encore prouvées. Mettre en ligne cette branche sans les traiter exposerait les utilisateurs à des paiements bloqués ou à des fonctions annoncées mais non opérationnelles.

## Vérifications positives

- GitHub Actions : dernier workflow de validation terminé avec succès.
- Le projet conserve son application existante ; les changements sont isolés dans une branche et une pull request.
- Les migrations de justificatifs privés et de restriction RPC sont présentes dans GitHub.
- Les deux migrations de paiement ont passé un contrôle SQL transactionnel qui a été annulé ensuite ; cela ne constitue pas un déploiement ni un test fonctionnel complet.
- La fonction de modération administrateur est active dans Supabase et exige une session authentifiée.

## Bloqueurs confirmés dans Supabase actif

1. **Schéma de paiement non aligné avec la branche** : la table `public.paiements` ne contient pas `receipt_path`. Le formulaire de la branche tente pourtant d'insérer cette colonne. Tant que la migration correspondante n'est pas appliquée et testée, le nouveau formulaire ne peut pas être considéré prêt en production.
2. **AI Manager non opérationnel** : seules les fonctions Edge `admin-user-moderation` et `username-login` sont déployées. Aucune fonction AI Manager n'est présente. Le panneau visible est une maquette, pas un agent permanent.
3. **Paiements opérateurs non automatisés** : aucun webhook Airtel Money ou Orange Money n'est configuré dans le périmètre vérifié. Une capture ou une référence saisie ne prouve pas le paiement.
4. **Alerte SECURITY DEFINER à examiner, non supprimée artificiellement** : `public.start_call_session` doit vérifier des droits sur plusieurs utilisateurs (correspondance mutuelle, droits d'appel et appels déjà actifs). En `SECURITY INVOKER`, les politiques RLS et les privilèges actuels empêchent certaines lectures nécessaires (notamment `profiles` et les correspondances de l'autre utilisateur). La fonction existante est limitée à `authenticated`, vérifie `auth.uid()`, utilise `search_path` vide et des noms de tables qualifiés. L'alerte Supabase reste visible et exige une revue ciblée ; ne pas basculer en invoker sans refonte des contrôles.
5. **Protection des mots de passe compromis désactivée** dans Supabase Auth.
6. **Optimisations de performance restantes** : deux clés étrangères de `demandes_support` ne sont pas indexées et deux politiques réévaluent les fonctions Auth par ligne.

## Actions à terminer avant publication

- [ ] Aligner et tester le schéma de reçus sur un environnement non-production avant toute application en production.
- [ ] Tester avec deux comptes distincts les politiques RLS, l'upload privé, la lecture par propriétaire/admin, la suppression et l'expiration des URL signées.
- [ ] Revoir `start_call_session` avec tests de deux comptes et conserver le contrôle `SECURITY DEFINER` actuel tant qu'une alternative sûre ne permet pas les vérifications inter-utilisateurs.
- [ ] Activer la protection contre les mots de passe compromis dans la configuration Auth.
- [x] Préparer les deux index FK et optimiser les deux politiques RLS de support ; application et relance des advisors en production restent à faire.
- [ ] Connecter le fournisseur IA côté serveur avec secret, authentification admin, liste d'outils autorisés, quotas, journal d'audit et approbation humaine des actions sensibles.
- [ ] Obtenir les accès marchands officiels et tester les webhooks signés ; à défaut, conserver une validation manuelle explicitement présentée comme telle.
- [ ] Effectuer les tests réels Android, réseau lent, inscription, connexion, profils, avatars, messagerie, signalements, blocages, appels, paiement, support et restauration.
- [ ] Vérifier les pages légales, les coordonnées d'assistance, le domaine, le certificat TLS, la sauvegarde et le retour arrière.

## Politique de décision

Ne pas fusionner ni publier tant qu'un bloqueur de sécurité, de paiement ou de parcours principal reste non testé. Une CI verte valide les contrôles automatisés du dépôt ; elle ne prouve pas le bon fonctionnement de l'application en production.
