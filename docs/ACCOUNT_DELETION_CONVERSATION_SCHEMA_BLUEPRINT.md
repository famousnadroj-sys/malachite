# MALACHITE — Brouillon d’intégration du fil de conversation stable

**Statut :** document de conception uniquement. Ce fichier n'est pas une migration exécutable et ne doit pas être appliqué à Supabase.
**Branche de travail :** `security/account-deletion-design-v1`
**Projet Supabase de production :** inspection strictement en lecture seule le 24 novembre 2026.

## 1. Résultat de la vérification du schéma réel

Les colonnes effectivement présentes en production ont été relues dans `information_schema.columns` :

- `public.messages` : `id bigint`, `de uuid NOT NULL DEFAULT auth.uid()`, `a uuid NOT NULL`, `texte text NOT NULL`, `created_at timestamptz`, `media_url text`, `media_type text`.
- `public.message_receipts` : `message_id bigint NOT NULL`, `sender_id uuid NOT NULL`, `recipient_id uuid NOT NULL`, `delivered_at timestamptz NOT NULL`, `read_at timestamptz`.
- `public.rendez_vous` : `de uuid NOT NULL`, `a uuid NOT NULL`, date, lieu, message, lien carte et statut.
- `public.profiles.id` et `public.prives.id` identifient les comptes.
- `public.signalements.de` et `profil` sont obligatoires ; `traite_par` est nullable.
- `public.paiements.user_id` est obligatoire ; `cible` est nullable.

### Dépendances réelles bloquantes

1. Le trigger de production `trg_limite` exécute `public.limite_messages()`. La version relue en production valide `new.de`, les suspensions/blocages, le chemin des médias à partir de `de/a` et le quota gratuit à partir de ces deux colonnes.
2. Le trigger `trg_notify_new_member_message` appelle `private.notify_new_member_message()`, qui utilise `new.de` comme auteur et `new.a` comme destinataire pour créer une notification.
3. La RLS de `messages` autorise la lecture sur la base de `de/a` et l'insertion sur `de = auth.uid()`.
4. Les politiques de `message_receipts` relient explicitement `message_id`, `messages.de`, `messages.a`, `sender_id` et `recipient_id`. Les trois colonnes UUID de reçu sont obligatoires.
5. Les politiques de `rendez_vous` et le trigger `limite_rdv` reposent également sur `de/a`.
6. La migration de branche `20261124180000_secure_chat_message_and_media_access.sql` n'est pas identique à la fonction actuellement relue en production. Il faut comparer et réconcilier les migrations effectivement appliquées avant de construire une migration suivante. Ne pas supposer que le contenu de la branche est déjà en production.

**Conséquence :** ne pas rendre `messages.de` nullable, ne pas anonymiser `de`, ne pas supprimer un utilisateur Auth et ne pas modifier les reçus tant que l'ensemble de ces dépendances n'a pas été migré et testé.

## 2. Modèle cible recommandé

Pour le périmètre actuel (conversation privée entre exactement deux personnes), utiliser un nom cohérent dans toute l'implémentation :

- `public.conversation_threads` : identifiant UUID stable du fil et paire canonique `member_low/member_high`, avec contrainte unique sur la paire et contrainte `member_low < member_high`.
- `public.conversation_members` : `conversation_id`, `user_id`, `active`, dates d'entrée/retrait. Clé primaire `(conversation_id,user_id)`.
- `public.messages.conversation_id` : nullable au départ, FK vers `conversation_threads`.
- `public.messages.sender_id` : nullable uniquement à la fin de la transition ; renseigne l'auteur sans dépendre de `de`.
- `public.messages.sender_deleted_at` : date d'anonymisation.
- Garder `de/a` pendant la transition rétrocompatible. Ne pas les supprimer avant que tous les clients, triggers, fonctions, politiques, notifications et chemins de médias aient migré.

Les noms `conversation_threads` et `conversation_members` sont retenus pour ce brouillon. Ne pas mélanger ces noms avec l'ancien terme générique `conversations` dans les futurs fichiers SQL.

## 3. Séquence de migration — additive et sans interruption

