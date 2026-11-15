import { test } from 'node:test'
import assert from 'node:assert/strict'

import { openViewer } from './open.mjs'

const ROOT = '/work/repo'

/** Stands for the port: `answers` are what /root says on each probe (null: nothing listens). */
function port(answers) {
  const calls = { starts: 0, opened: [] }
  let i = 0
  return {
    calls,
    probe: async () => answers[Math.min(i++, answers.length - 1)],
    start: () => { calls.starts++ },
    launch: url => { calls.opened.push(url) },
  }
}

test('a viewer already on the port for this repo is opened as it is', async () => {
  const p = port([ROOT])
  await openViewer({ root: ROOT, port: () => 8790, ...p })
  assert.equal(p.calls.starts, 0)
  assert.deepEqual(p.calls.opened, ['http://127.0.0.1:8790/'])
})

test('with nothing on the port the viewer is started, then opened on the node asked for', async () => {
  const p = port([null, null, ROOT])
  await openViewer({ root: ROOT, port: () => 8790, id: 'm3.1', wait: 0, ...p })
  assert.equal(p.calls.starts, 1)
  assert.deepEqual(p.calls.opened, ['http://127.0.0.1:8790/?select=m3.1'])
})

test('a port held by another server: the viewer starts on a port of its own and is opened there', async () => {
  const p = port(['not found', ROOT])
  let current = 8790
  p.start = () => { p.calls.starts++; current = 8811 }
  await openViewer({ root: ROOT, port: () => current, wait: 0, ...p })
  assert.equal(p.calls.starts, 1)
  assert.deepEqual(p.calls.opened, ['http://127.0.0.1:8811/'])
})

test('a port fixed by hand and held by another server is said, and nothing is started or opened', async () => {
  const p = port(['not found'])
  await assert.rejects(openViewer({ root: ROOT, port: () => 8790, fixed: true, ...p }), /porta 8790 occupata/)
  assert.equal(p.calls.starts, 0)
  assert.deepEqual(p.calls.opened, [])
})

test('a viewer that does not come up in time is said', async () => {
  const p = port([null])
  await assert.rejects(openViewer({ root: ROOT, port: () => 8790, wait: 0, tries: 3, ...p }), /non è partito/)
  assert.deepEqual(p.calls.opened, [])
})
