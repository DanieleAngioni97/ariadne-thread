import { test } from 'node:test'
import assert from 'node:assert/strict'

import { card, view, CARD_LIMIT } from './card.mjs'

const AT = '2026-11-15'
const n = (id, fields) => ({ id, kind: 'step', title: `Title ${id}`, status: 'done', what: `${id} result.`, by: 'agent', at: AT, ...fields })

const NODES = [
  n('m1', { kind: 'milestone', title: 'M1 Research', what: 'Know the field.' }),
  n('a', { parent: 'm1', proof: [{ type: 'commit', ref: 'aaa1111' }] }),
  n('b', { parent: 'm1', after: ['a'], status: 'replaced', replaced_by: 'c', why: 'too slow' }),
  n('m2', { kind: 'milestone', title: 'M2 Design', status: 'active', after: ['m1'], what: 'Shape the tool.' }),
  n('c', { parent: 'm2', why: 'the measured choice', proof: [{ type: 'commit', ref: 'ccc3333' }, { type: 'file', ref: 'docs/c.md#Why' }] }),
  n('d', { parent: 'm2', status: 'active', after: ['c'], detail: 'Left: the tests.', proof: [{ type: 'commit', ref: 'ddd4444' }] }),
  n('e', { parent: 'm2', status: 'todo', after: ['d'], what: 'Title e' }),
  n('f', { parent: 'm2', status: 'deferred', deferred_to: 'm3' }),
  n('m3', { kind: 'milestone', title: 'M3 Release', status: 'todo', after: ['m2'], what: 'Ship it.' }),
]
const FILES = new Map([['aaa1111', ['src/a/index.js']], ['ccc3333', ['src/c/index.js', '.ariadne/graph.jsonl']], ['ddd4444', ['src/d/run.js']]])

test('the card puts the open step first, then its milestone in full, the changed decisions and the other milestones', () => {
  assert.equal(card(NODES, { current: 'd' }, FILES), [
    '# Stato del lavoro (scheda generata da ariadne)',
    'Sei in: M2 Design › Title d (active)',
    'Resta da fare: Left: the tests.',
    'Prossimo: e Title e',
    'Rientri in sospeso: nessuno',
    '',
    '## M2 Design (active): Shape the tool.',
    '- c [done] Title c: c result. · perché: the measured choice · file: docs/c.md § Why, src/c/index.js',
    '- d [active] Title d: d result. · file: src/d/run.js',
    '- e [todo] Title e',
    '- f [deferred → M3 Release] Title f: f result.',
    '',
    '## Decisioni sostituite e rinvii',
    '- b Title b → sostituito da c Title c',
    '- f Title f → rinviato a M3 Release',
    '',
    '## Altre milestone',
    '- M1 Research (done): Know the field.',
    '- M3 Release (todo): Ship it.',
    '',
    'Tutti i passi, una riga ciascuno: .ariadne/STATE.md',
  ].join('\n'))
})

test('the view lists every milestone in full, one greppable line per node', () => {
  const lines = view(NODES, { current: 'd' }, FILES).split('\n')
  assert.ok(lines.includes('## M1 Research (done): Know the field.'))
  assert.ok(lines.includes('- a [done] Title a: a result. · file: src/a/index.js'))
  assert.ok(lines.includes('- b [replaced → c Title c] Title b: b result. · perché: too slow'))
  assert.ok(lines.includes('## M3 Release (todo): Ship it.'))
  assert.ok(!lines.includes('## Altre milestone'))
})

test('the card stays under its limit: the other milestones and the done steps lose their details first', () => {
  const long = 'x'.repeat(300)
  const many = [...NODES, ...Array.from({ length: 20 }, (_, i) => n(`g${i}`, { parent: 'm2', what: long, why: long }))]
  const text = card(many, { current: 'd' }, FILES)
  assert.ok(text.length <= CARD_LIMIT, `${text.length} > ${CARD_LIMIT}`)
  assert.ok(text.includes('Resta da fare: Left: the tests.'))
  assert.ok(text.includes('- d [active] Title d: d result. · file: src/d/run.js'))
  assert.ok(text.includes('- g19 [done] Title g19'))
})

test('the card says so when the open step is missing from the graph', () => {
  assert.match(card(NODES, { current: 'zz' }, FILES), /Sei in: zz \(nodo non trovato nel grafo\)/)
})

test('a milestone shows the state of its steps: no one closes a milestone by hand', () => {
  const nodes = NODES.map(x => (x.kind === 'milestone' ? { ...x, status: 'todo' } : x))
  const text = card(nodes, { current: 'd' }, FILES)
  assert.match(text, /\n## M2 Design \(active\): /)
  assert.match(text, /\n- M1 Research \(done\): /)
  assert.match(text, /\n- M3 Release \(todo\): /)
})
