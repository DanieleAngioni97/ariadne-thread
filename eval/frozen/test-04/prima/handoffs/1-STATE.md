# State — tender-sieve
Updated: 2026-11-15 · Branch: `main` (last commit `99de123`) · PR: none

## Milestone
M1 Ingestion is done: fetch → parse → normalize buyers and CPV codes → Parquet partitions,
run nightly (`README.md`). M2 Deduplication is next and has no approved plan yet.

## Next
1. Draft a task plan for M2 Deduplication (find notices describing the same tender, merge them
   into one record) and get the user's approval before coding. Read partitions with
   `src/storage/reader.py`; normalized buyer and CPV fields come from `src/normalize/`.
2. Start the first approved M2 task.

## Open decisions and risks
- "Normalize award amounts" was moved from M1 to M4 Spending analytics, at the user's request.
- "Store raw notices in SQLite" was dropped in favour of Parquet, but `src/store_sqlite/db.py`
  is still in the tree. Ask the user whether to delete it.
- The feed sends gzip bodies without a Content-Encoding header; `src/http/decompress.py` detects
  them by magic bytes. Keep all feed reads going through it.
- Roadmap after M2: M3 Publishing (files + API for analysts), M4 Spending analytics
  (awarded spending by buyer, sector, year).
- STATE.md and LOG.md stay out of git (listed in `.git/info/exclude`). Never commit them.

## Pointers
- Docs: `docs/storage.md` (Parquet layout) · `docs/sources.md` (notice sources) · `README.md`
- Settings: `src/config/settings.py` (paths and URLs)
- Verify: `ruff check . && pytest` (same as CI, `.github/workflows/ci.yml`) → not run during
  this handoff. Run it first in the next session.
- Suggested skills: `commit-checkpoint` for each commit; `handoff` when M2 is done.
