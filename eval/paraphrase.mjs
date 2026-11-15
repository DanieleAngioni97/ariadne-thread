// Paraphrases (docs/valutazione/piano.md § 5, P26): one rewording of each question, written by a model that
// sees only the question texts, never the answers, and frozen in eval/frozen/<id>/paraphrases.json. Continua
// has a fixed prompt and no paraphrase.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { ask } from './run.mjs'

const FROZEN = fileURLToPath(new URL('./frozen', import.meta.url))

/** One paraphrase per question, aligned with `scenario.questions`; null for Continua. */
export function paraphrase(scenario, { model, bin = 'claude', env = {} }) {
  const asked = scenario.questions.filter(q => q.cat !== 'continue')
  const prompt = `Reword each question below so it asks for exactly the same thing in different words. Keep every
name, title, file and term of the project as it is; change only the wording around them. Do not add hints.
Reply with JSON only: {"paraphrases":["…", …]}, one per question, in the same order.

${asked.map((q, i) => `${i + 1}. ${q.text}`).join('\n')}`
  const r = ask(prompt, { model, bin, env })
  const list = JSON.parse(r.text.slice(r.text.indexOf('{'), r.text.lastIndexOf('}') + 1)).paraphrases
  if (!Array.isArray(list) || list.length !== asked.length) throw new Error(`${scenario.id}: ${list?.length ?? 0} paraphrases for ${asked.length} questions`)
  let k = 0
  return scenario.questions.map(q => (q.cat === 'continue' ? null : list[k++]))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { model: { type: 'string' } } })
  if (!positionals.length || !values.model) {
    console.error('uso: node eval/paraphrase.mjs <scenario.json>… --model <id>')
    process.exit(2)
  }
  for (const file of positionals) {
    const scenario = JSON.parse(readFileSync(file, 'utf8'))
    const out = paraphrase(scenario, { model: values.model })
    mkdirSync(join(FROZEN, scenario.id), { recursive: true })
    writeFileSync(join(FROZEN, scenario.id, 'paraphrases.json'), JSON.stringify(out, null, 2) + '\n')
    console.log(`${scenario.id}: ${out.filter(Boolean).length} parafrasi`)
  }
}
