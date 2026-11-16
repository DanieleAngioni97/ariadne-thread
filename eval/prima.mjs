// The prima condition (docs/valutazione/piano.md § 5): STATE.md and LOG.md written by a model with the
// original `handoff` skill, at every handoff event of the scenario and at its end, then fact-checked by a
// second model that sees the events but not the questions. The output is frozen in eval/frozen/<id>/prima/.

import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { generate } from './generate.mjs'
import { launch } from './run.mjs'

const SKILL = join(homedir(), '.claude', 'skills', 'handoff', 'SKILL.md')
const FILES = ['STATE.md', 'LOG.md']

/** The events from index `from` on, told as the conversation of a session. */
export function render(events, from = 0) {
  const titles = {}
  const plans = {}
  const over = new Set()
  let current = null
  const lines = []
  events.forEach((e, i) => {
    const say = text => { if (i >= from) lines.push(text) }
    switch (e.type) {
      case 'milestone':
        titles[e.key] = e.title
        say(`User: new milestone "${e.title}": ${e.what}`)
        break
      case 'plan':
        for (const s of e.steps) titles[s.key] = s.title
        plans[e.milestone] = [...(plans[e.milestone] ?? []), ...e.steps.map(s => s.key)]
        say(`User: I approve this plan for "${titles[e.milestone]}": ${e.steps.map(s => s.title).join(' → ')}.`)
        break
      case 'start':
        current = e.step
        say(`Agent: I start "${titles[e.step]}".`)
        break
      case 'detour':
        titles[e.key] = e.title
        say(`Agent: a detour first: "${e.title}". ${e.what} Then we go back to "${titles[current]}".`)
        break
      case 'defer':
        over.add(e.step)
        say(`User: let's defer "${titles[e.step]}" to "${titles[e.to]}".`)
        break
      case 'replace':
        over.add(e.step)
        say(`User: "${titles[e.step]}" is dropped; "${titles[e.by]}" replaces it.`)
        break
      case 'commit': {
        const closes = e.step && e.done ? `; this closes "${titles[e.step]}"` : e.step ? ` (work on "${titles[e.step]}")` : ''
        say(`Agent: committed "${e.message}"${closes}.`)
        if (e.step && e.done) {
          over.add(e.step)
          // As the CLI does: a closed step hands over to the next open one of its plan.
          if (e.step === current) {
            const plan = Object.values(plans).find(p => p.includes(e.step))
            current = plan?.slice(plan.indexOf(e.step) + 1).find(k => !over.has(k)) ?? current
          }
        }
        break
      }
      case 'handoff':
        break
      default:
        throw new Error(`unknown event ${e.type}`)
    }
  })
  return lines.join('\n')
}

/** Applies find/replace corrections where their text is found; the others are kept as rejected. */
export function applyChanges(files, changes) {
  const out = { ...files }
  const applied = []
  const rejected = []
  for (const c of changes) {
    if (typeof out[c.file] === 'string' && c.find && out[c.file].includes(c.find)) {
      out[c.file] = out[c.file].replace(c.find, c.replace)
      applied.push(c)
    } else rejected.push(c)
  }
  return { files: out, applied, rejected }
}

function ask(bin, prompt, cwd, model, extra, env) {
  const r = launch(bin, ['-p', prompt, '--model', model, '--effort', 'medium', '--restricted', '--permission-mode', 'dontAsk',
    '--strict-mcp-config', '--disable-slash-commands', '--no-session-persistence', '--output-format', 'stream-json', '--verbose', ...extra], cwd, env)
  const result = (r.stdout ?? '').split('\n').flatMap(l => { try { return [JSON.parse(l)] } catch { return [] } }).find(e => e.type === 'result')
  if (!result || result.is_error) throw new Error(`${model}: no result (${r.stderr?.slice(0, 300)})`)
  return result
}

const read = dir => Object.fromEntries(FILES.map(f => [f, existsSync(join(dir, f)) ? readFileSync(join(dir, f), 'utf8') : null]))

