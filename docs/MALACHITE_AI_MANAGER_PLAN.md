# Malachite AI Manager — plan d'intégration et d'exploitation

## Statut et garde-fous
- La branche de préparation n'est ni fusionnée dans `main`, ni publiée, ni déployée.
- Les migrations de durcissement RPC, reçus additifs et optimisation support ont été appliquées en production ; la politique stricte de reçus attend le déploiement du frontend compatible.
- Aucune clé API IA, aucun compte marchand ni service payant n'a été activé.
- Le panneau « Malachite AI Manager » est un prototype visuel marqué comme non activé. Aucune Edge Function AI Manager, clé fournisseur IA, file de tâches ou automatisation autonome n'est déployée.

## Parcours de paiement — état réel
- Premium : 2 USD / 30 jours dans le parcours d'offres de cette branche.
- Moyens affichés : Airtel Money et Orange Money.
- Le formulaire de cette branche demande une référence et un justificatif image, téléversé dans un bucket privé avant l'insertion de la demande.
- Le code d'administration permet une vérification humaine ; il ne s'agit pas d'une confirmation automatique de l'opérateur.
- Vérification SQL de production du 20 novembre 2026 : `public.paiements.receipt_path`, le bucket privé `payment-receipts` (5 Mo, JPEG/PNG/WebP), les politiques Storage et l'index anti-doublon sont présents. L'ancienne politique INSERT est conservée temporairement ; déployer le frontend compatible, vérifier les clients PWA, appliquer ensuite la politique stricte et tester avec deux comptes.
- Une capture d'écran ou une référence saisie ne prouve jamais à elle seule que l'argent est arrivé.

## Paiements automatiques — architecture requise
- API ou webhook officiel opérateur/agrégateur, authentifié et capable de confirmer transaction, montant, devise, destinataire et identifiant unique.
- Vérification exclusivement côté serveur ; aucune validation depuis le navigateur.
- Idempotence et unicité sur l'identifiant opérateur, journal d'événements et protection contre la réutilisation d'une référence.
- Activation Premium atomique après confirmation indépendante ; durée de 30 jours ajoutée à l'expiration existante.
- Sans confirmation officielle exploitable : statut « à vérifier », aucune activation automatique.
- Les comptes personnels ne garantissent pas l'accès aux API marchandes. Orange documente une offre Web Payment pour les marchands enregistrés : https://developer.orange.com/apis/om-webpay/. Airtel Africa présente son portail API marchand : https://developers.airtel.africa/developer. Éligibilité et KYC en RDC à confirmer directement auprès des opérateurs.

## Périmètre fonctionnel envisagé
- Paiements : lire les confirmations, détecter doublons/anomalies, activer uniquement les abonnements confirmés.
- Comptes : détecter spam et comportements anormaux, proposer des mesures proportionnées.
- Signalements : classer par urgence, regrouper les doublons et préparer des décisions.
- Support : répondre aux questions fréquentes depuis une base approuvée, classer les retours et remonter les bugs.
- Technique : surveiller erreurs, disponibilité et volumes, puis alerter l'administrateur.

## Limites obligatoires
- Une capture, une référence saisie ou une accusation ne suffit jamais pour confirmer un paiement ou sanctionner un membre.
- Suspension temporaire automatisée uniquement après signaux objectifs multiples, seuils documentés, durée limitée, journalisation, notification et recours.
- Bannissement définitif, remboursement, transfert d'argent, modification des numéros de réception, suppression de données et cas ambigus : approbation humaine obligatoire.
- Pas d'accès général aux conversations privées. Accès minimal et limité aux éléments nécessaires à un signalement précis et autorisé.
- Chaque action doit conserver motif, source, niveau de confiance, horodatage, décision humaine éventuelle et identifiant de corrélation.

## Architecture cible
- Interface admin pour commandes, rapports et approbations.
- Fournisseur IA côté serveur uniquement ; aucune clé dans `index.html` ou le dépôt.
- Supabase Edge Functions pour authentification, orchestration et webhooks.
- PostgreSQL pour règles métier, statuts, idempotence et journal d'audit.
- Stockage privé pour reçus, avec accès temporaire et politiques RLS.
- File et planificateur serveur pour le traitement continu ; une page ouverte sur le téléphone ou ChatGPT ne constitue pas un agent 24/7.

## État observé dans Supabase actif — 20 novembre 2026
- Edge Functions actives observées : `admin-user-moderation` et `username-login`. Aucune fonction webhook de paiement ou AI Manager n'a été trouvée.
- La fonction privée `private.traiter_paiement` contrôle l'autorisation administrateur et traite les demandes après vérification humaine.
- **Durcissement RPC effectué :** la migration `restrict_payment_review_rpc` est inscrite en production (`20261120195441`). Vérification SQL : `anon` ne peut appeler aucune des deux surcharges ; `authenticated` conserve l'exécution. Le contrôle interne `private.is_admin()` demeure en place.
- L'advisor signale `public.start_call_session` en `SECURITY DEFINER`, exécutable par `authenticated`. La fonction contrôle `auth.uid()`, les conditions d'appel et le match réciproque ; ne pas la convertir aveuglément en `SECURITY INVOKER`, car les droits/RLS actuels empêchent certaines lectures nécessaires. Revue dédiée et tests négatifs requis.
- `private.admins` a RLS sans politique directe ; l'accès direct reste fermé et les contrôles doivent passer par `private.is_admin()`.
- La protection contre les mots de passe compromis est désactivée dans Supabase Auth.
- Les deux index FK de `demandes_support` et les optimisations RLS sont appliqués et vérifiés en production.

## Ordre de travail avant activation
1. Les privilèges RPC paiement ont été corrigés et vérifiés.
2. La migration additive de reçus a été appliquée ; déployer le frontend compatible, puis seulement appliquer la politique stricte.
3. Tester avec deux comptes distincts l'upload, les lectures propriétaire/admin, les suppressions, les doublons, les URL signées et les refus d'accès.
4. Revoir `start_call_session` avec tests de deux comptes et conserver les protections inter-utilisateurs.
5. Activer la protection contre les mots de passe compromis dans Auth.
6. Vérifier l'éligibilité marchande Airtel/Orange et obtenir les accès officiels avant toute intégration.
7. Construire l'agent IA en mode simulation, avec outils autorisés, quotas, journal d'audit, limites de coût et approbation humaine.
8. Effectuer les tests Android et les tests de reprise/restauration avant tout lancement.

## Décision de lancement
Aucune date fixe ne remplace les critères GO. Pas de fusion, migration de production, activation de fournisseur, dépense ou publication sans tests réussis et approbation explicite du propriétaire.
