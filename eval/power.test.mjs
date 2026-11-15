import { test } from 'node:test'
import assert from 'node:assert/strict'

import { costPower, estimates, nonInferiorityPower, rng, wilcoxonP } from './power.mjs'

test('the exact signed-rank test: twelve differences of one sign give 2/4096, a balanced set gives 1', () => {
  assert.equal(wilcoxonP(Array.from({ length: 12 }, (_, i) => -(i + 1))), 2 / 4096)
  assert.equal(wilcoxonP([1, -1, 2, -2]), 1)
  assert.equal(wilcoxonP([0, 0, 0]), 1)
})

test('with no effect the cost test rejects at about alpha; with a large one, almost always', () => {
  const none = costPower({ n: 12, mu: 0, sd: 0.1, alpha: 0.05, runs: 2000, random: rng(1) })
  assert.ok(none < 0.07, `${none}`)
  const big = costPower({ n: 12, mu: Math.log(0.5), sd: 0.1, alpha: 0.05, runs: 500, random: rng(2) })
  assert.ok(big > 0.99, `${big}`)
})

test('non-inferiority on correctness: equal conditions near the top clear a 10-point margin most of the time', () => {
  const p = nonInferiorityPower({ n: 12, perScenario: 12, p: 0.95, sdLogit: 0.8, delta: 0, margin: 0.1, alpha: 0.05, runs: 1000, random: rng(3) })
  assert.ok(p > 0.8, `${p}`)
  const worse = nonInferiorityPower({ n: 12, perScenario: 12, p: 0.95, sdLogit: 0.8, delta: -0.15, margin: 0.1, alpha: 0.05, runs: 1000, random: rng(4) })
  assert.ok(worse < 0.06, `${worse}`)
})

test('estimates take, per scenario, the log-ratio of the mean normalized cost: the long trials are where the money goes', () => {
  const row = (fixture, condition, costNorm, cat = 'where') => ({ fixture, condition, costNorm, cat, status: 'correct', excluded: null })
  const rows = [row('s1', 'prima', 1), row('s1', 'prima', 1), row('s1', 'prima', 10, 'continue'), row('s1', 'ariadne', 1), row('s1', 'ariadne', 1), row('s1', 'ariadne', 4, 'continue')]
  const est = estimates(rows)
  assert.equal(est.logRatios[0], Math.log(6 / 12))
})
