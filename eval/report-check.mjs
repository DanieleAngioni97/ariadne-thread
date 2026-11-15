// Clarity check of docs/rapporto.html (step m4.4.12.2): every concept is explained once, in at most 30
// words, before any use. A definition is <span class="def"><dfn id="t-x">…</dfn> …</span>; a later use is
// <a class="term" href="#t-x">. Definition spans must not contain other spans.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const MAX_WORDS = 30
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').split(/\s+/).filter(Boolean)

/** { terms: ids in order of definition, problems: one line each } */
export function checkConcepts(html) {
  const problems = []
  const defs = new Map()
  for (const m of html.matchAll(/<dfn id="t-([^"]+)"/g)) {
    const id = m[1]
    if (defs.has(id)) { problems.push(`${id}: definito due volte`); continue }
    defs.set(id, m.index)
    const open = html.lastIndexOf('<span class="def">', m.index)
    const between = open < 0 ? '' : html.slice(open, m.index)
    if (open < 0 || between.includes('</span>')) { problems.push(`${id}: definizione senza <span class="def">`); continue }
    const close = html.indexOf('</span>', m.index)
    const words = text(html.slice(open, close)).length
    if (words > MAX_WORDS) problems.push(`${id}: definizione di ${words} parole (al più ${MAX_WORDS})`)
  }
  for (const m of html.matchAll(/href="#t-([^"]+)"/g)) {
    const id = m[1]
    if (!defs.has(id)) problems.push(`${id}: usato ma non definito`)
    else if (m.index < defs.get(id)) problems.push(`${id}: usato prima della definizione`)
  }
  return { terms: [...defs.keys()], problems: [...new Set(problems)] }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = process.argv[2] ?? fileURLToPath(new URL('../docs/rapporto.html', import.meta.url))
  const { terms, problems } = checkConcepts(readFileSync(file, 'utf8'))
  console.log(`${terms.length} concetti definiti: ${terms.join(', ')}`)
  for (const p of problems) console.log(`✗ ${p}`)
  process.exit(problems.length ? 1 : 0)
}
