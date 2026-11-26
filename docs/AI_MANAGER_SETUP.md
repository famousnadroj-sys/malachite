# Malachite AI Manager

## Fonctionnalités en place

- Interface d'administration responsive, avec conversation et raccourcis de tâches.
- Tableau d'indicateurs agrégés alimenté directement depuis Supabase : membres, nouvelles inscriptions sur 7 jours, Premium actifs, paiements en attente, signalements nouveaux, support ouvert et suspensions.
- Conseils automatiques transparents fondés sur ces indicateurs, même lorsque le fournisseur IA n'est pas encore configuré.
- L'assistant peut recevoir les 8 derniers messages de la conversation active pour conserver le contexte pendant la session. Ces prompts ne sont pas enregistrés en base.
- L'Edge Function vérifie le JWT puis l'autorisation administrateur côté serveur. Le modèle ne reçoit que le texte saisi et des indicateurs agrégés.
- Aucune lecture de conversations privées, justificatifs, profils individuels ou secrets. Aucune action de paiement, suspension ou modification n'est exécutée par le modèle.
- Journal d'audit minimal : modèle, date, longueur de l'entrée et de la réponse. Pas de contenu de conversation.
- Limite : 10 réponses IA par minute et par administrateur.

## Activation du moteur de réponse

Le fournisseur câblé est Google Gemini, modèle par défaut `gemini-2.5-flash`.

Dans Supabase Dashboard → Edge Functions → Secrets, définir :

- `GEMINI_API_KEY` : clé Gemini créée dans Google AI Studio.
- `MALACHITE_AI_MODEL` : facultatif ; identifiant du modèle Gemini disponible dans le compte.

Ne jamais placer la clé dans le navigateur, GitHub ou une conversation. Vérifier les quotas et tarifs Google avant d'utiliser une offre payante. Tant que `GEMINI_API_KEY` est absent, le tableau d'indicateurs et les conseils automatiques fonctionnent, mais les réponses génératives restent désactivées et l'interface l'indique explicitement.

## Worker planifié et protection anti-rejeu

Le worker planifié est appelé par `pg_cron` via `pg_net`. Son endpoint Edge Function conserve `verify_jwt=false` car l'appel serveur-à-serveur n'utilise pas de session membre ; il vérifie à la place une signature HMAC calculée avec un secret conservé dans Supabase Vault. La RPC de vérification est réservée à `service_role`.

Après application de la migration `20261125170000_prevent_malachite_ai_worker_replay.sql` :

Avant d'appliquer cette migration, créer dans Supabase Vault, séparément dans chaque environnement, le secret `malachite_ai_worker_url` contenant l'URL Edge Function de CE projet (`https://<project-ref>.supabase.co/functions/v1/malachite-ai-worker`). Ne jamais copier l'URL de production dans staging. Si ce secret est absent ou invalide, la migration laisse le cron worker non planifié (fail closed).

- chaque appel cron inclut un UUID `request_id` dans le corps signé ;
- une table du schéma privé consomme atomiquement chaque UUID une seule fois ;
- une requête capturée et rejouée est rejetée, même si son timestamp est encore dans la fenêtre de cinq minutes ;
- les corps de plus de 8 Ko, les signatures invalides, les timestamps hors fenêtre et les appels sans nonce sont rejetés ;
- les nonces consommés sont conservés au plus 24 heures puis purgés lors d'une vérification valide.

Ne pas appeler manuellement l'endpoint worker avec un simple JWT ou un corps sans `request_id`. Ne jamais exposer le secret HMAC ou le rôle `service_role` au navigateur. Cette protection doit être testée dans PostgreSQL isolé avant toute application en production.

## Vérifications

1. Se connecter avec le compte administrateur autorisé.
2. Ouvrir Admin → Malachite AI Manager.
3. Vérifier le tableau d'indicateurs et son heure d'actualisation.
4. Configurer le secret, puis envoyer une question non sensible.
5. Tester un compte non administrateur : réponse 403.
6. Tester sans session : JWT refusé.
7. Vérifier que `public.ai_manager_audit` ne contient que les métadonnées attendues.

Ne jamais saisir de mots de passe, OTP, coordonnées privées, conversations ou justificatifs de paiement dans les prompts.