/** Runs the handoffs and the fact-checks of one scenario and writes the files into `out`. */
export function buildPrima(scenario, { model, checker, bin = 'claude', out, env = {}, skillFile = SKILL }) {
  const skill = readFileSync(skillFile, 'utf8')
  const events = scenario.events
  const points = events.flatMap((e, i) => (e.type === 'handoff' ? [i] : []))
  if (events.at(-1)?.type !== 'handoff') points.push(events.length)
  const t0 = Date.parse(scenario.start)
  mkdirSync(join(out, 'handoffs'), { recursive: true })
  let files = { 'STATE.md': null, 'LOG.md': null }
  let since = 0
  const handoffs = []

  for (const [k, point] of points.entries()) {
    const dir = mkdtempSync(join(tmpdir(), 'ariadne-prima-'))
    try {
      generate(scenario, dir, { until: point })
      const repo = join(dir, 'prima')
      for (const f of FILES) if (files[f] !== null) writeFileSync(join(repo, f), files[f])
      const today = new Date(t0 + point * 60_000).toISOString().slice(0, 10)
      const settings = join(dir, 'settings.json')
      writeFileSync(settings, JSON.stringify({ permissions: { allow: ['Read', 'Grep', 'Glob', 'Write', 'Edit', ...['log', 'show', 'diff', 'status', 'rev-parse', 'branch'].map(c => `Bash(git ${c}:*)`)] } }))
      const prompt = `Today is ${today}. This is the conversation of the current session since the last handoff:\n\n${render(events.slice(0, point), since)}\n\nUser: handoff. Run the handoff skill now. Here you do not commit: STATE.md and LOG.md stay out of git in this repository.`
      const written = ask(bin, prompt, repo, model, ['--tools', 'Read,Grep,Glob,Bash,Write,Edit', '--settings', settings, '--append-system-prompt', skill], env)
      const before = read(repo)

      const check = `Fact-check. Below are the events of a software project, which are the truth, and the STATE.md and LOG.md written from them. List only factual errors against the events: a wrong current step, next step, milestone, deferral, replacement, file or date. No added content, no style rewrites. Reply with JSON only: {"changes":[{"file":"STATE.md" or "LOG.md","find":"<exact text to replace>","replace":"<corrected text>","reason":"<which event it contradicts>"}]}, or {"changes":[]} if everything is right.\n\nEvents:\n${render(events.slice(0, point))}\n\nSTATE.md:\n${before['STATE.md'] ?? '(missing)'}\n\nLOG.md:\n${before['LOG.md'] ?? '(missing)'}`
      const checked = ask(bin, check, dir, checker, ['--tools', 'Read'], env)
      const json = checked.result.slice(checked.result.indexOf('{'), checked.result.lastIndexOf('}') + 1)
      const fixed = applyChanges(before, JSON.parse(json).changes ?? [])
      files = fixed.files
      for (const f of FILES) if (files[f] !== null) writeFileSync(join(out, 'handoffs', `${k + 1}-${f}`), files[f])
      handoffs.push({ point, today, before, applied: fixed.applied, rejected: fixed.rejected, cost: (written.total_cost_usd ?? 0) + (checked.total_cost_usd ?? 0) })
      since = point + 1
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }
  for (const f of FILES) if (files[f] !== null) writeFileSync(join(out, f), files[f])
  writeFileSync(join(out, 'handoffs.json'), JSON.stringify({ model, checker, handoffs }, null, 2) + '\n')
  return { handoffs }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { positionals: [file], values } = parseArgs({ allowPositionals: true, options: { model: { type: 'string' }, checker: { type: 'string' } } })
  if (!file || !values.model || !values.checker) {
    console.error('uso: node eval/prima.mjs <scenario.json> --model <id> --checker <id>')
    process.exit(2)
  }
  const scenario = JSON.parse(readFileSync(file, 'utf8'))
  const out = fileURLToPath(new URL(`./frozen/${scenario.id}/prima`, import.meta.url))
  rmSync(out, { recursive: true, force: true })
  const r = buildPrima(scenario, { model: values.model, checker: values.checker, out })
  const cost = r.handoffs.reduce((a, h) => a + h.cost, 0)
  console.log(`${scenario.id}: ${r.handoffs.length} handoff, ${r.handoffs.reduce((a, h) => a + h.applied.length, 0)} correzioni, ${cost.toFixed(2)} $ → ${out}`)
}
