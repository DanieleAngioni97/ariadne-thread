// The pilot summary (docs/valutazione/piano.md § 6): share of correct answers per condition and category,
// statuses, exclusions, tokens and cost, and the ceiling rule. The pre-registered analysis is elsewhere.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const CEILING = 0.9
const median = xs => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length === 0 ? null : s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
const share = rows => ({ n: rows.length, share: rows.length ? rows.filter(x => x.status === 'correct').length / rows.length : null })
const count = (rows, field) => rows.reduce((a, x) => (x[field] ? { ...a, [x[field]]: (a[x[field]] ?? 0) + 1 } : a), {})

/** Summary per condition; Continua stays out of the question share, as in H1a. */
export function summarize(rows) {
  const out = {}
  for (const condition of ['prima', 'ariadne']) {
    const all = rows.filter(x => x.condition === condition)
    const valid = all.filter(x => !x.excluded)
    const questions = valid.filter(x => x.cat !== 'continue')
    const cats = [...new Set(valid.map(x => x.cat))]
    out[condition] = {
      correct: share(questions),
      byCat: Object.fromEntries(cats.map(c => [c, share(valid.filter(x => x.cat === c))])),
      status: count(valid, 'status'),
      excluded: count(all, 'excluded'),
      medianTokens: median(valid.map(x => x.tokens)),
      cost: all.reduce((a, x) => a + (x.cost ?? 0), 0),
    }
  }
  out.ceiling = out.prima.correct.share > CEILING && out.ariadne.correct.share > CEILING
  return out
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rows = readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
  console.log(JSON.stringify(summarize(rows), null, 2))
}
