// The cost of a trial that does not depend on the order of the trials (docs/valutazione/piano.md § 0, H2).
// A trial is one session: the reads of its first call hit a prefix that an earlier trial happened to warm,
// so they are billed as the write a cold start would pay; the reads after it are the trial's own.

// $ per million tokens, from the claude-api reference (cached 2026-10-06), read on 2026-11-15. Cache writes
// are the 5-minute ones, 1.25 × input; Haiku's cache read is the default 0.1 × input.
export const PRICES = {
  'claude-haiku-5-5': { input: 0.1, write: 0.125, read: 0.01, output: 0.5 },
  'claude-sonnet-5-5': { input: 2, write: 2.5, read: 0.2, output: 10 },
  'claude-opus-5-5': { input: 4, write: 5, read: 0.2, output: 20 },
}

/** `usage` of the whole trial; `firstReads` = cache reads of its first call. Null for a model without prices. */
export function normalizedCost(model, usage, firstReads) {
  const p = PRICES[model]
  if (!p) return null
  const write = (usage.cache_creation_input_tokens ?? 0) + firstReads
  const read = (usage.cache_read_input_tokens ?? 0) - firstReads
  return ((usage.input_tokens ?? 0) * p.input + write * p.write + read * p.read + (usage.output_tokens ?? 0) * p.output) / 1e6
}
