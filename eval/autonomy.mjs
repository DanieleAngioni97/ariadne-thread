// Autonomy (docs/valutazione/piano.md § 0, descriptive): how often the person had to ask for a handoff or
// for the state to be written, per session, by hand against ariadne. Reads the transcripts in
// ~/.claude/projects and keeps only counts, never the text of a prompt. Different projects: no causal claim.

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REQUEST = /\bhandoff\b|passa il testimone|aggiorna (lo |il )?stat|\b(STATE|LOG)\.md\b|scrivi\b.*\b(stato|log)\b/i
const COMMAND = /^\s*<command-name>\/([\w:-]+)<\/command-name>/

/** Per session: when it started, the person's prompts, and the requests to hand over or write the state. */
export function sessions(events) {
  const out = []
  let open = null
  for (const e of events) {
    if (e.type !== 'user' || e.isMeta) continue
    const content = e.message?.content
    const text = typeof content === 'string' ? content : Array.isArray(content) && content.every(b => b.type === 'text') ? content.map(b => b.text).join('') : null
    if (text === null) continue
    const command = text.match(COMMAND)?.[1]
    if (command === 'clear') { open = null; continue }
    if (!open) out.push(open = { at: e.timestamp ?? null, prompts: 0, requests: 0 })
    if (command) { if (command.endsWith('handoff')) open.requests++; continue }
    if (text.trimStart().startsWith('<')) continue
    open.prompts++
    if (REQUEST.test(text)) open.requests++
  }
  return out.filter(s => s.prompts > 0 || s.requests > 0)
}

/** by-hand: development projects, and this repository before its first Thread commit; ariadne: after it. */
export function group(project, at, { repo, since }) {
  if (project === repo) return at && at >= since ? 'ariadne' : 'by-hand'
  return project.includes('-Sviluppo-') ? 'by-hand' : null
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = process.cwd()
  const repo = root.replace(/\/$/, '').replaceAll('/', '-')
  const first = spawnSync('git', ['log', '--reverse', '--grep=^Thread:', '--format=%aI'], { encoding: 'utf8' }).stdout.split('\n')[0]
  const since = new Date(first).toISOString()
  const base = join(homedir(), '.claude', 'projects')
  const totals = {}
  for (const project of readdirSync(base)) {
    const dir = join(base, project)
    if (!existsSync(dir)) continue
    for (const f of readdirSync(dir).filter(f => f.endsWith('.jsonl'))) {
      const events = readFileSync(join(dir, f), 'utf8').split('\n').flatMap(l => { try { return [JSON.parse(l)] } catch { return [] } })
      for (const s of sessions(events)) {
        const g = group(project, s.at, { repo, since })
        if (!g) continue
        const t = (totals[g] ??= { projects: new Set(), sessions: 0, prompts: 0, requests: 0, withRequest: 0 })
        t.projects.add(project); t.sessions++; t.prompts += s.prompts; t.requests += s.requests; if (s.requests > 0) t.withRequest++
      }
    }
  }
  const results = { since, groups: Object.fromEntries(Object.entries(totals).map(([g, t]) => [g, {
    projects: t.projects.size, sessions: t.sessions, prompts: t.prompts, requests: t.requests,
    perSession: t.requests / t.sessions, sessionsWithRequest: t.withRequest / t.sessions, per100Prompts: 100 * t.requests / Math.max(1, t.prompts),
  }])) }
  mkdirSync('eval/e4', { recursive: true })
  writeFileSync('eval/e4/autonomy.json', JSON.stringify(results, null, 2) + '\n')
  console.log(JSON.stringify(results, null, 2))
}
