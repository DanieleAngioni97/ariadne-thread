# State — parcel-trail
Updated: 2026-03-02 · Branch: `main` @ `127af20` · PR: none (no remote at last check; `gh` not run)

## Milestone
M3 "Partner integrations". This is the approved plan, as amended in chat:
Partner API keys ✅ → Streaming status export ✅ → Rate limits per partner key ⏳ → Usage report per partner key.
The approved plan dropped "Nightly CSV feed" and replaced it with "Streaming status export"
(`src/export/`, `GET /partners/export?cursor=`). There was also a detour fix: the courier website
origin is allowed on the lookup (`src/lookup/cors.js`).
Rate limits so far: a token bucket (`src/ratelimit/bucket.js`, 60 burst, 1/s) and a middleware that
returns 429 with `retry-after: 1` (`src/ratelimit/middleware.js`).

## Next
1. Run `npm test`. It was not run at this handoff because the shell was unavailable.
2. Finish "Rate limits per partner key":
   - The middleware reads `req.partner.id`, but nothing sets `req.partner` yet. Add or confirm the
     API-key auth step (`src/partners/keys.js`).
   - Mount the auth step and `rateLimit` on the partner routes. `src/server.js` mounts no routes yet.
   - Add `src/ratelimit/*.test.js`: the bucket refills, and the 61st burst request gets a 429.
   - Close the step with `commit-checkpoint`.
3. Start "Usage report per partner key", the last step of M3.

## Open decisions and risks
- "Webhook signature check" was moved from M2 to M3, but the approved M3 plan doesn't include it.
  Ask the user whether to add it. Partner webhooks are still unsigned.
- `src/feed/nightly.js` (commit "feat(feed): nightly CSV…") is still in the tree even though that
  step was dropped. Ask whether to delete it. `src/sms/send.js` is still there too, although the
  user dropped SMS earlier (WhatsApp only). Don't bring SMS back.
- The rate-limit buckets live in an in-process `Map`. They reset on restart and aren't shared
  across instances. Fine for now, unless the user says otherwise.
- Keep timestamps in UTC (`src/scan/timezone.js`). Hide the recipient name (`src/lookup/redact.js`).
  Both rules apply to partner exports and the usage report.
- Rollout doc `docs/notify-rollout.md` mentions a "March 17 draft" that doesn't fit the date. This
  is still unconfirmed with the user.
- All commits are local only. Ask whether to add a remote and push.
- `STATE.md` and `LOG.md` are excluded via `.git/info/exclude`. Never commit them.
- There is no `CLAUDE.md`, so collaborators without the SessionStart hook won't see this file.

## Pointers
- Architecture: `docs/architecture.md` · Rollout: `docs/notify-rollout.md`
- Verify: `npm test` (`node --test`) → not run at handoff
- M3 code: `src/partners/`, `src/export/`, `src/ratelimit/`, `src/lookup/cors.js`; entry `src/server.js`
- Suggested skills: `commit-checkpoint` for each M3 step; `handoff` when M3 closes
