import { test } from 'node:test'
import assert from 'node:assert/strict'

import { exportLog, exportState, GENERATED, isGenerated } from './export.mjs'
import { readLog, readState } from './migrate.mjs'

// These tests read what ariadne writes in Italian; English has its own tests.
process.env.ARIADNE_LANG = 'it'

const n = (id, fields) => ({ id, kind: 'step', title: `Title ${id}`, status: 'todo', what: `${id} what.`, by: 'agent', at: '2026-11-17', ...fields })
const NODES = [
  n('m1', { kind: 'milestone', title: 'Old', status: 'done', what: 'Done before.' }),
  n('m2', { kind: 'milestone', title: 'Ship', status: 'active', what: 'Release the importer.' }),
  n('a', { parent: 'm2', status: 'done' }),
  n('b', { parent: 'm2', status: 'active', after: ['a'] }),
  n('c', { parent: 'm2', after: ['b'] }),
  n('q', { kind: 'decision', parent: 'm2', title: 'Host?', what: 'GitHub or GitLab.' }),
  n('r', { kind: 'risk', parent: 'b', title: 'Keys expire', what: 'Bedrock answers 403.' }),
  n('r2', { kind: 'risk', parent: 'a', status: 'done', title: 'Old risk' }),
]

test('the exported STATE.md has the handoff sections, read back by migrate as the same work', () => {
  const text = exportState(NODES, { current: 'b' }, { project: 'demo', at: '2026-11-17T10:00Z' })
  assert.ok(text.startsWith(GENERATED), text)
  const lines = text.split('\n')
  for (const line of ['# State — demo', '## Milestone', 'Ship: Release the importer.', '## Next', '1. b Title b: b what. (in corso)', '2. c Title c: c what.', '## Open decisions and risks', '- Decisione q Host?: GitHub or GitLab.', '- Rischio r Keys expire: Bedrock answers 403.', '## Pointers']) {
    assert.ok(lines.includes(line), `${line}\n---\n${text}`)
  }
  assert.ok(!text.includes('Old risk'))
  const back = readState(text)
  assert.deepEqual([back.next.length, back.open.length], [2, 2])
})

test('the exported LOG.md has one line per closed node, oldest first, with its commit', () => {
  const log = [
    { at: '2026-11-10T09:00Z', id: 'a', op: 'start', text: 'iniziato a' },
    { at: '2026-11-11T09:00Z', id: 'a', op: 'close', text: 'chiuso a Title a: a done.', proof: [{ type: 'commit', ref: 'abc1234' }] },
    { at: '2026-11-12T09:00Z', id: 'r2', op: 'close', text: 'chiuso r2 Old risk: gone.', proof: [{ type: 'message', ref: 'chat' }] },
  ]
  const text = exportLog(log)
  assert.ok(text.startsWith(GENERATED))
  assert.deepEqual(readLog(text), [
    { at: '2026-11-11', what: 'chiuso a Title a: a done.', ref: 'abc1234' },
    { at: '2026-11-12', what: 'chiuso r2 Old risk: gone.', ref: null },
  ])
})

test('a generated file is told apart from a hand-written one', () => {
  assert.equal(isGenerated(exportLog([])), true)
  assert.equal(isGenerated('# State — mine\n'), false)
})
