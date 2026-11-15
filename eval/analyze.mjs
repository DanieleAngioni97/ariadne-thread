// The pre-registered analysis of E1 (docs/valutazione/piano.md § 0, "Dopo il settimo pilota"): H1
// non-inferiority of correctness (GEE in eval/gee.py, cluster t if it cannot be fitted), H2 normalized cost
// (exact signed-rank on per-scenario log-ratios of the means), Holm on {H1, H2}, then the secondary outcomes
// without significance.

import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { estimates, rng, tQuantile, wilcoxonP } from './power.mjs'

const MARGIN = 0.1
const ALPHA = 0.05
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length
const sd = xs => Math.sqrt(xs.reduce((a, x) => a + (x - mean(xs)) ** 2, 0) / (xs.length - 1))
const median = xs => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length === 0 ? null : s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
const correct = rows => rows.filter(r => r.status === 'correct').length / rows.length

// Student t upper tail by Simpson's rule on the density: enough for a p-value to four digits.
function tSf(x, df) {
  const pdf = t => Math.exp(lgamma((df + 1) / 2) - lgamma(df / 2)) / Math.sqrt(df * Math.PI) * (1 + t * t / df) ** (-(df + 1) / 2)
  const steps = 2000
  const h = Math.abs(x) / steps
  let area = pdf(0) + pdf(Math.abs(x))
  for (let i = 1; i < steps; i++) area += (i % 2 ? 4 : 2) * pdf(i * h)
  const half = area * h / 3
  return x >= 0 ? 0.5 - half : 0.5 + half
}
function lgamma(z) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]
  let y = z
  const t = z + 5.5 - (z + 0.5) * Math.log(z + 5.5)
  let s = 1.000000000190015
  for (const k of c) s += k / ++y
  return -t + Math.log(2.5066282746310005 * s / z)
}

/** Holm on a family of p-values: { name: rejected }. */
export function holm(ps, alpha) {
  const order = Object.entries(ps).sort((a, b) => a[1] - b[1])
  const out = {}
  let going = true
  order.forEach(([name, p], i) => {
    going = going && p <= alpha / (order.length - i)
    out[name] = going
  })
  return out
}

/** Non-inferiority by a t over per-scenario differences: the fallback when the GEE cannot be fitted. */
export function clusterT(diffs, margin) {
  const n = diffs.length
  const diff = mean(diffs)
  const se = sd(diffs) / Math.sqrt(n)
  const lower = diff - tQuantile(0.975, n - 1) * se
  const p = se > 0 ? tSf((diff + margin) / se, n - 1) : (diff > -margin ? 0 : 1)
  return { method: 'cluster-t', diff, se, df: n - 1, lower, p }
}

/** The GEE in statsmodels, run by uv; null when it fails or the fit is degenerate (all correct, say). */
export function gee(questionRows) {
  const input = JSON.stringify(questionRows.map(r => ({ y: r.status === 'correct' ? 1 : 0, ariadne: r.condition === 'ariadne' ? 1 : 0, scenario: r.fixture })))
  const script = fileURLToPath(new URL('./gee.py', import.meta.url))
  const r = spawnSync('uv', ['run', '--quiet', '--with', 'statsmodels', 'python', script, String(MARGIN)], { input, encoding: 'utf8' })
  if (r.status !== 0) return null
  const out = JSON.parse(r.stdout)
  return out.ok ? out : null
}

function bootstrapRatio(logRatios, runs = 4000) {
  const random = rng(17)
  const draws = Array.from({ length: runs }, () => Math.exp(mean(logRatios.map(() => logRatios[Math.floor(random() * logRatios.length)])))).sort((a, b) => a - b)
  return [draws[Math.floor(runs * 0.025)], draws[Math.ceil(runs * 0.975) - 1]]
}

function bootstrapShare(rows, runs = 4000) {
  const scenarios = [...new Set(rows.map(r => r.fixture))]
  const by = new Map(scenarios.map(s => [s, rows.filter(r => r.fixture === s)]))
  const random = rng(19)
  const draws = Array.from({ length: runs }, () => correct(scenarios.flatMap(() => by.get(scenarios[Math.floor(random() * scenarios.length)])))).sort((a, b) => a - b)
  return [draws[Math.floor(runs * 0.025)], draws[Math.ceil(runs * 0.975) - 1]]
}

/** The whole analysis of one E1 run. `options.gee` replaces the statsmodels call (tests). */
export function analyze(rows, options = {}) {
  const valid = rows.filter(r => !r.excluded)
  const original = valid.filter(r => r.phrasing === 'original')
  const questions = original.filter(r => r.cat !== 'continue')
  const scenarios = [...new Set(original.map(r => r.fixture))]
  const of = (rs, c) => rs.filter(r => r.condition === c)

  const fitted = (options.gee ?? gee)(questions)
  const diffs = scenarios.map(s => correct(of(questions.filter(r => r.fixture === s), 'ariadne')) - correct(of(questions.filter(r => r.fixture === s), 'prima')))
  const h1 = fitted ?? clusterT(diffs, MARGIN)
  const H1 = { ...h1, prima: correct(of(questions, 'prima')), ariadne: correct(of(questions, 'ariadne')), margin: MARGIN, nonInferior: h1.lower > -MARGIN }

  const est = estimates(original)
  const H2 = { ratio: Math.exp(mean(est.logRatios)), ci: bootstrapRatio(est.logRatios), p: wilcoxonP(est.logRatios), scenarios: est.scenarios }

  // H1 is one-sided at 2.5%: doubled, its p sits on the same scale as the two-sided H2 for Holm at 5%.
  const decisions = holm({ H1: Math.min(1, 2 * H1.p), H2: H2.p }, ALPHA)

  const pass2 = c => {
    const keys = [...new Set(of(questions, c).map(r => `${r.fixture}#${r.index}`))]
    return keys.filter(k => of(questions, c).filter(r => `${r.fixture}#${r.index}` === k).every(r => r.status === 'correct')).length / keys.length
  }
  const continua = c => { const rs = of(original, c).filter(r => r.cat === 'continue'); return { share: correct(rs), ci: bootstrapShare(rs), n: rs.length } }
  const paraphrased = valid.filter(r => r.phrasing !== 'original')
  const byCat = c => Object.fromEntries([...new Set(original.map(r => r.cat))].map(cat => [cat, correct(of(original, c).filter(r => r.cat === cat))]))
  const both = f => ({ prima: f('prima'), ariadne: f('ariadne') })
  return {
    H1, H2, holm: decisions,
    secondary: {
      pass2: both(pass2),
      continua: both(continua),
      byCat: both(byCat),
      paraphrase: paraphrased.length ? both(c => correct(of(paraphrased, c).filter(r => r.cat !== 'continue'))) : null,
      medianTokens: both(c => median(of(original, c).map(r => r.tokens))),
      billed: both(c => of(valid, c).reduce((a, r) => a + (r.cost ?? 0), 0)),
      asked: both(c => ({ n: of(original, c).filter(r => r.asked === true).length, of: of(original, c).filter(r => r.asked !== undefined).length })),
      excluded: both(c => rows.filter(r => r.condition === c && r.excluded).length),
    },
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { positionals } = parseArgs({ allowPositionals: true })
  if (positionals.length === 0) {
    console.error('uso: node eval/analyze.mjs <results.jsonl>…')
    process.exit(2)
  }
  const rows = positionals.flatMap(f => readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)))
  console.log(JSON.stringify(analyze(rows), null, 2))
}
