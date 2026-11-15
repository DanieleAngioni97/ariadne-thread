// Scenario drafts (docs/valutazione/piano.md § 5): a model writes a scenario from eval/brief.md; the
// coherence check of the generator and the event count decide, with up to two repair rounds.

import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { check } from './generate.mjs'
import { launch } from './run.mjs'

const BRIEF = fileURLToPath(new URL('./brief.md', import.meta.url))
const ROUNDS = 3

function problems(scenario, spec) {
  const errors = check(scenario, { test: spec.set === 'test' })
  const n = scenario.events?.length ?? 0
  if (Math.abs(n - spec.events) > spec.events * 0.1) errors.push(`events: ${n}, asked for ${spec.events} ±10%`)
  if (scenario.id !== spec.id) errors.push(`id: ${scenario.id}, asked for ${spec.id}`)
  return errors
}

/** Drafts one scenario into `out`; returns `{ rounds, cost }` or throws with the last errors. */
export function draft(spec, { model, bin = 'claude', out, env = {} }) {
  const brief = readFileSync(BRIEF, 'utf8')
  const ask = `${brief}\n\n## This scenario\n\nid: ${spec.id} · set: ${spec.set ?? 'dev'} · start: ${spec.start} · events: ${spec.events} · domain: ${spec.domain}`
  const cwd = mkdtempSync(join(tmpdir(), 'ariadne-draft-'))
  let prompt = ask
  let cost = 0
  let errors = []
  try {
    for (let round = 1; round <= ROUNDS; round++) {
      const r = launch(bin, ['-p', prompt, '--model', model, '--effort', 'medium', '--restricted', '--tools', 'Read',
        '--permission-mode', 'dontAsk', '--strict-mcp-config', '--disable-slash-commands', '--no-session-persistence',
        '--output-format', 'stream-json', '--verbose'], cwd, env)
      const result = (r.stdout ?? '').split('\n').flatMap(l => { try { return [JSON.parse(l)] } catch { return [] } }).find(e => e.type === 'result')
      cost += result?.total_cost_usd ?? 0
      const text = result?.result ?? ''
      let scenario = null
      try { scenario = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) } catch (e) { errors = [`not JSON: ${e.message}`] }
      if (scenario) errors = problems(scenario, spec)
      if (scenario && errors.length === 0) {
        mkdirSync(dirname(out), { recursive: true })
        writeFileSync(out, JSON.stringify(scenario, null, 2) + '\n')
        return { rounds: round, cost }
      }
      prompt = `${ask}\n\n## Your previous draft\n\n${text}\n\n## Its problems\n\n${errors.map(e => `- ${e}`).join('\n')}\n\nReply with the corrected full JSON only.`
    }
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
  throw new Error(`${spec.id}: after ${ROUNDS} rounds: ${errors.join('; ')}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: {
    id: { type: 'string' }, set: { type: 'string' }, events: { type: 'string' }, domain: { type: 'string' },
    start: { type: 'string', default: '2026-03-02T09:00:00Z' }, model: { type: 'string' },
  } })
  if (!values.id || !values.set || !values.events || !values.domain || !values.model) {
    console.error('uso: node eval/draft.mjs --id <id> --set dev|test|e3 --events <n> --domain "<dominio>" --model <id>')
    process.exit(2)
  }
  const spec = { id: values.id, set: values.set, start: values.start, events: Number(values.events), domain: values.domain }
  const out = fileURLToPath(new URL(`./scenarios/${values.set}/${values.id}.json`, import.meta.url))
  const r = draft(spec, { model: values.model, out })
  appendFileSync(join(dirname(out), 'drafts.jsonl'), JSON.stringify({ ...spec, model: values.model, ...r }) + '\n')
  console.log(`${values.id}: ${r.rounds} giri, ${r.cost.toFixed(2)} $ → ${out}`)
}
