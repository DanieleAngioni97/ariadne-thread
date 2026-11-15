# State — registry-consent
Updated: 2026-03-02 · Branch: `main` @ `8eb3132` · PR: none (no remote configured)

## Milestone
M2 "Withdrawal and audit" (participants can withdraw consent, and every change leaves an auditable
trail) is complete. All planned items are closed: withdrawal endpoint, hash-chained audit log,
consent-record CSV export, withdrawal-event feed, signed audit-trail export. Last commit `8eb3132`.

## Next
1. Run `make test` (`pytest -q`) to confirm green. It was not re-run at handoff time.
2. Decide with the user whether to delete the dead DB-audit code (see risks), then do it.
3. Ask the user for the next milestone and its plan. Nothing is planned beyond M2.
4. If the user wants M1+M2 reviewed, add a remote, push `main` and open a PR.

## Open decisions and risks
- The user dropped "audit log in a database table" for a hash-chained file. Leftovers are still
  in the tree and unused: `src/audit/writer.py`, `src/audit/migrations/001_audit.sql`. Nothing
  imports them, and intake no longer writes audit rows. Don't revive the DB-table approach.
- Audit events (intake, withdrawal) go to the chain via `src/auditchain/hooks.py`. The chain is
  verified at startup (`src/auditchain/verify.py`).
- On withdrawal, linked biosamples are flagged for destruction and a reason code is recorded.
  The withdrawn consent stays readable, not deleted.
- The withdrawal feed runs daily at 02:00 (`src/export_withdrawals/schedule.py`). The audit
  export is signed with the registry key (`src/export_audit/sign.py`).
- PyYAML is pinned to 6.0.2 because of a security advisory that broke the CI audit job. Don't unpin it.
- `docs/api-draft.md` is now only a stub pointing to `docs/api.md` (v1 reference). It could be deleted.
- From M1: signature dates are parsed in Europe/Rome. Don't revert to UTC.
- `STATE.md` and `LOG.md` are kept out of git (`.git/info/exclude`). Never commit them.

## Pointers
- Docs: `docs/api.md` (v1), `docs/consent-model.md`, `CONTRIBUTING.md`
- Code: `src/withdrawal/`, `src/auditchain/`, `src/export_records/`, `src/export_withdrawals/`, `src/export_audit/`
- CI: `.github/workflows/ci.yml` runs tests on every push. Pre-commit: `.pre-commit-config.yaml`
- Verify: `make test` → not run at handoff (last known: `test(export): exported trail verifies` in `8eb3132`)
- Suggested skills: `commit-checkpoint` for code commits, `handoff` at the end of the next milestone
