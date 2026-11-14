# State — fieldsync
Updated: 2026-03-02 · Branch: `main` @ `efa59ec` · PR: none (no git remote configured)

## Milestone
M1 "Sync core" is done: devices push and pull inspection records through a server that
tolerates intermittent connectivity. All six steps of the approved plan are closed:
schema → device registration → device outbox → push endpoint → delta cursor → pull endpoint.

## Next
1. Run `npm test` (vitest) and confirm it is green. The tests were not re-run at handoff
   because shell access was denied in that session.
2. Ask the user for the next milestone (M2) and its plan; nothing is planned past M1 yet.
3. If the user wants the work published: no remote exists, so ask where to push before
   opening a PR.

## Open decisions and risks
- `STATE.md` and `LOG.md` are kept out of git on purpose (`.git/info/exclude`). Never commit them.
- Detour already fixed: double-tap Submit created duplicate inspections. Push now dedupes on the
  client id (`src/dedupe/`). Don't re-open it.
- Limits already in place: push body capped at 2 MB, oversized batches get split, and large pull
  deltas are gzipped.
- `lodash` is a dependency, but nothing in this session used it. Check whether it's needed.

## Pointers
- Spec: `docs/sync-protocol.md` (Push, Pull, Cursor choice) · Dev setup: `README.md`
- Code: `src/{schema,devices,outbox,dedupe,push,cursor,pull}/`, each with a `*.test.ts`
- Verify: `npm test` → not run at handoff, so the result is unknown (each step was closed by a test commit)
- Suggested skills: `commit-checkpoint` for code commits, `handoff` at the end of M2 steps
