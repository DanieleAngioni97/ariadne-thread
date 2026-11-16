// E2, the observer (docs/valutazione/piano.md § 7), lean version A: a model reads the agent's last turn and
// the graph, and lists where they disagree. Each checkpoint is a commit that closes a planned step; its last
// turn is written once by a model and frozen; the graph comes in five versions, F0 without errors and F1–F4
// with one error each, derived from F0 so that only the nodes of the error differ.

import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { view } from '../src/card.mjs'
import { generate } from './generate.mjs'
import { closest } from './grade.mjs'
import { ask } from './run.mjs'

// The evaluation was frozen with ariadne writing in Italian.
process.env.ARIADNE_LANG ??= 'it'

const FROZEN = fileURLToPath(new URL('./frozen', import.meta.url))
export const VERSIONS = ['F0', 'F1', 'F2', 'F3', 'F4']
const TYPES = ['done-not-done', 'missing-work', 'unrecorded-detour', 'wrong-current']

/** Indices of the commits that close a planned step while its plan still has a step to do; `k` spread evenly. */
export function checkpoints(scenario, k) {
  const plans = []
  const status = {}
  const found = []
  scenario.events.forEach((e, i) => {
    if (e.type === 'plan') { plans.push(e.steps.map(s => s.key)); for (const s of e.steps) status[s.key] = 'todo' }
    if (e.type === 'start') status[e.step] = 'active'
    if (e.type === 'defer') status[e.step] = 'deferred'
    if (e.type === 'replace') status[e.step] = 'replaced'
    if (e.type === 'commit' && e.done && e.step) {
      status[e.step] = 'done'
      const plan = plans.find(p => p.includes(e.step))
      if (plan && plan.slice(plan.indexOf(e.step) + 1).some(s => status[s] === 'todo')) found.push(i)
    }
  })
  if (found.length <= k) return found
  return Array.from({ length: k }, (_, j) => found[Math.floor(((j + 0.5) * found.length) / k)])
}

const read = dir => ({
  nodes: readFileSync(join(dir, '.ariadne', 'graph.jsonl'), 'utf8').trimEnd().split('\n').map(l => JSON.parse(l)),
  thread: JSON.parse(readFileSync(join(dir, '.ariadne', 'thread.json'), 'utf8')),
})

function commitFiles(dir) {
  const r = spawnSync('git', ['-C', dir, 'log', '--name-only', '--format=%x1d%H'], { encoding: 'utf8' })
  const all = r.stdout.split('\x1d').filter(Boolean).map(e => e.trim().split('\n'))
  return { get: ref => all.find(([sha]) => sha.startsWith(ref))?.slice(1).filter(Boolean) }
}

