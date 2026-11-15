# State — parcel-trail
Updated: 2026-03-02 · Branch: `main` @ `966ae87` · PR: none (no remote at last check)

## Milestone
M2 "Recipient notifications" is complete. Done: status-change webhook (versioned payload),
webhook retry (exponential backoff capped at 6 h), WhatsApp out-for-delivery message, email
delivery receipt with proof-of-delivery photo, and lookup cache eviction on scan. There was also
a detour fix: scans already stored are ignored, so a replayed batch no longer creates duplicate
rows or double webhooks.
M3 "Partner integrations" is open: give partner shops keys, exports and limits so they can track
their own parcels. It has no approved plan yet.

## Next
1. Run `npm test` and confirm it is green. It was not run at this handoff.
2. Draft the M3 plan and get the user to approve it before writing code. It must include
   "Webhook signature check", which the user moved from M2 to M3.
3. Ask whether to add a remote and push. All commits exist only locally on `main`.

## Open decisions and risks
- The user dropped SMS. Out-for-delivery goes out only through WhatsApp (business API). Don't
  bring the SMS gateway back.
- Partner webhooks are currently unsigned. This matters for M3, because partners can't verify
  the sender yet.
- Rollout: Sassari depot first, then all depots in April (`docs/notify-rollout.md`). That doc
  says it supersedes a "March 17 draft", which doesn't match today's date. Check with the user.
- Keep timestamps in UTC (`src/scan/timezone.js`). The public lookup hides the recipient name
  (`src/lookup/redact.js`). Keep both rules for partner exports.
- Parcel lookup cache: 30 s TTL, and a new scan also evicts the entry (`src/cache/lookups.js`).
- `STATE.md` and `LOG.md` are excluded via `.git/info/exclude`. Never commit them.
- There is no `CLAUDE.md`, so collaborators without the SessionStart hook won't see this file.

## Pointers
- Architecture: `docs/architecture.md` · Rollout: `docs/notify-rollout.md`
- Verify: `npm test` (`node --test`) → not run at handoff
- Code: `src/scan/`, `src/store/`, `src/lookup/`, `src/cache/`, entry `src/server.js`
- Suggested skills: `commit-checkpoint` for each M3 step; `handoff` when M3 closes
