import { test } from 'node:test'
import assert from 'node:assert/strict'

import { summarize, tokens, LIMIT } from './summary.mjs'

const AT = '2026-11-11'
const n = (id, fields) => ({ id, kind: 'step', title: `Title ${id}`, status: 'done', what: `${id} result.`, by: 'agent', at: AT, ...fields })

const NODES = [
  n('m1', { kind: 'milestone', title: 'M1 Research' }),
  n('a', { parent: 'm1' }),
  n('b', { parent: 'm1', after: ['a'], uncertain: 'historical node' }),
  n('m2', { kind: 'milestone', title: 'M2 Design', status: 'active', after: ['m1'] }),
  n('c', { parent: 'm2' }),
  n('d', { parent: 'm2', status: 'active', after: ['c'] }),
  n('e', { parent: 'm2', status: 'todo', after: ['d'] }),
]

test('the summary follows the spec format line by line', () => {
  assert.equal(summarize(NODES, { current: 'd' }), [
    'Sei in: M2 Design › Title d (active)',
    'Da dove viene (solo le dipendenze):',
    '- c Title c: c result.',
    '- b Title b: b result. (incerto: historical node)',
    '- a Title a: a result.',
    'Rientri in sospeso: nessuno',
    'Prossimo: e Title e',
    'Per approfondire: ariadne show <id> · ariadne why <id>',
  ].join('\n'))
})

test('only finished dependencies are listed', () => {
  const nodes = [...NODES, n('z', { parent: 'm2', status: 'replaced', replaced_by: 'c' }), n('f', { parent: 'm2', status: 'todo', after: ['e', 'z'] })]
  const lines = summarize(nodes, { current: 'f' }).split('\n')
  const ids = lines.filter(l => l.startsWith('- ')).map(l => l.split(' ')[1])
  // e is todo, d active, z replaced: only c, b, a are finished.
  assert.deepEqual(ids, ['c', 'b', 'a'])
})

test('at most three dependencies, the nearest', () => {
  const nodes = [...NODES.slice(0, 4), n('a0', { parent: 'm1' }), ...NODES.slice(4)].map(x => (x.id === 'a' ? { ...x, after: ['a0'] } : x))
  const ids = summarize(nodes, { current: 'd' }).split('\n').filter(l => l.startsWith('- ')).map(l => l.split(' ')[1])
  assert.deepEqual(ids, ['c', 'b', 'a'])
})

test('a thread with no finished dependency says where it starts', () => {
  const text = summarize(NODES, { current: 'a' })
  assert.match(text, /Da dove viene \(solo le dipendenze\):\n- \(inizio del ramo\)\n/)
})

test('open detours are listed with where they re-enter', () => {
  const nodes = [...NODES, n('x', { parent: 'm2', kind: 'detour', status: 'active', title: 'Side question', after: ['c'], reentry: 'd' })]
  assert.match(summarize(nodes, { current: 'x' }), /Rientri in sospeso:\n- Side question → rientra in d\n/)
})

test('the review line appears only when the agent left structure to confirm', () => {
  assert.doesNotMatch(summarize(NODES, { current: 'd' }), /Da confermare/)
  const nodes = [...NODES, n('r1', { parent: 'm2', status: 'todo', review: 'confirm' }), n('r2', { parent: 'm2', status: 'todo', review: 'confirm' })]
  assert.match(summarize(nodes, { current: 'd' }), /\nDa confermare: 2 modifiche dell'agente \(ariadne confirm --all\)\nProssimo:/)
})

test('useful files come from the current node, then its containers, at most three', () => {
  const nodes = NODES.map(x => {
    if (x.id === 'd') return { ...x, detail: 'docs/plan.md § d', proof: [{ type: 'file', ref: 'src/d.mjs' }, { type: 'commit', ref: 'abc1234' }] }
    if (x.id === 'm2') return { ...x, detail: 'see docs/plan.md and docs/spec.md', proof: [{ type: 'file', ref: 'docs/brief.md' }] }
    return x
  })
  assert.match(summarize(nodes, { current: 'd' }), /\nFile utili: src\/d\.mjs · docs\/plan\.md · docs\/brief\.md\nPer approfondire:/)
  assert.doesNotMatch(summarize(NODES, { current: 'd' }), /File utili/)
})

test('with no next step the summary says the plan is over', () => {
  assert.match(summarize(NODES.slice(0, 3), { current: 'b' }), /\nProssimo: nessuno nel piano\n/)
})

test('a current node missing from the graph is reported, not hidden', () => {
  assert.match(summarize(NODES, { current: 'ghost' }), /^Sei in: ghost \(nodo non trovato nel grafo\)/)
})

test('dependencies cut away entirely are announced, not passed off as the start of the thread', () => {
  const nodes = NODES.map(x => (x.id === 'd' ? { ...x, title: 'y'.repeat(1300) } : x))
  const text = summarize(nodes, { current: 'd' })
  assert.doesNotMatch(text, /inizio del ramo/)
  assert.match(text, /- \(3 tagliate per stare nel limite: ariadne why d\)/)
})

test('over the token limit the farthest dependencies go first, the other lines stay', () => {
  const long = 'x'.repeat(380)
  const nodes = NODES.map(x => (['a', 'b', 'c'].includes(x.id) ? { ...x, what: long } : x))
  const text = summarize(nodes, { current: 'd' })
  assert.ok(tokens(text) <= LIMIT, `${tokens(text)} tokens`)
  assert.match(text, /^- c /m)
  assert.doesNotMatch(text, /^- a /m)
  for (const line of ['Sei in:', 'Rientri in sospeso:', 'Prossimo:', 'Per approfondire:']) assert.ok(text.includes(line), line)
})

test('a useful file with a section shows the section, so the agent opens the right part', () => {
  const nodes = NODES.map(x => (x.id === 'd' ? { ...x, proof: [{ type: 'file', ref: 'docs/implementazione.md#m3.9' }] } : x))
  assert.match(summarize(nodes, { current: 'd' }), /\nFile utili: docs\/implementazione\.md § m3\.9\n/)
})
