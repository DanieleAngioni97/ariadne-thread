#!/usr/bin/env node
// ariadne: the command line over .ariadne/ in the current directory.
// Commands: docs/implementazione.md § m3.5 and § m3.6. `summary` and `sync` always exit 0: a hook must
// never block the prompt or a tool call.

import { spawn, spawnSync } from 'node:child_process'
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { apply } from '../src/apply.mjs'
import { band } from '../src/band.mjs'
import { parse } from '../src/graph.mjs'
import { show, why } from '../src/inspect.mjs'
import { openViewer } from '../src/open.mjs'
import { summarize } from '../src/summary.mjs'
import { serve } from '../src/serve.mjs'
import { opsFromCommits, untracked } from '../src/trailers.mjs'
import { validate } from '../src/validate.mjs'

const GRAPH = '.ariadne/graph.jsonl'
const THREAD = '.ariadne/thread.json'
const LOG = '.ariadne/log.jsonl'
const RECENT_COMMITS = 20
const VIEW_PORT = 8790
const USAGE = `uso: ariadne <comando>
  summary · show <id> · why <id> · log [n] · validate [file]
  plan <parent> "<passo>"… --ref "<approvazione>"
  start <id> · close <id> "<esito>" (--commit sha | --file path | --message testo)
  add <kind> "<titolo>" --what "…" [--under id] [--after a,b] [--why …] [--detail …] [--reentry id] [--id x] [--start | --done]
  fill <id> [--what|--why|--detail|--title …] [--commit|--file|--message …]
  defer <id> <milestone> · replace <id> <successore>
  move <id> <parent> [--after a,b] · undo · confirm <id>|--all · reject <id> [successore]
  apply <ops.json> · sync [--hook] · view [--port n] · open [id] [--port n] · band [--review i]
  --by user: l'azione viene da te (move, undo, confirm e reject lo sono sempre)`

const FLAGS = {
  ref: { type: 'string' }, what: { type: 'string' }, why: { type: 'string' }, detail: { type: 'string' },
  title: { type: 'string' }, under: { type: 'string' }, after: { type: 'string' }, reentry: { type: 'string' },
  id: { type: 'string' }, start: { type: 'boolean' }, done: { type: 'boolean' }, all: { type: 'boolean' }, hook: { type: 'boolean' }, port: { type: 'string' }, review: { type: 'string' },
  by: { type: 'string' }, commit: { type: 'string', multiple: true }, file: { type: 'string', multiple: true },
  message: { type: 'string', multiple: true },
}
const USER_OPS = ['move', 'undo', 'confirm', 'reject']

const now = () => new Date().toISOString().slice(0, 16) + 'Z'

function readThread(nodes) {
  if (existsSync(THREAD)) return JSON.parse(readFileSync(THREAD, 'utf8'))
  return { current: nodes.find(n => n.status === 'active' && n.kind !== 'milestone')?.id }
}

function usage() {
  console.error(USAGE)
  process.exit(2)
}

/** The latest commits, newest first, with their `Thread:` values and changed files; null outside git. */
function commits() {
  const format = '--format=%x1d%h%x1f%(trailers:key=Thread,valueonly,separator=%x1e)%x1f'
  const r = spawnSync('git', ['log', `-n${RECENT_COMMITS}`, '--name-only', format], { encoding: 'utf8' })
  if (r.status !== 0) return null
  return r.stdout.split('\x1d').filter(Boolean).map(entry => {
    const [sha, values = '', names = ''] = entry.split('\x1f')
    return { sha, thread: values.split('\x1e').map(v => v.trim()).filter(Boolean), files: names.split('\n').filter(Boolean) }
  })
}

/** Applies `ops` and writes graph, thread and log; returns the log entries or the refusal errors. */
function commit(ops, by) {
  const text = readFileSync(GRAPH, 'utf8')
  const thread = readThread(parse(text))
  const r = apply({ text, thread, ops, at: now(), by })
  if (!r.ok) return r
  if (r.text !== text) writeFileSync(GRAPH, r.text)
  if (JSON.stringify(r.thread) !== JSON.stringify(thread)) writeFileSync(THREAD, JSON.stringify(r.thread, null, 2) + '\n')
  if (r.log.length) appendFileSync(LOG, r.log.map(l => JSON.stringify(l)).join('\n') + '\n')
  return r
}

