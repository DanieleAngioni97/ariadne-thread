import { test } from 'node:test'
import assert from 'node:assert/strict'

import { readLog, readState } from './migrate.mjs'

const STATE = `# State — demo
Updated: 2026-11-10 · Branch: \`main\` · PR: none

## Milestone
Build the importer: parser done,
writer next.

## Next
1. Write the CSV writer
   with headers.
2. Wire the CLI.

## Open decisions and risks
- Decide where to host the repo (GitHub Acme?).
- Bedrock keys expire: a 403 means a new key.
  Check before long runs.

## Git workflow (agreed 2026-10-27)
- One branch per task.

## Pointers
- Verify: \`npm test\` → green
`

test('readState splits STATE.md into milestone, next steps, open items and the other sections', () => {
  assert.deepEqual(readState(STATE), {
    milestone: 'Build the importer: parser done, writer next.',
    next: ['Write the CSV writer with headers.', 'Wire the CLI.'],
    open: ['Decide where to host the repo (GitHub Acme?).', 'Bedrock keys expire: a 403 means a new key. Check before long runs.'],
    other: [
      { title: 'Git workflow (agreed 2026-10-27)', items: ['One branch per task.'] },
      { title: 'Pointers', items: ['Verify: `npm test` → green'] },
    ],
  })
})

test('readState takes Next as bullets too, and missing sections as empty', () => {
  assert.deepEqual(readState('## Next\n- One\n- Two\n'), { milestone: null, next: ['One', 'Two'], open: [], other: [] })
  assert.deepEqual(readState('just prose\n'), { milestone: null, next: [], open: [], other: [] })
})

test('a section with prose and no bullets keeps its text as one item', () => {
  assert.deepEqual(readState('## How builds are made\nRun make,\nthen ship.\n').other, [{ title: 'How builds are made', items: ['Run make, then ship.'] }])
})

test('readLog reads one milestone per line, date · what · reference, and keeps the rest as text', () => {
  const log = '# Log\n- 2026-10-01 · Parser done · abc1234\n- 2026-10-05 · Writer done · PR #4\n- 2026-10-09 · Released\nnot a line\n'
  assert.deepEqual(readLog(log), [
    { at: '2026-10-01', what: 'Parser done', ref: 'abc1234' },
    { at: '2026-10-05', what: 'Writer done', ref: 'PR #4' },
    { at: '2026-10-09', what: 'Released', ref: null },
  ])
})
