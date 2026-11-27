# MALACHITE — réconciliation des migrations de production (26 novembre 2026)

## Résultat exécutif

- Projet Supabase de production : `tscsmemsvgacqioncash` (PostgreSQL 17.12, état `ACTIVE_HEALTHY`).
- Dépôt : `famousnadroj-sys/malachite`, branche de référence `main`.
- Dernière migration présente dans l'historique Supabase de production au contrôle : `20261124122733 account_deletion_fk_cleanup`.
- La branche `main` contient **20 migrations supplémentaires**, de `20261124150100` à `20261125150000`. La comparaison de l'historique Supabase avec les fichiers de migration confirme que les 20 ne sont pas enregistrées comme appliquées en production.
- **Aucune de ces migrations n'a été appliquée pendant cet audit.** Aucun changement de schéma, de données, de fonction Edge ou de configuration Auth n'a été effectué.

Ce document est un inventaire de réconciliation, pas une autorisation de déploiement. La séquence doit être répétée sur un environnement isolé et les prérequis de sauvegarde doivent être satisfaits avant toute application en production.

## Inventaire des 20 migrations manquantes

Toutes les lignes ci-dessous sont **PENDING / NON APPLIQUÉES** en production au moment du contrôle. L'ordre indiqué est l'ordre chronologique exact du dépôt et doit être conservé.