function run(ops, by) {
  const r = commit(ops, by)
  if (!r.ok) {
    for (const e of r.errors) console.error(`ariadne: ${e}`)
    process.exit(1)
  }
  for (const l of r.log) console.log(`↺ ${l.text}`)
}

/** The band's rows as JSON for the mod (specifica § Banda); `review` is the queue item shown one at a time. */
function bandJson(review) {
  const text = existsSync(GRAPH) ? readFileSync(GRAPH, 'utf8') : null
  const thread = text == null ? null : readThread(parse(text))
  const log = existsSync(LOG) ? readFileSync(LOG, 'utf8').trimEnd().split('\n').filter(Boolean).map(l => JSON.parse(l)) : []
  const index = review === undefined ? null : Number(review)
  console.log(JSON.stringify({ viewer: VIEW_PORT, rows: band({ text, thread, log, review: Number.isInteger(index) ? index : null }) }))
}

function summary() {
  if (!existsSync(GRAPH)) return console.log("ariadne: nessun grafo in .ariadne/ · l'agente lo crea con il primo piano")
  const text = readFileSync(GRAPH, 'utf8')
  const nodes = parse(text)
  const out = [summarize(nodes, readThread(nodes))]
  const errors = validate(text)
  if (errors.length > 0) {
    const [e] = errors
    const more = errors.length > 1 ? ` (+${errors.length - 1})` : ''
    out.push(`⚠ grafo non valido: riga ${e.line}${e.id ? ` ${e.id}` : ''} [${e.rule}] ${e.message}${more}`)
  }
  const recent = commits()
  const k = recent ? untracked(recent) : 0
  if (k > 0) out.push(`⚠ ${k} commit senza Thread: dall'ultimo aggiornamento del grafo`)
  console.log(out.join('\n'))
}

/** Records the `Thread:` lines of recent commits; one operation at a time, so one bad line blocks nothing. */
function sync(hook) {
  if (hook) {
    let input = {}
    try { input = JSON.parse(readFileSync(0, 'utf8')) } catch { return }
    if (!/\bgit\b[^|;&]*\bcommit\b/.test(input.tool_input?.command ?? '')) return
  }
  if (!existsSync(GRAPH)) return
  const recent = commits()
  if (!recent) return
  const recorded = new Set(parse(readFileSync(GRAPH, 'utf8')).flatMap(n => (n.proof ?? []).filter(p => p.type === 'commit').map(p => p.ref)))
  const lines = []
  for (const op of opsFromCommits(recent, recorded)) {
    const r = commit([op], 'agent')
    if (r.ok) lines.push(...r.log.map(l => `↺ ${l.text}`))
    else lines.push(`⚠ Thread: ${op.id} non registrato: ${r.errors[0]}`)
  }
  if (lines.length === 0) return
  if (!hook) return console.log(lines.join('\n'))
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: `ariadne:\n${lines.join('\n')}` } }))
}

function inspect(fn, id) {
  const text = fn(parse(readFileSync(GRAPH, 'utf8')), id)
  if (text === null) {
    console.error(`ariadne: nodo ${id} non trovato`)
    process.exit(1)
  }
  console.log(text)
}

function check(file = GRAPH) {
  const errors = validate(readFileSync(file, 'utf8'))
  for (const e of errors) console.error(`${file}:${e.line} ${e.id ?? ''} [${e.rule}] ${e.message}`)
  if (errors.length > 0) process.exit(1)
  console.log(`${file}: ok`)
}

function showLog(n = 20) {
  if (!existsSync(LOG)) return
  const entries = readFileSync(LOG, 'utf8').trimEnd().split('\n').filter(Boolean).map(l => JSON.parse(l))
  for (const e of entries.slice(-n)) console.log(`${e.at} ${e.text}`)
}

const list = value => value?.split(',').map(s => s.trim()).filter(Boolean)
const proofs = v => [
  ...(v.commit ?? []).map(ref => ({ type: 'commit', ref })),
  ...(v.file ?? []).map(ref => ({ type: 'file', ref })),
  ...(v.message ?? []).map(ref => ({ type: 'message', ref })),
]

