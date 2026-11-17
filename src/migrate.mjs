// Migration from a hand-written STATE.md and LOG.md (the `handoff` format) into the thread: m6.2,
// docs/m6.2-migrazione.md. Pure: text in, data out; the CLI writes.

import { makeGraph } from './graph.mjs'
import { words } from './i18n.mjs'

const say = words({
  en: {
    history: 'History before ariadne',
    historyWhat: (k, first, last, what) => `${k} milestones in LOG.md from ${first} to ${last}; the last: ${what}`,
    work: 'Work in progress',
    head: 'ariadne migrate: preview, nothing written',
    newMilestone: (id, title) => `New milestone: ${id} ${title}`,
    milestone: (id, title) => `Milestone: ${id} ${title} (already in the graph)`,
    historyLine: (k, id, title) => `History: ${k} ${k === 1 ? 'line' : 'lines'} of LOG.md → ${id} ${title}`,
    next: 'Steps from Next:',
    open: 'Decisions and risks (correct with --as <n>=decision|risk|pointer|drop):',
    as: { decision: 'decision', risk: 'risk', pointer: 'to CLAUDE.md or docs/', drop: 'dropped' },
    other: 'To move into CLAUDE.md or docs/, not into the graph:',
    archive: 'Archive (git mv):',
    apply: 'Every node enters to confirm. To apply: ariadne migrate --apply [--as …]',
  },
  it: {
    history: 'Storia prima di ariadne',
    historyWhat: (k, first, last, what) => `${k} traguardi in LOG.md dal ${first} al ${last}; l'ultimo: ${what}`,
    work: 'Lavoro in corso',
    head: 'ariadne migrate: anteprima, niente è stato scritto',
    newMilestone: (id, title) => `Milestone nuova: ${id} ${title}`,
    milestone: (id, title) => `Milestone: ${id} ${title} (già nel grafo)`,
    historyLine: (k, id, title) => `Storia: ${k} ${k === 1 ? 'riga' : 'righe'} di LOG.md → ${id} ${title}`,
    next: 'Passi da Next:',
    open: 'Decisioni e rischi (correggi con --as <n>=decision|risk|pointer|drop):',
    as: { decision: 'decisione', risk: 'rischio', pointer: 'in CLAUDE.md o docs/', drop: 'scartata' },
    other: 'Da portare in CLAUDE.md o docs/, non nel grafo:',
    archive: 'Archivio (git mv):',
    apply: 'Ogni nodo entra da confermare. Per applicare: ariadne migrate --apply [--as …]',
  },
})

const ITEM = /^\s*(?:[-*]|\d+[.)])\s+(.*)$/
const LOG_LINE = /^\s*[-*]\s+(\d{4}-\d{2}-\d{2})\s+·\s+(.+?)(?:\s+·\s+(.+?))?\s*$/

/** The `## ` sections of a markdown text, each with its items: bullets or numbered lines, else its prose. */
function sections(text) {
  const out = []
  let current = null
  let item = null
  const end = () => { item = null; if (current?.prose.at(-1)?.length) current.prose.push([]) }
  for (const raw of text.split('\n')) {
    const heading = raw.match(/^##\s+(.*?)\s*$/)
    if (heading) {
      current = { title: heading[1], items: [], prose: [[]] }
      out.push(current)
      end()
      continue
    }
    if (!current) continue
    if (raw.trim() === '' || /^\s*\|/.test(raw)) { end(); continue }
    const bullet = raw.match(ITEM)
    if (bullet) {
      item = [bullet[1].trim()]
      current.items.push(item)
    } else if (item) item.push(raw.trim())
    else current.prose.at(-1).push(raw.trim())
  }
  return out.map(s => {
    const paragraphs = s.prose.filter(p => p.length).map(p => p.join(' '))
    return { title: s.title, items: s.items.length ? s.items.map(i => i.join(' ')) : paragraphs.length ? [paragraphs.join(' ')] : [], first: paragraphs[0] ?? null }
  })
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
  // The first paragraph says where the work stands; tables and the rest stay in the archive.
  const ms = found.find(s => IS.milestone(s.title))
  const milestone = ms ? ms.first ?? (ms.items.join(' ') || null) : null
  const other = found.filter(s => !Object.values(IS).some(is => is(s.title))).map(({ title, items }) => ({ title, items }))
  const title = is => found.find(s => is(s.title))?.title ?? null
  const titles = { milestone: title(IS.milestone), next: title(IS.next), open: title(IS.open) }
  return { milestone, next: pick(IS.next), open: pick(IS.open), other, sections: titles }
}

/** LOG.md lines `- <date> · <what> · <reference>`, in file order; other lines are left to the archive. */
export function readLog(text) {
  return text.split('\n').flatMap(raw => {
    const m = raw.match(LOG_LINE)
    return m ? [{ at: m[1], what: m[2], ref: m[3] ?? null }] : []
  })
}

const TITLE_MAX = 70

const HEAD_MIN = 20

/**
 * A title from a sentence, without markdown emphasis: the whole first sentence when it fits; else what
 * comes before its colon, when that says enough on its own; else the sentence cut at a word.
 */
export function shortTitle(text) {
  const sentence = text.replace(/\*\*|__/g, '').trim().split(/\. /)[0].replace(/\.$/, '').trim()
  if (sentence.length <= TITLE_MAX) return sentence
  const head = sentence.split(/: | — /)[0]
  if (head.length >= HEAD_MIN && head.length <= TITLE_MAX) return head
  const cut = sentence.slice(0, TITLE_MAX - 1)
  return cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : cut.length).trimEnd() + '…'
}

