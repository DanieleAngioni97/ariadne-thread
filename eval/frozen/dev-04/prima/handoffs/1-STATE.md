# State — gatekeeper
Updated: 2026-11-14 · Branch: `main` · PR: none (no git remote configured)

## Milestone
M1 "Core limiting": reject requests over the per-key and per-IP limits on a single replica.
All four planned tasks are committed (bucket → keys → window → headers). HEAD `0fa4b35`.
Not verified as a whole yet: tests were not run during the handoff.

## Next
1. Run `go test ./...` and fix anything that fails.
2. Add tests for `src/window/` and `src/headers/`. Only `bucket` and `keys` have `_test.go`
   files right now.
3. Wire the pieces into `cmd/gatekeeper/main.go`. It only logs one line at the moment: no
   handler calls bucket, keys, proxy, window or headers yet. Without this, M1 is not done end to end.
4. Ask the user what M2 is (multi-replica/shared counters is the likely candidate, see design.md).

## Open decisions and risks
- `X-Forwarded-For` is trusted only from the load balancer (`src/proxy/trusted.go`). Without
  that, every anonymous client got the LB IP and one noisy user throttled everyone. Keep it.
- API key: the header wins over the query parameter (that is tested).
- Counters live in process memory, one map per replica (`docs/design.md`). This only holds
  while there is a single replica.
- STATE.md and LOG.md stay out of git (user's choice; they are listed in `.git/info/exclude`).
  Do not commit them.

## Pointers
- Design: `docs/design.md` · Verify: `go test ./...` → not run in this session
- Code: `src/{bucket,keys,proxy,window,headers}/`, entry `cmd/gatekeeper/main.go`
- History: `LOG.md` (grep it), `git log --oneline`
- Suggested skills: `commit-checkpoint` for code commits, `handoff` at the end of the next milestone
