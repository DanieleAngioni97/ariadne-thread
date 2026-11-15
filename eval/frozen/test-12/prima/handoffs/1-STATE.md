# State — coop-billing
Updated: 2026-11-15 · Branch: `main` (last commit `fdae5fe`) · PR: none

## Milestone
M1 "Meter readings and tariffs" — complete. Readings are imported from CSV (incl. the
semicolon export of the new meters), validated, gap-filled by estimation; tariffs live in
SQLite; consumption is priced per hour band, plus a fixed monthly fee per contracted kW and a
monthly consumption summary per member.

## Next
1. Run `pytest` and confirm green: it was not run at handoff time (no shell access).
2. Check whether `main` is pushed (`git log origin/main..main`) and that CI passed.
3. Ask the user for the next milestone (likely member invoices, see `docs/billing-rules.md`)
   and get its plan approved before starting.

## Open decisions and risks
- Tariffs: the YAML plan was dropped for SQLite by the user. `src/tariffs/yaml_loader.py` and
  `tests/tariffs/test_yaml_loader.py` remain, used only by `migrate_yaml.py`; ask before removing.
- Timestamps are stored in UTC since the DST fix (`6252d82`): DST days have 46/50 half-hour
  slots. Any new code that groups by day/hour must convert to local time explicitly.
- `pricing/summary.py` and `fixed_fee.py` have no dedicated tests (only `test_bands.py` covers pricing).
- `STATE.md` and `LOG.md` must stay out of git (user's choice): never commit them. They are not
  yet in `.gitignore` / `.git/info/exclude`.

## Pointers
- Rules: `docs/billing-rules.md` · Tariff storage: `docs/tariffs.md` · Terms: `docs/glossary.md`
- Code: `src/readings/`, `src/tariffs/`, `src/pricing/` · Tests: `tests/`
- Verify: `pytest` → not run this session
- Suggested skills: `commit-checkpoint` for each commit; `handoff` at the end of the next milestone.
