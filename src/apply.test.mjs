import { test } from 'node:test'
import assert from 'node:assert/strict'

import { apply } from './apply.mjs'
import { parse } from './graph.mjs'

// These tests read what ariadne writes in Italian; English has its own tests.
process.env.ARIADNE_LANG = 'it'

const AT = '2026-11-11T10:00'
const PLAN = [{ type: 'message', ref: 'chat 2026-11-11: plan approved' }]
const n = (id, fields) => ({ id, kind: 'step', title: `Title ${id}`, status: 'done', what: `${id} result.`, proof: PLAN, by: 'agent', at: '2026-11-11', ...fields })
const OK = { at: '2026-11-11', ref: 'chat' }

const NODES = [
  n('m1', { kind: 'milestone', title: 'M1', status: 'active', confirmed: OK }),
  n('a', { parent: 'm1' }),
  n('b', { parent: 'm1', status: 'active', after: ['a'] }),
  n('c', { parent: 'm1', status: 'todo', after: ['b'] }),
  n('m2', { kind: 'milestone', title: 'M2', status: 'todo', after: ['m1'], confirmed: OK }),
]
const TEXT = NODES.map(x => JSON.stringify(x)).join('\n') + '\n'
const THREAD = { project: 'p', current: 'b', profile: 'standard' }

const run = (ops, { text = TEXT, thread = THREAD, by } = {}) => apply({ text, thread, ops, at: AT, by })
const ok = (ops, opts) => {
  const r = run(ops, opts)
  assert.equal(r.ok, true, JSON.stringify(r.errors))
  return { ...r, get: id => parse(r.text).find(x => x.id === id) }
}

test('untouched lines stay byte for byte, new nodes go at the end', () => {
  const r = ok([{ op: 'add', node: { kind: 'step', title: 'New', what: 'A new step.', parent: 'm1' } }])
  const before = TEXT.trimEnd().split('\n')
  const after = r.text.trimEnd().split('\n')
  assert.deepEqual(after.slice(0, before.length), before)
  assert.equal(after.length, before.length + 1)
  assert.equal(JSON.parse(after.at(-1)).title, 'New')
})

test('the same operations on the same graph give the same text', () => {
  const ops = [{ op: 'plan', parent: 'm2', titles: ['X', 'Y'], ref: 'chat: ok' }]
  assert.equal(ok(ops).text, ok(ops).text)
})

test('plan adds todo steps in a chain, signed by you, with the approval as proof', () => {
  const r = ok([{ op: 'plan', parent: 'm2', titles: ['Write', 'Ship'], ref: 'chat 2026-11-11: ok al piano' }])
  const [w, s] = parse(r.text).slice(NODES.length)
  assert.deepEqual([w.id, w.status, w.parent, w.by, w.after], ['m2.1', 'todo', 'm2', 'user', undefined])
  assert.deepEqual([s.id, s.after], ['m2.2', ['m2.1']])
  assert.deepEqual(w.proof, [{ type: 'message', ref: 'chat 2026-11-11: ok al piano' }])
  assert.equal(r.log[0].text, 'piano per M2: Write → Ship')
})

test('a plan under the current node starts its first step; under another node it moves nothing', () => {
  const here = ok([{ op: 'plan', parent: 'm1', titles: ['More', 'Again'], ref: 'chat: ok' }], { thread: { ...THREAD, current: 'm1' } })
  assert.equal(here.thread.current, 'm1.1')
  assert.equal(here.get('m1.1').status, 'active')
  assert.equal(here.get('m1.2').status, 'todo')
  assert.deepEqual(here.log.map(l => l.text), ['piano per M1: More → Again', 'iniziato m1.1 More'])
  const elsewhere = ok([{ op: 'plan', parent: 'm2', titles: ['Write'], ref: 'chat: ok' }])
  assert.equal(elsewhere.thread.current, 'b')
  assert.equal(elsewhere.get('m2.1').status, 'todo')
})

