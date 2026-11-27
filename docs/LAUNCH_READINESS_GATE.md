# MALACHITE — Conditions de déverrouillage du lancement

Ce document définit les contrôles humains obligatoires avant d'autoriser la publication publique. Les variables GitHub Actions suivantes doivent rester absentes ou à `false` tant que les preuves ci-dessous ne sont pas disponibles :

- `MALACHITE_DB_SECURITY_READY=true` : uniquement après application et vérification des migrations de sécurité de profil, de pause des paiements et de verrouillage des mutations de sessions d'appel sur la base de production.
- `MALACHITE_LAUNCH_APPROVED=true` : uniquement après validation de tous les points produit, juridique, opérationnels et de récupération ci-dessous.

## 1. Base de données et sécurité

- [ ] Migrations de profil appliquées : `save_my_profile` en SECURITY DEFINER, `search_path` vide, écritures directes retirées, RPC avatar/préférences vérifiées.
- [ ] Paiements fermés tant que le numéro dédié et les tarifs ne sont pas confirmés ; la table `config` n'est pas lisible par les rôles clients.
- [ ] Tests RLS et tests de non-régression passés sur un environnement de test représentatif.
- [ ] Sauvegarde de production vérifiée et restauration réelle testée avant changement.
- [ ] Plan de suppression de compte finalisé, testé et cohérent avec la conservation des messages, reçus, médias et signalements.

## 2. Inscription et sécurité des membres

- [ ] Confirmer le mode d'inscription définitif. Le code actuel implémente e-mail/mot de passe. Un parcours e-mail/mot de passe + Google avait été proposé, mais l'acceptation finale de Google n'est pas établie. Aucune exigence Malachite confirmée de téléphone + SMS n'a été retrouvée ; ne pas la déduire du projet RArs.
- [ ] Si Google est choisi : configurer OAuth, URL de redirection, consentement et tests réels. Si un autre mode est choisi, le spécifier et le tester avant lancement.
- [ ] Confirmer la règle 18+ et décider si l'auto-déclaration d'âge est suffisante ou si un contrôle supplémentaire est nécessaire.
- [ ] Tester récupération de compte, changement de téléphone/e-mail, sessions, déconnexion et révocation.

## 3. Juridique, modération et confidentialité

- [ ] Conditions d'utilisation et politique de confidentialité relues et approuvées pour les pays réellement ciblés, avec conseil juridique compétent.
- [ ] Règles de conservation et suppression des données documentées.
- [ ] Signalement, blocage, suspension, recours et accès administrateur testés.
- [ ] Les administrateurs n'ont pas d'accès général aux messages privés sans procédure autorisée et auditée.
- [ ] Procédure d'incident et contact de support opérationnel.

## 4. Paiements et appels

- [ ] Nouvelle SIM Airtel Money dédiée reçue et titulaire/récupération vérifiés ; aucun ancien numéro ne doit être réutilisé sans confirmation explicite.
- [ ] Prix Premium et Boost approuvés par le propriétaire, durée et avantages alignés sur le code.
- [ ] Procédure de vérification des paiements et des reçus testée de bout en bout.
- [ ] Fournisseur d'appels sécurisé configuré et testé si les appels sont annoncés comme disponibles. Le code actuel garde `SECURE_JITSI_PROVIDER_READY=false`, charge l'API publique `meet.jit.si` uniquement derrière ce verrou et ne contient pas d'Edge Function de jeton JaaS vérifiée. Il faut implémenter et tester le backend de jetons avant toute activation. Sinon, conserver les appels désactivés et ne pas vendre le Pass Appels.

## 5. Publication et exploitation

- [ ] URL publique définitive approuvée : domaine personnalisé vérifié ou acceptation explicite de l'URL GitHub Pages.
- [ ] HTTPS, redirections, sitemap, robots.txt, page 404 et prévisualisation isolée vérifiés.
- [ ] Tests réels sur Android, navigateurs mobiles et ordinateur.
- [ ] Journalisation, alertes, quotas, coûts et procédure de retour arrière vérifiés.
- [ ] CI complète verte sur la branche destinée à `main`.
- [ ] Le smoke test de l'artefact de publication passe avant toute publication.

**Règle :** ne jamais définir les variables de déploiement pour faire passer un workflow. Elles attestent que les contrôles ont été effectués ; elles ne remplacent pas les contrôles.


## Recheck — 27 novembre 2026 (état candidat)

Cet addendum prévaut sur les formulations plus anciennes de la section 4.

- Le client candidat garde les appels désactivés par défaut. Le fournisseur JaaS est préparé uniquement sur le staging, avec JWT de plateforme obligatoire, mais aucun AppID/ID de clé/secret privé n'a été configuré ni testé.
- Aucun appel privé réel entre deux comptes n'a été démontré. Ne pas activer les appels, ne pas vendre de Pass Appels et ne pas fusionner la bascule d'activation avant les tests d'autorisation JaaS.
- Le projet Supabase est sur le plan Free. La documentation Supabase indique que les sauvegardes quotidiennes automatiques concernent Pro, Team et Enterprise. La protection contre les mots de passe compromis est également disponible à partir de Pro. Ces contrôles ne peuvent donc pas être déclarés activés sur le plan actuel.
- Une procédure de sauvegarde logique et de transfert Storage est documentée, mais elle n'a pas encore été exécutée. Le dump CLI seul exclut les schémas Auth/Storage et les objets Storage ; il ne prouve pas une restauration complète.
- Les nouvelles migrations de privilèges, de confidentialité et de fonctions sont testées sur staging uniquement. Elles ne sont pas encore appliquées à la production.
- Les contrôles CI précédents sont verts sur leurs commits respectifs ; chaque nouveau commit doit encore terminer ses propres workflows avant d'être considéré validé.

**NO-GO maintenu** jusqu'à obtention d'une restauration isolée complète, sécurisation Auth, migrations réconciliées et tests d'appels privés. Ne pas définir les variables de déploiement pour contourner les contrôles.


## Recheck live production and CI — 27 novembre 2026

### Candidate GitHub
Le HEAD `dfefe7e5b92470e5740d2e6d2a0f33e5dbdfa5ed` (documentation/reconciliation atop candidate) has:
- Malachite validation: 27/27 successful jobs, including `ai-worker-replay-protection`.
- Match isolated PostgreSQL runtime: success.
- Live Pages verification: success.
- Release integration contract: success.

