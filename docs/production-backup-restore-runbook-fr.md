# MALACHITE — procédure de sauvegarde et de restauration

**État au 23 novembre 2026 : sauvegarde restaurable non encore réalisée.**  
Ce document prépare une procédure sans modifier la production. Il ne constitue pas une preuve qu'une sauvegarde existe.

## 1. État vérifié du projet

- Projet Supabase de production : plan **Free**.
- Le plan Free ne fournit pas de sauvegardes quotidiennes automatiques.
- Projet PostgreSQL : version 17.
- Inventaire lu en production : 8 comptes Auth, 6 buckets Storage et 66 objets Storage.
- Buckets privés et objets : `chat-media` (31), `payment-receipts` (2), `photos` (9), `profile-photos` (24).
- Buckets publics actuellement vides : `malachite-campaign-media`, `malachite-campaigns`.

Références officielles :
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/reference/cli/supabase-db-dump

## 2. Règles impératives

1. Ne jamais exécuter une restauration sur le projet de production pendant un test.
2. Ne jamais stocker les mots de passe de base, jetons Supabase, clés API, reçus ou médias privés dans GitHub.
3. Conserver les fichiers de sauvegarde hors du dépôt, dans un emplacement chiffré et contrôlé.
4. Une exportation SQL seule n'est **pas** une sauvegarde complète de MALACHITE.
5. Ne pas activer de plan payant, PITR, service externe ou stockage facturé dans le cadre de cette procédure sans autorisation explicite.
6. Toute restauration de production exige une validation humaine, une fenêtre de maintenance et une sauvegarde récente vérifiée.

## 3. Export logique PostgreSQL — préparation

À effectuer depuis un ordinateur de confiance avec Supabase CLI installé, après authentification avec un compte autorisé et liaison explicite au projet de production :

```bash
supabase login
supabase link --project-ref "$PROJECT_REF"
mkdir -p backups
supabase db dump --linked -f backups/01-schema.sql
supabase db dump --linked --data-only --use-copy -f backups/02-data.sql
supabase db dump --linked --role-only -f backups/03-roles.sql
```

Le CLI exige une liaison au projet et un accès à la base. Le dump par défaut ne contient ni les données ni les rôles personnalisés ; les options dédiées sont donc séparées ci-dessus.

**Limite importante :** le dump Supabase exclut les schémas gérés `auth` et `storage`, ainsi que les schémas d'extensions. Il ne sauvegarde donc pas, à lui seul, les comptes Auth ni les fichiers binaires Storage.

## 4. Éléments encore indispensables

### Auth

- Prévoir une exportation séparée et sécurisée des comptes Auth et des métadonnées strictement nécessaires à la restauration.
- Ne pas prétendre sauvegarder les mots de passe : prévoir une procédure de réinitialisation/récupération si nécessaire.
- Ne jamais publier d'adresses e-mail, numéros ou identifiants de membres dans le dépôt.

### Storage

- Exporter séparément les objets binaires des buckets, en conservant les chemins et les métadonnées nécessaires.
- Les buckets privés contiennent des médias de conversation, des reçus de paiement et des photos de profil : accès très restreint et chiffrement obligatoires.
- Vérifier les politiques Storage et la configuration des buckets lors de la restauration.
- Les sauvegardes SQL ne restaurent pas les objets binaires supprimés.

### Configuration et fonctions

- Conserver les migrations, le code des Edge Functions et les fichiers de configuration non secrets dans le dépôt.
- Inventorier séparément les secrets et les paramètres Auth/Storage nécessaires, sans copier leurs valeurs dans Git.
- Après restauration, réinjecter les secrets uniquement depuis un gestionnaire sécurisé et vérifier les versions actives des fonctions.

## 5. Test de restauration obligatoire

1. Créer ou utiliser un environnement Supabase isolé et autorisé, jamais la production.
2. Restaurer le schéma et les données SQL.
3. Restaurer séparément les éléments Auth et Storage selon leur procédure validée.
4. Vérifier les comptes, les profils, les messages, les reçus, les fichiers, les politiques RLS, les permissions SQL, les fonctions et les flux d'authentification.
5. Comparer les volumes restaurés avec l'inventaire de sauvegarde, puis effectuer des tests de lecture et d'accès avec des comptes de test.
6. Documenter le résultat, les écarts, la date, la version CLI et les sommes de contrôle des fichiers.
7. Ne déclarer la sauvegarde « restaurable » qu'après réussite de ce test complet.

## 6. État de validation

- [x] Plan Free vérifié ; sauvegardes quotidiennes automatiques non incluses.
- [x] Inventaire des comptes Auth et des buckets/objets relevé sans lire de contenu privé.
- [x] Limites officielles du dump SQL documentées.
- [ ] Export SQL de production effectué.
- [ ] Export Auth sécurisé effectué.
- [ ] Export des 66 objets Storage effectué.
- [ ] Copie chiffrée hors du dépôt créée.
- [ ] Restauration complète testée sur un environnement isolé.

