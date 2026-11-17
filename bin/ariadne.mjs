#!/usr/bin/env node
// ariadne: the command line over .ariadne/ in the current directory.
// Commands: docs/implementazione.md § m3.5 and § m3.6. `card`, `summary` and `sync` always exit 0: a hook must
// never block the prompt or a tool call.

import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync, truncateSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { apply } from '../src/apply.mjs'
import { band } from '../src/band.mjs'
import { card, view } from '../src/card.mjs'
import { behind } from '../src/check.mjs'
import { findConflicts, report } from '../src/doctor.mjs'
import { parse } from '../src/graph.mjs'
import { systemLang, words } from '../src/i18n.mjs'
import { show, why } from '../src/inspect.mjs'
import { elsewhere, preview, propose, readLog, readState } from '../src/migrate.mjs'
import { exportLog, exportState, isGenerated } from '../src/export.mjs'
import { onlyInChat } from '../src/chat.mjs'
import { browserCommand, openViewer } from '../src/open.mjs'
import { keepOut, savePort, viewerPort } from '../src/port.mjs'
import { brokenRefs } from '../src/refs.mjs'
import { summarize } from '../src/summary.mjs'
import { PACKAGE, serve } from '../src/serve.mjs'
import { opsFromCommits, untracked } from '../src/trailers.mjs'
import { validate } from '../src/validate.mjs'

