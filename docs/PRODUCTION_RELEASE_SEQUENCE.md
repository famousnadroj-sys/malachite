# Malachite — ordre de sortie en production

**Statut : PRÉPARÉ — aucune sortie production autorisée tant que les portes obligatoires ne sont pas validées.**  
Référence : PR #158, branche `fix/profile-rpc-cutover-main-sync-20261126`.

## Règle absolue

Ne pas fusionner ni appliquer une migration en production sur la seule base de CI vert. Les tests actuels valident le candidat et le staging isolé; ils ne remplacent ni une sauvegarde complète, ni une restauration représentative, ni les tests sur deux téléphones.

## Porte 1 — sauvegarde et restauration

1. Exporter la base de production (rôles, schéma, données) depuis un poste de confiance.
2. Sauvegarder séparément les données Auth et la configuration Auth par une méthode de récupération officiellement supportée.
3. Exporter les objets des six buckets Storage, préserver leurs chemins et calculer les SHA-256.
4. Sauvegarder les sources des Edge Functions et inventorier les noms de secrets par environnement; ne jamais mettre les valeurs secrètes dans Git.
5. Conserver une copie chiffrée hors du projet Supabase.
6. Restaurer l'ensemble sur une cible isolée et vérifier comptes Auth, schéma, lignes, politiques, fonctions, triggers, migrations, objets et checksums.

**État connu :** organisation Supabase sur Free; aucun export complet ni restore drill prouvé. Porte non franchie.

## Porte 2 — réconciliation des migrations

- Production : 65 migrations enregistrées, dernière `20261124122733 account_deletion_fk_cleanup`.
- Staging : historique de test plus long, avec migrations de baseline et replays; ne pas rejouer son ledger en production.
- Ne pas soustraire les timestamps de fichiers aux versions du ledger pour calculer les migrations en attente.
- Sur la restauration de production, établir un état de départ, identifier l'effet réel de chaque migration candidate, produire une séquence forward-only, l'exécuter intégralement sur la cible isolée et comparer les ACL/RLS/fonctions attendues.

**Porte non franchie.**

## Porte 3 — configuration propriétaire

À faire dans les consoles sécurisées, jamais dans le dépôt :
- Worker IA : la migration anti-rejeu candidate a été corrigée après lecture du cron live. Elle utilise l'HMAC déjà configuré, dérive un nonce de `timestamp + signature`, refuse les replays et préserve la commande et la cadence du cron existant. Elle ne requiert pas `malachite_ai_worker_url` ni `malachite_ai_worker_project_ref` lorsque ces secrets optionnels sont absents. Le préflight production a été vérifié en lecture seule : cron signé actif et HMAC valide. Ne pas remplacer ni reprogrammer le cron en production.
- Configurer le tenant JaaS, l'AppID, le suffixe API key et la clé privée PKCS#8 dans les secrets Edge Function. Ne jamais transmettre la clé privée dans le chat ou Git.
- Configurer `malachite_push_project_url`. Le hook et les clés VAPID sont déjà présents; un abonnement admin actif existe, mais la réception réelle n'est pas testée.
- Confirmer le compte de réception Airtel Money dédié et les coordonnées Orange avant de reprendre l'intake des paiements. Ne pas modifier les destinations sans validation explicite.
- Confirmer les coordonnées de support, l'identité de l'éditeur et la politique de confidentialité/conditions après revue juridique RDC.

## Porte 4 — appliquer les protections de base de données

Après la restauration et le diff structurel, intégrer également les durcissements préparés dans les migrations candidates :
- retirer EXECUTE aux rôles API sur toutes les fonctions d'implémentation du schéma `private`, puis réaccorder uniquement les helpers requis par les policies RLS de la base cible (4 en production actuelle; vérifier le diff au moment du déploiement);
- fermer les EXECUTE par défaut des futures fonctions privées sans casser les grants de fonctions API dans `public` et `storage`;
- durcir `get_malachite_referrer_preview` contre les profils suspendus et les blocages des visiteurs authentifiés.
- remplacer `public.est_premium(uuid)` par la version `search_path = ''` qui qualifie `public.statuts`.

