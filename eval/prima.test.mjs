import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { applyChanges, buildPrima, render } from './prima.mjs'

const scenario = JSON.parse(readFileSync(new URL('./scenarios/dev/dev-01.json', import.meta.url), 'utf8'))
const FAKE = fileURLToPath(new URL('./fakes/fake-claude.mjs', import.meta.url))

test('render tells the events as the conversation of a session, with what each one closes, defers or replaces', () => {
  const text = render(scenario.events)
  assert.match(text, /^User: new milestone "M1 Parser": Invoices become ledger rows\.$/m)
  assert.match(text, /^User: I approve this plan for "M1 Parser": Lexer for invoice lines → Store suppliers in SQLite → Cache for parsed suppliers → Export to the ledger\.$/m)
  assert.match(text, /^Agent: committed "feat\(lexer\): split invoice lines into tokens"; this closes "Lexer for invoice lines"\.$/m)
  assert.match(text, /^Agent: committed "docs: record the cache decision"\.$/m)
  assert.match(text, /^User: "Store suppliers in SQLite" is dropped; "Cache for parsed suppliers" replaces it\.$/m)
  assert.match(text, /^Agent: a detour first: "Fix the flaky CI job"\. The test job timed out on cold caches\. Then we go back to "Export to the ledger"\.$/m)
  assert.match(text, /^User: let's defer "Export to the ledger" to "M2 Reports"\.$/m)
  assert.equal(render(scenario.events, 5).split('\n').length, scenario.events.length - 5)
})

test('fact-check changes apply only where their text is found; the others are recorded as rejected', () => {
  const files = { 'STATE.md': 'Next: Export to the ledger\n', 'LOG.md': '# Log\n' }
  const r = applyChanges(files, [
    { file: 'STATE.md', find: 'Export to the ledger', replace: 'Validate invoice totals', reason: 'deferred' },
    { file: 'STATE.md', find: 'not there', replace: 'x', reason: 'r' },
  ])
  assert.equal(r.files['STATE.md'], 'Next: Validate invoice totals\n')
  assert.deepEqual([r.applied.length, r.rejected.length], [1, 1])
})

test('prima runs one handoff per handoff event and one at the end, each from the files of the one before', () => {
  const withHandoff = { ...scenario, events: [...scenario.events.slice(0, 9), { type: 'handoff' }, ...scenario.events.slice(9)] }
  const out = mkdtempSync(join(tmpdir(), 'ariadne-prima-'))
  const r = buildPrima(withHandoff, { model: 'fake', checker: 'fake', bin: FAKE, out, env: { FAKE_HANDOFF: '1' } })
  assert.equal(r.handoffs.length, 2)
  assert.match(readFileSync(join(out, 'STATE.md'), 'utf8'), /Next: I start "Validate invoice totals"/)
  assert.equal(readFileSync(join(out, 'LOG.md'), 'utf8'), '# Log\n- a milestone\n- a milestone\n')
  assert.ok(existsSync(join(out, 'handoffs', '1-STATE.md')) && existsSync(join(out, 'handoffs.json')))
})