| Ordre | Migration | Effet principal | Risque / validation à prévoir |
|---:|---|---|---|
| 01 | `20261124150100_secure_private_profile_access.sql` | Profils privés visibles uniquement par leur propriétaire; lecture des photos limitée aux chemins publiés et profils publics; retrait de l'ancien trigger de projection. | Vérifier les profils publics/privés, les deux sens de blocage, les suspensions, les photos et avatars 3D. Ne pas supposer qu'une policy ajoutée neutralise l'ancienne : PostgreSQL combine les policies permissives par OR. |
| 02 | `20261124170000_harden_call_and_referrer_access.sql` | Ajoute un coupe-circuit serveur des appels, désactivé par défaut; durcit la création d'appel et l'aperçu de parrainage. | Confirmer que le fournisseur d'appel n'est pas activé. La fonction de création doit échouer fermé tant que le fournisseur sécurisé n'est pas prêt. |
| 03 | `20261124181103_restrict_direct_config_and_status_mutations.sql` | Retire les écritures directes des clients sur `config` et `statuts`. | Vérifier que les flux admin/serveur conservent leurs droits nécessaires. |
| 04 | `20261124181403_limit_public_config_reads_to_payment_operators.sql` | Limite la lecture client de `config` aux clés Airtel et Orange. | Cette règle est ensuite resserrée par la migration 18 pendant la suspension des paiements; vérifier la compatibilité frontend. |
| 05 | `20261124181825_secure_public_private_function_wrappers.sql` | Normalise plusieurs wrappers RPC en SECURITY DEFINER avec `search_path` vide. | Revoir chaque signature, grants et contrôle d'identité/admin; ne pas interpréter l'avertissement Advisor comme preuve d'une faille sans lecture du corps et des ACL. |
| 06 | `20261124182913_remove_unapproved_prices_from_expiry_notifications.sql` | Retire les tarifs non approuvés des notifications individuelles d'expiration. | Vérifier le texte des notifications et l'absence de prix inventés. |
| 07 | `20261124183430_remove_unapproved_prices_from_scheduled_expiry_notifications.sql` | Applique la même correction aux notifications planifiées. | Vérifier la cohérence avec la migration 06 et les tâches planifiées. |
| 08 | `20261124190000_harden_call_and_appointment_participant_access.sql` | Renforce les policies de sessions d'appel et rendez-vous avec contrôles de participants, blocage et suspension. | Vérifier les parcours des deux participants et les transitions autorisées; les appels restent fermés sans fournisseur. |
| 09 | `20261124200100_limit_entitlement_status_visibility.sql` | Cache les dates exactes d'abonnement et expose des badges booléens via `public_status_badges()`. | Vérifier les badges des profils publics, privés, bloqués et suspendus; le propriétaire conserve ses propres informations. |
| 10 | `20261124200500_lock_legacy_contact_unlock_table.sql` | Retire les droits clients sur l'ancienne table `deblocages`. | Tester le RPC de contact protégé et confirmer qu'aucun client ne peut s'accorder lui-même un accès. |
| 11 | `20261124210000_restore_authenticated_profile_reads.sql` | Rétablit le privilège SELECT sur `profiles`, toujours filtré par RLS. | Vérifier la visibilité effective, pas seulement la présence de la policy. |
| 12 | `20261124230000_restrict_direct_payment_mutations.sql` | Retire UPDATE/DELETE directs sur les paiements. | Vérifier que l'administration conserve la validation via RPC et que l'historique est intact. |
| 13 | `20261124235000_restrict_call_session_updates.sql` | Réduit les droits de modification des sessions d'appel au statut uniquement. | À relire avec les migrations 15 et 17 : la migration 18 ferme finalement les écritures directes des appels. |
| 14 | `20261124240000_revoke_retired_campaign_table_access.sql` | Retire tous les droits clients sur `campagnes`, cohérent avec l'absence de publicité au lancement. | Vérifier l'absence d'accès anon/authenticated et la non-réapparition de la surface publicitaire. |
| 15 | `20261124241000_restrict_direct_call_session_writes.sql` | Retire INSERT/DELETE directs sur `call_sessions` et supprime la policy de création directe. | Vérifier que seule la voie serveur validée peut créer une session. |
| 16 | `20261124250000_enforce_profile_age_server_side.sql` | Impose l'âge 18–100 dans la fonction de sauvegarde propriétaire. | Tester NULL, texte non numérique, moins de 18, plus de 100, profil privé/public et incohérence des âges. |
| 17 | `20261124260000_restrict_profile_writes_to_trusted_rpc.sql` | Ferme les écritures directes sur profils, préférences privées et noms de connexion; ajoute les RPC propriétaires de préférences/avatar. | Tester toutes les écritures via RPC et le refus des écritures directes; préserver uniquement le dernier état de présence autorisé. |
| 18 | `20261124270000_pause_payment_intake_until_activation.sql` | Ferme la création de paiements, l'upload des reçus, les écritures de sessions d'appel et la lecture client de la configuration Mobile Money. | Intentionnellement fermé jusqu'à validation des SIM, tarifs et fournisseur. Préserver l'historique et la revue admin. |
| 19 | `20261125141500_normalize_authenticated_table_acl.sql` | Normalise les ACL effectives sur les tables sensibles; n'accorde que SELECT aux clients sur les tables listées; révoque les RPC de transition et de création d'appel. | Contrôler les droits effectifs après héritage et PUBLIC, puis tester tous les parcours frontend dépendants. Cette migration est une fermeture de sécurité majeure. |
| 20 | `20261125150000_allow_published_public_profile_avatar_reads.sql` | Autorise les photos et avatars 3D explicitement publiés sur les profils publics, tout en respectant blocage/suspension. | Tester l'accès propriétaire, public publié, privé, chemin non publié, bloqué et suspendu. |

## Écarts de production confirmés en lecture seule

Les privilèges SQL observés en production accordent encore à `authenticated` des droits directs INSERT/UPDATE/DELETE sur plusieurs tables sensibles, notamment `profiles`, `prives`, `paiements`, `call_sessions`, `config`, `statuts` et `campagnes`. Ce sont des ACL larges; l'accès réel aux lignes reste également conditionné par RLS et les policies. La séquence ci-dessus les réduit.

Le Security Advisor du 26 novembre signale :
- 12 tables avec RLS activé sans policy. Plusieurs sont des tables internes; cette alerte ne suffit pas à conclure à une exposition si les privilèges directs sont absents.
- 1 fonction SECURITY DEFINER exécutable par `anon` : `public.get_malachite_referrer_preview(uuid)`. Son intention documentée est de renvoyer uniquement le prénom et le nom d'utilisateur d'un profil public; conserver ce périmètre minimal et tester les filtres de suspension/blocage.
- 9 fonctions SECURITY DEFINER exécutables par `authenticated`; chacune doit être examinée selon son corps, ses grants et ses contrôles d'identité/admin.
- La protection contre les mots de passe compromis est désactivée. Aucun paramètre Auth n'a été changé.

