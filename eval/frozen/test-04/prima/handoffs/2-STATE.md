# State — tender-sieve
Updated: 2026-11-15 · Branch: `main` (last commit `3b3d586`) · PR: none (no git remote)

## Milestone
M2 Deduplication is done (CHANGELOG 0.2.0): matching by reference, title, language copy and
corrigendum (`src/match/`) → union-find duplicate sets → per-source duplicate rate report
(`src/report/`) → canonical record with source ids (`src/merge/canonical.py`). M3 Publishing is next and has no approved plan yet.

## Next
1. Run `ruff check . && pytest`. It was not run during this handoff.
2. Ask the user the open questions below, then draft a task plan for M3 Publishing (files + API
   for analysts, serving canonical records) and get approval before coding.

## Open decisions and risks
- "Merge duplicates into the newest notice" was dropped and replaced by "canonical record",
  but `src/merge/newest.py` (newest-wins + dispatch-time tie-break) is still in the tree. Ask
  the user whether to delete it.
- `src/store_sqlite/db.py` is still in the tree too (SQLite dropped for Parquet in M1). Ask the user whether to delete it.
- No git remote is configured: every commit is local only. Ask the user where to push.
- Title threshold 0.82 is deliberate: 0.75 merged distinct framework lots (`docs/dedup-design.md`).
- Oversized duplicate sets are held for review (`src/match/review.py`), not merged.
- Feed quirks: gzip bodies without Content-Encoding header (always read via
  `src/http/decompress.py`); empty publication dates fall back to dispatch date
  (`src/repair/dates.py`); sandbox test notices are filtered (`src/filters/sandbox.py`).
- "Normalize award amounts" belongs to M4 Spending analytics (user's choice).
- STATE.md and LOG.md stay out of git (listed in `.git/info/exclude`). Never commit them.

## Pointers
- Docs: `docs/dedup-design.md` · `docs/storage.md` · `docs/sources.md` · `README.md` · `CHANGELOG.md`
- Settings: `src/config/settings.py` · read partitions via `src/storage/reader.py`
- Verify: `ruff check . && pytest` (same as CI, `.github/workflows/ci.yml`) → not run during this handoff
- Suggested skills: `commit-checkpoint` for each commit; `handoff` when M3 is done.
