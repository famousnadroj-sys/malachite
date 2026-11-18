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
- Présence : ajout de la colonne `profiles.derniere_vue` utilisée par le heartbeat et la lecture de présence, avec droit SELECT explicite.
- Blocage : fonction de contrôle déplacée dans un schéma distinct `private`, plutôt que publiée comme RPC dans `public` ; l'exposition effective de ce schéma devra être confirmée dans la configuration Data API du staging.
- Paiements : offres autorisées, cible Contact validée, code de transaction unique, verrouillage de la demande pendant son traitement.
- Quota : trigger de messages gratuits aligné sur les 15 messages/jour annoncés.
- Fonctions privilégiées : retrait de l'exécution anonyme et limitation des droits EXECUTE selon les usages.
- Appels vidéo : désactivés dans la branche de préparation ; les salons publics Jitsi prévisibles ne sont pas conservés comme fonctionnalité de lancement.
- Contrôles automatiques ajoutés : syntaxe JavaScript (Node) et parsing PostgreSQL des migrations (pglast).

## Vérifications exécutées
- Schéma Supabase interrogé en lecture seule : tables, colonnes, politiques RLS, fonctions SECURITY DEFINER, triggers, droits et bucket Storage.
- Aucun doublon de code de paiement observé au moment du contrôle.
- La CI GitHub a réussi les contrôles JavaScript et le parsing PostgreSQL sur la tête de branche `f609b1cb7c4750f3c9fb0b65972dfda940571c85`. Ce sont des contrôles statiques ; ils ne remplacent pas les tests d'intégration et les parcours réels.
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


## Vérification complémentaire des exigences formulées par Claude
Le message de Claude demandait explicitement : (1) bloquer un membre, (2) signaler avec un motif, et (3) un écran Admin pour lire les signalements et suspendre un compte.
- Le signalement avec motif et l'écran Admin de lecture/classement sont présents dans la branche de correction.
- Le blocage/déblocage est préparé. Une incohérence a été corrigée : le navigateur appelait `public.is_blocked_with` alors que seule la fonction interne `private.is_blocked_with` existait. Une fonction RPC publique minimale, réservée aux utilisateurs authentifiés et délégant au schéma privé, a été ajoutée et ajoutée aux contrôles statiques.
- **La suspension réelle d'un compte n'est PAS encore implémentée.** L'écran Admin actuel permet d'examiner ou de classer un signalement, mais ne suspend pas le compte signalé. Une suspension effective doit passer par une opération Auth Admin côté serveur, jamais par un secret privilégié dans le navigateur. Aucun outil de gestion des secrets/ban Auth n'est disponible dans cette session pour configurer et vérifier cette opération en sécurité.

## Blocages non résolus empêchant de déclarer le lancement prêt
- Médias privés : bucket public existant ; aucun outil Storage de migration/lecture/écriture n'est disponible dans cette session.
- Auth : protection contre mots de passe compromis toujours désactivée ; aucun réglage Auth n'est exposé par les outils disponibles.
- Suspension Admin réelle : non implémentée et non testée.
- Appels Jitsi historiques : deux anciennes entrées restent à traiter.
- Tests de bout en bout avec deux comptes : non exécutés. La CI ne valide que la syntaxe JS et le parsing SQL.
- Environnement de test Supabase séparé : création refusée par le forfait ; aucun coût de staging n'a été engagé.

Ces points ne doivent pas être contournés en appliquant des migrations non testées à la production. La version publique reste inchangée.


## Mise à jour — préparation de la suspension Admin
- Une Edge Function `admin-user-moderation` est maintenant ajoutée à la branche de correction. Elle vérifie le JWT auprès de Supabase Auth, limite l'action à l'adresse administrateur définie dans le code, valide l'identifiant UUID, interdit l'auto-suspension et appelle l'API Auth Admin côté serveur.
- Le panneau Admin appelle cette fonction depuis chaque signalement.
- Le secret `SUPABASE_SERVICE_ROLE_KEY` est uniquement lu dans l'environnement serveur ; aucune clé privilégiée n'est ajoutée au navigateur ou au dépôt.
- **Non terminé :** la fonction n'est pas déployée, les secrets du projet ne sont pas configurés/vérifiés et aucun test de suspension/réactivation n'a été exécuté. Le blocage est donc encore un point de lancement ouvert.