Les alertes RLS sans policy ne doivent pas être « corrigées » en ajoutant des policies génériques : cela pourrait exposer des files d'administration, des journaux IA ou des données financières.

## Compatibilité frontend — appels : blocage à corriger avant réactivation

Le frontend actuel `calls.js` utilise encore des UPDATE directs sur `call_sessions` pour accepter, refuser, expirer et terminer les appels. Or la migration 18 ferme les écritures directes et la migration 19 ne réaccorde que SELECT; elle révoque aussi EXECUTE sur `public.update_my_call_session_status(uuid,text)`.

La PR #158 ajoute un trigger de transitions immuables, mais son test actuel exerce des UPDATE directs sous le rôle `authenticated`; il ne prouve pas le parcours frontend après application de la migration 19. Un commentaire de revue a été ajouté à la PR #158 pour demander :
1. un RPC de transition étroit qui vérifie le participant, le statut courant, l'expiration, le blocage et la suspension;
2. le contrôle du fournisseur sécurisé avant l'acceptation;
3. le remplacement des cinq mutations directes de `calls.js` par ce RPC;
4. un test exécutant d'abord la migration 19, prouvant le refus des UPDATE directs puis le succès des transitions autorisées par RPC.

Indépendamment de ce point, `calls.js` charge toujours `https://meet.jit.si/external_api.js` et rejoint `meet.jit.si` sans JWT Jitsi observé. L'inventaire des fonctions Edge de production ne contient pas de service d'émission de jetons JaaS.

**Écart critique de l'état actuellement publié :** `index.html` charge `calls.js`, et le wrapper `oldMatch` dans `calls.js` remplace sans condition les boutons d'appel désactivés de `matchBox()` par des boutons audio/vidéo actifs. En outre, la définition de `public.start_call_session(...)` relue directement en production le 26 novembre vérifie l'authentification, l'abonnement, le match réciproque, les blocages et les sessions existantes, mais ne contient aucun contrôle de fournisseur sécurisé (`call_provider_is_enabled`) ni contrôle de suspension. La migration qui ajoute ce coupe-circuit n'est pas appliquée. Le code actuel ne permet donc pas d'affirmer que les appels sont réellement désactivés côté client ou serveur. Aucun appel non autorisé n'a été observé dans cet audit, mais l'accès à la salle Jitsi n'est pas authentifié et sa confidentialité n'est pas garantie. Un commentaire de revue a été ajouté à la PR #158 pour exiger la fermeture de ce chemin. La PR #158 porte maintenant un candidat de correction : boutons d'appel désactivés, suppression de l'endpoint public `meet.jit.si`, RPC de transition participant-scopé, coupe-circuit SQL fail-closed, contrôle d'éligibilité et squelette Edge Function d'émission JWT JaaS. Le test PostgreSQL isolé `call-session-expiry` est passé sur le dernier checkpoint testé; la validation JavaScript/TypeScript complète est encore en cours sur la dernière révision. Rien de cette correction n'est déployé en production.

Les appels doivent rester en NO-GO jusqu'à ce qu'une fermeture serveur fail-closed soit installée et testée, que l'interface ne contourne plus l'état désactivé, et qu'un fournisseur contrôlé émette des JWT distincts et limités pour chaque participant. Le trigger SQL seul ne rend pas une salle Jitsi privée.

## Migrations supplémentaires de la PR #158

La PR #158, encore en brouillon, ajoute après la chaîne des 20 :
- `20261126121000_harden_call_session_state_transitions.sql` : trigger qui rend l'identité de session immuable et limite les transitions de statut par participant;
- `20261126130000_reapply_profile_rpc_cutover.sql` : réapplique les RPC de profil/préférences/avatar sur le `main` récent.

Ces deux migrations sont postérieures à la séquence #152 et ne doivent pas être isolées ni appliquées avant la chaîne de base. Les tests GitHub Actions de la PR sont verts, mais cela ne démontre ni une restauration de production ni la compatibilité des ACL frontend décrite ci-dessus.

