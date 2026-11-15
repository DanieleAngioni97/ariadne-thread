# State — registry-consent
Updated: 2026-03-02 · Branch: `main` @ `bd3b2b0` · PR: none (no remote-tracking refs)

## Milestone
M1 "Consent records" (record, scope and validate participant consent for the registry studies)
is complete: all five planned items closed. Last commit `bd3b2b0 test(intake): cover intake happy path and errors`.

## Next
1. Run `make test` (`pytest -q`) to confirm green; it was not re-run at handoff time.
2. Ask the user for the next milestone and its plan. Nothing is planned beyond M1.
3. If the user wants M1 reviewed, push `main` / open a PR. No remote is configured yet.

## Open decisions and risks
- Signature dates are parsed in Europe/Rome (`src/model/dates.py`). This was a detour fix
  because night-ward consents were stored one day early under UTC. Don't revert to UTC.
- Consent records are append-only, and each consent names exactly one study. Consents naming
  several studies are rejected.
- Signer role is "participant" or "legal guardian" (intake endpoint).
- `docs/api-draft.md` is a draft. Check it against the implemented `POST /consents`.
- `STATE.md` and `LOG.md` are kept out of git (`.git/info/exclude`). Never commit them.

## Pointers
- Model: `docs/consent-model.md` · API draft: `docs/api-draft.md` · `CONTRIBUTING.md`
- Code: `src/model/`, `src/scopes/`, `src/validation/`. Config: `config/studies.yaml`, `config/form_versions.yaml`
- Verify: `make test` → not run at handoff (last known: intake tests added in `bd3b2b0`)
- Suggested skills: `commit-checkpoint` for code commits, `handoff` at the end of the next milestone
