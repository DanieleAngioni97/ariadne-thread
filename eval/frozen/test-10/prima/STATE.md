# State — prima (registry-consent service)
Updated: 2026-03-02 · Branch: `main` @ `fb283f9` · PR: none (no git remote configured)

## Milestone
M4 Re-consent campaigns: ask participants to consent again when the form version they signed
is retired. Approved plan: Re-consent recipient list → Re-consent letter templates →
~~Re-consent portal page~~ (moved to M5) → Re-consent reminder schedule.
- Re-consent recipient list: done (`src/recipients/`, `tests/test_recipients.py`, `ed77a87`).
- Re-consent letter templates: code is done, not yet closed because nothing tests it.
  `src/letters/`: IT + EN templates, render, brace escaping, language-based choice.
- Re-consent reminder schedule: not started.

## Next
1. Add `tests/test_letters.py`: render with participant/study names, brace escaping
   (`escape.py`), template choice (`choose.py`: `it` → IT, anything else → EN).
   Commit as `test(letters): …` to close "Re-consent letter templates".
2. Start "Re-consent reminder schedule". Use `src/export_withdrawals/schedule.py` as the
   example of a scheduled job.
3. When M4 is done, start M5 (see below).

## Open decisions and risks
- M5 Participant portal (new milestone, not planned yet): a web page where participants can
  see and change their consents. "Re-consent portal page" was moved from M4 into M5 at the
  user's request. Plan M5 with the user before you code.
- `choose.py` sends every language other than `it` to the EN template, and a missing
  language does the same. Ask the user if that is intended.
- No `CLAUDE.md` in the repo. STATE.md/LOG.md stay out of git (user's choice, set in
  `.git/info/exclude`): do not commit them.

## Pointers
- Domain: `docs/consent-model.md` · API: `docs/api.md` · Changelog: `CHANGELOG.md` (0.3.0)
- Verify: `make test` (`pytest -q`). Not run at this handoff (shell was unavailable), so
  run it first.
- Suggested skills: `commit-checkpoint` for each commit, `handoff` at the end of M4.
