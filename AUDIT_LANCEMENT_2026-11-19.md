# Malachite — état des corrections techniques
Date : 19 novembre 2026

## Périmètre
- Dépôt : `famousnadroj-sys/malachite`
- Branche de travail : `work/malachite-hardening-2026-11-19`
- Projet Supabase : `tscsmemsvgacqioncash`
- La branche `main` et le site public n'ont pas été modifiés par ce travail.
- Les changements de base décrits ci-dessous ont été appliqués au projet Supabase actif. Aucune donnée de membre n'a été supprimée.

## Corrections appliquées
1. **Médias privés**
   - Création du bucket privé `profile-photos`, limité à 5 Mo et aux formats JPEG, PNG, WebP et GIF.
   - Politiques Storage : un membre écrit, modifie et supprime uniquement ses propres photos ; les autres membres authentifiés ne peuvent les lire que si le blocage ne l'interdit pas.
   - Le bucket `chat-media` reste privé. Les tests SQL en transaction ont confirmé que l'expéditeur et le destinataire voient l'objet de leur conversation, mais pas un troisième compte.
   - Le frontend de la branche utilise `chat-media` pour les photos et vocaux, et `profile-photos` pour les photos de profil. Les médias privés sont rendus avec des URL signées.

2. **Limitation des messages et confidentialité**
   - Le trigger ne recherche plus de numéros de téléphone, liens ou réseaux sociaux dans le texte des messages.
   - Les membres gratuits peuvent initier jusqu'à 15 nouvelles conversations par jour. Les réponses dans une conversation existante ne consomment pas ce quota.
   - Le trigger vérifie l'identité de l'expéditeur, la suspension et le blocage.
   - Un test SQL transactionnel a confirmé qu'un message de test contenant un numéro est accepté ; la transaction a ensuite été annulée.

3. **Modération Admin**
   - La fonction SQL privée vérifie l'identifiant de l'administrateur dans `private.admins`, refuse l'auto-suspension et refuse de suspendre un autre administrateur.
   - Les suspensions et réactivations sont enregistrées dans `public.suspensions` et `public.admin_actions`.
   - L'Edge Function `admin-user-moderation` est déployée en version 2. Elle vérifie la session, appelle la fonction SQL autorisée, puis synchronise le bannissement Auth avec la clé de service côté serveur.
   - Tests SQL transactionnels : l'action d'un administrateur a réussi puis a été annulée ; un compte non administrateur a été refusé.

4. **Frontend**
   - Requêtes de profils limitées aux colonnes publiques.
   - Préférences enregistrées dans `prives`.
   - Corrections de chargement, d'upload et de lecture des photos et vocaux.
   - Références de paiement soumises en attente ; le frontend précise qu'aucun avantage n'est activé avant vérification effective du portefeuille.
   - Suppression de la vente d'un « badge vérifié » : un paiement seul ne prouve pas l'identité.
   - Ajout d'une mascotte originale animée et d'une mise en page desktop.
   - Ajout du manifeste PWA et d'un service worker qui n'enregistre pas les requêtes Auth, REST, Storage ou Edge Functions.

## Migrations appliquées
- `202611180001_security_hardening`
- `202611180002_moderation_and_blocking`
- `202611180003_admin_audit_private_media`
- `202611190001_launch_hardening`
- `202611190002_fix_message_trigger_pattern`

## Points qui bloquent encore la déclaration « prêt pour lancement »
1. **Le bucket historique `photos` est encore public.** Une migration corrective est préparée dans `202611190003_private_legacy_media.sql`, mais elle ne doit être appliquée qu'après que le nouveau frontend soit publié. Elle rendra les anciens médias accessibles uniquement aux participants des messages correspondants. Aucun fichier historique ne sera supprimé.
2. **Protection Supabase contre les mots de passe compromis désactivée.** L'advisor Supabase la signale encore. Le réglage doit être activé dans Auth si le plan et les paramètres du projet le permettent ; aucun abonnement payant n'a été souscrit.
3. **Le code de la branche n'est pas encore sur `main` et n'est donc pas encore le site public.** Une PR et les validations CI doivent être terminées avant la bascule.
4. **Pas de test E2E complet dans un navigateur avec deux comptes de test.** Les tests SQL transactionnels et l'analyse statique ne remplacent pas ces essais.
5. **Les paiements Airtel Money restent vérifiés manuellement.** Aucune API opérateur ou automatisation de paiement n'est configurée.
6. Les traductions Swahili/Lingala/Kikongo/Tshiluba, les textes juridiques définitifs, les réglages avancés de notifications et l'Avatar Studio ne sont pas validés comme fonctionnalités de lancement. La mascotte animée est ajoutée ; elle ne constitue pas l'Avatar Studio.

## État des advisors après les corrections
- Santé Supabase : aucun finding retourné.
- Sécurité : restent le finding informatif RLS activé sans politique sur `private.admins` (schéma non exposé, accès par fonctions privées) et l'avertissement de protection des mots de passe compromis désactivée.
- Le bucket `photos` public demeure un risque jusqu'à l'application de la migration de bascule après publication du frontend.

## Règle de publication
Ne pas annoncer Malachite comme entièrement sécurisé ou prêt à la production tant que le nouveau frontend n'est pas publié, que le bucket historique n'est pas privé, que les validations CI ne sont pas vertes et que les parcours E2E ne sont pas passés.
