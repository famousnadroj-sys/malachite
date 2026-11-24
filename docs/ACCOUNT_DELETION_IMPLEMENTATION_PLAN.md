# MALACHITE — Plan technique de suppression et d’anonymisation des comptes

**Statut :** conception préparatoire uniquement — non déployée, non appliquée à Supabase.  
**Branche :** `security/account-deletion-design-v1`  
**Base :** tête de la PR #113 (`44c26f8b16617feddec37a958e77379ebbe2a884`).

## 1. Décision produit

Lorsqu’un membre supprime son compte :
- ses données de profil et ses identifiants actifs sont supprimés, sauf conservation légalement justifiée et documentée ;
- les conversations des autres membres ne sont pas détruites par cascade ;
- les messages déjà reçus par un autre membre peuvent rester visibles sous une identité neutre « Compte supprimé » ;
- les médias personnels ne sont pas conservés automatiquement : leur propriétaire, leur contenu, leur usage dans la conversation et la justification d’une éventuelle conservation doivent être évalués séparément ;
- les justificatifs de paiement ne sont conservés que si une obligation ou une finalité légitime documentée l’exige, dans une archive séparée et à accès restreint ;
- les signalements nécessaires à la sécurité ou à un litige suivent une règle de conservation distincte et limitée.

Ce document est une spécification technique provisoire, pas une politique juridique publiée. Les durées de conservation et bases juridiques doivent être validées par un juriste/comptable en RDC.

## 2. Constat technique vérifié sur le schéma actuel

La table `public.messages` contient actuellement `de` et `a` comme UUID obligatoires. Le client reconstruit les conversations en filtrant ces deux identifiants et le rendu dépend de ces valeurs. Une anonymisation naïve par `de = NULL` ferait donc perdre au destinataire l’accès à une partie de son fil.

Le trigger `public.limite_messages()` utilise également `new.de` pour valider l’expéditeur, les quotas et le chemin des médias. Le trigger `private.notify_new_member_message()` utilise `new.de` pour attribuer l’auteur de la notification. Les politiques RLS et Storage actuelles utilisent aussi les identifiants `de` et `a`.

**Conclusion :** ne pas rendre `messages.de` nullable ni supprimer un compte avant une migration coordonnée du modèle de conversation, des triggers, des politiques RLS, du stockage et du frontend.

### Inventaire complémentaire vérifié en lecture seule

Les politiques RLS actuellement présentes sur les tables concernées couvrent notamment `messages`, `message_receipts`, `rendez_vous`, `avis_match`, `avis_site`, `paiements`, `signalements`, `profiles` et plusieurs règles sur `storage.objects`. Elles reposent sur les identifiants de compte actuels ; elles devront être revues ensemble, et non remplacées isolément.

Les triggers vérifiés comprennent :
- `messages` : `limite_messages` et `notify_new_member_message` ;
- `rendez_vous` : `limite_rdv` ;
- `avis_match` : `enforce_match_daily_like_limit` ;
- `paiements` : notifications de paiement et push administrateur ;
- `signalements` : garde anti-doublon/anti-abus et journalisation admin ;
- `storage.objects` : protection de suppression et mise à jour des métadonnées.

Une recherche en lecture seule des fonctions `public` et `private` par noms usuels de suppression de compte n’a retourné aucune fonction correspondante. Cela ne prouve pas qu’aucun endpoint applicatif ou mécanisme externe n’existe ; les Edge Functions, le frontend et les tâches planifiées doivent encore être inventoriés avant d’affirmer qu’aucune suppression n’est déjà proposée.

## 3. Architecture cible proposée pour la messagerie

Introduire un identifiant de conversation stable, indépendant des UUID des comptes conservés :

