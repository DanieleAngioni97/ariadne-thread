import { test } from 'node:test'
import assert from 'node:assert/strict'

import { opsFromCommits, untracked } from './trailers.mjs'

const proof = sha => [{ type: 'commit', ref: sha }]

test('a Thread line adds the commit as proof, done: closes the node with it', () => {
  const ops = opsFromCommits([
    { sha: 'bbb2222', thread: ['m3.6 done: The CLI applies operations.'] },
    { sha: 'aaa1111', thread: ['m3.6'] },
  ], new Set())
  // Oldest first, as the commits happened.
  assert.deepEqual(ops, [
    { op: 'fill', id: 'm3.6', proof: proof('aaa1111') },
    { op: 'close', id: 'm3.6', what: 'The CLI applies operations.', proof: proof('bbb2222') },
  ])
})

test('one commit can touch several nodes', () => {
  const ops = opsFromCommits([{ sha: 'aaa1111', thread: ['d7 done: Side question answered.', 'm3.6'] }], new Set())
  assert.deepEqual(ops.map(o => [o.op, o.id]), [['close', 'd7'], ['fill', 'm3.6']])
})

test('commits already recorded as proof are skipped, so sync can run any number of times', () => {
  assert.deepEqual(opsFromCommits([{ sha: 'aaa1111', thread: ['m3.6'] }], new Set(['aaa1111'])), [])
})

test('commits without a Thread line make no operation', () => {
  assert.deepEqual(opsFromCommits([{ sha: 'aaa1111', thread: [] }], new Set()), [])
})

test('untracked counts the latest commits without a Thread line', () => {
  assert.equal(untracked([{ sha: 'c', thread: [] }, { sha: 'b', thread: [] }, { sha: 'a', thread: ['m3.6'] }, { sha: 'z', thread: [] }]), 2)
  assert.equal(untracked([{ sha: 'a', thread: ['m3.6'] }]), 0)
})

test('a commit that only saves .ariadne/ is neutral: no proof, not counted as untracked', () => {
  const graphOnly = { sha: 'ggg', thread: ['m3.6'], files: ['.ariadne/graph.jsonl', '.ariadne/log.jsonl'] }
  assert.deepEqual(opsFromCommits([graphOnly], new Set()), [])
  assert.equal(untracked([{ sha: 'g2', thread: [], files: ['.ariadne/graph.jsonl'] }, { sha: 'a', thread: ['m3.6'], files: ['src/a.mjs'] }]), 0)
})

test('untracked skips merges, commits already recorded as proof, and commits from before the thread began', () => {
  assert.equal(untracked([{ sha: 'm', thread: [], merge: true }, { sha: 'a', thread: ['m3.6'] }]), 0)
  assert.equal(untracked([{ sha: 'c', thread: [] }, { sha: 'r', thread: [] }, { sha: 'z', thread: [] }], { recorded: new Set(['r']) }), 1)
  const since = '2026-11-16T14:30Z'
  const commits = [
    { sha: 'n', thread: [], at: '2026-11-16T16:00:00+01:00' },
    { sha: 'o1', thread: [], at: '2026-11-10T10:00:00Z' },
    { sha: 'o2', thread: [], at: '2026-11-09T10:00:00Z' },
  ]
  assert.equal(untracked(commits, { since }), 1)
})

test('a commit in the same minute the thread began is from before it: the log keeps only minutes', () => {
  assert.equal(untracked([{ sha: 'o', thread: [], at: '2026-11-16T14:30:40Z' }], { since: '2026-11-16T14:30Z' }), 0)
  assert.equal(untracked([{ sha: 'n', thread: [], at: '2026-11-16T14:31:05Z' }], { since: '2026-11-16T14:30Z' }), 1)
})
