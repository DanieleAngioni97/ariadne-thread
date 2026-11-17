import { test } from 'node:test'
import assert from 'node:assert/strict'

import { onlyInChat } from './chat.mjs'

const n = fields => ({ id: 'a', title: 'A', what: 'A result.', proof: [], ...fields })

test('a bare chat reference or a what that points to the chat lives only in the chat', () => {
  assert.deepEqual(onlyInChat(n({ proof: [{ type: 'message', ref: 'chat 2026-11-16' }] })), ['chat 2026-11-16'])
  assert.deepEqual(onlyInChat(n({ what: 'Steps of the check as agreed in chat.' })), ['what'])
  assert.deepEqual(onlyInChat(n({ detail: 'vedi la chat per i passi' })), ['detail'])
})

test('a chat reference that says what was said, or a file, is enough', () => {
  assert.deepEqual(onlyInChat(n({ proof: [{ type: 'message', ref: 'chat 2026-11-16: use GitHub' }] })), [])
  assert.deepEqual(onlyInChat(n({ what: 'The chat widget opens on click.' })), [])
  assert.deepEqual(onlyInChat(n({ proof: [{ type: 'file', ref: 'docs/a.md' }] })), [])
})
