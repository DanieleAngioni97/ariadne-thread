#!/usr/bin/env node
// ariadne: the command line over .ariadne/ in the current directory.
// Commands: docs/implementazione.md § m3.5 and § m3.6. `card`, `summary` and `sync` always exit 0: a hook must
// never block the prompt or a tool call.

import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { apply } from '../src/apply.mjs'
import { band } from '../src/band.mjs'
import { card, view } from '../src/card.mjs'
import { behind } from '../src/check.mjs'
import { parse } from '../src/graph.mjs'
import { systemLang, words } from '../src/i18n.mjs'
import { show, why } from '../src/inspect.mjs'
import { browserCommand, openViewer } from '../src/open.mjs'
import { keepOut, savePort, viewerPort } from '../src/port.mjs'
import { brokenRefs } from '../src/refs.mjs'
import { summarize } from '../src/summary.mjs'
import { serve } from '../src/serve.mjs'
import { opsFromCommits, untracked } from '../src/trailers.mjs'
import { validate } from '../src/validate.mjs'

const GRAPH = '.ariadne/graph.jsonl'
const THREAD = '.ariadne/thread.json'
const LOG = '.ariadne/log.jsonl'
const VIEW = '.ariadne/STATE.md'
const HISTORY = 2000
const RECENT_COMMITS = 20
// The language: ARIADNE_LANG, else `lang` in .ariadne/config.json, else the system's, else English (src/i18n.mjs).
if (!process.env.ARIADNE_LANG) {
  let configured
  try { configured = JSON.parse(readFileSync('.ariadne/config.json', 'utf8')).lang } catch {}
  process.env.ARIADNE_LANG = configured || systemLang(process.env)
}

