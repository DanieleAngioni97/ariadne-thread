# State — physio-booking-backend
Updated: 2026-11-15 · Branch: `main` (last: `ba6a99f docs: local setup in README`) · PR: none

## Milestone
M3 Insurance billing (new, no plan yet): sessions covered by insurers are invoiced every month
and exported to the insurers. "Reminder SMS retry on gateway errors" moved here from M2.
M2 Availability and reminders is closed: therapist/room/holiday availability, Skebby SMS client,
reminders for new bookings and clinic cancellations.

## Next
1. Run `npm test` and record the result. It was not run at handoff because shell access was denied.
2. Clean up leftovers (one `commit-checkpoint` each):
   - `src/sms/twilio.ts` imports `twilio`, which was removed from the dependencies. Delete it.
     Also delete `docs/twilio-setup.md`, which `docs/sms-gateway.md` supersedes.
   - `src/store/sqlite.ts` and `src/store/schema.sql` import `better-sqlite3`, which is not a
     dependency. Delete them, and drop `*.sqlite` from `.gitignore`. (Carried over from M1.)
   - `npm run dev` and the README point to `src/server.ts`, which does not exist. Create it and
     register the routes in `src/booking/`, `src/cancel/` and `src/availability/`.
3. Propose an M3 plan to the user with "Reminder SMS retry on gateway errors" as one step. Ask
   which insurers, the export format for each, and the invoice numbering rules. Then wait for
   approval before you start.

## Open decisions and risks
- The SMS gateway is Skebby, chosen by the user over Twilio. Postgres replaced SQLite. Don't
  reintroduce either.
- `closedDays()` (`src/availability/holidays.ts`) throws if `data/holidays/<clinic>.json` is
  missing, and only `cagliari.json` exists. Ask the user for the other clinics' files, Quartu
  among them.
- Slot dates are built in Europe/Rome (`src/time/tz.ts`, DST test). Slots are 15 min. Lunch is
  13:00–14:00. The late-cancel fee applies under 24 h. Reminders go out 24 h before the session
  and skip patients who opted out.
- `STATE.md` and `LOG.md` stay out of git (user's instruction). Never commit them.

## Pointers
- Docs: `docs/api.md`, `docs/availability.md`, `docs/sms-gateway.md` · DB: `migrations/`, `docker-compose.yml`
- Verify: `npm test` (vitest 1.4.0) → not run at handoff · CI: `.github/workflows/ci.yml` (waits for Postgres)
- Suggested skills: `commit-checkpoint` for each cleanup. Use `handoff` when M3 has an approved plan or is done.
