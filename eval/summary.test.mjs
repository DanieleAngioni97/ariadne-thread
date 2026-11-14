import { test } from 'node:test'
import assert from 'node:assert/strict'

import { summarize } from './summary.mjs'

const r = (condition, cat, status, extra = {}) => ({ condition, cat, status, excluded: null, tokens: 100, cost: 0.01, ...extra })

test('summary: share correct per condition and category, without the excluded trials; the ceiling rule', () => {
  const rows = [
    r('prima', 'where', 'correct'), r('prima', 'why', 'wrong'), r('prima', 'why', 'unrecognized'),
    r('ariadne', 'where', 'correct'), r('ariadne', 'why', 'correct'), r('ariadne', 'proof', 'correct', { excluded: 'outside', tokens: 900 }),
  ]
  const s = summarize(rows)
  assert.deepEqual(s.prima.correct, { n: 3, share: 1 / 3 })
  assert.deepEqual(s.ariadne.correct, { n: 2, share: 1 })
  assert.deepEqual(s.prima.byCat.why, { n: 2, share: 0 })
  assert.equal(s.prima.status.unrecognized, 1)
  assert.equal(s.ariadne.excluded.outside, 1)
  assert.equal(s.ariadne.medianTokens, 100)
  assert.equal(s.ceiling, false)
})

test('the ceiling is reached when both conditions are above 90% on the question categories', () => {
  const rows = [...Array(10)].flatMap(() => [r('prima', 'where', 'correct'), r('ariadne', 'where', 'correct')])
  assert.equal(summarize(rows).ceiling, true)
})