/** The five graphs of the checkpoint at `index`, each with its view, and what the error of each is. */
export function variants(scenario, index, sidefix, dir) {
  generate(scenario, dir, { until: index + 1 })
  const repo = join(dir, 'ariadne')
  const sha = spawnSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).stdout.trim()
  const before = read(repo)
  const step = before.nodes.find(n => (n.proof ?? []).some(p => p.type === 'commit' && sha.startsWith(p.ref.slice(0, 7))) && n.status === 'done')
  const next = before.nodes.find(n => n.id === before.thread.current)
  if (!step || !next || next.id === step.id) throw new Error(`${scenario.id}@${index}: no closed step with a step after it`)

  const clock = new Date(Date.parse(scenario.start) + (index + 1) * 60_000).toISOString().slice(0, 16) + 'Z'
  const cli = spawnSync(process.execPath, [join(repo, '.ariadne', 'cli', 'bin', 'ariadne.mjs'), 'add', 'detour', sidefix.title, '--what', sidefix.what,
    '--reentry', step.id, '--done', '--commit', sha], { cwd: repo, encoding: 'utf8', env: { ...process.env, TZ: 'UTC', ARIADNE_NOW: clock } })
  if (cli.status !== 0) throw new Error(`${scenario.id}@${index}: ${cli.stderr}`)
  const F0 = read(repo)
  const detour = F0.nodes.find(n => n.kind === 'detour' && n.title === sidefix.title)

  const copy = g => structuredClone(g)
  const F1 = copy(F0)
  const fake = createHash('sha1').update(`${scenario.id}:${index}:${next.id}`).digest('hex').slice(0, 7)
  Object.assign(F1.nodes.find(n => n.id === next.id), { status: 'done' })
  F1.nodes.find(n => n.id === next.id).proof = [...(next.proof ?? []), { type: 'commit', ref: fake }]
  const F2 = copy(F0)
  const s2 = F2.nodes.find(n => n.id === step.id)
  s2.status = 'active'
  s2.what = s2.title
  s2.proof = s2.proof.filter(p => !(p.type === 'commit' && sha.startsWith(p.ref.slice(0, 7))))
  F2.nodes.find(n => n.id === next.id).status = 'todo'
  F2.thread.current = step.id
  const F3 = copy(F0)
  F3.nodes = F3.nodes.filter(n => n.id !== detour.id)
  const F4 = copy(F0)
  const doneHere = F0.nodes.filter(n => n.kind === 'step' && n.status === 'done' && n.parent === step.parent && n.id !== step.id)
  const wrong = doneHere.at(-1) ?? F0.nodes.find(n => n.kind === 'step' && n.status === 'todo' && n.id !== next.id)
  F4.thread.current = wrong.id

  const files = commitFiles(repo)
  const out = { F0, F1, F2, F3, F4 }
  for (const f of VERSIONS) out[f].view = view(out[f].nodes, out[f].thread, files)
  out.meta = {
    ids: { step: step.id, next: next.id, detour: detour.id, current: F0.thread.current, wrong: wrong.id },
    errors: {
      F1: { step: next.title, type: 'done-not-done' },
      F2: { step: step.title, type: 'missing-work' },
      F3: { step: sidefix.title, type: 'unrecorded-detour' },
      F4: { step: next.title, type: 'wrong-current', alt: [wrong.title] },
    },
  }
  return out
}

/** The alarms in a reply: the last JSON object with an `alarms` list. */
export function parseAlarms(text) {
  const start = text.lastIndexOf('{"alarms"') >= 0 ? text.lastIndexOf('{"alarms"') : text.indexOf('{')
  if (start < 0) return { alarms: [], ok: false }
  try {
    const parsed = JSON.parse(text.slice(start, text.lastIndexOf('}') + 1))
    return Array.isArray(parsed.alarms) ? { alarms: parsed.alarms, ok: true } : { alarms: [], ok: false }
  } catch {
    return { alarms: [], ok: false }
  }
}

const OBSERVER = `You check a coding agent's bookkeeping. Below is the agent's last message to the user, then the project's
progress record. Find where the record disagrees with what the message says happened. Types:
- done-not-done: a step the record shows as done, but the message shows it was not done (for example, it is the
  step the agent says it will start next);
- missing-work: a step the message says is finished, but the record does not show as done;
- unrecorded-detour: unplanned work in the message that the record does not list;
- wrong-current: the record's current step ("Sei in") is not where the work stands: once a step is finished,
  the current step is the one the agent says it starts next.
A step the message calls finished counts as done even if its tests were not run.
Reply with JSON only: {"alarms":[{"step":"<the step title as in the record, or a short title for unrecorded work>","type":"<type>"}]}.
If they agree, reply {"alarms":[]}.`

/** One observation: the turn and the view in, the alarms out. */
export function observe({ turn, view: record, model, bin = 'claude', env = {} }) {
  const r = ask(`${OBSERVER}\n\n## The agent's last message\n\n${turn}\n\n## The progress record\n\n${record}`, { model, bin, env })
  return { ...parseAlarms(r.text), error: r.error, cost: r.cost, costNorm: r.costNorm }
}

