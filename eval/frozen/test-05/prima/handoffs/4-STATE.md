# State — wikishift
Updated: 2026-03-02 · Branch: `main` (no remote) · PR: none · Last commit: `a1c8ab1`

## Milestone
**M5 "Incremental re-sync"**: re-run the migration on a newer export and rewrite only the pages
that changed. Approved plan: Record a migration manifest ✅ → **Detect changed pages between
exports** (in progress) → Rewrite only changed pages → Remove pages deleted upstream.
Detour done: "Default parentless pages to the space root" (`5c4cea2`). The April export had pages
whose parent was deleted, and the comparison run crashed on them.

## Next
1. Finish "Detect changed pages between exports". `src/diff/compare.py` `compare()` still flags
   "changed" on a version bump alone. Make it use `really_changed()` (`src/diff/versions.py`,
   which compares hashes) and fold in `renames()` (`src/diff/renames.py`). Then close the step.
2. "Rewrite only changed pages": rewrite only added and changed pages, move renamed ones, then
   rewrite the manifest (`src/manifest/write.py` → `out/.wikishift/manifest.json`).
3. "Remove pages deleted upstream": delete files for `removed` ids and drop them from the manifest.

## Open decisions and risks
- **M4 status unknown**: LOG.md has no M4 entry, and nothing in this session touched M4.
  Before closing M5, ask the user whether M4 "People and permissions" (including "Rewrite user
  mentions") was finished, dropped or postponed.
- `really_changed()` returns False whenever the version is equal, so a body change without a
  version bump is missed. Check that this is intended.
- Leftovers still open from M3 (unconfirmed): asset links `{folder}/{filename}` vs hashed
  `out/assets/<sha256[:16]><ext>`. Also the stale `src/attachments/copy.py` and
  `src/macros/panel/blockquote.py`. Ask before fixing or deleting.
- Still no `tests/` and `src/wikishift/cli.py` `main` only echoes, so there is no end-to-end run.
  CI (`pytest`, Py 3.12) would exit 5. No remote.
- Version mismatch: `CHANGELOG.md` says 0.3.0, `pyproject.toml` says 0.1.0. Top-level packages
  under `src/` (now also `manifest`, `diff`) sit outside `wikishift`. Ask before moving them.
- `STATE.md` and `LOG.md` stay out of git (user's choice; `.git/info/exclude`). Never commit them.

## Pointers
- Specs: `docs/conversion.md` · `docs/output-layout.md` (no mention of manifest or `out/assets/`)
- M5 code: `src/manifest/{schema,write}.py` · `src/diff/{compare,versions,renames}.py` ·
  `src/tree/orphans.py` (detour)
- Earlier: M3 `src/layout/` `src/links/` `src/assets/` · M2 `src/blocks/` `src/tables/`
  `src/macros/` `src/sanitize/` · M1 `src/archive/` `src/entities/` `src/tree/` `src/encoding/`
  `src/versions/`
- Verify: `pip install -e . pytest && pytest`. Not run this session: no shell access, and no tests exist.
- Suggested skills: `commit-checkpoint` for each step; `handoff` when M5 is done.
