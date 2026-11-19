# Malachite — bilan des corrections techniques
Date : 19 novembre 2026

## Références vérifiées
- Dépôt : `famousnadroj-sys/malachite`
- Branche de production : `main`
- Commit de mise à jour : `23e02bbbda236b828596649f7bf12a8322bccc53`
- Projet Supabase : `tscsmemsvgacqioncash`, région `eu-west-1`
- PR de sécurisation : #1, fusionnée après validation CI.

## Corrections appliquées

### Médias et stockage
- Les trois buckets utilisés (`chat-media`, `profile-photos`, ancien `photos`) sont maintenant privés.
- `profile-photos` : limite 5 Mo, formats JPEG/PNG/WebP/GIF ; écriture et suppression réservées au propriétaire ; lecture authentifiée et filtrée selon le blocage.
- `chat-media` : limite 8 Mo, images et formats audio autorisés ; accès contrôlé par expéditeur/destinataire.
- Le frontend utilise les URL signées pour les photos et médias privés.
- Les 9 anciens objets de `photos` ont été conservés, pas supprimés. Les contrôles SQL ont trouvé 0 référence dans les messages et 0 référence dans les profils avant la privatisation. Les objets historiques orphelins ne sont plus publiquement accessibles.

### Messages et confidentialité
- Le trigger ne scanne plus le texte privé pour bloquer les numéros ou liens.
- Les comptes gratuits peuvent initier 15 nouvelles conversations par jour ; les réponses et conversations déjà existantes ne consomment pas ce quota.
- Le trigger vérifie l'expéditeur authentifié, l'état de suspension et le blocage.
- Test transactionnel : un message de test contenant un numéro a été accepté puis annulé par rollback.

### Modération Admin
- La décision d'administration dépend de `private.admins`, pas d'une adresse e-mail codée en dur.
- Auto-suspension et suspension d'un autre administrateur refusées.
- Les suspensions/réactivations sont enregistrées dans `public.suspensions` et `public.admin_actions`.
- Edge Function `admin-user-moderation` active en version 2 ; elle vérifie la session, appelle le RPC autorisé, puis synchronise Auth côté serveur.
- Tests transactionnels : appel administrateur accepté puis annulé ; appel non-administrateur refusé. Aucun compte réel n'a été suspendu.

### Frontend et CI
- Requête des profils limitée aux colonnes publiques et préférences dans `prives`.
- Upload et lecture des photos/vocaux corrigés ; échec d'insertion nettoie le fichier nouvellement uploadé.
- Suppression d'une photo : la référence en base est mise à jour avant la suppression du fichier pour éviter les références cassées.
- Quota affiché aligné sur les 15 nouvelles conversations initiées ; le contenu des messages n'est pas inspecté.
- Références de paiement restent en attente jusqu'à vérification réelle du portefeuille ; aucun badge d'identité n'est vendu.
- Mascotte originale animée, mise en page desktop, manifeste PWA et service worker. Le service worker ne met pas en cache les requêtes Auth, REST, Storage ou Edge Functions.
- CI GitHub réussie : run #95 (PR) et run #94 (push), JavaScript, TypeScript Deno et parsing de toutes les migrations SQL.

## Migrations enregistrées dans Supabase
- `202611180001_security_hardening`
- `202611180002_moderation_and_blocking`
- `202611180003_admin_audit_private_media`
- `202611190001_launch_hardening`
- `202611190002_fix_message_trigger_pattern`
- `202611190004_legacy_media_signed_reads`
- `202611190003_private_legacy_media`

## État des contrôles Supabase
- Buckets `chat-media`, `profile-photos` et `photos` : tous `public=false`.
- Conseils de santé : aucun finding.
- Sécurité : un finding informatif sur `private.admins` (RLS activé sans politique dans un schéma privé non exposé ; accès réservé aux fonctions privées) et un avertissement sur la protection des mots de passe compromis désactivée.
- Cette protection Auth reste désactivée. Aucun changement de forfait ni dépense n'a été engagé.

## Ce qui n'est pas certifié terminé
1. **Publication GitHub Pages** : le code a été fusionné dans `main`, mais l'URL publique n'a pas pu être vérifiée par l'outil de contrôle. Le déploiement et le rendu sur téléphone doivent encore être confirmés.
2. **Tests E2E** : pas de parcours complet navigateur avec deux comptes sur appareil réel. Les tests SQL et CI ne remplacent pas ces tests.
3. **Protection contre mots de passe compromis** : à activer dans les paramètres Auth si disponible sans upgrade ; sinon décision de plan à prendre avant lancement.
4. **Paiements** : Airtel Money reste une vérification manuelle ; aucune API opérateur n'est connectée.
5. **Fonctionnalités non livrées** : Avatar Studio, traductions complètes en Swahili/Lingala/Kikongo/Tshiluba, réglages avancés de notifications et validation juridique finale.

## Conclusion
Le code et la base ont été renforcés, les trois buckets sont privés et les contrôles statiques/SQL exécutés sont passés. Cela ne constitue pas une certification de sécurité ni une preuve de lancement opérationnel. La validation du site public, les tests E2E et le réglage Auth restant sont les dernières étapes avant de déclarer le lancement prêt.