const say = words({
  en: {
    usage: `usage: ariadne <command>
  init · card [--hook] · summary [--hook] · show <id> · why <id> · log [n] · validate [file]
  plan <parent> "<step>"… --ref "<approval>"
  start <id> · pause <id> · close <id> "<outcome>" (--commit sha | --file path | --message text)
  add <kind> "<title>" --what "…" [--under id] [--after a,b] [--why …] [--detail …] [--reentry id] [--id x] [--start | --done]
  fill <id> [--what|--why|--detail|--title …] [--commit|--file|--message …]
  defer <id> <milestone> · replace <id> <successor> · relink <old path> <new>
  move <id> <parent> [--after a,b] · undo · confirm <id>|--all · reject <id> [successor]
  apply <ops.json> · sync [--hook] · view [--port n] · open [id] [--port n] · band [--review i]
  --by user: the action comes from you (move, undo, confirm and reject always do)`,
    noFile: id => `ariadne: ⚠ ${id} closes with no file or commit: where does the result live? ariadne fill ${id} --file <path>[#section]`,
    ready: 'ariadne: project ready in .ariadne/ · ask the agent to keep the thread: the graph starts with the first plan',
    noGraph: 'ariadne: no graph in .ariadne/ yet · the agent starts it with the first plan',
    invalid: (line, id, rule, message, more) => `⚠ invalid graph: line ${line}${id ? ` ${id}` : ''} [${rule}] ${message}${more}`,
    untracked: k => `⚠ ${k} commits without Thread: since the graph last changed`,
    notRecorded: (id, error) => `⚠ Thread: ${id} not recorded: ${error}`,
    saveGraph: id => `save the graph now, in a commit of its own: git add .ariadne && git commit -m "chore(ariadne): <what changed>" with the trailer Thread: ${id}`,
    unknown: id => `ariadne: node ${id} not found`,
    noSummary: error => `ariadne: summary unavailable (${error})`,
    noCard: error => `ariadne: card unavailable (${error})`,
    noBand: error => `⚠ ariadne: band unavailable (${error})`,
    noSync: error => `ariadne: sync failed (${error})`,
    viewing: port => `ariadne: viewer at http://127.0.0.1:${port}/ (Ctrl+C to stop)`,
    taken: port => `port ${port} is taken, try --port`,
    notStarted: why => `ariadne: viewer not started (${why})`,
    opened: url => `ariadne: viewer at ${url}`,
    openByHand: url => `ariadne: viewer at ${url}: no browser could be opened, open it by hand`,
  },
  it: {
    usage: `uso: ariadne <comando>
  init · card [--hook] · summary [--hook] · show <id> · why <id> · log [n] · validate [file]
  plan <parent> "<passo>"… --ref "<approvazione>"
  start <id> · pause <id> · close <id> "<esito>" (--commit sha | --file path | --message testo)
  add <kind> "<titolo>" --what "…" [--under id] [--after a,b] [--why …] [--detail …] [--reentry id] [--id x] [--start | --done]
  fill <id> [--what|--why|--detail|--title …] [--commit|--file|--message …]
  defer <id> <milestone> · replace <id> <successore> · relink <vecchio percorso> <nuovo>
  move <id> <parent> [--after a,b] · undo · confirm <id>|--all · reject <id> [successore]
  apply <ops.json> · sync [--hook] · view [--port n] · open [id] [--port n] · band [--review i]
  --by user: l'azione viene da te (move, undo, confirm e reject lo sono sempre)`,
    noFile: id => `ariadne: ⚠ ${id} si chiude senza file né commit: dove sta il risultato? ariadne fill ${id} --file <percorso>[#sezione]`,
    ready: "ariadne: progetto pronto in .ariadne/ · chiedi all'agente di tracciare il lavoro: il grafo nasce con il primo piano",
    noGraph: "ariadne: nessun grafo in .ariadne/ · l'agente lo crea con il primo piano",
    invalid: (line, id, rule, message, more) => `⚠ grafo non valido: riga ${line}${id ? ` ${id}` : ''} [${rule}] ${message}${more}`,
    untracked: k => `⚠ ${k} commit senza Thread: dall'ultimo aggiornamento del grafo`,
    notRecorded: (id, error) => `⚠ Thread: ${id} non registrato: ${error}`,
    saveGraph: id => `salva subito il grafo, in un commit a parte: git add .ariadne && git commit -m "chore(ariadne): <cosa è cambiato>" con il trailer Thread: ${id}`,
    unknown: id => `ariadne: nodo ${id} non trovato`,
    noSummary: error => `ariadne: riassunto non disponibile (${error})`,
    noCard: error => `ariadne: scheda non disponibile (${error})`,
    noBand: error => `⚠ ariadne: banda non disponibile (${error})`,
    noSync: error => `ariadne: sync non riuscito (${error})`,
    viewing: port => `ariadne: viewer su http://127.0.0.1:${port}/ (Ctrl+C per chiudere)`,
    taken: port => `porta ${port} occupata, prova --port`,
    notStarted: why => `ariadne: viewer non avviato (${why})`,
    opened: url => `ariadne: viewer su ${url}`,
    openByHand: url => `ariadne: viewer su ${url}: non si è aperto nessun browser, aprilo a mano`,
  },
})

const FLAGS = {
  ref: { type: 'string' }, what: { type: 'string' }, why: { type: 'string' }, detail: { type: 'string' },
  title: { type: 'string' }, under: { type: 'string' }, after: { type: 'string' }, reentry: { type: 'string' },
  id: { type: 'string' }, start: { type: 'boolean' }, done: { type: 'boolean' }, all: { type: 'boolean' }, hook: { type: 'boolean' }, port: { type: 'string' }, review: { type: 'string' },
  by: { type: 'string' }, commit: { type: 'string', multiple: true }, file: { type: 'string', multiple: true },
  message: { type: 'string', multiple: true },
}
const USER_OPS = ['move', 'undo', 'confirm', 'reject']

// ARIADNE_NOW fixes the clock, so the evaluation generator writes the same bytes on every run.
const now = () => process.env.ARIADNE_NOW || new Date().toISOString().slice(0, 16) + 'Z'

function readThread(nodes) {
  if (existsSync(THREAD)) return JSON.parse(readFileSync(THREAD, 'utf8'))
  return { current: nodes.find(n => n.status === 'active' && n.kind !== 'milestone')?.id }
}