## Sauvegarde / restauration : toujours non certifiée

Le runbook de sauvegarde #132 est documentaire. Il indique qu'aucun dump complet, export Auth, copie d'objets Storage ou essai de restauration isolé n'a été exécuté. L'inventaire Storage en lecture seule du 25 novembre recensait 66 objets pour 70 341 882 octets dans six buckets, tous privés; ce comptage ne constitue pas une sauvegarde.

Le plan de l'organisation est Free. Ne pas activer PITR, créer une branche/projet payant ou modifier le plan sans validation du coût. La sauvegarde complète doit couvrir séparément :
1. rôles, schéma et données PostgreSQL;
2. export Auth et méthode de réimport testée;
3. objets Storage réels, avec inventaire et sommes de contrôle;
4. restauration dans un environnement isolé, puis vérification des comptes, profils, messages, reçus, médias et relations.

Ne jamais stocker ces exports dans Git ou les envoyer dans le chat. Le connecteur de cette session ne fournit pas l'inventaire des sauvegardes gérées ni l'environnement local chiffré nécessaire à une restauration complète.

## Ordre de déploiement proposé — non exécuté

1. Produire une sauvegarde complète vérifiable et un rapport de restauration isolée.
2. Rejouer les 20 migrations dans l'ordre sur un environnement isolé construit à partir d'un état compatible avec la production; comparer schéma, fonctions, triggers, policies et ACL avant/après.
3. Corriger le parcours frontend des appels (RPC) et le fournisseur authentifié JaaS/JWT; conserver le coupe-circuit fermé jusque-là.
4. Exécuter les tests SQL/REST inter-comptes, puis les tests réels entre deux appareils.
5. Vérifier les migrations enregistrées et les parcours de l'application sur staging.
6. Seulement après revue du diff, sauvegarde confirmée, CI verte et approbation explicite, planifier le déploiement production avec retour arrière documenté.

**État GO/NO-GO : NO-GO pour l'application des migrations en production et pour l'activation des appels/paiements.** Les 20 migrations sont inventoriées, mais la sauvegarde restaurable n'est pas démontrée et les dépendances frontend des appels doivent être corrigées.


## Mise à jour vérifiée — 27 novembre 2026, 19:xx UTC+2

Contrôle direct en lecture seule du projet Supabase de production, via la connexion du projet :

- Projet actif : PostgreSQL 17.12, état `ACTIVE_HEALTHY`.
- Historique de production : **65 migrations**, dernière entrée `20261124122733 account_deletion_fk_cleanup`. Les 20 migrations listées ci-dessus, de `20261124150100` à `20261125150000`, ne sont toujours pas enregistrées comme appliquées.
- Inventaire des Edge Functions de production : `malachite-jaas-token` est absent. Aucun jeton JaaS de salle privée n'est donc émis par une fonction déployée en production.
- Security Advisor relancé : 12 alertes INFO « RLS activé sans policy »; 1 fonction SECURITY DEFINER exécutable par `anon` (`get_malachite_referrer_preview`); 9 fonctions SECURITY DEFINER exécutables par `authenticated`; protection des mots de passe compromis désactivée.
- Performance Advisor : 18 index signalés inutilisés. Aucun index n'a été supprimé; l'absence d'usage enregistrée ne prouve pas qu'un index est superflu.
- Aucun SQL, migration, secret, paramètre Auth, donnée ou fonction de production n'a été modifié.

### État actuel de la PR #158 — correction des appels

La révision actuellement testée est `897d177af54f99e4df28d5467f5a40c85c5a77aa`. Les quatre workflows GitHub associés sont terminés avec succès. La validation SQL/CI a **28/28 jobs réussis**, dont le contrôle du coupe-circuit de création d'appel, l'accès participant aux appels/rendez-vous, l'expiration, les ACL effectives et le verrou de paiements.

Le code candidat de `calls.js` remplace les transitions directes par le RPC participant-scopé et garde le fournisseur désactivé par défaut. La PR contient aussi le chemin client JaaS et le code source du service de jetons. **Cette correction n'est pas fusionnée ni déployée en production.** Le service `malachite-jaas-token` n'est pas déployé en production, les clés JaaS ne sont pas configurées, et aucun appel privé réel entre deux appareils n'a été certifié. Les appels restent donc NO-GO.

