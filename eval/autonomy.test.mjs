import { test } from 'node:test'
import assert from 'node:assert/strict'

import { group, sessions } from './autonomy.mjs'

const user = (text, timestamp = '2026-11-01T10:00:00Z') => ({ type: 'user', timestamp, message: { content: text } })

test('a session counts the prompts and those that ask to hand over or write the state; /clear starts a new one', () => {
  const events = [
    user('aggiungi il parser'),
    user('fai handoff'),
    user('<command-name>/handoff</command-name>'),
    user('<command-name>/clear</command-name>'),
    user('aggiorna lo stato e il LOG.md'),
    user('scrivi in STATE.md cosa manca'),
    user('vai avanti'),
    { type: 'user', isMeta: true, message: { content: 'handoff' } },
    { type: 'user', message: { content: [{ type: 'tool_result', content: 'handoff' }] } },
  ]
  assert.deepEqual(sessions(events), [
    { at: '2026-11-01T10:00:00Z', prompts: 2, requests: 2 },
    { at: '2026-11-01T10:00:00Z', prompts: 3, requests: 2 },
  ])
})

test('sessions in this repository from the first Thread commit are ariadne; development projects before it or elsewhere are by hand', () => {
  const repo = '-Users-x-Sviluppo-Personal-ariadne-thread'
  const since = '2026-11-11T11:39:06Z'
  assert.equal(group('-Users-x-Sviluppo-Personal-other', '2026-11-20T00:00:00Z', { repo, since }), 'by-hand')
  assert.equal(group(repo, '2026-11-10T00:00:00Z', { repo, since }), 'by-hand')
  assert.equal(group(repo, '2026-11-12T00:00:00Z', { repo, since }), 'ariadne')
  assert.equal(group('-private-tmp', '2026-11-12T00:00:00Z', { repo, since }), null)
})
