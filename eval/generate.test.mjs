import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { check, generate } from './generate.mjs'

const scenario = JSON.parse(readFileSync(new URL('./scenarios/dev/dev-01.json', import.meta.url), 'utf8'))
const git = (dir, ...args) => spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8' }).stdout
const fresh = () => generate(scenario, mkdtempSync(join(tmpdir(), 'ariadne-eval-')))

test('the same scenario gives the same bytes on every run', () => {
  const [a, b] = [fresh(), fresh()]
  for (const condition of ['ariadne', 'prima']) {
    assert.equal(git(join(a.dir, condition), 'rev-parse', 'HEAD'), git(join(b.dir, condition), 'rev-parse', 'HEAD'))
  }
  for (const file of ['graph.jsonl', 'thread.json', 'log.jsonl']) {
    assert.equal(readFileSync(join(a.dir, 'ariadne', '.ariadne', file), 'utf8'), readFileSync(join(b.dir, 'ariadne', '.ariadne', file), 'utf8'))
  }
  assert.deepEqual(a.questions, b.questions)
})

test('both conditions hold the same project files and the same commits, but for the Thread lines', () => {
  const { dir } = fresh()
  const [ariadne, prima] = [join(dir, 'ariadne'), join(dir, 'prima')]
  assert.equal(git(ariadne, 'ls-tree', '-r', 'HEAD'), git(prima, 'ls-tree', '-r', 'HEAD'))
  const messages = d => git(d, 'log', '--format=%B%x00').replace(/\n\nThread: .*\n/g, '\n')
  assert.equal(messages(ariadne), messages(prima))
  assert.match(git(ariadne, 'log', '--format=%B'), /^Thread: m1\.1 done: feat\(lexer\): split invoice lines into tokens$/m)
  assert.equal(git(ariadne, 'status', '--porcelain'), '')
  assert.equal(git(prima, 'status', '--porcelain'), '')
})

test('the graph is valid, the thread sits on the open step, and the node holds only what the commits hold', () => {
  const { dir } = fresh()
  const cwd = join(dir, 'ariadne')
  const cli = spawnSync(process.execPath, ['.ariadne/cli/bin/ariadne.mjs', 'validate'], { cwd, encoding: 'utf8' })
  assert.equal(cli.status, 0, cli.stderr)
  const nodes = readFileSync(join(cwd, '.ariadne', 'graph.jsonl'), 'utf8').trimEnd().split('\n').map(l => JSON.parse(l))
  const byTitle = t => nodes.find(n => n.title === t)
  assert.equal(JSON.parse(readFileSync(join(cwd, '.ariadne', 'thread.json'), 'utf8')).current, byTitle('Validate invoice totals').id)
  assert.equal(byTitle('Lexer for invoice lines').why, 'Suppliers mix tabs and spaces, so the lexer splits on both.')
  const cache = byTitle('Cache for parsed suppliers')
  assert.equal(cache.why, undefined)
  assert.ok(cache.proof.some(p => p.type === 'file' && p.ref === 'docs/decisions.md#Cache'))
  assert.equal(byTitle('Store suppliers in SQLite').status, 'replaced')
  assert.equal(byTitle('Export to the ledger').status, 'deferred')
})

test('questions carry neutral answers: titles and paths, never node ids or shas', () => {
  const { questions, key } = fresh()
  assert.equal(key.titles.length, 7)
  assert.ok(key.titles.includes('Fix the flaky CI job'))
  assert.deepEqual(key.milestones, ['M1 Parser', 'M2 Reports'])
  const by = cat => questions.find(q => q.cat === cat)
  assert.deepEqual(by('where').answer, { current: 'Validate invoice totals', next: 'Report malformed invoices' })
  assert.deepEqual(by('why').options.sort(), ['A run parses at most 200 suppliers.', 'Lines must add up to the total.', 'Suppliers mix tabs and spaces.', 'The test job timed out on cold caches.', 'non risulta'].sort())
  assert.equal(by('why').answer, 'A run parses at most 200 suppliers.')
  assert.deepEqual(by('proof').answer, ['src/lexer/index.js'])
  assert.equal(by('deferred').answer, 'Export to the ledger → M2 Reports')
  assert.equal(by('deferred').options.length, 5)
  assert.ok(by('deferred').options.includes('non risulta') && by('deferred').options.includes('Export to the ledger → M2 Reports'))
  assert.equal(new Set(by('deferred').options).size, 5)
  assert.equal(by('update').answer, 'Cache for parsed suppliers')
  assert.equal(by('update').options.length, 5)
  assert.ok(by('update').options.includes('Store suppliers in SQLite'), 'the replaced decision is a distractor')
  assert.equal(by('abstain').answer, 'non risulta')
  assert.deepEqual(by('continue').answer, { dir: 'src/totals/', allowed: ['src/totals/index.js'], forbidden: [] })
  assert.doesNotMatch(JSON.stringify(questions), /\bm\d+\.\d+\b|\b[0-9a-f]{7,40}\b/)
})