function usage() {
  console.error(say('usage'))
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

/** The files each commit touched, looked up by any prefix of its sha; empty outside git. */
function commitFiles() {
  const r = spawnSync('git', ['log', `-n${HISTORY}`, '--name-only', '--format=%x1d%H'], { encoding: 'utf8' })
  const all = r.status === 0 ? r.stdout.split('\x1d').filter(Boolean).map(e => e.trim().split('\n')) : []
  return { get: ref => all.find(([sha]) => sha.startsWith(ref))?.slice(1).filter(Boolean) }
}

/** Rewrites .ariadne/STATE.md, the view for Read and grep; a .gitignore keeps it out of git. */
function writeView(nodes, thread) {
  writeFileSync(VIEW, view(nodes, thread, commitFiles()) + '\n')
  keepOut(process.cwd(), 'STATE.md')
}

/** What a hook already told this session, by session id; kept outside the repository. */
function told(session) {
  const dir = join(tmpdir(), 'ariadne-sessions')
  mkdirSync(dir, { recursive: true })
  const file = join(dir, createHash('sha1').update(`${process.cwd()}\0${session}`).digest('hex'))
  const hash = text => createHash('sha1').update(text).digest('hex')
  return {
    same: text => existsSync(file) && readFileSync(file, 'utf8') === hash(text),
    remember: text => writeFileSync(file, hash(text)),
  }
}

const sessionOf = () => {
  try { return JSON.parse(readFileSync(0, 'utf8')).session_id ?? null } catch { return null }
}

/** Applies `ops` and writes graph, thread and log; returns the log entries or the refusal errors. */
function commit(ops, by) {
  // Before the first node there is no graph yet: it starts empty.
  const text = existsSync(GRAPH) ? readFileSync(GRAPH, 'utf8') : ''
  const thread = readThread(parse(text))
  const r = apply({ text, thread, ops, at: now(), by })
  if (!r.ok) return r
  if (r.text !== text) writeFileSync(GRAPH, r.text)
  if (JSON.stringify(r.thread) !== JSON.stringify(thread)) writeFileSync(THREAD, JSON.stringify(r.thread, null, 2) + '\n')
  if (r.log.length) appendFileSync(LOG, r.log.map(l => JSON.stringify(l)).join('\n') + '\n')
  if (r.text !== text || JSON.stringify(r.thread) !== JSON.stringify(thread)) writeView(parse(r.text), r.thread)
  return r
}

function run(ops, by) {
  const r = commit(ops, by)
  if (!r.ok) {
    for (const e of r.errors) console.error(`ariadne: ${e}`)
    process.exit(1)
  }
  for (const l of r.log) console.log(`↺ ${l.text}`)
  // The memory lives in files: a result held by the chat alone is lost at the next /clear.
  const closed = r.log.filter(l => l.op === 'close').map(l => parse(r.text).find(n => n.id === l.id))
  for (const n of closed) {
    if (!(n.proof ?? []).some(p => p.type === 'file' || p.type === 'commit')) {
      console.error(say('noFile', n.id))
    }
  }
}

/** The band's rows as JSON for the mod (specifica § Banda); `review` is the queue item shown one at a time. */
function bandJson(review) {
  const text = existsSync(GRAPH) ? readFileSync(GRAPH, 'utf8') : null
  const thread = text == null ? null : readThread(parse(text))
  const log = existsSync(LOG) ? readFileSync(LOG, 'utf8').trimEnd().split('\n').filter(Boolean).map(l => JSON.parse(l)) : []
  const index = review === undefined ? null : Number(review)
  console.log(JSON.stringify({ viewer: viewerPort(process.cwd()), rows: band({ text, thread, log, review: Number.isInteger(index) ? index : null }) }))
}

/** Makes the current directory an ariadne project; running it again changes nothing. */
function init() {
  mkdirSync('.ariadne', { recursive: true })
  for (const name of ['STATE.md', 'local.json']) keepOut(process.cwd(), name)
  console.log(say('ready'))
}

/** The card at the start of a session; with `hook`, the session remembers the summary it stands for. */
function cardOut(hook) {
  if (!existsSync(GRAPH)) return console.log(say('noGraph'))
  const nodes = parse(readFileSync(GRAPH, 'utf8'))
  const thread = readThread(nodes)
  writeView(nodes, thread)
  console.log(card(nodes, thread, commitFiles()))
  const session = hook && sessionOf()
  if (session) told(session).remember(summaryText())
}

/** On every prompt; with `hook`, only when it changed since this session last heard it. */
function summary(hook) {
  if (!existsSync(GRAPH)) return console.log(say('noGraph'))
  const text = summaryText()
  const session = hook && sessionOf()
  if (session) {
    const memory = told(session)
    if (memory.same(text)) return
    memory.remember(text)
  }
  console.log(text)
}

function summaryText() {
  const text = readFileSync(GRAPH, 'utf8')
  const nodes = parse(text)
  const out = [summarize(nodes, readThread(nodes))]
  const errors = validate(text)
  if (errors.length > 0) {
    const [e] = errors
    const more = errors.length > 1 ? ` (+${errors.length - 1})` : ''
    out.push(say('invalid', e.line, e.id, e.rule, e.message, more))
  }
  const recent = commits()
  const k = recent ? untracked(recent) : 0
  if (k > 0) out.push(say('untracked', k))
  return out.join('\n')
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
    else lines.push(say('notRecorded', op.id, r.errors[0]))
  }
  if (lines.length === 0) return
  if (!hook) return console.log(lines.join('\n'))
  // The proof is written after the commit, so .ariadne/ is left changed: the agent commits it at once.
  const current = readThread(parse(readFileSync(GRAPH, 'utf8'))).current
  if (current) lines.push(say('saveGraph', current))
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: `ariadne:\n${lines.join('\n')}` } }))
}

