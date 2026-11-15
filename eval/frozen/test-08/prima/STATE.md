# State — migralint
Updated: 2026-03-02 · Branch: `main` · PR: none (no git remote configured) · Last commit: `fdf6e7d`

## Milestone
M3 Plugin distribution. The user approved this plan: Plugin lockfile format → Plugin lockfile
writer → Publish command for plugins. "Plugin lockfile format" is done (`src/pluginlock/`). "Plugin
lockfile writer" is in progress (`src/lockwriter/`): writing, sorting and sha512 integrity are
committed but not yet wired together.

## Next
1. Finish "Plugin lockfile writer". `writeLock` (`src/lockwriter/write.ts`) neither calls
   `sortEntries` (`sort.ts`) nor `integrityOf` (`integrity.ts`). Compose them (resolve → integrity
   → sort → write), then add tests under `tests/lockwriter/`, which has no tests yet. Check
   round-trip with `src/pluginlock/parse.ts`.
2. Start "Publish command for plugins".
3. Carried over from M2 and still open: ask whether to delete the dead `src/cache/invalidate.ts`
   (mtime wipe, contradicts `docs/cache.md`) and `src/sandbox/vm.ts` (M1 leftover). The CLI is
   still broken: `src/cli.ts` imports `./lint.js` and `src/lint.ts` does not exist.

## Open decisions and risks
- "Plugin registry lookup" was deferred from M2 to M3, but it is not in the approved M3 plan. Ask
  the user whether it is dropped or comes after the publish command.
- Version mismatch: `package.json` says `0.3.0`, but the CHANGELOG's latest entry is 0.2.0. Check
  this with the user before any release.
- Settled, don't revisit: the cache is invalidated by the config hash in the keys, not by an mtime
  wipe. Sandbox = worker threads, with rules terminated after 2s.
- Missing tests: lockwriter, npm loader, sandbox, error reporting, AST parse cache. There is no
  `test` script in `package.json`.
- SQL fixtures are forced to LF via `.gitattributes`. Keep it that way.
- `STATE.md` and `LOG.md` are kept out of git (listed in `.git/info/exclude`). Never commit them.

## Pointers
- Design: `docs/design.md` · Sandbox: `docs/sandbox.md` · Cache: `docs/cache.md`
- Verify: `npx vitest run` → not run in this handoff (no shell access), so run it first.
- Suggested skills: `commit-checkpoint` for each commit, `handoff` at the end of the writer item.
