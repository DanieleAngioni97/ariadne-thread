# State — ubl-check
Updated: 2026-11-15 · Branch: `main` (clean at session start) · PR: none · Last commit: `965ee27`

## Milestone
M1 "Parsing core" is done: UBL 2.1 invoice XML is now turned into plain Python data.
All steps are closed: loading + namespaces, header, ISO 8601 dates, parties, lines.
The next milestone has not been chosen yet.

## Next
1. Remove what's left of the dropped dateutil step: `src/dates/fuzzy.py` and
   `tests/dates/test_fuzzy.py`. `python-dateutil` is not in `pyproject.toml`, so this test
   probably fails to import in CI. Check it with a test run first.
2. Add tests for `src/lines/` (`parse.py`, `amounts.py`, `allowances.py`). There is no
   `tests/lines/` yet.
3. Run `pytest` and record the result, then ask the user what M2 is. Likely candidates:
   EN 16931 total checks (see `docs/design.md`), or CreditNote support.

## Open decisions and risks
- Dates are strict ISO 8601 only (`src/dates/iso.py`). The user dropped dateutil, so don't
  bring back lenient or European date parsing.
- Amounts are always `Decimal`, never float (`docs/design.md`).
- `src/loading/bom.py` strips the UTF-8 BOM and leading blank lines that the customer's
  Windows ERP exports contain. Keep it in place.
- STATE.md and LOG.md are kept out of git by `.git/info/exclude`. Never commit them.

## Pointers
- Design: `docs/design.md` · Usage: `README.md` · CI: `.github/workflows/ci.yml`
- Verify: `pip install -e . pytest && pytest` → not run in this handoff (no shell access)
- Suggested skills: `commit-checkpoint` for each commit; `handoff` when M2 is planned or done.
