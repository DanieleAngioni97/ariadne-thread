# State — docforge
Updated: 2026-03-02 · Branch: `main` @ `33d418d` (clean) · PR: none (no remote configured)

## Milestone
M2 "Fast rebuilds": incremental rebuilds, so editing one page refreshes the preview in < 1 s.
Approved plan: ✅ Cache for rendered pages → ✅ Cache for parsed front matter →
✅ Watch files with native fs events (it replaced the dropped "Watch files with polling") →
🔄 Cache invalidation on file change → ⏳ Incremental output writing.

## Next
1. Finish "Cache invalidation on file change". `src/cache/invalidate/on-change.js` deletes the
   entries of changed files. `src/cache/invalidate/deps.js` records include → pages but is still a
   WIP (TODO at line 9): make `invalidate()` expand changed includes into their dependent pages,
   call `record()` during the build, and wire `invalidate()` to the watcher (`src/watch/native.js`
   + `debounce.js`). Nothing calls `invalidate`/`record` yet. Commit as `feat(cache): …`, which
   replaces the `wip(cache)` commit 33d418d.
2. Then "Incremental output writing" (write only the changed pages to `_site/`).

## Open decisions and risks
- "Search index for pages" was deferred from M1 to M2, but it is missing from the approved M2
  plan. Ask the user whether it was dropped on purpose or should be added.
- `src/watch/native.js` requires `chokidar`, but `package.json` doesn't list it. Add it.
- CI (`.github/workflows/ci.yml`, `npm ci && npm test`) can't pass: there is no lockfile and
  no `test` script. We still have to decide with the user how to verify M2 (the < 1 s target
  needs a benchmark on a fixture of ~500 pages).
- `src/watch/poll.js` comes from the dropped polling step and nothing uses it. Ask before deleting.
- No git remote: all commits exist only locally.
- `STATE.md` / `LOG.md` are kept out of git (`.git/info/exclude`): never commit them.

## Pointers
- Design: `docs/caching.md` (SHA-1 content keys, not mtime; cache in `.docforge/cache/`),
  `docs/watching.md` · Code: `src/cache/{pages,front,invalidate}/`, `src/watch/`
- Windows path fix lives in `src/links/normalize.js` (reuse it for any new link/URL generation).
- Verify: none yet (no tests). The last session couldn't run Bash, so nothing was executed.
- Suggested skills: `commit-checkpoint` for each commit; `handoff` after each M2 step.