### Réconciliation des migrations antérieures à la liste des 20

La comparaison brute par numéro de version trouve également plusieurs anciens fichiers dont les noms/horodatages ne correspondent pas exactement aux entrées de l'historique de production. Certains ont des migrations de remplacement plus récentes ou des noms historiques différents. **Ne pas les compter comme migrations à appliquer automatiquement.** Ils doivent être classés individuellement comme déjà représentés, remplacés ou réellement manquants sur une restauration isolée avant de préparer une séquence de production.

### État de lancement

**NO-GO maintenu** : sauvegarde complète PostgreSQL + Auth + Storage et restauration isolée non certifiées; migrations de sécurité non appliquées en production; protection HIBP indisponible sur le plan Free; fournisseur JaaS privé non configuré/testé; suppression complète de compte non implémentée. Aucun de ces contrôles ne doit être marqué « terminé » sur la seule base des tests CI.


### Dernier point de blocage relevé sur le client d'appels — 27 novembre

Revue du code HEAD de la PR #158 : `calls.js` fixe `CALL_PROVIDER_ENABLED=false` au chargement et exporte immédiatement cette valeur sur `window.CALL_PROVIDER_ENABLED`. Aucun chemin ne rafraîchit cet état depuis le serveur. Par conséquent, même après activation de la configuration privée JaaS et déploiement des secrets, le client restera bloqué : `startCall()`, `startInbox()` et les offres n'activeront jamais les appels. Un commentaire de revue bloquant a été ajouté à la PR #158 (commentaire GitHub 7224685242) pour exiger un statut serveur authentifié, limité à un booléen non secret, avec tests fournisseur désactivé/activé. Le coupe-circuit serveur doit rester fermé tant que cette correction et le test réel entre appareils ne sont pas terminés.


### Correction candidate applied to PR #158 — status refresh

Après le commentaire de revue, la branche #158 a reçu deux commits candidats : `6a6b8c05` ajoute à `malachite-jaas-token` une action `status` authentifiée qui ne renvoie qu'un booléen; `f346e207` fait rafraîchir ce statut par `calls.js` après authentification, au retour en ligne et à la reprise de visibilité. En cas d'erreur ou d'absence de fonction, le client reste désactivé (fail closed). Les workflows Pages et release contract sont verts; la validation complète est en attente et le runtime Match est encore en cours au dernier contrôle. Ne pas considérer cette correction comme validée tant que ces deux contrôles ne sont pas terminés.


### Revalidation de la correction de statut — dernier checkpoint 27 novembre

HEAD PR #158 : `7cba3f6115844b5ed78077cdd529e641c3aaaa63`. La fonction de statut ne renvoie désormais `enabled=true` que si le coupe-circuit SQL est activé **et** que les trois paramètres JaaS requis sont présents et que l'AppID a un format acceptable. Le client ignore les réponses tardives après un changement de session Auth et reste fermé en cas d'erreur.

Au dernier contrôle GitHub : `MALACHITE live Pages verification` et `Malachite release integration contract` réussis; `Malachite validation` et `Match isolated PostgreSQL runtime` encore en cours. La révision n'est pas fusionnée. Les clés JaaS réelles et le test d'appel entre deux appareils restent à faire par le propriétaire après configuration.


### Contrôle direct des définitions SQL de production — 27 novembre

Une requête catalogue read-only sur les fonctions actuellement déployées confirme :

