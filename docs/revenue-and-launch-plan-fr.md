# MALACHITE — plan de revenus et de lancement commercial

> Document de travail. Ce plan ne constitue ni une activation de paiement ni une promesse de revenus. Toute offre doit être testée, tarifée et validée avant sa mise en production.

## 1. Positionnement

MALACHITE doit devenir un service de rencontres fiable, simple et agréable, d'abord pour Lubumbashi et le Haut-Katanga. La croissance doit venir d'une expérience réellement utile : profils authentiques, respect des préférences, sécurité, modération réactive et conversations de qualité.

Ne pas acheter de faux profils, de faux avis, de faux likes ou de faux abonnés. Ne pas promettre de rencontre garantie.

## 2. Architecture des revenus

### A. Accès gratuit
Garder l'inscription, la création d'un profil de base, la découverte essentielle et les fonctions de sécurité gratuites. La gratuité doit permettre de comprendre la valeur du service avant tout achat.

### B. MALACHITE Premium — abonnement récurrent
Avantages candidats, à confirmer après test d'usage :
- quota de likes plus élevé ou illimité si les coûts et l'équité le permettent ;
- consultation complète des likes reçus ;
- filtres et options de profil supplémentaires ;
- réglages de visibilité clairement expliqués.

Règles : prix et durée affichés avant paiement ; renouvellement et annulation compréhensibles ; reçu disponible ; aucun avantage présenté comme garantissant un match. Mesurer l'usage réel avant de fixer le prix.

### C. Boost — achat ponctuel
Donner temporairement plus de visibilité à un profil éligible. Afficher clairement la durée, la portée et le caractère sponsorisé. Le Boost ne doit jamais contourner les blocages, préférences, profils privés, règles anti-harcèlement ou protections des membres. Prévoir des limites de fréquence.

### D. Appels et options ponctuelles
Ne facturer que des appels réellement disponibles et testés sur les réseaux et appareils ciblés. Annoncer avant achat le prix, le temps inclus, les éventuels frais et la procédure de remboursement. Aucun paiement si le service est indisponible.

### E. Parrainage
Récompenser une invitation seulement après une activation authentique (compte vérifié, profil complété et activité normale après une période de contrôle). Plafonner les récompenses. Bloquer auto-parrainage, comptes multiples, numéros temporaires et boucles de recrutement. Le budget de récompense doit rester inférieur à la marge attendue. Aucun système pyramidal ni paiement pour recruter des recruteurs.

### F. Partenariats locaux et publicité
Après obtention d'une audience active, vendre des campagnes clairement marquées « Sponsorisé » à des commerces et organisateurs locaux : événements, restaurants, loisirs, services et offres utiles. Commencer par quelques campagnes pilotes à prix fixe et durée courte. Ne jamais vendre les messages privés, les numéros, les préférences relationnelles ou les données personnelles. Pas de ciblage sensible.

## 3. Prix : méthode, pas supposition

Ne pas copier aveuglément les tarifs étrangers et ne pas annoncer de prix avant d'avoir calculé :
1. frais réels du moyen de paiement et du retrait ;
2. coût d'infrastructure par membre actif ;
3. assistance, modération, fraude et remboursements ;
4. pouvoir d'achat et retours d'un petit panel local ;
5. marge nette nécessaire.

Tester plusieurs propositions auprès d'un petit groupe sans encaisser d'argent. Choisir un prix simple en CDF et, si utile, un équivalent USD clairement daté. Afficher les frais totaux avant confirmation.

## 4. Plan d'acquisition à Lubumbashi

### Boucle organique
- Créer une page publique de présentation claire et mobile-first.
- Publier des conseils utiles sur les rencontres respectueuses, la sécurité et les profils de qualité.
- Demander aux premiers membres satisfaits de partager un lien d'invitation personnel.
- Nouer des partenariats avec associations étudiantes, communautés, organisateurs d'événements et commerces, sans exposer les membres.
- Utiliser des QR codes et liens traçables par campagne ; mesurer les inscriptions vérifiées et les membres actifs, pas seulement les clics.

### Programme ambassadeurs
- Recruter un petit groupe d'ambassadeurs identifiés.
- Fournir un code ou lien individuel, une charte anti-spam et un kit de communication.
- Rémunérer sur des résultats vérifiés et plafonnés, jamais sur le recrutement d'autres ambassadeurs.
- Suspendre les récompenses en cas de fraude ou de plaintes.

