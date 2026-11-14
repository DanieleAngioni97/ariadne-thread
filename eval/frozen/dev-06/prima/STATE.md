# State — greenhouse-readings
Updated: 2026-03-02 · Branch: `main` @ `91e05f5` · PR: none (no git remote configured)

## Milestone
M4 Reporting. Approved plan: Weekly summary report per greenhouse → Frost risk alert → Email
delivery of reports. Done: "Rollup export to CSV" (deferred from M3), the weekly summary
(`src/report/`) and the detour "Fix duplicate partitions after re-ingest". In progress: "Frost
risk alert". Its last commit (`91e05f5`, a cold-night test) did not close it. Not started: Email delivery.

## Next
1. Run `make test` and `make lint` and confirm green. Neither has run at any handoff so far
   (Bash was denied in the last session).
2. Finish "Frost risk alert". The pieces exist but are not connected:
   - `src/alerts/frost.py` `at_risk()` uses a fixed `FROST_RISK_C = 2.0`. It never reads
     `src/alerts/thresholds.yaml` (default 2.0; tomatoes 3.0, lettuce 1.0, seedlings 4.0).
   - No zone→crop mapping exists anywhere (`src/rollup/zones.yaml` has no crop). Ask the
     user where the mapping should live.
   - Nothing calls `cooldown.should_send` (12 h, one alert per zone per night) or
     `dewpoint.dew_point`/`trend` (extrapolation from the last 3 hours).
   - `tests/alerts/test_frost.py` only covers `at_risk` with the fixed threshold.
   Connect them, test each one, and update `docs/alerting.md`. Then close the item.
3. Start "Email delivery of reports". Agree on the scope with the user first (SMTP vs
   provider, recipients per greenhouse, whether frost alerts are emailed too).
4. Still open from M2: `src/clean/pipeline.py` `run()` only does dedup + gap fill. It skips
   the outlier filters (`docs/cleaning.md`: dedup → filters → gap fill) and returns a bare
   `value` series. Nothing writes cleaned data with `filled` to the Parquet store, which
   `src/rollup/load.py` expects. Fix it, add a pipeline test, and check the rollups end to end.

## Open decisions and risks
- Ask the user: should `gh-ingest` (`src/cli/main.py`) run the cleaning pipeline? Nothing calls it.
- Ask the user: should `src/store/sqlite_store.py` be deleted? Nothing imports it (open since M1).
- Storage is Parquet, not SQLite: user decision, see `docs/storage.md`. Do not reopen it.
- Re-ingesting a day now replaces its partition (`tests/store/test_partitions.py`). Before that
  fix, duplicate files doubled the frost alert counts.
- All logic runs in UTC. Daily rollups allow 23- and 25-hour days.
- CSV export uses a semicolon and a decimal comma, one file per greenhouse (user's growers).
- No remote: every commit is local only, and CI (`.github/workflows/ci.yml`) has never run.
- `STATE.md` and `LOG.md` are excluded via `.git/info/exclude`. Never commit them.

## Pointers
- Alerts: `docs/alerting.md`, `src/alerts/`, `tests/alerts/` · Report: `src/report/`
  (`templates/weekly.md.j2`, jinja2), `tests/report/` · Export: `tests/export/`
- Aggregation: `docs/aggregation.md`, `src/rollup/` · Cleaning: `docs/cleaning.md`, `src/clean/`
- Verify: `make test` (pytest -q) → not run · Lint: `make lint` (ruff 0.4.1) → not run
