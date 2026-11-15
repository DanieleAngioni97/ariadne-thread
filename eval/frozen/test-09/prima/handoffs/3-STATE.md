# State — slotwise
Updated: 2026-11-15 · Branch: `main` (HEAD `3c723b5`, no remote configured) · PR: none

## Milestone
M3 Move planning and reports: turn the proposed slots into a nightly move plan and give planners
reports on its effect. Approved plan, in order:
- [x] Generate re-slot move list (`src/moves/`): diff current/proposed, cap 150 moves/night,
  empty a slot before filling it, swaps via a buffer slot. Tested (`tests/moves/test_diff.py`)
- [x] Report for slot moves (`src/report_moves/`): grouped by source aisle, one sheet per aisle,
  layout in `docs/move-sheet.md`. Tested. Output goes to `out/move_sheets/` (gitignored)
- [ ] Report for zone utilization (`src/utilization/`): **in progress**. Done: occupancy share
  per zone (`occupancy.py`), formatted rows (`by_zone.py`), near-full warning (`thresholds.py`,
  ambient 0.92 / chilled 0.88 / frozen 0.85, default 0.9). **No tests yet**
- [ ] Report for pick-path length: not started
- Detour (closed): aisle labels padded to two digits, F2 → F02 (`src/labels/aisle.py`), as the
  night shift asked so they match the rack signs. **No tests**
- `pulp` was dropped from dependencies during M3.

## Next
1. Close "Report for zone utilization": add `tests/utilization/` covering `occupancy`, `rows`
   and `warnings` (threshold boundary `>=`, unknown zone falls back to 0.9). Commit as
   `test(utilization): …`. Consider whether the warnings should show up in the report rows.
2. Start "Report for pick-path length" (last M3 task). Reuse pick-path order from
   `src/assign_greedy/ties.py` and orders from `tests/fixtures/orders.csv`.
3. Add a test for `labels/aisle.py` (F2 → F02, two-digit aisles unchanged).
4. Ask the user about dead code: `src/assign_milp/` still does `import pulp`, which is no longer
   a dependency, so it now breaks like `src/locapi/` (imports `requests`). Delete both?
5. Still open from M2: `src/slotwise/cli.py` is a stub that only prints. There is no score
   combiner, and `score_weight`, `newsku`, `velocity/abc.py`, `velocity/picks.py` have no tests.

## Open decisions and risks
- `assign_greedy.assign` does not sort, so callers must pass SKUs fastest first. It raises
  ValueError when there are more SKUs than slots.
- Temperature is a hard constraint, not a weight. The user chose the nightly WMS dump over the
  REST API, so don't revive `locapi`.
- ERP numbers use Italian decimal commas (`csvio.numbers.parse_decimal`). Read CSVs with
  `csvio/reader.py`, which handles the semicolons.
- `STATE.md`/`LOG.md` are local only (in `.git/info/exclude`). Never commit them.
- M4 Seasonal planning (seasonal velocity adjustment) comes after M3.

## Pointers
- Docs: `docs/overview.md`, `docs/wms-dump.md`, `docs/scoring.md`, `docs/temperature.md`,
  `docs/move-sheet.md`
- Verify: `ruff check . && pytest` (Python 3.12, as in CI). Not run at this handoff because shell
  access was denied. Run it first, since collecting `assign_milp`/`locapi` may fail.
- Suggested skills: `commit-checkpoint` for each commit; `handoff` when M3 closes.
