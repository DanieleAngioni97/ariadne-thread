# State — wikishift
Updated: 2026-03-02 · Branch: `main` (no remote) · PR: none · Last commit: `421dd1a`

## Milestone
M2 "Convert pages to Markdown" is **done**: storage-format XHTML → GFM. Headings, paragraphs,
inline styles, tables (merged cells flattened), code fences, panels as GitHub alerts, toc
(minLevel/maxLevel), unknown macros kept as HTML comments. Plus the zero-width-chars detour.
No milestone after M2 is defined yet.

## Next
1. Ask the user to define M3 and approve a plan. Likely: wire M1 (export → page tree) and M2
   (body → Markdown) into `src/wikishift/cli.py` (`main` still only echoes), and write files
   to `--out` following `docs/output-layout.md`.
2. Add `tests/`. There are none. CI (`.github/workflows/test.yml`) runs `pytest`, which exits 5
   with no tests collected, so CI would fail. No remote yet, so it has never run.

## Open decisions and risks
- Nothing is verified automatically: neither M1 nor M2 has tests.
- `src/macros/panel/blockquote.py` (`panel_macro`) is left over from the dropped step "Convert
  info panel macros". `src/macros/alerts/render.py` replaced it. Ask before deleting it.
- Docs disagree: README lists info/**tip**/note/warning panels, `docs/conversion.md` omits tip.
  `alerts/render.py` maps info→NOTE, tip→TIP, note→IMPORTANT, warning→WARNING, unknown→NOTE.
- Still open from M1: `archive`, `entities`, `tree`, `encoding`, `versions` (and now `blocks`,
  `tables`, `macros`, `sanitize`) are top-level packages under `src/`, outside `wikishift`.
  Their generic names may clash with other packages. Ask before moving them.
- `STATE.md` and `LOG.md` stay out of git (user's choice; `.git/info/exclude`). Never commit them.

## Pointers
- Specs: `docs/conversion.md` (rules) · `docs/output-layout.md` (output tree) · usage `README.md`
- M2 code: `src/blocks/` · `src/tables/` · `src/macros/{code,alerts,toc,unknown}/` ·
  `src/sanitize/zero_width.py`
- M1 code: `src/archive/` · `src/entities/` · `src/tree/` · `src/encoding/` · `src/versions/`
- Deps: `pyproject.toml` (lxml>=5.2, click>=8.1, Python >=3.11)
- Verify: `pip install -e . pytest && pytest`. Not run this session (no shell access; no tests exist).
- Suggested skills: `commit-checkpoint` for each step; `handoff` at the end of M3.
