import { test } from 'node:test'
import assert from 'node:assert/strict'

import { parse, makeGraph } from './graph.mjs'

const AT = '2026-11-11'
const n = (id, fields) => ({ id, kind: 'step', title: id, status: 'done', what: `${id} result.`, by: 'agent', at: AT, ...fields })
const jsonl = nodes => nodes.map(x => JSON.stringify(x)).join('\n') + '\n'

// m1 done (a → b), m2 active: c done, d active (after c), e todo (after d), f todo (after e), x detour of m2.
const NODES = [
  n('m1', { kind: 'milestone' }),
  n('a', { parent: 'm1' }),
  n('b', { parent: 'm1', after: ['a'] }),
  n('m2', { kind: 'milestone', status: 'active', after: ['m1'] }),
  n('c', { parent: 'm2' }),
  n('d', { parent: 'm2', status: 'active', after: ['c'] }),
  n('x', { parent: 'm2', kind: 'detour', status: 'done', after: ['c'], reentry: 'd' }),
  n('e', { parent: 'm2', status: 'todo', after: ['d'] }),
  n('f', { parent: 'm2', status: 'todo', after: ['e'] }),
  n('m3', { kind: 'milestone', status: 'todo', after: ['m2'] }),
]

test('parse keeps file order and skips blank and unreadable lines', () => {
  const text = jsonl(NODES.slice(0, 2)) + '\nnot json\n' + JSON.stringify(NODES[2])
  assert.deepEqual(parse(text).map(x => x.id), ['m1', 'a', 'b'])
})

test('containers are listed innermost first', () => {
  const g = makeGraph([...NODES, n('p', { parent: 'd', kind: 'point', status: 'todo' })])
  assert.deepEqual(g.containers('p'), ['d', 'm2'])
  assert.deepEqual(g.containers('m1'), [])
})

test('dependencies follow after and continues backwards, nearest first, without milestones', () => {
  const g = makeGraph(NODES)
  assert.deepEqual(g.dependencies('d'), ['c', 'b', 'a'])
})

test('the chain inside the own milestone comes before earlier milestones', () => {
  const g = makeGraph(NODES)
  assert.deepEqual(g.dependencies('f'), ['e', 'd', 'c', 'b', 'a'])
})

test('a node reached first by a costly path keeps its cheapest distance', () => {
  // m1 is found first from the container m2 (one hop), then from step j (no hop): its result k is
  // near, and must come before t, four steps down another chain inside m2.
  const g = makeGraph([
    n('m1', { kind: 'milestone' }),
    n('k', { parent: 'm1' }),
    n('m2', { kind: 'milestone', status: 'active', after: ['m1'] }),
    n('j', { parent: 'm2', after: ['m1'] }),
    n('t', { parent: 'm2' }),
    n('s', { parent: 'm2', after: ['t'] }),
    n('r', { parent: 'm2', after: ['s'] }),
    n('q', { parent: 'm2', after: ['r'] }),
    n('h', { parent: 'm2', status: 'active', after: ['q', 'j'] }),
  ])
  const deps = g.dependencies('h')
  assert.ok(deps.indexOf('k') < deps.indexOf('t'), deps.join(' '))
})

test('a milestone dependency contributes its final results, not its siblings', () => {
  const g = makeGraph(NODES)
  // c has no `after`, but its container m2 comes after m1, whose last result is b.
  assert.deepEqual(g.dependencies('c'), ['b', 'a'])
  assert.ok(!g.dependencies('d').includes('x'), 'a detour beside the thread is not a dependency')
})

test('continues links a resumed node to the one it resumes', () => {
  const g = makeGraph([...NODES, n('g', { parent: 'm3', status: 'todo', continues: 'x' })])
  assert.equal(g.dependencies('g')[0], 'x')
})

test('a cycle does not loop forever', () => {
  const g = makeGraph([n('p', { after: ['q'] }), n('q', { after: ['p'] })])
  assert.deepEqual(g.dependencies('p'), ['q'])
})

test('next is the first todo in the same container whose prerequisites are done or current', () => {
  const g = makeGraph(NODES)
  assert.equal(g.next('d'), 'e')
})

test('next follows the plan before a deferred step that landed earlier in the milestone', () => {
  const nodes = [
    n('m3', { kind: 'milestone', status: 'active' }),
    n('m3.1', { parent: 'm3', status: 'todo', continues: 'm2.5' }),
    n('m3.2', { parent: 'm3', status: 'active' }),
    n('m3.3', { parent: 'm3', status: 'todo', after: ['m3.2'] }),
  ]
  const g = makeGraph(nodes)
  assert.equal(g.next('m3.2'), 'm3.3')
  assert.equal(makeGraph(nodes.slice(0, 3)).next('m3.2'), 'm3.1')
})

test('next from a container with work left inside is its first ready child, as after a pause', () => {
  const nodes = [n('m1', { kind: 'milestone', status: 'active' }), n('p', { parent: 'm1', status: 'todo' }), n('q', { parent: 'm1', status: 'todo', after: ['p'] })]
  assert.equal(makeGraph(nodes).next('m1'), 'p')
})

test('next climbs a level when the container has nothing ready', () => {
  const g = makeGraph(NODES.map(x => (x.id === 'f' ? { ...x, status: 'done' } : x.id === 'e' ? { ...x, status: 'active' } : x)))
  assert.equal(g.next('e'), 'm3')
})

test('next and first skip decisions and risks: they are not work', () => {
  const g = makeGraph([
    { id: 'm', kind: 'milestone', status: 'active' },
    { id: 'r', kind: 'risk', parent: 'm', status: 'todo' },
    { id: 'd', kind: 'decision', parent: 'm', status: 'todo' },
    { id: 'a', kind: 'step', parent: 'm', status: 'todo', after: ['d'] },
    { id: 'b', kind: 'step', parent: 'm', status: 'todo' },
  ])
  assert.equal(g.first(), 'b')
  assert.equal(g.next('m'), 'b')
})

test('next is null when the plan is over', () => {
  assert.equal(makeGraph(NODES.slice(0, 3)).next('b'), null)
})

test('a detour comes from the node it left, and from what that node comes from', () => {
  const g = makeGraph([...NODES, n('y', { parent: 'm2', kind: 'detour', status: 'active', reentry: 'd' })])
  assert.deepEqual(g.dependencies('y').slice(0, 2), ['d', 'c'])
})

test('own dependencies stop at the node: no containers', () => {
  const g = makeGraph([...NODES, n('k1', { parent: 'd', kind: 'point' }), n('k2', { parent: 'd', kind: 'point', after: ['k1'] })])
  assert.deepEqual(g.dependencies('k2', { own: true }), ['k1'])
})
