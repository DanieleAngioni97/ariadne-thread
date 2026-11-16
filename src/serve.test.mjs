import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { PACKAGE, resolvePath, serve } from './serve.mjs'

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

test('in any project the page and the logic come from the package, the data from the project', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ariadne-serve-'))
  mkdirSync(join(dir, '.ariadne'))
  writeFileSync(join(dir, '.ariadne', 'graph.jsonl'), '{"id":"x"}\n')
  const server = serve(dir, 0)
  await new Promise(resolve => server.on('listening', resolve))
  const get = path => fetch(`http://127.0.0.1:${server.address().port}${path}`).then(r => r.status === 200 ? r.text() : r.status)
  try {
    assert.match(await get('/'), /<html/i)
    assert.match(await get('/src/graph.mjs'), /export/)
    assert.equal(await get('/.ariadne/graph.jsonl'), '{"id":"x"}\n')
    assert.equal(await get('/root'), dir)
  } finally {
    server.close()
  }
})

test('the viewer says which package runs it, and closes on a quit that only ariadne sends', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ariadne-serve-'))
  const server = serve(dir, 0)
  await new Promise(resolve => server.on('listening', resolve))
  const at = `http://127.0.0.1:${server.address().port}`
  const closed = new Promise(resolve => server.on('close', resolve))
  assert.equal(await fetch(`${at}/package`).then(r => r.text()), PACKAGE)
  // A page from another site can send a plain POST, never this header without the server's consent.
  assert.equal((await fetch(`${at}/quit`, { method: 'POST' })).status, 404)
  assert.equal(server.listening, true)
  assert.equal((await fetch(`${at}/quit`, { method: 'POST', headers: { 'x-ariadne-quit': '1' } })).status, 200)
  await closed
  assert.equal(server.listening, false)
})
