import { test } from 'node:test'
import assert from 'node:assert/strict'

import { analyze, clusterT, gee, holm } from './analyze.mjs'

// Twelve scenarios, two reps, six questions and a Continua each. ariadne costs 0.8 of prima everywhere.
function rows({ ariadneWrong = 0, primaWrong = 0 } = {}) {
  const out = []
  for (let s = 0; s < 12; s++) {
    for (const condition of ['prima', 'ariadne']) {
      for (let rep = 0; rep < 2; rep++) {
        for (let q = 0; q < 7; q++) {
          const wrong = condition === 'ariadne' ? q < ariadneWrong && s % 2 === rep : q < primaWrong && s % 2 === rep
          out.push({
            fixture: `t-${s}`, index: q, rep, condition, phrasing: 'original', cat: q === 6 ? 'continue' : 'where',
            status: wrong ? 'wrong' : 'correct', excluded: null, tokens: 1000, cost: 0.01,
            costNorm: (condition === 'ariadne' ? 0.8 : 1) * (1 + s / 10), asked: q === 6 ? false : undefined,
          })
        }
      }
    }
  }
  return out
}

test('Holm: the smaller p is tested at alpha/2, the larger at alpha, and rejection stops at the first failure', () => {
  assert.deepEqual(holm({ a: 0.01, b: 0.04 }, 0.05), { a: true, b: true })
  assert.deepEqual(holm({ a: 0.03, b: 0.04 }, 0.05), { a: false, b: false })
  assert.deepEqual(holm({ a: 0.001, b: 0.2 }, 0.05), { a: true, b: false })
})

test('the cluster t on per-scenario differences gives the non-inferiority bound and its p', () => {
  const r = clusterT([0, 0, 0, -0.1, 0.1, 0, 0, 0, 0, 0, 0, 0], 0.1)
  assert.ok(Math.abs(r.diff) < 1e-12)
  assert.ok(r.lower > -0.1 && r.lower < 0)
  assert.ok(r.p < 0.025)
})

test('H2: a cost ratio of 0.8 in every scenario gives a geometric mean of 0.8 and the smallest exact p', () => {
  const a = analyze(rows({ ariadneWrong: 1, primaWrong: 1 }), { gee: () => null })
  assert.ok(Math.abs(a.H2.ratio - 0.8) < 1e-9)
  assert.deepEqual(a.H2.ci.map(x => Math.round(x * 1e9) / 1e9), [0.8, 0.8])
  assert.equal(a.H2.p, 2 / 4096)
})

test('H1 falls back to the cluster t when the GEE cannot be fitted, and says so', () => {
  const a = analyze(rows(), { gee: () => null })
  assert.equal(a.H1.method, 'cluster-t')
  assert.equal(a.H1.diff, 0)
  assert.equal(a.H1.nonInferior, true)
  assert.equal(a.holm.H1, true)
})

test('secondary outcomes: pass^2 per question, Continua share, autonomy, billed cost', () => {
  const a = analyze(rows({ ariadneWrong: 2 }), { gee: () => null })
  assert.equal(a.secondary.pass2.prima, 1)
  assert.equal(a.secondary.pass2.ariadne, 48 / 72)
  assert.equal(a.secondary.continua.prima.share, 1)
  assert.deepEqual(a.secondary.asked.ariadne, { n: 0, of: 24 })
  assert.ok(Math.abs(a.secondary.billed.prima - 12 * 2 * 7 * 0.01) < 1e-9)
})

test('the GEE in statsmodels gives a difference near the raw one, with a t interval on scenarios − 1', { skip: !process.env.ARIADNE_GEE && 'set ARIADNE_GEE=1 to run uv and statsmodels' }, () => {
  const r = gee(rows({ ariadneWrong: 2, primaWrong: 1 }).filter(x => x.cat !== 'continue'))
  assert.equal(r.method, 'gee-bias-reduced')
  assert.ok(Math.abs(r.diff - (-1 / 12)) < 0.01, `${r.diff}`)
  assert.equal(r.df, 11)
  assert.ok(r.lower < r.diff)
})
