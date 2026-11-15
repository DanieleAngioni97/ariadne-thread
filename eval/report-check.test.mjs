import { test } from 'node:test'
import assert from 'node:assert/strict'

import { checkConcepts } from './report-check.mjs'

const def = (id, words) => `<span class="def"><dfn id="t-${id}">${id}</dfn> ${words}</span>`
const use = id => `<a class="term" href="#t-${id}">${id}</a>`

test('a page whose terms are each defined once, briefly, before any use passes', () => {
  const html = `<p>${def('agente', 'è un modello che lavora nel repository.')}</p><p>Un ${use('agente')} legge.</p>`
  assert.deepEqual(checkConcepts(html).problems, [])
  assert.deepEqual(checkConcepts(html).terms, ['agente'])
})

test('a term used before its definition, a missing definition and a double definition are each reported', () => {
  const html = `<p>${use('filo')}</p><p>${def('filo', 'è il grafo del lavoro.')}</p><p>${use('nodo')}</p><p>${def('filo', 'di nuovo.')}</p>`
  const { problems } = checkConcepts(html)
  assert.ok(problems.some(p => p.includes('filo') && p.includes('prima')), problems.join('\n'))
  assert.ok(problems.some(p => p.includes('nodo') && p.includes('non definito')), problems.join('\n'))
  assert.ok(problems.some(p => p.includes('filo') && p.includes('due volte')), problems.join('\n'))
})

test('a definition longer than 30 words is reported', () => {
  const long = Array.from({ length: 31 }, (_, i) => `w${i}`).join(' ')
  const { problems } = checkConcepts(`<p>${def('scheda', long)}</p>`)
  assert.ok(problems.some(p => p.includes('scheda') && p.includes('parole')), problems.join('\n'))
})

test('a definition with no class="def" around it is reported', () => {
  const { problems } = checkConcepts('<p><dfn id="t-hook">hook</dfn> è un comando.</p>')
  assert.ok(problems.some(p => p.includes('hook') && p.includes('def')), problems.join('\n'))
})
