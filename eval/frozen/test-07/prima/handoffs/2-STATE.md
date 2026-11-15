# State — langcentre-exams
Updated: 2026-03-02 · Branch: `main` · PR: none (no git remote configured) · Last commit: `a6ccdbd`

## Milestone
M2 "Payments and notifications" is done: bookings are paid through the university gateway,
and candidates get emails for receipts, cancelled sessions and exam-day reminders.
Next up is M3 "Staff tools and performance": staff export booking lists, attendance sheets and
results, and slow lookups are cached. M3 has no approved plan yet.

## Next
1. Run `npm test` first. It was not run at this handoff or the last one (no shell).
2. Ask the user about the leftovers listed below (cron files, rowlock), then clean up as they decide.
3. Draft a step plan for M3 and get the user's approval before coding. It must include
   "Cache for candidate profiles" (deferred from M1). Likely steps: booking list export,
   attendance sheet export, results export, candidate profile cache.

## Open decisions and risks
- Reminders: the user dropped system cron in favour of a jobs table (`db/migrations/004_jobs.sql`,
  `src/reminders/poller.js`, `retry.js`, `enqueue.js`). Don't go back to cron.
  `ops/reminders.cron` and `src/reminders/cron-batch.js` are left over from the dropped
  approach. Ask whether to remove them.
- Reminders go out 48 h before the exam, not 24 (`docs/notifications.md`). Keep it that way.
- Payment retries: each confirmation is applied once (`src/booking/idempotency.js`) after a
  double-booking bug, with a regression test in `test/booking/retry.test.js`. Keep that path idempotent.
- Unpaid bookings expire after 2 h (`src/booking/pending.js`).
- Seat locking uses per-session advisory locks (`src/seats/advisory.js`), not row locks.
  `src/seats/rowlock.js` and `test/seats/rowlock.test.js` are still in the tree, and the
  test calls the undefined `global.book`. Ask whether to remove them.
- Session times are shown in Europe/Rome (`src/sessions/tz.js`). This fixed a pilot bug where times showed in UTC (09:00 sessions listed at 08:00); keep it.
- STATE.md and LOG.md stay out of git (user's choice, in `.git/info/exclude`). Don't commit them.

## Pointers
- Docs: `docs/notifications.md` · `docs/booking-rules.md` · `docs/caching.md`
- Listing cache: `src/cache/sessions.js` (60 s TTL) + `src/cache/metrics.js`; purge on edit in
  `src/cache/invalidate.js`. Reuse this pattern for the profile cache (24 h TTL, directory allows 10 req/s).
- Verify: `npm test` (`node --test`) → not run at handoff. CI runs it on PRs (`.github/workflows/ci.yml`).
- Suggested skills: `commit-checkpoint` for each step; `handoff` when M3 closes.