/** One operation from the command line, or null for a malformed command. */
function operation(command, args, v) {
  const [a, b] = args
  switch (command) {
    case 'plan': return a && args.length > 1 ? { op: 'plan', parent: a, titles: args.slice(1), ref: v.ref } : null
    case 'start': return a ? { op: 'start', id: a } : null
    case 'close': return a ? { op: 'close', id: a, what: b, proof: proofs(v) } : null
    case 'fill': return a ? { op: 'fill', id: a, what: v.what, why: v.why, detail: v.detail, title: v.title, proof: proofs(v) } : null
    case 'add': {
      if (!a || !b) return null
      const node = { kind: a, title: b, what: v.what, why: v.why, detail: v.detail, after: list(v.after), reentry: v.reentry, id: v.id, start: v.start, status: v.done ? 'done' : undefined }
      if (v.under) node.parent = v.under
      const p = proofs(v)
      if (p.length) node.proof = p
      for (const k of Object.keys(node)) if (node[k] === undefined) delete node[k]
      return { op: 'add', node }
    }
    case 'defer': return a && b ? { op: 'defer', id: a, to: b } : null
    case 'replace': return a && b ? { op: 'replace', id: a, by: b } : null
    case 'move': return a && b ? { op: 'move', id: a, parent: b, after: list(v.after) } : null
    case 'undo': return { op: 'undo' }
    case 'confirm': return a || v.all ? { op: 'confirm', id: a, all: v.all } : null
    case 'reject': return a ? { op: 'reject', id: a, by: b } : null
    default: return null
  }
}

let parsed
try {
  parsed = parseArgs({ args: process.argv.slice(2), options: FLAGS, allowPositionals: true })
} catch (error) {
  console.error(`ariadne: ${error.message}`)
  usage()
}
const { positionals: [command, ...args], values } = parsed

if (command === 'summary') {
  try {
    summary()
  } catch (error) {
    console.log(`ariadne: riassunto non disponibile (${error.message})`)
  }
}
else if (command === 'band') {
  try {
    bandJson(values.review)
  } catch (error) {
    console.log(JSON.stringify({ viewer: VIEW_PORT, rows: [{ kind: 'error', text: `⚠ ariadne: banda non disponibile (${error.message})`, actions: [] }] }))
  }
}
else if (command === 'sync') {
  try {
    sync(values.hook)
  } catch (error) {
    if (!values.hook) console.error(`ariadne: sync non riuscito (${error.message})`)
  }
}
else if (command === 'show' && args[0]) inspect(show, args[0])
else if (command === 'why' && args[0]) inspect(why, args[0])
else if (command === 'validate') check(args[0])
else if (command === 'log') showLog(Number(args[0]) || undefined)
else if (command === 'view') {
  const port = Number(values.port) || VIEW_PORT
  serve(process.cwd(), port)
    .on('listening', () => console.log(`ariadne: viewer su http://127.0.0.1:${port}/ (Ctrl+C per chiudere)`))
    .on('error', error => {
      console.error(`ariadne: viewer non avviato (${error.code === 'EADDRINUSE' ? `porta ${port} occupata, prova --port` : error.message})`)
      process.exitCode = 1
    })
}
else if (command === 'open') {
  const port = Number(values.port) || VIEW_PORT
  const probe = () => fetch(`http://127.0.0.1:${port}/root`).then(r => r.text(), () => null)
  // The viewer outlives this command: detached, like an `ariadne view` started by hand.
  const start = () => spawn(process.execPath, [fileURLToPath(import.meta.url), 'view', '--port', String(port)], { detached: true, stdio: 'ignore' }).unref()
  const launch = url => spawnSync('open', [url])
  openViewer({ root: process.cwd(), port, id: args[0], probe, start, launch })
    .then(url => console.log(`ariadne: viewer su ${url}`))
    .catch(error => {
      console.error(`ariadne: ${error.message}`)
      process.exitCode = 1
    })
}
else if (command === 'apply' && args[0]) run(JSON.parse(readFileSync(args[0], 'utf8')), values.by === 'user' ? 'user' : 'agent')
else {
  const op = operation(command, args, values)
  if (!op) usage()
  run([op], USER_OPS.includes(command) || values.by === 'user' ? 'user' : 'agent')
}
