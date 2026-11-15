# State — coop-billing
Updated: 2026-11-15 · Branch: `main` (last commit `a9bc7f2`) · PR: none (no git remote configured)

## Milestone
M2 "Invoices" — all planned steps committed: invoice model + SQLite store, built from the monthly
summary; total rounded once to the cent with a rounding line; VAT per rate (10% resident
domestic, 22%) rounded per rate; credit notes for corrected readings; PDF via Typst; gapless
per-year numbering, reserved only at issue. Detour done: member register read as Latin-1.

## Next
1. Run `pytest` and confirm green: not run at handoff (no shell access this session). The PDF
   tests need the `typst` CLI (CI pins 0.12.0).
2. Close M2 gaps with the user: the `coop-billing invoice --period YYYY-MM` command in
   `docs/invoice-run.md` does not exist yet (no CLI entry point in `pyproject.toml`); decide
   whether it belongs to M2 or the next milestone.
3. Ask before removing the dropped wkhtmltopdf path (`src/pdf/render_wk.py`, `src/pdf/template.html`).
4. Then ask the user for the next milestone and get its plan approved before starting.

## Open decisions and risks
- PDF rendering: wkhtmltopdf was dropped by the user for Typst; only `render_typst.py` is current.
- Untested: `src/credits/` and `src/members/import_csv.py` (Latin-1 fix) have no tests;
  `pricing/summary.py` and `fixed_fee.py` still lack dedicated tests (carried from M1).
- No remote: nothing is pushed and CI has never run on this work.
- Timestamps are UTC since M1 (DST days have 46/50 half-hour slots): convert to local time
  explicitly when grouping by day/hour or invoice period.
- Tariffs: YAML plan dropped for SQLite; `src/tariffs/yaml_loader.py` kept only for
  `migrate_yaml.py`; ask before removing.
- `STATE.md` and `LOG.md` stay out of git (user's choice, listed in `.git/info/exclude`): never commit them.

## Pointers
- Rules: `docs/billing-rules.md` · Run checklist: `docs/invoice-run.md` · `CHANGELOG.md` · `docs/glossary.md`
- Code: `src/invoices/`, `src/vat/`, `src/credits/`, `src/pdf/`, `src/numbering/`, `src/members/`
- Verify: `pytest` → not run this session · CI: `.github/workflows/ci.yml`
- Suggested skills: `commit-checkpoint` for each commit; `handoff` at the end of the next milestone.
