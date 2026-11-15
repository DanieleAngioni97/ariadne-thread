# State — ubl-check
Updated: 2026-11-15 · Branch: `main` (clean) · PR: none · Last commit: `f526024`

## Milestone
M2 "Validation rules" is done: error report (rule ID, XPath, severities, text/JSON), XSD check
with lxml, and EN 16931 checks BR-CO-10/14/15/16 (see `docs/rules.md`).
M3 "Batch performance" (validate folders with thousands of invoices quickly) is defined but has
no approved plan yet. Its only known step so far is "Cache for code lists", deferred from M2.

## Next
1. Run `pip install -e . pytest && pytest` and record the result. It has not been run since M1.
2. Remove dead code from dropped steps (ask the user first):
   - `src/schema/xmlschema_check.py`: the xmlschema step was replaced by lxml (`lxml_check.py`).
     `xmlschema` is not a dependency, so importing this module fails.
   - `src/dates/fuzzy.py` + `tests/dates/test_fuzzy.py`: dateutil was dropped in M1.
     `python-dateutil` is not a dependency either, so this test probably breaks collection.
   - `docs/rules-draft.md`: only a "Superseded by docs/rules.md" stub is left.
3. Fill the test gaps: there is no `tests/lines/` (for `src/lines/*`) and no `tests/report/`.
4. Plan M3 with the user and get it approved. "Cache for code lists" goes first. Other likely
   steps: a folder or batch CLI, parallel workers, and a benchmark on a large sample set.

## Open decisions and risks
- Amounts are `Decimal` and are rounded half up to cents (`src/money/rounding.py`), not
  half-even. Tax subtotals that end in 0.005 broke BR-CO-14 under the default rounding.
- The XSD check uses lxml with a schema compiled once (`src/schema/lxml_check.py`). Don't
  return to xmlschema. Keep compiling the schema only once, which matters even more for M3.
- Dates are strict ISO 8601 only (`src/dates/iso.py`). Don't bring back lenient parsing.
- `src/loading/bom.py` strips the BOM and blank lines from the customer's Windows ERP exports.
  Keep it.
- STATE.md and LOG.md are kept out of git by `.git/info/exclude`. Never commit them.

## Pointers
- Rules: `docs/rules.md` · Design: `docs/design.md` · CI: `.github/workflows/ci.yml`
- Verify: `pip install -e . pytest && pytest` → not run in this handoff (no shell access)
- Suggested skills: `commit-checkpoint` for each commit; `handoff` when M3 is planned or done.
