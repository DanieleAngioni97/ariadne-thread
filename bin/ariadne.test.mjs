import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { derivedPort } from '../src/port.mjs'

// These tests read what ariadne writes in Italian; English has its own tests.
process.env.ARIADNE_LANG = 'it'

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

test('outside an ariadne project the hooks and the band say nothing, so the plugin is quiet everywhere else', () => {
  const dir = project()
  const hook = (...args) => spawnSync(process.execPath, [CLI, ...args, '--hook'], { cwd: dir, encoding: 'utf8', input: '{}' })
  assert.equal(hook('card').stdout, '')
  assert.equal(hook('summary').stdout, '')
  assert.equal(hook('sync').stdout, '')
  assert.equal(hook('check').stdout, '')
  assert.deepEqual(JSON.parse(run(dir, 'band').stdout).rows, [])
  assert.equal(existsSync(join(dir, '.ariadne')), false)
})

test('init makes the project an ariadne project, says what comes next, and can run again', () => {
  const dir = project()
  const first = run(dir, 'init')
  assert.equal(first.status, 0, first.stderr)
  assert.match(first.stdout, /ariadne/)
  assert.equal(readFileSync(join(dir, '.ariadne', '.gitignore'), 'utf8'), 'STATE.md\nlocal.json\n')
  assert.equal(run(dir, 'init').status, 0)
  assert.equal(readFileSync(join(dir, '.ariadne', '.gitignore'), 'utf8'), 'STATE.md\nlocal.json\n')
  assert.match(run(dir, 'card', '--hook').stdout, /nessun grafo/)
})

test('bin/ariadne runs the CLI by name, as the plugin puts it on the PATH of Claude\'s Bash', () => {
  const dir = project()
  const r = spawnSync('ariadne', ['init'], { cwd: dir, encoding: 'utf8', env: { ...process.env, PATH: `${join(CLI, '..')}:${process.env.PATH}` } })
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /progetto pronto/)
})

test('after init the first milestone and its plan start the graph', () => {
  const dir = project()
  run(dir, 'init')
  const first = run(dir, 'add', 'milestone', 'Login', '--what', 'Users sign in.', '--start')
  assert.equal(first.status, 0, first.stderr)
  const plan = run(dir, 'plan', 'm1', 'Pick the library', '--ref', 'chat: approved')
  assert.equal(plan.status, 0, plan.stderr)
  assert.match(run(dir, 'summary').stdout, /^Sei in: Login/)
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
  const ok = project({ graph: GOOD })
  writeFileSync(join(ok, 'x.md'), '# X\n')
  assert.equal(run(ok, 'validate').stdout, '.ariadne/graph.jsonl: ok\n')
  const r = run(project({ graph: [n('a', { what: '' })] }), 'validate')
  assert.equal(r.status, 1)
  assert.match(r.stderr, /^\.ariadne\/graph\.jsonl:1 a \[what\] /)
})