/** At the end of a turn, hands the agent back what the thread missed (src/check.mjs); once, never in a loop. */
function endOfTurn() {
  let input = {}
  try { input = JSON.parse(readFileSync(0, 'utf8')) } catch { return }
  if (input.stop_hook_active || !input.transcript_path || !existsSync(GRAPH)) return
  const entries = readFileSync(input.transcript_path, 'utf8').split('\n').filter(Boolean).flatMap(l => {
    try { return [JSON.parse(l)] } catch { return [] }
  })
  // A file gone since the turn still resolves through its folder.
  const real = path => {
    try { return realpathSync(path) } catch {}
    try { return join(realpathSync(dirname(path)), basename(path)) } catch { return path }
  }
  const nodes = parse(readFileSync(GRAPH, 'utf8'))
  const cited = nodes.flatMap(n => (n.proof ?? []).filter(p => p.type === 'file').map(p => p.ref))
  const recent = commits()
  const reasons = behind({
    entries, root: process.cwd(), home: homedir(), ignore: [real(tmpdir()) + '/', '/tmp/', '/private/tmp/'],
    cited, untracked: recent ? untracked(recent) : 0, real,
  })
  if (reasons.length === 0) return
  console.log(JSON.stringify({ decision: 'block', reason: `ariadne: ${reasons.join('\n')}` }))
}

function inspect(fn, id) {
  const text = fn(parse(readFileSync(GRAPH, 'utf8')), id)
  if (text === null) {
    console.error(say('unknown', id))
    process.exit(1)
  }
  console.log(text)
}

/** A file proof's target on disk: its text, '' for a folder, null when missing (`~` is the home folder). */
function readRef(path) {
  const full = path.startsWith('~/') ? join(homedir(), path.slice(2)) : path
  try {
    return statSync(full).isDirectory() ? '' : readFileSync(full, 'utf8')
  } catch {
    return null
  }
}

function check(file = GRAPH) {
  const text = readFileSync(file, 'utf8')
  const errors = validate(text)
  const lines = text.split('\n')
  const idOf = l => { try { return JSON.parse(l).id } catch { return null } }
  const lineOf = id => lines.findIndex(l => idOf(l) === id) + 1
  const nodes = errors.length > 0 ? [] : parse(text)
  for (const b of brokenRefs(nodes, { read: readRef })) errors.push({ line: lineOf(b.id), id: b.id, rule: 'file-ref', message: `${b.ref}: ${b.reason}${b.reason === 'file not found' ? ' (spostato? ariadne relink <vecchio> <nuovo>)' : ''}` })
  for (const e of errors) console.error(`${file}:${e.line} ${e.id ?? ''} [${e.rule}] ${e.message}`)
  if (errors.length > 0) process.exit(1)
  console.log(`${file}: ok`)
}

