# State — bikescout
Updated: 2026-11-15 · Branch: `main` (`d586559`, clean) · PR: none (no remote)

## Milestone
M3 Comparison and alerts. The approved plan is: Comparison page per model → Price drop detection → Watchlist storage.
Step 1 is done (`b00204f`). Step 2 is in progress: it keeps the last EUR price, detects drops, and applies a
threshold (`d586559`). It has no tests yet and has not been declared closed. Step 3 has not started.

## Next
1. Run `npm test` and record the result here. It was not run at handoff because Bash was denied.
2. Close "Price drop detection": add `test/pricedrop.test.js` covering `history.js`, `detect.js`, and
   `threshold.js`, including the boundaries at exactly 5% and exactly 10 EUR. Then confirm the step is closed.
3. Start "Watchlist storage". There is no `src/watchlist/` yet.
4. Carried over from M2, still open:
   - Wire `nextAgent()` (`src/useragent/rotate.js`) into `src/http/client.js`. Nothing imports it yet,
     so the Blocket 403 fix is still not active.
   - Ask the user whether to delete the dead code `src/rates/` and `src/cron/schedule.js`.
   - Add the missing tests: dedupe-frame, dedupe-photo, dedupe-cross, useragent, kleinanzeigen, and queue.

## Open decisions and risks
- A drop counts only if it is ≥ 10 EUR **and** ≥ 5% (`isSignificant` in `src/pricedrop/threshold.js`).
- "Email price alerts" moved to M3 earlier, but it is not in the approved 3-step plan. Ask the user
  whether it comes after Watchlist or moves to M4.
- Static exchange rate table is dropped and `src/ecb/` replaced it. Don't use `src/rates/`.
  Cron is dropped and the job queue replaced it. Marktplaats is dropped (`docs/sources.md`).
- The dedupe modules exist, but no pipeline calls them in the order given in `docs/dedupe.md`.
- `running` in `src/queue/jobs.js` is in-process state only.
- STATE.md and LOG.md are listed in `.git/info/exclude`. Never commit them.

## Pointers
- Code: `src/compare/{group,render,median}.js` · `src/pricedrop/{history,detect,threshold}.js`
- Tests: `test/compare.test.js` (+ older suites in `test/`)
- Docs: `docs/dedupe.md` · `docs/decisions.md` · `docs/sources.md` · `README.md` (local crawl)
- Verify: `npm test` (`node --test`) → not run this session
- Suggested skills: `commit-checkpoint` for each code commit; `handoff` when M3 closes
