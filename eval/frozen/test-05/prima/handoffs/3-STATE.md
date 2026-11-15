# State — wikishift
Updated: 2026-03-02 · Branch: `main` (no remote) · PR: none · Last commit: `2841bfa`

## Milestone
M3 "Rewrite links and attachments" is **done**: nested output folders with title slugs
(sibling de-dup), relative page links, attachment links (percent-encoded), heading anchors →
GitHub slugs, attachments stored once in `out/assets/` named by content hash.
"Rewrite user mentions" was deferred to M4. Next milestone, defined but no plan yet:
**M4 "People and permissions"**: map Confluence users and page restrictions onto target-wiki accounts.

## Next
1. Propose a step plan for M4 and get the user's approval. It must include "Rewrite user
   mentions" (moved from M3).
2. Before M4 work, raise the M3 gaps below with the user (asset link mismatch, leftover code).
3. Still pending since M2: add `tests/` and wire the pipeline into `src/wikishift/cli.py`
   (`main` still only echoes; nothing writes files end to end).

## Open decisions and risks
- **Asset links likely broken**: `src/links/attachments/rewrite.py` emits `{folder}/{filename}`,
  but `src/assets/store.py` writes `out/assets/<sha256[:16]><ext>`. Links must point at the
  hashed name (relative from each page to `assets/`). Not fixed; confirm with the user.
- `src/attachments/copy.py` (`copy_for_page`, per-page `_attachments/`) is left over from the
  dropped step "Copy attachments next to each page". Ask before deleting it.
- `src/macros/panel/blockquote.py` is left over from M2's dropped panel step. Ask before deleting.
- `docs/output-layout.md` does not mention `out/assets/`; README vs `docs/conversion.md` still
  disagree on the tip panel.
- Version mismatch: `CHANGELOG.md` says 0.3.0, `pyproject.toml` says 0.1.0.
- No tests: CI (`.github/workflows/test.yml`, Python 3.12) runs `pytest`, which exits 5 with no
  tests. No remote, so it has never run.
- Packages `archive`, `entities`, `tree`, `encoding`, `versions`, `blocks`, `tables`, `macros`,
  `sanitize`, `layout`, `links`, `attachments`, `assets` sit top-level under `src/`, outside
  `wikishift`; generic names may clash. Ask before moving them.
- `STATE.md` and `LOG.md` stay out of git (user's choice; `.git/info/exclude`). Never commit them.

## Pointers
- Specs: `docs/conversion.md` · `docs/output-layout.md` · usage `README.md` · `CHANGELOG.md`
- M3 code: `src/layout/` · `src/links/{pages,attachments,anchors}/` · `src/assets/`
- M2 code: `src/blocks/` · `src/tables/` · `src/macros/` · `src/sanitize/`
- M1 code: `src/archive/` · `src/entities/` · `src/tree/` · `src/encoding/` · `src/versions/`
- Verify: `pip install -e . pytest && pytest`. Not run this session (no shell access; no tests exist).
- Suggested skills: `commit-checkpoint` for each step; `handoff` at the end of M4.
