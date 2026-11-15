# State — vetbill
Updated: 2026-11-15 · Branch: `main` (clean at session start, last commit `c28b6d7`) · PR: none (no git remote configured)

## Milestone
M3 "Head office reporting". Approved plan: ~~Nightly snapshot tables~~ (dropped by the user, replaced
by) Materialized views ✅ → Revenue by clinic ✅ (incl. detour "Fix month boundaries in clinic
time zone" ✅) → **Revenue by species (in progress)** → Revenue by veterinarian → Head office
dashboard endpoint.

## Next
1. Run `npm test` (vitest) and confirm it is green. This handoff session could not run commands.
2. Wire the time-zone fix into the reports. `localMonth()` (`src/time/monthBounds.ts`) is used
   only by its own test. Both `src/reports/byClinic/query.sql` and `bySpecies/query.sql` still
   filter on `to_char(issued_on, 'YYYY-MM')` (UTC). Last-evening invoices land in the wrong month
   again. Add a test with an invoice issued late on the last day of the month (Rome time).
3. Finish "Revenue by species": `speciesGroup()` (`src/reports/bySpecies/groups.ts`, non dog/cat →
   `exotic`) is not called anywhere. The SQL groups by raw `species`. Apply the grouping (in SQL
   or on the rows), add `bySpecies/route.ts` + `test/reports/bySpecies.test.ts`, and close the step.
4. Then "Revenue report by veterinarian", then "Head office dashboard endpoint".

## Open decisions and risks
- Dropped step leftovers: `src/snapshots/nightly.ts` and `schema.sql` remain from the dropped
  "Nightly snapshot tables". Ask the user before deleting them.
- Reports read `invoice_lines_mv` (`src/reportViews/invoiceLines.sql`). It is refreshed
  concurrently after each issued invoice (`src/reportViews/refresh.ts`).
- Still undecided (ask the user): how credit notes and partial payments count in a period's revenue.
- Invoice numbering: one chain-wide counter reset yearly, taken inside the invoice transaction
  (`src/numbering/reserve.ts`). Don't reintroduce per-clinic numbering.
- Money: discounted line totals rounded half-up per line. VAT: consultations/pet food/boarding 22%,
  medications 10% (`src/tax/`).
- `STATE.md` and `LOG.md` are excluded via `.git/info/exclude`: never commit them.

## Pointers
- Local DB: `docker-compose.yml` (postgres). Report endpoints are listed in `README.md`.
- Code: `src/reportViews/`, `src/reports/byClinic/`, `src/reports/bySpecies/`, `src/time/`. Earlier
  milestones: `src/payments/`, `src/balances/`, `src/creditNotes/`, `src/reminders/`, `src/visits/`,
  `src/pricing/`, `src/tax/`, `src/numbering/`, `src/pdf/`. Tests mirror these under `test/`.
- Docs: `docs/numbering.md`, `docs/glossary.md`, `docs/runbook.md`
- Verify: `npm test` → not run in this handoff session (unverified at `c28b6d7`)
- Suggested skills: `commit-checkpoint` for each commit; `handoff` at the end of M3 or when context grows