**Statut : NON PRÊT POUR RESTAURATION.** Aucun test de restauration ni aucune sauvegarde complète ne doit être revendiqué avant la clôture des éléments ci-dessus.


## 7. Cohérence du code Edge Functions — point de vigilance

Comparaison en lecture seule entre les six fonctions actives en production et leurs fichiers sur `main` :

- 5 fonctions sur 6 correspondent exactement au code déployé.
- `malachite-ai-worker` ne correspond pas : la production est en version 14 (dernière mise à jour observée le 21 novembre 2026 à 06:54 UTC), tandis que `main` contient une modification ultérieure issue de la PR #52 fusionnée le 21 novembre à 18:08 UTC.
- Cette modification conserve les champs précédents de `details.automation` lors de la préparation des tâches de support. La version déployée remplace cet objet sans conserver ses anciens champs. Cela peut faire perdre des métadonnées déjà placées dans cet objet, notamment des résultats d'analyse de reçus si ceux-ci y sont enregistrés.

**Décision de sécurité :** ne pas déployer aveuglément. Le correctif du dépôt n'a pas été poussé en production. Avant toute mise à jour, préparer un test staging avec une tâche contenant des métadonnées existantes, vérifier qu'elles sont conservées, puis réaliser un appel worker signé de bout en bout. La restauration complète et le contrôle du backup restent des prérequis avant une mise à jour de production.



## 8. Vérifications complémentaires du 23 novembre 2026

- Le script `supabase/tests/security_hardening_checks.sql` a été exécuté en lecture seule sur la base de production. Toutes ses assertions ont abouti sans exception : RLS des tables publiques, restrictions des privilèges directs, permissions des RPC de paiement/appel et contrôles administrateur.
- Le même script a été exécuté sur staging. Les assertions de protection des tables serveur ont également réussi.
- Les contrôles de structure Match (`supabase/tests/malachite_match_checks.sql`) ont réussi sur staging.
- La branche Match est divergente par rapport à `main` : 45 commits en avance et 19 en retard au moment de la comparaison. Elle ne doit pas être fusionnée telle quelle. La CI de sa dernière révision connue est verte, mais cela ne remplace ni le rebase/review ni les essais réels sur deux comptes et deux téléphones.
- Les PR #69 (tests de non-régression) et #70 (documentation de sauvegarde) ont passé leur workflow de validation GitHub. Elles restent non fusionnées afin d'éviter un redéploiement inutile du site pendant la phase de sécurisation.

Ces tests ne créent pas de sauvegarde et ne démontrent pas encore une restauration complète.


## 9. Audit complémentaire Match — quota de likes

Le contrôle de la politique RLS `public.avis_match` sur le projet isolé a montré que le membre peut modifier sa propre ligne et changer `autre` (destinataire). Le trigger de quota initial ne comptait pas ce changement comme un nouveau like : un contournement du quota était donc possible.

Correctif préparé dans la PR Match #54 :
- un like actif dont le destinataire change consomme désormais une entrée de quota ;
- un test runtime PostgreSQL vérifie qu'un like suivi d'un changement de destinataire compte deux événements ;
- le test ciblé a été exécuté dans une transaction sur le staging isolé avec des identifiants synthétiques ; l'assertion de deux événements a réussi ;
- la transaction a été annulée ; une vérification post-test a confirmé zéro utilisateur, zéro like et zéro événement de quota résiduel pour les identifiants de test.

La CI du nouveau commit n'est pas encore confirmée. La PR #54 reste en brouillon et divergente de `main`. Ne pas fusionner ni déployer.

## 10. Audit complémentaire des appels

- La fonction `private.guard_call_session_update()` protège les identifiants, le destinataire, la salle, le mode et l'heure de création contre les modifications ; elle impose aussi des transitions d'état.
- Une tentative contrôlée de modification isolée de `expires_at` sur un appel en attente a été rejetée par le trigger (`invalid_call_transition`), et la transaction a échoué sans conserver de fixture.
- Une tentative de créer deux appels directs avec un compte de test synthétique, en contournant la RPC et en utilisant le rôle `authenticated`, a été rejetée par la politique RLS. Après l'échec, le contrôle a confirmé zéro compte et zéro appel de test résiduel.
- La RPC `start_call_session` reste protégée par authentification, entitlement Premium/Pass Appels, match réciproque, blocage, expiration courte et vérification de session active.

Ces essais ne remplacent pas les tests d'appels entre deux téléphones réels.

## 11. Protection des mots de passe compromis — limite du plan

Le conseiller de sécurité Supabase signale que la protection contre les mots de passe compromis (HaveIBeenPwned) est désactivée en production.

La documentation officielle Supabase précise que cette fonctionnalité est disponible uniquement sur les plans **Pro et supérieurs** :
https://supabase.com/docs/guides/auth/password-security

