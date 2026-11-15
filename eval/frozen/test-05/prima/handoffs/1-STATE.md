# State — wikishift
Updated: 2026-03-02 · Branch: `main` (no remote) · PR: none · Last commit: `f3e076f`

## Milestone
M1 "Read the space export" is **done**: export zip → entities.xml → Page tree with current
storage-format bodies. All four planned steps are committed, plus the Windows-1252 titles detour.
No milestone after M1 is defined yet.

## Next
1. Ask the user to define M2 and approve a plan. The README goal (Confluence → Markdown files)
   suggests: convert storage-format bodies to Markdown, then write the tree to `--out`.
2. Wire the M1 pipeline into `src/wikishift/cli.py`. `main` only echoes for now.
3. Add tests. There is no `tests/` folder and no test command yet. Use the support team's sample
   export as a fixture if the user can share it (it has Windows-1252 titles).

## Open decisions and risks
- No tests: M1 has not been verified automatically.
- `archive`, `entities`, `tree`, `encoding` and `versions` are top-level packages under `src/`,
  outside `wikishift`. Their generic names may clash with other packages. Ask before moving them
  under `src/wikishift/`.
- `STATE.md` and `LOG.md` stay out of git (user's choice; listed in `.git/info/exclude`).
  Never commit them.

## Pointers
- Code: `src/archive/` (unpack, locate) · `src/entities/` (parser, model) ·
  `src/tree/` (hierarchy, orphans) · `src/encoding/titles.py` · `src/versions/` (current, body)
- Usage: `README.md` · Deps: `pyproject.toml` (lxml>=5.2, click>=8.1, Python >=3.11)
- Verify: none yet → no test result
- Suggested skills: `commit-checkpoint` for each step; `handoff` at the end of M2.
