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
- Appels : toujours bloqués comme critère de sécurité de lancement tant qu'une authentification de participant Jitsi ou un fournisseur de conférence authentifié n'est pas en place.
- Auth : protection des mots de passe compromis à examiner dans le tableau de bord.
- Aucune suppression de compte, aucun changement de fournisseur d'appels, aucune migration de données utilisateur et aucun paiement n'ont été exécutés.
