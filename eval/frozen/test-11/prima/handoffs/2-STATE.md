# State — bikescout
Updated: 2026-03-02 · Branch: `main` (`1b2d402`, clean at session start) · PR: none (no remote)

## Milestone
M2 Normalized listings is closed. All approved steps are done: frame sizes in cm, dedupe by frame
number, dedupe by photo hash, daily ECB rates to EUR, and dedupe across marketplaces (keep the cheapest).
Next up is M3 Comparison and alerts: per-model price comparisons and price-drop alerts.

## Next
1. Run `npm test` and record the result here. It was not run at handoff because Bash was denied.
2. Wire `nextAgent()` from `src/useragent/rotate.js` into `src/http/client.js` (or into the Blocket
   fetch). Nothing imports it yet, so the Blocket 403 fix is not actually active.
3. Ask the user whether to delete the dead code: `src/rates/` (the static table, dropped in favour
   of `src/ecb/`) and `src/cron/schedule.js` (cron dropped in M1).
4. Add the missing tests: dedupe-frame, dedupe-photo (5-bit threshold), dedupe-cross, useragent,
   `test/kleinanzeigen.test.js` and `test/queue.test.js` (carried over from M1).
5. Plan M3 with the user. "Email price alerts" moved here from M2. Get the step list approved first.

## Open decisions and risks
- Static exchange rate table is dropped and `src/ecb/` replaced it. Don't use `src/rates/`.
- Cron is dropped and the job queue replaced it. Don't bring it back.
- Marktplaats is dropped from the sources (`docs/sources.md`).
- The dedupe modules exist, but no pipeline calls them in the order given in `docs/dedupe.md`.
- Two photos with hashes ≤ 5 bits apart count as the same photo (`SAME_PHOTO` in `src/dedupe-photo/distance.js`).
- `running` in `src/queue/jobs.js` is in-process state only.
- STATE.md and LOG.md are listed in `.git/info/exclude`. Never commit them.

## Pointers
- Docs: `docs/dedupe.md` (order) · `docs/decisions.md` (frame sizes) · `docs/sources.md`
- Code: `src/{sizes,dedupe-frame,dedupe-photo,dedupe-cross,ecb,useragent}/` · Tests: `test/`
- Verify: `npm test` (`node --test`) → not run this session
- Suggested skills: `commit-checkpoint` for code commits; `handoff` once M3 is planned
