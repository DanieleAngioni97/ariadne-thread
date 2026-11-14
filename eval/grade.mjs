// Deterministic graders for E1 (docs/valutazione/piano.md § 5 and § 6). Each returns a status:
// `correct`, `wrong`, `unrecognized` (for the blind labeller) or `format` (no single RISPOSTA line).

const ARTICLES = new Set(['the', 'a', 'an', 'il', 'lo', 'la', 'i', 'gli', 'le', "l'", 'un', 'uno', 'una', "un'"])
const NONE = 'non risulta'

/** Lower case, markdown and punctuation gone, articles dropped, single spaces. */
export function normalize(text) {
  return text.toLowerCase().replace(/[*`_~]/g, '').replace(/['’]/g, "' ")
    .split(/[^\p{L}\p{N}']+/u).filter(w => w && !ARTICLES.has(w)).join(' ')
}

/** The answer after `RISPOSTA:`; null when there is none, or several that disagree. */
export function extract(output) {
  const values = [...output.matchAll(/^\s*\**RISPOSTA:\**\s*(.*)$/gim)].map(m => m[1].trim())
  return new Set(values).size === 1 ? values[0] : null
}

const result = (status, value) => ({ status, correct: status === 'correct', value })
const has = (text, phrase) => phrase !== '' && ` ${text} `.includes(` ${phrase} `)

/** Right when every expected title (or an alias) is named and no other title is. */
function gradeTitles(value, expected, { titles, aliases = {} }) {
  let rest = normalize(value)
  const named = title => [title, ...(aliases[title] ?? [])].map(normalize).find(t => has(rest, t))
  let found = 0
  for (const title of expected) {
    const hit = named(title)
    if (hit) { found++; rest = ` ${rest} `.replace(` ${hit} `, ' ').trim() }
  }
  const others = titles.filter(t => !expected.includes(t) && named(t))
  if (found === expected.length && others.length === 0) return result('correct', value)
  return result(found + others.length > 0 || has(normalize(value), NONE) ? 'wrong' : 'unrecognized', value)
}

const cleanPath = p => p.trim().replace(/^[`'"]+|[`'".,;]+$/g, '').replace(/^\.\//, '')

/** Grades a question answered in text; `ctx` holds the scenario titles, aliases and the shuffled why options. */
export function grade(q, output, ctx) {
  const value = extract(output)
  if (value === null) return result('format', null)
  switch (q.cat) {
    case 'where': return gradeTitles(value, [q.answer.current, q.answer.next], ctx)
    case 'deferred': return gradeTitles(value, [q.answer.step, q.answer.milestone], ctx)
    case 'update': return gradeTitles(value, [q.answer], ctx)
    case 'why': {
      const letter = /^\(?([a-z])\)?[.)]?$/i.exec(value)?.[1]
      const option = letter ? ctx.order[letter.toLowerCase().charCodeAt(0) - 97] : undefined
      if (option === undefined) return result('unrecognized', value)
      return result(option === q.answer ? 'correct' : 'wrong', value)
    }
    case 'proof': {
      const path = cleanPath(value)
      if (path === q.answer) return result('correct', value)
      return result(/[/.]/.test(path) ? 'wrong' : 'unrecognized', value)
    }
    case 'abstain': return result(normalize(value) === normalize(NONE) ? 'correct' : 'unrecognized', value)
    default: throw new Error(`no text grader for ${q.cat}`)
  }
}

/** Continua: the files the subject modified and added in its copy (plan § 5, rilievo M4). */
export function gradeContinue(q, modified, added) {
  const { dir, allowed, forbidden } = q.answer
  const touched = [...modified, ...added]
  if (touched.length === 0) return result('wrong', touched)
  if (touched.some(f => forbidden.includes(f))) return result('wrong', touched)
  const next = modified.some(f => allowed.includes(f)) || added.some(f => f.startsWith(dir))
  return result(next ? 'correct' : 'wrong', touched)
}
