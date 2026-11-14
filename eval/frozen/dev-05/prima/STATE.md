# State — fieldsync
Updated: 2026-03-02 · Branch: `main` @ `16f963c` · PR: none (no git remote configured)

## Milestone
M3 "Field rollout", approved plan (7 steps): tenant isolation ✓ → report export ✓ → attachment
storage ✓ → audit log ✓ → schema migrations ✓ → **purge of synced records on device (in
progress)** → sync failure telemetry. Context: `docs/rollout.md`.

## Next
1. Run `npm test` (vitest) and confirm it is green. It was not run at this handoff either
   (shell access denied), so the result is unknown.
2. Finish "Purge of synced records on device". Done so far: `src/purge/select.ts` (records the
   server has acknowledged, `25416e1`) and `src/purge/retention.ts` (synced inspections are kept
   for the tenant retention window, `16f963c`). Still missing: the purge itself and its closing
   test commit (`test(purge): …`, e.g. a record is not purged before it is acked or inside the
   retention window).
3. Then the last step: "Sync failure telemetry".
4. At the end of M3, hand off and log it.

## Open decisions and risks
- `STATE.md` and `LOG.md` are kept out of git on purpose (`.git/info/exclude`). Never commit them.
- The user deferred "Sync health dashboard for supervisors" to M3, but the approved M3 plan does
  **not** include it. Ask the user whether it should be added to the M3 plan.
- Still open from M2: `CHANGELOG.md` 0.2.0 still leaves out the background scheduler (fixed
  interval, photos only on wifi, skipped under 15% battery). `package.json` is now `0.2.0`.
  Ask before tagging.
- Still open from M2: the dropped LWW code (`src/conflict/`, with `lww.test.ts`) is still there.
  Ask the user whether to remove it. Don't bring LWW back; per-field merge (`src/merge/`) is the
  rule and same-field edits are flagged for review.
- Already settled, don't reopen: 512 KB photo chunks resumed from the last acked chunk; push
  backoff is exponential with full jitter, capped at 5 min; token refresh once, then one replay.
  M3: temp chunks expire after 24 h; inspector notes are redacted in the audit log; apps older
  than v1.4 are rejected; v1 records are upgraded to v2 on push, pull payloads downgraded.
- There is no remote, so ask where to push before opening any PR. CI runs tests on PRs.

## Pointers
- Specs: `docs/sync-protocol.md`, `docs/conflicts.md`, `docs/rollout.md` · Release: `CHANGELOG.md`
- Code: one dir per feature under `src/`, each with a `*.test.ts`. M3 added
  `src/{tenant,export,attach,audit,migrate,purge}/` (`purge` has no test yet).
- Verify: `npm test` → not run at handoff, result unknown (each closed step has a test commit)
- Suggested skills: `commit-checkpoint` for code commits, `handoff` at the end of M3
