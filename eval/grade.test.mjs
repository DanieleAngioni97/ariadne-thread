import { test } from 'node:test'
import assert from 'node:assert/strict'

import { extract, grade, gradeContinue, normalize } from './grade.mjs'

const titles = ['Validate invoice totals', 'Report malformed invoices', 'Cache for parsed suppliers', 'Store suppliers in SQLite', 'Export to the ledger', 'M2 Reports']
const ctx = { titles, aliases: { 'Cache for parsed suppliers': ['in-memory supplier cache'] } }

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

test('a title answer is right when it names every expected title and no other one', () => {
  const where = { cat: 'where', answer: { current: 'Validate invoice totals', next: 'Report malformed invoices' } }
  assert.equal(grade(where, 'RISPOSTA: validate invoice totals; next: report malformed invoices', ctx).status, 'correct')
  assert.equal(grade(where, 'RISPOSTA: Validate invoice totals', ctx).status, 'wrong')
  assert.equal(grade(where, 'RISPOSTA: Validate invoice totals, Report malformed invoices, Export to the ledger', ctx).status, 'wrong')
  const update = { cat: 'update', answer: 'Cache for parsed suppliers' }
  assert.equal(grade(update, 'RISPOSTA: the in-memory supplier cache', ctx).status, 'correct')
  assert.equal(grade(update, 'RISPOSTA: suppliers are kept in RAM', ctx).status, 'unrecognized')
  assert.equal(grade(update, 'no answer line', ctx).status, 'format')
})

test('deferred needs the step and its milestone', () => {
  const q = { cat: 'deferred', answer: { step: 'Export to the ledger', milestone: 'M2 Reports' } }
  assert.equal(grade(q, 'RISPOSTA: Export to the ledger → M2 Reports', ctx).status, 'correct')
  assert.equal(grade(q, 'RISPOSTA: Export to the ledger', ctx).status, 'wrong')
})

test('why is graded on the letter of the shuffled option', () => {
  const q = { cat: 'why', answer: 'Right reason.', options: ['Right reason.', 'X.', 'Y.', 'Z.', 'non risulta'] }
  const order = ['X.', 'Right reason.', 'Y.', 'non risulta', 'Z.']
  assert.equal(grade(q, 'RISPOSTA: B', { ...ctx, order }).status, 'correct')
  assert.equal(grade(q, 'RISPOSTA: (b)', { ...ctx, order }).status, 'correct')
  assert.equal(grade(q, 'RISPOSTA: A', { ...ctx, order }).status, 'wrong')
  assert.equal(grade(q, 'RISPOSTA: F', { ...ctx, order }).status, 'unrecognized')
})

test('proof compares normalized paths; abstain accepts only non risulta', () => {
  const proof = { cat: 'proof', answer: 'src/lexer/index.js' }
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
