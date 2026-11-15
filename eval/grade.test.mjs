import { test } from 'node:test'
import assert from 'node:assert/strict'

import { extract, grade, gradeContinue, normalize } from './grade.mjs'

const titles = ['Validate invoice totals', 'Report malformed invoices', 'Cache for parsed suppliers', 'Store suppliers in SQLite', 'Export to the ledger']
const ctx = { titles, milestones: ['M1 Parser', 'M2 Reports'], aliases: { 'Cache for parsed suppliers': ['in-memory supplier cache'] } }

test('normalize lowers case, unifies spaces and punctuation, drops articles and markdown', () => {
  assert.equal(normalize('  **The** Cache — for  parsed `suppliers`. '), 'cache for parsed suppliers')
  assert.equal(normalize("L'export verso il ledger"), 'export verso ledger')
})

test('extract takes the RISPOSTA line; none, or two that disagree, is out of format', () => {
  assert.equal(extract('I looked at git.\nRISPOSTA: src/a.js'), 'src/a.js')
  assert.equal(extract('RISPOSTA: B\nmore text\nRISPOSTA: B'), 'B')
  assert.equal(extract('The answer is src/a.js'), null)
  assert.equal(extract('RISPOSTA: A\nRISPOSTA: B'), null)
})

test('where has two fields; each is right when its closest step title is the expected one', () => {
  const where = { cat: 'where', answer: { current: 'Validate invoice totals', next: 'Report malformed invoices' } }
  assert.equal(grade(where, 'RISPOSTA: validating the invoice totals | then reporting malformed invoices, later Export to the ledger', ctx).status, 'correct')
  assert.equal(grade(where, 'RISPOSTA: "Validate invoice totals" (in progress) | "Report malformed invoices"', ctx).status, 'correct')
  assert.equal(grade(where, 'RISPOSTA: Report malformed invoices | Export to the ledger', ctx).status, 'wrong')
  assert.equal(grade(where, 'RISPOSTA: totals', ctx).status, 'unrecognized')
  assert.equal(grade(where, 'RISPOSTA: something else | nothing', ctx).status, 'unrecognized')
})

test('where tolerates the milestone around a step and needs a RISPOSTA line', () => {
  const where = { cat: 'where', answer: { current: 'Validate invoice totals', next: 'Report malformed invoices' } }
  assert.equal(grade(where, 'RISPOSTA: sono su "M1 Parser › Validate invoice totals" | il prossimo è "m1.7 Report malformed invoices"', ctx).status, 'correct')
  assert.equal(grade(where, 'no answer line', ctx).status, 'format')
})

test('deferred and update are graded on the letter, like why', () => {
  const order = ['A → M2', 'Export to the ledger → M2 Reports', 'non risulta', 'B → M2', 'C → M3']
  const q = { cat: 'deferred', answer: 'Export to the ledger → M2 Reports', options: order }
  assert.equal(grade(q, 'RISPOSTA: B', { ...ctx, order }).status, 'correct')
  const u = { cat: 'update', answer: 'Cache for parsed suppliers', options: ['Cache for parsed suppliers', 'Store suppliers in SQLite', 'x', 'y', 'non risulta'] }
  assert.equal(grade(u, 'RISPOSTA: B', { ...ctx, order: u.options }).status, 'wrong')
})

test('why is graded on the letter of the shuffled option', () => {
  const q = { cat: 'why', answer: 'Right reason.', options: ['Right reason.', 'X.', 'Y.', 'Z.', 'non risulta'] }
  const order = ['X.', 'Right reason.', 'Y.', 'non risulta', 'Z.']
  assert.equal(grade(q, 'RISPOSTA: B', { ...ctx, order }).status, 'correct')
  assert.equal(grade(q, 'RISPOSTA: (b)', { ...ctx, order }).status, 'correct')
  assert.equal(grade(q, 'RISPOSTA: B) Right reason.', { ...ctx, order }).status, 'correct')
  assert.equal(grade(q, 'RISPOSTA: A run parses everything', { ...ctx, order }).status, 'unrecognized')
  assert.equal(grade(q, 'RISPOSTA: A', { ...ctx, order }).status, 'wrong')
  assert.equal(grade(q, 'RISPOSTA: F', { ...ctx, order }).status, 'unrecognized')
})

test('proof compares normalized paths; abstain accepts only non risulta', () => {
  const proof = { cat: 'proof', answer: ['src/lexer/index.js', 'src/lexer/split.js'] }
  assert.equal(grade(proof, 'RISPOSTA: src/lexer/split.js', ctx).status, 'correct')
  assert.equal(grade(proof, 'RISPOSTA: `src/lexer/index.js` (exports `tokens`, split on tabs)', ctx).status, 'correct')
  assert.equal(grade(proof, 'RISPOSTA: `./src/lexer/index.js`', ctx).status, 'correct')
  assert.equal(grade(proof, 'RISPOSTA: src/lexer/', ctx).status, 'wrong')
  const abstain = { cat: 'abstain', answer: 'non risulta' }
  assert.equal(grade(abstain, 'RISPOSTA: Non risulta.', ctx).status, 'correct')
  assert.equal(grade(abstain, 'RISPOSTA: nessuna traccia', ctx).status, 'unrecognized')
  assert.equal(grade(abstain, 'RISPOSTA: Postgres', ctx).status, 'unrecognized')
})

test('continue: a file of the next step, or a new one in its folder, and nothing finished', () => {
  const q = { cat: 'continue', answer: { dir: 'src/totals/', allowed: ['src/totals/index.js'], forbidden: ['src/cache/index.js'] } }
  assert.equal(gradeContinue(q, [], []).status, 'wrong')
  assert.equal(gradeContinue(q, ['src/totals/index.js', 'README.md'], []).status, 'correct')
  assert.equal(gradeContinue(q, [], ['src/totals/report.js']).status, 'correct')
  assert.equal(gradeContinue(q, [], ['src/report.js']).status, 'wrong')
  assert.equal(gradeContinue(q, ['src/totals/index.js', 'src/cache/index.js'], []).status, 'wrong')
})

test('continue: starting the open step from its tests counts, in tests/<area>/ or test/<area>/', () => {
  const q = { cat: 'continue', answer: { dir: 'src/totals/', allowed: ['src/totals/index.js'], forbidden: ['src/cache/index.js'] } }
  assert.equal(gradeContinue(q, [], ['tests/totals/report.test.js']).status, 'correct')
  assert.equal(gradeContinue(q, ['test/totals/index.test.js'], []).status, 'correct')
  assert.equal(gradeContinue(q, [], ['tests/cache/index.test.js']).status, 'wrong')
  assert.equal(gradeContinue(q, ['src/cache/index.js'], ['tests/totals/report.test.js']).status, 'wrong')
})