## Validation automatique — run GitHub Actions #42
- Commit contrôlé : `c7bfe9432bbdaac55fb19e353eb2d410218416be`.
- Résultat réel : **succès** (`44204890527`).
- Étapes passées : vérification syntaxique JavaScript du site, installation Deno, contrôle TypeScript de l'Edge Function de modération, parsing des migrations SQL avec pglast.
- Le run précédent avait détecté une erreur de syntaxe dans l'attribut onclick du bouton de suspension ; la correction a été poussée, puis l'ensemble des étapes ci-dessus a réussi.
- Cette CI reste statique : elle ne déploie rien, n'exécute pas les migrations sur Supabase et ne prouve pas les parcours d'authentification, stockage, RLS ou suspension réelle.


## Contrôle Supabase Security Advisor — lecture seule
- Le contrôle direct du projet actif a signalé 7 fonctions `SECURITY DEFINER` exécutables par `anon` et/ou `authenticated`, ainsi que la protection contre les mots de passe compromis désactivée.
- Les migrations préparées ont été renforcées : la logique métier sensible (match, contact, état Premium, listes de blocage et approbation de paiement) est déplacée dans le schéma `private`, avec vérifications `auth.uid()` ou email Admin. Les fonctions RPC publiques conservées sont des wrappers `SECURITY INVOKER` ; les fonctions de trigger sont révoquées pour les rôles API.
- Le code prépare donc une réduction des alertes de fonctions exposées, mais **aucune migration n'a été appliquée au projet actif**. Le résultat du Security Advisor après migration n'est pas encore vérifiable.
- Le réglage Auth de protection des mots de passe compromis demeure un blocage séparé ; aucun outil de configuration Auth n'est disponible dans cette session.


## Validation après durcissement des RPC — run #73
- Commit contrôlé : `43b555bf1e8a99423b0b9ccfd43926866f41d0c4`.
- GitHub Actions : **succès** (`44205455903`).
- Vérifications réussies : syntaxe JavaScript du site, garde-fous de confidentialité/modération, vérification TypeScript Deno de la fonction Admin et parsing des deux migrations PostgreSQL.
- Ces contrôles confirment la validité syntaxique/statique de la branche ; ils ne remplacent pas l'exécution des migrations, les tests RLS réels, les tests de stockage ni les essais avec deux comptes.


## Protection des mots de passe — contrainte de coût vérifiée
- La documentation Supabase confirme que la vérification des mots de passe compromis via HaveIBeenPwned est réservée au plan Pro et supérieur. Aucune mise à niveau payante ne sera engagée.
- Une validation gratuite côté formulaire d'inscription impose désormais 12 caractères minimum, une minuscule, une majuscule, un chiffre et un symbole. La connexion des comptes existants n'est pas modifiée.
- Cette validation côté navigateur n'est pas équivalente à une règle Auth côté serveur et peut être contournée par un appel direct à l'API Auth. Elle réduit les erreurs d'inscription dans l'interface, mais ne permet pas de prétendre que la protection contre les mots de passe compromis est activée.


## Validation finale de la branche après durcissement et règle de mot de passe — run #81
- Commit contrôlé : `9b494bffb2f8e437f17740d97898973c1ea1f119`.
- GitHub Actions : **succès** (`44205642514`).
- Les 4 contrôles ont réussi : syntaxe JavaScript, gardes de confidentialité/modération, vérification TypeScript de l'Edge Function et parsing des migrations SQL.
- Aucun déploiement, aucune migration de production, aucun changement de `main` n'a été effectué.
