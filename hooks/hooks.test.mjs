// The plugin's command hooks, run as Claude Code runs them: through a shell, with the plugin's
// folder and the project's folder in the environment.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// These tests read what ariadne writes in Italian; English has its own tests.
process.env.ARIADNE_LANG = 'it'

const PLUGIN = fileURLToPath(new URL('..', import.meta.url))
const { hooks } = JSON.parse(readFileSync(new URL('./hooks.json', import.meta.url), 'utf8'))

const commands = event => hooks[event].flatMap(group => group.hooks.map(h => h.command))
const run = (command, project, input = '{}') => spawnSync('/bin/sh', ['-c', command], {
  cwd: tmpdir(), encoding: 'utf8', input,
  env: { ...process.env, CLAUDE_PLUGIN_ROOT: PLUGIN, CLAUDE_PROJECT_DIR: project },
})

test('the plugin hooks the start of a session, every prompt, every Bash call and the end of every turn', () => {
  assert.deepEqual(Object.keys(hooks).sort(), ['PostToolUse', 'SessionStart', 'Stop', 'UserPromptSubmit'])
  for (const event of Object.keys(hooks)) assert.ok(commands(event).every(c => c.includes('${CLAUDE_PLUGIN_ROOT}/bin/ariadne.mjs')))
})

test('in a project without .ariadne/ every hook exits 0 and says nothing', () => {
  const project = mkdtempSync(join(tmpdir(), 'ariadne-hooks-'))
  for (const event of Object.keys(hooks)) {
    for (const command of commands(event)) {
      const r = run(command, project, JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git commit -m x' } }))
      assert.equal(r.status, 0, `${event}: ${r.stderr}`)
      assert.equal(r.stdout, '', event)
    }
  }
})

test('in a project after ariadne init the session starts with the card', () => {
  const project = mkdtempSync(join(tmpdir(), 'ariadne-hooks-'))
  spawnSync(process.execPath, [join(PLUGIN, 'bin', 'ariadne.mjs'), 'init'], { cwd: project })
  const r = run(commands('SessionStart')[0], project)
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /nessun grafo/)
})

test('a first run, as a new user lives it: init, a plan, a commit that closes a step, the graph saved, a clean tree', () => {
  const project = mkdtempSync(join(tmpdir(), 'ariadne-hooks-'))
  // The agent runs `ariadne` by name, through the wrapper the plugin puts on the PATH of Claude's Bash.
  const ariadne = (...args) => spawnSync(join(PLUGIN, 'bin', 'ariadne'), args, { cwd: project, encoding: 'utf8' })
  const git = (...args) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: project, encoding: 'utf8' })
  const afterBash = command => run(commands('PostToolUse')[0], project, JSON.stringify({ tool_name: 'Bash', tool_input: { command } }))
  try {
    git('init', '-q')
    git('commit', '-q', '--allow-empty', '-m', 'chore: start')
    assert.equal(ariadne('init').status, 0)
    assert.equal(ariadne('add', 'milestone', 'Calcolatrice', '--what', 'Le quattro operazioni', '--start').status, 0)
    assert.equal(ariadne('plan', 'm1', 'Somma', 'Prodotto', '--ref', 'chat: piano approvato').status, 0)

    writeFileSync(join(project, 'calc.py'), 'def add(a, b):\n    return a + b\n')
    git('add', 'calc.py', '.ariadne')
    git('commit', '-q', '-m', 'feat: add\n\nThread: m1.1 done: somma fatta')
    const recorded = afterBash('git commit -m "feat: add"')
    assert.equal(recorded.status, 0, recorded.stderr)
    const told = JSON.parse(recorded.stdout).hookSpecificOutput.additionalContext
    assert.match(told, /m1\.1/)
    assert.match(told, /git add \.ariadne && git commit -m "chore\(ariadne\): .*Thread: m1\.2/s)
    assert.match(git('status', '--porcelain').stdout, /^ M \.ariadne\//m)

    git('add', '.ariadne')
    git('commit', '-q', '-m', 'chore(ariadne): close the sum step\n\nThread: m1.2')
    assert.equal(afterBash('git commit -m "chore(ariadne)"').stdout, '')
    assert.equal(git('status', '--porcelain').stdout, '')

    const card = run(commands('SessionStart')[0], project)
    assert.equal(card.status, 0, card.stderr)
    assert.match(card.stdout, /Prodotto \(active\)/)
  } finally {
    rmSync(project, { recursive: true, force: true })
  }
})
