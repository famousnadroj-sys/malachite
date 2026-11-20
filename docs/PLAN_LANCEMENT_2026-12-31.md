# Malachite — plan de lancement du 31 décembre 2026

Dernière révision : 20 novembre 2026  
Dépôt : `famousnadroj-sys/malachite`  
Branche de préparation : `work/ai-manager-payment-ux-2026-11-20`

## Décision de calendrier

- Date visée : **jeudi 31 décembre 2026** (heure de Lubumbashi, Africa/Lubumbashi).
- Cette date est une cible, pas une garantie technique ou commerciale.
- Le site reste non publié tant que les critères GO ci-dessous ne sont pas satisfaits.
- Les changements de cette branche ne sont pas fusionnés dans `main`.
- Aucune migration de base, clé secrète, activation de fournisseur, dépense ou mise en production n'est effectuée par ce plan.

## État vérifié au 20 novembre

| Domaine | État constaté | Ce qu'il reste à faire |
|---|---|---|
| Frontend | Application web/PWA dans `index.html`, avec scripts et avatar builder séparés | Tests réels Android, navigation, réseau lent, accessibilité |
| Premium | Affichage à 2 USD / 30 jours dans la branche | Valider devise, montant réellement encaissé, renouvellement et mentions commerciales |
| Airtel / Orange | Choix d'opérateur et références déclarées dans l'interface | Vérifier l'éligibilité marchand, obtenir les accès officiels et tester sandbox |
| Paiement | Demande avec opérateur, référence et justificatif privé ; index anti-doublon préparé ; contrôle manuel admin via RPC | Appliquer les migrations en staging, exécuter `supabase/tests/payment_receipts_security_checks.sql`, tester les politiques RLS, le nettoyage des fichiers orphelins et confirmer les paiements auprès de l'opérateur ; intégration webhook toujours à faire |
| Reçus | Aucune colonne de reçu ni bucket privé confirmé dans le schéma consulté | Concevoir stockage privé, limites MIME/taille, antivirus/validation, accès signé et suppression |
| AI Manager | Panneau de prévisualisation uniquement | Backend agent, outils autorisés, tâches planifiées, journal d'audit, tests et budget |
| Modération | Tables signalements/suspensions et Edge Function admin existantes | Vérifier les cas limites, recours, notification et protection contre abus |
| Sécurité | RLS et migrations présentes ; advisors ont encore des alertes | Revue des alertes, tests négatifs, contrôle de configuration Auth |
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

## Calendrier de travail jusqu'au lancement

| Période | Livrable |
|---|---|
| 20–23 nov. | Audit code/base, inventaire des fonctions, vérification CI, correction des incohérences certaines |
| 24–30 nov. | Décision sur statut marchand et canal de paiement ; collecte des documents opérateurs |
| 1–7 déc. | Implémentation sandbox du canal retenu, stockage privé des reçus si nécessaire |
| 8–14 déc. | Backend AI Manager en mode simulation, permissions minimales et journal d'audit |
| 15–20 déc. | Tests fonctionnels et sécurité, essais sur Android et connexion faible |
| 21–24 déc. | Bêta fermée, retours, corrections bloquantes et sauvegarde/restauration |
| 25–28 déc. | Gel des fonctionnalités, test de restauration, audit final, vérification légale et support |
| 29–30 déc. | Répétition du lancement, vérification des DNS/hébergement, sauvegarde et plan de retour arrière |
| 31 déc. | Publication uniquement si tous les critères GO sont verts et après validation finale du propriétaire |

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

- 20 nov. 2026 : objectif de lancement fixé au 31 déc. 2026.
- 20 nov. 2026 : préparation isolée autorisée ; publication non immédiate.
- 20 nov. 2026 : aucun paiement automatisé déclaré opérationnel tant que les webhooks officiels ne sont pas intégrés et testés.
