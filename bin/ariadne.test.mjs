import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const CLI = fileURLToPath(new URL('./ariadne.mjs', import.meta.url))
const AT = '2026-11-11'
const n = (id, fields) => ({ id, kind: 'step', title: `Title ${id}`, status: 'done', what: `${id} result.`, proof: [{ type: 'file', ref: 'x.md' }], by: 'agent', at: AT, ...fields })
const GOOD = [n('a'), n('b', { status: 'active', after: ['a'] })]

function project({ graph, thread } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'ariadne-'))
  if (graph !== undefined || thread !== undefined) mkdirSync(join(dir, '.ariadne'))
  if (graph !== undefined) writeFileSync(join(dir, '.ariadne', 'graph.jsonl'), typeof graph === 'string' ? graph : graph.map(x => JSON.stringify(x)).join('\n') + '\n')
  if (thread !== undefined) writeFileSync(join(dir, '.ariadne', 'thread.json'), JSON.stringify(thread))
  return dir
}
const run = (dir, ...args) => spawnSync(process.execPath, [CLI, ...args], { cwd: dir, encoding: 'utf8' })

test('summary prints the R7 summary of the current node', () => {
  const r = run(project({ graph: GOOD, thread: { current: 'b' } }), 'summary')
  assert.equal(r.status, 0)
  assert.match(r.stdout, /^Sei in: Title b \(active\)\nDa dove viene \(solo le dipendenze\):\n- a Title a: a result\.\n/)
})

test('summary without a graph explains it and exits 0, so a hook never blocks the prompt', () => {
  const r = run(project(), 'summary')
  assert.equal(r.status, 0)
  assert.equal(r.stdout, "ariadne: nessun grafo in .ariadne/ · l'agente lo crea con il primo piano\n")
})

test('summary on an invalid graph summarizes what it can read and warns, exit 0', () => {
  const graph = GOOD.map(x => JSON.stringify(x)).join('\n') + '\nnot json\n' + JSON.stringify(n('c', { what: '' })) + '\n'
  const r = run(project({ graph, thread: { current: 'b' } }), 'summary')
  assert.equal(r.status, 0)
  assert.match(r.stdout, /^Sei in: Title b/)
  assert.match(r.stdout, /\n⚠ grafo non valido: riga 3 \[json\] not a JSON object with a string id \(\+1\)\n$/)
})

test('summary without thread.json starts from the active node', () => {
  const r = run(project({ graph: GOOD }), 'summary')
  assert.match(r.stdout, /^Sei in: Title b \(active\)/)
})

test('summary survives an unreadable thread.json and says so, exit 0', () => {
  const dir = project({ graph: GOOD })
  writeFileSync(join(dir, '.ariadne', 'thread.json'), '{broken')
  const r = run(dir, 'summary')
  assert.equal(r.status, 0)
  assert.match(r.stdout, /^ariadne: riassunto non disponibile \(.+\)\n$/)
})

test('show and why print a node; an unknown node fails', () => {
  const dir = project({ graph: GOOD, thread: { current: 'b' } })
  assert.match(run(dir, 'show', 'a').stdout, /^a — Title a\nCosa: a result\./)
  assert.match(run(dir, 'why', 'b').stdout, /^b Title b: b result\.\nViene da:\n- a Title a/)
  const r = run(dir, 'show', 'ghost')
  assert.equal(r.status, 1)
  assert.equal(r.stderr, 'ariadne: nodo ghost non trovato\n')
})

test('validate reports ok or the broken rules', () => {
  assert.equal(run(project({ graph: GOOD }), 'validate').stdout, '.ariadne/graph.jsonl: ok\n')
  const r = run(project({ graph: [n('a', { what: '' })] }), 'validate')
  assert.equal(r.status, 1)
  assert.match(r.stderr, /^\.ariadne\/graph\.jsonl:1 a \[what\] /)
})

test('an unknown command or a missing id prints the usage', () => {
  const dir = project({ graph: GOOD })
  for (const args of [['nope'], ['show'], []]) {
    const r = run(dir, ...args)
    assert.equal(r.status, 2, args.join(' '))
    assert.match(r.stderr, /^uso: ariadne /)
  }
})

const read = (dir, file) => readFileSync(join(dir, '.ariadne', file), 'utf8')
const nodesOf = dir => read(dir, 'graph.jsonl').trimEnd().split('\n').map(l => JSON.parse(l))
const git = (dir, ...args) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: dir, encoding: 'utf8' })
const PLAN = [n('m', { kind: 'milestone', status: 'active', confirmed: { at: AT, ref: 'chat' } }), n('a', { parent: 'm', status: 'active' }), n('b', { parent: 'm', status: 'todo', after: ['a'] })]

test('close writes the graph, moves the thread on and appends a readable log line', () => {
  const dir = project({ graph: PLAN, thread: { project: 'p', current: 'a', profile: 'standard' } })
  const r = run(dir, 'close', 'a', 'A is done.', '--file', 'src/a.mjs')
  assert.equal(r.status, 0, r.stderr)
  assert.equal(r.stdout, '↺ chiuso a Title a: A is done.\n↺ iniziato b Title b\n')
  assert.equal(nodesOf(dir).find(x => x.id === 'a').status, 'done')
  assert.equal(JSON.parse(read(dir, 'thread.json')).current, 'b')
  const log = read(dir, 'log.jsonl').trimEnd().split('\n').map(l => JSON.parse(l))
  assert.deepEqual(log.map(l => l.text), ['chiuso a Title a: A is done.', 'iniziato b Title b'])
  assert.equal(run(dir, 'log').stdout.split('\n').filter(Boolean).length, 2)
})

