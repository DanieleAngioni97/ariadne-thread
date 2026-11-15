import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { paraphrase } from './paraphrase.mjs'

const FAKE = fileURLToPath(new URL('./fakes/fake-claude.mjs', import.meta.url))
const scenario = JSON.parse(readFileSync(new URL('./scenarios/dev/dev-01.json', import.meta.url), 'utf8'))

test('each question but Continua gets one paraphrase, asked from its text alone', () => {
  const answer = JSON.stringify({ paraphrases: scenario.questions.filter(q => q.cat !== 'continue').map((q, i) => `Reworded ${i}?`) })
  const out = paraphrase(scenario, { model: 'fake', bin: FAKE, env: { FAKE_ANSWER: answer } })
  assert.equal(out.length, scenario.questions.length)
  assert.equal(out[scenario.questions.findIndex(q => q.cat === 'continue')], null)
  assert.equal(out.filter(Boolean).length, scenario.questions.length - 1)
  assert.equal(out.find(Boolean), 'Reworded 0?')
})

test('a reply with the wrong number of paraphrases is refused', () => {
  assert.throws(() => paraphrase(scenario, { model: 'fake', bin: FAKE, env: { FAKE_ANSWER: '{"paraphrases":["one"]}' } }), /paraphrases/)
})