The previous code HEAD `37e8a0acdf8a5cab5e8d3bd3a3ca5ae9e5c3abcb` had the same four workflows green. CI does not apply migrations to Supabase production.

### Production versus staging
Read-only ACL comparison:
- Production has table-wide INSERT/UPDATE/DELETE on `call_sessions` and UPDATE/DELETE on `paiements`; `profiles` has broad INSERT/UPDATE/DELETE and direct UPDATE of profile fields including bio. RLS narrows rows, but direct writes bypass validated RPC field/transition rules.
- Staging has no direct call-session writes and no direct payment update/delete; profile direct update is limited to `derniere_vue`.
- Production and staging migration ledgers have no shared version: 65 production entries versus 106 staging entries. Staging includes schema-only baselines and is not a linear continuation of production. Do not replay either ledger into the other by timestamp.

### Remaining hard blockers
- No verified full production backup/restore exercise.
- No forward-only migration reconciled and tested against a production-derived disposable database.
- Auth leaked-password protection remains disabled; owner must enable it in project Auth settings if eligible.
- Public referral preview SECURITY DEFINER currently omits blocked/suspended checks; candidate migration/tests address this, not yet deployed.
- Secure JaaS token service and private two-account call test remain unverified; calls and call-pass sales stay fail-closed.
- Payment intake remains paused pending dedicated receiving number and final owner-approved payment setup.
- Payment push dispatch secret is missing; push delivery is not certified.

**NO-GO remains.** Keep deployment gates false until backup restore, canonical schema reconciliation, production ACL migration, Auth configuration and end-to-end user acceptance are complete.


## Recheck live security blockers — 27 novembre 2026, 12:40 UTC

### Account deletion
- Production has no dedicated account-deletion Edge Function and no public account/user deletion RPC.
- The applied `account_deletion_fk_cleanup` migration is confirmed to prepare three administrative references with `ON DELETE SET NULL`; it does not implement account deletion.
- Existing FK coverage is partial. The current live inventory has no FK on message participant columns, rendez-vous participants, Match vote participants, site-review author, report reporter/subject, or `paiements.user_id`. A read-only integrity check found **0 orphaned Auth IDs** across those ten reference columns at the snapshot time.
- The deletion/retention policy remains a draft. No account was deleted. See `docs/ACCOUNT_DELETION_READINESS_2026-11-27.md`.

### pg_net client grants — owner-side action required
- Production and staging each have 12 pg_net functions; all 12 currently have effective EXECUTE for `anon` and `authenticated`, and both roles have USAGE on schema `net`.
- Production cron `malachite-ai-ops-worker` and `malachite-admin-payment-push-batch` call `net.http_post` as `postgres`. Any restriction must preserve these backend jobs.
- The API's exposed-schema configuration could not be read through the connected tools. Do not claim an external HTTP-call path is confirmed; it is a potential high-priority risk if `net` is exposed via PostgREST.
- The connected SQL role `postgres` is not superuser and is not a member of schema/extension owner `supabase_admin`. A transactional revoke experiment left effective grants unchanged and was rolled back. Owner must verify `net` is absent from API exposed schemas and remove client grants through a privileged maintenance session, then test client denial and cron success. See `docs/PG_NET_CLIENT_PRIVILEGE_REVIEW_2026-11-27.md`.

### Candidate CI snapshot
The preceding candidate HEAD `6e6c753ff91e0771890c4cc8454cbc3009e07447` completed all four workflows successfully: Malachite validation, Match isolated PostgreSQL runtime, live Pages verification, and release integration contract. CI does not apply migrations or change Supabase production.

**NO-GO remains.** Keep launch/deployment gates false until full backup/restore, migration reconciliation, production privacy/ACL fixes, owner-side pg_net exposure/grant review, Auth protection, secure private calls, payment activation approval, and end-to-end acceptance are complete.


## Live verification correction — payment push / JaaS code — 27 Nov 2026, 12:55 UTC

### Payment push secrets and cron
A read-only check of `vault.decrypted_secrets` queried only secret names and whether each decrypted value is nonempty; no secret values were selected or disclosed. Production contains nonempty entries for `malachite_vapid_public`, `malachite_vapid_private`, and `malachite_push_hook`. Therefore the earlier statement that the payment-push dispatch secret was missing was **incorrect and is superseded**.

Live production status at the snapshot:
- 1 active push subscription.
- 0 undelivered payment push queue rows.
- `malachite-admin-payment-push-batch` last cron execution started at 2026-11-27 12:50 UTC and reported `succeeded`.

This verifies secret presence and cron execution, but not delivery to a real device. An owner-authenticated push test and a new-payment-to-device end-to-end test remain to be performed. Do not send a test notification without the owner's explicit request.

### JaaS token function
The candidate source `supabase/functions/malachite-jaas-token/index.ts` matches the deployed staging version (version 1). Source review confirms authenticated Supabase user validation, participant-only session lookup, accepted/unexpired session requirement, a server-side eligibility RPC, strict Malachite room-name format, 120-second RS256 token, and non-moderator user claims. The staging eligibility RPC additionally checks provider enabled, both participants not suspended, and no block in either direction; EXECUTE is denied to anon/authenticated and granted to service_role.

Live staging provider config is `enabled=false`, with zero accepted active calls and zero active pending calls at the snapshot. This is correctly fail-closed. JaaS credentials are not confirmed configured; JWT signing and a real two-user JaaS join have not been tested. No production function or call setting was changed.


## Staging candidate ACL regression check — 27 Nov 2026, 13:00 UTC

Read-only effective-privilege query against staging confirmed:
- `authenticated` cannot INSERT or table-level UPDATE `public.profiles`; UPDATE on `profiles.derniere_vue` is allowed; UPDATE on `profiles.bio` is denied.
- `authenticated` cannot INSERT or UPDATE `public.call_sessions`.
- `authenticated` cannot UPDATE or DELETE `public.paiements`.
- Profile SELECT RLS policy is owner OR `profile_private=false` and excludes blocked/suspended profiles (candidate policy is in effect on staging).
- `private.call_provider_config.enabled=false`; there are zero active accepted calls and zero pending calls, so call provider remains closed.
- Staging payment pending count is 0 at snapshot.

