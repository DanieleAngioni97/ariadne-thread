# State — roomshare-booking
Updated: 2026-03-02 · Branch: `main` · Last commit: `9139c1f` · PR: none

## Milestone
M1 "Core booking" is complete: members can list a site's rooms and book a free slot
without double bookings. All four plan steps are closed: room catalog, Postgres storage,
single-room availability, booking endpoints (POST /bookings, GET /rooms/:id/bookings, 409 on conflict).

## Next
1. Run `npm test` and record the result. It was not run at this handoff because the shell was unavailable.
2. Ask the user what the next milestone is. Nothing has been planned after M1.
3. Clean up M1 leftovers (see the risks below) before or as part of the next milestone.

## Open decisions and risks
- The SQLite storage was dropped in favour of Postgres (user decision, see `docs/storage.md`),
  but `src/store/sqlite.js` and `src/store/bookings-sqlite.js` are still in the tree.
  They import `better-sqlite3`, which is not in `package.json`. Ask the user before deleting them.
- `npm start` runs `src/server.js`, which does not exist. The API routers in `src/api/` are not
  wired into a server yet.
- The Postgres tests (`src/store/bookings-pg.test.js`) need a test database (`DATABASE_URL`).
- `STATE.md` and `LOG.md` are kept out of git (`.git/info/exclude`) at the user's request. Never commit them.

## Pointers
- Storage decision: `docs/storage.md` · Verify: `npm test` (vitest) → not run at this handoff
- Code: `src/rooms/`, `src/store/*-pg.js`, `src/availability/single.js`, `src/api/`
- Suggested skills: `commit-checkpoint` for each commit; `handoff` at the end of the next milestone