test('a commit or a file settles an uncertain node; a chat message alone does not', () => {
  const text = TEXT + JSON.stringify(n('h', { parent: 'm1', proof: [], uncertain: 'historical node, no proof found in the trace' })) + '\n'
  const chat = ok([{ op: 'fill', id: 'h', proof: [{ type: 'message', ref: 'chat' }] }], { text })
  assert.equal(chat.get('h').uncertain, 'historical node, no proof found in the trace')
  const file = ok([{ op: 'fill', id: 'h', proof: [{ type: 'file', ref: 'docs/research.md' }] }], { text })
  assert.equal(file.get('h').uncertain, undefined)
  assert.deepEqual(file.get('h').proof, [{ type: 'file', ref: 'docs/research.md' }])
})

test('close records the result and its proof, then starts the next step', () => {
  const r = ok([{ op: 'close', id: 'b', what: 'B is done.', proof: [{ type: 'commit', ref: 'abc1234' }] }])
  assert.equal(r.get('b').status, 'done')
  assert.equal(r.get('b').what, 'B is done.')
  assert.deepEqual(r.get('b').proof.at(-1), { type: 'commit', ref: 'abc1234' })
  assert.equal(r.get('c').status, 'active')
  assert.equal(r.thread.current, 'c')
  assert.deepEqual(r.log.map(l => l.text), ['chiuso b Title b: B is done.', 'iniziato c Title c'])
  assert.deepEqual(r.log[0].proof, [{ type: 'commit', ref: 'abc1234' }])
})

test('close needs a proof', () => {
  const r = run([{ op: 'close', id: 'b', what: 'B is done.' }])
  assert.equal(r.ok, false)
  assert.match(r.errors[0], /R3/)
})

test('closing the last step of a level goes back to its container', () => {
  const r = ok([{ op: 'close', id: 'c', what: 'C.', proof: PLAN }], { thread: { ...THREAD, current: 'c' } })
  assert.equal(r.thread.current, 'm1')
})

const DECISION = n('d', { kind: 'decision', parent: 'm1', status: 'todo', title: 'Where to host?', what: 'GitHub or GitLab.' })
const RISK = n('r', { kind: 'risk', parent: 'b', status: 'todo', title: 'Merge conflicts', what: 'Expect add/add on STATE.md.' })
const withNodes = (...extra) => [...NODES, ...extra].map(x => JSON.stringify(x)).join('\n') + '\n'

test('a decision and a risk are not work: start refuses them', () => {
  for (const id of ['d', 'r']) {
    const r = run([{ op: 'start', id }], { text: withNodes(DECISION, RISK) })
    assert.equal(r.ok, false, id)
    assert.match(r.errors[0], new RegExp(`start ${id}`))
  }
})

test('a decision closes only with the user\'s word: a message', () => {
  const text = withNodes(DECISION)
  const refused = run([{ op: 'close', id: 'd', what: 'GitHub.', proof: [{ type: 'commit', ref: 'abc1234' }] }], { text })
  assert.equal(refused.ok, false)
  assert.match(refused.errors[0], /close d/)
  const r = ok([{ op: 'close', id: 'd', what: 'GitHub.', proof: [{ type: 'message', ref: 'chat 2026-11-11: GitHub' }] }], { text })
  assert.deepEqual([r.get('d').status, r.get('d').what, r.thread.current], ['done', 'GitHub.', 'b'])
})

test('closing a step does not move onto a decision or a risk, nor onto what waits for a decision', () => {
  const c = n('c', { parent: 'm1', status: 'todo', after: ['d'] })
  const text = [...NODES.filter(x => x.id !== 'c'), { ...DECISION, after: ['b'] }, RISK, c].map(x => JSON.stringify(x)).join('\n') + '\n'
  const r = ok([{ op: 'close', id: 'b', what: 'B.', proof: PLAN }], { text })
  assert.equal(r.thread.current, 'm1')
  assert.deepEqual(['d', 'r', 'c'].map(id => r.get(id).status), ['todo', 'todo', 'todo'])
})

