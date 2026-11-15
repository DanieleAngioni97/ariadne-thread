# State — roomshare-booking
Updated: 2026-03-02 · Branch: `main` · Last commit: `2f6926e` · PR: none

## Milestone
M2 "Recurring and multi-site booking" is complete: recurrence rules and expansion, availability
checks for recurring series (with conflicting dates), UTC storage with site-zone display,
cross-site free-room search (opening hours, capacity, equipment) and `GET /availability`.
The plan's last step, "Reminder email before a booking", was moved to M3 by the user.

## Next
1. Run `npm test` and record the result. Not run at this handoff either: the shell was unavailable.
2. Start M3 "Notifications" (members and site managers get reminders, cancellation notices and
   digests by email). No plan is approved yet: propose one to the user, with
   "Reminder email before a booking" (carried over from M2) as a step.
3. Clean up the leftovers below before or within M3.

## Open decisions and risks
- DST: occurrences must be expanded in the site zone, then converted to UTC
  (`src/recurrence/dst.js`, fix for a duplicate Lisbon occurrence on the last Sunday of March).
  Don't expand in UTC. Reminders in M3 must schedule from UTC but render in the site zone.
- No tests seen for `src/availability/sites.js`, `site-hours.js`, `filters.js`, `src/api/availability.js`.
- Still open from M1: `src/store/sqlite.js` and `bookings-sqlite.js` remain although Postgres was
  chosen (`docs/storage.md`); they import `better-sqlite3`, absent from `package.json`.
  Ask the user before deleting them.
- `npm start` runs `src/server.js`, which does not exist; the routers in `src/api/` are not wired.
- Postgres tests (`src/store/bookings-pg.test.js`) need a test database (`DATABASE_URL`).
- `STATE.md` and `LOG.md` are kept out of git (`.git/info/exclude`) at the user's request. Never commit them.

## Pointers
- Docs: `docs/storage.md`, `docs/timezones.md` · Verify: `npm test` (vitest) → not run at this handoff
- Code: `src/recurrence/`, `src/time/`, `src/availability/`, `src/api/`, `src/store/*-pg.js`
- Seed demo sites: seed script added in `2674f3b`; data in `data/sites.json`
- Suggested skills: `commit-checkpoint` for each commit; `handoff` at the end of M3
