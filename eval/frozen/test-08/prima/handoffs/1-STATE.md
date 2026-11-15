# State — migralint
Updated: 2026-03-02 · Branch: `main` · PR: none (no git remote configured)

## Milestone
M1 Plugin loading: load third-party rule plugins listed in the config and run their rules
against migrations. All planned items are committed on `main` (last: `0937c3c`); M1 still needs
wiring and test coverage before it can be called done end-to-end.

## Next
1. Decide with the user what to do with `src/sandbox/vm.ts`: the vm-contexts approach was dropped
   for worker threads (see `docs/sandbox.md`), but the file is still in the tree.
2. `src/cli.ts` imports `./lint.js`, but `src/lint.ts` does not exist: wire config → loaders
   (`src/loader/*`) → worker sandbox (`src/sandbox/worker.ts`) → error table (`src/loader/errors.ts`).
3. Add tests: only `tests/loader/local.test.ts` exists; npm loader, sandbox (incl. 2s
   termination) and error reporting have none. Add a `test` script to `package.json` (vitest 2.0.5).

## Open decisions and risks
- Sandbox = worker threads, rules terminated after 2s. Settled by the user; do not revisit vm contexts.
- SQL fixtures are forced to LF via `.gitattributes` (Windows CI broke on CRLF); keep it that way
  for new fixtures.
- `STATE.md` and `LOG.md` are kept out of git (listed in `.git/info/exclude`): never commit them.

## Pointers
- Design: `docs/design.md` · Sandbox decision: `docs/sandbox.md`
- Plan of M1 (completed): manifest format → local loader → npm loader (`migralint-plugin-*`,
  manifest in the `migralint` field of `package.json`) → worker sandbox → loader error reporting.
- Verify: `npx vitest run` → not run in this handoff (no shell access); run it first.
- Suggested skills: `commit-checkpoint` for each commit; `handoff` at the next milestone.