- `public.start_call_session(uuid,uuid,text,text,timestamptz)` est `SECURITY DEFINER`, exécutable par `authenticated`, et vérifie l'abonnement, le match réciproque et le blocage. Sa définition live ne vérifie ni le coupe-circuit fournisseur, ni la suspension des participants; elle accepte une salle dont le format est seulement borné par longueur. La migration fail-closed candidate remplace cette définition.
- `public.save_my_profile(jsonb,jsonb)` est actuellement `SECURITY INVOKER` et exécutable par `authenticated`. Le corps vérifie un âge privé minimal, mais pas la limite supérieure 100 ans ni la cohérence des âges public/privé; les grants directs de production sur `profiles`, `prives` et `login_names` permettent aussi de contourner une validation applicative. La chaîne candidate remplace le RPC et révoque les écritures directes.
- La policy Storage live `profile photos read` autorise la lecture des objets `profile-photos` dès que le lecteur n'est pas bloqué par le propriétaire; elle ne contrôle pas le profil public, la publication du chemin ni la suspension. Les buckets de médias observés sont privés, mais cette policy authentifiée reste une surface de lecture trop large.

Ces résultats sont des défauts de configuration/code présents en production au moment du contrôle. Ils n'ont pas été corrigés sur la base live pendant cette session; les migrations candidate restent non appliquées.


### Validation complète — 27 novembre, dernier HEAD confirmé

HEAD PR #158 : `6ea8e69cb10fea77241f164f5d7f5df792aa224d`.

- `Malachite validation` run `46044324325` : **28/28 jobs réussis**.
- `Match isolated PostgreSQL runtime` : succès.
- `MALACHITE live Pages verification` : succès.
- `Malachite release integration contract` : succès.

Un échec CI précédent du job `security-definer-search-path` provenait du miroir Microsoft APT (HTTP 403), pas du SQL. J'ai retiré le rafraîchissement global des index APT avant l'installation de `postgresql-client` dans les 25 étapes de la workflow validation; le job fautif repasse vert sur le dernier HEAD.

La PR #158 reste **draft / non fusionnée**. Les contrôles CI isolés ne changent pas le statut NO-GO de production : aucun backup/restauration complète, aucune migration de sécurité appliquée, aucun secret JaaS déployé, aucun appel réel inter-appareils vérifié.


### Classification des cinq migrations antérieures non enregistrées — vérification live

Contrôle des effets réels en catalogues PostgreSQL/Storage, sans mutation :

- `20261124130000_disable_public_campaign_storage.sql` : **effet déjà présent** — les deux buckets `malachite-campaigns` et `malachite-campaign-media` sont privés; aucune policy Storage de lecture campagne n'a été trouvée. Ne pas la compter comme un changement de sécurité restant, mais conserver la différence de ledger documentée.
- `20261124130100_reject_expired_call_acceptance.sql` : le trigger nommé n'existe pas. L'ancienne fonction de transition candidate doit être remplacée par le RPC participant-scopé avec vérification de l'expiration; ne pas appliquer isolément l'ancien trigger sans tester la séquence complète.
- `20261124140129_enforce_private_profile_public_projection.sql` : le trigger de projection privée n'existe pas en production. La chaîne candidate owner-only et les RPC de profil doivent être validés ensemble; ne pas appliquer cette projection séparément sans vérifier qu'elle ne réintroduit pas un profil privé découvrable avec une projection publique incompatible.
- `20261124142000_restrict_private_profile_photo_reads.sql` : la policy `profile photos read published paths` n'existe pas; l'ancienne policy large est toujours active. La correction finale est portée par la séquence `secure_private_profile_access` + `allow_published_public_profile_avatar_reads` (les deux restent non appliquées).
- `20261124143000_harden_call_session_immutable_fields.sql` : un trigger `guard_call_session_update` existe déjà, mais sa définition live est plus faible que le fichier : elle ne protège pas `id`, `expires_at` ou `ended_at`. La migration de transitions de la PR #158 remplace ce guard et ajoute le RPC de statut; ne pas considérer le trigger actuel comme suffisant.

Cela explique pourquoi une comparaison de noms/version bruts surestime les migrations manquantes. Le déploiement doit se baser sur les effets live et une restauration de staging, pas sur un simple comptage de fichiers.


### Déploiement contrôlé du statut JaaS sur staging — 27 novembre

J'ai déployé la révision candidate de `malachite-jaas-token` **uniquement** sur le projet isolé `sbawknyxcjslvhknomkd` : version 2, `verify_jwt=true`. La production `tscsmemsvgacqioncash` n'a pas été touchée.

