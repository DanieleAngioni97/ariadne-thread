// The plugin's command hooks, run as Claude Code runs them: through a shell, with the plugin's
// folder and the project's folder in the environment.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PLUGIN = fileURLToPath(new URL('..', import.meta.url))
const { hooks } = JSON.parse(readFileSync(new URL('./hooks.json', import.meta.url), 'utf8'))

const commands = event => hooks[event].flatMap(group => group.hooks.map(h => h.command))
const run = (command, project, input = '{}') => spawnSync('/bin/sh', ['-c', command], {
  cwd: tmpdir(), encoding: 'utf8', input,
  env: { ...process.env, CLAUDE_PLUGIN_ROOT: PLUGIN, CLAUDE_PROJECT_DIR: project },
})

test('the plugin hooks the start of a session, every prompt and every Bash call', () => {
  assert.deepEqual(Object.keys(hooks).sort(), ['PostToolUse', 'SessionStart', 'UserPromptSubmit'])
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
