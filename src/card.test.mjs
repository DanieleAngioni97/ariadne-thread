import { test } from 'node:test'
import assert from 'node:assert/strict'

import { card, view, CARD_LIMIT } from './card.mjs'

// These tests read what ariadne writes in Italian; English has its own tests.
process.env.ARIADNE_LANG = 'it'

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

const OPEN = [
  n('q', { kind: 'decision', parent: 'm3', status: 'todo', title: 'Where to host?', what: 'GitHub or GitLab.' }),
  n('k', { kind: 'risk', parent: 'd', status: 'todo', title: 'Keys expire', what: 'Bedrock answers 403.' }),
  n('k2', { kind: 'risk', parent: 'm3', status: 'todo', title: 'Later risk', what: 'Not this milestone.' }),
  n('k3', { kind: 'risk', parent: 'c', status: 'done', title: 'Old risk', what: 'It did not happen.' }),
]

test('the card lists every open decision and the open risks of the milestone, after where you are', () => {
  const lines = card([...NODES, ...OPEN], { current: 'd' }, FILES).split('\n')
  const at = lines.indexOf('## Decisioni aperte')
  assert.deepEqual(lines.slice(at, at + 6), [
    '## Decisioni aperte',
    '- q Where to host?: GitHub or GitLab. (M3 Release)',
    '',
    '## Rischi aperti',
    '- k Keys expire: Bedrock answers 403. (su d Title d)',
    '',
  ])
  assert.ok(at < lines.indexOf('## M2 Design (active): Shape the tool.'))
  assert.ok(!lines.some(l => l.startsWith('- k [')), 'an open risk is not repeated among the steps')
  assert.ok(lines.includes('- k3 [rischio done] Old risk: It did not happen.'))
  assert.ok(!lines.some(l => l.includes('Later risk')))
})

test('an open risk does not keep a finished milestone open', () => {
  const nodes = NODES.map(x => (x.id === 'm1' ? { ...x, status: 'active' } : x))
  const lines = card([...nodes, n('k', { kind: 'risk', parent: 'a', status: 'todo', what: 'Watch it.' })], { current: 'd' }, FILES).split('\n')
  assert.ok(lines.includes('- M1 Research (done): Know the field.'))
})

test('the view labels decisions and risks on their line, for grep', () => {
  const lines = view([...NODES, ...OPEN], { current: 'd' }, FILES).split('\n')
  assert.ok(lines.includes('- q [decisione todo] Where to host?: GitHub or GitLab.'))
  assert.ok(lines.includes('- k2 [rischio todo] Later risk: Not this milestone.'))
})

test('a what that begins with the title does not repeat it', () => {
  const nodes = [...NODES, n('k', { kind: 'risk', parent: 'd', status: 'todo', title: 'Keys expire', what: 'Keys expire: Bedrock answers 403.' }), n('g', { parent: 'm2', status: 'todo', title: 'Ship it', what: 'Ship it: tag and push.' })]
  const lines = card(nodes, { current: 'd' }, FILES).split('\n')
  assert.ok(lines.includes('- k Keys expire: Bedrock answers 403. (su d Title d)'), lines.join('\n'))
  assert.ok(lines.includes('- g [todo] Ship it: tag and push.'), lines.join('\n'))
  const cut = card([...NODES, n('h', { parent: 'm2', status: 'todo', title: 'Launch one suite at…', what: 'Launch one suite at a time, slack first.' })], { current: 'd' }, FILES).split('\n')
  assert.ok(cut.includes('- h [todo] Launch one suite at a time, slack first.'), cut.join('\n'))
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

test('with no step started, as after init and a first plan, the card says so and points to the first ready step', () => {
  const plan = [
    n('m1', { kind: 'milestone', title: 'M1 Research', status: 'todo', what: 'Know the field.' }),
    n('a', { parent: 'm1', status: 'todo' }),
    n('b', { parent: 'm1', status: 'todo', after: ['a'] }),
  ]
  const text = card(plan, {}, new Map())
  assert.doesNotMatch(text, /undefined/)
  assert.match(text, /\nSei in: nessun passo avviato \(ariadne start <id>\)\n/)
  assert.match(text, /\nProssimo: a Title a\n/)
  assert.match(text, /\n## M1 Research \(todo\): Know the field\.\n- a \[todo\] Title a: a result\.\n/)
})

test('the card puts the open comments first, with how to answer', () => {
  const nodes = [...NODES, n('g', { parent: 'm2', status: 'todo', comments: [{ at: AT, text: 'Split it?' }] })]
  const lines = card(nodes, { current: 'd' }, FILES).split('\n')
  const at = lines.indexOf('## Commenti da leggere')
  assert.ok(at > 0 && at < lines.indexOf('## M2 Design (active): Shape the tool.'), lines.join('\n'))
  assert.equal(lines[at + 1], '- g Title g: «Split it?» (rispondi: ariadne answer g "…")')
})