This is a catalog/effective-ACL check, not an HTTP-level test with real member JWTs. The isolated CI negative tests and final two-device acceptance are still required. Production remains on its legacy broader ACL until the approved, backed-up release.


## Referral preview RPC — exact live function comparison — 27 Nov 2026, 13:10 UTC

Production `public.get_malachite_referrer_preview(uuid)` is `SECURITY DEFINER`, fixed `search_path=''`, and executable by anon/authenticated as intended for a public referral preview. Its current WHERE clause only checks `profile_private=false`; it does **not** exclude suspended profiles or a block relationship for the authenticated viewer. Staging candidate definition adds a suspension exclusion and, when `auth.uid()` is present, excludes blocks in either direction. The candidate function is still intentionally callable by anon/authenticated for the public preview.

This is a verified production privacy correction target, not an anonymous execution bypass. The candidate has been tested on staging; production remains unchanged until the backup/release gate is approved.


## Profile privacy exposure impact snapshot — production, 27 Nov 2026 13:12 UTC

Aggregate-only query (no member IDs or profile contents selected): production currently has 5 profiles, 0 marked private, 5 public, and 0 suspended public profiles. Therefore the incorrect private-profile SELECT policy is a confirmed **policy/control defect**, but the current profile data snapshot contains no profile with `profile_private=true` that is exposed by that defect. This does not make the policy acceptable; users could mark profiles private before the production fix is deployed. No profile data was changed.


## Exact production profile RPC review — 27 Nov 2026, 13:15 UTC

Catalog inspection of the live `public.save_my_profile(p_profile jsonb,p_private jsonb)` definition confirms:
- It is currently **SECURITY INVOKER**, not SECURITY DEFINER. Authenticated can EXECUTE; anon cannot.
- It verifies `auth.uid()` and profile ID ownership, but only rejects `p_private.profile_age < 18` when non-null. It does not reject missing or >100 age in the server-side RPC.
- The RPC writes private/profile/login-name data and uses a direct `INSERT ... ON CONFLICT DO UPDATE` path. The current production grants/RLS do not yet match the candidate least-privilege profile RPC cutover.

This makes the profile RPC/ACL/age migration a confirmed production blocker, not a theoretical one. Candidate staging regression check shows table-level profile INSERT/UPDATE revoked, only presence-column UPDATE remains, and the trusted RPC path is tested in isolated CI. No production function/grant was changed.


## Production Edge Function drift review — 27 Nov 2026, 13:20 UTC

Compared live deployed source bytes against the candidate branch for all six production Edge Functions:

| Function | Live version | Exact source match to candidate |
|---|---:|---|
| `malachite-ai-manager` | 24 | yes |
| `malachite-ai-worker` | 14 | no |
| `malachite-admin-push` | 6 | yes |
| `username-login` | 7 | no |
| `admin-user-moderation` | 5 | yes |
| `malachite-ad-creative` | 6 | yes |

### Confirmed production drift
- `username-login`: production still trusts fallback `x-real-ip` / `x-forwarded-for` and uses a non-atomic direct count/insert rate limiter. Candidate uses only the edge-provided `cf-connecting-ip` and an atomic database throttle RPC for login and username-check actions. This is a security/abuse-control gap; deploy the candidate only after a reviewed production migration confirms the RPC exists and the edge IP header is trustworthy at the Supabase ingress.
- `malachite-ai-worker`: production does not yet enforce a bounded request-body reader and does not reconcile already-resolved review tasks; candidate adds both. Production currently verifies a short-lived HMAC via `verify_malachite_ai_worker_signature`, so do not replace or bypass that check. Candidate needs staging deployment and signed cron/manual invocation tests before production update.

The other four production function source files exactly match the candidate branch. The staging `username-login` version 1 source exactly matches the candidate. Staging does not currently expose the AI worker in its function inventory, so worker deployment/runtime parity is not proven.

No production Edge Function was deployed or changed. Treat the two mismatches as required release work, with rollback versions recorded before deployment.


## Login throttle migration dependency — 27 Nov 2026, 13:25 UTC

