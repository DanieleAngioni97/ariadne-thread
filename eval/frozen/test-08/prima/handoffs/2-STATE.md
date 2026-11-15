# State — migralint
Updated: 2026-03-02 · Branch: `main` · PR: none (no git remote configured) · Last commit: `d5cceff`

## Milestone
M2 Rule plugins is done: core rules ship as a plugin (`plugins/core/`), parsed ASTs and rule
results are cached in `.migralint/cache`, and result keys include the config hash. "Plugin registry
lookup" was deferred to M3. Next up: M3 Plugin distribution (teams publish plugins and pin their
versions outside the monorepo). M3 has no approved plan yet.

## Next
1. `src/cache/invalidate.ts` is dead code from the dropped "Cache invalidation on config change"
   item. It wipes the cache on an mtime change, which contradicts `docs/cache.md`. Ask the user
   whether to delete it, and ask the same about `src/sandbox/vm.ts`, which was left over from M1.
2. The CLI is still broken: `src/cli.ts` imports `./lint.js`, and `src/lint.ts` does not exist.
   Wire config → loaders (`src/loader/*`, `plugins/core`) → cache (`src/cache/*`) → worker
   pool (`src/sandbox/pool.ts`) → reporting (`src/report/load-failures.ts`).
3. Propose a plan for M3 and get the user's approval. It starts with "Plugin registry lookup",
   which moved here from M2.

## Open decisions and risks
- The cache is invalidated by the config hash in the keys, not by wiping the directory. The user
  settled this, so don't bring back the mtime wipe.
- Sandbox = worker threads, with rules terminated after 2s. The user settled this too, so don't
  revisit vm contexts.
- Missing tests: npm loader, sandbox (2s termination), error reporting and AST parse cache. There
  is no `test` script in `package.json` yet.
- `package.json` still says `0.1.0` while the CHANGELOG has a 0.2.0 entry. Check this with the
  user before any release.
- SQL fixtures are forced to LF via `.gitattributes`. Keep it that way for new fixtures.
- `STATE.md` and `LOG.md` are kept out of git (listed in `.git/info/exclude`). Never commit them.

## Pointers
- Design: `docs/design.md` · Sandbox: `docs/sandbox.md` · Cache: `docs/cache.md`
- Verify: `npx vitest run` → not run in this handoff (no shell access), so run it first.
- Suggested skills: `commit-checkpoint` for each commit, `handoff` at the end of the next milestone.
