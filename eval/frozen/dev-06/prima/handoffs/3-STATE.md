# State — greenhouse-readings
Updated: 2026-03-02 · Branch: `main` @ `2284803` · PR: none (no git remote configured)

## Milestone
M3 Aggregation is done: hourly rollup per zone, daily area-weighted rollup per greenhouse,
VPD per zone (leaf temperature = air − 2 °C), DLI per bed (lux→PPFD per lamp type in
`src/rollup/lamp_factors.csv`). After that came a day-window refactor, `docs/aggregation.md` and a
pre-commit config. "Rollup export to CSV" was moved to M4 by the user.
M4 Reporting (weekly reports and alerts for growers) is defined, but it has no approved plan yet.

## Next
1. Run `make test` and `make lint` and confirm green. Neither has run at any handoff so far,
   and that includes the new `.pre-commit-config.yaml`.
2. Still open from M2: `src/clean/pipeline.py` `run()` only calls `dedup` and `gaps.fill`.
   It skips the outlier filters, although `docs/cleaning.md` says dedup → filters → gap fill.
   It also returns a bare `value` series. Rollups (`src/rollup/load.py`) read
   `sensor_id, ts, kind, value, filled` from the Parquet store, and nothing writes cleaned
   data with a `filled` flag there. Fix this and add a pipeline test, then check that
   rollups work end-to-end on cleaned data. Ask the user first if the scope is unclear.
3. Propose the M4 Reporting plan and get it approved before coding. It must include
   "Rollup export to CSV", which was deferred from M3.

## Open decisions and risks
- Ask the user: should `gh-ingest` (`src/cli/main.py`) run the cleaning pipeline? Nothing calls it.
- Ask the user: should `src/store/sqlite_store.py` be deleted? Nothing imports it (open since M1).
- Storage is Parquet, not SQLite: user decision, see `docs/storage.md`. Do not reopen it.
- All logic runs in UTC (ingest converts logger local time). Daily rollups allow 23- and 25-hour days.
- No remote: every commit is local only, and CI (`.github/workflows/ci.yml`) has never run.
- `STATE.md` and `LOG.md` are excluded via `.git/info/exclude`. Never commit them.

## Pointers
- Aggregation: `docs/aggregation.md`, `src/rollup/` (`zones.yaml`, `windows.py`), `tests/rollup/`
- Cleaning: `docs/cleaning.md`, `src/clean/` · Design: `docs/design-notes.md` · `CHANGELOG.md`
- Verify: `make test` (pytest -q) → not run · Lint: `make lint` (ruff) → not run
