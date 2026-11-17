import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
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

test('init finds STATE.md and LOG.md and proposes moving them into the thread, without touching them', () => {
  const dir = project()
  writeFileSync(join(dir, 'STATE.md'), '# State\n')
  writeFileSync(join(dir, 'LOG.md'), '# Log\n')
  const r = run(dir, 'init')
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /trovati STATE\.md e LOG\.md/)
  assert.match(r.stdout, /ariadne migrate.*--apply.*--undo.*ariadne doctor/s)
  assert.equal(readFileSync(join(dir, 'STATE.md'), 'utf8'), '# State\n')
  const only = project()
  writeFileSync(join(only, 'LOG.md'), '# Log\n')
  assert.match(run(only, 'init').stdout, /trovato LOG\.md/)
  assert.doesNotMatch(run(project(), 'init').stdout, /STATE\.md|LOG\.md/)
})

test('migrate previews the move of STATE.md and LOG.md and writes nothing; --as corrects an item', () => {
  const dir = project()
  run(dir, 'init')
  writeFileSync(join(dir, 'STATE.md'), '## Milestone\nShip it.\n\n## Next\n1. Write docs\n\n## Open decisions and risks\n- Decide the host?\n- Keys expire.\n')
  writeFileSync(join(dir, 'LOG.md'), '- 2026-10-01 · Started · abc1234\n')
  const r = run(dir, 'migrate')
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /anteprima, niente è stato scritto/)
  assert.match(r.stdout, /^1 \[decisione\] Decide the host\?$/m)
  assert.match(r.stdout, /^2 \[rischio\] Keys expire\.$/m)
  assert.equal(existsSync(join(dir, '.ariadne', 'graph.jsonl')), false)
  assert.equal(existsSync(join(dir, 'STATE.md')), true)
  assert.match(run(dir, 'migrate', '--as', '1=risk,2=drop').stdout, /^1 \[rischio\] .*\n2 \[scartata\] /m)
  assert.equal(run(dir, 'migrate', '--as', '1=maybe').status, 2)
  const none = project()
  run(none, 'init')
  assert.match(run(none, 'migrate').stderr, /nessun STATE\.md né LOG\.md/)
})

