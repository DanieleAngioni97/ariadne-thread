# State — parcel-trail
Updated: 2026-03-02 · Branch: `main` @ `135f721` · PR: none (no git remote configured)

## Milestone
M1 "Tracking core" is complete: depot scan batches are ingested and recipients can look up
a parcel by tracking code. All five planned steps are closed (scan ingestion → status store →
public lookup → lookup cache → depot list cache), plus a detour fix for scan timezones.

## Next
1. Run `npm test` and confirm it is green. The suite was not run at handoff.
2. Ask the user what M2 is and get its plan approved before writing code.
3. Ask whether to add a remote and push. Every commit exists only locally on `main`.

## Open decisions and risks
- Scanners send local depot time. `src/scan/timezone.js` converts it to UTC; keep any new
  timestamp handling in UTC.
- The public lookup hides the recipient name (`src/lookup/redact.js`). Keep that for any new
  public fields.
- Caches: parcel lookups have a 30 s TTL (`src/cache/lookups.js`). The depot list loads at boot
  and refreshes nightly (`src/cache/depots.js`).
- `STATE.md` and `LOG.md` are kept out of git through `.git/info/exclude`. Don't commit them.
- There is no `CLAUDE.md`, so collaborators without the SessionStart hook won't see this file.

## Pointers
- Architecture: `docs/architecture.md` (CSV batches replayed whole, SQLite storage)
- Verify: `npm test` (`node --test`) → not run at handoff
- Code: `src/scan/`, `src/store/`, `src/lookup/`, `src/cache/`, entry `src/server.js`
- Suggested skills: `commit-checkpoint` for each step of M2; `handoff` when M2 closes