### Vente B2B locale
- Constituer une liste de prospects publics et pertinents.
- Contacter chaque commerce individuellement avec une proposition courte.
- Vendre un pilote mesurable : une campagne, une période, un emplacement, un rapport simple.
- Obtenir l'accord écrit sur le visuel, le texte, le prix et la période.
- Renouveler uniquement si le commerçant obtient des résultats mesurables.

## 5. Mesures hebdomadaires

Tableau de bord minimum :
- nouveaux comptes vérifiés ;
- membres actifs sur 7 jours et 30 jours ;
- profils complétés ;
- taux de première conversation ;
- rétention à 7 et 30 jours ;
- signalements et délai de traitement ;
- conversion Premium et renouvellement ;
- achats Boost et utilisation effective ;
- paiements réellement encaissés, frais, remboursements et marge nette ;
- coût d'acquisition par membre activé.

Ne pas confondre paiements initiés, notifications de paiement et fonds effectivement reçus et rapprochés.

## 6. Séquence d'exécution

### Phase 0 — sécurité et fiabilité (bloquante)
- Vérifier une sauvegarde de production et réaliser une restauration sur environnement isolé.
- Tester les permissions avec des comptes anon, membre ordinaire et administrateur.
- Auditer les fonctions SECURITY DEFINER, les policies RLS et l'exposition des RPC.
- Tester inscription, vérification SMS, connexion, suppression de compte, blocage et signalement.
- Confirmer le comportement mobile, réseau lent et mode PWA.
- Garder Match en staging tant que ces contrôles ne sont pas terminés.

### Phase 1 — pilote gratuit
- Ouvrir à un petit groupe réel et consentant.
- Collecter les retours avec consentement.
- Corriger les bugs et mesurer rétention et qualité des conversations.
- Ne pas lancer de publicité payante si le service ne retient pas encore ses membres.

### Phase 2 — test commercial contrôlé
- Tester Premium auprès d'un petit groupe, avec prix et conditions visibles.
- Vérifier le paiement de bout en bout en environnement de test.
- Préparer reçus, support, annulation et remboursements.
- Vérifier le rapprochement quotidien des transactions.

### Phase 3 — montée en charge
- Activer Boost après validation de Premium et des protections anti-abus.
- Introduire les campagnes locales sponsorisées lorsque l'audience est suffisante.
- Augmenter les dépenses d'acquisition uniquement si la valeur vie client et la marge sont positives.

## 7. Paiements : garde-fous spécifiques

- Aucun changement de SIM, titulaire, compte Airtel Money, Visa, clé API ou webhook sans vérification et autorisation explicite.
- Avant intégration : vérifier le titulaire légal, l'accès au compte, les frais, limites, règlement, disponibilité RDC, procédure de litige et conformité du fournisseur.
- Utiliser des clés séparées test/production et des secrets côté serveur uniquement.
- Vérifier les webhooks par signature, idempotence, montant, devise, référence et statut fournisseur.
- Ne jamais activer une offre payante sur la seule base d'une capture d'écran ou d'une réponse client.
- Faire un rapprochement des fonds reçus avant d'accorder l'entitlement.

## 8. Règles de confiance

La stratégie interne, les marges et les négociations commerciales peuvent rester confidentielles. En revanche, le prix, le renouvellement, les frais, le caractère publicitaire, les règles d'éligibilité et l'usage des données doivent être transparents pour les membres.

## 9. Conditions de lancement

Aucun lancement commercial complet tant que les éléments suivants ne sont pas vrais :
- restauration de sauvegarde vérifiée ;
- aucun accès non autorisé aux données privées ;
- parcours inscription/SMS et suppression de compte validés ;
- paiements testés de bout en bout et rapprochement vérifié ;
- conditions, support et remboursements prêts ;
- indicateurs de rétention et de sécurité suivis ;
- plan de retour arrière documenté.

## 10. Décisions déjà prises à préserver

- Le site public actuel reste la cible de production.
- Les fonctionnalités de base restent gratuites au lancement.
- Premium, Boost et appels restent payants lorsqu'ils seront disponibles et activés.
- La configuration Airtel Money/Visa demeure en attente des vérifications nécessaires.
- Ne pas importer de données de production dans l'environnement Match de test.
- Ne pas fusionner ou déployer la PR Match uniquement parce que les tests automatisés passent.
