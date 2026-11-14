# State — greenhouse-readings
Updated: 2026-03-02 · Branch: `main` @ `09cdc8a` · PR: none (no git remote configured)

## Milestone
M1 Ingest done: logger CSV exports (comma/semicolon) → validated `Reading` (°F→°C) →
day-partitioned Parquet store → `gh-ingest` CLI with `--dry-run` and rejected-row report. CI runs tests on push.

## Next
1. Run `make test` and confirm green: the last session could not run commands, so the suite
   was not re-run at handoff.
2. Ask the user whether to delete `src/store/sqlite_store.py`: SQLite storage was dropped in
   favour of Parquet but the module is still in the tree (nothing imports it).
3. Ask the user to define the next milestone (README promises aggregation; `docs/storage.md`
   mentions hourly rollups) and get a plan approved before coding.

## Open decisions and risks
- Storage is Parquet, not SQLite: user decision, rationale in `docs/storage.md`. Do not reopen it.
- No remote: all commits are local only; CI (`.github/workflows/ci.yml`) has never run remotely.
- `STATE.md` and `LOG.md` are excluded via `.git/info/exclude`: never commit them.

## Pointers
- Design: `docs/design-notes.md` · Storage choice: `docs/storage.md`
- Code: `src/ingest/`, `src/schema/`, `src/store/parquet_store.py`, `src/cli/`
- Verify: `make test` (pytest -q) → not run at handoff · Lint: `make lint` (ruff)
