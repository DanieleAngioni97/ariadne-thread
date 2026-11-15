# State — vetbill
Updated: 2026-03-02 · Branch: `main` (clean, last commit `babd9d7`) · PR: none (no git remote configured)

## Milestone
M1 "Invoice core" (clinic visit → numbered, priced and taxed invoice) is **complete**: all plan steps
closed, from visit/line-item model to PDF invoice layout. No M2 has been defined yet.

## Next
1. Run `npm test` (vitest) and confirm it is green: the handoff session could not run commands, so
   the last result is unverified.
2. Ask the user for the next milestone (M2) and its plan; nothing is approved beyond M1.
3. If the user wants M1 reviewed as a PR: there is no remote, so ask where to push first.

## Open decisions and risks
- Invoice numbering is **one chain-wide counter, reset each year**; the clinic code is printed next
  to the number for display only. Per-clinic numbering was dropped after the accountant review —
  do not reintroduce it (`feat(numbering): counter per clinic and year` is superseded).
- Discounted line totals are rounded **half-up per line** to match the clinic tills (a one-cent
  mismatch otherwise). Keep this when touching money code.
- VAT: consultations 22%, medications 10%, pet food 22%, boarding 22%; rate picked from the line
  category (`src/tax/`).
- PDF footer carries the **chain** VAT number; labels in Italian and English; rendered with headless
  Chromium (puppeteer). Generated PDFs go to `out/` (gitignored).
- `STATE.md` and `LOG.md` are excluded via `.git/info/exclude`: never commit them.

## Pointers
- Docs: `docs/numbering.md` (chain-wide sequence), `docs/glossary.md`, tax categories in `README.md`
- Code: `src/visits/`, `src/pricing/` (clinic price list from csv, chain fallback), `src/money/`,
  `src/tax/`, `src/numbering/`, `src/pdf/`; tests mirror them under `test/`
- Verify: `npm test` → not run in the handoff session (last known: green at `babd9d7` per session log)
- Suggested skills: `commit-checkpoint` for each commit; `handoff` at the end of the next milestone
