import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { derivedPort, savePort, viewerPort } from './port.mjs'

const project = () => mkdtempSync(join(tmpdir(), 'ariadne-port-'))

test('the derived port is stable for a path and stays in its range', () => {
  assert.equal(derivedPort('/work/a'), derivedPort('/work/a'))
  for (const p of ['/work/a', '/work/b', '/Users/x/Sviluppo/y']) {
    const port = derivedPort(p)
    assert.ok(port >= 8800 && port < 9000, `${p} → ${port}`)
  }
})

test('two projects get different ports', () => {
  assert.notEqual(derivedPort('/work/a'), derivedPort('/work/b'))
})

test('without a saved port the viewer port is the derived one', () => {
  const dir = project()
  assert.equal(viewerPort(dir), derivedPort(dir))
})

test('a saved port wins, and lives in .ariadne/local.json', () => {
  const dir = project()
  savePort(dir, 9123)
  assert.equal(viewerPort(dir), 9123)
  assert.deepEqual(JSON.parse(readFileSync(join(dir, '.ariadne', 'local.json'), 'utf8')), { port: 9123 })
})

test('a saved port stays out of git, next to what .ariadne/.gitignore already keeps out', () => {
  const dir = project()
  mkdirSync(join(dir, '.ariadne'))
  writeFileSync(join(dir, '.ariadne', '.gitignore'), 'STATE.md\n')
  savePort(dir, 9123)
  savePort(dir, 9124)
  assert.equal(readFileSync(join(dir, '.ariadne', '.gitignore'), 'utf8'), 'STATE.md\nlocal.json\n')
})
