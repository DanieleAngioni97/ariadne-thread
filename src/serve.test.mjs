import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { request } from 'node:http'
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

test('POST /act confirms, rejects and comments as you, only with its header and on known operations', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ariadne-serve-'))
  mkdirSync(join(dir, '.ariadne'))
  const node = (id, fields) => JSON.stringify({ id, kind: 'step', title: id, status: 'todo', what: `${id}.`, proof: [{ type: 'message', ref: 'chat' }], by: 'agent', at: '2026-11-17', ...fields })
  writeFileSync(join(dir, '.ariadne', 'graph.jsonl'), [node('m1', { kind: 'milestone', status: 'active', review: 'confirm' }), node('a', { parent: 'm1' })].join('\n') + '\n')
  const server = serve(dir, 0)
  await new Promise(resolve => server.on('listening', resolve))
  const act = (body, headers = { 'x-ariadne-act': '1' }) => fetch(`http://127.0.0.1:${server.address().port}/act`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })
  const graph = () => readFileSync(join(dir, '.ariadne', 'graph.jsonl'), 'utf8')
  try {
    assert.equal((await act({ op: 'confirm', id: 'm1' }, {})).status, 403)
    assert.equal((await act({ op: 'start', id: 'a' })).status, 400)
    assert.equal((await act({ op: 'confirm', id: '../x' })).status, 400)
    const r = await act({ op: 'comment', id: 'a', text: 'Why?' })
    assert.equal(r.status, 200, await r.clone().text())
    assert.match(graph(), /"comments":\[\{"at":"[^"]+","text":"Why\?"\}\]/)
    assert.equal((await act({ op: 'confirm', id: 'm1' })).status, 200)
    assert.doesNotMatch(graph(), /"review"/)
    assert.match(graph(), /"confirmed"/)
    const missing = await act({ op: 'reject', id: 'ghost' })
    assert.equal(missing.status, 409)
    assert.match(await missing.text(), /ghost/)
  } finally {
    server.close()
  }
})

test('POST /act answers only to a page served from 127.0.0.1 or localhost, not to a rebound name', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ariadne-serve-'))
  mkdirSync(join(dir, '.ariadne'))
  const server = serve(dir, 0)
  await new Promise(resolve => server.on('listening', resolve))
  const post = host => new Promise(resolve => {
    const req = request({ host: '127.0.0.1', port: server.address().port, path: '/act', method: 'POST', headers: { host, 'x-ariadne-act': '1' } }, res => resolve(res.statusCode))
    req.end(JSON.stringify({ op: 'confirmAll' }))
  })
  try {
    assert.equal(await post('evil.example:80'), 403)
    assert.notEqual(await post(`localhost:${server.address().port}`), 403)
  } finally {
    server.close()
  }
})
