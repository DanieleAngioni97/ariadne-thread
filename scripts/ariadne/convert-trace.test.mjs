import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

import { convert } from './convert-trace.mjs'
import { validate } from './validate.mjs'

const options = { dateOf: () => '2026-11-07', exists: path => path === 'docs/vision.md' }
const trace = `# Process trace

current: m1.2

### p0 — Vision
- status: done
- parent:
- summary: The idea.
- detail: See docs/vision.md.
- branches:

### m1 — M1 Analysis
- status: active
- parent: p0
- summary: Requirements.
- detail: Phase 2.
- branches:

### m1.1 — Draft
- status: done
- parent: m1
- summary: First draft.
- detail: In docs/missing.md.
- branches: b1

### m1.2 — Spike
- status: active
- parent: m1.1
- summary: A spike.
- detail: Throwaway.
- branches:

### b1 — Side branch
- status: deferred
- deferred: m1.2 — later, with the spike.
- parent: m1.1
- summary: Postponed.
- detail: Why not now.
- branches:
`

const byId = nodes => new Map(nodes.map(n => [n.id, n]))

test('reads the current node and keeps the trace order', () => {
  const { current, nodes } = convert(trace, options)
  assert.equal(current, 'm1.2')
  assert.deepEqual(nodes.map(n => n.id), ['p0', 'm1', 'm1.1', 'm1.2', 'b1'])
})

test('the id prefix gives the container; every other trace parent becomes after', () => {
  const nodes = byId(convert(trace, options).nodes)
  assert.equal(nodes.get('m1.1').parent, 'm1')
  assert.equal(nodes.get('m1.1').after, undefined)
  assert.equal(nodes.get('m1.2').parent, 'm1')
  assert.deepEqual(nodes.get('m1.2').after, ['m1.1'])
  assert.equal(nodes.get('m1').parent, undefined)
  assert.deepEqual(nodes.get('m1').after, ['p0'])
})

test('milestones, steps and detours get their kind; a detour sits beside the node it leaves', () => {
  const nodes = byId(convert(trace, options).nodes)
  assert.deepEqual(['p0', 'm1', 'm1.1', 'b1'].map(id => nodes.get(id).kind), ['step', 'milestone', 'step', 'detour'])
  assert.equal(nodes.get('b1').parent, 'm1')
  assert.deepEqual(nodes.get('b1').after, ['m1.1'])
})

test('a deferred node splits into the resuming task and the reason', () => {
  const b1 = byId(convert(trace, options).nodes).get('b1')
  assert.equal(b1.deferred_to, 'm1.2')
  assert.equal(b1.why, 'later, with the spike.')
})

test('existing files cited in the text become proofs; otherwise the node is uncertain', () => {
  const nodes = byId(convert(trace, options).nodes)
  assert.deepEqual(nodes.get('p0').proof, [{ type: 'file', ref: 'docs/vision.md' }])
  assert.equal(nodes.get('p0').uncertain, undefined)
  assert.deepEqual(nodes.get('m1.1').proof, [])
  assert.match(nodes.get('m1.1').uncertain, /no proof/)
})

test('authorship, date and the confirmation of structural nodes come from the trace history', () => {
  const nodes = byId(convert(trace, options).nodes)
  assert.equal(nodes.get('m1.1').by, 'agent')
  assert.equal(nodes.get('m1.1').at, '2026-11-07')
  assert.deepEqual(nodes.get('m1').confirmed, { at: '2026-11-07', ref: 'docs/process-trace.md' })
  assert.equal(nodes.get('m1.1').confirmed, undefined)
})

test('the converted sample passes the validator', () => {
  const text = convert(trace, options).nodes.map(n => JSON.stringify(n)).join('\n')
  assert.deepEqual(validate(text), [])
})

test('the real process trace converts into a valid graph', () => {
  const real = readFileSync(new URL('../../docs/process-trace.md', import.meta.url), 'utf8')
  const root = new URL('../../', import.meta.url)
  const { nodes } = convert(real, { dateOf: () => '2026-11-08', exists: path => existsSync(new URL(path, root)) })
  assert.deepEqual(validate(nodes.map(n => JSON.stringify(n)).join('\n')), [])
})
