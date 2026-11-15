import { test } from 'node:test'
import assert from 'node:assert/strict'

import { pickLang } from './i18n.js'

test('the interface speaks English unless ?lang= or the project config asks for a language it has', () => {
  assert.equal(pickLang(null, undefined), 'en')
  assert.equal(pickLang(null, 'it'), 'it')
  assert.equal(pickLang('en', 'it'), 'en')
  assert.equal(pickLang('it-IT', undefined), 'it')
  assert.equal(pickLang('fr', 'de'), 'en')
})