/** The frozen last turn of a checkpoint, written by a model from the commit and the step after it. */
export function writeTurn(scenario, index, { model, bin = 'claude', env = {} }) {
  const e = scenario.events[index]
  const titles = Object.fromEntries(scenario.events.filter(x => x.type === 'plan').flatMap(p => p.steps.map(s => [s.key, s.title])))
  const plan = scenario.events.find(x => x.type === 'plan' && x.steps.some(s => s.key === e.step)).steps
  const after = plan.slice(plan.findIndex(s => s.key === e.step) + 1)[0]
  const files = Object.entries(e.files).map(([p, c]) => `--- ${p}\n${c}`).join('\n')
  const prompt = `You write the last message a coding agent sends to the user at the end of a piece of work, for an evaluation.
Project: ${scenario.project}. The step "${titles[e.step]}" was just finished with the commit "${e.message}", which changed:
${files}

Write the message the agent sends: what it did and how it checked it, in 4–8 sentences, plain prose. In the same commit
the agent also made one small unplanned fix it noticed along the way (invent a plausible one, unrelated to the step);
mention it. End by saying that next it will start "${titles[after.key]}". Do not mention any tracking tool, graph, node,
thread, state file or log.
Reply with JSON only: {"turn":"<the message>","sidefix":{"title":"<a short title for the fix, 3–7 words>","what":"<one sentence>"}}`
  const r = ask(prompt, { model, bin, env })
  const json = JSON.parse(r.text.slice(r.text.indexOf('{'), r.text.lastIndexOf('}') + 1))
  return { index, step: titles[e.step], next: titles[after.key], turn: json.turn, sidefix: json.sidefix, model, cost: r.cost }
}

const names = (alarm, error) => closest(alarm.step ?? '', [error.step, ...(error.alt ?? [])]) !== null

/** Per checkpoint: errors found (right step and type in ≥ 2 of 3 runs), right step with the wrong type, a false alarm on F0. */
export function gradeCheckpoint(meta, runs) {
  const found = {}
  const rightStepWrongType = {}
  for (const f of ['F1', 'F2', 'F3', 'F4']) {
    const error = meta.errors[f]
    const hit = runs[f].filter(alarms => alarms.some(a => names(a, error) && a.type === error.type)).length
    const named = runs[f].filter(alarms => alarms.some(a => names(a, error))).length
    found[f] = hit >= 2
    rightStepWrongType[f] = !found[f] && named >= 2
  }
  return { found, rightStepWrongType, falseAlarm: runs.F0.filter(alarms => alarms.length > 0).length >= 2 }
}

/** Bootstrap by scenario (the checkpoints and errors of a scenario go together): 95% interval of a ratio. */
export function bootstrap(groups, value, { runs = 4000, seed = 1 } = {}) {
  let a = seed >>> 0
  const random = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296 }
  const stats = []
  for (let r = 0; r < runs; r++) {
    const sample = Array.from({ length: groups.length }, () => groups[Math.floor(random() * groups.length)])
    const [num, den] = sample.reduce(([n, d], g) => { const [x, y] = value(g); return [n + x, d + y] }, [0, 0])
    if (den > 0) stats.push(num / den)
  }
  stats.sort((x, y) => x - y)
  return [stats[Math.floor(0.025 * stats.length)], stats[Math.ceil(0.975 * stats.length) - 1]]
}

