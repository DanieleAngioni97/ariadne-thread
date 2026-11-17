// Migration from a hand-written STATE.md and LOG.md (the `handoff` format) into the thread: m6.2,
// docs/m6.2-migrazione.md. Pure: text in, data out; the CLI writes.

const ITEM = /^\s*(?:[-*]|\d+[.)])\s+(.*)$/
const LOG_LINE = /^\s*[-*]\s+(\d{4}-\d{2}-\d{2})\s+·\s+(.+?)(?:\s+·\s+(.+?))?\s*$/

/** The `## ` sections of a markdown text, each with its items: bullets or numbered lines, else its prose. */
function sections(text) {
  const out = []
  let current = null
  let item = null
  const end = () => { item = null }
  for (const raw of text.split('\n')) {
    const heading = raw.match(/^##\s+(.*?)\s*$/)
    if (heading) {
      current = { title: heading[1], items: [], prose: [] }
      out.push(current)
      end()
      continue
    }
    if (!current) continue
    if (raw.trim() === '') { end(); continue }
    const bullet = raw.match(ITEM)
    if (bullet) {
      item = [bullet[1].trim()]
      current.items.push(item)
    } else if (item) item.push(raw.trim())
    else current.prose.push(raw.trim())
  }
  return out.map(s => ({ title: s.title, items: s.items.length ? s.items.map(i => i.join(' ')) : s.prose.length ? [s.prose.join(' ')] : [] }))
}

const IS = {
  milestone: t => /^(milestone|traguardo)\b/i.test(t),
  next: t => /^(next|prossim)/i.test(t),
  open: t => /open decisions|risks|decisioni aperte|rischi/i.test(t),
}

/** STATE.md as `{ milestone, next[], open[], other[{title, items[]}] }`; a missing section is empty. */
export function readState(text) {
  const found = sections(text)
  const pick = is => found.filter(s => is(s.title)).flatMap(s => s.items)
  const milestone = pick(IS.milestone).join(' ') || null
  const other = found.filter(s => !Object.values(IS).some(is => is(s.title))).map(({ title, items }) => ({ title, items }))
  return { milestone, next: pick(IS.next), open: pick(IS.open), other }
}

/** LOG.md lines `- <date> · <what> · <reference>`, in file order; other lines are left to the archive. */
export function readLog(text) {
  return text.split('\n').flatMap(raw => {
    const m = raw.match(LOG_LINE)
    return m ? [{ at: m[1], what: m[2], ref: m[3] ?? null }] : []
  })
}
