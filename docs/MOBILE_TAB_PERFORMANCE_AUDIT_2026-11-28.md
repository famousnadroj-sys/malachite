# Mobile tab performance investigation — 2026-11-28

## Evidence reviewed

- Main `app-core.js`: navigation to home/search/match calls `load().then(draw)`; first authenticated load queries the profiles table, the private profile row, blocked-user RPCs, statuses, payment config, appointments, answers/reviews and match data. Some of this work runs in the background, but it remains a sizeable first-session workload.
- Main `malachite-performance.js`: the previous MutationObserver scanned every added subtree immediately. The image helper called `getBoundingClientRect()` for each newly discovered image, forcing layout while the tab renderer was adding profile cards. Many rapid DOM insertions could cause repeated overlapping subtree scans and synchronous layout reads.
- The app has many large UI scripts and CSS blocks; on a low-memory Android phone, DOM rendering, image decode and decorative effects are plausible bottlenecks. This is a code-based diagnosis, not a measured device trace.

## Candidate change in this branch

`malachite-performance.js` now:
1. Defaults images to browser-native lazy loading (except explicitly high-priority images) and async decoding.
2. Removes per-image layout reads from image optimization.
3. Batches MutationObserver-added roots into one animation frame.
4. Skips nested roots when an ancestor was added in the same batch.
5. Defers the initial image scan until after the first paint.
6. Keeps low-power/reduced-motion behavior.

This specifically targets repeated DOM/image processing and forced layout during tab switching without changing application data, database calls, auth, or production.

## Validation / rollout

- Static source checks confirm the batched observer, ancestor deduplication, lazy default, and no executable `getBoundingClientRect()` remain in the image helper (the only string occurrence is in a comment).
- GitHub Actions is triggered by the branch commits; inspect results before merge.
- No production or staging configuration/data changed.
- Do not merge/deploy until CI is green and the owner confirms the real-phone smoke test: sign in, switch Discover/Search/Match/Profile/Chat repeatedly, scroll images, then reload once on mobile data.
- If slow tabs persist, next instrument query timings and render duration in a temporary debug build; then optimize the slowest measured query/component rather than guessing.