function showLog(n = 20) {
  if (!existsSync(LOG)) return
  const entries = readFileSync(LOG, 'utf8').trimEnd().split('\n').filter(Boolean).map(l => JSON.parse(l))
  for (const e of entries.slice(-n)) console.log(`${e.at} ${e.text}`)
}

// A file in the home folder is saved as ~/…: the graph lives in git and must not carry the local user name.
const homeRelative = ref => (ref.startsWith(homedir() + '/') ? '~' + ref.slice(homedir().length) : ref)
const list = value => value?.split(',').map(s => s.trim()).filter(Boolean)
const proofs = v => [
  ...(v.commit ?? []).map(ref => ({ type: 'commit', ref })),
  ...(v.file ?? []).map(ref => ({ type: 'file', ref: homeRelative(ref) })),
  ...(v.message ?? []).map(ref => ({ type: 'message', ref })),
]

/** One operation from the command line, or null for a malformed command. */
function operation(command, args, v) {
  const [a, b] = args
  switch (command) {
    case 'plan': return a && args.length > 1 ? { op: 'plan', parent: a, titles: args.slice(1), ref: v.ref } : null
    case 'start': return a ? { op: 'start', id: a } : null
    case 'pause': return a ? { op: 'pause', id: a } : null
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
    case 'relink': return a && b ? { op: 'relink', from: a, to: b } : null
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
// Installed once for every project, the hooks and the band speak only where `ariadne init` ran.
const quiet = !existsSync('.ariadne') && (values.hook || command === 'band')

if (quiet && command === 'band') console.log(JSON.stringify({ viewer: viewerPort(process.cwd()), rows: [] }))
else if (quiet) {}
else if (command === 'init') init()
else if (command === 'summary') {
  try {
    summary(values.hook)
  } catch (error) {
    console.log(say('noSummary', error.message))
  }
}
else if (command === 'card') {
  try {
    cardOut(values.hook)
  } catch (error) {
    console.log(say('noCard', error.message))
  }
}
else if (command === 'band') {
  try {
    bandJson(values.review)
  } catch (error) {
    console.log(JSON.stringify({ viewer: viewerPort(process.cwd()), rows: [{ kind: 'error', text: say('noBand', error.message), actions: [] }] }))
  }
}
else if (command === 'sync') {
  try {
    sync(values.hook)
  } catch (error) {
    if (!values.hook) console.error(say('noSync', error.message))
  }
}
else if (command === 'check') {
  try {
    endOfTurn()
  } catch {}
}
else if (command === 'show' && args[0]) inspect(show, args[0])
else if (command === 'why' && args[0]) inspect(why, args[0])
else if (command === 'validate') check(args[0])
else if (command === 'log') showLog(Number(args[0]) || undefined)
else if (command === 'view') {
  const root = process.cwd()
  const fixed = Boolean(values.port)
  const listen = port => serve(root, port)
    .on('listening', function () {
      const actual = this.address().port
      if (actual !== port) savePort(root, actual)
      console.log(say('viewing', actual))
    })
    .on('error', error => {
      // The project's port held by another server: the system picks a free one, saved for band and open.
      if (error.code === 'EADDRINUSE' && !fixed && port !== 0) return listen(0)
      console.error(say('notStarted', error.code === 'EADDRINUSE' ? say('taken', port) : error.message))
      process.exitCode = 1
    })
  listen(Number(values.port) || viewerPort(root))
}
else if (command === 'open') {
  const root = process.cwd()
  const fixed = Boolean(values.port)
  const port = () => Number(values.port) || viewerPort(root)
  const probe = p => fetch(`http://127.0.0.1:${p}/root`).then(r => r.text(), () => null)
  // The viewer outlives this command: detached, like an `ariadne view` started by hand.
  const start = () => spawn(process.execPath, [fileURLToPath(import.meta.url), 'view', ...(fixed ? ['--port', values.port] : [])], { detached: true, stdio: 'ignore' }).unref()
  let launched = true
  const launch = url => {
    const [cmd, cmdArgs] = browserCommand(process.platform, url)
    const r = spawnSync(cmd, cmdArgs, { stdio: 'ignore' })
    launched = !r.error && r.status === 0
  }
  openViewer({ root, port, id: args[0], probe, start, launch, fixed })
    .then(url => console.log(say(launched ? 'opened' : 'openByHand', url)))
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
