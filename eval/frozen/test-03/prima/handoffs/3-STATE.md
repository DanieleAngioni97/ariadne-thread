# State — physio-booking-backend
Updated: 2026-11-15 · Branch: `main` (last: `c13acfd feat(invoices): leave out sessions cancelled by the clinic`) · PR: none

## Milestone
M3 Insurance billing. The user approved this plan: Insurer catalogue with session tariffs →
Monthly invoice builder → Invoice export for insurer portals.
Step 1 is done (`src/insurers/`, `data/insurers.json`, `GET /insurers`). Step 2 is in progress:
`src/invoices/` has `group.ts` (insurer+month), `totals.ts`, `numbering.ts` and `filter.ts`
(only `completed` sessions). Step 3 has not started.

## Next
1. Run `npm test` and record the result. It was not run at the last two handoffs because shell
   access was denied.
2. Finish "Monthly invoice builder":
   - Add tests for `src/invoices/*`. There are none yet.
   - Add one entry point that composes billable → group → totals → number per insurer and month.
   - Persist invoice numbers. `numbering.ts` keeps its counters in an in-memory `Map`, so they
     reset on restart and can produce duplicate numbers. Use a Postgres migration in `migrations/`.
3. Start "Invoice export for insurer portals". First ask the user for each portal's format
   (UniSalute, FASI).
4. M2 leftovers, still not done (one `commit-checkpoint` each): delete `src/sms/twilio.ts` and
   `docs/twilio-setup.md`; delete `src/store/sqlite.ts` and `src/store/schema.sql` and drop
   `*.sqlite` from `.gitignore`; create `src/server.ts` (used by `npm run dev`) and register the
   routes from booking, cancel, availability and insurers.

## Open decisions and risks
- "Reminder SMS retry on gateway errors" moved from M2 to M3, but the approved M3 plan does not
  include it. Ask the user where it belongs.
- `totals.ts` silently prices a session at 0 when the insurer has no tariff for its type (FASI
  has no `shockwave`, UniSalute has no `hydro`). Ask the user whether to throw or exclude.
- `group.ts` takes the month from `date.slice(0, 7)`. Check that `date` is a Europe/Rome date
  and not UTC, otherwise late-night sessions on the last day of a month land in the next month.
- Amounts are in cents. Patients without an insurer pay at the desk and are never invoiced
  (`docs/billing.md`).
- The SMS gateway is Skebby (not Twilio) and the store is Postgres (not SQLite). Don't
  reintroduce either. `closedDays()` throws for clinics without `data/holidays/<clinic>.json`.
  Only Cagliari has a file; ask the user for the others, Quartu among them.
- Slots are built in Europe/Rome and last 15 min. Lunch is 13:00–14:00. The late-cancel fee
  applies under 24 h. Reminders go out 24 h before the session and skip opted-out patients.
- `STATE.md` and `LOG.md` stay out of git (user's instruction, listed in `.git/info/exclude`).
  Never commit them.

## Pointers
- Docs: `docs/billing.md`, `docs/api.md`, `docs/availability.md`, `docs/sms-gateway.md` · DB: `migrations/`
- Verify: `npm test` (vitest 1.4.0) → not run at handoff · CI: `.github/workflows/ci.yml`
- Suggested skills: `commit-checkpoint` for each step. Use `handoff` when the invoice builder is done.