test('a refused operation exits 1 and leaves every file as it was', () => {
  const dir = project({ graph: PLAN, thread: { current: 'a' } })
  const before = read(dir, 'graph.jsonl')
  const r = run(dir, 'close', 'a', 'No proof.')
  assert.equal(r.status, 1)
  assert.match(r.stderr, /R3/)
  assert.equal(read(dir, 'graph.jsonl'), before)
})

test('add takes its fields from flags; a deduction lists its premises', () => {
  const dir = project({ graph: PLAN, thread: { current: 'a' } })
  run(dir, 'add', 'point', 'Clue', '--what', 'The cache is cold.', '--id', 'k1')
  const r = run(dir, 'add', 'point', 'Deduction', '--what', 'The cache causes it.', '--after', 'k1', '--why', 'same time')
  assert.equal(r.status, 0, r.stderr)
  const d = nodesOf(dir).at(-1)
  assert.deepEqual([d.parent, d.after, d.why], ['a', ['k1'], 'same time'])
})

test('sync turns Thread lines into operations once, and the summary warns about commits without them', () => {
  const dir = project({ graph: PLAN, thread: { current: 'a' } })
  git(dir, 'init', '-q')
  git(dir, 'commit', '-q', '--allow-empty', '-m', 'feat: a\n\nThread: a done: A shipped.')
  const r1 = run(dir, 'sync')
  assert.match(r1.stdout, /↺ chiuso a Title a: A shipped\./)
  assert.equal(nodesOf(dir).find(x => x.id === 'a').proof.at(-1).type, 'commit')
  assert.equal(run(dir, 'sync').stdout, '')
  git(dir, 'commit', '-q', '--allow-empty', '-m', 'chore: untracked')
  assert.match(run(dir, 'summary').stdout, /\n⚠ 1 commit senza Thread: dall'ultimo aggiornamento del grafo\n/)
})

test('the commit hook reports to the agent only after a git commit', () => {
  const dir = project({ graph: PLAN, thread: { current: 'a' } })
  git(dir, 'init', '-q')
  git(dir, 'commit', '-q', '--allow-empty', '-m', 'feat: a\n\nThread: a')
  const hook = command => spawnSync(process.execPath, [CLI, 'sync', '--hook'], { cwd: dir, encoding: 'utf8', input: JSON.stringify({ tool_name: 'Bash', tool_input: { command } }) })
  assert.equal(hook('ls').stdout, '')
  const out = JSON.parse(hook('git commit -m x').stdout)
  assert.equal(out.hookSpecificOutput.hookEventName, 'PostToolUse')
  assert.match(out.hookSpecificOutput.additionalContext, /prova per a: commit/)
})

test('sync outside a git repository does nothing and exits 0', () => {
  const r = run(project({ graph: PLAN, thread: { current: 'a' } }), 'sync')
  assert.equal(r.status, 0)
  assert.equal(r.stdout, '')
})

test('add --done records an established fact, such as a clue', () => {
  const dir = project({ graph: PLAN, thread: { current: 'a' } })
  const r = run(dir, 'add', 'point', 'Clue', '--what', 'The cache is cold.', '--done', '--file', 'log.txt')
  assert.equal(r.status, 0, r.stderr)
  assert.equal(nodesOf(dir).at(-1).status, 'done')
})

test('saving the graph after a commit leaves the tree clean', () => {
  const dir = project({ graph: PLAN, thread: { current: 'a' } })
  git(dir, 'init', '-q')
  writeFileSync(join(dir, 'a.txt'), 'a')
  git(dir, 'add', '.')
  git(dir, 'commit', '-q', '-m', 'feat: a\n\nThread: a')
  run(dir, 'sync')
  git(dir, 'add', '.ariadne')
  git(dir, 'commit', '-q', '-m', 'chore: save the graph\n\nThread: a')
  assert.equal(run(dir, 'sync').stdout, '')
  assert.equal(git(dir, 'status', '--porcelain').stdout, '')
  assert.doesNotMatch(run(dir, 'summary').stdout, /commit senza Thread/)
})

test('band prints the band rows as JSON, with the viewer port, and exits 0 even without a graph', () => {
  const r = run(project({ graph: [...GOOD, n('c', { status: 'todo', after: ['b'], review: 'confirm' })], thread: { current: 'b' } }), 'band', '--review', '0')
  assert.equal(r.status, 0)
  const out = JSON.parse(r.stdout)
  assert.equal(out.viewer, 8790)
  assert.deepEqual(out.rows.map(row => row.kind), ['where', 'queue'])
  assert.match(out.rows[1].text, /^⏎ Da confermare 1\/1: c Title c$/)
  const empty = run(project(), 'band')
  assert.equal(empty.status, 0)
  assert.equal(JSON.parse(empty.stdout).rows[0].kind, 'empty')
})

test('open on a port held by another server says so, exits 1 and opens nothing', async () => {
  const other = createServer((_, res) => res.end('not found')).listen(0, '127.0.0.1')
  await new Promise(resolve => other.on('listening', resolve))
  const child = spawn(process.execPath, [CLI, 'open', '--port', String(other.address().port)], { cwd: project({ graph: GOOD }) })
  let stderr = ''
  child.stderr.on('data', chunk => { stderr += chunk })
  const status = await new Promise(resolve => child.on('close', resolve))
  other.close()
  assert.equal(status, 1)
  assert.match(stderr, /occupata da un altro server/)
})
