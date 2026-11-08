import { test } from 'node:test'
import assert from 'node:assert/strict'

import { validate } from './validate.mjs'

const AT = '2026-11-08'
const node = fields => ({
  id: 'a', kind: 'step', title: 'A', status: 'done', what: 'A result.',
  proof: [{ type: 'file', ref: 'docs/a.md' }], by: 'agent', at: AT, ...fields,
})
const jsonl = nodes => nodes.map(n => JSON.stringify(n)).join('\n') + '\n'
const rules = text => validate(text).map(e => e.rule)

test('a well-formed graph has no errors', () => {
  const graph = jsonl([
    node({ id: 'm1', kind: 'milestone', confirmed: { at: AT, ref: 'msg' } }),
    node({ id: 'm1.1', parent: 'm1' }),
    node({ id: 'm1.2', parent: 'm1', after: ['m1.1'], status: 'todo' }),
  ])
  assert.deepEqual(validate(graph), [])
})

test('a line that is not a JSON object is rejected with its line number', () => {
  const errors = validate(jsonl([node({})]) + 'not json\n')
  assert.deepEqual(errors.map(e => [e.rule, e.line]), [['json', 2]])
})

test('ids are unique', () => {
  assert.deepEqual(rules(jsonl([node({}), node({})])), ['unique-id'])
})

test('kind and status take only the known values', () => {
  assert.deepEqual(rules(jsonl([node({ kind: 'task', status: 'wip' })])), ['kind', 'status'])
})

test('every reference points to an existing node', () => {
  const fields = ['parent', 'reentry', 'deferred_to', 'continues', 'replaced_by']
  for (const field of fields) {
    assert.deepEqual(rules(jsonl([node({ [field]: 'ghost' })])).includes('reference'), true, field)
  }
  assert.deepEqual(rules(jsonl([node({ after: ['ghost'] })])), ['reference'])
})

test('parent and after form no cycle', () => {
  const graph = jsonl([node({ id: 'a', after: ['b'] }), node({ id: 'b', after: ['a'] })])
  assert.deepEqual(rules(graph), ['cycle'])
})

test('R3: every node has a proof, or says why it is uncertain', () => {
  assert.deepEqual(rules(jsonl([node({ proof: [] })])), ['proof'])
  assert.deepEqual(rules(jsonl([node({ proof: [], uncertain: 'historical, no proof' })])), [])
  assert.deepEqual(rules(jsonl([node({ proof: [{ type: 'rumour', ref: 'x' }] })])), ['proof'])
})

test('R5 and R16: every node says what it decided, who decided it and when', () => {
  assert.deepEqual(rules(jsonl([node({ what: '' })])), ['what'])
  assert.deepEqual(rules(jsonl([node({ by: 'haiku' })])), ['by'])
  assert.deepEqual(rules(jsonl([node({ at: 'yesterday' })])), ['at'])
})

test('R2: structural nodes carry the user confirmation', () => {
  assert.deepEqual(rules(jsonl([node({ kind: 'milestone' })])), ['confirmed'])
  assert.deepEqual(rules(jsonl([node({ kind: 'detour', reentry: 'a' })])).includes('confirmed'), true)
})

test('R22: an open detour declares where it re-enters', () => {
  const confirmed = { at: AT, ref: 'msg' }
  const graph = jsonl([node({}), node({ id: 'd', kind: 'detour', status: 'active', after: ['a'], confirmed })])
  assert.deepEqual(rules(graph), ['reentry'])
  const closed = jsonl([node({}), node({ id: 'd', kind: 'detour', status: 'done', after: ['a'], confirmed })])
  assert.deepEqual(rules(closed), [])
})

test('R15: a replaced node points to its successor; a deferred one to the task that resumes it', () => {
  const confirmed = { at: AT, ref: 'msg' }
  assert.deepEqual(rules(jsonl([node({ status: 'replaced', confirmed })])), ['replaced_by'])
  assert.deepEqual(rules(jsonl([node({ status: 'deferred', confirmed })])), ['deferred_to'])
  const resumed = jsonl([
    node({ status: 'deferred', deferred_to: 'b', confirmed }),
    node({ id: 'b', status: 'todo', continues: 'a' }),
  ])
  assert.deepEqual(rules(resumed), [])
})
