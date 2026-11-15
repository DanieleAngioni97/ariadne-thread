# State — slotwise
Updated: 2026-11-15 · Branch: `main` (HEAD `27670ca`, no remote configured) · PR: none

## Milestone
M2 Slot scoring: score every SKU/location pair and propose a slot per SKU. All planned tasks closed:
- Score by pick velocity (`src/score_velocity/`): golden zone, slot height from rack level. Tested
- Score by item weight (`src/score_weight/`): heavy cases on floor level, per-location load limits. **No tests**
- Score by temperature zone (`src/score_temp/`): frozen only in freezer aisles, chilled near dock door 3. Tested
- Greedy slot assignment (`src/assign_greedy/`): best free slot, fastest first, ties by pick-path order. Tested
- Detour: SKUs without pick history are treated as slow movers (`src/newsku/default.py`). **No tests**
Changes to the plan: "Seasonal velocity adjustment" moved to M4 Seasonal planning. "Solve slot assignment
with MILP" dropped in favour of greedy.

## Next
1. Close M2 end-to-end. `src/slotwise/cli.py` is still a stub that only prints. Wire it to load
   items/locations/orders, combine the scores and run `assign_greedy.assign`. No combiner applying
   the `docs/scoring.md` weights (velocity 0.6, weight 0.4, temperature as a hard rule) was found.
2. Add tests for `score_weight` and `newsku`. M1 leftovers are also untested: `velocity/abc.py`, `velocity/picks.py`.
3. Ask the user whether to delete the dead code:
   - `src/assign_milp/` and the `pulp` dependency in `pyproject.toml` (MILP was dropped)
   - `src/locapi/`, which imports `requests`. That package is no longer a dependency, so ruff
     or pytest collection may break CI. This question has been open since M1.
4. Then plan M3, or M4 Seasonal planning (seasonal velocity adjustment for ice cream and panettone).

## Open decisions and risks
- `assign_greedy.assign` does not sort. "Fastest first" depends on the caller passing SKUs already sorted.
  `max(free, ...)` raises ValueError when there are more SKUs than slots.
- Temperature is a hard constraint, not a weight. Don't add it back as a weighted score.
- The user chose the nightly WMS dump over the REST API. Don't revive `locapi`.
- ERP numbers use Italian decimal commas. Parse them with `csvio.numbers.parse_decimal`. Read CSV
  files with the shared semicolon reader in `csvio/reader.py`.
- `STATE.md`/`LOG.md` are local only (listed in `.git/info/exclude`). Never commit them.

## Pointers
- Docs: `docs/overview.md`, `docs/wms-dump.md`, `docs/scoring.md` (post-Padova weights),
  `docs/temperature.md` (QA meeting rules)
- Fixtures: `tests/fixtures/locations.csv`, `tests/fixtures/orders.csv`
- Verify: `ruff check . && pytest` (Python 3.12, same as CI `.github/workflows/ci.yml`). Not run
  at this handoff because shell access was denied, so run it first.
- Suggested skills: `commit-checkpoint` for each commit; `handoff` when M2 is closed end-to-end.