- Le projet est actuellement sur le plan Free ; cette alerte ne peut donc pas être corrigée dans le cadre du plan actuel.
- Aucun changement Auth ni changement de plan n'a été effectué.
- Ne pas passer au plan Pro uniquement pour faire disparaître l'alerte sans décision explicite sur le budget.
- Si un passage au plan Pro est approuvé ultérieurement, activer l'option dans les paramètres Auth, puis tester inscription, connexion et changement de mot de passe.
- Ne pas confondre cette protection avec une réinitialisation des mots de passe existants.


## 12. Recontrôle du 23 novembre 2026 — CI, RPC et worker IA

### CI des Pull Requests
Vérification directe des workflows GitHub associés aux derniers commits observés :
- PR #69, commit `902f198b121117423ce1ec54a3d4b645cd6b9140` : workflow `Malachite validation`, exécution #814, terminée avec succès.
- PR #70, commit `5872fe9d36e6e923b78acc9788a9b1b6137936d4` : workflow `Malachite validation`, exécution #819, terminée avec succès.
- PR #54, commit `d6cb185878533ef46ad945b83a92e5aa6b387012` : aucun workflow PR retourné et aucun statut combiné enregistré. Ne pas considérer le correctif Match comme validé par CI.

Ces résultats concernent exactement les SHA indiqués ; toute nouvelle modification nécessite une nouvelle vérification.

### Revue des avertissements Supabase SECURITY DEFINER
Les avertissements du conseiller ont été examinés dans les définitions SQL de production :
- `admin_malachite_referrals`, `founder_business_overview` et `founder_finance_summary` exigent un utilisateur connecté et `private.is_admin()`. Leur `search_path` est fixé à vide.
- `start_call_session` exige `auth.uid()`, valide l'éligibilité Appels/Premium, le blocage, le match réciproque et l'expiration. L'accès `authenticated` est cohérent avec son usage RPC.
- `get_malachite_referrer_preview` est accessible à `anon`, mais ne renvoie que le prénom et le nom d'utilisateur d'un profil dont `profile_private=false`. C'est une exposition publique limitée aux profils publics, à surveiller si le besoin produit change.
- Les alertes « RLS activé sans policy » portent notamment sur des tables internes/serveur. L'absence de policy n'est pas à elle seule une preuve de fuite ; il faut aussi vérifier les privilèges SQL et les accès des rôles exposés. Aucune permission n'a été modifiée pendant cet audit.
- L'alerte HaveIBeenPwned reste une limite du plan Free, comme indiqué plus haut.

### Vérification de l'authentification du worker IA
Le worker de production est actif en version 14 et `verify_jwt=false`. Cela ne signifie pas qu'il accepte librement les appels : le code exige une signature HMAC courte durée via les en-têtes `x-mal-timestamp` et `x-mal-signature`, puis appelle `verify_malachite_ai_worker_signature`. Cette RPC :
- utilise un secret conservé dans Supabase Vault ;
- vérifie un timestamp à 10 chiffres avec une fenêtre de 300 secondes ;
- vérifie une signature HMAC-SHA256 sur timestamp + corps ;
- refuse par défaut en cas d'erreur ;
- n'est exécutable que par `service_role` (ni `anon`, ni `authenticated`).

La garde d'authentification est donc présente dans le code et la permission SQL vérifiée. Aucun appel manuel du worker n'a été déclenché.

### Écart de code du worker — portée précise
La comparaison ligne à ligne du fichier déployé avec `main` confirme un seul bloc fonctionnel différent : le code de `main` conserve les champs existants de `current.automation` avant d'ajouter les nouvelles métadonnées de préparation ; la version production remplace cet objet `automation` sans fusionner ses champs précédents. Cela peut écraser des métadonnées imbriquées préexistantes dans les tâches en attente. Aucun élément ne prouve qu'une donnée utilisateur a déjà été perdue.

**Décision :** ne pas redéployer avant sauvegarde restaurable et test staging qui prouve la conservation des métadonnées. Aucun déploiement, changement de permission, changement Auth, paiement ou export de données privées n'a été effectué pendant ce contrôle.


## 13. Mise à jour du statut Match — comparaison du 23 novembre 2026

La comparaison actuelle de `feature/match-experience-2026-11-22` avec `main` donne **45 commits en avance et 19 en retard** (branche divergente). La branche modifie aussi des fichiers de l'application, le service worker et le workflow CI, en plus d'ajouter la migration et les tests Match. Une fusion directe serait donc imprudente.

Le workflow `.github/workflows/validate.yml` de `main` déclare bien un déclenchement sur les pull requests ciblant `main`, mais GitHub ne retourne toujours aucune exécution ni aucun statut pour le SHA actuel de la PR #54. Le test runtime contient le nouveau scénario de changement de destinataire ; il n'a pas été exécuté par une CI GitHub confirmée pour ce SHA.

**Action retenue :** garder la PR #54 en brouillon. La prochaine intégration doit se faire sur une branche de réconciliation dédiée, en reprenant uniquement les changements Match nécessaires après comparaison fichier par fichier avec `main`, puis en obtenant une CI réellement exécutée. Ne pas fusionner la branche divergente en bloc.