- `conversation_threads` : ligne par fil, identifiant UUID stable et métadonnées minimales ; aucune colonne de participant.
- `conversation_pair_index` : index canonique temporaire de paire (`member_low/member_high`) vers `conversation_id`, avec FK Auth en cascade. Cet index sert à retrouver/créer un fil privé à deux.
- `conversation_members` : appartenance et état d’accès ; FK Auth en cascade pour que le compte supprimé perde son appartenance sans supprimer celle du membre restant.
- `messages.conversation_id` : référence stable vers le fil.
- `messages.sender_id` : nullable après anonymisation, avec FK `ON DELETE SET NULL` et date d’anonymisation explicite.
- `messages.sender_deleted_at` : permet au client d’afficher « Compte supprimé » sans rechercher un profil.
- `messages.de/a` : restent obligatoires pendant la transition ; après migration complète du frontend, des triggers, des notifications, des politiques RLS/Storage et des reçus, les deux colonnes deviennent nullables. Pour un compte supprimé A, mettre `de = NULL` sur ses messages envoyés et `a = NULL` sur les messages qui lui étaient adressés. Ne traiter que `de` laisserait l'identifiant du destinataire dans les messages.
- `messages.media_owner_id` : à ajouter seulement si nécessaire après inventaire de la propriété réelle des objets.
Contraintes de conception :
1. Les lignes de conversation et les messages ne doivent pas être supprimés en cascade à cause de la suppression d’un participant.
2. La suppression d’un compte retire son appartenance et ses droits d’accès ; elle ne retire pas l’appartenance de l’autre membre.
3. Les messages de l’ancien membre sont conservés pour l’autre membre uniquement si la règle de conservation est validée ; leur auteur est anonymisé.
4. Les messages de l’autre membre ne sont pas réattribués à l’ancien membre.
5. Les lectures RLS doivent exiger une appartenance active au fil. Un utilisateur supprimé ne peut plus se connecter ni relire ses anciennes conversations.
6. Les anciennes colonnes `de`/`a` restent compatibles pendant une période de transition, puis ne sont retirées qu’après migration et validation de tous les clients.
7. Les notifications, accusés de lecture, appels et médias doivent être adaptés au nouveau modèle avant l’activation.

Une conversation à deux participants est le périmètre actuel. Toute évolution vers les groupes doit être conçue séparément.

### Anonymisation des deux extrémités historiques

Après bascule complète vers `conversation_id` et `sender_id`, le workflow doit anonymiser les deux anciennes colonnes de paire :

- `messages.de = NULL` pour les messages envoyés par le compte supprimé ;
- `messages.a = NULL` pour les messages adressés au compte supprimé ;
- `messages.sender_id = NULL` et `sender_deleted_at = now()` uniquement lorsque le compte supprimé était l'auteur ;
- conserver `conversation_id` et le contenu du message si la règle de conservation l'autorise.

Cette opération est impossible tant que l'ancien frontend, les triggers, les reçus, le polling, les canaux Realtime ou les politiques RLS dépendent de `de/a`. La migration doit d'abord retirer ces dépendances et rendre les colonnes nullables dans une migration distincte.

## 4. Traitement par catégorie

| Catégorie | Traitement cible | Garde-fou |
|---|---|---|
| Profil, bio, préférences, présence | Suppression | Purger aussi les caches et projections publiques |
| Photos et avatars | Suppression des objets appartenant au compte | Vérifier chaque chemin et propriétaire avant suppression |
| Messages texte | Préserver le fil du membre restant, anonymiser l’auteur supprimé lorsque la conservation est autorisée | Aucun effacement en cascade du fil partagé |
| Médias de chat | Suppression par défaut si le compte supprimé en est propriétaire, sauf exception justifiée | Laisser un message/aperçu neutre indiquant que le média n’est plus disponible |
| Rendez-vous futurs | Annuler les rendez-vous en attente ou confirmés et informer le membre restant sans divulguer de données supprimées | Définir séparément le sort des rendez-vous passés et des litiges |
| Avis de match / likes | Retirer les préférences personnelles de l’ancien compte | Ne pas laisser d’identifiant UUID orphelin |
| Avis sur le site | Supprimer ou anonymiser selon la finalité de publication | Ne pas conserver nom, profil ou identifiant direct sans justification |
| Signalements | Préserver un dossier nécessaire à la sécurité, avec accès limité | Anonymiser les identifiants non nécessaires et définir une durée |
| Paiements et reçus | Détacher l’identité du compte actif et archiver uniquement les pièces nécessaires | Ne pas supprimer ni conserver tout le dossier par défaut |
| Blocages / déblocages | Supprimer les préférences de l’ancien compte | Vérifier les deux côtés de la relation |
| Notifications | Supprimer celles destinées au compte supprimé | Préserver uniquement les journaux strictement nécessaires |
| Journaux admin / sécurité | Garder un minimum de preuve non sensible si nécessaire | Pas de copie de messages privés ni de profil complet |
| Sauvegardes | Appliquer les suppressions à l’expiration ou au cycle documenté | Empêcher la restauration de réactiver un compte supprimé |

