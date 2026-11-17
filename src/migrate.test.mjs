import { test } from 'node:test'
import assert from 'node:assert/strict'

import { apply } from './apply.mjs'
import { parse } from './graph.mjs'
import { classify, preview, propose, readLog, readState, shortTitle } from './migrate.mjs'

// These tests read what ariadne writes in Italian; English has its own tests.
process.env.ARIADNE_LANG = 'it'

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
    sections: { milestone: 'Milestone', next: 'Next', open: 'Open decisions and risks' },
  })
})

test('readState takes Next as bullets too, and missing sections as empty', () => {
  const none = { milestone: null, next: null, open: null }
  assert.deepEqual(readState('## Next\n- One\n- Two\n'), { milestone: null, next: ['One', 'Two'], open: [], other: [], sections: { ...none, next: 'Next' } })
  assert.deepEqual(readState('just prose\n'), { milestone: null, next: [], open: [], other: [], sections: none })
})

test('the milestone is the first paragraph of its section, without tables', () => {
  const text = '## Milestone\nShip P5: ready,\nnot launched.\n\n| Area | State |\n|---|---|\n| CI | red |\n\nMore prose.\n'
  assert.equal(readState(text).milestone, 'Ship P5: ready, not launched.')
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

const AT = '2026-11-17T10:00Z'
const LOG = '- 2026-10-01 · Parser done · abc1234\n- 2026-10-05 · Writer started · PR #4\n'
const run = (nodes, plan) => apply({ text: nodes.map(n => JSON.stringify(n)).join('\n') + (nodes.length ? '\n' : ''), thread: {}, ops: plan.ops, at: AT })

test('classify guesses a decision from a question or a choice to make, a pointer from a standing rule, else a risk', () => {
  assert.equal(classify('Decide where to host the repo (GitHub Acme?).'), 'decision')
  assert.equal(classify('Giorni in presenza da confermare.'), 'decision')
  assert.equal(classify("With the user's ok: delete merged branches."), 'decision')
  assert.equal(classify('Never run `rf migrate`: it resets cited papers.'), 'pointer')
  assert.equal(classify('Bedrock keys expire: a 403 means a new key.'), 'risk')
})

test('shortTitle keeps the head of a sentence, without markdown, under the title limit', () => {
  assert.equal(shortTitle('Bedrock keys expire: a 403 means a new key.'), 'Bedrock keys expire: a 403 means a new key')
  assert.equal(shortTitle('Portare `feat/p5-campaign-runs` in `main`: controlli verdi sul branch, PR draft verso `main`, merge dopo la review.'), 'Portare `feat/p5-campaign-runs` in `main`')
  assert.equal(shortTitle('Dopo ogni suite: `python -m wb_agent.campaign summarize`, confronto col costo stimato, aggiornamento del piano.'), 'Dopo ogni suite: `python -m wb_agent.campaign summarize`, confronto…')
  assert.equal(shortTitle('Deliver guide v1.0 to Atlas, then a **video guide**.'), 'Deliver guide v1.0 to Atlas, then a video guide')
  const long = shortTitle('word '.repeat(40))
  assert.ok(long.length <= 70 && long.endsWith('…'), long)
})

test('on an empty graph propose makes the milestone, the history, the next steps, decisions and risks, all to confirm', () => {
  const plan = propose({ state: readState(STATE), log: readLog(LOG), nodes: [], at: AT })
  const r = run([], plan)
  assert.equal(r.ok, true, JSON.stringify(r.errors))
  const nodes = parse(r.text)
  assert.deepEqual(nodes.map(n => [n.id, n.kind, n.status, n.after?.[0] ?? null]), [
    ['m1', 'milestone', 'active', null],
    ['m1.1', 'step', 'done', null],
    ['m1.2', 'step', 'todo', 'm1.1'],
    ['m1.3', 'step', 'todo', 'm1.2'],
    ['m1.4', 'decision', 'todo', null],
    ['m1.5', 'risk', 'todo', null],
  ])
  assert.ok(nodes.every(n => n.review === 'confirm'), 'every migrated node waits for the user')
  assert.deepEqual(nodes[2].proof, [{ type: 'file', ref: '.ariadne/archive/STATE-2026-11-17.md#Next' }])
  assert.deepEqual(nodes[1].proof, [{ type: 'file', ref: '.ariadne/archive/LOG-2026-11-17.md' }])
  assert.match(nodes[1].what, /2 .*2026-10-01.*2026-10-05.*Writer started/)
  assert.equal(nodes[2].what, 'Write the CSV writer with headers.')
  assert.deepEqual(plan.archive, [{ from: 'STATE.md', to: '.ariadne/archive/STATE-2026-11-17.md' }, { from: 'LOG.md', to: '.ariadne/archive/LOG-2026-11-17.md' }])
})

test('with an open milestone propose works inside it, after its last step, and skips the ids already taken', () => {
  const OK = { at: '2026-11-01', ref: 'chat' }
  const nodes = [
    { id: 'm1', kind: 'milestone', title: 'M1', status: 'active', what: 'Goal.', proof: [{ type: 'message', ref: 'chat' }], by: 'user', at: '2026-11-01', confirmed: OK },
    { id: 'm1.1', kind: 'step', title: 'A', status: 'active', parent: 'm1', what: 'A.', proof: [{ type: 'message', ref: 'chat' }], by: 'user', at: '2026-11-01' },
  ]
  const plan = propose({ state: readState('## Next\n1. Two\n'), log: null, nodes, at: AT })
  const r = run(nodes, plan)
  assert.equal(r.ok, true, JSON.stringify(r.errors))
  assert.deepEqual(parse(r.text).slice(2).map(n => [n.id, n.parent, n.after?.[0] ?? null]), [['m1.2', 'm1', 'm1.1']])
  assert.deepEqual(plan.archive, [{ from: 'STATE.md', to: '.ariadne/archive/STATE-2026-11-17.md' }])
})

test('the agent corrects the guess item by item: a pointer or a dropped item makes no node', () => {
  const plan = propose({ state: readState(STATE), log: [], nodes: [], at: AT, as: { 1: 'risk', 2: 'drop' } })
  assert.deepEqual(plan.open.map(o => o.as), ['risk', 'drop'])
  const pointed = preview(propose({ state: readState(STATE), log: [], nodes: [], at: AT, as: { 2: 'pointer' } })).split('\n')
  assert.ok(pointed.includes('- Open decisions and risks 2: Bedrock keys expire: a 403 means a new key. Check before long runs.'), pointed.join('\n'))
  const kinds = parse(run([], plan).text).map(n => n.kind)
  assert.deepEqual(kinds, ['milestone', 'step', 'step', 'risk'])
})

test('the preview says what would happen, numbers the open items and how to correct them', () => {
  const text = preview(propose({ state: readState(STATE), log: readLog(LOG), nodes: [], at: AT }))
  for (const line of [
    'Milestone nuova: m1 Build the importer: parser done, writer next',
    '- m1.2 Write the CSV writer with headers',
    '1 [decisione] Decide where to host the repo (GitHub Acme?).',
    '2 [rischio] Bedrock keys expire: a 403 means a new key. Check before long runs.',
    '- Git workflow (agreed 2026-10-27): One branch per task.',
    '- Pointers: Verify: `npm test` → green',
    'Storia: 2 righe di LOG.md → m1.1 Storia prima di ariadne',
    'STATE.md → .ariadne/archive/STATE-2026-11-17.md',
  ]) assert.ok(text.split('\n').includes(line), `${line}\n---\n${text}`)
})

test('propose works in the milestone of the current step, not in the first open one', () => {
  const OK = { at: '2026-11-01', ref: 'chat' }
  const base = { proof: [{ type: 'message', ref: 'chat' }], by: 'user', at: '2026-11-01', what: 'x' }
  const nodes = [
    { ...base, id: 'm1', kind: 'milestone', title: 'Later', status: 'todo', confirmed: OK },
    { ...base, id: 'm2', kind: 'milestone', title: 'Now', status: 'active', confirmed: OK },
    { ...base, id: 'm2.1', kind: 'step', title: 'A', status: 'active', parent: 'm2' },
  ]
  const plan = propose({ state: readState('## Next\n1. Two\n'), log: null, nodes, thread: { current: 'm2.1' }, at: AT })
  assert.equal(plan.milestone.id, 'm2')
  assert.equal(propose({ state: readState('## Next\n1. Two\n'), log: null, nodes, thread: {}, at: AT }).milestone.id, 'm2')
})
