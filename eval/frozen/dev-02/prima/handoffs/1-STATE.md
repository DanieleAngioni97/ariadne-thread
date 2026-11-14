# State — tally (tally-timesheet CLI)
Updated: 2026-03-02 · Branch: `main` @ `dee9ed1` · PR: none (no remote configured)

## Milestone
M1 Tracking core: record time entries reliably and print the reports a freelancer needs
before invoicing. Done: SQLite storage (`bcd3643`), weekly report from Monday (`a9dc6a3`),
midnight-split fix (`ee7aee5`). In progress: Report by project (`139137b`, not yet declared
closed). Left: CSV export of reports.
Next milestone: M2 Invoicing (turn tracked hours into per-client invoices); it now also
owns "Report by client", which the user deferred out of M1.

## Next
1. Finish "Report by project" (`src/report-project/project.js`): it sums raw `stop - start`
   and does not use `splitAtMidnight` (`src/time-split/midnight.js`), so a project total
   over a week range would repeat the midnight bug. Decide with the user whether to split
   first, then mark the step closed.
2. "CSV export of reports": last M1 step.
3. Close M1, then plan M2 Invoicing starting from "Report by client".

## Open decisions and risks
- Dropped: JSON file storage. Concurrent `tally start` lost an entry; see `docs/storage.md`.
  Don't go back to it.
- `docs/design.md` still says entries live in `~/.tally/entries.json`. That is stale,
  superseded by `docs/storage.md`; worth fixing.
- No test suite and no `test` script in `package.json`, so nothing has been verified by tests.
- STATE.md and LOG.md stay out of git (user's choice; listed in `.git/info/exclude`). Never commit them.

## Pointers
- Docs: `docs/design.md`, `docs/storage.md` · Code: `src/storage-sqlite/`, `src/report-week/`,
  `src/report-project/`, `src/time-split/` · CLI: `bin/tally.js`
- Verify: no test command yet → not run
- Suggested skills: `commit-checkpoint` for each step's commit; `handoff` when M1 closes.
