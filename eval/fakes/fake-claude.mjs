#!/usr/bin/env node
// A stand-in for `claude -p` in the runner tests: runs the hooks from --settings like the real CLI and
// prints a stream-json flow. FAKE_ANSWER is the reply, FAKE_TOOL_PATH a Read it pretends to make,
// FAKE_WRITE a file it creates in the working folder, FAKE_HANDOFF writes STATE.md and LOG.md, FAKE_CHECK is
// the reply to a fact-check prompt, FAKE_ERROR an API error such as the usage limit.

import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const settings = args.includes('--settings') ? JSON.parse(readFileSync(args[args.indexOf('--settings') + 1], 'utf8')) : {}
const emit = e => console.log(JSON.stringify(e))
// Like Claude Code, each hook reads the session on stdin.
const session = `fake-${process.pid}-${Date.now()}`
const run = event => (settings.hooks?.[event] ?? []).flatMap(m => m.hooks).map(h => execSync(h.command, { encoding: 'utf8', shell: '/bin/sh', input: JSON.stringify({ session_id: session, hook_event_name: event }) }))

for (const output of run('SessionStart')) emit({ type: 'system', subtype: 'hook_response', hook_event: 'SessionStart', output, stdout: output })
run('UserPromptSubmit')
emit({ type: 'system', subtype: 'init', cwd: process.cwd(), tools: args[args.indexOf('--tools') + 1].split(',') })
if (process.env.FAKE_COMMAND) {
  emit({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 't0', name: 'Bash', input: { command: process.env.FAKE_COMMAND } }] } })
}
if (process.env.FAKE_TOOL_PATH) {
  emit({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 't1', name: 'Read', input: { file_path: process.env.FAKE_TOOL_PATH } }] } })
}
if (process.env.FAKE_WRITE) writeFileSync(process.env.FAKE_WRITE, 'x\n')
const prompt = args[args.indexOf('-p') + 1]
const checking = prompt.startsWith('Fact-check')
if (process.env.FAKE_HANDOFF && !checking) {
  writeFileSync('STATE.md', `# State\n\nNext: ${prompt.match(/I start "([^"]+)"/g)?.at(-1) ?? 'none'}\n`)
  writeFileSync('LOG.md', (existsSync('LOG.md') ? readFileSync('LOG.md', 'utf8') : '# Log\n') + '- a milestone\n')
}
const answer = checking ? (process.env.FAKE_CHECK ?? '{"changes":[]}') : process.env.FAKE_ANSWER ?? 'done'
emit({ type: 'assistant', message: { content: [{ type: 'text', text: answer }] } })
if (process.env.FAKE_ERROR) { emit({ type: 'result', subtype: 'error', is_error: true, result: 'usage limit' }); process.exit(1) }
emit({ type: 'result', subtype: 'success', is_error: false, result: answer, total_cost_usd: 0.01, usage: { input_tokens: 10, cache_creation_input_tokens: 100, cache_read_input_tokens: 1000, output_tokens: 5 } })