Uniquement après portes 1 et 2 et approbation de la séquence :
1. Corriger la visibilité des profils privés et les chemins de photos.
2. Imposer l'âge minimum côté serveur sur chaque chemin d'écriture.
3. Retirer les mutations directes non nécessaires des profils, messages, appels, paiements, notifications et tables historiques; conserver uniquement les colonnes utilisées par le client.
4. Durcir la lecture des pièces jointes chat et les règles blocage/suspension.
5. Installer le throttle atomique du login et vérifier les prérequis RPC avant de déployer `username-login`.
6. Installer le vérificateur anti-rejeu du worker après la porte backup/restore et la réconciliation; vérifier le cron signé existant, le secret HMAC et les tests d'acceptation/rejeu. La migration candidate doit conserver le cron existant et ne pas exiger de nouveaux secrets URL/project-ref.
7. Installer le chemin JaaS privé. Le switch fournisseur doit rester OFF tant que les tests réels ne sont pas réussis.
8. Garder l'intake de paiements et les ventes de Pass Appels fermés tant que les coordonnées de réception et le fournisseur d'appel ne sont pas confirmés.

## Porte 5 — déployer les Edge Functions

Déployer uniquement les versions correspondant au commit validé et vérifier pour chacune :
- nom, version et `verify_jwt`;
- secrets présents par nom (sans les afficher);
- tests d'accès anonyme, membre, admin et service_role;
- logs sans erreurs de démarrage ni secrets exposés.

Ordre recommandé : `username-login` après sa migration atomique; worker après migration anti-rejeu (HMAC existant et cron signé prévalidés); token JaaS après configuration; admin-push après URL cible et test. Garder les autres fonctions sur leurs versions vérifiées.

## Porte 6 — publier le frontend

Publier Pages depuis le commit approuvé seulement après compatibilité DB/Edge :
- le frontend candidat ferme les appels par défaut (`CALL_PROVIDER_ENABLED=false`);
- le frontend `main` actuellement publié utilise encore `meet.jit.si`, sans jeton JaaS;
- publier le frontend candidat avant toute activation des appels; ne jamais laisser l'ancien client continuer à ouvrir des salles publiques après la migration fail-closed.

Vérifier l'URL publique, le cache PWA, le service worker et les assets réellement servis, pas seulement le résultat du workflow Pages.

## Porte 7 — recette réelle

Sur deux téléphones Android et deux comptes distincts :
- inscription 18+, connexion et récupération;
- création/modification profil, profil privé et photos;
- Découvrir, Match réciproque, blocage, signalement et suspension;
- messages, accusés de réception, fichiers image/audio/vidéo/document;
- notifications générales et push admin sur chaque appareil;
- paiement de test contrôlé (aucune activation sans vérification humaine du reçu et de l'argent reçu);
- appels audio/vidéo JaaS, participant incorrect, session expirée, membre bloqué/suspendu, refus, raccrochage et perte réseau.

Ne pas utiliser de vrais transferts pour un test technique.

## Porte 8 — décision de lancement

Fusionner et annoncer le lancement seulement si :
- sauvegarde/restauration certifiée;
- migrations reconciliées et tests post-déploiement réussis;
- aucun profil privé accessible par un autre compte;
- aucun accès direct non prévu aux tables sensibles;
- appels privés testés ou clairement maintenus désactivés;
- paiements correctement configurés et validés manuellement;
- notifications réellement reçues;
- pages légales et support validés;
- recette Android acceptée.

## Retour arrière

- Ne jamais tenter un `DROP`, un replay global ou un rollback destructif en production.
- Si une migration échoue, arrêter le déploiement et diagnostiquer à partir du snapshot/restauration isolée.
- Si le frontend casse, revenir au commit Pages précédent seulement si celui-ci reste compatible avec le schéma déjà migré; sinon publier un correctif forward.
- Garder les appels OFF et l'intake paiement fermé jusqu'à résolution.
- Journaliser commit, versions Edge, versions migrations, heure, tests et décision de l'opérateur.

**Décision actuelle : NO-GO.** PR #158 reste draft/non fusionnée. La production n'a reçu aucune migration, fonction Edge, secret, changement de destination de paiement ni publication frontend dans cette session.
