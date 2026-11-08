import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  anomalies, continuationOf, defaultExpanded, deferredCount, filesWithin, origin, threadSet, visibleEdges, visibleNodes,
} from './model.js'

// root ─ a ─ b(current inside: b1 → b2*) ; a opens branch x ; detour d off a
const data = {
  current: 'b2',
  nodes: [
    { id: 'a', title: 'A', status: 'done' },
    { id: 'x', title: 'X', status: 'todo', after: ['a'] },
    { id: 'd', title: 'D', status: 'done', kind: 'detour', after: ['a'] },
    { id: 'b', title: 'B', status: 'active', after: ['a'] },
    { id: 'b1', title: 'B1', status: 'done', parent: 'b' },
    { id: 'b2', title: 'B2', status: 'active', parent: 'b', after: ['b1'] },
    { id: 'c', title: 'C', status: 'todo', after: ['b'] },
  ],
}

test('the thread is the current node, its containers and everything before them', () => {
  assert.deepEqual([...threadSet(data)].sort(), ['a', 'b', 'b1', 'b2'])
})

test('by default only the containers of the current node are open', () => {
  assert.deepEqual([...defaultExpanded(data)], ['b'])
})

test('a closed container hides its children', () => {
  const ids = visibleNodes(data, new Set()).map(n => n.id)
  assert.deepEqual(ids, ['a', 'x', 'd', 'b', 'c'])
})

test('an open container lists its children right after it', () => {
  const ids = visibleNodes(data, new Set(['b'])).map(n => n.id)
  assert.deepEqual(ids, ['a', 'x', 'd', 'b', 'b1', 'b2', 'c'])
})

test('focus keeps only a node and what it contains', () => {
  const ids = visibleNodes(data, new Set(['b']), 'b').map(n => n.id)
  assert.deepEqual(ids, ['b', 'b1', 'b2'])
})

test('edges into a closed container end on the container, and carry thread and detour flags', () => {
  const closed = visibleEdges(data, new Set())
  assert.deepEqual(
    closed.map(e => [e.source, e.target, e.isThread, e.isDetour]),
    [
      ['a', 'x', false, false],
      ['a', 'd', false, true],
      ['a', 'b', true, false],
      ['b', 'c', false, false],
    ],
  )
  const open = visibleEdges(data, new Set(['b']))
  assert.deepEqual(
    open.find(e => e.source === 'b1'),
    { id: 'b1->b2', source: 'b1', target: 'b2', isThread: true, isDetour: false },
  )
})

test('inside a container on the thread, finished steps join it; detours and open steps do not', () => {
  const nested = {
    current: 'n',
    nodes: [
      { id: 'm', status: 'done' },
      { id: 'm1', parent: 'm', status: 'done' },
      { id: 'm2', parent: 'm', status: 'done', after: ['m1'] },
      { id: 'side', parent: 'm', status: 'done', kind: 'detour', after: ['m1'] },
      { id: 'open', parent: 'm', status: 'todo', after: ['m2'] },
      { id: 'n', status: 'active', after: ['m'] },
    ],
  }
  assert.deepEqual([...threadSet(nested)].sort(), ['m', 'm1', 'm2', 'n'])
})

// m0 is closed: its open steps must be deferred to a task in a later milestone.
const plan = {
  current: 'n1',
  nodes: [
    { id: 'm', status: 'done' },
    { id: 'm1', parent: 'm', status: 'done' },
    { id: 'ok', parent: 'm', status: 'deferred', deferred: { to: 'p1', why: 'later' } },
    { id: 'lost', parent: 'm', status: 'todo' },
    { id: 'blank', parent: 'm', status: 'deferred' },
    { id: 'ghost', parent: 'm', status: 'deferred', deferred: { to: 'nope', why: 'x' } },
    { id: 'back', parent: 'm', status: 'deferred', deferred: { to: 'm1', why: 'x' } },
    { id: 'n', status: 'active', after: ['m'] },
    { id: 'n1', parent: 'n', status: 'active' },
    { id: 'p', status: 'todo', after: ['n'] },
    { id: 'p1', parent: 'p', status: 'todo', continues: 'ok' },
  ],
}

test('a closed milestone may hold open steps only if they are deferred to a later milestone', () => {
  assert.deepEqual(anomalies(plan), [
    { id: 'lost', reason: 'left-behind' },
    { id: 'blank', reason: 'no-target' },
    { id: 'ghost', reason: 'unknown-target' },
    { id: 'back', reason: 'not-later' },
  ])
})

test('a milestone counts its deferred steps', () => {
  assert.equal(deferredCount(plan, 'm'), 4)
  assert.equal(deferredCount(plan, 'n'), 0)
})

test('the deferred step and its continuation point at each other', () => {
  assert.equal(continuationOf(plan, 'ok').id, 'p1')
  assert.equal(origin(plan, 'p1').id, 'ok')
  assert.equal(continuationOf(plan, 'lost'), null)
})

test('the sample thread defers every open step of a closed milestone to a later task', async () => {
  const { data: sample } = await import('./data.js')
  assert.deepEqual(anomalies(sample), [])
  for (const n of sample.nodes.filter(n => n.continues)) assert.equal(continuationOf(sample, n.continues).id, n.id)
})

test('a container lists every file touched inside it, once per path, with the reason from each step', () => {
  const tree = {
    current: 'a',
    nodes: [
      { id: 'm', files: [{ path: 'x.md', change: 'created', why: 'start' }] },
      { id: 'a', parent: 'm', files: [{ path: 'x.md', change: 'edited', why: 'more' }, { path: 'y.md', change: 'edited', why: 'fix' }] },
      { id: 'a1', parent: 'a', files: [{ path: 'z.md', change: 'created', why: 'new' }] },
    ],
  }
  assert.deepEqual(filesWithin(tree, 'm'), [
    { path: 'x.md', change: 'created', reasons: [{ step: 'm', why: 'start' }, { step: 'a', why: 'more' }] },
    { path: 'y.md', change: 'edited', reasons: [{ step: 'a', why: 'fix' }] },
    { path: 'z.md', change: 'created', reasons: [{ step: 'a1', why: 'new' }] },
  ])
  assert.deepEqual(filesWithin(tree, 'a1').map(f => f.path), ['z.md'])
})
