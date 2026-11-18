// The viewer's settings, kept in the browser: theme, language and the graph's starting view.

const KEY = 'ariadne.settings'

/** Every setting with its allowed values; the first is the default. */
export const CHOICES = {
  theme: ['auto', 'light', 'dark'],
  lang: ['auto', 'it', 'en'],
  level: ['path', 'milestones', 'all'],
}

const defaults = () => Object.fromEntries(Object.entries(CHOICES).map(([k, v]) => [k, v[0]]))

/** The saved settings, each one checked against its choices; `storage` is localStorage or null. */
export function readSettings(storage) {
  let saved = {}
  try { saved = JSON.parse(storage?.getItem(KEY) ?? '{}') ?? {} } catch {}
  const out = defaults()
  for (const k of Object.keys(CHOICES)) if (CHOICES[k].includes(saved[k])) out[k] = saved[k]
  return out
}

/** Saves one setting and returns them all; a value outside its choices is an error. */
export function writeSetting(storage, key, value) {
  if (!CHOICES[key]?.includes(value)) throw new Error(`setting ${key}: ${value} is not one of ${CHOICES[key]?.join(', ')}`)
  const next = { ...readSettings(storage), [key]: value }
  storage.setItem(KEY, JSON.stringify(next))
  return next
}
