import { test } from 'node:test'
import assert from 'node:assert/strict'

import { messageOnly, promptsPerSession, stateGaps, threadShare } from './e4.mjs'

const user = content => ({ type: 'user', message: { content } })

test('prompts are the person’s messages: no tool results, meta lines or commands; /clear starts a new session', () => {
  const events = [
    user('first'), user([{ type: 'tool_result', content: 'x' }]), { ...user('caveat'), isMeta: true },
    user([{ type: 'text', text: 'second' }]), user('<command-name>/clear</command-name>'),
    user('third'), { type: 'assistant', message: { content: 'hi' } },
  ]
  assert.deepEqual(promptsPerSession(events), [2, 1])
  assert.deepEqual(promptsPerSession([user('<command-name>/clear</command-name>'), user('only')]), [1])
})

test('the Thread share counts from the first commit with a Thread line and skips graph-only commits', () => {
  const commits = [
    { thread: [], files: ['a'] },
    { thread: ['n1'], files: ['a'] },
    { thread: [], files: ['b'] },
    { thread: [], files: ['.ariadne/graph.jsonl'] },
    { thread: ['n2 done: x'], files: ['c'] },
  ]
  assert.deepEqual(threadShare(commits), { commits: 3, without: 1, share: 1 / 3 })
})

test('STATE.md gaps are the commits between its updates, while it existed', () => {
  const c = state => ({ state })
  assert.deepEqual(stateGaps([c(false), c(true), c(false), c(false), c(true), c(true), c(false)]), [2, 0, 1])
})

test('closed nodes with only a chat message as proof, apart from the uncertain historical ones', () => {
  const nodes = [
    { status: 'done', proof: [{ type: 'message' }] },
    { status: 'done', proof: [{ type: 'message' }], uncertain: 'historical node' },
    { status: 'done', proof: [{ type: 'message' }, { type: 'commit' }] },
    { status: 'todo', proof: [{ type: 'message' }] },
  ]
  assert.deepEqual(messageOnly(nodes), { done: 3, messageOnly: 2, certainDone: 2, certainMessageOnly: 1 })
})
