import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { generate } from './generate.mjs'
import { promptFor, schedule, settingsFor, trial } from './run.mjs'

const scenario = JSON.parse(readFileSync(new URL('./scenarios/dev/dev-01.json', import.meta.url), 'utf8'))
const FAKE = fileURLToPath(new URL('./fakes/fake-claude.mjs', import.meta.url))
const fixture = generate(scenario, mkdtempSync(join(tmpdir(), 'ariadne-eval-')))
writeFileSync(join(fixture.dir, 'prima', 'STATE.md'), '# State\n\nNext: Validate invoice totals.\n')
const q = cat => fixture.questions.find(x => x.cat === cat)
const at = (condition, question, env = {}) => trial({ fixture: fixture.dir, condition, q: question, key: fixture.key, model: 'fake', bin: FAKE, env, seed: 1 })

test('the condition instructions differ in length by at most 10%', () => {
  const [a, b] = ['prima', 'ariadne'].map(c => readFileSync(new URL(`./conditions/${c}.md`, import.meta.url), 'utf8').length)
  assert.ok(Math.abs(a - b) / Math.min(a, b) <= 0.1, `${a} vs ${b}`)
})

test('the prompt asks for one RISPOSTA line; why lists the shuffled options by letter', () => {
  assert.match(promptFor(q('proof')), /^Which file holds the result of the lexer step\?\n\n.*RISPOSTA: <answer>.*RISPOSTA: non risulta/s)
  const order = ['X', 'Y', 'Z', 'W', 'non risulta']
  assert.match(promptFor(q('why'), order), /\nA\) X\nB\) Y\nC\) Z\nD\) W\nE\) non risulta\n/)
  assert.doesNotMatch(promptFor(q('continue')), /RISPOSTA/)
})

test('settings give each condition its hooks and allowed commands; Continua adds the edit tools', () => {
  const prima = settingsFor('prima', { injectDir: '/runs/x' })
  assert.deepEqual(Object.keys(prima.hooks), ['SessionStart'])
  assert.match(prima.hooks.SessionStart[0].hooks[0].command, /cat STATE\.md/)
  const ariadne = settingsFor('ariadne', { injectDir: '/runs/x', edits: true })
  assert.deepEqual(Object.keys(ariadne.hooks), ['SessionStart', 'UserPromptSubmit'])
  assert.ok(ariadne.permissions.allow.includes('Bash(node .ariadne/cli/bin/ariadne.mjs why:*)'))
  assert.ok(!prima.permissions.allow.some(r => r.includes('ariadne')))
  assert.ok(ariadne.permissions.allow.includes('Edit') && !prima.permissions.allow.includes('Edit'))
  assert.ok(prima.permissions.deny.includes('Bash(git diff --no-index:*)'))
})

test('a trial grades the answer, checks the injection and counts tokens as if nothing were cached', () => {
  const r = at('ariadne', q('where'), { FAKE_ANSWER: 'Looked.\nRISPOSTA: Validate invoice totals, then Report malformed invoices' })
  assert.equal(r.status, 'correct')
  assert.deepEqual(r.injected, { SessionStart: true, UserPromptSubmit: true })
  assert.equal(r.tokens, 1115)
  assert.equal(r.excluded, null)
})

test('a trial is excluded when a tool reaches outside the copy, or when nothing was injected', () => {
  assert.equal(at('ariadne', q('proof'), { FAKE_TOOL_PATH: '/etc/hosts', FAKE_ANSWER: 'RISPOSTA: src/lexer/index.js' }).excluded, 'outside')
  const bare = generate(scenario, mkdtempSync(join(tmpdir(), 'ariadne-eval-')))
  const r = trial({ fixture: bare.dir, condition: 'prima', q: q('proof'), key: bare.key, model: 'fake', bin: FAKE, env: { FAKE_ANSWER: 'RISPOSTA: src/lexer/index.js' }, seed: 1 })
  assert.equal(r.excluded, 'no-injection')
})

test('Continua is graded on the files changed in the copy', () => {
  assert.equal(at('prima', q('continue'), { FAKE_WRITE: 'src/totals/report.js' }).status, 'correct')
  assert.equal(at('prima', q('continue'), {}).status, 'wrong')
})

test('the schedule is seeded, interleaves conditions and covers every question, condition and repetition', () => {
  const a = schedule({ questions: fixture.questions, reps: 3, seed: 7 })
  assert.deepEqual(a, schedule({ questions: fixture.questions, reps: 3, seed: 7 }))
  assert.notDeepEqual(a, schedule({ questions: fixture.questions, reps: 3, seed: 8 }))
  assert.equal(a.length, fixture.questions.length * 2 * 3)
  assert.equal(new Set(a.map(t => `${t.index}/${t.condition}/${t.rep}`)).size, a.length)
  assert.ok(a.slice(0, 6).some(t => t.condition === 'prima') && a.slice(0, 6).some(t => t.condition === 'ariadne'))
})