/** Recall per type and overall, false alarms on F0, both with their intervals; the decision rule of § 7. */
export function summarize(graded) {
  // Object.groupBy, by hand: it needs Node 21, and ariadne runs on Node 20.
  const groups = Object.create(null)
  for (const g of graded) (groups[g.scenario] ??= []).push(g)
  const byScenario = Object.values(groups)
  const types = Object.fromEntries(['F1', 'F2', 'F3', 'F4'].map(f => [TYPES[['F1', 'F2', 'F3', 'F4'].indexOf(f)], graded.filter(g => g.found[f]).length / graded.length]))
  const found = gs => [gs.reduce((a, g) => a + Object.values(g.found).filter(Boolean).length, 0), gs.length * 4]
  const alarms = gs => [gs.filter(g => g.falseAlarm).length, gs.length]
  const recall = found(graded)
  const fa = alarms(graded)
  const recallCI = bootstrap(byScenario, found)
  const faCI = bootstrap(byScenario, alarms)
  return {
    checkpoints: graded.length, scenarios: byScenario.length,
    recall: { value: recall[0] / recall[1], ci: recallCI, byType: types },
    rightStepWrongType: graded.reduce((a, g) => a + Object.values(g.rightStepWrongType).filter(Boolean).length, 0),
    falseAlarms: { value: fa[0] / fa[1], ci: faCI },
    passes: recallCI[0] >= 0.6 && faCI[1] <= 0.15,
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values, positionals: [command, ...files] } = parseArgs({ allowPositionals: true, options: {
    k: { type: 'string', default: '3' }, model: { type: 'string' }, reps: { type: 'string', default: '3' }, out: { type: 'string' },
  } })
  if (!['turns', 'run'].includes(command) || !files.length || !values.model || (command === 'run' && !values.out)) {
    console.error('uso: node eval/e2.mjs turns <scenario.json>… --model <id> [--k 3]\n     node eval/e2.mjs run <scenario.json>… --model <id> --out <cartella> [--reps 3]')
    process.exit(2)
  }
  const scenarios = files.map(f => JSON.parse(readFileSync(f, 'utf8')))
  if (command === 'turns') {
    for (const s of scenarios) {
      for (const index of checkpoints(s, Number(values.k))) {
        const file = join(FROZEN, s.id, 'e2', `${index}.json`)
        if (existsSync(file)) continue
        const t = writeTurn(s, index, { model: values.model })
        mkdirSync(join(FROZEN, s.id, 'e2'), { recursive: true })
        writeFileSync(file, JSON.stringify(t, null, 2) + '\n')
        console.log(`${s.id}@${index}: ${t.sidefix.title} (${(t.cost ?? 0).toFixed(3)} $)`)
      }
    }
  } else {
    mkdirSync(values.out, { recursive: true })
    const results = join(values.out, 'results.jsonl')
    const done = new Set(existsSync(results) ? readFileSync(results, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l).id) : [])
    const graded = []
    for (const s of scenarios) {
      for (const index of checkpoints(s, Number(values.k))) {
        const turn = JSON.parse(readFileSync(join(FROZEN, s.id, 'e2', `${index}.json`), 'utf8'))
        const dir = mkdtempSync(join(tmpdir(), 'ariadne-e2-'))
        const v = variants(s, index, turn.sidefix, dir)
        rmSync(dir, { recursive: true, force: true })
        for (const f of VERSIONS) {
          for (let rep = 0; rep < Number(values.reps); rep++) {
            const id = `${s.id}@${index}-${f}-r${rep}`
            if (done.has(id)) continue
            const r = observe({ turn: turn.turn, view: v[f].view, model: values.model })
            appendFileSync(results, JSON.stringify({ id, scenario: s.id, index, version: f, rep, ...r }) + '\n')
          }
        }
        const rows = readFileSync(results, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(r => r.scenario === s.id && r.index === index)
        const runs = Object.fromEntries(VERSIONS.map(f => [f, rows.filter(r => r.version === f).map(r => r.alarms)]))
        graded.push({ scenario: s.id, index, ...gradeCheckpoint(v.meta, runs) })
        console.log(`${s.id}@${index}: ${JSON.stringify(graded.at(-1).found)} falso allarme: ${graded.at(-1).falseAlarm}`)
      }
    }
    const all = readFileSync(results, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
    const summary = { ...summarize(graded), cost: all.reduce((a, r) => a + (r.cost ?? 0), 0), costNorm: all.reduce((a, r) => a + (r.costNorm ?? 0), 0), unparsed: all.filter(r => !r.ok).length }
    writeFileSync(join(values.out, 'summary.json'), JSON.stringify({ graded, summary }, null, 2) + '\n')
    console.log(JSON.stringify(summary, null, 2))
  }
}
