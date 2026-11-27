# MALACHITE — procédure de sauvegarde et de restauration

Dernière revue : 25 novembre 2026  
Projet Supabase de production : `tscsmemsvgacqioncash`  
PostgreSQL : **17.12**.  
Plan de l'organisation contrôlé le 25 novembre : **Free**.

> **Supabase CLI v3 — sécurité de ciblage :** depuis la v3, les commandes de base de données et Storage ciblent le local par défaut. Pour une opération distante, il faut indiquer explicitement `--remote` (ou `--remote=<référence>`). Les anciens drapeaux `--db-url` et `--linked` sont dépréciés. Toujours vérifier la ligne `Target:` et le projet affiché avant d'exporter. Ne jamais ajouter `--yes` à une commande de production sans contrôle humain préalable.

## État de départ (vérifié)

- Le projet est actif et utilise PostgreSQL 17.
- L'organisation est sur le plan Free. Ne pas supposer que des sauvegardes automatiques quotidiennes téléchargeables sont disponibles.
- Une sauvegarde logique CLI seule n'est **pas** une sauvegarde complète : `supabase db dump` exclut les schémas gérés Supabase (`auth`, `storage` et certains schémas d'extensions). La documentation Supabase permet d'exporter les utilisateurs via SQL Editor (`auth.users` et, si nécessaire, `auth.identities`) ; cet export contient des données personnelles sensibles et doit rester local, chiffré et hors Git. Le mécanisme de réimport des comptes et de leurs identifiants n'est pas certifié ici : ne pas promettre une restauration Auth complète avant un essai isolé.
- La base ne contient que les métadonnées Storage ; les objets médias doivent être copiés séparément.
- Aucun export complet ni test de restauration n'a été effectué lors de cette revue. Ne pas marquer la sauvegarde « terminée » avant l'exécution réelle et la vérification.

