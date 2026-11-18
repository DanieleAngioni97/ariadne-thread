import { test } from 'node:test'
import assert from 'node:assert/strict'

import { readSettings, writeSetting } from './settings.js'

const memory = (init = {}) => {
  const m = new Map(Object.entries(init))
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }
}

test('settings start from the defaults and ignore values they do not know', () => {
  assert.deepEqual(readSettings(memory()), { theme: 'auto', lang: 'auto', level: 'path' })
  assert.deepEqual(readSettings(memory({ 'ariadne.settings': '{"theme":"dark","lang":"xx","level":"all"}' })), { theme: 'dark', lang: 'auto', level: 'all' })
  assert.deepEqual(readSettings(memory({ 'ariadne.settings': 'not json' })), { theme: 'auto', lang: 'auto', level: 'path' })
  assert.deepEqual(readSettings(null), { theme: 'auto', lang: 'auto', level: 'path' }, 'no storage, as under node')
})

test('a setting written is read back; an unknown value is refused', () => {
  const s = memory()
  assert.equal(writeSetting(s, 'theme', 'light').theme, 'light')
  assert.equal(readSettings(s).theme, 'light')
  assert.throws(() => writeSetting(s, 'theme', 'neon'))
})
