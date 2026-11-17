# Audit de sécurité Malachite — 18 novembre 2026

## Périmètre et références vérifiés
- Dépôt : `famousnadroj-sys/malachite`.
- Production : branche `main`, commit de référence `0491156daf13f6e7caa6d1e3411f1792981b8b7e`.
- Sauvegarde : branche `backup/pre-audit-2026-11-18`, présente et pointant sur le commit de production.
- Correctifs isolés : `fix/security-hardening`.
- Projet Supabase : `tscsmemsvgacqioncash`.
- La comparaison Git confirme que `main` n'a pas avancé depuis le point de sauvegarde ; les correctifs restent hors production.

## Corrections préparées dans la branche isolée
- Signalements : motif demandé, longueur contrôlée, identité du déclarant transmise, erreurs d'insertion affichées ; interface Admin pour examiner ou classer les signalements.
- Blocage : table dédiée, politiques RLS, liste personnelle des membres bloqués, blocage depuis la conversation et la fiche profil, filtrage mutuel des profils, messages et rendez-vous.
- Confidentialité des préférences : transfert de `profiles.prefs` vers `prives.prefs`, requête frontend limitée aux colonnes publiques, droits SQL limités aux colonnes réellement publiques.
- Blocage : fonction de contrôle déplacée dans le schéma non exposé `private`, plutôt que publiée comme RPC dans `public`.
- Paiements : offres autorisées, cible Contact validée, code de transaction unique, verrouillage de la demande pendant son traitement.
- Quota : trigger de messages gratuits aligné sur les 15 messages/jour annoncés.
- Fonctions privilégiées : retrait de l'exécution anonyme et limitation des droits EXECUTE selon les usages.
- Appels vidéo : désactivés dans la branche de préparation ; les salons publics Jitsi prévisibles ne sont pas conservés comme fonctionnalité de lancement.
- Contrôles automatiques ajoutés : syntaxe JavaScript (Node) et parsing PostgreSQL des migrations (pglast).

## Vérifications exécutées
- Schéma Supabase interrogé en lecture seule : tables, colonnes, politiques RLS, fonctions SECURITY DEFINER, triggers, droits et bucket Storage.
- Aucun doublon de code de paiement observé au moment du contrôle.
- La CI GitHub a réussi les contrôles JavaScript et PostgreSQL sur les commits de préparation précédents. Le dernier commit contenant la désactivation des appels est encore en cours de validation au moment de cette mise à jour.
- Aucun parcours fonctionnel complet n'a été testé avec deux comptes réels.
- Aucune migration n'a été appliquée à Supabase de production.
- Aucun changement n'a été poussé sur `main` et aucun déploiement n'a été effectué.

## Bloqueurs de lancement encore ouverts

### 1. Médias de conversation publics
Le bucket `photos` est public, sans limite de taille ni liste MIME autorisée. Il contient 9 objets : 8 objets identifiés comme médias de chat (photos/vocaux) et 1 autre objet. La table `messages` contient 5 messages image/audio et 2 messages d'appel vidéo. Les médias de conversation stockés dans ce bucket sont accessibles par URL publique.

Il faut créer un bucket privé dédié aux pièces jointes, migrer les 8 objets existants avec un accès Storage administrateur, remplacer les URL publiques par des chemins privés et générer des URL signées uniquement pour les participants. Il faut ensuite supprimer les anciennes copies publiques. Ce chantier n'est pas fait et ne doit pas être simulé par une simple modification SQL.

### 2. Authentification
Le contrôle Supabase signale que la protection contre les mots de passe compromis est désactivée. Elle doit être activée et vérifiée.

### 3. Appels vidéo
Les salons Jitsi utilisés par l'ancienne version ont des noms prévisibles et ne disposent pas de jeton d'accès observé. Les nouveaux appels sont désactivés dans la branche de préparation. Les deux anciens messages d'appel restent des données historiques ; il faut vérifier leur traitement et décider de leur suppression ou de leur archivage sécurisé avant lancement.

### 4. Environnement de test et non-régression
La création d'une branche Supabase de test a été refusée par le forfait actuel. Le coût annoncé était de 0,01344 USD/heure. Aucun environnement de staging n'a donc été créé. Les migrations doivent être exécutées et testées sur une base jetable/staging avant toute application en production.

Parcours obligatoires : inscription/connexion, création et modification du profil, recherche, likes/matchs, messages texte, médias privés, blocage/déblocage dans les deux sens, signalement et modération Admin, rendez-vous, paiements Airtel de test et contrôle des droits.

## Décision actuelle
**Malachite n'est pas encore prêt pour un lancement public responsable.**

La branche `main` et le site public restent inchangés. Les migrations de sécurité et de modération sont préparées mais non appliquées. Le PR #1 reste en brouillon. Ne pas fusionner ni déployer avant la migration des médias, la configuration Auth, la validation en staging et la réussite des tests de non-régression.
