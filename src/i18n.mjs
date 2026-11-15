// The language ariadne writes in: Italian when ARIADNE_LANG is `it`, English otherwise.
// bin/ariadne.mjs sets ARIADNE_LANG from `lang` in .ariadne/config.json when the environment does not;
// in the browser, where there is no process, the viewer sets globalThis.ARIADNE_LANG.

const lang = () => ((globalThis.process?.env?.ARIADNE_LANG ?? globalThis.ARIADNE_LANG) === 'it' ? 'it' : 'en')

/** A module's words, `{ en: {...}, it: {...} }`: `say(key, ...args)` in the current language, English when missing. */
export function words(table) {
  return (key, ...args) => {
    const word = table[lang()][key] ?? table.en[key]
    return typeof word === 'function' ? word(...args) : word
  }
}
