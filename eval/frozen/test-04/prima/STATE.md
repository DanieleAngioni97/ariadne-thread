# State — tender-sieve
Updated: 2026-11-15 · Branch: `main` (last commit `ee72de7`) · PR: none (no git remote)

## Milestone
M3 Publishing, approved plan: CSV export → duplicate groups JSONL → read-only API → daily
change feed. The first two are done (`src/export_csv/`, `src/export_jsonl/`, `docs/exports.md`).
Read-only API is in progress (`src/api/`: notices listing, health, buyer/CPV-division filters,
cursor pagination). Change feed not started.

## Next
1. Run `ruff check . && pytest`. Bash was unavailable during this handoff, so it was not run.
2. Add `fastapi` (and a test client dep, e.g. `httpx` already present) to `pyproject.toml`:
   `src/api/app.py` imports FastAPI but it is not a declared dependency.
3. Write `tests/api/` (none exist): listing, health, filters, cursor pagination. Then close
   "Serve notices over a read-only API".
4. Start "Publish a daily change feed" (last task of M3); then CHANGELOG 0.3.0 and handoff.

## Open decisions and risks
- `src/merge/newest.py` (dropped newest-wins merge) and `src/store_sqlite/db.py` (SQLite
  dropped for Parquet in M1) are still in the tree. Ask the user whether to delete them.
- No git remote is configured: every commit is local only. Ask the user where to push.
- CSV export uses `;` delimiter + UTF-8 BOM, one row per lot; duplicate sets JSONL is gzipped
  and carries the match reason per pair (`docs/exports.md`).
- `Dockerfile` is for the nightly job, not the API.
- Title threshold 0.82 is deliberate: 0.75 merged distinct framework lots (`docs/dedup-design.md`).
- Oversized duplicate sets are held for review (`src/match/review.py`), not merged.
- Feed quirks: gzip without Content-Encoding (`src/http/decompress.py`); empty publication
  dates fall back to dispatch date (`src/repair/dates.py`); sandbox notices filtered
  (`src/filters/sandbox.py`).
- "Normalize award amounts" belongs to M4 Spending analytics (user's choice).
- STATE.md and LOG.md stay out of git (`.git/info/exclude`). Never commit them.

## Pointers
- Docs: `docs/exports.md` · `docs/dedup-design.md` · `docs/storage.md` · `docs/sources.md` · `CHANGELOG.md`
- Settings: `src/config/settings.py` · read partitions via `src/storage/reader.py`
- Verify: `ruff check . && pytest` (same as CI) → not run during this handoff
- Suggested skills: `commit-checkpoint` for each commit; `handoff` when M3 is done.
