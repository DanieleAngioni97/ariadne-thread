# State — slotwise
Updated: 2026-03-02 · Branch: `main` (HEAD `f3180be`) · PR: none

## Milestone
M1 Slot data model: load items, rack locations and pick history into one consistent
model of the warehouse. All three planned tasks are closed:
- Load SKU master from ERP export (`src/sku/`, `src/csvio/numbers.py`): done, tested
- Read locations from nightly WMS dump (`src/locdump/`): done, tested
- Compute pick velocity per SKU (`src/velocity/`): done, A/B/C classes in `abc.py`

## Next
1. Decide with the user what to do with `src/locapi/`. It is dead code from the dropped
   "Read locations from WMS API" task, and `client.py` still does `import requests`,
   which was removed from the dependencies (pandas 2.2 bump), so importing it fails.
   Suggested: delete it.
2. Add tests for `src/velocity/abc.py` and `src/velocity/picks.py`. Only `window.py` has
   tests (`tests/velocity/test_window.py`).
3. Close M1: nothing joins SKUs, locations and velocity into the "one consistent model"
   yet. Confirm with the user whether that join belongs in M1 or in the next milestone.

## Open decisions and risks
- The user chose the nightly WMS dump over the REST API. Don't revive `locapi`.
- ERP numbers use Italian decimal commas ('12,5'). Parse them through `csvio.numbers.parse_decimal`.
- `docs/scoring.md` holds draft weights from before the pilot (velocity 0.5, weight 0.3,
  temperature 0.2). They are not final.
- `STATE.md`/`LOG.md` are local only (listed in `.git/info/exclude`). Never commit them.

## Pointers
- Docs: `docs/overview.md`, `docs/wms-dump.md` (dump format), `docs/scoring.md`
- Fixture: `tests/fixtures/locations.csv`
- Verify: `pytest` (pythonpath=src). Not run at this handoff because shell access was denied,
  so run it first.
- Suggested skills: `commit-checkpoint` for each commit; `handoff` when M1 closes.
