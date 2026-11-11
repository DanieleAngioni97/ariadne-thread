import { test } from 'node:test'
import assert from 'node:assert/strict'

import { resolvePath } from './serve.mjs'

test('the page and its scripts come from viewer/, the logic from src/, the data from .ariadne/', () => {
  assert.equal(resolvePath('/'), 'viewer/index.html')
  assert.equal(resolvePath('/app.js?v=1'), 'viewer/app.js')
  assert.equal(resolvePath('/src/graph.mjs'), 'src/graph.mjs')
  assert.equal(resolvePath('/.ariadne/graph.jsonl'), '.ariadne/graph.jsonl')
})

test('nothing outside those folders is served', () => {
  assert.equal(resolvePath('/../CLAUDE.md'), null)
  assert.equal(resolvePath('/src/../bin/ariadne.mjs'), null)
  assert.equal(resolvePath('/%2e%2e/CLAUDE.md'), null)
  assert.equal(resolvePath('/.ariadne/../.git/config'), null)
  assert.equal(resolvePath('/.git/config'), null)
})
