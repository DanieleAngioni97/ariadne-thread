# State — greenhouse-readings
Updated: 2026-03-02 · Branch: `main` @ `ff40555` · PR: none (no git remote configured)

## Milestone
M2 Cleaning: all six planned steps are committed with tests: outlier filters for temperature,
humidity, soil moisture and CO2, gap filling up to 15 min (flagged), duplicate removal. After
that came a pipeline refactor, docs, a changelog and pip caching in CI. M1 Ingest is done (see `LOG.md`).

## Next
1. Run `make test` and `make lint` and confirm green. Commands could not be run at this
   handoff (or the last one), so the suite has not been checked.
2. Fix `src/clean/pipeline.py`: `run()` only calls `dedup` and `gaps.fill`, and never calls the
   outlier filters (`temperature`, `humidity`, `soil`, `co2`). `docs/cleaning.md` says the order is
   dedup → outlier filters → gap fill. Wire the filters in, and add a pipeline test that
   proves an outlier is dropped before gaps are filled. Also check that the gap-filled flag
   still comes through, since `run()` returns a per-sensor `value` series.
3. Ask the user whether `gh-ingest` (`src/cli/main.py`) should run the cleaning pipeline.
   Right now nothing calls `clean.pipeline`.
4. Then close M2 and ask the user for the next milestone (README promises aggregation;
   `docs/storage.md` mentions hourly rollups). Get the plan approved before coding.

## Open decisions and risks
- Still open from M1: should `src/store/sqlite_store.py` be deleted? Nothing imports it. Ask the user.
- Storage is Parquet, not SQLite: user decision, see `docs/storage.md`. Do not reopen it.
- Ingest converts logger local time to UTC (`src/ingest/timestamps.py`). The DST hour repeated
  on clock change broke the humidity rate checks. Keep all cleaning logic in UTC.
- No remote: every commit is local only, and CI (`.github/workflows/ci.yml`) has never run.
- `STATE.md` and `LOG.md` are excluded via `.git/info/exclude`. Never commit them.

## Pointers
- Cleaning: `docs/cleaning.md`, `src/clean/` (soil calibration in `soil_calibration.csv`), `tests/clean/`
- Design: `docs/design-notes.md` · Storage: `docs/storage.md` · `CHANGELOG.md`
- Verify: `make test` (pytest -q) → not run at handoff · Lint: `make lint` (ruff) → not run