### Phase A — migration additive (pas de suppression ni anonymisation)

1. Créer les deux tables de fil et de membres avec contraintes, index et RLS fermée par défaut.
2. Ajouter `messages.conversation_id` nullable et `messages.sender_id` nullable. Ajouter `sender_deleted_at` nullable.
3. Créer les fils pour les paires historiques valides `de/a`, avec `de IS NOT NULL`, `a IS NOT NULL` et `de <> a`. Canoniser chaque paire par `least(de,a)` / `greatest(de,a)`.
4. Insérer les deux membres pour chaque fil, de façon idempotente (`ON CONFLICT DO NOTHING`).
5. Relier chaque message à son fil et initialiser `sender_id = de`. Vérifier qu'aucun message historique admissible ne reste sans fil.
6. Ne pas forcer immédiatement `conversation_id NOT NULL` : les éventuelles lignes système, données atypiques ou messages orphelins doivent d'abord être identifiés et traités explicitement.

### Phase B — compatibilité applicative

1. Adapter l'envoi pour résoudre/créer le fil canonique, vérifier l'appartenance active et écrire `conversation_id` + `sender_id`. Maintenir `de/a` pendant la période de compatibilité.
2. Adapter les listes, historiques, pagination, recherches, non-lus, reçus de lecture/livraison, notifications, appels et rendez-vous. Les rendez-vous restent un domaine distinct : ne pas les transformer en messages par commodité.
3. Réécrire les triggers de quota, validation, blocage, suspension et notification pour qu'ils valident le membre et le fil, sans faire confiance à un `conversation_id` envoyé par le client.
4. Réécrire les politiques RLS des messages, reçus et objets Storage. Un utilisateur ne peut lire/écrire que si `auth.uid()` est membre actif du fil et que les règles blocage/suspension l'autorisent.
5. Pour les reçus, vérifier le lien entre reçu, message et participant depuis `conversation_id` / `sender_id`. Ne pas rendre les colonnes de reçu nullable sans décision métier distincte ; les FK Auth actuelles peuvent entraîner la suppression en cascade des reçus au moment de la suppression Auth.
6. Migrer les chemins Storage `de/a` vers un identifiant de fil ou un modèle d'accès indépendant des UUID des comptes. Les URLs signées et la suppression de fichiers doivent respecter la propriété réelle de chaque objet.
7. Déployer le frontend compatible et tester les anciens et nouveaux parcours avant de retirer une seule colonne historique.

### Phase C — suppression/anonymisation

1. Bloquer les nouvelles écritures du compte, révoquer les sessions et rendre l'accès impossible pendant le workflow.
2. Retirer le membre supprimé du fil (ou le marquer inactif) sans retirer l'autre membre.
3. Selon la politique de conservation validée, anonymiser uniquement les messages dont le compte supprimé est l'auteur : `sender_id = NULL`, renseigner `sender_deleted_at`. Garder le fil et les messages visibles au membre restant.
4. Supprimer les médias appartenant au compte supprimé selon la politique de propriété et de conservation ; ne pas supprimer un média simplement parce que l'autre participant l'a envoyé ou le possède.
5. Traiter séparément reçus, notifications, rendez-vous, paiements, signalements, blocages, profils et objets Storage.
6. Supprimer l'utilisateur Auth en dernier, après contrôle des dépendances et de la révocation d'accès.
7. Ne rendre `messages.de` nullable ou ne supprimer `de/a` qu'après une période de compatibilité, une vérification exhaustive des références et une procédure de retour arrière validée.

## 4. Cas de données à examiner avant tout backfill

- Messages avec `de` ou `a` NULL (actuellement les colonnes sont NOT NULL, mais confirmer les éventuelles lignes importées/anciennes).
- Messages où `de = a`.
- Messages de type `call` : le `media_url` peut être une URL Jitsi, pas un chemin Storage.
- Messages système ou notices automatiques insérés par des fonctions serveur.
- Messages sans profil correspondant ou avec compte Auth supprimé/orphelin.
- Reçus dont le message correspondant n'existe plus, ou dont sender/recipient ne correspondent plus au message.
- Chemins de médias dont l'ordre des UUID ne correspond pas exactement à `de/a`.
- Conversations historiques où les deux directions sont présentes, et paires où un seul côté a écrit.

