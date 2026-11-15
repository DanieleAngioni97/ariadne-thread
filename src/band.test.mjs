import { test } from 'node:test'
import assert from 'node:assert/strict'

import { band, cut } from './band.mjs'

// These tests read what ariadne writes in Italian; English has its own tests.
process.env.ARIADNE_LANG = 'it'

const line = n => JSON.stringify({ by: 'agent', at: '2026-11-11', proof: [{ type: 'message', ref: 'chat' }], what: n.title, ...n })
const graph = nodes => nodes.map(line).join('\n') + '\n'

const plan = [
  { id: 'm1', kind: 'milestone', title: 'M1 Implementazione', status: 'active', confirmed: { at: '2026-11-11', ref: 'chat' } },
  { id: 's1', kind: 'step', title: 'Viewer', status: 'done', parent: 'm1' },
  { id: 's2', kind: 'step', title: 'Banda nella mod', status: 'active', parent: 'm1', after: ['s1'] },
  { id: 's3', kind: 'step', title: 'Segnalibri', status: 'todo', parent: 'm1', after: ['s2'] },
]

test('the where row: containers, the current node in bold, then what comes next', () => {
  const [where] = band({ text: graph(plan), thread: { current: 's2' }, log: [] })
  assert.deepEqual(where, { kind: 'where', before: 'M1 Implementazione › ', current: 'Banda nella mod', after: ' · prossimo: Segnalibri', actions: [{ label: 'Apri il grafo', run: ['open'] }] })
})

test('titles are cut with … at the spec widths', () => {
  assert.equal(cut('abcdef', 4), 'abc…')
  assert.equal(cut('abc', 4), 'abc')
  const long = plan.map(n => (n.id === 'm1' ? { ...n, title: 'M1 Una milestone dal titolo molto lungo' } : n))
  const [where] = band({ text: graph(long), thread: { current: 's2' }, log: [] })
  assert.equal(where.before, 'M1 Una milestone dal ti… › ')
})

test('an open detour shows where it returns, with the button and the phrase that closes it', () => {
  const nodes = [...plan, { id: 'd1', kind: 'detour', title: 'Albero sporco', status: 'active', parent: 'm1', reentry: 's2' }]
  const rows = band({ text: graph(nodes), thread: { current: 'd1' }, log: [] })
  assert.equal(rows[0].after, '')
  assert.deepEqual(rows[1], { kind: 'context', text: '⤷ deviazione · rientro: Banda nella mod', actions: [{ label: 'Chiudi e torna', say: 'torna' }] })
})

test('inside a list the context row counts the decided points', () => {
  const nodes = [
    ...plan,
    { id: 'l1', kind: 'list', title: 'Punti della review', status: 'active', parent: 's2' },
    { id: 'p1', kind: 'point', title: 'Primo', status: 'done', parent: 'l1' },
    { id: 'p2', kind: 'point', title: 'Secondo', status: 'active', parent: 'l1' },
  ]
  const rows = band({ text: graph(nodes), thread: { current: 'p2' }, log: [] })
  assert.equal(rows[0].before, 'M1 Implementazione › Banda nella mod › ')
  assert.deepEqual(rows[1], { kind: 'context', text: '↩ Punti della review (1/2 decisi)', actions: [{ label: 'Torna alla lista', say: 'torna' }] })
})

test('detours left open elsewhere show as reentries in waiting', () => {
  const nodes = [...plan, { id: 'd1', kind: 'detour', title: 'Albero sporco', status: 'todo', parent: 'm1', reentry: 's1' }]
  const rows = band({ text: graph(nodes), thread: { current: 's2' }, log: [] })
  assert.deepEqual(rows[1], { kind: 'context', text: '⤷ 1 rientri in sospeso: Albero sporco → Viewer', actions: [] })
})

test('the queue first counts what waits, then goes through it one item at a time', () => {
  const nodes = [...plan, { id: 'x1', kind: 'step', title: 'Passo aggiunto da solo', status: 'todo', parent: 'm1', review: 'confirm' },
    { id: 'x2', kind: 'detour', title: 'Deviazione', status: 'done', parent: 'm1', review: 'confirm' }]
  const text = graph(nodes)
  const queue = band({ text, thread: { current: 's2' }, log: [] }).find(r => r.kind === 'queue')
  assert.deepEqual(queue, {
    kind: 'queue', text: '⏎ Mentre eri via: 2 da confermare',
    actions: [{ label: 'Approva tutto', run: ['confirm', '--all'] }, { label: 'Rivedi una per una', review: 0 }],
  })
  const second = band({ text, thread: { current: 's2' }, log: [], review: 1 }).find(r => r.kind === 'queue')
  assert.deepEqual(second, {
    kind: 'queue', text: '⏎ Da confermare 2/2: x2 Deviazione',
    actions: [{ label: 'Approva', run: ['confirm', 'x2'] }, { label: 'Rifiuta', run: ['reject', 'x2'] }, { label: 'Mostra nel grafo', open: 'x2' }],
  })
  const past = band({ text, thread: { current: 's2' }, log: [], review: 5 }).find(r => r.kind === 'queue')
  assert.equal(past.text, '⏎ Mentre eri via: 2 da confermare')
})

test('the last row is the latest outcome, or the first broken rule of an invalid graph', () => {
  const log = [{ text: 'iniziato s1' }, { text: 'chiuso s1 Viewer: fatto' }]
  assert.deepEqual(band({ text: graph(plan), thread: { current: 's2' }, log }).at(-1), { kind: 'outcome', text: '↺ chiuso s1 Viewer: fatto', actions: [] })
  const broken = graph(plan) + '{"id":"zz","kind":"step","title":"Rotto","status":"done"}\n'
  const rows = band({ text: broken, thread: { current: 's2' }, log })
  assert.equal(rows[0].current, 'Banda nella mod')
  assert.equal(rows.at(-1).kind, 'error')
  assert.match(rows.at(-1).text, /^⚠ grafo non valido: riga 5 zz \[what\] R5: .+ \(\+\d+\)$/)
})

test('with no graph the band says how one is born', () => {
  assert.deepEqual(band({ text: null, thread: null, log: [] }), [
    { kind: 'empty', text: "ariadne: nessun grafo in .ariadne/ · l'agente lo crea con il primo piano", actions: [] },
  ])
})
