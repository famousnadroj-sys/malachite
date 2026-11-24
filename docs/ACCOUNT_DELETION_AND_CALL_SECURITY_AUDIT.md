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
