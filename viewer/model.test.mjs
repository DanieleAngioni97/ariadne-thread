import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  anomalies, continuationOf, defaultExpanded, deferredCount, emptyNote, filesWithin, fromGraph, labelOf, limitOf, origin, panelRows,
  threadSet, visibleEdges, visibleNodes,
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

test('the real thread defers every open step of a closed milestone to a later task', async () => {
  const { readFileSync } = await import('node:fs')
  const { parse } = await import('../src/graph.mjs')
  const read = name => readFileSync(new URL(`../.ariadne/${name}`, import.meta.url), 'utf8')
  const sample = fromGraph(parse(read('graph.jsonl')), JSON.parse(read('thread.json')))
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

test('the graph files become the viewer shape: current from the thread, the outcome as summary', () => {
  const nodes = [
    { id: 'm1', kind: 'milestone', title: 'M1', status: 'done', what: 'done', proof: [{ type: 'file', ref: 'docs/a.md' }] },
    { id: 's1', kind: 'step', title: 'S1', status: 'deferred', parent: 'm1', what: 'later', why: 'no time' },
    { id: 'm2', kind: 'milestone', title: 'M2', status: 'active', after: ['m1'], what: 'now' },
    { id: 's2', kind: 'step', title: 'S2', status: 'active', parent: 'm2', what: 'picks up', continues: 's1' },
    { id: 'x', kind: 'step', title: 'X', status: 'replaced', parent: 'm2', what: 'gone', replaced_by: 's2' },
  ]
  const view = fromGraph(nodes, { project: 'p', current: 's2' })
  assert.equal(view.project, 'p')
  assert.equal(view.current, 's2')
  const byId = new Map(view.nodes.map(n => [n.id, n]))
  assert.equal(byId.get('m1').summary, 'done')
  assert.deepEqual(byId.get('m1').files, [{ path: 'docs/a.md', change: 'edited', why: 'done' }])
  assert.deepEqual(byId.get('s1').deferred, { to: 's2', why: 'no time' })
  assert.equal(byId.get('x').status, 'replaced')
  assert.equal(continuationOf(view, 's1').id, 's2')
})

test('without a thread file the current node is the active one', () => {
  const view = fromGraph([{ id: 'a', title: 'A', status: 'done' }, { id: 'b', title: 'B', status: 'active' }], null)
  assert.equal(view.current, 'b')
})

// The label at the right of a node: what still waits on you comes first, then where it went, then who decided.
test('a node label says what waits on you, where a deferral went, how far a list is, who decided', () => {
  const view = fromGraph([
    { id: 'm', kind: 'milestone', title: 'M', status: 'active', by: 'user' },
    { id: 'q', kind: 'step', title: 'Q', status: 'todo', parent: 'm', review: 'confirm', by: 'user' },
    { id: 'd', kind: 'step', title: 'D', status: 'deferred', parent: 'm' },
    { id: 'n', kind: 'step', title: 'N', status: 'todo', continues: 'd' },
    { id: 'l', kind: 'list', title: 'L', status: 'active', parent: 'm' },
    { id: 'p1', kind: 'point', title: 'P1', status: 'done', parent: 'l' },
    { id: 'p2', kind: 'point', title: 'P2', status: 'todo', parent: 'l' },
    { id: 'a', kind: 'step', title: 'A', status: 'done', parent: 'm', by: 'agent' },
  ], { current: 'l' })
  assert.deepEqual(labelOf(view, 'q'), { type: 'confirm' })
  assert.deepEqual(labelOf(view, 'd'), { type: 'deferred', to: 'n' })
  assert.deepEqual(labelOf(view, 'l'), { type: 'list', done: 1, total: 2 })
  assert.deepEqual(labelOf(view, 'm'), { type: 'user' })
  assert.equal(labelOf(view, 'a'), null)
})

test('the panel lists only the rows that have a value, in the order of the spec', () => {
  const view = fromGraph([
    { id: 'm', kind: 'milestone', title: 'M', status: 'done', what: 'did it', why: 'needed',
      proof: [{ type: 'commit', ref: 'abc' }], by: 'user', at: '2026-11-11', confirmed: { at: '2026-11-11', ref: 'chat' } },
    { id: 'x', kind: 'step', title: 'X', status: 'replaced', parent: 'm', what: 'gone', replaced_by: 'y',
      uncertain: 'no proof', review: 'confirm', by: 'agent', at: '2026-11-10' },
    { id: 'y', kind: 'detour', title: 'Y', status: 'active', parent: 'm', what: 'side', reentry: 'm', continues: 'x' },
  ], { current: 'y' })
  assert.deepEqual(panelRows(view, 'm').map(r => r.key), ['what', 'why', 'status', 'proof', 'by', 'confirmed'])
  assert.deepEqual(panelRows(view, 'x').map(r => r.key), ['what', 'status', 'uncertain', 'by', 'review', 'replacedBy'])
  assert.deepEqual(panelRows(view, 'y').map(r => r.key), ['what', 'status', 'reentry', 'continues'])
  assert.deepEqual(panelRows(view, 'm').find(r => r.key === 'by').value, { by: 'user', at: '2026-11-11' })
  assert.equal(panelRows(view, 'x').find(r => r.key === 'status').value, 'replaced')
})

// A level of ten steps s0 → … → s9 inside m; the current node is s5.
const long = {
  current: 's5',
  nodes: [
    { id: 'm', title: 'M', status: 'active' },
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `s${i}`, title: `S${i}`, parent: 'm', status: i < 5 ? 'done' : i === 5 ? 'active' : 'todo', ...(i ? { after: [`s${i - 1}`] } : {}),
    })),
    { id: 'r', title: 'R', parent: 'm', status: 'replaced', replaced_by: 's5' },
  ],
}
const open = new Set(['m'])