/** A first guess the agent corrects: a choice to make, a standing rule, else a risk. */
export function classify(text) {
  if (/\?|\bdecid|\bdecis|da confermare|to confirm|\bconferm|\bchoose\b|scegli|user's ok|l'ok dell|ask the user|chiedere/i.test(text)) return 'decision'
  if (/^(never|always|mai|sempre|use|usa|run|lancia)\b/i.test(text)) return 'pointer'
  return 'risk'
}

/**
 * The operations that move STATE.md and LOG.md into the graph, and what the preview shows. Every node
 * enters `review: confirm`: the agent chose, the user confirms later (chat 2026-11-17). `state` and `log`
 * are null when the file is missing; `as` maps an open item's number to decision, risk, pointer or drop.
 */
export function propose({ state, log, nodes, at, as = {} }) {
  const day = at.slice(0, 10)
  const archive = [state && { from: 'STATE.md', to: `.ariadne/archive/STATE-${day}.md` }, log && { from: 'LOG.md', to: `.ariadne/archive/LOG-${day}.md` }].filter(Boolean)
  const proof = (file, section) => [{ type: 'file', ref: section ? `${file}#${section}` : file }]
  const stateFile = archive.find(a => a.from === 'STATE.md')?.to
  const taken = new Set(nodes.map(n => n.id))
  const free = prefix => { let k = 1; while (taken.has(`${prefix}${k}`)) k++; taken.add(`${prefix}${k}`); return `${prefix}${k}` }
  const ops = []
  const add = node => ops.push({ op: 'add', node: { review: 'confirm', ...node } })

  // The open milestone keeps the work; else the one STATE.md describes.
  const g = makeGraph(nodes)
  const open = nodes.find(n => n.kind === 'milestone' && (n.status === 'active' || n.status === 'todo'))
  let milestone
  if (open) milestone = { id: open.id, title: open.title, new: false }
  else {
    const text = state?.milestone ?? say('work')
    milestone = { id: free('m'), title: shortTitle(text), new: true }
    ops.push({ op: 'add', node: { id: milestone.id, kind: 'milestone', title: milestone.title, what: text, start: true, ...(stateFile ? { proof: proof(stateFile, state.sections.milestone) } : {}) } })
  }
  const ends = open ? g.childrenOf(open.id).filter(k => !g.childrenOf(open.id).some(o => (o.after ?? []).includes(k.id))) : []
  let previous = ends.at(-1)?.id

  let history = null
  if (log?.length) {
    const last = log.at(-1)
    history = { id: free(`${milestone.id}.`), title: say('history'), count: log.length }
    add({ id: history.id, kind: 'step', title: history.title, status: 'done', parent: milestone.id, what: say('historyWhat', log.length, log[0].at, last.at, last.what), proof: proof(archive.find(a => a.from === 'LOG.md').to), ...(previous ? { after: [previous] } : {}) })
    previous = history.id
  }

  const steps = (state?.next ?? []).map(text => {
    const step = { id: free(`${milestone.id}.`), title: shortTitle(text) }
    add({ id: step.id, kind: 'step', title: step.title, parent: milestone.id, what: text, proof: proof(stateFile, state.sections.next), ...(previous ? { after: [previous] } : {}) })
    previous = step.id
    return step
  })

  const openItems = (state?.open ?? []).map((text, i) => {
    const kind = as[i + 1] ?? classify(text)
    const item = { n: i + 1, text, as: kind }
    if (kind === 'decision' || kind === 'risk') {
      item.id = free(`${milestone.id}.`)
      add({ id: item.id, kind, title: shortTitle(text), parent: milestone.id, what: text, proof: proof(stateFile, state.sections.open) })
    }
    return item
  })

  // Standing knowledge goes to CLAUDE.md or docs/, not into the graph (m6.4): listed in full for the agent.
  const other = [
    ...(state?.other ?? []).flatMap(s => s.items.map(text => ({ from: s.title, text }))),
    ...openItems.filter(o => o.as === 'pointer').map(o => ({ from: `${state.sections.open} ${o.n}`, text: o.text })),
  ]
  return { milestone, history, steps, open: openItems, other, archive, ops }
}

/** What the agent moves into CLAUDE.md or docs/ by hand, in lines; none when there is nothing. */
export const elsewhere = ({ other }) => (other.length ? [say('other'), ...other.map(o => `- ${o.from}: ${o.text}`)] : [])

/** The preview of a proposal, in lines for the terminal. */
export function preview(plan) {
  const { milestone, history, steps, open, other, archive } = plan
  const lines = [say('head'), milestone.new ? say('newMilestone', milestone.id, milestone.title) : say('milestone', milestone.id, milestone.title)]
  if (history) lines.push(say('historyLine', history.count, history.id, history.title))
  if (steps.length) lines.push(say('next'), ...steps.map(s => `- ${s.id} ${s.title}`))
  if (open.length) lines.push(say('open'), ...open.map(o => `${o.n} [${say('as')[o.as]}] ${o.text}`))
  lines.push(...elsewhere(plan))
  if (archive.length) lines.push(say('archive'), ...archive.map(a => `${a.from} → ${a.to}`))
  lines.push(say('apply'))
  return lines.join('\n')
}