test('add risk hangs it on where you are; the log names the kind', () => {
  const r = ok([{ op: 'add', node: { kind: 'risk', title: 'Keys expire', what: 'Bedrock answers 403.' } }, { op: 'add', node: { kind: 'decision', title: 'Host?', what: 'GitHub or GitLab.' } }])
  assert.deepEqual([r.get('b.1').kind, r.get('b.1').parent, r.get('b.1').review], ['risk', 'b', undefined])
  assert.deepEqual(r.log.map(l => l.text), ['aggiunto rischio b.1 Keys expire sotto b', 'aggiunto decisione b.2 Host? sotto b'])
})

test('a detour starts where you are and closing it goes back there', () => {
  const r1 = ok([{ op: 'add', node: { kind: 'detour', title: 'Side', what: 'Check a side question.', start: true } }])
  const d = r1.get('m1.1')
  assert.deepEqual([d.parent, d.reentry, d.status, d.review], ['m1', 'b', 'active', 'confirm'])
  assert.equal(r1.thread.current, 'm1.1')
  assert.equal(r1.log[0].text, 'deviazione m1.1 Side, rientra in b')
  const r2 = ok([{ op: 'close', id: 'm1.1', what: 'Answered.', proof: PLAN }], { text: r1.text, thread: r1.thread })
  assert.equal(r2.thread.current, 'b')
  assert.equal(r2.get('b').status, 'active')
})

test('structure decided by the agent waits for confirmation, a detail does not', () => {
  const r = ok([
    { op: 'add', node: { kind: 'milestone', title: 'M3', what: 'Later.' } },
    { op: 'add', node: { kind: 'point', title: 'Clue', what: 'The log shows X.', parent: 'b' } },
  ])
  assert.equal(r.get('m3').review, 'confirm')
  assert.equal(r.get('b.1').review, undefined)
  assert.equal(r.get('b.1').by, 'agent')
})

test('a deduction points to its premises and why walks back through them', () => {
  const r = ok([
    { op: 'add', node: { id: 'k1', kind: 'point', title: 'Clue 1', what: 'The cache is cold at 9:00.', parent: 'b' } },
    { op: 'add', node: { id: 'k2', kind: 'point', title: 'Clue 2', what: 'Slow requests start at 9:00.', parent: 'b' } },
    { op: 'add', node: { id: 'k3', kind: 'point', title: 'Deduction', what: 'The cold cache causes the slowness.', parent: 'b', after: ['k1', 'k2'], why: 'same time' } },
  ])
  assert.deepEqual(r.get('k3').after, ['k1', 'k2'])
  assert.equal(r.log[2].text, 'aggiunto punto k3 Deduction sotto b, da k1, k2')
})

test('defer creates the node that resumes it in a later milestone', () => {
  const r = ok([{ op: 'defer', id: 'c', to: 'm2' }])
  assert.equal(r.get('c').status, 'deferred')
  assert.equal(r.get('c').deferred_to, 'm2.1')
  const resume = r.get('m2.1')
  assert.deepEqual([resume.status, resume.continues, resume.title, resume.parent], ['todo', 'c', 'Title c', 'm2'])
  assert.equal(r.get('c').review, 'confirm')
  assert.equal(r.log[0].text, 'rinviato c Title c a M2 (m2.1)')
})

test('replace points to the successor', () => {
  const r = ok([{ op: 'replace', id: 'c', by: 'a' }])
  assert.deepEqual([r.get('c').status, r.get('c').replaced_by, r.get('c').review], ['replaced', 'a', 'confirm'])
})

test('confirm signs the node; reject keeps it, replaced, with a trace', () => {
  const r1 = ok([{ op: 'add', node: { id: 'x', kind: 'milestone', title: 'MX', what: 'X.' } }, { op: 'add', node: { id: 'y', kind: 'detour', title: 'Y', what: 'Y.', parent: 'm1', reentry: 'b' } }])
  const r2 = ok([{ op: 'confirm', id: 'x' }, { op: 'reject', id: 'y' }], { text: r1.text, thread: r1.thread, by: 'user' })
  assert.equal(r2.get('x').review, undefined)
  assert.deepEqual(r2.get('x').confirmed, { at: AT, ref: 'chat' })
  assert.deepEqual([r2.get('y').status, r2.get('y').replaced_by, r2.get('y').review], ['replaced', 'm1', undefined])
  assert.equal(r2.log[1].text, 'rifiutato y Y: resta tracciato fuori dal piano')
})

