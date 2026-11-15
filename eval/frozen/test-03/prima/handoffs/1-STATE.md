# State — physio-booking-backend
Updated: 2026-11-15 · Branch: `main` · PR: none (no git remote configured)

## Milestone
M1 Booking core: patients book, list and cancel treatment sessions at any clinic of the chain.
All plan steps are committed on `main` (last: `0c2f943 test(cancel): late cancellation fee`):
slot grid · patient profiles with fiscal code · booking endpoint with overlap checks ·
store bookings in Postgres · cancellation with 24-hour rule.

## Next
1. Run `npm test` and record the result. It was not run at handoff because shell access was denied.
2. Add `pg` to `package.json` dependencies. `src/store/postgres.ts` imports it, but it is not declared.
3. Remove the leftover SQLite code: `src/store/sqlite.ts` and `src/store/schema.sql`. It imports
   `better-sqlite3`, which is not a dependency. Also drop `*.sqlite` from `.gitignore` if unused.
4. `npm run dev` points to `src/server.ts`, which does not exist. Create it, registering the routes in
   `src/booking/` and `src/cancel/`. Then check the end-to-end flow against docker-compose Postgres.
5. Ask the user whether M1 is closed, and what M2 is.

## Open decisions and risks
- The user dropped SQLite in favour of Postgres. Don't reintroduce it.
- Slot dates must be built in Europe/Rome (`src/time/tz.ts`). The fix and the DST test (29 March)
  exist because front desks saw times shifted by one hour. Keep the TZ handling there.
- Slots are 15 min. Lunch break 13:00–14:00 is skipped. Late-cancel fee applies under 24 h.
- `STATE.md` and `LOG.md` stay out of git (user's instruction). Never commit them.

## Pointers
- API overview: `docs/api.md` · DB: `migrations/001_bookings.sql`, `docker-compose.yml`
- Verify: `npm test` (vitest) → not run at handoff · CI: `.github/workflows/ci.yml`
- Suggested skills: `commit-checkpoint` for each fix above. Use `handoff` when M1 is closed.
