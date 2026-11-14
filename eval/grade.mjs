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
// The first path of an answer: a comment after it does not make it wrong.
const firstPath = value => cleanPath(/(?:\.\/)?[\w.-]+(?:\/[\w.-]+)+/.exec(value.replace(/`/g, ''))?.[0] ?? value)

const STOP = new Set(['of', 'for', 'in', 'on', 'to', 'by', 'and', 'with', 'from', 'di', 'del', 'dei', 'per'])
// Words compared by their first five letters: "validating" meets "validate", "invoices" meets "invoice".
const stems = text => new Set(normalize(text).split(' ').filter(w => w && !STOP.has(w)).map(w => w.slice(0, 5)))

/** The step title closest to a phrase: the share of its words the phrase contains, at least half. */
function closest(phrase, titles) {
  const words = stems(phrase)
  let best = null
  for (const t of titles) {
    const own = stems(t)
    const score = [...own].filter(w => words.has(w)).length / own.size
    if (score >= 0.5 && (!best || score > best.score)) best = { t, score }
  }
  return best?.t ?? null
}

/** Where: `current | next`, each field graded on its closest title; the rest of the answer does not count. */
function gradeWhere(value, { current, next }, { titles }) {
  const fields = value.split('|')
  if (fields.length < 2) return result('unrecognized', value)
  const found = [closest(fields[0], titles), closest(fields.slice(1).join('|'), titles)]
  if (found[0] === current && found[1] === next) return result('correct', value)
  return result(found.some((f, i) => f && f !== [current, next][i]) ? 'wrong' : 'unrecognized', value)
}

/** Grades a question answered in text; `ctx` holds the scenario titles, aliases and the shuffled why options. */
export function grade(q, output, ctx) {
  const value = extract(output)
  if (value === null) return result('format', null)
  // Why, deferred and update are multiple choice: the letter of the option in the shuffled order.
  if (q.options) {
    const letter = /^\(?([a-z])(?:\)?|[).:]\s.*)$/i.exec(value)?.[1]
    const option = letter ? ctx.order[letter.toLowerCase().charCodeAt(0) - 97] : undefined
    if (option === undefined) return result('unrecognized', value)
    return result(option === q.answer ? 'correct' : 'wrong', value)
  }
  switch (q.cat) {
    case 'where': return gradeWhere(value, q.answer, ctx)
    case 'proof': {
      const path = firstPath(value)
      if (q.answer.includes(path)) return result('correct', value)
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
