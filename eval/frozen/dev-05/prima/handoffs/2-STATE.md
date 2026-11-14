# State — fieldsync
Updated: 2026-03-02 · Branch: `main` @ `9468101` · PR: none (no git remote configured)

## Milestone
M2 "Offline resilience" is done. Sync now survives dead zones, large photos and two inspectors
editing the same form. Closed: photo retry queue → push backoff → background scheduler →
per-field merge (replaced LWW) → expired-token retry. Changelog for 0.2.0 is written.
M3 "Field rollout" is opened but not planned. Goal: the service is ready for a multi-tenant field
rollout with attachment storage, migrations for old app versions and on-device cleanup.

## Next
1. Run `npm test` (vitest) and confirm it is green. It was not run at handoff because shell
   access was denied in that session.
2. Tidy up 0.2.0: `package.json` still says `0.1.0`, and `CHANGELOG.md` 0.2.0 leaves out the
   background scheduler (fixed interval, photos only on wifi, skipped under 15% battery).
   Ask the user before bumping the version or tagging.
3. Ask the user whether to remove the dropped last-write-wins code (`src/conflict/`, including
   `lww.test.ts`). Per-field merge in `src/merge/` replaced it, and `docs/conflicts.md` already
   describes per-field merge.
4. Propose a step plan for M3 and get it approved before coding. It must include the deferred
   "Sync health dashboard for supervisors", plus multi-tenancy, attachment storage,
   migrations for old app versions and on-device cleanup.

## Open decisions and risks
- `STATE.md` and `LOG.md` are kept out of git on purpose (`.git/info/exclude`). Never commit them.
- The user dropped LWW conflict resolution for per-field merge. Don't bring LWW back.
  Same-field edits are flagged for review, not auto-resolved.
- Already settled, don't reopen: photos upload in 512 KB chunks and resume from the last acked
  chunk. Push backoff is exponential with full jitter, capped at 5 min. Token refresh is tried
  once and the pending push is then replayed once.
- `lodash` was removed (`db3cf92`), so that M1 question is closed.
- There is no remote, so ask where to push before opening any PR. CI runs tests on PRs.

## Pointers
- Specs: `docs/sync-protocol.md`, `docs/conflicts.md` (per-field merge) · Release: `CHANGELOG.md`
- Code: `src/{schema,devices,outbox,dedupe,push,cursor,pull,photos,backoff,scheduler,merge,auth}/`,
  each with a `*.test.ts`. `src/conflict/` is the leftover LWW code.
- Verify: `npm test` → not run at handoff, result unknown (each step was closed by a test commit)
- Suggested skills: `commit-checkpoint` for code commits, `handoff` at the end of M3 steps
