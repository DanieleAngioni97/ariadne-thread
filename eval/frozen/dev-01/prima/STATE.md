# State — invoice-parser
Updated: 2026-03-02 · Branch: `main` @ `f42def8` · PR: none (no remote configured)

## Milestone
M1 Parser — invoices become ledger rows. Done: lexer (`3eae71d`), in-memory supplier
cache (`f238b2c`). Current plan (approved): Validate invoice totals → Report malformed invoices.
In progress: "Validate invoice totals" — first cut in `f42def8` (`src/totals/index.js`), not closed.

## Next
1. Finish "Validate invoice totals": `balanced()` in `src/totals/index.js` compares float sums
   with `===`; decide on rounding/cents and add tests, then close the step.
2. "Report malformed invoices".
3. Then M2 Reports (monthly reports from the ledger); its first step is
   "Export to the ledger", deferred there from M1.

## Open decisions and risks
- "Store suppliers in SQLite" was dropped by the user; the in-memory cache replaces it
  (`docs/decisions.md`). Don't reintroduce SQLite.
- No test script in `package.json` and no tests yet; CI job `.github/workflows/test.yml`
  has `timeout-minutes: 1` (raised to 60 s in `8beb0e4` after cold-cache timeouts).
- STATE.md and LOG.md are git-excluded (`.git/info/exclude`): never commit them.

## Pointers
- Decisions: `docs/decisions.md` · Code: `src/lexer`, `src/cache`, `src/totals`
- Verify: no test command defined yet → not run
