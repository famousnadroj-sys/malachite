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

## 3. Architecture cible proposée pour la messagerie

Introduire un identifiant de conversation stable, indépendant des comptes :

- `conversations` : une ligne par fil de discussion, avec un identifiant UUID stable et des métadonnées minimales ;
- `conversation_members` : appartenance et état d’accès de chaque participant ;
- `messages.conversation_id` : référence stable vers le fil ;
- `messages.sender_id` : nullable après anonymisation, avec une date d’anonymisation explicite ;
- `messages.sender_deleted_at` (ou état équivalent) : permet au client d’afficher « Compte supprimé » sans rechercher un profil ;
- `messages.media_owner_id` : à ajouter si nécessaire pour déterminer le propriétaire d’un fichier indépendamment de l’auteur visible du message.

Contraintes de conception :
1. Les lignes de conversation et les messages ne doivent pas être supprimés en cascade à cause de la suppression d’un participant.
2. La suppression d’un compte retire son appartenance et ses droits d’accès ; elle ne retire pas l’appartenance de l’autre membre.
3. Les messages de l’ancien membre sont conservés pour l’autre membre uniquement si la règle de conservation est validée ; leur auteur est anonymisé.
4. Les messages de l’autre membre ne sont pas réattribués à l’ancien membre.
5. Les lectures RLS doivent exiger une appartenance active au fil. Un utilisateur supprimé ne peut plus se connecter ni relire ses anciennes conversations.
6. Les anciennes colonnes `de`/`a` restent compatibles pendant une période de transition, puis ne sont retirées qu’après migration et validation de tous les clients.
7. Les notifications, accusés de lecture, appels et médias doivent être adaptés au nouveau modèle avant l’activation.

Une conversation à deux participants est le périmètre actuel. Toute évolution vers les groupes doit être conçue séparément.

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

Le fichier `supabase/tests/account_deletion_behavior_contract.sql` ajoute un test jetable qui modélise la conservation des messages, l’anonymisation de l’expéditeur, le retrait de son appartenance et l’isolation d’une conversation tierce.

**Résultat vérifié :** le contrat comportemental a été exécuté avec succès sur PostgreSQL 17 jetable par GitHub Actions (run `45485434783`, commit `3f1045618adaef1148f4eddec212ac70c99519df`). Le test utilise uniquement des tables temporaires et vérifie la conservation des messages, l’anonymisation de l’expéditeur, le retrait de l’appartenance, la relance sans effet destructif et l’isolation d’une conversation tierce.

**Limite importante :** ce succès valide uniquement le contrat simulé. Il ne valide pas les vrais triggers, les politiques RLS, les politiques Storage, les reçus de lecture, les appels ni le workflow Auth de production. Il ne constitue donc pas une validation de la suppression réelle d’un compte.

L’inspection en lecture seule de la base confirme notamment :
- `messages.de` et `messages.a` sont obligatoires ; le trigger `limite_messages()` rejette un expéditeur différent de `auth.uid()` et construit le chemin média à partir de `de` et `a` ;
- le trigger de notification utilise `new.de` comme auteur ;
- les politiques RLS de `messages` et `message_receipts` reposent sur `de` et `a` ;
- les reçus de lecture exigent encore que le message conserve les identifiants d’origine.

Cela confirme qu’une simple anonymisation de `de` dans la table actuelle casserait les fonctions existantes. Le modèle de conversation stable décrit plus haut est donc nécessaire avant toute suppression effective.

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
