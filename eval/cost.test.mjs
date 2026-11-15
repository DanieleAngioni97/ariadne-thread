import { test } from 'node:test'
import assert from 'node:assert/strict'

import { normalizedCost, PRICES } from './cost.mjs'

test('the normalized cost bills the first call of a trial as a cache write, so the order of the trials does not count', () => {
  const p = PRICES['claude-sonnet-5-5']
  const usage = { input_tokens: 10, cache_creation_input_tokens: 1000, cache_read_input_tokens: 5000, output_tokens: 200 }
  // 3000 of the reads were the warm prefix of the first call: billed as a write instead.
  const want = (10 * p.input + 1000 * p.write + 2000 * p.read + 3000 * p.write + 200 * p.output) / 1e6
  assert.equal(normalizedCost('claude-sonnet-5-5', usage, 3000), want)
  const cold = { ...usage, cache_creation_input_tokens: 4000, cache_read_input_tokens: 2000 }
  assert.equal(normalizedCost('claude-sonnet-5-5', cold, 0), want)
})

test('an unknown model has no normalized cost rather than a wrong one', () => {
  assert.equal(normalizedCost('claude-unknown', { input_tokens: 1, output_tokens: 1 }, 0), null)
})
