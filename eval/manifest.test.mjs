import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { manifest } from './manifest.mjs'

test('the manifest hashes every file under the given paths, sorted, so any later change shows', () => {
  const root = mkdtempSync(join(tmpdir(), 'ariadne-manifest-'))
  mkdirSync(join(root, 'a/b'), { recursive: true })
  writeFileSync(join(root, 'a/b/x.json'), 'x')
  writeFileSync(join(root, 'a/y.md'), 'y')
  writeFileSync(join(root, 'z.md'), 'z')
  const m = manifest(root, ['a', 'z.md'])
  assert.deepEqual(Object.keys(m.files), ['a/b/x.json', 'a/y.md', 'z.md'])
  assert.equal(m.files['z.md'], '594e519ae499312b29433b7dd8a97ff068defcba9755b6d5d00e84c524d67b06')
  assert.match(m.total, /^[0-9a-f]{64}$/)
  writeFileSync(join(root, 'a/y.md'), 'changed')
  assert.notEqual(manifest(root, ['a', 'z.md']).total, m.total)
})
