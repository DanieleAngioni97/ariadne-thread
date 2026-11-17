import { test } from 'node:test'
import assert from 'node:assert/strict'

import { beforeClear, clearReport, onlyInChat } from './chat.mjs'

const n = fields => ({ id: 'a', title: 'A', what: 'A result.', proof: [], ...fields })

test('a bare chat reference or a what that points to the chat lives only in the chat', () => {
  assert.deepEqual(onlyInChat(n({ proof: [{ type: 'message', ref: 'chat 2026-11-16' }] })), ['chat 2026-11-16'])
  assert.deepEqual(onlyInChat(n({ what: 'Steps of the check as agreed in chat.' })), ['what'])
  assert.deepEqual(onlyInChat(n({ detail: 'vedi la chat per i passi' })), ['detail'])
})

test('a chat reference that says what was said, or a file, is enough', () => {
  assert.deepEqual(onlyInChat(n({ proof: [{ type: 'message', ref: 'chat 2026-11-16: use GitHub' }] })), [])
  assert.deepEqual(onlyInChat(n({ what: 'The chat widget opens on click.' })), [])
  assert.deepEqual(onlyInChat(n({ what: 'Elenca cosa vive solo in chat prima del clear.' })), [])
  assert.deepEqual(onlyInChat(n({ proof: [{ type: 'file', ref: 'docs/a.md' }] })), [])
})

const AT = '2026-11-17'
const node = (id, fields) => ({ id, kind: 'step', title: `T ${id}`, status: 'done', what: `${id}.`, by: 'agent', at: AT, proof: [{ type: 'commit', ref: 'abc' }], ...fields })
const NODES = [
  node('m1', { kind: 'milestone', status: 'done' }),
  node('old', { parent: 'm1', proof: [{ type: 'message', ref: 'chat 2026-10-01' }] }),
  node('m2', { kind: 'milestone', status: 'active' }),
  node('a', { parent: 'm2', proof: [{ type: 'message', ref: 'chat 2026-11-17' }] }),
  node('b', { parent: 'm2', status: 'active', proof: [{ type: 'file', ref: '~/notes/b.md' }] }),
  node('c', { parent: 'm2', status: 'todo', what: 'As agreed in chat.', proof: [{ type: 'message', ref: 'chat 2026-11-17: plan ok' }] }),
  node('d', { parent: 'm2', status: 'todo', what: 'A full description.', proof: [{ type: 'message', ref: 'chat 2026-11-17' }] }),
]

test('before /clear: what is not committed, what lives only in the chat, what lives outside the repo', () => {
  const found = beforeClear({ nodes: NODES, thread: { current: 'b' }, status: ' M src/a.mjs\n?? notes.md\n' })
  assert.deepEqual(found, {
    uncommitted: ['src/a.mjs', 'notes.md'],
    chat: [{ id: 'a', where: ['chat 2026-11-17'] }, { id: 'c', where: ['what'] }],
    outside: [{ id: 'b', ref: '~/notes/b.md' }],
  })
})

test('the report says /clear is safe when nothing is left, else what to do first', () => {
  process.env.ARIADNE_LANG = 'it'
  assert.match(clearReport({ uncommitted: [], chat: [], outside: [] }), /puoi fare \/clear/)
  const text = clearReport(beforeClear({ nodes: NODES, thread: { current: 'b' }, status: ' M src/a.mjs\n' }))
  for (const bit of ['Non committato: src/a.mjs', 'Solo in chat: a (chat 2026-11-17), c (what)', 'Fuori dal repo: b ~/notes/b.md', 'Prima di /clear']) {
    assert.ok(text.includes(bit), `${bit}\n---\n${text}`)
  }
})
