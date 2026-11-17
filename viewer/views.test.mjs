import { test } from 'node:test'
import assert from 'node:assert/strict'

import { dayOffset, groupOf, kindOf, lastActivity, listCounts, listRows, parseLog, searchNodes, timeline } from './views.js'

const data = {
  current: 'm1.2',
  nodes: [
    { id: 'm1', title: 'Build', kind: 'milestone', status: 'active' },
    { id: 'm1.1', title: 'Parser', parent: 'm1', status: 'done' },
    { id: 'm1.2', title: 'Viewer layout', parent: 'm1', status: 'active' },
    { id: 'm1.3', title: 'Side trip', parent: 'm1', kind: 'detour', status: 'done' },
    { id: 'm1.4', title: 'Old idea', parent: 'm1', status: 'replaced' },
    { id: 'm2', title: 'Ship', kind: 'milestone', status: 'todo' },
    { id: 'm2.1', title: 'Release notes', parent: 'm2', status: 'deferred' },
  ],
}

const log = [
  { at: '2026-11-14T09:00Z', id: 'm1.1', op: 'start', text: 'iniziato m1.1' },
  { at: '2026-11-14T10:00Z', id: 'm1.1', op: 'fill', text: 'prova' },
  { at: '2026-11-14T11:00Z', id: 'm1.1', op: 'close', text: 'chiuso m1.1' },
  { at: '2026-11-15T08:00Z', id: 'm1', op: 'plan', text: 'piano' },
  { at: '2026-11-15T09:00Z', id: 'm1.2', op: 'start', text: 'iniziato m1.2' },
  { at: '2026-11-15T09:30Z', id: null, op: 'relink', text: 'ricollegato' },
]

test('a node reads as one of six kinds: a detour first, a replaced step as dropped, else its status', () => {
  assert.deepEqual(data.nodes.map(kindOf), ['active', 'done', 'active', 'detour', 'dropped', 'todo', 'deferred'])
})

test('an open decision and an open risk read as their own kind; closed, they read as done', () => {
  const nodes = [
    { id: 'q', kind: 'decision', status: 'todo' }, { id: 'r', kind: 'risk', status: 'todo' },
    { id: 'q2', kind: 'decision', status: 'done' }, { id: 'r2', kind: 'risk', status: 'done' },
  ]
  assert.deepEqual(nodes.map(kindOf), ['decision', 'risk', 'done', 'done'])
  assert.deepEqual([listCounts({ nodes }).decision, listCounts({ nodes }).risk], [1, 1])
})

test('each operation falls in progress, structure or detail; an unknown one counts as structure', () => {
  assert.deepEqual(['start', 'close', 'plan', 'add', 'move', 'defer', 'replace', 'confirm', 'reject', 'undo', 'fill', 'relink', 'new'].map(groupOf),
    ['progress', 'progress', 'structure', 'structure', 'structure', 'structure', 'structure', 'structure', 'structure', 'structure', 'detail', 'detail', 'structure'])
})

test('the log parses line by line and skips what does not parse', () => {
  const text = `${JSON.stringify(log[0])}\nnot json\n\n${JSON.stringify(log[1])}\n`
  assert.deepEqual(parseLog(text).map(e => e.op), ['start', 'fill'])
  assert.deepEqual(parseLog(null), [])
})

test('the timeline groups by day, newest day and newest event first, and keeps only the chosen groups', () => {
  const days = timeline(log, { groups: new Set(['progress', 'structure']) })
  assert.deepEqual(days.map(d => d.day), ['2026-11-15', '2026-11-14'])
  assert.deepEqual(days[0].events.map(e => e.op), ['start', 'plan'])
  assert.deepEqual(days[1].events.map(e => e.op), ['close', 'start'])
})

test('the timeline search matches the node id, its title or the event text', () => {
  const nodes = new Map(data.nodes.map(n => [n.id, n]))
  const all = new Set(['progress', 'structure', 'detail'])
  const ops = query => timeline(log, { groups: all, query, nodes }).flatMap(d => d.events.map(e => `${e.id}:${e.op}`))
  assert.deepEqual(ops('parser'), ['m1.1:close', 'm1.1:fill', 'm1.1:start'])
  assert.deepEqual(ops('M1.2'), ['m1.2:start'])
  assert.deepEqual(ops('ricoll'), ['null:relink'])
})

test('a day is today, yesterday or further back', () => {
  assert.equal(dayOffset('2026-11-15', '2026-11-15'), 0)
  assert.equal(dayOffset('2026-11-14', '2026-11-15'), 1)
  assert.equal(dayOffset('2026-10-31', '2026-11-15'), 15)
})

test('the list shows the nodes in graph order with their depth and milestone, filtered by kind', () => {
  const rows = listRows(data, {})
  assert.deepEqual(rows.map(r => [r.node.id, r.depth, r.milestone?.id]), [
    ['m1', 0, undefined], ['m1.1', 1, 'm1'], ['m1.2', 1, 'm1'], ['m1.3', 1, 'm1'], ['m1.4', 1, 'm1'],
    ['m2', 0, undefined], ['m2.1', 1, 'm2'],
  ])
  assert.deepEqual(listRows(data, { filter: 'active' }).map(r => r.node.id), ['m1', 'm1.2'])
  assert.deepEqual(listRows(data, { filter: 'detour' }).map(r => r.node.id), ['m1.3'])
  assert.deepEqual(listRows(data, { query: 'notes' }).map(r => r.node.id), ['m2.1'])
})

test('the list counts every kind for its filter chips', () => {
  assert.deepEqual(listCounts(data), { all: 7, active: 2, todo: 1, done: 1, deferred: 1, detour: 1, decision: 0, risk: 0, dropped: 1 })
})

test('the last activity of a node is its latest event', () => {
  const last = lastActivity(log)
  assert.equal(last.get('m1.1'), '2026-11-14T11:00Z')
  assert.equal(last.has('null'), false)
})

test('search ranks the exact id, then id prefixes, then titles; at most the limit', () => {
  assert.deepEqual(searchNodes(data, 'm1.2').map(n => n.id), ['m1.2'])
  assert.deepEqual(searchNodes(data, 'm1.').map(n => n.id), ['m1.1', 'm1.2', 'm1.3', 'm1.4'])
  assert.deepEqual(searchNodes(data, 'layout').map(n => n.id), ['m1.2'])
  assert.deepEqual(searchNodes(data, 'm', 2).length, 2)
  assert.deepEqual(searchNodes(data, '  '), [])
})
