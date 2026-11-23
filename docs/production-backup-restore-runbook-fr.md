# MALACHITE — procédure de sauvegarde et de restauration

**État au 23 novembre 2026 : sauvegarde restaurable non encore réalisée.**  
Ce document prépare une procédure sans modifier la production. Il ne constitue pas une preuve qu'une sauvegarde existe.

## 1. État vérifié du projet

- Projet Supabase de production : plan **Free**.
- Le plan Free ne fournit pas de sauvegardes quotidiennes automatiques.
- Projet PostgreSQL : version 17.
- Inventaire lu en production : 8 comptes Auth, 6 buckets Storage et 66 objets Storage.
- Buckets privés et objets : `chat-media` (31), `payment-receipts` (2), `photos` (9), `profile-photos` (24).
- Buckets publics actuellement vides : `malachite-campaign-media`, `malachite-campaigns`.

Références officielles :
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/reference/cli/supabase-db-dump

## 2. Règles impératives

1. Ne jamais exécuter une restauration sur le projet de production pendant un test.
2. Ne jamais stocker les mots de passe de base, jetons Supabase, clés API, reçus ou médias privés dans GitHub.
3. Conserver les fichiers de sauvegarde hors du dépôt, dans un emplacement chiffré et contrôlé.
4. Une exportation SQL seule n'est **pas** une sauvegarde complète de MALACHITE.
5. Ne pas activer de plan payant, PITR, service externe ou stockage facturé dans le cadre de cette procédure sans autorisation explicite.
6. Toute restauration de production exige une validation humaine, une fenêtre de maintenance et une sauvegarde récente vérifiée.

## 3. Export logique PostgreSQL — préparation

À effectuer depuis un ordinateur de confiance avec Supabase CLI installé, après authentification avec un compte autorisé et liaison explicite au projet de production :

```bash
supabase login
supabase link --project-ref "$PROJECT_REF"
mkdir -p backups
supabase db dump --linked -f backups/01-schema.sql
supabase db dump --linked --data-only --use-copy -f backups/02-data.sql
supabase db dump --linked --role-only -f backups/03-roles.sql
```

Le CLI exige une liaison au projet et un accès à la base. Le dump par défaut ne contient ni les données ni les rôles personnalisés ; les options dédiées sont donc séparées ci-dessus.

**Limite importante :** le dump Supabase exclut les schémas gérés `auth` et `storage`, ainsi que les schémas d'extensions. Il ne sauvegarde donc pas, à lui seul, les comptes Auth ni les fichiers binaires Storage.

## 4. Éléments encore indispensables

### Auth

- Prévoir une exportation séparée et sécurisée des comptes Auth et des métadonnées strictement nécessaires à la restauration.
- Ne pas prétendre sauvegarder les mots de passe : prévoir une procédure de réinitialisation/récupération si nécessaire.
- Ne jamais publier d'adresses e-mail, numéros ou identifiants de membres dans le dépôt.

### Storage

- Exporter séparément les objets binaires des buckets, en conservant les chemins et les métadonnées nécessaires.
- Les buckets privés contiennent des médias de conversation, des reçus de paiement et des photos de profil : accès très restreint et chiffrement obligatoires.
- Vérifier les politiques Storage et la configuration des buckets lors de la restauration.
- Les sauvegardes SQL ne restaurent pas les objets binaires supprimés.

### Configuration et fonctions

- Conserver les migrations, le code des Edge Functions et les fichiers de configuration non secrets dans le dépôt.
- Inventorier séparément les secrets et les paramètres Auth/Storage nécessaires, sans copier leurs valeurs dans Git.
- Après restauration, réinjecter les secrets uniquement depuis un gestionnaire sécurisé et vérifier les versions actives des fonctions.

## 5. Test de restauration obligatoire

1. Créer ou utiliser un environnement Supabase isolé et autorisé, jamais la production.
2. Restaurer le schéma et les données SQL.
3. Restaurer séparément les éléments Auth et Storage selon leur procédure validée.
4. Vérifier les comptes, les profils, les messages, les reçus, les fichiers, les politiques RLS, les permissions SQL, les fonctions et les flux d'authentification.
5. Comparer les volumes restaurés avec l'inventaire de sauvegarde, puis effectuer des tests de lecture et d'accès avec des comptes de test.
6. Documenter le résultat, les écarts, la date, la version CLI et les sommes de contrôle des fichiers.
7. Ne déclarer la sauvegarde « restaurable » qu'après réussite de ce test complet.

## 6. État de validation

- [x] Plan Free vérifié ; sauvegardes quotidiennes automatiques non incluses.
- [x] Inventaire des comptes Auth et des buckets/objets relevé sans lire de contenu privé.
- [x] Limites officielles du dump SQL documentées.
- [ ] Export SQL de production effectué.
- [ ] Export Auth sécurisé effectué.
- [ ] Export des 66 objets Storage effectué.
- [ ] Copie chiffrée hors du dépôt créée.
- [ ] Restauration complète testée sur un environnement isolé.

**Statut : NON PRÊT POUR RESTAURATION.** Aucun test de restauration ni aucune sauvegarde complète ne doit être revendiqué avant la clôture des éléments ci-dessus.
