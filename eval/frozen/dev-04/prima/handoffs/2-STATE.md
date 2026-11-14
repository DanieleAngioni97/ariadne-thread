# State — gatekeeper
Updated: 2026-11-14 · Branch: `main` (clean at `916cc5e`) · PR: none (no git remote configured)

## Milestone
M2 "Shared state": several replicas enforce the same limits from shared counters.
Done: Redis counters (Lua token bucket), policy cache (Postgres on miss), bucket-state cache
(local lease + renew). In progress: "Cache invalidation on policy update". Only the publisher
exists so far (`src/invalidation/pubsub.go`). Left after it: "Per-key rejection metrics".

## Next
1. Finish invalidation: subscribe to `invalidation.Channel` on every replica and evict the key
   from `policycache.Cache`. The cache has only `Get` today, so add a `Delete`/`Invalidate`.
   Also call `Publish` wherever policies get updated.
2. Remove `src/memcache/`. Memcached was dropped for Redis (`docs/storage.md`), and the package
   imports `gomemcache`, which is missing from `go.mod`, so `go build ./...` probably fails.
   Ask the user first if unsure.
3. Run `go vet ./... && go test ./...` (same as CI) and fix what fails.
4. Per-key rejection metrics, the last M2 task.
5. Then M3 "Operations" (operator tools to inspect/tune limits). It now includes "Admin
   dashboard for limits", which the user moved from M2. M3 has no approved plan yet: propose one.

## Open decisions and risks
- Redis over Memcached is settled: Memcached can't do atomic check-and-decrement, so don't retry it.
- Still open from M1: `cmd/gatekeeper/main.go` only logs one line. Nothing is wired end to end.
  `src/window/`, `src/headers/` and the M2 packages have no tests.
- `X-Forwarded-For` is trusted only from the LB (`src/proxy/trusted.go`). Keep it that way.
- STATE.md and LOG.md stay out of git (`.git/info/exclude`). Never commit them.

## Pointers
- Storage decision: `docs/storage.md` · Design: `docs/design.md` · CI: `.github/workflows/ci.yml`
- Verify: `go vet ./... && go test ./...` → not run (Bash was unavailable in the last session)
- Code: `src/{redis,policycache,bucketcache,invalidation}/` (M2), `src/{bucket,keys,proxy,window,headers}/` (M1)
- History: `LOG.md` (grep it), `git log --oneline`
- Suggested skills: `commit-checkpoint` for code commits, `handoff` when M2 closes