test('a profile limits how many children of a level show: 2, 3 or 5, standard by default', () => {
  assert.deepEqual(['essenziale', 'standard', 'esteso', undefined].map(limitOf), [2, 3, 5, 3])
})

test('a long level shows a window around the current node and says what hides above and below', () => {
  const nodes = visibleNodes(long, open, null, { limit: 3 })
  assert.deepEqual(nodes.map(n => n.id), ['m', 'more-above:m', 's4', 's5', 's6', 'more-below:m', 'more-replaced:m'])
  const more = Object.fromEntries(nodes.filter(n => n.more).map(n => [n.more, n.count]))
  assert.deepEqual(more, { above: 4, below: 3, replaced: 1 })
  assert.equal(nodes.find(n => n.id === 'more-above:m').parent, 'm')
})

test('a level without the current node opens at its first open step', () => {
  const elsewhere = { ...long, current: 'm' }
  const ids = visibleNodes(elsewhere, open, null, { limit: 3 }).map(n => n.id)
  assert.deepEqual(ids.filter(id => id.startsWith('s')), ['s4', 's5', 's6'])
})

test('the window follows a detour back to where it started', () => {
  const detour = {
    current: 'd',
    nodes: [...long.nodes.map(n => (n.id === 's5' ? { ...n, status: 'todo' } : n)), { id: 'd', title: 'D', kind: 'detour', status: 'active', reentry: 's8' }],
  }
  const ids = visibleNodes(detour, open, null, { limit: 3 }).map(n => n.id)
  assert.deepEqual(ids.filter(id => /^s\d$/.test(id)), ['s7', 's8', 's9'])
})

test('show opens the level in full; replaced steps show only when asked', () => {
  const all = visibleNodes(long, open, null, { limit: 3, revealed: new Set(['m']) }).map(n => n.id)
  assert.equal(all.filter(id => /^s\d$/.test(id)).length, 10)
  assert.ok(all.includes('more-replaced:m') && !all.includes('r'))
  const withReplaced = visibleNodes(long, open, null, { limit: 3, revealed: new Set(['m', 'replaced:m']) }).map(n => n.id)
  assert.ok(withReplaced.includes('r') && !withReplaced.includes('more-replaced:m'))
})

test('edges from hidden steps end at the marker that stands for them', () => {
  const edges = visibleEdges(long, open, null, { limit: 3 }).map(e => `${e.source}->${e.target}`)
  assert.ok(edges.includes('more-above:m->s4'))
  assert.ok(edges.includes('s6->more-below:m'))
  assert.ok(!edges.some(e => e.startsWith('more-above:m->more-above')))
})

test('replaced steps, once asked for, show at the end of the level even when the level is windowed', () => {
  const ids = visibleNodes(long, open, null, { limit: 3, revealed: new Set(['replaced:m']) }).map(n => n.id)
  assert.deepEqual(ids.slice(-2), ['more-below:m', 'r'])
})

test('a milestone without a plan and a list without points say why they are empty', () => {
  const view = fromGraph([
    { id: 'm', kind: 'milestone', title: 'M', status: 'todo' },
    { id: 'l', kind: 'list', title: 'L', status: 'active' },
    { id: 'n', kind: 'milestone', title: 'N', status: 'active' },
    { id: 's', kind: 'step', title: 'S', status: 'todo', parent: 'n' },
  ], null)
  assert.deepEqual(['m', 'l', 'n', 's'].map(id => emptyNote(view, id)), ['plan', 'list', null, null])
})
