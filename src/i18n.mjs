// The language ariadne writes in: Italian when ARIADNE_LANG is `it`, English otherwise.
// bin/ariadne.mjs sets ARIADNE_LANG from `lang` in .ariadne/config.json, else from the system locale,
// when the environment does not; in the browser, where there is no process, the viewer sets
// globalThis.ARIADNE_LANG.

const lang = () => ((globalThis.process?.env?.ARIADNE_LANG ?? globalThis.ARIADNE_LANG) === 'it' ? 'it' : 'en')

/** A module's words, `{ en: {...}, it: {...} }`: `say(key, ...args)` in the current language, English when missing. */
export function words(table) {
  return (key, ...args) => {
    const word = table[lang()][key] ?? table.en[key]
    return typeof word === 'function' ? word(...args) : word
  }
}

/** The person's language from the locale variables, as a two-letter code: `it_IT.UTF-8` is `it`; `C` or none is ''. */
export function systemLang(env) {
  const locale = env.LC_ALL || env.LC_MESSAGES || env.LANG || ''
  return /^[a-z]{2}(?![a-z])/i.test(locale) ? locale.slice(0, 2).toLowerCase() : ''
}
