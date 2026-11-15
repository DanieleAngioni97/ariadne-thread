# State — coop-billing
Updated: 2026-11-15 · Branch: `main` (last commit `3db2b25`) · PR: none (no git remote configured)

## Milestone
M3 "Payments": collect invoices by SEPA direct debit and match the payments in bank statements.
Approved plan: 1. Validate member bank details ✅ (`src/mandates/`) · 2. Generate SEPA direct
debit batches ⏳ · 3. Reconcile bank statement payments. Step 4 "Payment reminders for overdue
invoices" was moved by the user to M4 "Collections" (chase overdue invoices, members who stop paying).

## Next
1. Run `pytest` and confirm green: not run at handoff (no shell access this session).
2. Ask the user whether "Generate SEPA direct debit batches" is complete. Done so far
   (`src/sepa/`): pain.008 document + group header, creditor ID from cooperative settings,
   one transaction per issued invoice, collection date 5 business days ahead, name
   transliteration, FRST/RCUR sequence type. Tests cover only the group header.
3. Then start "Reconcile bank statement payments" (bank statement format still to be agreed).

## Open decisions and risks
- `src/sepa/test_pain008.py` sits in `src/`, not `tests/sepa/`: consider moving it.
- Untested: `src/sepa/` beyond the group header (dates, text, sequence, transactions),
  `src/mandates/` beyond the IBAN checksum (mandate required, 36-month expiry, export).
- Carried from M2, still to settle with the user: no `coop-billing invoice` CLI entry point
  (`docs/invoice-run.md` documents it); removal of wkhtmltopdf leftovers (`src/pdf/render_wk.py`,
  `template.html`) and `src/tariffs/yaml_loader.py` needs approval; `src/credits/`,
  `src/members/import_csv.py`, `pricing/summary.py`, `fixed_fee.py` lack tests.
- No remote: nothing is pushed and CI has never run on this work.
- Timestamps are UTC; convert to local time explicitly for days, business days and periods.
- `STATE.md` and `LOG.md` stay out of git (user's choice, in `.git/info/exclude`): never commit them.

## Pointers
- SEPA notes: `docs/sepa.md` · Rules: `docs/billing-rules.md` · Run: `docs/invoice-run.md` · `docs/glossary.md`
- Code: `src/sepa/`, `src/mandates/`, `src/invoices/` · Generated batches are git-ignored
- Verify: `pytest` → not run this session · CI: `.github/workflows/ci.yml`
- Suggested skills: `commit-checkpoint` for each commit; `handoff` when M3 step 2 or 3 closes.