Read-only check of the exact candidate RPC signature `public.consume_username_login_attempt(text,integer,integer)`:
- Production: function **absent**.
- Staging: function present; EXECUTE is granted to `service_role`, denied to `anon` and `authenticated` (correct for the Edge Function's service-role caller).

Therefore deploying candidate `username-login` Edge Function to production **before** applying its reviewed migration would make login and username-check return 503 (fail closed, but break the login flow). Deployment order must be: backup/restore gate → apply and verify atomic throttle RPC + table/index/retention dependencies → run DB negative/effective-ACL tests → deploy Edge Function source → test login and check endpoints with rate-limit thresholds. Roll back function source if endpoint smoke tests fail; do not weaken the rate limit to recover service.


## AI worker HMAC replay and cron migration dependency — 27 Nov 2026, 13:30 UTC

Exact live production/staging inspection of `public.verify_malachite_ai_worker_signature(text,text,text)` found only a 5-minute timestamp window and HMAC-SHA256 validation; it does not consume a unique request ID. The candidate anti-replay migration `20261125170000_prevent_malachite_ai_worker_replay.sql` is **not recorded in staging's migration ledger** and the staging verifier body also lacks the nonce insert. The candidate isolated CI anti-replay test is not evidence that the live staging DB has this migration.

Production cron `malachite-ai-ops-worker` is active every 15 minutes and last reported `succeeded` at 12:45 UTC. Its stored command signs the request but contains no `request_id` and does not generate a UUID. Production Vault currently has a nonempty `malachite_ai_worker_hmac`, but the candidate migration's required `malachite_ai_worker_url` and `malachite_ai_worker_project_ref` are absent (checked only presence/nonempty; no secret values read).

**Do not apply the anti-replay migration blindly.** Its migration deliberately unschedules/replaces the cron and leaves it unscheduled unless both independently configured URL and project-ref secrets match. Without those two values, applying it would stop the existing worker schedule. Required safe sequence: stage and test the nonce migration/function + request-id cron command; have owner configure URL and exact project-ref Vault entries through trusted dashboard; verify both entries nonempty and match project; test one signed invocation and replay rejection; then prepare a production migration that atomically installs nonce protection and schedules the replacement cron, preserving rollback and current worker functionality. No cron or Vault secret changed in this audit.


## AI worker current operational health — production snapshot 27 Nov 2026 13:00 UTC

The last three `ai_ops_runs` were `success`, with no error code, each completing in approximately 0.8–1.0 seconds. At the latest run: 5 members, 0 pending payments, 0 pending reports. This confirms the existing worker is currently operating; it does not remove the replay/idempotency/body-size concerns or prove the candidate worker has been deployed. Keep the existing cron intact until the hardened replacement is preflighted and tested.


## Username login attempt table index — production, 27 Nov 2026 13:32 UTC

Production `username_login_attempts` currently has only its primary-key index; no composite `(ip_hash, attempted_at)` index exists for the current per-IP window query. The candidate reconciliation migration adds `username_login_attempts_ip_time_idx` and its isolated test verifies retention index/cron and service-role-only throttle. Include that migration before the new atomic throttle RPC and Edge Function deployment; do not create an index ad hoc in production without the backup/release package.


## Production call boundary review — 27 Nov 2026, 13:40 UTC

Production catalog confirms `public.start_call_session(uuid,uuid,text,text,timestamptz)` is SECURITY DEFINER and executable by authenticated. It requires auth, a Premium/call entitlement, mutual Match, no block, and a short expiry, but the live function does not check caller/callee suspension or private-profile visibility. It inserts directly into `call_sessions`. Production has no `private.call_provider_config` and no deployed `malachite-jaas-token` function (staging only); the candidate fail-closed provider migration is not applied to production.

Aggregate snapshot: 0 active pending/accepted sessions, 0 active accepted sessions, 0 call_sessions room values containing `meet.jit.si`. This means no active call at the snapshot, not that the production call feature is secure. Candidate remains disabled and fails closed; production needs the reviewed call-creation revocation/secure provider migration before calls can be enabled or sold.


## Private schema API exposure review — production, 27 Nov 2026 13:50 UTC

Catalog read-only check: `anon` has no USAGE on schema `private`; `authenticated` does have USAGE. Many private SECURITY DEFINER helpers retain default EXECUTE for authenticated. The helpers reviewed include caller-scoped functions (`private.est_premium`, `private.is_blocked_with`, `private.blocked_user_ids`, `private.contact_de`) and admin-guarded functions (`private.admin_moderate_user`, `private.traiter_paiement`, `private.publish_user_announcement`). Trigger-only functions such as `private.signalement_guard/log`, `private.sync_login_name_from_auth`, and `private.notify_admin_new_payment_push` cannot be called as ordinary RPCs.

One helper, `private.is_suspended(uuid)`, accepts an arbitrary target ID and is used internally for visibility/call checks. If the `private` schema were exposed through PostgREST, authenticated RPC could disclose suspension state. The current API exposed-schema list is not readable through the connected project tools, so exposure is **not confirmed**. Owner action: verify `private` is not in Supabase API exposed schemas; retain the schema private and add a reviewed function ACL allowlist without breaking RLS policy execution. Do not blindly revoke EXECUTE from helpers used by invoker functions/RLS.


## Correction — pg_net default grants are not a confirmed client vulnerability — 27 Nov 2026, 14:00 UTC

This supersedes the earlier sections that listed per-project pg_net grant revocation as a hard launch blocker. Supabase's current official documentation/KB confirms these are platform default grants owned by `supabase_admin`; revoking as `postgres` has no effect, `anon`/`authenticated` are NOLOGIN, and `net` is protected/not exposed through the Data API by default. The live role catalog confirms anon/authenticated/service_role are NOLOGIN in both production and staging. The exact Dashboard exposed-schema list remains unavailable via the SQL connector, but there is no evidence of external client invocation.

**Revised gate:** do not attempt REVOKE, drop/recreate, or relocate pg_net as a launch fix. Treat the advisor warning as a platform-default/configuration check, not a confirmed exploitable defect. Verify `net` remains unexposed and preserve the `postgres` cron jobs. The updated technical assessment is in `docs/PG_NET_CLIENT_PRIVILEGE_REVIEW_2026-11-27.md`.

Official references: https://supabase.com/kb/troubleshooting/revoking-access-to-pg_net-objects-has-no-effect-0bbc16 and https://supabase.com/docs/guides/database/extensions/pg_net.


## Production RLS-versus-grant distinction — 27 Nov 2026, 14:10 UTC

A fresh `pg_policy` catalog review clarifies the live write paths (grants alone do not prove an effective row mutation):
- `config`: authenticated has SELECT and broad mutation grants, but its only RLS policy is SELECT `true`; no INSERT/UPDATE/DELETE policies exist. Current keys are only `airtel,orange`. Direct client destination changes are currently RLS-denied, but unnecessary grants remain and should be revoked in the candidate release.
- `paiements`: authenticated INSERT grant and a live member-submission RLS policy are active. UPDATE/DELETE grants exist, but no UPDATE/DELETE RLS policies were found, so direct row mutation is currently denied by RLS. **Payment intake is still active in production** (candidate pause is not applied); do not claim it is paused. Pause/re-enable remains an explicit owner decision tied to the dedicated SIM and approved payment setup.
- `call_sessions`: authenticated INSERT/UPDATE/DELETE grants exist. INSERT RLS allows paid mutual-match participants and checks expiry/block, but not suspension/private-profile visibility or secure provider state; UPDATE RLS permits participant updates and relies on a legacy trigger. Direct session writes are an actual production path. Candidate revokes direct writes and fails closed until JaaS is authenticated.
- `profiles`: authenticated direct INSERT/UPDATE/DELETE grants and owner RLS policies exist. This permits owner field writes that bypass the validated profile RPC; production `save_my_profile` is currently SECURITY INVOKER and age checks are incomplete.
- `statuts`: authenticated SELECT RLS policy is `true`, exposing entitlement rows to all authenticated members. Candidate restricts this visibility.

This distinction is important: current direct payment UPDATE/DELETE and config writes are blocked by missing RLS policies, but broad grants are still defense-in-depth gaps; active payment INSERT and call-session INSERT/UPDATE are not similarly blocked.


## Entitlement status exposure impact — production snapshot 27 Nov 2026 14:15 UTC

`public.statuts` has only `user_id`, `premium_until`, `verified_until`, and `boost_until`; authenticated SELECT is allowed with RLS policy `true`. Aggregate-only snapshot: 3 status rows, 2 currently Premium, 0 verified, 0 boosted. Thus any authenticated member can currently read the other members' entitlement expiration dates and Premium state through the table. This is a confirmed privacy gap, not just excess grants. Candidate `20261124200100_limit_entitlement_status_visibility` + `20261126190000_reassert_entitlement_status_visibility` restrict row visibility; staging effective policy and CI tests pass. Production remains unpatched.


## Live main-branch calls client — public Jitsi confirmed — 27 Nov 2026 14:20 UTC

Compared `calls.js` on repository `main` (the production Pages source) with candidate branch:
- Main still loads `https://meet.jit.si/external_api.js` and joins public `meet.jit.si` rooms; it does not call `malachite-jaas-token` or use `8x8.vc` authenticated JaaS.
- Candidate removes public Jitsi and keeps calls unavailable until secure JaaS is configured/tested.
- Production payment ledger has 2 validated `Appels` purchases, 1 currently unexpired pass; no active call session at the live snapshot. Payment INSERT policy still allows call-pass submissions in production.

This confirms a production call privacy risk if a room name is shared/guessed and a product inconsistency: calls/call-pass sales are not yet fail-closed on live main. The candidate fixes this, but is not merged/deployed. The owner must approve the backed-up release; do not re-enable calls or sell new passes until authenticated JaaS two-account tests pass. No production call/pass setting was changed.


## Staging anti-replay migration applied and verified — 27 Nov 2026 14:25 UTC

Applied candidate `20261125170000_prevent_malachite_ai_worker_replay.sql` to staging only, after confirming staging had no `malachite-ai-ops-worker` cron job and no worker URL/project-ref/HMAC secrets. The migration completed successfully. Read-only post-check confirms:
- private nonce table exists with RLS;
- verifier function includes request-ID nonce consumption;
- EXECUTE is denied to anon/authenticated and granted to service_role;
- worker cron count remains 0 (no configuration existed, so no schedule was created).

Staging HMAC/URL/project-ref secrets are absent, so no valid signed worker request can be exercised there and no worker cron is active. Isolated CI's anti-replay/replay/missing-config tests passed 27/27. This staging DB change is not production and did not modify any secret or cron.


## Production username-login throttle prerequisite — 27 Nov 2026, 13:24 UTC

Fresh read-only production catalog query confirms `public.login_names` and `public.username_login_attempts` exist (5 username mappings, 4 historical attempt rows at snapshot), but `public.consume_username_login_attempt(text,integer,integer)` does **not** exist in production. Therefore production cannot yet safely deploy the candidate `username-login` Edge Function: it will fail closed with HTTP 503 until the exact reviewed schema migration is applied. The candidate migration creates a transaction/advisory-lock atomic limiter, validates parameters, and grants EXECUTE only to `service_role`; the staging runtime test passed in CI. This dependency must be sequenced migration-first, then Edge Function deployment, followed by login/check and rate-limit tests through the public production endpoint. No production changes were made.


## Production call-access inventory — 27 Nov 2026, 13:31 UTC

Read-only production catalog and Edge Function inventory confirm that production has **no** `private.call_provider_config` table, no `public.call_session_token_eligible(uuid,uuid)` RPC, and no deployed `malachite-jaas-token` Edge Function. Production has 0 accepted/unexpired call sessions and 0 pending/ringing unexpired sessions at the snapshot. The secure JaaS token endpoint exists only in staging (version 1); staging provider is disabled and its eligibility RPC denies direct browser EXECUTE. Thus production calling is not configured/launch-ready; do not enable paid calls or claim private JaaS rooms work until the provider config/eligibility migration and authenticated token function are deployed in correct order, secrets are installed, and two real accounts join/leave a private room on two devices.

## AI worker replay migration regression status — 27 Nov 2026, 13:32 UTC

The latest isolated PostgreSQL validation job for commit `01c266831075826885fc4754f77b6c5a45077f74` passed the AI-worker replay protection test, including valid signature, one-time nonce rejection, missing-config preservation, project mismatch cron disable, and no-scheduler fixture. Application JavaScript validation also passed; Match isolated PostgreSQL runtime, Pages verification, and release integration contract passed on this commit. The overall Malachite validation workflow was still completing its remaining parallel ACL/reconciliation jobs at the snapshot. Later documentation-only updates must be followed by a final green workflow check.


## Fresh Supabase advisor + call deployment inventory — 27 Nov 2026, 13:36 UTC

### Advisor refresh
- Production security advisor remains: 12 RLS-enabled/no-policy findings (reviewed as intentionally closed/private tables; do not add blanket policies), 1 anon SECURITY DEFINER RPC (`get_malachite_referrer_preview`), 9 authenticated SECURITY DEFINER RPC findings, and leaked-password protection disabled.
- Staging: 14 RLS-enabled/no-policy findings, 1 `pg_net` extension-in-public warning, 1 anon SECURITY DEFINER finding, 26 authenticated SECURITY DEFINER findings. The private nonce table is intentionally RLS-enabled without client policies. The pg_net placement/grant issue remains a privileged-owner remediation item; do not move the extension blindly because cron jobs depend on it.
- Performance advisor lists 18 unused production indexes and 24 staging indexes. These are informational snapshots on a low-traffic/new system; do not drop them before real workload evidence and query-plan review. Health advisor reports no lints in either environment.

### JaaS deployment inventory
- Production Edge Functions list has six active functions and does **not** include `malachite-jaas-token`.
- Staging has `malachite-jaas-token` version 1 with platform JWT verification enabled, plus Match preview and username-login.
- The token issuer source and fail-closed call migration exist in the candidate branch. Staging token signing has not been proven because the three JaaS secrets are not configured; no real provider join was tested. Production call enablement remains off/blocked. The correct next sequence is configure tenant/key securely, test staging token issuance and negative cases, then separately deploy production after backup and reviewed migrations.

Latest candidate CI for SHA `71372559faabc0c3529cdb3515a88032c170ad31`: validation, integration contract, Pages verification, and isolated Match PostgreSQL runtime all completed successfully. PR #158 remains draft and unmerged; green CI is not production release approval.


## Production Storage authorization audit — 27 Nov 2026, 13:39 UTC

Read-only production inspection confirms all six buckets are private, with explicit MIME and size limits (chat-media 50 MiB; campaign media 20 MiB; payment receipts/photos/profile photos 5 MiB; campaign images 1.5 MiB). Storage RLS is enabled with owner/participant policies.

One production policy gap is confirmed: `storage.objects` SELECT for `chat-media` checks that the authenticated user is in either folder path segment, but it does not require a matching message row and does not re-check blocking or suspension. A member with the other participant's folder ID could therefore retain direct object read access after a block/suspension or to an orphaned object, depending on the object path. The candidate migration `20261126160000_harden_chat_media_read_access.sql` replaces that broad rule with a matching-message check and re-checks both participants' block/suspension status; it also reasserts the legacy `photos` read policy. Its regression suite covers blocked/suspended sender and recipient, path mismatch, and private-profile conversations. This remains a production fix until reviewed migrations are applied.

No storage object or policy was changed in production.


## Latest candidate CI closure — 27 Nov 2026, 13:43 UTC

For candidate SHA `fc75dda1aa7200c647c47ebf013b9008124a6358`, all four workflows completed successfully:
- Malachite validation: 27/27 jobs passed, including chat-media access, account-deletion FK inventory, profile-age enforcement, username-login throttle/reconciliation, effective authenticated ACL, payment-intake pause, admin payment-push reconciliation, legacy avatar cleanup, and SECURITY DEFINER search-path checks.
- Match isolated PostgreSQL runtime: passed.
- Release integration contract: passed.
- Live Pages verification: passed.

This closes the candidate-code/CI validation gate only. PR #158 is still draft/unmerged; no production migration or function deployment has been applied. Production backup/restore certification, privileged pg_net ACL remediation, migration ledger reconciliation and release approval remain outstanding. Calls require configured JaaS tenant credentials and live two-account tests; payment intake remains paused pending the dedicated receiving account confirmation.


## ACL production/staging side-by-side recheck — 27 Nov 2026, 13:50 UTC

A fresh direct privilege query confirms the candidate is not yet live in production:

| Effective authenticated privilege / RPC | Production | Staging |
|---|---:|---:|
| profiles table SELECT | false (column SELECT grants exist) | true |
| profiles table UPDATE | true | false |
| profiles.bio UPDATE | true | false |
| profiles.derniere_vue UPDATE | true | true |
| call_sessions INSERT / UPDATE / DELETE | true / true / true | false / false / false |
| paiements INSERT / UPDATE / DELETE | true / true / true | false / false / false |
| start_call_session RPC EXECUTE | true | false |
| call_session_token_eligible RPC exists | no | yes |
| consume_username_login_attempt RPC exists | no | yes |

This confirms staging's least-privilege cutover and fail-closed call/payment state are in place, while production remains on the legacy grants and RPCs. These are live catalog facts; RLS still independently affects row-level access, but it does not replace column-level least privilege or server-side state transitions. No production ACL or function was changed.

The four workflows were rechecked on the latest documentation HEAD `7fc9e1013aa4710e2ce83d4cab537bd2d18affbf`: validation 27/27 jobs passed; Match runtime, Pages live, and release integration all passed. This still does not authorize a production rollout.


## Worker / push configuration live recheck — 27 Nov 2026, 13:53 UTC

Production Vault name-only inventory (secret values never read): only `malachite_ai_worker_hmac` is present among the checked Malachite worker, push and JaaS names. `malachite_push_project_url`, `malachite_ai_worker_url`, `malachite_ai_worker_project_ref`, and all JaaS secret names are absent. The AI worker cron exists every 15 minutes, uses `net.http_post` and an HMAC signature header, but its command contains no `request_id`; this confirms the production cron is not yet compatible with the candidate nonce replay verifier. The payment-push batch cron remains scheduled every minute but its destination project URL secret is absent, so real push delivery is not certified. No cron or secret was changed.

Production payment snapshot: 8 payment rows, 0 pending at query time. This is only a point-in-time count; do not infer that payment intake is disabled. Production still has authenticated INSERT on `paiements`; the candidate staging state intentionally pauses intake until the dedicated receiving account is confirmed.


## Worker migration safety correction + CI — 27 Nov 2026, 13:58 UTC

Reviewing the actual production Vault inventory revealed that the AI worker cron is active but `malachite_ai_worker_url` and `malachite_ai_worker_project_ref` are absent. The candidate anti-replay migration initially allowed an incomplete-config path to continue after replacing the signature verifier, which could have left the old cron sending nonce-free requests that the new verifier would reject. This was corrected: if an active worker cron exists and URL/project-ref/HMAC configuration is incomplete, the migration now raises during its first preflight statement, before creating the nonce table or replacing the verifier. A separate clean-database regression test proves the legacy cron and verifier remain unchanged on that failure; tests also prove a previously migrated nonce cron remains unchanged if config is later removed.

Candidate commit `02b9f5c63dd89d455dafd04b25e52c21e7529498`: all four workflows passed; Malachite validation **27/27**, Match isolated PostgreSQL runtime, Pages live verification, and release integration contract all successful. This is still candidate validation only. Production worker URL/project-ref must be configured securely by the owner before this migration can pass its active-cron preflight; no production secret, function or cron was changed.


## Call creation integration correction + staging proof — 27 Nov 2026, 14:05 UTC

Review of `calls.js` found a release-path gap: the UI calls `start_call_session`, but the fail-closed migration had replaced that RPC with an unconditional exception and revoked authenticated EXECUTE. Simply configuring JaaS would therefore never make calls work. Added `20261127140000_enable_call_creation_when_provider_configured.sql`: it restores the RPC to authenticated users while retaining a hard provider-switch check (OFF by default), and validates identity, strict room format, 90-second expiry, Premium/active call pass, reciprocal match, block/suspension state, no overlapping active calls, and per-user advisory locks against concurrent call creation.

Dedicated CI job `call-creation-provider-gate` passed on candidate SHA `ca2c8146d02108de8fb311d455b5f180046a19be`; full validation is **28/28 jobs passed**, plus Match isolated PostgreSQL, Pages live and release integration all passed. The migration was then applied to the isolated staging project only. Live staging catalog confirms provider remains OFF, authenticated can execute the gated RPC, anon cannot, and both the fail-closed guard and concurrency locks are present. Production remains unchanged.

This fixes the future activation path but does not turn calls on: JaaS secrets are still absent, no real two-account join has been tested, and the UI's provider flag remains false until a separately reviewed release after owner configuration.


Staging runtime smoke check — same date, after migration: executed `start_call_session` as `authenticated` inside a rollback-only transaction with a synthetic session and provider disabled. It returned exactly `secure_call_provider_unavailable`; transaction rolled back and no call row was created. This confirms the live staging database fails closed, not only the isolated CI fixture.


## Live frontend source-vs-candidate comparison — 27 Nov 2026, 14:08 UTC

The GitHub `main` branch (the source for the public Pages deployment) is still behind the candidate for `calls.js`, `app-core.js` and `index.html`. In particular, live/main `calls.js` still loads `https://meet.jit.si/external_api.js` and joins `meet.jit.si`; it does not call `malachite-jaas-token`. Candidate `calls.js` uses the 8x8 JaaS API and keeps `CALL_PROVIDER_ENABLED=false` until private credentials and two-account tests are complete. Therefore the public production frontend has not yet received the candidate fail-closed call UI. Do not claim calls are protected on the live site merely because candidate CI passed. This is a release-critical frontend gap; resolving it requires an approved Pages deployment of the candidate (which intentionally suspends calls until JaaS is activated). No Pages/main deployment was triggered by this audit.


## SECURITY DEFINER allowlist refresh after call RPC activation gate — 27 Nov 2026, 14:10 UTC

The new gated `start_call_session` is SECURITY DEFINER and intentionally executable by authenticated clients; its body validates the caller, entitlement, mutual match, block/suspension, active-call collision and provider OFF switch. Added its exact signature to `security_definer_surface_allowlist_checks.sql`. Ran the full allowlist/search_path assertion against the live isolated staging schema after applying the new migration; it passed with no unexpected SECURITY DEFINER RPCs or unsafe search paths. Staging advisor count now shows 27 authenticated SECURITY DEFINER functions (the prior count was 26); this new entry is intentional and allowlisted. No production change.


## RLS-without-policy ACL spot-check — 27 Nov 2026, 14:12 UTC

Direct privilege inventory of all advisor-listed RLS-enabled/no-policy tables confirms that the majority have no anon/authenticated table privileges in either environment. Three production exceptions retain broad authenticated grants despite having no RLS policy: `public.campagnes`, `public.config`, and `public.login_names` (SELECT/INSERT/UPDATE/DELETE effective grants all true). RLS currently blocks row access because there are no applicable policies, so this is not evidence of a successful data read/write; it is unnecessary defense-in-depth exposure if a permissive policy is ever introduced. Staging has no client privileges on these three tables. Candidate reconciliation/revocation migrations and CI checks cover these ACLs. No production grants or policies were changed.


## Push secret inventory clarification — 27 Nov 2026, 14:14 UTC

A broader name-only Vault query corrects the earlier summary: production **does** have `malachite_push_hook`, `malachite_vapid_public`, and `malachite_vapid_private`. The missing value is specifically `malachite_push_project_url`; the admin-push Edge Function is deployed and reads the hook/VAPID values via the server-only `get_malachite_push_secrets` RPC. Thus Web Push key material and the internal hook secret are present, but the scheduled payment-push dispatcher still lacks its target project URL, so end-to-end delivery remains unverified. Do not insert the destination URL into Vault without explicit owner approval; no secret values were read or changed.


Push subscription inventory — production read-only snapshot, 27 Nov 2026 14:16 UTC: one admin push subscription exists and is not revoked; queue contains 0 notifications and 0 undelivered items. Its last subscription timestamp is 21 Nov 2026. This proves one device registered, not that delivery works. The missing project URL and absence of a fresh end-to-end test remain the delivery gate; subscription endpoint/key material was not read.


## Edge Function deployment matrix recheck — 27 Nov 2026, 14:18 UTC

Production inventory: `admin-user-moderation` v5 (JWT on), `malachite-admin-push` v6 (JWT off; custom internal-hook/admin checks), `malachite-ad-creative` v6 (JWT on), `malachite-ai-manager` v24 (JWT on), `malachite-ai-worker` v14 (JWT off; HMAC), and `username-login` v7 (JWT off; custom login/rate controls). Production does not contain `malachite-jaas-token`.

Staging inventory: `malachite-match-preview` v20 (JWT off; preview access controls), `username-login` v1 (JWT off; candidate custom throttling), and `malachite-jaas-token` v1 (JWT on). This confirms the private token issuer is staged with platform JWT verification but not deployed to production. No Edge Function was deployed in this recheck.


## CI final recheck after documentation and ACL allowlist updates — 27 Nov 2026, 14:20 UTC

Latest branch HEAD `216219c762d846c3752e368089b7fee4c90d133d`: all four workflows completed successfully. Malachite validation **28/28 jobs**, Match isolated PostgreSQL runtime, Pages live verification and release integration contract all green. PR #158 remains draft/unmerged. The code-specific provider-gated call migration and test were included in the 28-job validation run; the full SECURITY DEFINER allowlist assertion was separately executed against live staging after applying the new migration and passed.


## Production SECURITY DEFINER allowlist divergence — 27 Nov 2026, 14:24 UTC

Running the candidate allowlist assertion read-only against production fails on the extra RPC `public.founder_finance_summary(timestamptz,timestamptz)`, which remains EXECUTE-able by authenticated there. Its live function body was inspected: it explicitly requires non-null `auth.uid()` and `private.is_admin()` before reading the private finance ledger, so this is not evidence that ordinary members can read finance data. The current founder dashboard uses `founder_business_overview`, not this legacy summary RPC. Candidate migration `20261126221000_restrict_founder_finance_summary.sql` revokes public/anon/authenticated EXECUTE and retains service_role only; staging assertion passes. Production remains on the old grant until the approved release. The failed production allowlist check is an expected drift detector, not an unhandled staging failure.


## Web Push VAPID contact correction + CI — 27 Nov 2026, 14:27 UTC

The production admin-push Edge Function source contained a hard-coded contact `mailto:admin@malachite.app` that had not been verified as an owned/working mailbox. Candidate source now uses the verified public Malachite site URL as the VAPID subject URI in all three send/test paths; no fictional support mailbox is presented. Latest candidate SHA `064d466a8261e9e0b121cc940ed6a97550fcc65c`: all four CI workflows passed, validation 28/28. This is source-only; production function v6 was not redeployed. A real push test still requires the missing Vault project URL and a device test.

Push secret structural check (values never emitted): hook secret length 43, VAPID public key length 87, private key length 43; both VAPID values match base64url character shape. The `get_malachite_push_secrets()` RPC is SECURITY DEFINER with empty search_path, executable by service_role only (anon/authenticated denied). This confirms format/ACL plausibility, not cryptographic key-pair correspondence or delivery; the live send test remains outstanding.


## CI après ajout du runbook de release — 27 Nov 2026, 14:32 UTC

HEAD `ca11702c0a1ea17855421116e570a156cc8c9e4f` : validation Malachite **28/28**, Match PostgreSQL isolé, vérification Pages live et contrat d'intégration release tous réussis. Le runbook `docs/PRODUCTION_RELEASE_SEQUENCE.md` est donc couvert par un HEAD candidat entièrement vert. Le statut production reste NO-GO.


CI environment reliability note: one validation rerun failed before SQL tests because the Ubuntu runner's Microsoft apt repository returned HTTP 403 while installing `postgresql-client`. The `call-session-expiry` job now removes that unrelated Microsoft apt source before package installation. On HEAD `a47e672a045ee29f608920307432d701b127b9eb`, all four workflows passed and validation returned to 28/28. No application code changed in this CI-only adjustment.


Push frontend consistency check: the public VAPID key embedded in `admin-push.js` exactly matches the Vault public key (boolean equality check; no private value read). `sw.js` has both `push` and `notificationclick` handlers and routes clicks back into the Malachite app. This closes the client/key consistency check; it still does not prove a push was delivered to the registered device.


## Registration/profile RPC audit — 27 Nov 2026, 15:56 UTC

A live production read-only count found 10 Auth accounts but only 5 profile rows. Five accounts have no public profile row; three of those have valid Malachite consent/name/age metadata and their own username mapping, so they are not explained by missing signup metadata alone. No account was deleted or modified. This warrants owner-side review of onboarding logs before broad launch.

A critical candidate incompatibility was found and fixed: `20261127080600_restore_profile_presence_update_grant.sql` revokes direct authenticated INSERT/UPDATE on `profiles`, `prives`, and `login_names`, while the live `public.save_my_profile(jsonb,jsonb)` RPC was SECURITY INVOKER. That would break the signup/profile-save path after the ACL cutover. Added `20261127150000_secure_profile_save_rpc_after_acl_cutover.sql`: owner-scoped SECURITY DEFINER, empty search_path, auth.uid()/profile-id equality, required name, age 18–100, username and avatar validation, and authenticated-only EXECUTE. Strengthened `profile_write_authorization_checks.sql` to assert SECURITY DEFINER + empty search_path and exercise the RPC after direct writes are revoked.

Candidate SHA `ae1fa1f018bd8ea08fbeb8d2cc8435ad88f66922`: all four workflows green; validation 28/28 jobs, isolated Match PostgreSQL, integration contract, and live Pages all succeeded. PR #158 remains draft/unmerged. No production migration applied.


## Production call RPC fail-closed gap — 27 Nov 2026, 16:04 UTC

Fresh read-only production inspection found that `public.start_call_session(uuid,uuid,text,text,timestamptz)` is still executable by `authenticated`, its current SECURITY DEFINER body permits a pending call after entitlement + mutual match + block checks, accepts room names with only a loose 12–100 character bound, and does not check provider configuration or suspension. Production has neither `private.call_provider_config` nor `public.call_provider_config`, and the production Edge Functions inventory does not contain `malachite-jaas-token`. There are 12 historical call sessions (10 ended, 2 expired), none currently unexpired; no live session was changed.

This is a confirmed production release blocker, not a hypothetical JaaS setup concern. Candidate migration `20261126140000_fail_closed_calls_until_jaas_auth.sql` disables call creation until the secure provider config exists, and `20261127140000_enable_call_creation_when_provider_configured.sql` restores the RPC only behind that private switch with participant, block/suspension, mutual-match, entitlement, strict room and short expiry checks. The candidate also supplies a participant-scoped JaaS token function. None of this has been applied to production. Do not announce calls as secure or enable paid calls until the candidate migrations and Edge Function are deployed, JaaS secrets configured, and two-account tests pass.


## Profile RPC test closure — 27 Nov 2026, 16:09 UTC

The first run of the new profile age regression test correctly failed because the pre-existing server-side profile-age trigger rejected the mismatched public/private ages first with `Les informations d’âge ne correspondent pas`. The test was corrected to accept that existing stronger trigger rejection (or the RPC's own public-age rejection); no production data was involved. On candidate SHA `52df4818a273c22510e8c688a624367bc56c848d`, all four CI workflows are green: Malachite validation 28/28, isolated Match PostgreSQL, release integration contract, and live Pages verification.


## Legacy public Jitsi link bypass closed in candidate — 27 Nov 2026, 16:14 UTC

A deeper review found the recovered message trigger still explicitly accepted `media_type='call'` with `https://meet.jit.si/Malachite...` URLs, and the regression test asserted those links were accepted. This was an alternate public-room path outside the JaaS participant-token authorization flow. Added migration `20261127160000_reject_legacy_public_jitsi_message_links.sql` with a server-side BEFORE INSERT/UPDATE guard rejecting legacy public Jitsi call links while preserving image/document/audio/video media. Updated the message media regression test to prove the public link is rejected. This candidate fix has not been applied to production; existing historical messages are not deleted or modified.


## Production payment intake check — 27 Nov 2026, 16:18 UTC

Production still grants authenticated table-level INSERT/UPDATE/DELETE on `public.paiements`. The current RLS policy permits authenticated members to submit a row only for their own user ID, with status `attente`, an allowed offer/operator, a bounded transaction code, and a receipt object in their own `payment-receipts` folder. No UPDATE/DELETE RLS policy was found, so those grants do not by themselves bypass row security. There is no dedicated payment-intake config or submission RPC in production. The current policy still permits the existing manual intake path, whereas candidate migrations pause intake until the owner confirms the dedicated receiving account and replace broad mutations with a controlled path. Current production payment ledger snapshot: 5 validated payments (3 Premium, 2 Appels), 3 rejected (2 Premium, 1 Boost), none pending; no account or payment row changed.

Do not leave intake open for a public launch until the new Airtel receiving SIM/account is confirmed and the candidate payment pause/ACL plan is reviewed. No payment settings or data were changed.