Ne pas supprimer automatiquement les lignes qui ne correspondent pas au modèle simple. Les mettre en quarantaine logique pour examen et produire un rapport de comptage avant backfill.

## 4 bis. État agrégé des données de production (lecture seule)

Contrôle agrégé effectué sur la base de production le 24 novembre 2026, sans exporter d'identifiants ni modifier de ligne :

- 70 messages au total.
- 2 messages où `de = a` : ils ne peuvent pas être associés automatiquement à un fil privé A/B sans comprendre leur fonction.
- 2 messages de type `call` : ils utilisent une URL Jitsi et ne doivent pas être traités comme un objet Storage.
- 3 messages dont l'auteur a encore un compte dans `auth.users`, mais n'a plus de ligne `profiles`. Ce ne sont pas des comptes Auth manquants ; leur sémantique doit être identifiée avant le backfill.
- 0 destinataire sans profil et 0 expéditeur sans utilisateur Auth.
- 54 reçus : 0 reçu orphelin et 0 incohérence entre `message_receipts.sender_id/recipient_id` et `messages.de/a`.
- Répartition des messages : 38 sans média, 6 audio, 2 call, 1 document, 15 image, 8 vidéo.

**Décision :** le backfill naïf de toutes les lignes `messages` est interdit. Les deux messages auto-adressés et les trois messages d'auteurs sans profil doivent être identifiés et classés (système, données historiques, cas particulier) avant de les inclure ou de les exclure. Les reçus sont cohérents au moment du contrôle, mais leurs FK Auth en cascade restent un risque au moment de supprimer l'utilisateur.

## 5. Tests d'intégration obligatoires à ajouter

Le test actuel de backfill utilise une structure simulée ; il ne charge pas le vrai schéma ni les triggers de Malachite. Le prochain jeu de tests doit reproduire fidèlement les colonnes, contraintes, fonctions et politiques pertinentes à partir des migrations réelles versionnées.

Scénarios minimum :
- paire A/B dans les deux sens → exactement un fil et deux membres ;
- plusieurs messages dans le même sens → un fil unique ;
- fil C/D isolé → aucune lecture possible par A ou B ;
- A devient inactif/supprimé → A ne lit plus, B conserve les messages autorisés ;
- auteur anonymisé → le message reste visible à B, sans identité ni profil de A ;
- reçu de lecture/livraison avant et après anonymisation → comportement explicite et cohérent, aucune FK orpheline ;
- message `call` et média Storage → règles distinctes, pas de suppression erronée d'une URL Jitsi ;
- message système ou cas atypique → échec fermé/quarantaine, pas d'association inventée ;
- blocage, suspension et quotas → comportement inchangé après migration ;
- relance du backfill → aucun doublon ni changement destructif ;
- deux comptes test et un troisième compte test → RLS vérifiée avec les rôles réels.

## 6. Décisions encore bloquantes

- La politique juridique de conservation et la durée des messages après suppression doivent être validées pour la RDC.
- Le comportement des reçus après suppression (conservation anonymisée, suppression, ou conservation minimale) doit être défini.
- La propriété des médias doit être déterminée à partir des chemins et de l'émetteur réel, pas supposée.
- Le code frontend complet et toutes les Edge Functions/tâches planifiées qui touchent `messages` et `message_receipts` doivent être inventoriés.
- Les différences entre la branche de travail et l'historique réel des migrations de production doivent être réconciliées.

## 7. Garde-fous

- Ce document n'exécute aucune commande SQL et ne change aucune donnée.
- Ne pas lancer `apply_migration`, ne pas déployer d'Edge Function et ne pas modifier la production pendant la phase de conception.
- Ne pas ouvrir/merger la PR ni pousser vers `main` sans revue séparée.
- Les prochaines migrations doivent être testées sur PostgreSQL jetable avec le vrai schéma versionné et sur un projet Supabase de test séparé, jamais sur la base de production.
