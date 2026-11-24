# MALACHITE — Inventaire des dépendances frontend avant migration de messagerie

**Statut :** inventaire technique de la branche `security/account-deletion-design-v1`, sans modification du frontend.
**Fichier analysé :** `app-core.js` (SHA `5d946664313fa0d95f0c5b228eeb9419bea434ee`).
**Date :** 24 novembre 2026.

## 1. Lectures et pagination

Le client utilise encore `messages.de/a` partout :

- `loadChat()` : filtre les deux directions par paire `de/a`, charge les 60 derniers messages puis les nouveaux par `id`.
- `loadOlderMessages()` : pagination historique sur la même paire et le curseur `id`.
- `openLinkedMessage()` : recherche le message dans la paire, puis vérifie encore `de/a` pour confirmer le participant.
- Liste des conversations : charge les 200 derniers messages et déduit l'autre personne à partir de `de/a`.
- Polling de secours : charge les messages globaux avec `de/a`.
- Notifications de livraison : charge les messages reçus par `a = auth.uid()` et `de <> auth.uid()`.

**Conséquence :** rendre `de` nullable ou cesser de renseigner `de/a` avant une version frontend migrée casserait l'historique, la liste des conversations, les liens vers les messages et les reçus entrants.

## 2. Écritures

- `insertChatMessage()` injecte `de = me.id` et `a = target` dans le payload.
- Envoi de médias : upload Storage, puis insertion `de/a/media_url/media_type`; en cas de réponse incertaine, récupération par `de/a/media_url`.
- Stickers et messages texte passent par `insertChatMessage()`.
- `ensureMatchNotice()` insère une notification de match dans `messages` en s'appuyant sur le défaut `de = auth.uid()` et le destinataire `a`.

**Conséquence :** la Phase B doit écrire `conversation_id` et `sender_id` depuis le serveur ou une fonction RPC fiable, tout en maintenant les colonnes historiques pendant la transition. Les appels clients ne doivent pas pouvoir choisir un autre auteur ni créer un fil arbitraire.

## 3. Reçus et notifications

- `loadReceiptsForRows()` lit `message_receipts` par `message_id`.
- `markIncomingReceipts()` crée les reçus avec `sender_id = messages.de` et `recipient_id = auth.uid()`.
- `loadReceiptsForRows()` et `patchReceipt()` identifient les messages sortants par `de = auth.uid()`.
- `handleReceiptEvent()` écoute les reçus dont `sender_id = auth.uid()`.
- Le client suppose donc que `sender_id` des reçus est toujours un UUID Auth valide ; la suppression Auth peut déclencher les FK en cascade.

**Conséquence :** définir la conservation des reçus et migrer leur logique avant de supprimer les comptes Auth. Ne pas anonymiser uniquement `messages.sender_id` en oubliant les reçus.

## 4. Realtime et canaux

- Canal Realtime `msgs-<user>` écoute les insertions `messages.a = user` et `messages.de = user`.
- Le même canal écoute les changements de `message_receipts.sender_id = user`.
- Canal de saisie : `malachite-typing-<UUID1:UUID2>`, avec la paire triée et un payload `user_id`.

**Conséquence :** la migration doit remplacer les filtres Realtime par les colonnes/événements du nouveau modèle et vérifier l'autorisation du canal de saisie. Un simple changement de requête SQL ne suffit pas.

## 5. Médias

- Les pièces jointes de conversation sont uploadées dans le bucket privé `chat-media`.
- Les liens de lecture sont signés côté client avec une durée de 300 secondes.
- En cas d'échec d'insertion après upload, le client tente de supprimer l'objet qui vient d'être uploadé.
- Le modèle de chemin historique observé dans les données est `de/a/...`; les 30 chemins de médias de production examinés suivent cet ordre.
- Les appels `call` utilisent une URL Jitsi, pas un chemin Storage.

**Conséquence :** ne pas reconstruire la propriété d'un fichier à partir du seul nouveau fil. Il faut conserver un propriétaire d'objet indépendant, ou une table de métadonnées de média, et distinguer les URL d'appel des objets Storage.

## 6. Rendez-vous : domaine distinct

`rendez_vous` est lu, créé et répondu indépendamment des messages. Ses politiques RLS et son trigger reposent encore sur `de/a`. Les rendez-vous ne doivent pas être migrés implicitement avec les messages ; leur conservation lors d'une suppression de compte nécessite une décision métier et une migration dédiée.

## 7. Ordre de migration obligatoire

1. Déployer la structure additive et le backfill sans toucher aux colonnes historiques.
2. Ajouter les fonctions/RPC serveur de résolution du fil et de validation de membership.
3. Migrer les lectures, écritures, pagination et liens vers messages.
4. Migrer reçus, notifications, Realtime et canaux de saisie.
5. Migrer la politique Storage et les chemins de médias.
6. Traiter les rendez-vous, signalements, blocages et paiements dans leurs domaines séparés.
7. Exécuter les tests de compatibilité avec les anciennes et nouvelles versions frontend.
8. Seulement après télémétrie et contrôle exhaustif, rendre les colonnes historiques optionnelles puis les retirer dans une migration distincte.

Aucun changement de frontend ou de production n'a été effectué par cet inventaire.
