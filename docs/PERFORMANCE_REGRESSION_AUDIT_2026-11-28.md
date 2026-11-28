# Malachite performance regression audit — 28 Nov 2026

## Scope and limits

Read-only source inspection of `main` plus a targeted navigation optimization included in draft PR #158 (`fix/profile-rpc-cutover-main-sync-20261126`). A search of open repository PRs did not find PR #162; the earlier reference to #162 was incorrect. No production deployment, database changes, or device profiling was performed. This report distinguishes code-level causes from measured device performance.

## Confirmed source-level pressure

Current `main` source sizes returned by GitHub:
- `index.html`: 188,716 bytes.
- `app-core.js`: 181,391 bytes.
- `sw.js`: 4,927 bytes.
- `index.html` declares 13 deferred first-party script tags and contains 36 inline style blocks.

The application is a large single-page shell. The tab renderer rebuilds the main view using `innerHTML` and then rebuilds the navigation. `go()` was also doing an immediate `draw()` and, for Découvrir/Rechercher/Match, a second `load().then(draw)` render. That causes avoidable DOM rebuilds on every relevant tab switch.

A rapid tab sequence could start more than one full `load()` before the first request populated the warm cache. Each `load()` starts a profile directory request and private-profile request, then background work for all profiles' signed photos, block lists, status badges/config, appointments, answers, site reviews, Match quota/likes/compatibility, and presence/realtime setup. This work is not scoped to the currently selected tab.

The Service Worker caches a large app shell (many optional modules) and installs shell assets concurrently. This affects first install/update bandwidth; it is not a direct cause of every in-app tab switch, but a pending PWA update may consume mobile data and CPU.

## Supabase read-only snapshot

Production project ref `tscsmemsvgacqioncash` and staging `sbawknyxcjslvhknomkd` were queried read-only on 28 Nov 2026.

- No active query older than one second was present at the instant of inspection on either project. This is only a point-in-time observation.
- The top global `pg_stat_statements` entries were mostly Supabase catalog/Advisor and migration queries; they do not establish that app endpoints are fast.
- Production has column-level SELECT on `public.profiles` for authenticated despite table-level SELECT being false; therefore table-level privilege alone must not be misread as a profile read outage.
- Production still has direct authenticated SELECT/INSERT/UPDATE/DELETE on `public.call_sessions`; staging denies direct INSERT/UPDATE/DELETE. This is a confirmed security drift, not a performance cause.

## PR #158 targeted correction (included in the security/stabilization candidate)

- Deduplicates profile loading in flight for the same authenticated account.
- Reuses the five-minute profile cache instead of calling `load()` for every tab when it is already valid.
- Removes the redundant `load().then(draw)` render while preserving immediate tab render and targeted data refreshes.
- Advances the app-shell cache v108 → v115 in the candidate branch and adds validation assertions.

## Next performance work — not yet claimed as fixed

1. Measure real Android cold/warm startup and tab-switch timings with the actual network/device.
2. Scope directory/profile retrieval and signed photo URL creation to the visible/needed profiles; current code starts work for all profiles.
3. Load feature data on demand (Match, appointments, reviews, private account data) rather than as one global background bundle.
4. Profile SQL/PostgREST requests in `pg_stat_statements` over real member activity; distinguish API latency from local rendering and image transfer.
5. Split/lazy-load optional first-party modules only after dependency map and regression tests.

No performance score or speed multiplier is claimed without a device measurement.


## First-party JavaScript payload inventory

A read-only size inventory of the 14 deferred scripts in the current `main` HTML plus `app-core.js` totals **426,058 bytes of source** before transfer compression. Largest files:
- `app-core.js`: 181,391 bytes
- `malachite-user-experience.js`: 58,204 bytes
- `malachite-avatar-ui.js`: 58,070 bytes
- `calls.js`: 32,872 bytes
- `malachite-ai.js`: 21,745 bytes

The 14 deferred files are all declared with `defer`, so they are downloaded and then executed during startup rather than only when their tab/feature is opened. Actual wire bytes may be lower due to HTTP compression; this is source size, not a network measurement.

The targeted `pg_stat_statements` query for app tables (`profiles`, `messages`, `call_sessions`, `statuts`, `prives`, `rendez_vous`) returned no matching entries in either project. There is therefore no query-level app latency evidence from that view; production needs real member traffic/profiling to determine whether Supabase contributes to the reported slowness.

## Edge request timing sample — production, last six hours (read-only)

A separate Supabase edge-log sample returned successful HTTP 200s for sampled member-facing endpoints: profiles p95 about 180 ms (48 requests), statuses about 183 ms (24), support about 177 ms (48), payments about 157 ms (48), and reports about 165 ms (48). This sample does not include Android render/JS execution, image decoding, CDN transfer or the full member navigation path; it does not prove that the reported phone slowness is fixed. Background admin-push secret RPCs had p95 around 446 ms and were called 360 times in six hours. A read-only production query confirmed the active `malachite-admin-payment-push-batch` cron is scheduled `* * * * *` (every minute) and calls the push Edge Function unconditionally. Candidate migration `20261127020000_reduce_idle_payment_push_dispatch.sql` changes it to every five minutes and only when an undelivered queue item and active subscription exist; that migration is not applied in production. This is a concrete idle-load reduction candidate, but it must be deployed only within the reconciled release sequence after backup/restore.
