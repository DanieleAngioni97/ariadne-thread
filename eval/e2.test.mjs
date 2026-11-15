import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { checkpoints, gradeCheckpoint, observe, parseAlarms, summarize, variants } from './e2.mjs'
import { validate } from '../src/validate.mjs'

const scenario = JSON.parse(readFileSync(new URL('./scenarios/dev/dev-03.json', import.meta.url), 'utf8'))
const FAKE = fileURLToPath(new URL('./fakes/fake-claude.mjs', import.meta.url))
const SIDEFIX = { title: 'Fix the broken link checker timeout', what: 'The link checker timed out on slow hosts.' }

test('checkpoints are the commits that close a planned step with another step after it, spread over the scenario', () => {
  const all = checkpoints(scenario, 99)
  assert.ok(all.length >= 3)
  for (const i of all) {
    const e = scenario.events[i]
    assert.equal(e.type, 'commit')
    assert.equal(e.done, true)
    assert.ok(scenario.events.some(p => p.type === 'plan' && p.steps.some(s => s.key === e.step)), 'a planned step, not a detour')
  }
  const three = checkpoints(scenario, 3)
  assert.equal(three.length, 3)
  assert.deepEqual(checkpoints(scenario, 3), three)
})

test('the five graphs are valid and differ from F0 only where their error is', () => {
  const [index] = checkpoints(scenario, 1)
  const v = variants(scenario, index, SIDEFIX, mkdtempSync(join(tmpdir(), 'ariadne-e2-')))
  const text = nodes => nodes.map(n => JSON.stringify(n)).join('\n') + '\n'
  for (const f of ['F0', 'F1', 'F2', 'F3', 'F4']) assert.deepEqual(validate(text(v[f].nodes)), [], f)
  const changed = f => {
    const before = new Map(v.F0.nodes.map(n => [n.id, JSON.stringify(n)]))
    const after = new Map(v[f].nodes.map(n => [n.id, JSON.stringify(n)]))
    return [...new Set([...before.keys(), ...after.keys()])].filter(id => before.get(id) !== after.get(id)).sort()
  }
  const { step, next, detour, current } = v.meta.ids
  assert.deepEqual(changed('F1'), [next])
  assert.equal(v.F1.nodes.find(n => n.id === next).status, 'done')
  assert.deepEqual(changed('F2'), [step, next].sort())
  assert.equal(v.F2.thread.current, step)
  assert.deepEqual(changed('F3'), [detour])
  assert.ok(!v.F3.nodes.some(n => n.id === detour))
  assert.deepEqual(changed('F4'), [])
  assert.notEqual(v.F4.thread.current, v.F0.thread.current)
  assert.equal(v.F0.thread.current, current)
  assert.match(v.F0.view, /Fix the broken link checker timeout/)
  assert.equal(v.meta.errors.F3.step, SIDEFIX.title)
})

test('alarms come from a JSON reply; a reply without JSON has none and says so', () => {
  assert.deepEqual(parseAlarms('Looks off.\n{"alarms":[{"step":"Cache layer","type":"missing-work"}]}'), { alarms: [{ step: 'Cache layer', type: 'missing-work' }], ok: true })
  assert.deepEqual(parseAlarms('nothing here'), { alarms: [], ok: false })
})

test('the observer sends the turn and the view, and reads the alarms back', () => {
  const r = observe({ turn: 'Done.', view: '# Stato', model: 'fake', bin: FAKE, env: { FAKE_ANSWER: '{"alarms":[]}' } })
  assert.deepEqual(r.alarms, [])
  assert.equal(r.ok, true)
})

test('an error counts as found when the right step and type come in two runs of three; a false alarm on F0 likewise', () => {
  const meta = { errors: { F1: { step: 'Search index', type: 'done-not-done' }, F2: { step: 'Cache layer', type: 'missing-work' }, F3: { step: 'Fix the timeout', type: 'unrecorded-detour' }, F4: { step: 'Cache layer', type: 'wrong-current' } } }
  const a = (step, type) => ({ step, type })
  const runs = {
    F0: [[], [a('Cache layer', 'missing-work')], []],
    F1: [[a('Search index', 'done-not-done')], [a('Search index', 'done-not-done')], []],
    F2: [[a('Cache layer', 'wrong-current')], [a('Cache layer', 'wrong-current')], [a('Cache layer', 'missing-work')]],
    F3: [[a('Fix the timeout', 'unrecorded-detour')], [a('the timeout fix', 'unrecorded-detour')], []],
    F4: [[], [], []],
  }
  const g = gradeCheckpoint(meta, runs)
  assert.deepEqual(g.found, { F1: true, F2: false, F3: true, F4: false })
  assert.deepEqual(g.rightStepWrongType, { F1: false, F2: true, F3: false, F4: false })
  assert.equal(g.falseAlarm, false)
  assert.equal(gradeCheckpoint(meta, { ...runs, F0: [[a('x', 'missing-work')], [a('y', 'wrong-current')], []] }).falseAlarm, true)
})

test('the summary gives recall and false alarms with intervals by scenario, and applies the decision rule', () => {
  const g = (scenario, n, falseAlarm = false) => ({ scenario, found: { F1: n > 0, F2: n > 1, F3: n > 2, F4: n > 3 }, rightStepWrongType: { F1: false, F2: false, F3: false, F4: false }, falseAlarm })
  const all = summarize([g('a', 4), g('a', 4), g('b', 4), g('b', 4), g('c', 4), g('c', 4)])
  assert.equal(all.recall.value, 1)
  assert.deepEqual(all.recall.ci, [1, 1])
  assert.equal(all.passes, true)
  const weak = summarize([g('a', 1, true), g('a', 2), g('b', 2, true), g('b', 1), g('c', 2), g('c', 2)])
  assert.equal(weak.recall.value, 10 / 24)
  assert.equal(weak.falseAlarms.value, 2 / 6)
  assert.equal(weak.passes, false)
  assert.equal(weak.recall.byType['done-not-done'], 1)
})
