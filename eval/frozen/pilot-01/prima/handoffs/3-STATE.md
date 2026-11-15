# State — roomshare-booking
Updated: 2026-03-02 · Branch: `main` · Last commit: `5b6f017` · PR: none

## Milestone
M3 "Notifications" in progress. Approved plan (after the user's revision):
1. Email via provider HTTP API — done (`src/mail/provider.js`, `templates.js`; replaced SMTP relay)
2. Reminder email before a booking (carried over from M2) — done (`src/reminders/`)
3. Cancellation email to attendees — done (`src/cancellations/`, `DELETE /bookings/:id`)
4. Daily digest email for site managers — in progress: collect, render and closed-day skip
   committed (`src/digest/`), no tests and no sending/scheduling yet
5. Email preferences per member — not started

## Next
1. Run `npm test` and record the result. Not run at this handoff: the shell was unavailable.
2. Finish the digest: tests for `src/digest/` (collect, render, closed days), then send it
   through `src/mail/provider.js` on a daily schedule. Close the step with a test commit.
3. Start "Email preferences per member"; reminders, cancellations and digest must respect them.
4. Then propose the M3 handoff.

## Open decisions and risks
- SMTP relay was dropped by the user, but leftovers remain: `src/mail/smtp.js` (unused, imports
  `nodemailer`, absent from `package.json`) and `docs/email.md` still documents `SMTP_*`.
  Update the doc to `MAIL_API_URL` / `MAIL_API_KEY`; ask the user before deleting `smtp.js`.
- DST: expand occurrences in the site zone, then convert to UTC (`src/recurrence/dst.js`).
  Emails schedule from UTC but render times in the site zone (digest "tomorrow" too).
- No tests seen for `src/availability/sites.js`, `site-hours.js`, `filters.js`, `src/api/availability.js`.
- From M1: `src/store/sqlite.js`, `bookings-sqlite.js` remain though Postgres was chosen
  (`docs/storage.md`); they import `better-sqlite3`, not in `package.json`. Ask before deleting.
- `npm start` runs `src/server.js`, which does not exist; the routers in `src/api/` are not wired.
- Postgres tests (`src/store/bookings-pg.test.js`) need a test database (`DATABASE_URL`).
- `STATE.md` and `LOG.md` are kept out of git (`.git/info/exclude`) at the user's request. Never commit them.

## Pointers
- Docs: `docs/email.md` (stale), `docs/storage.md`, `docs/timezones.md`
- Verify: `npm test` (vitest; CI on push in `.github/workflows/test.yml`) → not run at this handoff
- Code: `src/mail/`, `src/reminders/`, `src/cancellations/`, `src/digest/`, `src/store/*-pg.js`
- Suggested skills: `commit-checkpoint` for each commit; `handoff` at the end of M3
