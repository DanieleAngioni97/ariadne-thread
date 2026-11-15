# State — langcentre-exams
Updated: 2026-03-02 · Branch: `main` · PR: none (no git remote configured) · Last commit: `cbb4669`

## Milestone
M3 "Staff tools and performance" is done. Candidate profiles are cached for 24 h. Staff can
export booking lists as CSV, attendance sheets as PDF (sorted by surname) and registry results
files (CEFR grades are validated first), all through staff-only routes. A detour fixed the staff
SSO login loop. No M4 has been defined yet.

## Next
1. Run `npm test` first. It has not been run at the last three handoffs (no shell).
2. Ask the user about the leftovers (cron files, rowlock; see below). They are still in the
   tree and were not raised during M3. Clean up as the user decides.
3. Ask the user what M4 is, then draft a step plan and get approval before coding.

## Open decisions and risks
- Reminders use a jobs table (`db/migrations/004_jobs.sql`, `src/reminders/poller.js`,
  `retry.js`, `enqueue.js`). Don't go back to cron. `ops/reminders.cron` and
  `src/reminders/cron-batch.js` are left over from the dropped cron approach. Ask whether to remove them.
- Reminders go out 48 h before the exam, not 24 (`docs/notifications.md`).
- Payment confirmations are applied once (`src/booking/idempotency.js`). The regression test is
  `test/booking/retry.test.js`. Keep that path idempotent.
- Unpaid bookings expire after 2 h (`src/booking/pending.js`).
- Seat locking uses advisory locks (`src/seats/advisory.js`). `src/seats/rowlock.js` and
  `test/seats/rowlock.test.js` are leftovers, and that test calls the undefined `global.book`,
  so it may fail `npm test`. Ask whether to remove them.
- Session times are shown in Europe/Rome (`src/sessions/tz.js`). Keep this: it fixed a pilot bug.
- The university SSO changed its callback path. `src/auth/sso.js` uses the new one (`f25b1b0`).
  Don't revert it.
- STATE.md and LOG.md stay out of git (`.git/info/exclude`). Don't commit them.

## Pointers
- Docs: `docs/notifications.md` · `docs/booking-rules.md` · `docs/caching.md`
- Profile cache: `src/cache/profiles.js` + `profiles-ttl.js`. It follows the sessions cache
  pattern (`src/cache/sessions.js`, `invalidate.js`, `metrics.js`).
- Exports: `src/export/` (`bookings.js`, `attendance.js`, `sort.js`, `results.js`, `grades.js`,
  `routes.js`). Tests: `test/export/`. PDF output uses `pdfkit`.
- Verify: `npm test` (`node --test`) → not run at this handoff. CI runs it on PRs (`.github/workflows/ci.yml`).
- Suggested skills: `commit-checkpoint` for each step; `handoff` when the next milestone closes.
