# State — langcentre-exams
Updated: 2026-03-02 · Branch: `main` · PR: none · Last commit: `b1b1542` (clean tree)

## Milestone
M1 "Sessions and booking" is done: candidates can browse exam sessions and book a seat.
Next up is M3 "Staff tools and performance": staff can export booking lists, attendance sheets
and results, and slow lookups are cached. M3 has no approved plan yet.

## Next
1. Draft a step plan for M3 and get the user's approval before coding. Must include
   "Cache for candidate profiles" (deferred from M1 by the user). Likely steps: booking list
   export, attendance sheet export, results export, candidate profile cache.
2. Run `npm test` first; the suite was not run at handoff (see risks).

## Open decisions and risks
- Seat locking: the user dropped row locks (`SELECT FOR UPDATE`) for per-session advisory locks.
  Bookings go through `src/seats/index.js` → `src/seats/advisory.js`. Don't go back to row locks.
- `src/seats/rowlock.js` and `test/seats/rowlock.test.js` are still in the tree from the
  dropped approach. Ask whether to remove the module and move the concurrency test to advisory locks.
- The concurrency test calls `global.book`, which nothing in the repo defines. It probably fails.
- Session times are displayed in Europe/Rome (`src/sessions/tz.js`); pilot bug, keep it.
- There is no milestone named "M2"; ask the user if it exists before assuming anything.
- STATE.md and LOG.md stay out of git (user's choice): don't commit them.

## Pointers
- Rules: `docs/booking-rules.md` (rewritten after the locking change) · Caching: `docs/caching.md`
- Listing cache: `src/cache/sessions.js` (60 s TTL), hit counter in `src/cache/metrics.js`;
  reuse that pattern for the profile cache.
- Verify: `npm test` (`node --test`) → not run at handoff (shell was unavailable)
- Suggested skills: `commit-checkpoint` for each step; `handoff` when M3 closes.
