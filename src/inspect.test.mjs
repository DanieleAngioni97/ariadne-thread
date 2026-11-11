import { test } from 'node:test'
import assert from 'node:assert/strict'

import { show, why } from './inspect.mjs'

const AT = '2026-11-11'
const n = (id, fields) => ({ id, kind: 'step', title: `Title ${id}`, status: 'done', what: `${id} result.`, by: 'agent', at: AT, ...fields })

const NODES = [
  n('m1', { kind: 'milestone', title: 'M1' }),
  n('a', { parent: 'm1', why: 'because a' }),
  n('b', { parent: 'm1', after: ['a'] }),
  n('c', {
    parent: 'm1', after: ['b'], status: 'active', why: 'because c', detail: 'docs/plan.md § c', by: 'user',
    proof: [{ type: 'commit', ref: 'abc123' }, { type: 'file', ref: 'docs/c.md' }],
    confirmed: { at: AT, ref: 'banda' },
  }),
]

test('show prints only the rows that have a value, in the panel order', () => {
  assert.equal(show(NODES, 'c'), [
    'c — Title c',
    'Cosa: c result.',
    'Perché: because c',
    'Dettaglio: docs/plan.md § c',
    'Stato: active',
    'Prova: commit: abc123 · file: docs/c.md',
    `Deciso da: da te, ${AT}`,
    `Confermato: da te il ${AT} (banda)`,
  ].join('\n'))
})

test('show marks uncertain proof, the agent as author and links to other nodes', () => {
  const text = show([...NODES, n('d', { uncertain: 'historical node', deferred_to: 'c', continues: 'a', reentry: 'b', replaced_by: 'c' })], 'd')
  assert.match(text, /\nProva: —\nIncerto: historical node\nDeciso da: agente, /)
  for (const row of ['Rientra in: b', 'Rimandato a: c', 'Riprende: a', 'Sostituito da: c']) assert.ok(text.includes(row), row)
})

test('show says when the agent decided a change without your confirmation', () => {
  const nodes = [n('r', { status: 'todo', review: 'confirm' })]
  assert.match(show(nodes, 'r'), /\nDa confermare: deciso dall'agente senza la tua conferma \(ariadne confirm r\)/)
})

test('show returns null for an unknown node', () => {
  assert.equal(show(NODES, 'ghost'), null)
})

test('why walks the dependencies back, nearest first, with their reasons', () => {
  assert.equal(why(NODES, 'c'), [
    'c Title c: c result. — perché: because c',
    'Viene da:',
    '- b Title b: b result.',
    '- a Title a: a result. — perché: because a',
  ].join('\n'))
})

test('why marks unfinished dependencies and stops at ten', () => {
  const chain = Array.from({ length: 12 }, (_, i) => n(`s${i}`, { after: i ? [`s${i - 1}`] : [], status: i === 10 ? 'deferred' : 'done' }))
  const lines = why(chain, 's11').split('\n')
  assert.equal(lines.filter(l => l.startsWith('- ')).length, 10)
  assert.ok(lines.includes('- s10 Title s10: s10 result. [deferred]'))
  assert.equal(lines.at(-1), '(+1: ariadne why s1)')
})

test('why returns null for an unknown node', () => {
  assert.equal(why(NODES, 'ghost'), null)
})
