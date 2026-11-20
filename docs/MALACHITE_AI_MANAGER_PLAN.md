# Malachite AI Manager — plan de lancement — 31 décembre 2026

## Statut et garde-fous
- Cette branche est une préparation isolée. Elle n'est ni fusionnée dans `main`, ni publiée, ni déployée.
- Aucun changement n'a été appliqué au projet Supabase de production.
- Aucune clé API, aucun compte marchand et aucun service payant n'ont été activés.
- Le panneau « Malachite AI Manager » ajouté à l'interface est un prototype visuel clairement marqué comme non activé.

## Parcours de paiement simplifié (maquette)
1. Le membre choisit Premium (2 USD / 30 jours) ou Boost (0,50 USD / 24 h).
2. Il choisit Airtel Money ou Orange Money.
3. L'interface affiche uniquement le numéro correspondant :
   - Airtel Money : +243 993 315 532
   - Orange Money : +243 848 775 992
4. Il effectue le transfert puis soumet la référence reçue.
5. La demande reste en attente jusqu'à une vérification indépendante et fiable.

Le code actuel accepte une référence dans `paiements.code`. La table ne contient pas de champ de preuve image et aucun stockage privé dédié aux reçus n'a été vérifié. L'envoi d'une capture d'écran n'est donc pas encore activé dans cette maquette. Une capture pourra aider l'OCR à lire le montant, la date et la référence, mais elle ne prouvera jamais à elle seule que l'argent est arrivé.

## Paiements automatiques — architecture requise
- Intégration officielle opérateur/agrégateur (API ou webhook authentifié) capable de confirmer la transaction, le montant, la devise, le numéro destinataire et l'identifiant unique.
- Vérification serveur uniquement ; aucune validation depuis le navigateur.
- Contrainte d'unicité/idempotence sur l'identifiant de transaction, journal d'événements et protection contre la réutilisation d'un reçu.
- Activation Premium atomique côté serveur après confirmation opérateur ; 30 jours ajoutés à l'expiration existante.
- Si l'opérateur ne fournit pas de confirmation exploitable, statut « à vérifier » et aucune activation automatique.
- Les comptes personnels seuls ne garantissent pas l'accès aux API marchandes ni aux webhooks. Orange documente une offre Web Payment réservée aux marchands officiellement enregistrés et indique la RDC parmi les pays disponibles : https://developer.orange.com/apis/om-webpay/. Airtel Africa présente son portail API pour les commerçants : https://developers.airtel.africa/developer. Les conditions d'éligibilité et documents KYC en RDC doivent être confirmés directement avant de choisir l'intégration.

## Malachite AI Manager — périmètre
### Automatisations possibles après intégration
- Paiements : lire les confirmations, détecter doublons/anomalies, activer automatiquement les abonnements confirmés.
- Comptes : détecter spam, fraude et comportements anormaux ; appliquer des restrictions temporaires proportionnées selon des règles strictes.
- Signalements : classer par urgence, regrouper les doublons et préparer des décisions.
- Avis/support : répondre aux questions fréquentes avec une base de connaissances validée, classer les retours et remonter les bugs.
- Technique : surveiller erreurs, disponibilité et volumes, puis alerter l'administrateur.

### Limites obligatoires
- Une simple capture, une référence saisie ou une accusation ne suffit jamais pour confirmer un paiement ou sanctionner un membre.
- Suspension automatique temporaire uniquement sur signaux objectifs multiples et seuils définis ; journalisation, durée limitée, notification et procédure de contestation.
- Bannissement définitif, remboursement, transfert d'argent, changement de numéros de paiement, suppression de données, et cas ambigus : validation du propriétaire requise.
- Accès minimal aux données ; pas d'accès général aux conversations privées. Les éléments ne sont consultés que lorsqu'ils sont nécessaires à un signalement précis et autorisé.
- Chaque action de l'agent doit avoir un motif, une source, un niveau de confiance, un horodatage et un identifiant de corrélation.

## Architecture cible
- Interface admin : commandes et rapports.
- Agent IA OpenAI côté serveur : analyse et appels d'outils autorisés uniquement.
- Supabase Edge Functions : authentification, orchestration, webhooks, tâches asynchrones.
- PostgreSQL : règles métier, statuts, idempotence et journal d'audit.
- Stockage privé : reçus de paiement avec accès temporaire limité et politiques RLS.
- File/planificateur : traitement 24/7 sans dépendre d'une session navigateur ou de ChatGPT ouvert.

## État observé pendant l'audit (20 novembre 2026)
- Le frontend principal est un fichier monolithique `index.html`.
- Le formulaire de paiement existant envoie l'offre, la référence et l'opérateur vers `public.paiements`.
- Le panneau admin affiche les demandes en attente et appelle `traiter_paiement`.
- La base contient déjà les tables `paiements`, `signalements`, `suspensions`, `avis_site` et `admin_actions`.
- La fonction privée `private.traiter_paiement` vérifie `private.is_admin()`, verrouille la demande et active les droits après validation administrative. Ce n'est pas encore une validation opérateur automatisée.
- Les Edge Functions observées sont `admin-user-moderation` et `username-login`. Aucune fonction webhook de paiement ni agent IA permanent n'a été trouvée dans la liste consultée.
- Les advisors signalent `start_call_session` SECURITY DEFINER exécutable par authenticated. Vérification complémentaire : `anon` n'a pas EXECUTE ; le corps vérifie `auth.uid()`, l'abonnement, le match mutuel et l'expiration courte. L'accès authenticated est donc intentionnel mais doit rester couvert par les tests négatifs. `private.admins` a RLS sans politique directe ; le schéma `private` n'est pas exposé et l'accès passe par les fonctions d'autorisation. La protection contre les mots de passe compromis reste désactivée et doit être activée/vérifiée dans la configuration Auth avant lancement.

## Étapes avant activation
1. Revoir les règles commerciales et les tarifs finaux (Premium 2 USD/mois confirmé par le propriétaire).
2. Vérifier l'éligibilité Airtel Money et Orange Money pour encaissement marchand/API en RDC.
3. Concevoir et tester le schéma de reçus privés et les politiques RLS sur une branche/environnement de test.
4. Implémenter les webhooks authentifiés et les tests d'idempotence/fraude.
5. Ajouter l'agent IA avec permissions minimales, limites de dépenses, journal d'audit et mode simulation.
6. Tester les parcours de paiement, expiration, renouvellement, doublons, faux reçus, panne opérateur, contestation et suspension abusive.
7. Audit de sécurité et accord explicite du propriétaire avant toute fusion, migration de production, activation de service ou publication.

## Décision de lancement
La date cible publique est le 31 décembre 2026. Cette date est un objectif conditionnel : aucune publication ne doit avoir lieu si un contrôle critique échoue. Jusqu'à nouvel accord explicite, aucune fusion vers `main`, migration Supabase, activation d'API payante, publication ou déploiement n'est autorisé.