test('validate reports a file proof whose file is gone or whose section is not in it', () => {
  const dir = project({ graph: [n('a'), n('b', { proof: [{ type: 'file', ref: 'x.md#Piano' }] }), n('c', { proof: [{ type: 'file', ref: 'gone.md' }] })] })
  writeFileSync(join(dir, 'x.md'), '# Piano di lavoro\n')
  assert.equal(run(dir, 'validate').status, 1)
  assert.equal(run(dir, 'validate').stderr, '.ariadne/graph.jsonl:3 c [file-ref] gone.md: file not found (spostato? ariadne relink <vecchio> <nuovo>)\n')
  writeFileSync(join(dir, 'x.md'), '# Altro\n')
  assert.match(run(dir, 'validate').stderr, /:2 b \[file-ref\] x\.md#Piano: section not found\n/)
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

test('pause puts a started step back among the todo ones from the command line', () => {
  const dir = project({ graph: PLAN, thread: { project: 'p', current: 'a', profile: 'standard' } })
  const r = run(dir, 'pause', 'a')
  assert.equal(r.status, 0, r.stderr)
  assert.equal(r.stdout, '↺ rimesso tra i da fare a Title a\n')
  assert.equal(nodesOf(dir).find(x => x.id === 'a').status, 'todo')
  assert.equal(JSON.parse(read(dir, 'thread.json')).current, 'm')
})

test('ARIADNE_NOW fixes the time written to the graph and the log, so a generated fixture is byte-identical', () => {
  const dir = project({ graph: PLAN, thread: { project: 'p', current: 'a', profile: 'standard' } })
  const at = '2030-01-02T03:04Z'
  const runAt = (...args) => spawnSync(process.execPath, [CLI, ...args], { cwd: dir, encoding: 'utf8', env: { ...process.env, ARIADNE_NOW: at } })
  assert.equal(runAt('close', 'a', 'A is done.', '--file', 'src/a.mjs').status, 0)
  const r = runAt('add', 'detour', 'D', '--what', 'A detour.', '--id', 'd')
  assert.equal(r.status, 0, r.stderr)
  assert.equal(nodesOf(dir).find(x => x.id === 'd').at, at)
  assert.ok(read(dir, 'log.jsonl').trimEnd().split('\n').every(l => JSON.parse(l).at === at))
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

test('the end-of-turn hook hands the agent back what the thread missed, once per turn', () => {
  const dir = project({ graph: PLAN, thread: { current: 'a' } })
  git(dir, 'init', '-q')
  git(dir, 'commit', '-q', '--allow-empty', '-m', 'feat: a\n\nThread: a')
  const transcript = join(dir, 'transcript.jsonl')
  const turn = entries => writeFileSync(transcript, entries.map(e => JSON.stringify(e)).join('\n') + '\n')
  const hook = (input = {}) => spawnSync(process.execPath, [CLI, 'check', '--hook'], { cwd: dir, encoding: 'utf8', env: { ...process.env, TMPDIR: '/scratch-elsewhere' }, input: JSON.stringify({ transcript_path: transcript, ...input }) })
  const write = path => ({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Write', input: { file_path: path } }] } })

  turn([{ type: 'user', message: { content: 'Procedi pure' } }])
  const out = JSON.parse(hook().stdout)
  assert.equal(out.decision, 'block')
  assert.match(out.reason, /^ariadne: .*ariadne plan/s)
  assert.equal(hook({ stop_hook_active: true }).stdout, '')

  // Outside the project and outside every temporary folder, which the check leaves out on purpose.
  const outside = '/srv/ariadne-out/report.html'
  turn([{ type: 'user', message: { content: 'scrivi il rapporto' } }, write(outside), write(join(dir, 'in.md'))])
  assert.match(JSON.parse(hook().stdout).reason, new RegExp(`${outside}.*--file`))
  run(dir, 'fill', 'a', '--file', outside)
  assert.equal(hook().stdout, '')

  turn([{ type: 'user', message: { content: 'spiegami' } }])
  assert.equal(hook().stdout, '')
  assert.equal(hook({ transcript_path: join(dir, 'missing.jsonl') }).status, 0)
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

test('band prints the band rows as JSON, with the viewer port, and exits 0 even before the first plan', () => {
  const dir = project({ graph: [...GOOD, n('c', { status: 'todo', after: ['b'], review: 'confirm' })], thread: { current: 'b' } })
  const r = run(dir, 'band', '--review', '0')
  assert.equal(r.status, 0)
  const out = JSON.parse(r.stdout)
  assert.equal(out.viewer, derivedPort(realpathSync(dir)))
  assert.deepEqual(out.rows.map(row => row.kind), ['where', 'queue'])
  assert.match(out.rows[1].text, /^⏎ Da confermare 1\/1: c Title c$/)
  const bare = project()
  mkdirSync(join(bare, '.ariadne'))
  const empty = run(bare, 'band')
  assert.equal(empty.status, 0)
  assert.equal(JSON.parse(empty.stdout).rows[0].kind, 'empty')
})

test('open on a port fixed by hand and held by another server says so, exits 1 and opens nothing', async () => {
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

test('open with no browser to launch leaves the viewer up, exits 0 and says to open the address by hand', async () => {
  const free = createServer().listen(0, '127.0.0.1')
  await new Promise(resolve => free.on('listening', resolve))
  const port = String(free.address().port)
  free.close()
  const dir = project({ graph: GOOD })
  const viewer = spawn(process.execPath, [CLI, 'view', '--port', port], { cwd: dir })
  await new Promise(resolve => viewer.stdout.once('data', resolve))
  const r = spawnSync(process.execPath, [CLI, 'open', '--port', port], { cwd: dir, encoding: 'utf8', env: { ...process.env, PATH: '/nonexistent' } })
  viewer.kill()
  assert.equal(r.status, 0)
  assert.match(r.stdout, new RegExp(`127\\.0\\.0\\.1:${port}/.*aprilo a mano`))
})

test('view on a project port held by another server takes a free one and saves it for band and open', async () => {
  const dir = realpathSync(project({ graph: GOOD }))
  const other = createServer((_, res) => res.end('not found')).listen(derivedPort(dir), '127.0.0.1')
  await new Promise(resolve => other.on('listening', resolve))
  const child = spawn(process.execPath, [CLI, 'view'], { cwd: dir })
  const line = await new Promise(resolve => {
    child.stdout.on('data', chunk => resolve(String(chunk)))
    child.on('close', () => resolve(''))
  })
  child.kill()
  other.close()
  const { port } = JSON.parse(readFileSync(join(dir, '.ariadne', 'local.json'), 'utf8'))
  assert.notEqual(port, derivedPort(dir))
  assert.match(line, new RegExp(`127\\.0\\.0\\.1:${port}/`))
  assert.equal(JSON.parse(run(dir, 'band').stdout).viewer, port)
})

test('a file proof in the home folder is saved as ~/, so the graph in git does not carry the local user name', () => {
  const dir = project({ graph: PLAN, thread: { current: 'a' } })
  const home = mkdtempSync(join(tmpdir(), 'ariadne-home-'))
  mkdirSync(join(home, 'notes'))
  writeFileSync(join(home, 'notes', 'report.md'), '# Report\n')
  const r = spawnSync(process.execPath, [CLI, 'fill', 'a', '--file', join(home, 'notes', 'report.md')], { cwd: dir, encoding: 'utf8', env: { ...process.env, HOME: home } })
  assert.equal(r.status, 0, r.stderr)
  assert.deepEqual(nodesOf(dir).find(x => x.id === 'a').proof.at(-1), { type: 'file', ref: '~/notes/report.md' })
  assert.doesNotMatch(read(dir, 'log.jsonl'), new RegExp(home))
})

test('close with only a chat message as proof warns that no file holds the result', () => {
  const chatOnly = { proof: [{ type: 'message', ref: 'chat' }] }
  const graph = [PLAN[0], { ...PLAN[1], ...chatOnly }, { ...PLAN[2], ...chatOnly }]
  const dir = project({ graph, thread: { project: 'p', current: 'a', profile: 'standard' } })
  const r = run(dir, 'close', 'a', 'A is done.', '--message', 'chat')
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stderr, /^ariadne: ⚠ a si chiude senza file né commit: dove sta il risultato\? ariadne fill a --file <percorso>\[#sezione\]\n$/)
  assert.equal(run(dir, 'close', 'b', 'B is done.', '--file', 'src/b.mjs').stderr, '')
})

test('card prints the state card with the files of each commit, and keeps the view in .ariadne/STATE.md out of git', () => {
  const dir = project({ graph: PLAN, thread: { current: 'a' } })
  git(dir, 'init', '-q')
  mkdirSync(join(dir, 'src'))
  writeFileSync(join(dir, 'src', 'a.js'), 'a')
  git(dir, 'add', 'src')
  git(dir, 'commit', '-q', '-m', 'feat: a\n\nThread: a')
  run(dir, 'sync')
  const r = run(dir, 'card')
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /^# Stato del lavoro \(scheda generata da ariadne\)\nSei in: Title m › Title a \(active\)\n/)
  assert.match(r.stdout, /\n- a \[active\] Title a: a result\. · file: src\/a\.js, x\.md\n/)
  assert.match(read(dir, 'STATE.md'), /^# Stato del lavoro \(vista generata da ariadne/)
  assert.equal(read(dir, '.gitignore'), 'STATE.md\n')
  git(dir, 'add', '.')
  assert.doesNotMatch(git(dir, 'status', '--porcelain').stdout, /STATE\.md/)
})

test('every change to the graph rewrites the view', () => {
  const dir = project({ graph: PLAN, thread: { current: 'a' } })
  run(dir, 'close', 'a', 'A shipped.', '--file', 'a.md')
  assert.match(read(dir, 'STATE.md'), /\n- a \[done\] Title a: A shipped\. · file: a\.md, x\.md\n/)
})

test('card without a graph explains it and exits 0', () => {
  const r = run(project(), 'card')
  assert.equal(r.status, 0)
  assert.match(r.stdout, /nessun grafo/)
})

test('in a session the prompt hook speaks only when the summary changed since the card or its last word', () => {
  const dir = project({ graph: PLAN, thread: { current: 'a' } })
  const session = `test-${process.pid}-${Date.now()}`
  const hook = (...args) => spawnSync(process.execPath, [CLI, ...args, '--hook'], { cwd: dir, encoding: 'utf8', input: JSON.stringify({ session_id: session }) }).stdout
  assert.match(hook('card'), /^# Stato del lavoro/)
  assert.equal(hook('summary'), '')
  run(dir, 'close', 'a', 'A shipped.', '--file', 'a.md')
  assert.match(hook('summary'), /^Sei in: Title m › Title b \(active\)/)
  assert.equal(hook('summary'), '')
  assert.match(spawnSync(process.execPath, [CLI, 'summary', '--hook'], { cwd: dir, encoding: 'utf8', input: JSON.stringify({ session_id: `${session}-other` }) }).stdout, /^Sei in:/)
})
