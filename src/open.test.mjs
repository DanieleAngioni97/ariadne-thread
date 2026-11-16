import { test } from 'node:test'
import assert from 'node:assert/strict'

import { browserCommand, openViewer } from './open.mjs'

// These tests read what ariadne writes in Italian; English has its own tests.
process.env.ARIADNE_LANG = 'it'

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

test('the browser opens with the command of each system: open on macOS, start on Windows, xdg-open elsewhere', () => {
  const url = 'http://127.0.0.1:8790/?select=m1'
  assert.deepEqual(browserCommand('darwin', url), ['open', [url]])
  assert.deepEqual(browserCommand('win32', url), ['cmd', ['/c', 'start', '', url]])
  assert.deepEqual(browserCommand('linux', url), ['xdg-open', [url]])
  assert.deepEqual(browserCommand('freebsd', url), ['xdg-open', [url]])
})

test('a viewer of this project run by another package, as after an update, is closed and started anew from this one', async () => {
  const p = port([ROOT])
  let running = '/cache/ariadne/0.1.2/'
  let quits = 0
  p.start = () => { p.calls.starts++; running = '/cache/ariadne/0.1.3/' }
  await openViewer({
    root: ROOT, port: () => 8790, wait: 0, ...p, start: p.start,
    own: '/cache/ariadne/0.1.3/', packageOf: async () => running, quit: async () => { quits++ },
  })
  assert.equal(quits, 1)
  assert.equal(p.calls.starts, 1)
  assert.deepEqual(p.calls.opened, ['http://127.0.0.1:8790/'])
})

test('an older viewer that cannot close itself keeps its port: the new one starts on a port of its own', async () => {
  const p = port([ROOT])
  let current = 8790
  p.start = () => { p.calls.starts++; current = 8811 }
  const packages = { 8790: null, 8811: '/cache/ariadne/0.1.3/' }
  await openViewer({
    root: ROOT, port: () => current, wait: 0, ...p, start: p.start,
    own: '/cache/ariadne/0.1.3/', packageOf: async at => packages[at], quit: async () => {},
  })
  assert.equal(p.calls.starts, 1)
  assert.deepEqual(p.calls.opened, ['http://127.0.0.1:8811/'])
})
