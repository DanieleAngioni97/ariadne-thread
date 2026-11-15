// E4 (docs/valutazione/piano.md § 9): descriptive numbers from this repository, frozen at one sha in a
// git bundle. E1b takes the share of commits without `Thread:`; the cost per session takes the prompts.

import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// The evaluation was frozen with ariadne writing in Italian.
process.env.ARIADNE_LANG ??= 'it'

const graphOnly = c => c.files.length > 0 && c.files.every(f => f.startsWith('.ariadne/'))

/** The person's prompts in each session of a transcript; a `/clear` starts a new session. */
export function promptsPerSession(events) {
  const sessions = [0]
  for (const e of events) {
    if (e.type !== 'user' || e.isMeta) continue
    const content = e.message?.content
    const text = typeof content === 'string' ? content : Array.isArray(content) && content.every(b => b.type === 'text') ? content.map(b => b.text).join('') : null
    if (text === null) continue
    if (/^\s*<command-name>\/clear<\/command-name>/.test(text)) { if (sessions.at(-1) > 0) sessions.push(0); continue }
    if (text.trimStart().startsWith('<')) continue
    sessions[sessions.length - 1]++
  }
  return sessions.filter(n => n > 0)
}

/** Commits without `Thread:` from the first one that has it, oldest first; graph-only commits are neutral. */
export function threadShare(commits) {
  const first = commits.findIndex(c => c.thread.length > 0)
  const counted = first === -1 ? [] : commits.slice(first).filter(c => !graphOnly(c))
  const without = counted.filter(c => c.thread.length === 0).length
  return { commits: counted.length, without, share: counted.length ? without / counted.length : 0 }
}

/** Commits between two updates of STATE.md, and after the last one; `state` marks a commit that touches it. */
export function stateGaps(commits) {
  const gaps = []
  let gap = null
  for (const c of commits) {
    if (c.state) { if (gap !== null) gaps.push(gap); gap = 0 }
    else if (gap !== null) gap++
  }
  if (gap > 0) gaps.push(gap)
  return gaps
}

/** Closed nodes whose only proof is a chat message; `certain` leaves out the uncertain historical nodes. */
export function messageOnly(nodes) {
  const done = nodes.filter(n => n.status === 'done')
  const only = n => (n.proof ?? []).length > 0 && n.proof.every(p => p.type === 'message')
  const certain = done.filter(n => !n.uncertain)
  return { done: done.length, messageOnly: done.filter(only).length, certainDone: certain.length, certainMessageOnly: certain.filter(only).length }
}

const median = xs => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
const git = (...args) => { const r = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); if (r.status !== 0) throw new Error(r.stderr); return r.stdout }

function commitsUpTo(sha) {
  const out = git('log', '--reverse', '--name-only', '--format=%x1d%h%x1f%(trailers:key=Thread,valueonly,separator=%x1e)%x1f', sha)
  return out.split('\x1d').filter(Boolean).map(entry => {
    const [short, values = '', names = ''] = entry.split('\x1f')
    return { sha: short, thread: values.split('\x1e').map(v => v.trim()).filter(Boolean), files: names.split('\n').filter(Boolean) }
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('..', import.meta.url))
  process.chdir(root)
  const ref = process.argv[2] ?? 'HEAD'
  const sha = git('rev-parse', ref).trim()
  mkdirSync('eval/out', { recursive: true })
  const bundle = `eval/out/archive-${sha.slice(0, 12)}.bundle`
  git('bundle', 'create', '-q', bundle, ref)

  const commits = commitsUpTo(sha)
  const touches = c => c.files.includes('STATE.md')
  const firstState = commits.findIndex(touches)
  const lastState = commits.findLastIndex(touches)
  const gaps = stateGaps(commits.slice(firstState, lastState + 1).map(c => ({ state: touches(c) })))

  const nodes = git('show', `${sha}:.ariadne/graph.jsonl`).trimEnd().split('\n').map(l => JSON.parse(l))

  const tree = mkdtempSync(join(tmpdir(), 'ariadne-e4-'))
  spawnSync('sh', ['-c', `git archive ${sha} | tar -x -C '${tree}'`])
  const check = spawnSync(process.execPath, ['bin/ariadne.mjs', 'validate'], { cwd: tree, encoding: 'utf8' })
  const broken = check.stderr.split('\n').filter(l => l.includes('[file-ref]')).length
  rmSync(tree, { recursive: true, force: true })

  const transcripts = join(homedir(), '.claude', 'projects', root.replace(/\/$/, '').replaceAll('/', '-'))
  const sessions = readdirSync(transcripts).filter(f => f.endsWith('.jsonl')).flatMap(f =>
    promptsPerSession(readFileSync(join(transcripts, f), 'utf8').split('\n').flatMap(l => { try { return [JSON.parse(l)] } catch { return [] } })))

  const results = {
    sha, bundle: { file: bundle, sha256: createHash('sha256').update(readFileSync(bundle)).digest('hex') },
    state: { updates: commits.filter(touches).length, gaps, medianGap: median(gaps), maxGap: Math.max(...gaps) },
    thread: threadShare(commits),
    proofs: messageOnly(nodes),
    brokenFileRefs: broken,
    prompts: { sessions: sessions.length, perSession: sessions, median: median(sessions) },
  }
  mkdirSync('eval/e4', { recursive: true })
  writeFileSync('eval/e4/results.json', JSON.stringify(results, null, 2) + '\n')
  console.log(JSON.stringify(results, (k, v) => (k === 'perSession' || k === 'gaps' ? `[${v.length}]` : v), 2))
}