test('confirm all clears the whole queue', () => {
  const r1 = ok([{ op: 'replace', id: 'c', by: 'a' }, { op: 'add', node: { kind: 'milestone', title: 'M3', what: 'Later.' } }])
  const r2 = ok([{ op: 'confirm', all: true }], { text: r1.text, thread: r1.thread, by: 'user' })
  assert.equal(parse(r2.text).filter(x => x.review).length, 0)
  assert.equal(r2.log[0].text, 'confermate 2 modifiche')
})

test('start reopens a done node and the log says so', () => {
  const r = ok([{ op: 'start', id: 'a' }])
  assert.equal(r.get('a').status, 'active')
  assert.equal(r.thread.current, 'a')
  assert.equal(r.log[0].text, 'riaperto a Title a')
})

test('pause puts the current step back among the todo ones and the thread on its parent', () => {
  const r = ok([{ op: 'pause', id: 'b' }])
  assert.equal(r.get('b').status, 'todo')
  assert.equal(r.thread.current, 'm1')
  assert.equal(r.log[0].text, 'rimesso tra i da fare b Title b')
})

test('pause of a step started by mistake elsewhere leaves the thread where it is', () => {
  const text = TEXT.replace('"id":"c","kind":"step","title":"Title c","status":"todo"', '"id":"c","kind":"step","title":"Title c","status":"active"')
  const r = ok([{ op: 'pause', id: 'c' }], { text })
  assert.equal(r.get('c').status, 'todo')
  assert.equal(r.thread.current, 'b')
})

test('pause refuses a step that is not started', () => {
  assert.equal(run([{ op: 'pause', id: 'c' }]).errors[0], 'pause c: il passo non è avviato (è todo)')
  assert.equal(run([{ op: 'pause', id: 'a' }]).errors[0], 'pause a: il passo non è avviato (è done)')
})

test('fill adds descriptive fields and a proof only once', () => {
  const proof = [{ type: 'commit', ref: 'abc1234' }]
  const r1 = ok([{ op: 'fill', id: 'b', why: 'Because.', proof }])
  const r2 = ok([{ op: 'fill', id: 'b', proof }], { text: r1.text, thread: r1.thread })
  assert.equal(r2.get('b').why, 'Because.')
  assert.equal(r2.get('b').proof.filter(p => p.ref === 'abc1234').length, 1)
  assert.equal(r2.log.length, 0)
})

test('closing a node already done only adds the proof', () => {
  const r = ok([{ op: 'close', id: 'a', what: 'Again.', proof: [{ type: 'commit', ref: 'abc1234' }] }])
  assert.equal(r.get('a').what, 'a result.')
  assert.equal(r.thread.current, 'b')
  assert.equal(r.log[0].text, 'prova per a: commit abc1234')
})

test('move is your correction and can be undone once', () => {
  const r1 = ok([{ op: 'move', id: 'c', parent: 'm2' }], { by: 'user' })
  assert.equal(r1.get('c').parent, 'm2')
  assert.equal(r1.log[0].text, 'spostato c sotto m2 (correzione tua)')
  const r2 = ok([{ op: 'undo' }], { text: r1.text, thread: r1.thread, by: 'user' })
  assert.equal(r2.get('c').parent, 'm1')
  assert.deepEqual(r2.get('c').after, ['b'])
  assert.equal(r2.thread.last_correction, undefined)
  assert.equal(r2.log[0].text, 'annullato: c torna sotto m1')
})