## 5. Ordre obligatoire de la procédure

La suppression doit être un workflow serveur idempotent, avec état et reprise après erreur :

1. Réauthentifier le demandeur et vérifier qu’il confirme explicitement la suppression définitive.
2. Créer une demande avec identifiant d’opération non sensible ; empêcher les connexions et nouvelles écritures.
3. Révoquer les sessions, jetons et accès aux appels.
4. Identifier les conversations et participants ; retirer l’appartenance du demandeur et anonymiser les messages concernés selon la politique validée.
5. Annuler les rendez-vous futurs et traiter les avis, likes, blocages, notifications et signalements selon leurs règles.
6. Inventorier les objets Storage appartenant réellement au compte ; supprimer uniquement les objets autorisés par la politique.
7. Isoler les justificatifs de paiement qui doivent être conservés, sans garder le profil actif ni ses identifiants directs.
8. Supprimer les données de profil et les identifiants de connexion qui ne doivent plus subsister.
9. Supprimer le compte Auth en dernier, après vérification de toutes les dépendances.
10. Vérifier les résultats, journaliser le minimum nécessaire et garantir qu’une restauration ne ressuscite pas le compte.

Chaque étape doit être transactionnelle lorsque possible, sinon reprise sans double suppression ni effet secondaire.

## 6. Tests obligatoires en environnement jetable

Utiliser deux comptes synthétiques A et B, deux appareils simulés et des fichiers factices. Aucun compte réel ni objet Storage de production ne doit être touché.

### Messagerie
- A et B échangent plusieurs messages texte et médias.
- A supprime son compte.
- B voit toujours les messages texte conservés, avec l’auteur neutre.
- B ne voit plus le profil, l’avatar ou les données privées de A.
- Les médias supprimés affichent un état « média indisponible » et ne délivrent aucun lien signé.
- B peut continuer à utiliser le fil selon la règle produit.
- A ne peut plus s’authentifier ni lire le fil.
- Les conversations sans lien avec A ne sont pas modifiées.

### Données partagées et autres catégories
- Les rendez-vous futurs sont annulés et le membre restant reçoit une notification neutre.
- Les rendez-vous passés suivent une règle documentée.
- Les signalements de sécurité ne sont pas détruits par cascade.
- Les paiements et reçus nécessaires restent consultables uniquement par les rôles autorisés.
- Les photos personnelles et fichiers appartenant à B ne sont jamais supprimés.
- Les préférences propres à A sont supprimées.
- Les références administratives restent cohérentes et ne contiennent pas d’identifiant personnel inutile.

### Résilience et sécurité
- Relancer deux fois la même opération ne produit pas d’erreur destructive.
- Interrompre le workflow à chaque étape puis le reprendre.
- Vérifier les droits anon, authenticated et admin sur chaque table et bucket.
- Tester les politiques RLS avec A, B, un troisième compte C et un administrateur.
- Vérifier qu’un utilisateur ne peut pas changer de `conversation_id` pour lire un fil tiers.
- Vérifier les notifications, reçus de lecture, appels et URLs signées.
- Restaurer une sauvegarde de test et confirmer qu’un compte supprimé ne réapparaît pas.

## 7. État réel des tests préparatoires

Les contrats de comportement, RLS, backfill, schéma de messagerie et migration Phase A sont exécutés par GitHub Actions sur PostgreSQL 17 jetable. Le run `45491495220` a terminé avec `success` sur le commit `990df8fb861d2cc3dfecd4e543b786cea0a57f24`.

