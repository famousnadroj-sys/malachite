# Malachite — plan de mise en ligne immédiate

Dernière révision : 20 novembre 2026  
Dépôt : `famousnadroj-sys/malachite`  
Branche de préparation : `work/ai-manager-payment-ux-2026-11-20`

## Objectif opérationnel

Préparer le site comme si la mise en ligne devait avoir lieu dès demain. La date seule ne donne jamais le feu vert : aucun lancement si un contrôle critique reste rouge.

## Règle de publication

- Objectif : disponibilité dès demain, uniquement si tous les critères GO sont vérifiés.
- La mise en ligne reste bloquée tant qu'un point critique est non testé ou non sécurisé.
- Les changements de cette branche ne sont pas fusionnés dans `main`.
- Les migrations RPC, reçus additifs et optimisation support ont maintenant été appliquées et vérifiées en production ; la politique stricte des reçus reste différée jusqu'au déploiement du frontend compatible.
- Aucun fournisseur IA ou paiement marchand n'a été activé ; aucune dépense payante n'a été engagée.

## État vérifié au 20 novembre

| Domaine | État constaté | Ce qu'il reste à faire |
|---|---|---|
| Frontend | Application web/PWA dans `index.html`, avec scripts et avatar builder séparés | Tests réels Android, navigation, réseau lent, accessibilité |
| Premium | Affichage à 2 USD / 30 jours dans la branche | Valider devise, montant réellement encaissé, renouvellement et mentions commerciales |
| Airtel / Orange | Choix d'opérateur et références déclarées dans l'interface | Vérifier l'éligibilité marchand, obtenir les accès officiels et tester sandbox |
| Paiement | Colonne `receipt_path`, bucket privé, règles Storage et index anti-doublon appliqués ; validation manuelle admin via RPC | Déployer le nouveau frontend, appliquer ensuite la politique stricte, tester avec deux comptes et confirmer manuellement les transferts ; webhook marchand toujours à faire |
| Reçus | Schéma et bucket privé présents en production ; ancienne politique INSERT maintenue temporairement pour compatibilité | Déployer le frontend compatible, appliquer la politique stricte après vérification de la mise à jour PWA et réaliser les tests multi-comptes |
| AI Manager | Panneau de prévisualisation uniquement ; aucune fonction IA n'est déployée | Fournisseur IA et secret serveur, Edge Function authentifiée, tâches planifiées, outils autorisés, journal d'audit, tests et budget |
| Modération | Tables signalements/suspensions et Edge Function admin existantes | Vérifier les cas limites, recours, notification et protection contre abus |
| Sécurité | RPC paiement restreintes à `authenticated` ; optimisation RLS et index support appliqués ; alerte `start_call_session` et protection des mots de passe compromis encore à traiter | Revue dédiée `start_call_session`, activation Auth via Dashboard, tests négatifs multi-comptes et nouvelle lecture des advisors |
| Déploiement | Workflow GitHub Actions de validation présent | Exécuter CI sur PR, tester le build et répéter le parcours de déploiement sans publier |

## Paiements — règle impérative

Une référence saisie ou une capture d'écran n'est pas une confirmation bancaire. L'OCR peut aider à extraire montant, date, référence et opérateur, mais seul un statut de transaction vérifié auprès de l'opérateur ou d'un agrégateur contractuellement autorisé peut déclencher Premium automatiquement.

Avant toute intégration réelle :
1. Obtenir le statut de marchand et les documents KYC exigés.
2. Confirmer que le compte de réception et le nom du bénéficiaire sont autorisés pour les encaissements commerciaux.
3. Obtenir une documentation API officielle, les identifiants sandbox et les règles de webhook.
4. Tester les paiements réussis, échoués, expirés, remboursés, doublons et callbacks rejoués.
5. Vérifier côté serveur le montant, la devise, le destinataire, l'identifiant unique, le statut et la signature.
6. Activer l'abonnement une seule fois, de manière atomique et idempotente.
7. Ne jamais demander le PIN, OTP ou mot de passe Mobile Money au client.

**Blocage commercial connu :** les informations officielles Orange Money Web Payment décrivent une offre réservée aux marchands inscrits et officiellement enregistrés ; la disponibilité RDC est indiquée, mais l'accès passe par une souscription marchand. Airtel Africa présente son portail API pour les commerçants qui collectent des paiements. Des comptes personnels seuls ne démontrent donc pas l'éligibilité. Ne pas coder une fausse intégration API en attendant l'accès réel.

## AI Manager — périmètre sûr de première version

L'agent ne doit pas être un administrateur omnipotent. Architecture attendue :
- Edge Functions authentifiées comme façade serveur ;
- règles métier déterministes en base avant toute action ;
- modèle IA uniquement pour classifier, résumer et proposer ;
- liste blanche d'outils, permissions minimales et limites d'appels ;
- journal immuable : demande, données minimales consultées, proposition, décision, résultat, horodatage ;
- mode simulation avant toute action réelle ;
- alerte humaine pour les paiements ambigus, suspensions, remboursements, suppression de données et décisions définitives.

