# State — registry-consent
Updated: 2026-03-02 · Branch: `main` @ `4e7ef72` · PR: none (no remote configured)

## Milestone
M3 "Researcher access" (researchers request registry data and receive only participants whose
consent covers their study) is complete. Closed: access request intake, scope validation,
consent filter in application code, MRN masking in request logs (detour), access decisions export.

## Next
1. Run `make test` (`pytest -q`) to confirm green. It was not run at handoff (no shell access).
2. With the user: delete the dead SQL-view filter (`src/filter_sql/`) and fix the stale
   `docs/performance.md` (it describes the dropped view). See risks.
3. With the user: delete the dead DB-audit code from M2 (`src/audit/writer.py`,
   `src/audit/migrations/001_audit.sql`). It was still pending from the last handoff.
4. Ask the user for the next milestone and its plan. Nothing is planned beyond M3.
5. If the user wants M1–M3 reviewed, add a remote, push `main` and open a PR.

## Open decisions and risks
- The user dropped "Consent filter as SQL view" (about 40 s per pull on staging) and replaced it
  with the in-code filter `src/filter_app/` (per-participant evaluation, batches of 500, cached
  study-scope lookups). `src/filter_sql/` (view.sql, query.py) is not imported anywhere.
  Don't revive the view.
- `src/filter_sql/query.py` selects `participant_mrn`. MRNs must never reach logs: the DPO
  flagged a breach risk, and the fix is `src/logging_mask/mask.py`. Keep masking on any new
  logging.
- Access requests store the requester's ethics approval number. They may only name approved
  studies (`src/validation/request_scope.py`, `src/access/approval.py`).
- Withdrawn participants are excluded from data pulls (`tests/test_filter_app.py`).
- Unplanned commits this milestone: ruff config, Dockerfile, and fastapi bumped to 0.115.
- Carried over: PyYAML is pinned to 6.0.2 because of a security advisory. Don't unpin it.
  Signature dates are parsed in Europe/Rome. Don't revert to UTC. Audit events go to the hash
  chain (`src/auditchain/`), not to a DB table.
- `docs/api-draft.md` is only a stub pointing to `docs/api.md`. It could be deleted.
- `STATE.md` and `LOG.md` are kept out of git (`.git/info/exclude`). Never commit them.

## Pointers
- Docs: `docs/api.md`, `docs/consent-model.md`, `docs/performance.md` (stale), `CONTRIBUTING.md`
- Code: `src/access/`, `src/validation/request_scope.py`, `src/filter_app/`, `src/logging_mask/`, `src/export_access/`
- Tests: `tests/test_access_request.py`, `test_request_scope.py`, `test_filter_app.py`, `test_export_access.py`
- Verify: `make test` → not run at handoff (last known: `test(export): access decisions header` in `09ab20f`)
- Suggested skills: `commit-checkpoint` for code commits, `handoff` at the end of the next milestone
