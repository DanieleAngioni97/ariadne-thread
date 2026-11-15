import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizedCost } from './cost.mjs'
import { generate } from './generate.mjs'
import { promptFor, runFixture, schedule, settingsFor, trial } from './run.mjs'

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
  assert.match(promptFor(q('continue')), /first code change/)
  assert.match(promptFor(q('update'), q('update').options), /\nA\) /)
  assert.match(promptFor(q('proof')), /Answer in English/)
  assert.match(promptFor(q('where')), /RISPOSTA: <current step> \| <next step>/)
})

test('settings give each condition its hooks and allowed commands; Continua adds the edit tools', () => {
  const prima = settingsFor('prima', { injectDir: '/runs/x' })
  assert.deepEqual(Object.keys(prima.hooks), ['SessionStart'])
  assert.match(prima.hooks.SessionStart[0].hooks[0].command, /cat STATE\.md/)
  const ariadne = settingsFor('ariadne', { injectDir: '/runs/x', edits: true })
  assert.deepEqual(Object.keys(ariadne.hooks), ['SessionStart', 'UserPromptSubmit'])
  assert.match(ariadne.hooks.SessionStart[0].hooks[0].command, /ariadne\.mjs card --hook/)
  assert.match(ariadne.hooks.UserPromptSubmit[0].hooks[0].command, /ariadne\.mjs summary --hook/)
  assert.ok(ariadne.permissions.allow.includes('Bash(node .ariadne/cli/bin/ariadne.mjs:*)'))
  for (const c of ['echo', 'head', 'tail', 'wc', 'sort', 'git status']) assert.ok(prima.permissions.allow.includes(`Bash(${c}:*)`) && ariadne.permissions.allow.includes(`Bash(${c}:*)`))
  assert.ok(!prima.permissions.allow.some(r => r.includes('ariadne')))
  assert.ok(ariadne.permissions.allow.includes('Edit') && !prima.permissions.allow.includes('Edit'))
  assert.ok(prima.permissions.deny.includes('Bash(git diff --no-index:*)'))
})

test('a trial grades the answer, checks the injection and counts tokens as if nothing were cached', () => {
  const r = at('ariadne', q('where'), { FAKE_ANSWER: 'Looked.\nRISPOSTA: Validate invoice totals | Report malformed invoices' })
  assert.equal(r.status, 'correct')
  // The prompt hook stays silent: the card at the start already said it all.
  assert.deepEqual(r.injected, { SessionStart: true })
  assert.equal(r.tokens, 1115)
  assert.equal(r.excluded, null)
})

test('a trial is excluded when a tool reaches outside the copy, or when nothing was injected', () => {
  assert.equal(at('ariadne', q('proof'), { FAKE_TOOL_PATH: '/etc/hosts', FAKE_ANSWER: 'RISPOSTA: src/lexer/index.js' }).excluded, 'outside')
  assert.equal(at('ariadne', q('proof'), { FAKE_TOOL_PATH: '//', FAKE_ANSWER: 'RISPOSTA: src/lexer/index.js' }).excluded, null)
  assert.equal(at('ariadne', q('proof'), { FAKE_TOOL_PATH: '../outside.txt', FAKE_ANSWER: 'RISPOSTA: src/lexer/index.js' }).excluded, 'outside')
  assert.equal(at('ariadne', q('proof'), { FAKE_COMMAND: "cat > src/r.js <<'EOF'\nimport { b } from '../totals/index.js'\nEOF", FAKE_ANSWER: 'RISPOSTA: src/lexer/index.js' }).excluded, null)
  assert.equal(at('ariadne', q('proof'), { FAKE_TOOL_PATH: '/[\\/.]/g,', FAKE_ANSWER: 'RISPOSTA: src/lexer/index.js' }).excluded, null)
  assert.equal(at('ariadne', q('proof'), { FAKE_TOOL_PATH: '/\\.md$/,', FAKE_ANSWER: 'RISPOSTA: src/lexer/index.js' }).excluded, null)
  const bare = generate(scenario, mkdtempSync(join(tmpdir(), 'ariadne-eval-')))
  rmSync(join(bare.dir, 'prima', 'STATE.md'), { force: true })
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

test('a run stops at an API error without recording it, and the next run skips what is already recorded', () => {
  const out = mkdtempSync(join(tmpdir(), 'ariadne-runs-'))
  const opts = { dir: fixture.dir, model: 'fake', reps: 1, seed: 2, out, bin: FAKE }
  const stopped = runFixture({ ...opts, env: { FAKE_ERROR: '1' } })
  assert.deepEqual([stopped.done, stopped.stopped], [0, true])
  const first = runFixture({ ...opts, env: { FAKE_ANSWER: 'RISPOSTA: non risulta' } })
  assert.deepEqual([first.done, first.skipped, first.stopped], [fixture.questions.length * 2, 0, false])
  const again = runFixture({ ...opts, env: { FAKE_ANSWER: 'RISPOSTA: non risulta' } })
  assert.deepEqual([again.done, again.skipped], [0, fixture.questions.length * 2])
  const lines = readFileSync(join(out, 'results.jsonl'), 'utf8').trimEnd().split('\n').map(l => JSON.parse(l))
  assert.equal(new Set(lines.map(l => l.id)).size, lines.length)
  assert.ok(lines.every(l => l.id.startsWith(`${fixture.dir.split('/').at(-1)}-original-`)))
})

test('a trial records the normalized cost from its first call, and whether Continua stopped to ask instead of working', () => {
  const t = (question, env) => trial({ fixture: fixture.dir, condition: 'ariadne', q: question, key: fixture.key, model: 'claude-haiku-5-5', bin: FAKE, env, seed: 1 })
  const r = t(q('where'), { FAKE_ANSWER: 'RISPOSTA: x', FAKE_FIRST_READS: '600' })
  assert.equal(r.costNorm, normalizedCost('claude-haiku-5-5', { input_tokens: 10, cache_creation_input_tokens: 100, cache_read_input_tokens: 1000, output_tokens: 5 }, 600))
  assert.equal(r.asked, undefined)
  assert.equal(t(q('continue'), { FAKE_ANSWER: 'Should I finish the totals check first?' }).asked, true)
  assert.equal(t(q('continue'), { FAKE_ANSWER: 'Done. Shall I go on?', FAKE_WRITE: 'src/totals/extra.js' }).asked, false)
})
