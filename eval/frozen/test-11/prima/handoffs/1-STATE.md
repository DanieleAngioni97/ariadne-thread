# State — bikescout
Updated: 2026-03-02 · Branch: `main` (`b1ccf6f`) · PR: none (no git remote configured)

## Milestone
M1 Listing crawler: fetch and parse bicycle listings from Subito, Kleinanzeigen and Blocket
on a schedule. All approved steps are closed: HTTP client (429 retry with backoff), the three
parsers, and the job queue (one job per marketplace) that replaced the dropped cron schedule.

## Next
1. Run `npm test` and record the result here (it was not run at handoff).
2. Delete or wire up `src/cron/schedule.js`. It still exists even though "retire cron
   schedule" was committed, and its comment points to `docs/crawl-schedule.md`, which says
   cron is no longer used. Ask the user which one they want.
3. Add tests that are missing: `test/kleinanzeigen.test.js` (JSON-LD price, VB flag) and
   `test/queue.test.js` (dedup in `enqueue`, `running` cleared in `work` after a throw).
4. Ask the user what M2 is, and whether a remote/PR is wanted for M1.

## Open decisions and risks
- Cron schedule is dropped and the job queue replaced it (user decision). Don't bring cron back.
- Subito price feature can be either `price` or `prezzo` (`src/subito/legacy-fields.js`).
  Keep both.
- `running` in `src/queue/jobs.js` is module-level, in-process state: it only dedupes jobs
  within one process.
- STATE.md and LOG.md are listed in `.git/info/exclude`. Never commit them.

## Pointers
- Docs: `docs/sources.md` (marketplaces) · `docs/crawl-schedule.md` (queue design)
- Code: `src/{http,subito,kleinanzeigen,blocket,queue}/` · Tests: `test/`
- Verify: `npm test` (`node --test`) → not run this session
- Suggested skills: `commit-checkpoint` for code commits; `handoff` at the end of M1 cleanup/M2
