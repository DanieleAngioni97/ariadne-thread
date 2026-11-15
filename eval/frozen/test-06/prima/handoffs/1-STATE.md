# State — scootlink-gateway
Updated: 2026-03-02 · Branch: `main` (head `70ce09c`) · PR: none (no git remote configured)

## Milestone
M1 Ingest pipeline — every planned step is closed: MQTT listener (CBOR) → battery validation →
GPS validation → registry cache (10 min) → storage in TimescaleDB (hypertable, 1-day chunks,
COPY writes, compression after 7 days). Detour "Fix clock skew in frame timestamps" also closed.

## Next
1. Run `npm run lint && npm test && npm run build` (not run at handoff: shell was unavailable)
   and fix whatever fails.
2. Ask the user whether to delete `src/store/pg/` (schema.sql, insert.ts): leftovers of the
   dropped "Store frames in PostgreSQL" step, nothing imports them.
3. There is no entrypoint (`src/index.ts` or similar) wiring mqtt → clock → validate → registry
   → store: confirm with the user whether that belongs to M1 or to the next milestone.
4. Tests cover only GPS (`test/validate/gps.test.ts`): propose tests for battery range, clock
   fallback, registry cache TTL, Timescale COPY.
5. Ask the user for the next milestone and a remote, if M1 should be pushed / opened as a PR.

## Open decisions and risks
- Storage plan changed in chat: "Store frames in PostgreSQL" was dropped and replaced by
  "Store frames in TimescaleDB" (reason: write volume, see `docs/storage.md`). Don't revive pg.
- Clock skew rule: device timestamps before 2020 → use broker receive time (`src/clock/`).
- Partner registry API limit is 60 req/min; keep the cache (`docs/decisions.md`).
- `STATE.md` and `LOG.md` are git-excluded (`.git/info/exclude`): never commit them.

## Pointers
- Frame format: `docs/frames.md` · Decisions: `docs/decisions.md` · Storage: `docs/storage.md`
- Local setup: `docker compose up -d` (TimescaleDB + broker) · Verify: `npm test` → not run
- Suggested skills: `commit-checkpoint` for each commit; `handoff` at the next milestone.
