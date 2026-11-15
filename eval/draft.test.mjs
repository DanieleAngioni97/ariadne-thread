import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { draft } from './draft.mjs'

const FAKE = fileURLToPath(new URL('./fakes/fake-claude.mjs', import.meta.url))
const good = readFileSync(new URL('./scenarios/dev/dev-01.json', import.meta.url), 'utf8')
const spec = { id: 'dev-01', start: '2026-03-02T09:00:00Z', events: 18, domain: 'invoices' }

test('a coherent draft is saved as it came', () => {
  const out = join(mkdtempSync(join(tmpdir(), 'ariadne-draft-')), 'dev-01.json')
  const r = draft(spec, { model: 'fake', bin: FAKE, out, env: { FAKE_ANSWER: good } })
  assert.equal(r.rounds, 1)
  assert.deepEqual(JSON.parse(readFileSync(out, 'utf8')), JSON.parse(good))
})

test('a draft that stays incoherent after the repairs fails with its errors', () => {
  const bad = JSON.parse(good)
  bad.questions = bad.questions.filter(q => q.cat !== 'abstain')
  const out = join(mkdtempSync(join(tmpdir(), 'ariadne-draft-')), 'x.json')
  assert.throws(() => draft(spec, { model: 'fake', bin: FAKE, out, env: { FAKE_ANSWER: JSON.stringify(bad) } }), /after 3 rounds: missing categories: abstain/)
})

test('a test draft must also follow the rules of the test scenarios', () => {
  const out = join(mkdtempSync(join(tmpdir(), 'ariadne-draft-')), 'x.json')
  assert.throws(() => draft({ ...spec, set: 'test' }, { model: 'fake', bin: FAKE, out, env: { FAKE_ANSWER: good } }), /after 3 rounds: .*test: no handoff/)
})