test('init says how to turn the band on when Claude Code does not load hooks modules yet', () => {
  const init = flag => spawnSync(process.execPath, [CLI, 'init'], { cwd: project(), encoding: 'utf8', env: { ...process.env, CLAUDE_CODE_ENABLE_FUNCTION_HOOKS: flag } })
  assert.match(init('').stdout, /banda.*"env": \{ "CLAUDE_CODE_ENABLE_FUNCTION_HOOKS": "1" \}.*settings\.json/s)
  assert.doesNotMatch(init('1').stdout, /CLAUDE_CODE_ENABLE_FUNCTION_HOOKS/)
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
  // The graph changed after the commit: the agent saves it at once, so .ariadne/ in git is never behind.
  assert.match(out.hookSpecificOutput.additionalContext, /git add \.ariadne && git commit -m "chore\(ariadne\): .*Thread: a/s)
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

test('plan takes one --what per step, in order, for the details behind each short title', () => {
  const dir = project()
  assert.equal(run(dir, 'init').status, 0)
  assert.equal(run(dir, 'add', 'milestone', 'M1', '--what', 'Goal').status, 0)
  const plan = run(dir, 'plan', 'm1', 'Doctor', 'Ship', '--what', 'Lists the conflicting sources', '--what', 'Release it', '--ref', 'chat: approved')
  assert.equal(plan.status, 0, plan.stderr)
  const steps = readFileSync(join(dir, '.ariadne', 'graph.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l)).filter(x => x.parent === 'm1')
  assert.deepEqual(steps.map(x => [x.title, x.what]), [['Doctor', 'Lists the conflicting sources'], ['Ship', 'Release it']])
  assert.notEqual(run(dir, 'plan', 'm1', 'One', '--what', 'a', '--what', 'b', '--ref', 'chat: ok').status, 0)
})

test('the summary counts neither the commits from before the thread began nor merges', () => {
  const dir = project({ graph: PLAN, thread: { current: 'a' } })
  git(dir, 'init', '-q')
  const before = { ...process.env, GIT_AUTHOR_DATE: '2026-01-01T10:00:00Z', GIT_COMMITTER_DATE: '2026-01-01T10:00:00Z' }
  for (const m of ['one', 'two']) spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', `chore: ${m}`], { cwd: dir, env: before })
  writeFileSync(join(dir, '.ariadne', 'log.jsonl'), JSON.stringify({ at: '2026-06-01T10:00Z', id: 'a', op: 'start', text: 'started a' }) + '\n')
  assert.doesNotMatch(run(dir, 'summary').stdout, /senza Thread/)
  git(dir, 'checkout', '-q', '-b', 'side')
  git(dir, 'commit', '-q', '--allow-empty', '-m', 'feat: side\n\nThread: a')
  git(dir, 'checkout', '-q', '-')
  git(dir, 'merge', '-q', '--no-ff', '--no-edit', 'side')
  assert.doesNotMatch(run(dir, 'summary').stdout, /senza Thread/)
})

test('from a subfolder ariadne works on the project root, and never climbs out of another git repository', () => {
  const dir = project({ graph: GOOD, thread: { current: 'b' } })
  const sub = join(dir, 'src', 'deep')
  mkdirSync(sub, { recursive: true })
  const show = run(sub, 'show', 'b')
  assert.equal(show.status, 0, show.stderr)
  assert.match(show.stdout, /Title b/)
  assert.match(run(sub, 'summary').stdout, /^Sei in: Title b \(active\)/)
  assert.equal(run(sub, 'init').status, 0)
  assert.equal(existsSync(join(sub, '.ariadne')), false)
  const inner = join(dir, 'vendor', 'lib')
  mkdirSync(inner, { recursive: true })
  git(inner, 'init', '-q')
  assert.equal(spawnSync(process.execPath, [CLI, 'summary', '--hook'], { cwd: inner, encoding: 'utf8', input: '{}' }).stdout, '')
})

test('doctor reads the Claude Code configuration of CLAUDE_CONFIG_DIR and ~/.claude, and exits 0', () => {
  const home = mkdtempSync(join(tmpdir(), 'ariadne-'))
  mkdirSync(join(home, 'profile', 'skills', 'handoff'), { recursive: true })
  writeFileSync(join(home, 'profile', 'skills', 'handoff', 'SKILL.md'), 'Rewrite STATE.md.\n')
  mkdirSync(join(home, '.claude'), { recursive: true })
  writeFileSync(join(home, '.claude', 'CLAUDE.md'), 'Next lives in STATE.md.\n')
  const dir = project({ graph: GOOD, thread: { current: 'b' } })
  const env = { ...process.env, HOME: home, CLAUDE_CONFIG_DIR: join(home, 'profile') }
  const r = spawnSync(process.execPath, [CLI, 'doctor'], { cwd: dir, encoding: 'utf8', env })
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /^ariadne doctor: 2 righe in 2 file/)
  assert.match(r.stdout, /\n- ~\/profile\/skills\/handoff\/SKILL\.md:1 Rewrite STATE\.md\.\n/)
  assert.match(r.stdout, /\n- ~\/\.claude\/CLAUDE\.md:1 Next lives in STATE\.md\.\n/)
})

test('migrate --apply writes the nodes, moves the files into the archive with git mv and keeps what it needs to undo', () => {
  const dir = project()
  git(dir, 'init', '-q')
  run(dir, 'init')
  writeFileSync(join(dir, 'STATE.md'), '## Milestone\nShip it.\n\n## Next\n1. Write docs\n\n## Open decisions and risks\n- Decide the host?\n- Never run `rf migrate`.\n')
  writeFileSync(join(dir, 'LOG.md'), '- 2026-10-01 · Started · abc1234\n')
  git(dir, 'add', 'STATE.md', 'LOG.md')
  git(dir, 'commit', '-q', '-m', 'chore: state')
  const env = { ...process.env, ARIADNE_NOW: '2026-11-17T10:00Z' }
  const r = spawnSync(process.execPath, [CLI, 'migrate', '--apply'], { cwd: dir, encoding: 'utf8', env })
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /STATE\.md → \.ariadne\/archive\/STATE-2026-11-17\.md/)
  assert.match(r.stdout, /migrate --undo/)
  assert.match(r.stdout, /CLAUDE\.md o docs\/.*\n- Open decisions and risks/s)
  assert.equal(existsSync(join(dir, 'STATE.md')), false)
  assert.equal(readFileSync(join(dir, '.ariadne', 'archive', 'LOG-2026-11-17.md'), 'utf8'), '- 2026-10-01 · Started · abc1234\n')
  assert.match(git(dir, 'status', '--short').stdout, /^R {2}STATE\.md -> \.ariadne\/archive\/STATE-2026-11-17\.md$/m)
  const nodes = readFileSync(join(dir, '.ariadne', 'graph.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l))
  assert.deepEqual(nodes.map(n => n.kind), ['milestone', 'step', 'step', 'decision'])
  const saved = JSON.parse(readFileSync(join(dir, '.ariadne', 'archive', 'migration.json'), 'utf8'))
  assert.deepEqual([saved.graph, saved.archive.length], ['', 2])
  assert.equal(run(dir, 'validate').status, 0, run(dir, 'validate').stderr)
  assert.equal(run(dir, 'migrate', '--apply').status, 1)
})

test('migrate --apply moves a file git does not track with a plain rename', () => {
  const dir = project()
  git(dir, 'init', '-q')
  run(dir, 'init')
  writeFileSync(join(dir, 'LOG.md'), '- 2026-10-01 · Started\n')
  assert.equal(run(dir, 'migrate', '--apply').status, 0)
  assert.equal(existsSync(join(dir, 'LOG.md')), false)
  assert.equal(readdirSync(join(dir, '.ariadne', 'archive')).filter(f => f.startsWith('LOG-')).length, 1)
})

test('migrate --undo puts the files and the graph back, once, and only while the graph is as the migration left it', () => {
  const setup = () => {
    const dir = project()
    git(dir, 'init', '-q')
    run(dir, 'init')
    writeFileSync(join(dir, 'STATE.md'), '## Next\n1. Write docs\n')
    writeFileSync(join(dir, 'LOG.md'), '- 2026-10-01 · Started\n')
    git(dir, 'add', 'STATE.md', 'LOG.md')
    git(dir, 'commit', '-q', '-m', 'chore: state')
    assert.equal(run(dir, 'migrate', '--apply').status, 0)
    return dir
  }
  const dir = setup()
  const r = run(dir, 'migrate', '--undo')
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /annullata/)
  assert.equal(readFileSync(join(dir, 'STATE.md'), 'utf8'), '## Next\n1. Write docs\n')
  assert.equal(git(dir, 'status', '--short', 'STATE.md', 'LOG.md', '.ariadne/archive').stdout, '')
  assert.deepEqual(['graph.jsonl', 'thread.json', 'log.jsonl', 'archive/migration.json'].map(f => existsSync(join(dir, '.ariadne', f))), [false, false, false, false])
  assert.equal(run(dir, 'migrate', '--undo').status, 1)

  const changed = setup()
  run(changed, 'add', 'risk', 'Late', '--what', 'Added after.', '--under', 'm1')
  const refused = run(changed, 'migrate', '--undo')
  assert.equal(refused.status, 1)
  assert.match(refused.stderr, /cambiato dopo la migrazione/)
  assert.equal(existsSync(join(changed, 'STATE.md')), false)
})

test('export writes STATE.md and LOG.md from the thread, and never over a hand-written one', () => {
  const dir = project({ graph: [n('m1', { kind: 'milestone', title: 'Ship', status: 'active', confirmed: { at: AT, ref: 'chat' } }), n('a', { parent: 'm1', status: 'active' })], thread: { current: 'a' } })
  const r = run(dir, 'export')
  assert.equal(r.status, 0, r.stderr)
  assert.match(readFileSync(join(dir, 'STATE.md'), 'utf8'), /^<!-- generated by ariadne[^\n]*\n# State — .*\n[\s\S]*1\. a Title a/)
  assert.match(readFileSync(join(dir, 'LOG.md'), 'utf8'), /^<!-- generated by ariadne/)
  assert.equal(run(dir, 'export').status, 0)
  assert.doesNotMatch(run(dir, 'init').stdout, /STATE\.md/)
  assert.match(run(dir, 'migrate').stderr, /niente da migrare/)
  const mine = project({ graph: GOOD, thread: { current: 'b' } })
  writeFileSync(join(mine, 'STATE.md'), '# State — mine\n')
  const refused = run(mine, 'export')
  assert.equal(refused.status, 1)
  assert.match(refused.stderr, /STATE\.md.*a mano.*ariadne migrate/)
  assert.equal(readFileSync(join(mine, 'STATE.md'), 'utf8'), '# State — mine\n')
  assert.equal(run(mine, 'export', '--always').status, 1)
  assert.equal(existsSync(join(mine, '.ariadne', 'config.json')), false)
})

test('export --always keeps STATE.md in step with every change, until --off', () => {
  const dir = project({ graph: [n('m1', { kind: 'milestone', title: 'Ship', status: 'active', confirmed: { at: AT, ref: 'chat' } }), n('a', { parent: 'm1', status: 'active' })], thread: { current: 'a' } })
  assert.equal(run(dir, 'export', '--always').status, 0)
  run(dir, 'add', 'risk', 'Keys expire', '--what', 'Bedrock 403.', '--under', 'a')
  assert.match(readFileSync(join(dir, 'STATE.md'), 'utf8'), /Rischio a\.1 Keys expire/)
  assert.equal(run(dir, 'export', '--off').status, 0)
  run(dir, 'add', 'risk', 'Later', '--what', 'Not exported.', '--under', 'a')
  assert.doesNotMatch(readFileSync(join(dir, 'STATE.md'), 'utf8'), /Later/)
})
