// Power by simulation (docs/valutazione/piano.md § 0 and § 6): how many test scenarios the pre-registered
// tests need, from the estimates of a pilot run. H2 compares per-scenario log-ratios of the mean normalized
// cost with an exact signed-rank test; H1 is non-inferiority of correctness with a t interval over scenarios.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

/** A seeded uniform generator (mulberry32), so a simulation gives the same number on every run. */
export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const normal = random => Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random())
const expit = x => 1 / (1 + Math.exp(-x))
const logit = p => Math.log(p / (1 - p))
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length
const sd = xs => Math.sqrt(xs.reduce((a, x) => a + (x - mean(xs)) ** 2, 0) / (xs.length - 1))

/** Two-sided exact p of the Wilcoxon signed-rank test; zeros dropped, ties get average ranks. */
export function wilcoxonP(diffs) {
  const d = diffs.filter(x => x !== 0)
  if (d.length === 0) return 1
  const sorted = d.map((x, i) => ({ a: Math.abs(x), i })).sort((p, q) => p.a - q.a)
  const rank = []
  for (let k = 0; k < sorted.length;) {
    let j = k
    while (j + 1 < sorted.length && sorted[j + 1].a === sorted[k].a) j++
    for (let m = k; m <= j; m++) rank[sorted[m].i] = (k + j + 2) / 2
    k = j + 1
  }
  // Ranks doubled to integers; dist[w] = sign assignments whose doubled positive sum is w.
  const twice = rank.map(r => Math.round(r * 2))
  let dist = [1]
  for (const r of twice) {
    const next = new Array(dist.length + r).fill(0)
    dist.forEach((c, w) => { next[w] += c; next[w + r] += c })
    dist = next
  }
  const w = d.reduce((a, x, i) => (x > 0 ? a + twice[i] : a), 0)
  const total = 2 ** d.length
  const below = dist.slice(0, w + 1).reduce((a, b) => a + b, 0) / total
  const above = dist.slice(w).reduce((a, b) => a + b, 0) / total
  return Math.min(1, 2 * Math.min(below, above))
}

/** Share of simulated studies where the cost test rejects: per-scenario log-ratios ~ N(mu, sd). */
export function costPower({ n, mu, sd: spread, alpha, runs, random }) {
  let hits = 0
  for (let r = 0; r < runs; r++) {
    if (wilcoxonP(Array.from({ length: n }, () => mu + spread * normal(random))) <= alpha) hits++
  }
  return hits / runs
}

// Normal quantile (Acklam) and Student t quantile (Cornish-Fisher expansion, enough for df ≥ 3).
function zQuantile(p) {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239]
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572]
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783]
  const e = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416]
  const tail = q => {
    const t = Math.sqrt(-2 * Math.log(q))
    return (((((c[0] * t + c[1]) * t + c[2]) * t + c[3]) * t + c[4]) * t + c[5]) / ((((e[0] * t + e[1]) * t + e[2]) * t + e[3]) * t + 1)
  }
  if (p < 0.02425) return tail(p)
  if (p > 1 - 0.02425) return -tail(1 - p)
  const q = p - 0.5
  const r = q * q
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
}
export function tQuantile(p, df) {
  const z = zQuantile(p)
  return z + (z ** 3 + z) / (4 * df) + (5 * z ** 5 + 16 * z ** 3 + 3 * z) / (96 * df ** 2) + (3 * z ** 7 + 19 * z ** 5 + 17 * z ** 3 - 15 * z) / (384 * df ** 3)
}

/**
 * Share of simulated studies where the lower bound of the one-sided interval on the difference in correct
 * share (ariadne − prima, per scenario, t over scenarios) stays above −margin. Each scenario has its own
 * difficulty: logit of prima's share ~ N(logit p, sdLogit); ariadne's share is prima's + delta.
 */
export function nonInferiorityPower({ n, perScenario, p, sdLogit, delta, margin, alpha, runs, random }) {
  const t = tQuantile(1 - alpha, n - 1)
  const draw = q => Array.from({ length: perScenario }, () => (random() < q ? 1 : 0)).reduce((a, b) => a + b, 0) / perScenario
  let hits = 0
  for (let r = 0; r < runs; r++) {
    const d = Array.from({ length: n }, () => {
      const base = expit(logit(p) + sdLogit * normal(random))
      return draw(Math.min(1, Math.max(0, base + delta))) - draw(base)
    })
    const spread = n > 1 ? sd(d) : 0
    if (mean(d) - t * spread / Math.sqrt(n) > -margin) hits++
  }
  return hits / runs
}

/**
 * Per-scenario estimates from a run: log-ratios of the mean normalized cost, and correct shares. The mean,
 * not the median: the long trials (Continua, searches) are where the money goes, and a median ignores them.
 */
export function estimates(rows) {
  const valid = rows.filter(r => !r.excluded && r.costNorm != null)
  const scenarios = [...new Set(valid.map(r => r.fixture))]
  const of = (s, c) => valid.filter(r => r.fixture === s && r.condition === c)
  const logRatios = scenarios.map(s => Math.log(mean(of(s, 'ariadne').map(r => r.costNorm)) / mean(of(s, 'prima').map(r => r.costNorm))))
  const questions = valid.filter(r => r.cat !== 'continue')
  const share = c => questions.filter(r => r.condition === c && r.status === 'correct').length / questions.filter(r => r.condition === c).length
  return { scenarios: scenarios.length, logRatios, mu: mean(logRatios), sd: scenarios.length > 1 ? sd(logRatios) : null, prima: share('prima'), ariadne: share('ariadne') }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values, positionals: [run] } = parseArgs({ allowPositionals: true, options: { n: { type: 'string', default: '12' }, runs: { type: 'string', default: '4000' } } })
  if (!run) {
    console.error('uso: node eval/power.mjs <cartella del run> [--n 12] [--runs 4000]')
    process.exit(2)
  }
  const rows = readFileSync(join(run, 'results.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
  const est = estimates(rows)
  const n = Number(values.n)
  const runs = Number(values.runs)
  // The spread comes from a few scenarios: also at the upper end of its 80% interval (chi-square, df − 1).
  const upper = est.sd * Math.sqrt((est.scenarios - 1) / [0, 0.0642, 0.446, 1.005, 1.649, 2.343, 3.07][Math.min(est.scenarios - 1, 6)])
  console.log(JSON.stringify({ estimates: est, n, power: {
    cost: Object.fromEntries([['estimate', est.mu], ['-10%', Math.log(0.9)], ['-5%', Math.log(0.95)]].flatMap(([label, mu]) => [est.sd, upper].map((s, i) => [`${label} sd${i ? '-upper' : ''}`, costPower({ n, mu, sd: s, alpha: 0.025, runs, random: rng(7 + i) })]))),
    nonInferiority: nonInferiorityPower({ n, perScenario: 12, p: (est.prima + est.ariadne) / 2, sdLogit: 0.8, delta: 0, margin: 0.1, alpha: 0.025, runs, random: rng(11) }),
  } }, null, 2))
}