Un test complémentaire a été exécuté sur le projet Supabase distinct `malachite-match-test` (`sbawknyxcjslvhknomkd`), vide de comptes et de messages avant l'essai. Ce projet contenait 51 migrations de schéma, dont les triggers et policies réels de messagerie, médias et reçus. Le brouillon Phase A a été appliqué uniquement à ce projet de test sous le nom `account_deletion_phase_a_conversation_threads_test` (version `20261124213104`).

Dans une transaction annulée, le test a utilisé des comptes synthétiques A/B/C/D/E, dont E sans profil, des messages dans les deux sens, un appel Jitsi, un reçu de livraison et les vrais triggers/RLS du projet de test. Résultats vérifiés :
- 5 messages rattachés à 3 fils et 6 appartenances ;
- A ne voit que A/B, C ne voit que C/D, B voit ses deux fils ;
- les déclencheurs de message acceptent les messages et le format Jitsi testés ;
- après suppression simulée de A dans Auth, le fil A/B et l'appartenance de B restent, l'index de paire et l'appartenance de A disparaissent, et `sender_id` devient NULL ;
- le reçu lié à A est supprimé par cascade, conformément aux FK actuelles ;
- après `ROLLBACK`, les compteurs Auth, messages, profils, reçus, fils et appartenances sont revenus à zéro.

**Limites :** ce test valide le schéma réel de ce projet de test et ses migrations déjà appliquées ; il ne charge pas l'intégralité de la production, ne valide pas tous les objets Storage ni les Edge Functions, et ne constitue pas une autorisation de déploiement production.

L'historique de production contient 65 migrations et sa dernière version enregistrée est `20261124122733`. Vingt-quatre migrations plus récentes de la branche ne sont pas enregistrées comme appliquées en production. Elles doivent être auditées et testées dans l'ordre ; ne pas supposer que les protections de ces fichiers sont déjà actives.

Les reçus `message_receipts` ont des FK Auth `ON DELETE CASCADE` sur `sender_id` et `recipient_id`. Le comportement actuel est donc leur suppression quand l'un des participants est supprimé. Si le produit doit conserver des états de livraison/lecture anonymisés, une phase dédiée devra changer ces dépendances avant suppression Auth.

Rapports détaillés :
- [Rapport de tests RLS et Phase A](ACCOUNT_DELETION_RLS_TEST_REPORT.md)
- [Plan d'intégration du schéma de conversation](ACCOUNT_DELETION_CONVERSATION_SCHEMA_BLUEPRINT.md)

## 8. Conditions de passage en production

Aucun déploiement avant :
- inventaire exhaustif des tables, fonctions, triggers, politiques RLS, buckets et chemins de fichiers ;
- migration additive et rétrocompatible ;
- mise à jour et déploiement coordonnés du frontend ;
- tests automatisés réussis sur une base jetable ;
- tests réels avec deux comptes de test distincts ;
- plan de sauvegarde et retour arrière ;
- validation juridique et comptable des durées de conservation ;
- validation explicite avant toute migration de production.

## 9. Hors périmètre de ce commit

Ce document n’ajoute aucune migration SQL, ne change aucun trigger, ne modifie aucune politique RLS, ne déploie aucune Edge Function et ne supprime aucune donnée. La migration existante `20261124120000_account_deletion_fk_cleanup.sql` ne prépare que trois références administratives avec `ON DELETE SET NULL` ; elle ne réalise pas la suppression de compte.

**État production vérifié en lecture seule le 24 novembre 2026 :** l’historique Supabase du projet de production contient déjà `account_deletion_fk_cleanup`. Les trois contraintes `campagnes.cree_par`, `demandes_support.traite_par` et `signalements.traite_par` ont été relues dans `pg_constraint` et sont bien en `ON DELETE SET NULL`. Ce changement limité est donc déjà présent en production ; il ne faut pas le confondre avec une procédure complète de suppression de compte. Aucune autre migration de suppression complète n’apparaît dans l’historique consulté.