const GRAPH = '.ariadne/graph.jsonl'
const THREAD = '.ariadne/thread.json'
const LOG = '.ariadne/log.jsonl'
const ARCHIVE = '.ariadne/archive'
const MIGRATION = '.ariadne/archive/migration.json'
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
  init · card [--hook] · summary [--hook] · show <id> · why <id> · log [n] · validate [file] · doctor
  migrate [--as n=decision|risk|pointer|drop,…] [--apply] · migrate --undo · export [--always | --off]
  plan <parent> "<step>"… [--what "<detail>"]… --ref "<approval>"
  start <id> · pause <id> · close <id> "<outcome>" (--commit sha | --file path | --message text)
  add <kind> "<title>" --what "…" [--under id] [--after a,b] [--why …] [--detail …] [--reentry id] [--id x] [--start | --done]
  fill <id> [--what|--why|--detail|--title …] [--commit|--file|--message …]
  defer <id> <milestone> · replace <id> <successor> · relink <old path> <new>
  move <id> <parent> [--after a,b] · undo · confirm <id>|--all · reject <id> [successor]
  apply <ops.json> · sync [--hook] · view [--port n] · open [id] [--port n] · band [--review i]
  --by user: the action comes from you (move, undo, confirm and reject always do)`,
    migrated: 'ariadne migrate: done · every new node waits for your confirmation (ariadne open) · to go back: ariadne migrate --undo',
    exported: always => `ariadne export: STATE.md and LOG.md written from the thread${always ? ', and kept in step with every change (export --off to stop)' : ''}`,
    exportOff: 'ariadne export: STATE.md and LOG.md are no longer updated; delete them when nobody reads them',
    handWritten: name => `ariadne export: ${name} is written by hand: move it into the thread first (ariadne migrate)`,
    undone: 'ariadne migrate: undone · STATE.md and LOG.md are back where they were, the graph is as before',
    noMigration: 'ariadne migrate --undo: no migration to undo',
    staleMigration: 'ariadne migrate --undo: the graph changed after the migration: undo those changes first, then try again',
    noOld: 'ariadne migrate: no STATE.md or LOG.md in the project root, nothing to migrate',
    badAs: value => `ariadne migrate: --as ${value}: write n=decision, risk, pointer or drop, n being the number in the preview`,
    chatOnly: (id, what) => `ariadne: ⚠ ${id} points to the chat (${what}): after /clear it is gone; write what was said (--message "chat <date>: …") or put it in a file`,
    noFile: id => `ariadne: ⚠ ${id} closes with no file or commit: where does the result live? ariadne fill ${id} --file <path>[#section]`,
    ready: 'ariadne: project ready in .ariadne/ · ask the agent to keep the thread: the graph starts with the first plan',
    oldState: files => `ariadne: found ${files.join(' and ')}: two sources of state are one too many. ariadne migrate shows how they move into the thread (Next → steps, open decisions and risks → nodes, commands and paths → CLAUDE.md or docs/); --apply moves the files into .ariadne/archive/, --undo goes back. Then ariadne doctor lists the hooks and skills that still use STATE.md or LOG.md.`,
    bandOff: 'ariadne: the band above the prompt needs hooks modules, in early access: add "env": { "CLAUDE_CODE_ENABLE_FUNCTION_HOOKS": "1" } to ~/.claude/settings.json and restart Claude Code. Everything else works without it.',
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
  init · card [--hook] · summary [--hook] · show <id> · why <id> · log [n] · validate [file] · doctor
  migrate [--as n=decision|risk|pointer|drop,…] [--apply] · migrate --undo · export [--always | --off]
  plan <parent> "<passo>"… [--what "<dettaglio>"]… --ref "<approvazione>"
  start <id> · pause <id> · close <id> "<esito>" (--commit sha | --file path | --message testo)
  add <kind> "<titolo>" --what "…" [--under id] [--after a,b] [--why …] [--detail …] [--reentry id] [--id x] [--start | --done]
  fill <id> [--what|--why|--detail|--title …] [--commit|--file|--message …]
  defer <id> <milestone> · replace <id> <successore> · relink <vecchio percorso> <nuovo>
  move <id> <parent> [--after a,b] · undo · confirm <id>|--all · reject <id> [successore]
  apply <ops.json> · sync [--hook] · view [--port n] · open [id] [--port n] · band [--review i]
  --by user: l'azione viene da te (move, undo, confirm e reject lo sono sempre)`,
    noFile: id => `ariadne: ⚠ ${id} si chiude senza file né commit: dove sta il risultato? ariadne fill ${id} --file <percorso>[#sezione]`,
    migrated: 'ariadne migrate: fatto · ogni nodo nuovo aspetta la tua conferma (ariadne open) · per tornare indietro: ariadne migrate --undo',
    exported: always => `ariadne export: STATE.md e LOG.md scritti dal filo${always ? ', e aggiornati a ogni modifica (export --off per smettere)' : ''}`,
    exportOff: 'ariadne export: STATE.md e LOG.md non vengono più aggiornati; cancellali quando nessuno li legge',
    handWritten: name => `ariadne export: ${name} è scritto a mano: prima portalo nel filo (ariadne migrate)`,
    undone: 'ariadne migrate: annullata · STATE.md e LOG.md sono tornati dov\'erano, il grafo è com\'era prima',
    noMigration: 'ariadne migrate --undo: nessuna migrazione da annullare',
    staleMigration: 'ariadne migrate --undo: il grafo è cambiato dopo la migrazione: annulla prima quei cambiamenti, poi riprova',
    chatOnly: (id, what) => `ariadne: ⚠ ${id} rimanda alla chat (${what}): dopo /clear non c'è più; scrivi cosa è stato detto (--message "chat <data>: …") o mettilo in un file`,
    noOld: 'ariadne migrate: nessun STATE.md né LOG.md nella root del progetto, niente da migrare',
    badAs: value => `ariadne migrate: --as ${value}: scrivi n=decision, risk, pointer o drop, con n il numero nell'anteprima`,
    ready: "ariadne: progetto pronto in .ariadne/ · chiedi all'agente di tracciare il lavoro: il grafo nasce con il primo piano",
    oldState: files => `ariadne: ${files.length > 1 ? 'trovati' : 'trovato'} ${files.join(' e ')}: due fonti dello stato sono una di troppo. ariadne migrate mostra come portarli nel filo (Next → passi, decisioni aperte e rischi → nodi, comandi e percorsi → CLAUDE.md o docs/); --apply sposta i file in .ariadne/archive/, --undo torna indietro. Poi ariadne doctor elenca hook e skill che usano ancora STATE.md o LOG.md.`,
    bandOff: 'ariadne: la banda sopra il prompt richiede gli hooks modules, in early access: aggiungi "env": { "CLAUDE_CODE_ENABLE_FUNCTION_HOOKS": "1" } a ~/.claude/settings.json e riavvia Claude Code. Tutto il resto funziona anche senza.',
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
  ref: { type: 'string' }, what: { type: 'string', multiple: true }, why: { type: 'string' }, detail: { type: 'string' },
  title: { type: 'string' }, under: { type: 'string' }, after: { type: 'string' }, reentry: { type: 'string' },
  id: { type: 'string' }, start: { type: 'boolean' }, done: { type: 'boolean' }, all: { type: 'boolean' }, hook: { type: 'boolean' }, port: { type: 'string' }, review: { type: 'string' },
  by: { type: 'string' }, commit: { type: 'string', multiple: true }, file: { type: 'string', multiple: true },
  message: { type: 'string', multiple: true }, as: { type: 'string', multiple: true }, apply: { type: 'boolean' }, undo: { type: 'boolean' }, always: { type: 'boolean' }, off: { type: 'boolean' },
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
  const format = '--format=%x1d%h%x1f%p%x1f%cI%x1f%(trailers:key=Thread,valueonly,separator=%x1e)%x1f'
  const r = spawnSync('git', ['log', `-n${RECENT_COMMITS}`, '--name-only', format], { encoding: 'utf8' })
  if (r.status !== 0) return null
  return r.stdout.split('\x1d').filter(Boolean).map(entry => {
    const [sha, parents = '', at = '', values = '', names = ''] = entry.split('\x1f')
    return {
      sha, at, merge: parents.trim().split(' ').length > 1,
      thread: values.split('\x1e').map(v => v.trim()).filter(Boolean), files: names.split('\n').filter(Boolean),
    }
  })
}

