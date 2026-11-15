# State — ubl-check
Updated: 2026-11-15 · Branch: `main` (clean) · PR: none · Last commit: `8ef6b42` · Version 0.2.0

## Milestone
M3 "Batch performance". Approved plan: Batch validation of a folder → Cache for parsed parties →
Cache invalidation on reload → Command-line validator.
- Done: "Batch validation of a folder" (`src/batch/`: runner, process pool, fail-fast/workers
  options, pass/fail summary), plus the detour "Skip empty invoice files" (`src/loading/empty.py`).
- In progress: "Cache for parsed parties" (`src/partycache/`). Its 3 parts exist but are not wired.

## Next
1. Finish "Cache for parsed parties". Read the code: `store.py`, `keys.py` and `lru.py` were checked
   by reading only.
   - `store.py` still uses a plain dict `_parties`. Make it use `LRU(512)` from `lru.py`.
     `LRU.put` evicts, but plain `__setitem__` does not, and a hit must call `move_to_end`.
   - `keys.party_key` returns `None` when there is no `cbc:EndpointID`. Don't cache under `None`:
     parse the party without the cache.
   - Nothing calls `get_or_parse` yet. Wire it into the party parsing (`src/party/*.py`).
   - Add `tests/partycache/`. `tests/batch/` doesn't exist either: add it.
2. "Cache invalidation on reload": clear the cache when invoices or code lists are reloaded.
   The cache lives in each module, so every worker process in `src/batch/pool.py` has its own copy.
3. "Command-line validator": a CLI over `src/batch/runner.py` with the fail-fast/workers options
   from `src/batch/options.py`, plus a `[project.scripts]` entry in `pyproject.toml`.
4. Run `pip install -e . pytest && pytest`. It hasn't run since M1.

## Open decisions and risks
- "Cache for code lists", deferred from M2, is not in the approved M3 plan. Ask the user whether
  to drop it or add it.
- Dead code from M1/M2 is still there (ask before deleting): `src/schema/xmlschema_check.py`
  (xmlschema is not a dependency), `src/dates/fuzzy.py` + `tests/dates/test_fuzzy.py` (dateutil
  is not a dependency, so this probably breaks pytest collection), and `docs/rules-draft.md` (a stub).
- Test gaps: no `tests/lines/` and no `tests/report/`.
- Amounts are `Decimal` and round half up (`src/money/rounding.py`), not half-even.
- Keep the XSD check on lxml with the schema compiled once. Dates are strict ISO 8601.
  `src/loading/bom.py` stays.
- Empty .xml files are reported, not raised (`src/loading/empty.py`). Keep that for batch runs.
- STATE.md and LOG.md are kept out of git by `.git/info/exclude`. Never commit them.

## Pointers
- Rules: `docs/rules.md` · Design: `docs/design.md` · CI: `.github/workflows/ci.yml` (Py 3.11–3.13)
- Verify: `pip install -e . pytest && pytest` → not run (no shell access in this session)
- Suggested skills: `commit-checkpoint` for each commit; `handoff` after each M3 step or at the end of M3.
