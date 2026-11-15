# State — langcentre-exams
Updated: 2026-03-02 · Branch: `main` · PR: none (no git remote configured) · Last commit: `ddb8db5`

## Milestone
M4 "Waitlist": candidates can join a waitlist for full sessions and are offered seats that free up.
The approved plan has 3 steps: (1) Waitlist for full sessions → (2) Seat offers to waitlisted
candidates → (3) Expiry of unanswered seat offers. Step 1 has its code committed (table, model,
join, position, leave, routes, duplicate-join test). It has not been formally closed yet.

## Next
1. Run `npm test` first. It has not been run at the last four handoffs (no shell).
2. Close step 1: confirm `npm test` passes and decide where the waitlist migration lives (see
   risks). Then tell the user step 1 is done.
3. Start step 2, seat offers. When a seat frees up (cancellation or expired unpaid booking,
   `src/booking/pending.js`), offer it to the first candidate in the queue. Notify them through
   the jobs table, as reminders do. Check with the user how long an offer stays open (step 3).
4. Ask the user about the leftovers (cron files, rowlock; see below). They have been carried over
   since M2/M3 and were not raised this session.

## Open decisions and risks
- The waitlist migration is `src/waitlist/migration.sql`. The other migrations live in
  `db/migrations/00N_*.sql` (e.g. `004_jobs.sql`). It probably belongs there as `005_waitlist.sql`.
- `UNIQUE (session_id, candidate_id)` enforces one entry per candidate
  (`src/waitlist/join.test.js`). The queue is ordered by `joined_at`.
- The waitlist routes (`POST`/`DELETE /sessions/:id/waitlist`) rely on `req.user`. Check that they
  are mounted behind auth, and that join rejects sessions that are not full.
- Reminders use a jobs table (`db/migrations/004_jobs.sql`, `src/reminders/`). Don't go back to cron.
  `ops/reminders.cron` and `src/reminders/cron-batch.js` are leftovers. Ask whether to remove them.
- `src/seats/rowlock.js` and `test/seats/rowlock.test.js` are leftovers. Seat locking uses
  `src/seats/advisory.js`. The rowlock test calls the undefined `global.book`, so it may fail `npm test`.
- Keep these as they are:
  - Payment confirmations are applied once (`src/booking/idempotency.js`, test
    `test/booking/retry.test.js`).
  - Unpaid bookings expire after 2 h.
  - Reminders go out 48 h before the exam.
  - Times are shown in Europe/Rome (`src/sessions/tz.js`).
  - The SSO uses the new callback path (`src/auth/sso.js`, `f25b1b0`).
- STATE.md and LOG.md stay out of git (`.git/info/exclude`). Don't commit them.

## Pointers
- Waitlist: `src/waitlist/` (`model.js`, `join.js`, `position.js`, `leave.js`, `routes.js`,
  `join.test.js`)
- Docs: `docs/booking-rules.md` · `docs/notifications.md` · `docs/caching.md`
- Exports: `src/export/` · Profile cache: `src/cache/profiles.js`
- Verify: `npm test` (`node --test`) → not run at this handoff. CI runs it on PRs
  (`.github/workflows/ci.yml`, now with an npm cache).
- Suggested skills: `commit-checkpoint` for each step; `handoff` when M4 closes.
