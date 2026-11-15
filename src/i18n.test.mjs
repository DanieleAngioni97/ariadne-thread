import { test } from 'node:test'
import assert from 'node:assert/strict'

import { systemLang, words } from './i18n.mjs'

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

test('in the browser, where there is no process, the viewer sets the language on globalThis', async () => {
  const { runInNewContext } = await import('node:vm')
  const { readFileSync } = await import('node:fs')
  const source = readFileSync(new URL('./i18n.mjs', import.meta.url), 'utf8').replace(/^export /gm, '')
  const table = { en: { hello: 'hello' }, it: { hello: 'ciao' } }
  assert.equal(runInNewContext(`${source}; words(table)('hello')`, { table }), 'hello')
  assert.equal(runInNewContext(`${source}; globalThis.ARIADNE_LANG = 'it'; words(table)('hello')`, { table }), 'ciao')
})

test('the system language comes from LC_ALL, LC_MESSAGES or LANG, as two letters', () => {
  assert.equal(systemLang({ LANG: 'it_IT.UTF-8' }), 'it')
  assert.equal(systemLang({ LC_ALL: 'en_GB.UTF-8', LANG: 'it_IT.UTF-8' }), 'en')
  assert.equal(systemLang({ LC_MESSAGES: 'it', LANG: 'en_US.UTF-8' }), 'it')
  assert.equal(systemLang({ LANG: 'C' }), '')
  assert.equal(systemLang({ LANG: 'POSIX' }), '')
  assert.equal(systemLang({}), '')
})