test('a generation can stop at an event, for the handoffs of prima; a handoff event changes no file', () => {
  const withHandoff = { ...scenario, events: [...scenario.events.slice(0, 4), { type: 'handoff' }, ...scenario.events.slice(4)] }
  const full = generate(withHandoff, mkdtempSync(join(tmpdir(), 'ariadne-eval-')))
  assert.equal(git(join(full.dir, 'prima'), 'rev-list', '--count', 'HEAD').trim(), '7')
  const part = generate(withHandoff, mkdtempSync(join(tmpdir(), 'ariadne-eval-')), { until: 5 })
  assert.equal(git(join(part.dir, 'prima'), 'log', '--format=%s'), 'chore: scaffold the project\n')
})

test('check accepts a coherent scenario and names what breaks one', () => {
  assert.deepEqual(check(scenario), [])
  const broken = structuredClone(scenario)
  broken.questions.find(q => q.cat === 'where').current = 'cache'
  broken.questions.find(q => q.cat === 'deferred').milestone = 'm1'
  broken.questions.find(q => q.cat === 'proof').file = 'src/cache/index.js'
  broken.questions.find(q => q.cat === 'why').reason = 'Nowhere in the project.'
  broken.questions.find(q => q.cat === 'update').step = 'lexer'
  broken.questions = broken.questions.filter(q => q.cat !== 'abstain')
  broken.events.find(e => e.step === 'cache' && e.type === 'commit').files = { 'src/lexer/index.js': 'shared' }
  const errors = check(broken)
  for (const pattern of [/where: .*cache.* is not the open step/, /deferred: .*export.* to m1/, /proof: src\/cache\/index\.js/, /why: the reason is in no document/, /update: .*lexer.* replaces nothing/, /missing categories: abstain/, /lexer: no file of its own/]) {
    assert.ok(errors.some(e => pattern.test(e)), `${pattern} not in ${errors.join(' | ')}`)
  }
})

test('a test scenario hands off at the end of a milestone, then runs into an open step with a folder of its own', () => {
  assert.deepEqual(check(scenario), [])
  assert.ok(check(scenario, { test: true }).some(e => /test: no handoff/.test(e)))

  const testScenario = structuredClone(scenario)
  const deferAt = testScenario.events.findIndex(e => e.type === 'defer')
  testScenario.events.splice(deferAt + 1, 0, { type: 'handoff' })
  for (const n of [2, 3, 4, 5]) testScenario.events.push({ type: 'commit', step: 'totals', message: `feat(totals): rule ${n}`, files: { [`src/totals/rule-${n}.js`]: `export const rule${n} = true\n` } })
  assert.deepEqual(check(testScenario, { test: true }), [])

  const early = structuredClone(testScenario)
  early.events.splice(early.events.findIndex(e => e.type === 'handoff'), 1)
  early.events.splice(early.events.findIndex(e => e.type === 'detour'), 0, { type: 'handoff' })
  const short = structuredClone(testScenario)
  short.events.splice(-4)
  const shared = structuredClone(testScenario)
  shared.events.find(e => e.step === 'cache' && e.type === 'commit').files['src/totals/cached.js'] = 'shared'
  shared.events.at(-1).files = { 'src/report/total.js': 'outside' }
  const errors = [...check(early, { test: true }), ...check(short, { test: true }), ...check(shared, { test: true })]
  for (const pattern of [/test: handoff at event \d+ with steps still open: .*export/, /test: 1 commits after the last handoff, at least 5/, /test: src\/report\/total\.js of the open step is outside src\/totals\//, /test: cache touches src\/totals\/cached\.js/]) {
    assert.ok(errors.some(e => pattern.test(e)), `${pattern} not in ${errors.join(' | ')}`)
  }
  const planned = structuredClone(testScenario)
  const handoff = planned.events.splice(planned.events.findIndex(e => e.type === 'handoff'), 1)[0]
  planned.events.splice(planned.events.findLastIndex(e => e.type === 'plan') + 1, 0, handoff)
  assert.ok(check(planned, { test: true }).some(e => /test: the open step was planned before the last handoff/.test(e)))
})