test('undo is refused when the node changed after the correction', () => {
  const r1 = ok([{ op: 'move', id: 'c', parent: 'm2' }, { op: 'fill', id: 'c', why: 'Later.' }], { by: 'user' })
  const r2 = run([{ op: 'undo' }], { text: r1.text, thread: r1.thread })
  assert.equal(r2.ok, false)
  assert.equal(r2.errors[0], 'Non posso annullarla: c è cambiato dopo. Dimmi dove spostarlo.')
})

test('a result that breaks a rule is refused whole and nothing changes', () => {
  const r = run([{ op: 'start', id: 'c' }, { op: 'add', node: { kind: 'step', title: 'Bad', what: '', parent: 'm1' } }])
  assert.equal(r.ok, false)
  assert.match(r.errors[0], /\[what\]/)
})

test('unknown operations and unknown nodes are refused', () => {
  assert.match(run([{ op: 'delete', id: 'a' }]).errors[0], /operazione sconosciuta: delete/)
  assert.match(run([{ op: 'start', id: 'ghost' }]).errors[0], /nodo ghost non trovato/)
})

test('none changes nothing', () => {
  const r = ok([{ op: 'none' }])
  assert.equal(r.text, TEXT)
  assert.deepEqual(r.log, [])
})

test('an unreadable graph is refused before any operation', () => {
  const r = run([{ op: 'start', id: 'c' }], { text: TEXT + 'not json\n' })
  assert.equal(r.ok, false)
  assert.equal(r.errors[0], 'grafo non valido alla riga 6: correggilo prima di cambiarlo')
})

test('relink points the file proofs of a moved file or folder to where it is now, sections kept', () => {
  const nodes = [
    n('x', { proof: [{ type: 'file', ref: 'spikes/viewer' }, { type: 'commit', ref: 'abc' }] }),
    n('y', { proof: [{ type: 'file', ref: 'spikes/viewer/app.js#Proof' }, { type: 'file', ref: 'spikes/viewerx.md' }] }),
    n('z'),
  ]
  const text = nodes.map(x => JSON.stringify(x)).join('\n') + '\n'
  const r = ok([{ op: 'relink', from: 'spikes/viewer', to: 'viewer' }], { text, thread: { current: 'z' } })
  const [x, y] = parse(r.text)
  assert.deepEqual(x.proof, [{ type: 'file', ref: 'viewer' }, { type: 'commit', ref: 'abc' }])
  assert.deepEqual(y.proof, [{ type: 'file', ref: 'viewer/app.js#Proof' }, { type: 'file', ref: 'spikes/viewerx.md' }])
  assert.equal(r.text.split('\n')[2], JSON.stringify(nodes[2]))
  assert.deepEqual(r.log.map(e => e.text), ['ricollegato spikes/viewer → viewer in 2 nodi (x, y)'])
  assert.match(run([{ op: 'relink', from: 'nowhere', to: 'x' }], { text }).errors[0], /nessuna prova punta a nowhere/)
})

test('a title is a few words: a long one is refused, so the details go in what', () => {
  const long = 'Migrazione guidata: Next e passi aperti diventano nodi, la storia resta leggibile, i file vanno in un archivio'
  for (const ops of [
    [{ op: 'plan', parent: 'm2', titles: [long], ref: 'chat: ok' }],
    [{ op: 'add', node: { kind: 'step', title: long, what: 'x', parent: 'm1' } }],
    [{ op: 'fill', id: 'c', title: long }],
  ]) {
    const r = run(ops)
    assert.equal(r.ok, false, ops[0].op)
    assert.match(r.errors.join('\n'), /titolo troppo lungo \(\d+ caratteri, massimo 80\)/, ops[0].op)
  }
})

test('plan takes a detail for each step, so a short title keeps its explanation', () => {
  const r = ok([{ op: 'plan', parent: 'm2', titles: [{ title: 'Doctor', what: 'Lists the conflicting sources' }, 'Ship'], ref: 'chat: ok' }])
  const steps = parse(r.text).filter(x => x.parent === 'm2')
  assert.deepEqual(steps.map(x => [x.title, x.what]), [['Doctor', 'Lists the conflicting sources'], ['Ship', 'Ship']])
})
