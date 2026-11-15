# State — vetbill
Updated: 2026-03-02 · Branch: `main` (clean, last commit `e07c5bb`) · PR: none (no git remote configured)

## Milestone
M2 "Payments and reminders" is **complete**: payment recording, partial payments/balances, credit
notes, reminder schedule, reminder email, reminder SMS. Its last step, "Monthly revenue export per
clinic", was **deferred by the user to M3**. M3 "Head office reporting" (revenue figures per clinic
and per period for head office) is defined but has **no approved plan yet**.

## Next
1. Run `npm test` (vitest) and confirm it is green. The handoff session could not run commands, so
   the last result is unverified.
2. Propose a step plan for M3 to the user, starting from "Monthly revenue export per clinic" (the
   step carried over from M2), and get approval before coding.
3. If the user wants M2 reviewed as a PR: there is no remote, so ask where to push first. The CI
   workflow (`chore(ci): run tests on push`) only runs once a remote exists.

## Open decisions and risks
- Invoice numbering is **one chain-wide counter, reset each year**; the clinic code is displayed next
  to the number only. Do not reintroduce per-clinic numbering (`src/numbering/perClinic.ts` is
  superseded). The number is now taken **inside the invoice transaction** (`src/numbering/reserve.ts`)
  after duplicate numbers appeared on a deploy restart: keep number + insert in one transaction.
- Money: discounted line totals rounded **half-up per line** (matches clinic tills).
- VAT: consultations 22%, medications 10%, pet food 22%, boarding 22% (`src/tax/`).
- Payments: an invoice is marked paid when payments cover the total; payments on cancelled invoices
  are rejected. Credit notes reference the original invoice and reduce its balance.
- Reminders: sent at 7, 21 and 45 days overdue; skipped for invoices with a payment plan; stop at
  zero balance. Email in Italian/English (owner language) via SMTP relay; SMS via gateway, honouring
  opt-out.
- Revenue export (M3) must decide how credit notes and partial payments count in a period. Ask the user.
- `STATE.md` and `LOG.md` are excluded via `.git/info/exclude`: never commit them.

## Pointers
- Docs: `docs/numbering.md`, `docs/glossary.md` (incl. balance, credit note), `docs/runbook.md`
  (front desk), tax categories in `README.md`
- Code: `src/payments/`, `src/balances/`, `src/creditNotes/`, `src/reminders/` (+ `email/`, `sms/`),
  plus M1 modules `src/visits/`, `src/pricing/`, `src/money/`, `src/tax/`, `src/numbering/`,
  `src/pdf/`; tests mirror them under `test/`
- Verify: `npm test` → not run in this handoff session (unverified at `e07c5bb`)
- Suggested skills: `commit-checkpoint` for each commit; `handoff` at the end of M3 or when context grows