Vérification directe du staging : `public.call_provider_is_enabled()` renvoie `false`; EXECUTE est accordé à `service_role` seulement et refusé à `anon` et `authenticated`. L'Edge Function version 2 est active. Je n'ai pas pu tester la réponse `action=status` avec une session Auth réelle faute de jeton de compte de test disponible; aucun secret JaaS n'a été configuré ni exposé.


### Vérification effective des ACL sur staging — 27 novembre

Après les migrations candidate déjà enregistrées sur le staging, j'ai interrogé `information_schema`, `pg_proc` et `pg_policies` en lecture seule :

- `authenticated` n'a que SELECT table-level sur `profiles`, `prives`, `login_names`, `call_sessions`, `paiements` et `user_notifications` selon les grants observés; `profiles.derniere_vue` est la seule colonne UPDATE accordée parmi les tables ciblées.
- `start_call_session` et `update_my_call_session_status` sont exécutables par `authenticated`, pas par `anon`; la création est fermée par le coupe-circuit privé actuellement à `false`.
- `call_provider_is_enabled` et `call_session_token_eligible` sont exécutables par `service_role` seulement.
- La policy Storage `profile photos read published paths` est présente et filtre les profils publics, chemins photos/avatars 3D publiés, blocages et suspensions.

Cela confirme les ACL/policies effectives du staging, pas la production. La production conserve encore les grants et la policy Storage large décrits plus haut.


### Correction staging — stockage campagne rendu privé

Le balayage de sécurité du staging du 27 novembre a révélé que les deux buckets campagne étaient redevenus `public=true` et que les policies SELECT publiques étaient encore actives, malgré zéro objet présent. J'ai appliqué uniquement au staging la migration équivalente à `20261124130000_disable_public_campaign_storage.sql` : buckets passés à `public=false`, policies de lecture publique retirées. Vérification post-migration : les deux buckets sont privés, aucune policy de lecture publique restante, zéro objet conservé/supprimé. Production inchangée.


### Correction staging — ACL des tables de conversation

Le contrôle effectif a aussi trouvé des grants historiques `anon` complets (INSERT/SELECT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER) sur `conversation_threads`, `conversation_members` et `conversation_pair_index`, sans aucune policy RLS pour `anon`. Les tables ont RLS activé et les seuls accès applicatifs attendus sont SELECT authentifié par participant; les écritures passent par les RPC sécurisés. J'ai retiré tous les privilèges `anon` sur ces trois tables et les privilèges inutiles `TRUNCATE/REFERENCES/TRIGGER` d'`authenticated`, en conservant SELECT. Vérification post-correction : zéro grant `anon`, SELECT uniquement pour `authenticated`. Staging seulement; production inchangée.


### Correction staging — blocage des liens Jitsi publics hérités

Le staging n'avait pas encore le trigger `zz_reject_legacy_public_call_links`; l'inventaire des messages a confirmé zéro ancien lien `meet.jit.si` et zéro message `media_type='call'`. J'ai installé la fonction/trigger candidate `reject_legacy_public_call_links` sur staging seulement. Le test SQL du dépôt `message_media_type_reconciliation_checks.sql` vérifie déjà le rejet de ces liens et accepte les médias autorisés; la validation CI complète est verte.

### CI de stabilisation — révision #158

Révision `7074c04e0b32c3657b952fd846bb2104eb9d1c05`: les quatre workflows réussissent, y compris release integration contract après correction du checkout de l'application candidate. PR #159 également : release contract et Pages réussis; validation et Match isolated PostgreSQL réussis sur HEAD `016a4e888ac5d56780ae8a99955c04bc7d33b50a`.


### Security Advisor + grant reconciliation du staging après corrections

Advisor relancé après les changements : 14 tables avec RLS sans policy sont signalées (tables privées/administration/AI/config/login/referrals). Vérification des grants effectifs : **aucun privilège `anon` ou `authenticated` sur ces 14 tables**. Aucun SECURITY DEFINER dans `public/private` n'a de `search_path` non fixé.

