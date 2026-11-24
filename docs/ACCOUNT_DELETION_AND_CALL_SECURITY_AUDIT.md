# MALACHITE — audit avant suppression de compte et sécurisation des appels

Date de vérification : 24 novembre 2026  
Projet Supabase contrôlé en lecture seule : `tscsmemsvgacqioncash`  
Branche de référence : `main` au commit `92878862f8f572e3b9493af948a2e3f560591229`

## 1. État vérifié

- La PR #85 prépare trois références d'audit avec `ON DELETE SET NULL` et un test PostgreSQL jetable.
- La validation et les tests de la PR ont réussi.
- **La migration de la PR #85 n'a pas été appliquée à Supabase production.**
- Aucun compte, paiement, message ou fichier n'a été supprimé ou modifié pendant cet audit.

## 2. Références Auth et données qui restent à traiter

Les références directes vers `auth.users` actuellement observées :

- Plusieurs tables utilisent déjà `ON DELETE CASCADE` (profils, informations privées, sessions d'appel, blocages, reçus de lecture, notifications, etc.).
- Trois références administratives étaient en `NO ACTION` : `campagnes.cree_par`, `demandes_support.traite_par`, `signalements.traite_par`. La PR #85 prépare leur passage à `SET NULL`.
- `messages.de` et `messages.a` ne disposent pas de clés étrangères vers `auth.users`.
- `rendez_vous.de` et `rendez_vous.a` ne disposent pas de clés étrangères vers `auth.users`.
- `avis_match.user_id` et `avis_match.autre` ne disposent pas de clés étrangères vers `auth.users`.
- `avis_site.user_id` ne dispose pas de clé étrangère vers `auth.users`.
- `signalements.de` et `signalements.profil` ne disposent pas de clés étrangères vers `auth.users`.
- `paiements.user_id` ne dispose pas de clé étrangère vers `auth.users`.

Conséquence : supprimer un utilisateur Auth sans traitement explicite de ces lignes pourrait laisser des données personnelles orphelines. À l'inverse, ajouter aveuglément des cascades pourrait effacer des preuves de paiement ou des éléments nécessaires à la modération.

## 3. Stockage

Les buckets suivants sont privés : `chat-media`, `photos`, `profile-photos`, `payment-receipts`.

Comptage observé pendant l'audit :
- `chat-media` : 31 objets
- `photos` : 9 objets
- `profile-photos` : 24 objets
- `payment-receipts` : 2 objets

Les deux buckets de campagnes sont publics, mais aucun objet n'y était présent lors du comptage. Ne pas supprimer les objets de stockage par simple supposition de propriété : vérifier les chemins et les propriétaires, puis supprimer uniquement les fichiers appartenant au compte concerné.

## 4. Politique nécessaire avant d'écrire la fonction de suppression

À décider et documenter avant implémentation :
1. Messages : effacer les messages de l'utilisateur, les anonymiser, ou les conserver dans la conversation du destinataire sous une identité « compte supprimé » ?
2. Rendez-vous, likes et avis : effacement complet ou conservation/anonymisation pour prévenir les abus ?
3. Paiements : durée légale/comptable de conservation, anonymisation de l'identifiant, traitement des reçus et litiges. Ne pas effacer un justificatif sans règle de conservation approuvée.
4. Signalements et tickets de support : conserver les éléments nécessaires à la sécurité, tout en anonymisant les identifiants personnels lorsque c'est approprié.
5. Médias : distinguer photos de profil, photos de galerie, pièces jointes de conversation et reçus de paiement.
6. Sessions : révoquer les sessions avant suppression ; la suppression de l'utilisateur ne doit pas être supposée invalider immédiatement tous les jetons déjà émis.

## 5. Séquence de suppression proposée

- Exiger une session valide et une réauthentification récente.
- Présenter clairement les données supprimées et celles conservées.
- Préparer un plan de suppression idempotent et journaliser un identifiant d'opération non sensible.
- Révoquer les sessions et empêcher de nouvelles actions pendant le traitement.
- Appliquer les règles par catégorie, avec une stratégie de reprise en cas d'échec.
- Supprimer les objets Storage ciblés après validation de propriété.
- Supprimer enfin l'utilisateur Auth.
- Vérifier avec des comptes fictifs que les données du second utilisateur restent intactes.

Ne pas lancer cette séquence sur des comptes réels avant les tests de staging et la validation de la politique de conservation.

## 6. Appels : résultat de l'audit

Le RPC `start_call_session` vérifie notamment l'authentification, l'éligibilité Premium/Pass Appels, le match réciproque, les blocages et l'expiration de la session.

Cependant, `calls.js` rejoint directement `meet.jit.si` avec `roomName` et ne transmet aucun JWT Jitsi. Un nom de salle difficile à deviner ne constitue pas une authentification de participant.

La documentation officielle Jitsi recommande l'authentification par jeton pour une nouvelle installation, mais celle-ci nécessite une configuration serveur Jitsi contrôlée par l'opérateur. L'instance publique `meet.jit.si` ne donne pas à MALACHITE la maîtrise de cette configuration.

Conclusion : ne pas qualifier les appels de sécurisés pour le lancement public tant qu'une infrastructure de conférence authentifiée et des tests entre deux appareils n'ont pas été réalisés. Ne pas activer un service payant ni changer de fournisseur sans accord explicite.

## 7. Publicité et campagnes : résidus constatés

La PR #84 a retiré les éléments publicitaires de l'interface chargée au lancement. L'audit de la liste des Edge Functions Supabase a néanmoins montré que `malachite-ad-creative` est encore ACTIVE (JWT obligatoire, contrôle administrateur dans le code). Les deux buckets de campagnes sont encore publics mais vides au moment du contrôle.

Cela ne signifie pas qu'une campagne est active. Il reste toutefois à désactiver ou isoler proprement les outils publicitaires côté serveur avant de considérer le retrait comme complet. Ne pas supprimer les tables historiques sans politique de conservation.

## 8. Décision de lancement

Les seuls revenus prévus restent Premium, Boost et appels payants à 1 USD. Pas de publicité ni de sponsoring.

Aucun déploiement de suppression de compte et aucune migration destructive ne doivent être exécutés sur la production avant :
- politique de conservation validée ;
- tests PostgreSQL et tests Edge Function sur environnement isolé ;
- tests de non-régression entre deux comptes ;
- contrôle des accès Storage et des sessions ;
- approbation explicite avant tout changement de fournisseur ou dépense.


## 9. Mise à jour après retrait des publicités (24 novembre 2026)

La PR #88 a été fusionnée dans `main` au commit `df968cb58709c2dfdc60b2f341a601c28af6d2ab`. Les workflows de validation, de prévisualisation Match isolée et de publication Pages ont réussi.

Actions appliquées à Supabase production :
- Migration `retire_advertising_surfaces` appliquée avec succès.
- Les buckets `malachite-campaigns` et `malachite-campaign-media` sont désormais privés.
- Les politiques de lecture publique et les politiques client d'administration de ces deux buckets ont été supprimées.
- Les politiques de la table `campagnes` ont été retirées : la table reste présente, sans accès par les rôles client.
- Les deux buckets contenaient toujours zéro objet ; aucune donnée n'a été supprimée.
- La table `campagnes` contenait zéro ligne et zéro campagne active lors du contrôle.
- L'Edge Function `malachite-ad-creative` a été redéployée en version 6, avec JWT obligatoire, et renvoie désormais HTTP 410 `advertising_generation_disabled`. La fonction ne génère plus de publicité ni de voix publicitaire.
- Les scripts publicitaires inutilisés ont été retirés du dépôt et l'interface d'administration ne propose plus de gestion des campagnes ni de catégorie promotionnelle.

Les tables historiques et les migrations de création des campagnes sont conservées dans Git et dans la base. Aucun objet, enregistrement de campagne, compte ou paiement n'a été effacé.

## 10. Résultats supplémentaires de l'audit Supabase

### 10.1 Références et volumes observés

Lecture seule de la structure et des nombres de lignes, le 24 novembre 2026 :

| Table | Lignes observées | Référence utilisateur | Nullable |
|---|---:|---|---|
| `messages` | 70 | `de`, `a` | non |
| `rendez_vous` | 1 | `de`, `a` | non |
| `avis_match` | 11 | `user_id`, `autre` | non |
| `avis_site` | 4 | `user_id` | non |
| `signalements` | 2 | `de`, `profil` | non |
| `paiements` | 8 | `user_id`, `cible` | `user_id` non |

Aucune clé étrangère vers `auth.users` n'a été observée sur ces six tables. Les colonnes de référence listées sont actuellement NOT NULL. Par conséquent, une stratégie `ON DELETE SET NULL` nécessite d'abord une migration de nullabilité et des tests de compatibilité applicative ; elle ne peut pas être ajoutée telle quelle.

Points à traiter avant implémentation :
- `messages` : définir si le texte et les pièces jointes restent visibles au destinataire après anonymisation de l'expéditeur ; les messages peuvent contenir des informations personnelles dans leur contenu.
- `rendez_vous` : définir le sort des rendez-vous et des lieux associés lorsqu'un participant supprime son compte.
- `avis_match` : les lignes de relation peuvent être supprimées, mais cela doit être vérifié avec la logique Match et les tests de non-régression.
- `avis_site` : décider si l'avis est supprimé ou conservé anonymisé ; son texte libre peut contenir des données personnelles.
- `signalements` : conserver si nécessaire les éléments indispensables à la sécurité ou à un litige, avec accès restreint, et anonymiser les identifiants non nécessaires.
- `paiements` : séparer les archives réellement comptables des déclarations de paiement. Le schéma actuel n'a pas de colonne de montant ; il ne suffit pas à démontrer qu'une ligne constitue une pièce justificative comptable. Ne pas transformer automatiquement toutes les déclarations en archives décennales.

Aucune de ces six tables n'a été modifiée pendant ce contrôle.

### 10.2 Conseils de sécurité Supabase

Le contrôle des Security Advisors a signalé :
- 11 tables avec RLS activé et sans politique : `private.admins`, `private.founder_finance_ledger`, `private.match_daily_like_events`, `public.admin_push_queue`, `public.admin_push_subscriptions`, `public.ai_manager_audit`, `public.ai_ops_runs`, `public.malachite_ai_alerts`, `public.malachite_ai_review_queue`, `public.malachite_ai_settings`, `public.malachite_referrals`. En l'absence de politique RLS, les rôles clients sont bloqués par défaut ; ces cas doivent être confirmés comme accès backend/service-role uniquement, pas « réparés » en ajoutant une politique large.
- 9 fonctions `SECURITY DEFINER` exécutables par les utilisateurs authentifiés. Les définitions inspectées contrôlent l'identité ou l'autorisation dans le corps : les fonctions d'administration vérifient `private.is_admin()`, les fonctions Match exigent un utilisateur connecté et appliquent les règles de visibilité/blocage/suspension, et `start_call_session` contrôle l'éligibilité, le match réciproque, les blocages et l'expiration.
- `get_malachite_referrer_preview(uuid)` est exécutable par `anon` et `authenticated`, mais ne renvoie que le prénom et le nom d'utilisateur d'un profil dont `profile_private=false`. Le client l'utilise sur la page de parrainage publique. C'est un accès public intentionnel aux données déjà déclarées publiques, à garder sous surveillance.
- La protection contre les mots de passe compromis est signalée comme désactivée. Ce réglage doit être examiné dans Supabase Auth Dashboard ; il n'a pas été changé par cet audit.
- Aucun avis de santé du projet n'a été retourné par le conseiller de santé.
- 19 index inutilisés ont été signalés par l'analyse de performance. Ils ne doivent pas être supprimés automatiquement : le projet est encore en phase de test et certains chemins sont peu sollicités.

Les alertes des Advisors sont des pistes de vérification, pas la preuve que chacune est une vulnérabilité exploitable. Les politiques RLS et les contrôles internes doivent être testés avec des sessions anon, utilisateur normal et administrateur.

## 11. État de lancement mis à jour

- Publicité et campagnes : interface retirée, accès client aux buckets/table supprimé, endpoint de génération désactivé.
- Suppression de compte : toujours non implémentée ; le schéma exige une stratégie explicite par catégorie.
- Appels : fonctionnalité non désactivée, mais non validée comme suffisamment sécurisée pour un lancement public tant qu'une authentification de participant Jitsi ou un fournisseur de conférence authentifié n'est pas en place.
- Auth : protection des mots de passe compromis à examiner dans le tableau de bord.
- Aucune suppression de compte, aucun changement de fournisseur d'appels, aucune migration de données utilisateur et aucun paiement n'ont été exécutés.


## 12. Plan technique pour rétablir des appels authentifiés

La documentation officielle Jitsi indique que l'authentification JWT est configurée sur le serveur Jitsi (notamment Prosody), et non simplement activée par l'application cliente. Pour une installation Docker, les paramètres officiels incluent `ENABLE_AUTH=1`, `AUTH_TYPE=jwt`, `JWT_APP_ID`, `JWT_APP_SECRET` et `JWT_ALLOW_EMPTY=0`. Le secret doit rester côté serveur.

Architecture recommandée si une infrastructure contrôlée devient disponible :
1. Déployer une instance Jitsi dédiée, avec HTTPS, Docker et configuration de domaine maîtrisée.
2. Configurer l'authentification JWT sur Prosody et refuser les jetons vides.
3. Créer une Edge Function MALACHITE d'émission de jeton. Elle valide le JWT Supabase, vérifie que l'utilisateur est le caller ou callee de la session acceptée, que la session n'est pas expirée/terminée et que l'accès reste autorisé.
4. Signer un jeton Jitsi de courte durée, lié à une seule salle précise et à l'identité du participant. Ne jamais signer un nom de salle ou un rôle fournis librement par le navigateur.
5. Transmettre le jeton signé à `JitsiMeetExternalAPI` depuis le client ; ne jamais exposer le secret Jitsi dans le JavaScript.
6. Tester les cas autorisés et refusés sur deux appareils et deux réseaux : bon caller, bon callee, autre utilisateur, session expirée, salle incorrecte, jeton expiré, utilisateur bloqué et tentative sans JWT.

La documentation Jitsi décrit aussi les mécanismes d'authentification JWT et les options de Docker :
- https://jitsi.github.io/handbook/docs/devops-guide/token-authentication/
- https://jitsi.github.io/handbook/docs/devops-guide/authentication/
- https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-docker/

Cette architecture n'est pas déployée. Elle nécessite un serveur que MALACHITE contrôle, des secrets protégés et des essais réels. Aucun fournisseur payant, hébergement ou changement de prestataire n'a été choisi ni activé.


## 13. Addendum — état courant corrigé au 24 novembre 2026

Cet addendum prévaut sur les passages antérieurs de ce document qui décrivent encore les buckets de campagnes comme publics, la fonction de création publicitaire comme active, ou la migration de préparation de suppression comme non appliquée.

### Publicité / campagnes — état confirmé

- Les buckets `malachite-campaigns` et `malachite-campaign-media` sont privés. Les politiques de lecture publique correspondantes ont été retirées.
- Les deux buckets ont été contrôlés en lecture seule : zéro objet.
- La table `campagnes` a été contrôlée en lecture seule : zéro ligne et zéro campagne active.
- `malachite-ad-creative` reste déployée comme endpoint de retrait (JWT requis) et renvoie HTTP 410 `advertising_generation_disabled`. Elle ne doit pas être présentée comme une fonction de génération active.
- Les tables et historiques sont conservés ; aucune donnée de campagne n'a été supprimée.

### Migration de préparation de suppression — état confirmé

La migration `account_deletion_fk_cleanup` est enregistrée dans l'historique Supabase de production. Les trois références administratives préparées par la PR #85 sont nullable et utilisent `ON DELETE SET NULL`. Cette préparation ne supprime pas de comptes ni de lignes métier.

### Écart de journal de migrations

La revue du 24 novembre a constaté que les versions/noms de migrations enregistrés en production ne correspondent pas exactement aux fichiers versionnés. La migration de privatisation des buckets n'apparaît pas comme entrée distincte, tandis que la migration de retrait publicitaire en production peut couvrir les mêmes effets. L'historique seul ne prouve pas l'identité exacte du SQL exécuté. Ne pas lancer `supabase db push`, réinitialiser la base, réécrire les entrées appliquées ou rejouer aveuglément les migrations. Comparer les effets SQL et utiliser uniquement une migration corrective forward-only si un écart réel est démontré.

### Points de lancement qui restent bloquants

- Les appels rejoignent toujours `meet.jit.si` sans JWT Jitsi : les droits du RPC MALACHITE ne protègent pas l'accès à la salle du fournisseur. Ne pas annoncer les appels comme authentifiés pour le lancement public.
- La protection Supabase Auth contre les mots de passe compromis est signalée désactivée et doit être examinée dans le Dashboard par le propriétaire du projet.
- La suppression de compte en libre-service n'est pas implémentée. Les références sans FK et les règles de conservation par catégorie doivent être traitées avant toute suppression réelle.
- Les tests de suppression doivent utiliser des comptes synthétiques et démontrer qu'aucune donnée d'un autre utilisateur n'est touchée.

Aucun compte, message, paiement ou média utilisateur n'a été supprimé pendant ces vérifications. Aucun fournisseur payant ni service de paiement n'a été activé.