Références officielles : [Backups](https://supabase.com/docs/guides/platform/backups), [CLI db dump](https://supabase.com/docs/reference/cli/supabase-db-dump), [Download Storage objects](https://supabase.com/docs/guides/storage/management/download-objects).

## 1. Préparer l'export hors production

1. Utiliser un ordinateur de confiance avec disque chiffré et espace suffisant.
2. Installer la version stable actuelle de Supabase CLI et PostgreSQL client.
3. Depuis le tableau de bord Supabase, préparer le mot de passe de base de données dans un gestionnaire de secrets local. Ne jamais le mettre dans Git, un ticket ou un message.
4. Dans le terminal, le saisir sans affichage ni historique : `read -rsp 'DB password: ' SUPABASE_DB_PASSWORD; echo`. Ne pas réinitialiser le mot de passe de production pour cette procédure.
5. Installer une version stable de Supabase CLI **v3** et Docker. Se connecter avec `supabase login`. Cibler explicitement la référence `tscsmemsvgacqioncash` pour la base et Storage; ne pas dépendre d'un projet lié implicitement.
6. Créer un dossier daté, privé et non synchronisé publiquement, en dehors du dépôt Git.

## 2. Export logique SQL

Exécuter les commandes séparément et vérifier le code de sortie de chacune :

```bash
umask 077
BACKUP_DIR="$HOME/malachite-backups/$(date +%F)"
mkdir -p "$BACKUP_DIR/storage"
chmod 700 "$HOME/malachite-backups" "$BACKUP_DIR" "$BACKUP_DIR/storage"

# Vérifier que Target: nomme le projet tscsmemsvgacqioncash avant de continuer.
# Le mot de passe est fourni via variable; ne pas le placer dans une URL ou un fichier.
supabase db dump --remote=tscsmemsvgacqioncash --password "$SUPABASE_DB_PASSWORD" -f "$BACKUP_DIR/01-roles.sql" --role-only
supabase db dump --remote=tscsmemsvgacqioncash --password "$SUPABASE_DB_PASSWORD" -f "$BACKUP_DIR/02-schema.sql"
supabase db dump --remote=tscsmemsvgacqioncash --password "$SUPABASE_DB_PASSWORD" -f "$BACKUP_DIR/03-data.sql" --use-copy --data-only -x "storage.buckets_vectors" -x "storage.vector_indexes"
```

Ces fichiers sont sensibles : ils peuvent contenir des données personnelles et des données internes. Les garder hors du dépôt Git. Ce dump ne remplace pas un backup Supabase complet des données Auth ni des objets Storage.

## 3. Sauvegarder les objets Storage

Inventaire SQL en lecture seule du 24 novembre 2026 (aucun nom de fichier ni contenu privé consulté) :

| Bucket | Public | Objets | Taille totale |
|---|---:|---:|---:|
| `chat-media` | non | 31 | 64 526 647 octets |
| `payment-receipts` | non | 2 | 541 348 octets |
| `photos` | non | 9 | 1 159 211 octets |
| `profile-photos` | non | 24 | 4 114 676 octets |
| `malachite-campaign-media` | non | 0 | 0 |
| `malachite-campaigns` | non | 0 | 0 |

Total constaté : **66 objets, 70 341 882 octets (~67,1 Mio)**. Les reçus de paiement et médias privés sont sensibles. Cet inventaire peut évoluer; refaire les comptes juste avant la copie.

**Revalidation en lecture seule — 25 novembre 2026, 20:15 UTC :** les six buckets existent toujours et sont tous actuellement privés (`public=false`). Les comptes et tailles sont inchangés : 31/64 526 647 octets dans `chat-media`, 2/541 348 dans `payment-receipts`, 9/1 159 211 dans `photos`, 24/4 114 676 dans `profile-photos`, et zéro objet dans chacun des deux buckets de campagnes. Aucun nom de fichier ni contenu d'objet n'a été lu. La précédente version de ce tableau indiquait à tort les deux buckets de campagnes comme publics ; cette ligne a été corrigée.

**Précaution mot de passe CLI :** la CLI documente bien `--password` pour `supabase db dump --remote=<ref>`, mais cette valeur est transmise comme argument de processus. Exécuter uniquement sur une machine de confiance, dans une session utilisateur privée, sans journalisation de commandes ni capture de processus ; ne jamais coller le mot de passe dans le chat ou dans Git. La CLI v3 cible le local par défaut pour DB/Storage et accepte `--remote=<project-ref>` pour les opérations distantes ; toujours vérifier `Target:` pour les dumps et le projet sélectionné pour Storage.

Copier chaque bucket vers un dossier local chiffré, par exemple :

```bash
# Inventorier avant copie : vérifier le nombre d'objets et les chemins.
supabase storage ls "ss:///chat-media" -r --experimental --remote=tscsmemsvgacqioncash
supabase storage ls "ss:///payment-receipts" --recursive --experimental --remote=tscsmemsvgacqioncash
supabase storage ls "ss:///photos" --recursive --experimental --remote=tscsmemsvgacqioncash
supabase storage ls "ss:///profile-photos" --recursive --experimental --remote=tscsmemsvgacqioncash

# Télécharger vers le dossier local chiffrable, sans modifier les objets distants.
supabase storage cp "ss:///chat-media" "$BACKUP_DIR/storage/chat-media" --recursive --experimental --remote=tscsmemsvgacqioncash
supabase storage cp "ss:///payment-receipts" "$BACKUP_DIR/storage/payment-receipts" --recursive --experimental --remote=tscsmemsvgacqioncash
supabase storage cp "ss:///photos" "$BACKUP_DIR/storage/photos" --recursive --experimental --remote=tscsmemsvgacqioncash
supabase storage cp "ss:///profile-photos" "$BACKUP_DIR/storage/profile-photos" --recursive --experimental --remote=tscsmemsvgacqioncash
supabase storage cp "ss:///malachite-campaign-media" "$BACKUP_DIR/storage/malachite-campaign-media" --recursive --experimental --remote=tscsmemsvgacqioncash
supabase storage cp "ss:///malachite-campaigns" "$BACKUP_DIR/storage/malachite-campaigns" --recursive --experimental --remote=tscsmemsvgacqioncash
```

Vérifier le nombre de fichiers téléchargés par bucket et conserver les métadonnées (bucket, chemin, type MIME, taille). Ne pas publier les listes de chemins ni les reçus. La copie des objets ne sauvegarde pas automatiquement les politiques Storage ni tous les paramètres de bucket; documenter/recréer ces réglages séparément.

## 4. Chiffrement et intégrité

- Chiffrer l'ensemble du dossier avec un outil de chiffrement de fichiers éprouvé (par exemple age) et une clé conservée séparément.
- Conserver au moins deux copies chiffrées sur des supports distincts, dont une hors du téléphone / ordinateur principal.
- Calculer un SHA-256 de l'archive chiffrée et vérifier ce hash après copie.
- Ne jamais committer les dumps, les médias, les clés, les tokens ou les chaînes de connexion dans GitHub.
- Ne pas envoyer les dumps vers un service cloud payant sans validation du coût et du fournisseur.

## 5. Test de restauration — environnement isolé, coût zéro en priorité

**Interdiction de restaurer directement sur la production pour un test.**

1. Priorité : démarrer une instance locale Supabase jetable avec Docker sur un ordinateur de confiance (pas sur le téléphone) et vérifier que le coût cloud est nul. Ne créer aucun projet Supabase distant ni branche de développement sans devis et validation explicite du coût.
2. Restaurer le dump dans cette instance isolée. Les dumps CLI excluent les schémas gérés `auth` et `storage`; ne pas prétendre que les comptes Auth, les paramètres Auth ou les objets Storage sont restaurés par `schema.sql`/`data.sql`. Revoir les rôles par défaut et les fonctions `SECURITY DEFINER` avant de restaurer.
3. Documenter séparément la récupération des comptes Auth (l'export logique standard ne fournit pas une restauration complète des comptes/mots de passe), des paramètres Auth, des secrets, des Edge Functions, des paramètres Realtime et des buckets/politiques Storage.
4. Restaurer les objets Storage copiés dans les buckets correspondants et vérifier les nombres/tailles. Tester l'accès privé avec des comptes de test; ne pas rendre les buckets privés publics pour faciliter le test.
5. Comparer les comptages de tables non sensibles, l'historique des migrations, les fonctions/RPC, les politiques RLS, les buckets et un échantillon de fichiers.
6. Tester l'inscription, la connexion, le profil, l'envoi/réception de messages, la lecture des médias privés, le blocage et les fonctions Match avec deux comptes de test dans l'environnement isolé.
7. Consigner la date, les versions CLI/Postgres, le hash, les écarts, les limites Auth/Storage et le temps de restauration.

Une restauration testée signifie que le système de récupération a été vérifié sur l'environnement isolé. Elle ne signifie pas que le site de production a été restauré ou modifié.

**Précaution CLI v3 :** `db dump` et `storage cp` doivent être lancés avec un ciblage distant explicite. Pour les commandes Storage, conserver `--experimental` et `--remote=tscsmemsvgacqioncash`. Ne pas accepter une cible différente de la production prévue. Le téléchargement local ne doit jamais être remplacé par un `storage cp` dans le sens local-vers-distant.

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
