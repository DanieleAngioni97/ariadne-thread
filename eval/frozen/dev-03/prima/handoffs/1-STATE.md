# State — docforge
Updated: 2026-03-02 · Branch: `main` @ `72f8dd8` · PR: none (no remote configured)

## Milestone
M1 "Core build" (Markdown folder → browsable HTML site) is done: rendering pipeline, sidebar nav,
default theme with dark mode. "Search index for pages" was moved to M2 by the user.
M2 "Fast rebuilds" is next: incremental rebuilds, so editing one page refreshes the preview in < 1 s.

## Next
1. Propose a step plan for M2 and get the user's approval before coding. It must include
   "Search index for pages" (deferred from M1) alongside the incremental-rebuild work.
2. Base the caching design on `docs/caching.md` (SHA-1 content keys, not mtime; cache in
   `.docforge/cache/`; target < 1 s on a 500-page site).

## Open decisions and risks
- No test suite and no `test` script in `package.json`: decide with the user how M2 is verified
  (the < 1 s target needs a benchmark on a ~500-page fixture).
- No git remote: all 12 commits exist only locally.
- `STATE.md` / `LOG.md` are kept out of git (listed in `.git/info/exclude`): never commit them.

## Pointers
- Caching sketch: `docs/caching.md` · Code: `src/{cli,markdown,nav,links,theme}/`
- Windows path fix lives in `src/links/normalize.js` (reuse it for any new link/URL generation).
- Verify: none yet (no tests).
- Suggested skills: `commit-checkpoint` for each commit; `handoff` at the end of M2 steps.
