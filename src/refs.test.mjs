import { test } from 'node:test'
import assert from 'node:assert/strict'

import { brokenRefs, fileRef, showRef } from './refs.mjs'

test('a file proof names a path and, after #, the start of a section title', () => {
  assert.deepEqual(fileRef('docs/a.md'), { path: 'docs/a.md', section: null })
  assert.deepEqual(fileRef('docs/a.md#m3.9'), { path: 'docs/a.md', section: 'm3.9' })
  assert.equal(showRef('docs/a.md#m3.9'), 'docs/a.md § m3.9')
  assert.equal(showRef('docs/a.md'), 'docs/a.md')
})

const files = {
  'docs/a.md': '# Piano\n\n## m3.9 — Task tools come sorgente\ntesto\n### Dettaglio\n',
  'src/x.mjs': 'export const x = 1\n',
}
const disk = { read: path => files[path] ?? null }
const node = (id, ...refs) => ({ id, proof: refs.map(ref => ({ type: 'file', ref })) })

test('files that exist and sections found by the start of their title are fine', () => {
  assert.deepEqual(brokenRefs([node('a', 'docs/a.md', 'docs/a.md#m3.9', 'docs/a.md#Dettaglio', 'src/x.mjs')], disk), [])
})

test('a missing file and a section not in the file are each reported once, with the node', () => {
  const nodes = [node('a', 'docs/gone.md'), node('b', 'docs/a.md#m4.1'), { id: 'c', proof: [{ type: 'commit', ref: 'abc' }] }]
  assert.deepEqual(brokenRefs(nodes, disk), [
    { id: 'a', ref: 'docs/gone.md', reason: 'file not found' },
    { id: 'b', ref: 'docs/a.md#m4.1', reason: 'section not found' },
  ])
})

test('a folder or a path under the home folder is checked for existence only', () => {
  const folders = { read: path => (path === 'spikes' || path === '~/notes.md' ? '' : null) }
  assert.deepEqual(brokenRefs([node('a', 'spikes', '~/notes.md')], folders), [])
})