Actions pouvant être automatisées après validation :
- FAQ et support à faible risque avec réponses issues d'une base approuvée ;
- classement des avis et signalements ;
- détection de doublons/anomalies de paiement ;
- activation d'un abonnement seulement après confirmation officielle.

Actions qui exigent une validation humaine :
- suspension longue ou bannissement ;
- remboursement, transfert, modification des coordonnées de réception ;
- suppression de compte ou données ;
- contestation de paiement et cas de fraude incertains.

Un agent 24/7 nécessite un déclencheur serveur, une file de tâches ou un planificateur et un fournisseur IA accessible côté serveur. Une page web ouverte sur le téléphone ou une conversation ChatGPT ne constitue pas un service autonome permanent. Les clés ne doivent jamais être dans `index.html` ni dans Git.

## Ordre de traitement immédiat

1. Corriger et vérifier tous les blocages de sécurité et de compatibilité avec la base active.
2. Appliquer les migrations de reçus sur un environnement de test, puis exécuter les tests RLS et le parcours paiement complet.
3. Obtenir les accès marchands officiels Airtel/Orange et tester les callbacks signés ; sinon maintenir le paiement manuel sans activation automatique.
4. Connecter l'AI Manager côté serveur avec un secret fournisseur, une liste d'outils autorisés, des limites et un journal d'audit ; garder les actions sensibles en approbation humaine.
5. Tester inscription, connexion, profil, avatar, découverte, messagerie, blocage, signalement, appels, Premium, support et suppression de compte sur Android.
6. Vérifier confidentialité, conditions d'utilisation, politique de sécurité, restauration de sauvegarde, monitoring et procédure de retour arrière.
7. Répéter le déploiement sur un environnement de test, puis publier seulement après feu vert final du propriétaire.

## Critères GO / NO-GO

La publication est bloquée si l'un des points suivants est vrai :
- un paiement réel peut activer Premium sans confirmation indépendante ;
- une clé privilégiée est exposée au navigateur ou au dépôt ;
- un utilisateur peut lire ou modifier les données d'un autre compte sans autorisation ;
- les fonctions de signalement, blocage, suspension et recours ne sont pas testées ;
- la restauration d'une sauvegarde n'a pas été vérifiée ;
- une erreur critique empêche inscription, connexion, profil, messagerie ou paiement ;
- le support, les règles de confidentialité, les conditions d'utilisation et les règles de modération ne sont pas publiés ;
- l'accès marchand ou le mode d'encaissement légal n'est pas confirmé.

## Tests obligatoires

- Inscription, connexion, récupération de compte, déconnexion et expiration de session.
- Profil public/privé, avatar, photos et suppression de compte.
- Messagerie, médias, blocage, signalement, match et appels.
- Premium : achat, refus, doublon, renouvellement, expiration et restauration des droits.
- RLS : tentatives de lecture/écriture avec deux comptes différents et compte non connecté.
- Admin : utilisateur non admin refusé, auto-modération refusée, action journalisée.
- Mobile : Android petit écran, réseau lent, perte réseau, reprise et PWA.
- Sécurité : secrets, stockage privé, CORS, validation des entrées, limitation de débit.
- Reprise : sauvegarde, restauration réelle et procédure de retour arrière.

## Coûts et dépendances

- Le code et les tests locaux/CI peuvent être préparés sans activer un fournisseur payant.
- Le coût d'un agent IA permanent, des notifications, de l'hébergement, du stockage et des transactions dépend des fournisseurs, volumes et plans réellement retenus.
- Aucun abonnement, API payante ou service marchand ne sera activé sans devis/conditions et accord explicite.

## Journal de décision

- 20 nov. 2026 : priorité modifiée en préparation immédiate, avec objectif opérationnel dès demain et décision GO/NO-GO fondée sur les tests.
- 20 nov. 2026 : préparation isolée autorisée ; publication non immédiate.
- 20 nov. 2026 : aucun paiement automatisé déclaré opérationnel tant que les webhooks officiels ne sont pas intégrés et testés.


## État de vérification — 20 novembre 2026

- Les six blocs JavaScript du frontend ont été analysés avec le parseur Node.js : aucune erreur de syntaxe détectée.
- Le formulaire de paiement transmet l'offre, l'opérateur, la référence et le chemin du justificatif privé ; la preuve est téléversée avant l'insertion de la demande.
- Le workflow GitHub Actions le plus récent est vert : validation JavaScript, contrôle de l'Edge Function et analyse syntaxique des migrations SQL.
- Le contrôle CI du commit `b6e51cf54a7846da0d8538fe3859ee40996e9d2c` est vert (run 44806673988).
- Les migrations RPC, reçus additifs et optimisation support sont appliquées en production ; les 7 paiements existants sont restés intacts.
- La politique stricte de paiement avec justificatif n'est pas encore appliquée : elle attend le déploiement du frontend qui téléverse effectivement le reçu.
- Les tests réels Android, les tests multi-comptes RLS et la restauration restent non réalisés.
