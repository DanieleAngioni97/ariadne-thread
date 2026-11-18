import { test } from 'node:test'
import assert from 'node:assert/strict'

import { STRINGS, pickLang } from './i18n.js'

test('the map speaks ?lang=, else the project config, else the browser language, if it has it; English otherwise', () => {
  assert.equal(pickLang(null, undefined, undefined), 'en')
  assert.equal(pickLang(null, undefined, 'it-IT'), 'it')
  assert.equal(pickLang(null, 'en', 'it-IT'), 'en')
  assert.equal(pickLang(null, 'it', 'en-US'), 'it')
  assert.equal(pickLang('en', 'it', 'it-IT'), 'en')
  assert.equal(pickLang('it-IT', undefined, undefined), 'it')
  assert.equal(pickLang(null, undefined, 'de-DE'), 'en')
  assert.equal(pickLang('fr', 'de', 'es'), 'en')
})

test('every language names each status, for the panel row and the node labels', () => {
  for (const [lang, words] of Object.entries(STRINGS)) {
    for (const status of ['done', 'active', 'todo', 'deferred', 'replaced']) {
      assert.equal(typeof words.status?.[status], 'string', `${lang}: status.${status}`)
    }
  }
})