/** The commits without `Thread:` since the thread began, minus merges and those recorded as proof. */
function pending(recent, nodes) {
  const recorded = new Set(nodes.flatMap(n => (n.proof ?? []).filter(p => p.type === 'commit').map(p => p.ref)))
  let since
  try { since = JSON.parse(readFileSync(LOG, 'utf8').split('\n', 1)[0]).at } catch {}
  return recent ? untracked(recent, { recorded, since }) : 0
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
  if (readConfig().export) writeExport(nodes, thread)
}

const CONFIG = '.ariadne/config.json'
function readConfig() {
  try { return JSON.parse(readFileSync(CONFIG, 'utf8')) } catch { return {} }
}

/** STATE.md and LOG.md in the project root, generated from the thread (m6.7); false over a hand-written one. */
function writeExport(nodes, thread) {
  const mine = ['STATE.md', 'LOG.md'].find(name => existsSync(name) && !isGenerated(readFileSync(name, 'utf8')))
  if (mine) return mine
  const log = existsSync(LOG) ? readFileSync(LOG, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : []
  writeFileSync('STATE.md', exportState(nodes, thread, { project: basename(process.cwd()), at: now() }))
  writeFileSync('LOG.md', exportLog(log))
  return null
}

/** `export`: once, or `--always` on every change, or `--off`; never over a hand-written file. */
function exportCommand(values) {
  const remember = on => writeFileSync(CONFIG, JSON.stringify({ ...readConfig(), export: on }, null, 2) + '\n')
  if (values.off) { remember(false); return console.log(say('exportOff')) }
  const text = existsSync(GRAPH) ? readFileSync(GRAPH, 'utf8') : ''
  const nodes = parse(text)
  const mine = writeExport(nodes, readThread(nodes))
  if (mine) { console.error(say('handWritten', mine)); process.exit(1) }
  if (values.always) remember(true)
  console.log(say('exported', values.always))
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

/** `--as 1=risk,3=drop` as `{ 1: 'risk', 3: 'drop' }`; exits 2 on a malformed item. */
function corrections(values) {
  const as = {}
  for (const item of (values ?? []).flatMap(list)) {
    const m = item.match(/^(\d+)=(decision|risk|pointer|drop)$/)
    if (!m) { console.error(say('badAs', item)); process.exit(2) }
    as[m[1]] = m[2]
  }
  return as
}

/** The move of a hand-written STATE.md and LOG.md into the thread (m6.2): the preview, checked by apply. */
function migrate(values) {
  if (values.undo) return undoMigration()
  // A file ariadne generated (export) is the thread itself, not a state to migrate.
  const read = name => (existsSync(name) && !isGenerated(readFileSync(name, 'utf8')) ? readFileSync(name, 'utf8') : null)
  const [stateText, logText] = [read('STATE.md'), read('LOG.md')]
  if (stateText === null && logText === null) { console.error(say('noOld')); process.exit(1) }
  const text = existsSync(GRAPH) ? readFileSync(GRAPH, 'utf8') : ''
  const nodes = parse(text)
  const at = now()
  const plan = propose({ state: stateText && readState(stateText), log: logText && readLog(logText), nodes, at, as: corrections(values.as) })
  const r = apply({ text, thread: readThread(nodes), ops: plan.ops, at })
  if (!r.ok) {
    for (const e of r.errors) console.error(`ariadne: ${e}`)
    process.exit(1)
  }
  if (!values.apply) return console.log(preview(plan))

  // What --undo needs to put everything back: the graph and thread of before, the diary's length.
  const before = { at, graph: text, thread: existsSync(THREAD) ? readFileSync(THREAD, 'utf8') : null, log: existsSync(LOG) ? statSync(LOG).size : 0 }
  mkdirSync(ARCHIVE, { recursive: true })
  for (const { from, to } of plan.archive) move(from, to)
  const done = commit(plan.ops, 'agent', at)
  if (!done.ok) {
    for (const { from, to } of plan.archive) move(to, from)
    for (const e of done.errors) console.error(`ariadne: ${e}`)
    process.exit(1)
  }
  writeFileSync(MIGRATION, JSON.stringify({ ...before, after: done.text, archive: plan.archive }, null, 2) + '\n')
  for (const l of done.log) console.log(`↺ ${l.text}`)
  for (const { from, to } of plan.archive) console.log(`↺ ${from} → ${to}`)
  for (const line of elsewhere(plan)) console.log(line)
  console.log(say('migrated'))
}

/** Back to before `migrate --apply`: files in place, graph, thread and diary as they were (m6.2). */
function undoMigration() {
  if (!existsSync(MIGRATION)) { console.error(say('noMigration')); process.exit(1) }
  const saved = JSON.parse(readFileSync(MIGRATION, 'utf8'))
  const current = existsSync(GRAPH) ? readFileSync(GRAPH, 'utf8') : ''
  if (current !== saved.after) { console.error(say('staleMigration')); process.exit(1) }
  const restore = (file, content) => (content ? writeFileSync(file, content) : rmSync(file, { force: true }))
  restore(GRAPH, saved.graph)
  restore(THREAD, saved.thread)
  if (saved.log > 0) truncateSync(LOG, saved.log)
  else rmSync(LOG, { force: true })
  for (const { from, to } of saved.archive) move(to, from)
  const tracked = spawnSync('git', ['ls-files', '--error-unmatch', MIGRATION], { stdio: 'ignore' }).status === 0
  if (tracked) spawnSync('git', ['rm', '-q', '-f', MIGRATION])
  else rmSync(MIGRATION)
  if (saved.graph) writeView(parse(saved.graph), saved.thread ? JSON.parse(saved.thread) : readThread(parse(saved.graph)))
  else rmSync(VIEW, { force: true })
  console.log(say('undone'))
}

/** git mv for a tracked file, so history follows it; a plain rename otherwise. */
function move(from, to) {
  const tracked = spawnSync('git', ['ls-files', '--error-unmatch', from], { stdio: 'ignore' }).status === 0
  if (tracked) {
    const r = spawnSync('git', ['mv', from, to], { encoding: 'utf8' })
    if (r.status !== 0) throw new Error(r.stderr.trim())
  } else renameSync(from, to)
}

/** Applies `ops` and writes graph, thread and log; returns the log entries or the refusal errors. */
function commit(ops, by, at = now()) {
  // Before the first node there is no graph yet: it starts empty.
  const text = existsSync(GRAPH) ? readFileSync(GRAPH, 'utf8') : ''
  const thread = readThread(parse(text))
  const r = apply({ text, thread, ops, at, by })
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
  const warned = new Set()
  for (const n of closed) {
    if (!(n.proof ?? []).some(p => p.type === 'file' || p.type === 'commit')) {
      console.error(say('noFile', n.id))
      warned.add(n.id)
    }
  }
  // Only what this command writes: older proofs were warned about when they were written (m6.16).
  for (const op of ops.filter(o => (o.op === 'fill' || o.op === 'close') && !warned.has(o.id))) {
    const left = onlyInChat({ what: op.what, detail: op.detail, why: op.why, proof: op.proof })
    if (left.length) console.error(say('chatOnly', op.id, left.join(', ')))
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
  // A hand-written state next to the thread splits the truth: propose the move, touch nothing (m6.1).
  const old = ['STATE.md', 'LOG.md'].filter(name => existsSync(name) && !isGenerated(readFileSync(name, 'utf8')))
  if (old.length) console.log(say('oldState', old))
  // Claude Code loads the band only with this flag in its environment, which its Bash inherits.
  if (process.env.CLAUDE_CODE_ENABLE_FUNCTION_HOOKS !== '1') console.log(say('bandOff'))
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
  const k = pending(commits(), nodes)
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
  const reasons = behind({
    entries, root: process.cwd(), home: homedir(), ignore: [real(tmpdir()) + '/', '/tmp/', '/private/tmp/'],
    cited, untracked: pending(commits(), nodes), real,
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
    // One --what per step, in order: the short title stays short and the detail goes in what.
    case 'plan': {
      const titles = args.slice(1)
      const whats = v.what ?? []
      if (!a || titles.length === 0 || whats.length > titles.length) return null
      return { op: 'plan', parent: a, titles: titles.map((title, i) => (whats[i] ? { title, what: whats[i] } : title)), ref: v.ref }
    }
    case 'start': return a ? { op: 'start', id: a } : null
    case 'pause': return a ? { op: 'pause', id: a } : null
    case 'close': return a ? { op: 'close', id: a, what: b, proof: proofs(v) } : null
    case 'fill': return a ? { op: 'fill', id: a, what: v.what?.at(-1), why: v.why, detail: v.detail, title: v.title, proof: proofs(v) } : null
    case 'add': {
      if (!a || !b) return null
      const node = { kind: a, title: b, what: v.what?.at(-1), why: v.why, detail: v.detail, after: list(v.after), reentry: v.reentry, id: v.id, start: v.start, status: v.done ? 'done' : undefined }
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

/** The folder with .ariadne/, from `start` up to the root of its git repository; null if none. */
function projectRoot(start) {
  for (let dir = start; ; dir = dirname(dir)) {
    if (existsSync(join(dir, '.ariadne'))) return dir
    if (existsSync(join(dir, '.git')) || dirname(dir) === dir) return null
  }
}
// Run from a subfolder, every path (.ariadne/…, the viewer's root) is the project's.
const root = projectRoot(process.cwd())
if (root) process.chdir(root)

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
else if (command === 'doctor') {
  // Claude Code reads its configuration from CLAUDE_CONFIG_DIR when set; ~/.claude is read too.
  const configDirs = [process.env.CLAUDE_CONFIG_DIR, join(homedir(), '.claude')].filter(Boolean)
  console.log(report(findConflicts({ project: process.cwd(), configDirs, home: homedir() })))
}
else if (command === 'migrate') migrate(values)
else if (command === 'export') exportCommand(values)
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
  // A viewer left from another installed copy (before `claude plugin update`) is closed, then replaced.
  const packageOf = p => fetch(`http://127.0.0.1:${p}/package`).then(r => (r.ok ? r.text() : null), () => null)
  const quit = p => fetch(`http://127.0.0.1:${p}/quit`, { method: 'POST', headers: { 'x-ariadne-quit': '1' } }).then(() => {}, () => {})
  openViewer({ root, port, id: args[0], probe, start, launch, fixed, own: PACKAGE, packageOf, quit })
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
