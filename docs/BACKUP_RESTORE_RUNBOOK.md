# MALACHITE — procédure de sauvegarde et de restauration

Dernière revue : 24 novembre 2026  
Projet Supabase de production : `tscsmemsvgacqioncash`  
Plan de l'organisation contrôlé : **Free**.

## État de départ (vérifié)

- Le projet est actif et utilise PostgreSQL 17.
- L'organisation est sur le plan Free. Ne pas supposer que des sauvegardes automatiques quotidiennes téléchargeables sont disponibles.
- Une sauvegarde logique CLI seule n'est **pas** une sauvegarde complète : `supabase db dump` exclut les schémas gérés Supabase (`auth`, `storage` et certains schémas d'extensions).
- La base ne contient que les métadonnées Storage ; les objets médias doivent être copiés séparément.
- Aucun export complet ni test de restauration n'a été effectué lors de cette revue. Ne pas marquer la sauvegarde « terminée » avant l'exécution réelle et la vérification.

Références officielles : [Backups](https://supabase.com/docs/guides/platform/backups), [CLI db dump](https://supabase.com/docs/reference/cli/supabase-db-dump), [Download Storage objects](https://supabase.com/docs/guides/storage/management/download-objects).

## 1. Préparer l'export hors production

1. Utiliser un ordinateur de confiance avec disque chiffré et espace suffisant.
2. Installer la version stable actuelle de Supabase CLI et PostgreSQL client.
3. Obtenir la chaîne de connexion **Session pooler** depuis Supabase Dashboard → Connect. Ne jamais la mettre dans Git, un ticket ou un message.
4. La définir dans une variable d'environnement masquée `SUPABASE_DB_URL` et éviter l'historique shell. Ne pas réinitialiser le mot de passe de production pour cette procédure.
5. Créer un dossier daté, privé et non synchronisé publiquement.

## 2. Export logique SQL

Exécuter les commandes séparément et vérifier le code de sortie de chacune :

```bash
supabase db dump --remote="$SUPABASE_DB_URL" -f roles.sql --role-only
supabase db dump --remote="$SUPABASE_DB_URL" -f schema.sql
supabase db dump --remote="$SUPABASE_DB_URL" -f data.sql --use-copy --data-only -x "storage.buckets_vectors" -x "storage.vector_indexes"
```

Ces fichiers sont sensibles : ils peuvent contenir des données personnelles et des données internes. Les garder hors du dépôt Git. Ce dump ne remplace pas un backup Supabase complet des données Auth ni des objets Storage.

## 3. Sauvegarder les objets Storage

Lister les buckets et les objets depuis Storage Dashboard / CLI, puis copier chaque bucket vers le dossier de sauvegarde. Exemple pour un bucket, en adaptant le nom :

```bash
supabase storage cp "ss:///NOM_DU_BUCKET" "./storage/NOM_DU_BUCKET" --recursive --experimental --remote=tscsmemsvgacqioncash
```

Vérifier que le nombre de fichiers téléchargés correspond au nombre d'objets listés et conserver les métadonnées (bucket, chemin, type MIME, taille). Les buckets actuellement connus dans l'audit sont `chat-media`, `profile-photos` et `photos`; confirmer leur présence actuelle avant export.

## 4. Chiffrement et intégrité

- Chiffrer l'ensemble du dossier avec un outil de chiffrement de fichiers éprouvé (par exemple age) et une clé conservée séparément.
- Conserver au moins deux copies chiffrées sur des supports distincts, dont une hors du téléphone / ordinateur principal.
- Calculer un SHA-256 de l'archive chiffrée et vérifier ce hash après copie.
- Ne jamais committer les dumps, les médias, les clés, les tokens ou les chaînes de connexion dans GitHub.
- Ne pas envoyer les dumps vers un service cloud payant sans validation du coût et du fournisseur.

## 5. Test de restauration — staging seulement

**Interdiction de restaurer directement sur la production pour un test.**

1. Créer ou utiliser un projet Supabase de test isolé, après vérification du coût (ne pas créer un projet payant).
2. Restaurer d'abord le schéma et les données selon la documentation Supabase, avec une revue des privilèges par défaut et des fonctions `SECURITY DEFINER`.
3. Reconfigurer séparément les paramètres Auth, les secrets, les Edge Functions, les paramètres Realtime et les buckets.
4. Restaurer les objets Storage dans les buckets correspondants.
5. Comparer les comptages de tables non sensibles, les migrations, les fonctions/RPC, les politiques RLS, les buckets et un échantillon de fichiers.
6. Tester l'inscription, la connexion, le profil, l'envoi/réception de messages, la lecture des médias privés, le blocage et les fonctions Match avec deux comptes de test.
7. Consigner la date, les versions CLI/Postgres, le hash, les écarts et le temps de restauration.

Une restauration testée signifie que le système de récupération a été vérifié sur l'environnement isolé. Elle ne signifie pas que le site de production a été restauré ou modifié.

## 6. Retour arrière en incident

- Geler les changements et conserver les journaux utiles.
- Identifier le dernier backup vérifié et l'heure de perte estimée.
- Préserver l'état actuel en exportant avant toute restauration.
- Restaurer dans un projet isolé et valider les données.
- Toute restauration en production nécessite une fenêtre de maintenance, une confirmation explicite du propriétaire et un plan de retour arrière. Une restauration peut rendre le projet indisponible et écraser les données postérieures au point choisi.
- Reconfigurer les secrets/roles nécessaires et faire les tests de fumée avant de rouvrir le service.

## Critères « sauvegarde et restauration terminées »

- [ ] Export SQL complet du périmètre documenté, réussi et chiffré.
- [ ] Objets Storage copiés et vérifiés.
- [ ] Limites de couverture Auth / paramètres Supabase documentées ou export dédié réalisé.
- [ ] Deux copies chiffrées et hash vérifié.
- [ ] Restauration isolée réalisée sans coût non autorisé.
- [ ] Contrôles de données et parcours fonctionnels passés.
- [ ] Rapport de restauration daté, avec résultats et écarts.

Tant que ces cases ne sont pas validées, la sauvegarde complète restaurable reste **bloquée / non certifiée**.
