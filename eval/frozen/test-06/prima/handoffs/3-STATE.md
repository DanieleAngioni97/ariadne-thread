# State — scootlink-gateway
Updated: 2026-03-02 · Branch: `main` (head `cc76745`) · PR: none (no git remote configured)

## Milestone
M3 Operator API — operators query scooter status and send remote commands over HTTP (fastify 5.2.1).
Plan approved by the user (chat only, no doc): Operator auth with API keys ✅ → Scooter status
endpoint 🟡 → Remote lock command → Validation of operator commands.
- Auth closed: key generation + hashing, `X-Api-Key` check, per-city scopes (`src/auth/`).
- Status in progress: route `GET /scooters/:id/status`, last frame from the hypertable, 404 for
  unknown scooter, response with battery + position (`src/status/`). Not yet declared closed.

## Next
1. Run `npm run lint && npm test && npm run build` (not run at handoff: shell was unavailable)
   and fix whatever fails.
2. Finish "Scooter status endpoint": check the route enforces auth + city scope (no commit says
   so), then close the step. `src/status/route.test.ts` sits in `src/`, others in `test/` —
   ask whether to move it (tsc/eslint also pick it up there).
3. Start "Remote lock command", then "Validation of operator commands".
4. Carried over from M2, still to ask the user:
   - delete leftovers of dropped steps: `src/geofence/bbox.ts` + `test/geofence/bbox.test.ts`,
     `src/store/pg/` (nothing should import them);
   - no entrypoint wiring mqtt → clock → validate → registry → store → alerts → webhook (and
     now the HTTP server): which milestone owns it;
   - test gaps: tamper, H3 check, geocache, webhook sign/retry, TLS reload.

## Open decisions and risks
- Milestone order: user chose M3 Operator API now; M4 Firmware rollout comes later and inherits
  "Cache for firmware manifests" (`src/fwcache/fetch.ts`, fetch per model; cache/expiry not done).
- Geofence uses H3 cells; bbox was dropped (`docs/geofence.md`). Don't revive bbox.
- Partner registry API limit 60 req/min; keep the registry cache (`docs/decisions.md`).
- `STATE.md` and `LOG.md` are git-excluded (`.git/info/exclude`): never commit them.

## Pointers
- Docs: `docs/alerts.md` · `docs/webhooks.md` · `docs/geofence.md` · `docs/frames.md` ·
  `docs/storage.md` · `docs/decisions.md` (no M3 doc yet)
- Local setup: `docker compose up -d` (TimescaleDB + broker) · Verify: `npm test` → not run
- Suggested skills: `commit-checkpoint` for each commit; `handoff` when M3 closes.
