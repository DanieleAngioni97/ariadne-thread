import { test } from 'node:test'
import assert from 'node:assert/strict'

import { words } from './i18n.mjs'

const say = words({
  en: { hello: 'hello', closed: (id, what) => `closed ${id}: ${what}`, only: 'only in English' },
  it: { hello: 'ciao', closed: (id, what) => `chiuso ${id}: ${what}` },
})

test('English unless ARIADNE_LANG asks for Italian; a missing Italian word falls back to English', () => {
  const before = process.env.ARIADNE_LANG
  try {
    delete process.env.ARIADNE_LANG
    assert.equal(say('hello'), 'hello')
    assert.equal(say('closed', 'a', 'done'), 'closed a: done')
    process.env.ARIADNE_LANG = 'it'
    assert.equal(say('hello'), 'ciao')
    assert.equal(say('closed', 'a', 'fatto'), 'chiuso a: fatto')
    assert.equal(say('only'), 'only in English')
    process.env.ARIADNE_LANG = 'fr'
    assert.equal(say('hello'), 'hello')
  } finally {
    if (before === undefined) delete process.env.ARIADNE_LANG
    else process.env.ARIADNE_LANG = before
  }
})