Warnings restants à traiter séparément : `pg_net` installé dans `public` (extension gérée par Supabase; ne pas déplacer sans plan de compatibilité); `get_malachite_referrer_preview(uuid)` callable par `anon`/authenticated, mais la fonction ne renvoie que prénom/username d'un profil public non suspendu et applique les blocages; 27 RPC SECURITY DEFINER exécutables par authenticated sont des chemins applicatifs/admin à revoir un par un, pas à révoquer en bloc sans casser les fonctionnalités. Advisor performance signale 24 index inutilisés; aucune suppression automatique, faute de preuve suffisante.


### Recontrôle Security Advisor production — 27 novembre

Advisor live production : 12 RLS-enabled/no-policy notices (tables privées/admin/AI/campagnes/referrals), 1 anon SECURITY DEFINER referrer-preview warning, 9 authenticated SECURITY DEFINER RPC warnings, et HIBP compromised-password protection désactivée. Catalogue SQL : aucun SECURITY DEFINER sans `search_path` fixé. Les tables sans policy sont inaccessibles via RLS, mais `public.campagnes` garde encore SELECT/INSERT/UPDATE/DELETE pour authenticated malgré l'absence de policy et le retrait des surfaces publicitaires; la migration `revoke_retired_campaign_table_access` doit être appliquée après backup/restauration validés. Les autres tables no-policy n'ont aucun grant anon/authenticated. Production non modifiée.


Production storage recheck : les deux buckets campagne sont déjà `public=false`, aucune policy SELECT publique campagne n'existe, et zéro objet campagne est stocké. La migration correspondante a donc déjà son effet live; le risque restant côté campagne est le grant table-level sur `public.campagnes`, pas les fichiers Storage.


### AI worker replay protection — production vs staging

Contrôle live des fonctions HMAC : la production valide le timestamp à ±300 secondes et le HMAC, mais n'exige aucun `request_id` unique et n'a pas de table nonce; un payload signé capturé peut donc être rejoué pendant la fenêtre de cinq minutes. Le staging a la migration candidate `prevent_malachite_ai_worker_replay` : taille du body plafonnée à 8 KiB, `request_id` UUID obligatoire, insertion atomique dans `private.malachite_ai_worker_nonces` avec contrainte unique, nettoyage des nonces > 1 jour, aucun grant client. **Production à corriger après backup/restauration**, migration déjà présente dans le candidat; aucune invocation worker ni mutation production effectuée.


### Suppression de compte — cartographie live des références non-FK

Catalogues production : plusieurs références UUID utilisateur ne disposent toujours pas de FK vers Auth/Profile et ne seront donc pas supprimées automatiquement. Les colonnes live concernées incluent `avis_match.user_id/autre`, `avis_site.user_id`, `deblocages.user_id/cible`, `messages.de/a`, `paiements.user_id`, `rendez_vous.de/a`, `signalements.de/profil`; `admin_actions.cible` est nullable, tandis que `ai_manager_audit.admin_id` est NOT NULL.

La suppression de compte ne doit pas être codée comme un simple `auth.admin.deleteUser`: il faut une séquence transactionnelle de nettoyage/anonymisation, purge des objets Storage par dossiers/participants, et traitement explicite des paiements/audits qui peuvent nécessiter une conservation comptable. Les colonnes `paiements.user_id` et plusieurs références sont NOT NULL; leur stratégie de conservation/anonymisation doit être décidée et testée sur une restauration avant d'activer un bouton de suppression. Production n'a pas de fonction `delete_my_account`/équivalent actuellement.


### Correction de l'audit âge/profil — chemin JSON vérifié

Rectification : l'appendice antérieur comptait à tort `prefs->profile_age`; le champ réel est `prefs->profile_private->age`. Le contrôle corrigé ne trouve **aucun âge hors plage** : 5 profils existants, tous publics et avec âge public valide; 2 profils publics n'ont pas d'âge privé redondant dans leurs préférences, ce qui n'est pas un défaut d'éligibilité puisque leur âge public est valide. 5 comptes Auth confirmés n'ont pas encore de profil (3 créés depuis plus de 7 jours); ils semblent être des inscriptions inachevées, à vérifier côté onboarding, sans suppression automatique. La requête précédente `missing_private_age=10` était un faux signal dû au mauvais chemin JSON et ne doit pas être utilisée.
