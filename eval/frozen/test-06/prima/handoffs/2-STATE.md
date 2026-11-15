# State — scootlink-gateway
Updated: 2026-03-02 · Branch: `main` (head `7c985f5`) · PR: none (no git remote configured)

## Milestone
M2 Fleet alerts — every remaining step is closed: low battery (15%, hysteresis) → tamper
(accelerometer, 0.3 g, movement while locked) → geofence with H3 cells (res 10) → geofence
polygon cache (ETag) → alert dedup (scooter+rule, 30 min) → webhooks (HMAC-SHA256, backoff).
Detour "Renew broker TLS certificate" also closed (hot reload + 14-day expiry warning).
Next milestone: M4 Firmware rollout — stage OTA firmware updates across the fleet.

## Next
1. Run `npm run lint && npm test && npm run build` (not run at handoff: shell was unavailable)
   and fix whatever fails.
2. Plan M4 with the user. It inherits "Cache for firmware manifests", already started:
   `src/fwcache/fetch.ts` (commit `7c985f5`, fetch per model); cache/expiry not done yet.
3. Ask whether to delete leftovers of dropped steps, nothing should import them:
   `src/geofence/bbox.ts` + `test/geofence/bbox.test.ts` (M2), `src/store/pg/` (M1).
4. Still no entrypoint wiring mqtt → clock → validate → registry → store → alerts → webhook;
   ask which milestone owns it.
5. Test gaps: tamper, H3 check, geocache, webhook sign/retry, TLS reload (only battery, dedup,
   GPS and bbox have tests).

## Open decisions and risks
- Geofence: bounding boxes were dropped for H3 cells (concave zones → 12% false exits,
  `docs/geofence.md`). Don't revive bbox.
- M2 plan was replaced mid-way; "Cache for firmware manifests" moved from M2 to M4 by the user.
- Partner registry API limit 60 req/min; keep the registry cache (`docs/decisions.md`).
- `STATE.md` and `LOG.md` are git-excluded (`.git/info/exclude`): never commit them.

## Pointers
- Docs: `docs/alerts.md` (ops runbook) · `docs/webhooks.md` (signature header) ·
  `docs/geofence.md` · `docs/frames.md` (firmware 4 format) · `docs/storage.md`
- Local setup: `docker compose up -d` (TimescaleDB + broker) · Verify: `npm test` → not run
- Suggested skills: `commit-checkpoint` for each commit; `handoff` at the next milestone.
