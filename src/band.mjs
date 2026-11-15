// The band above the prompt (specifica § Banda): at most four rows, computed from .ariadne/ alone.
// Rows: where (always) · context (detour, list or reentries in waiting) · queue (what waits on you) ·
// the last outcome or the first broken rule. Each action is a CLI call (`run`), a chat phrase (`say`),
// a node to show in the viewer (`open`) or the queue item to review (`review`).

import { makeGraph, parse } from './graph.mjs'
import { words } from './i18n.mjs'
import { validate } from './validate.mjs'

const WIDTH = { current: 44, container: 24, next: 30, other: 38 }
const OPEN = ['todo', 'active']

const say = words({
  en: {
    detour: back => `⤷ detour · back to: ${back}`, closeAndBack: 'Close and go back', back: 'go back',
    list: (title, decided, all) => `↩ ${title} (${decided}/${all} decided)`, toList: 'Back to the list',
    waiting: (k, first, back) => `⤷ ${k} returns waiting: ${first} → ${back}`,
    reviewing: (i, k, item) => `⏎ To confirm ${i}/${k}: ${item}`,
    approve: 'Approve', reject: 'Reject', show: 'Show in graph',
    toConfirm: 'to confirm', toDecide: 'to decide', away: counts => `⏎ While you were away: ${counts}`,
    approveAll: 'Approve all', oneByOne: 'Review one by one',
    invalid: (line, id, rule, message, more) => `⚠ invalid graph: line ${line}${id ? ` ${id}` : ''} [${rule}] ${message}${more}`,
    empty: 'ariadne: no graph in .ariadne/ yet · the agent starts it with the first plan',
    next: title => ` · next: ${title}`, open: 'Open the graph',
  },
  it: {
    detour: back => `⤷ deviazione · rientro: ${back}`, closeAndBack: 'Chiudi e torna', back: 'torna',
    list: (title, decided, all) => `↩ ${title} (${decided}/${all} decisi)`, toList: 'Torna alla lista',
    waiting: (k, first, back) => `⤷ ${k} rientri in sospeso: ${first} → ${back}`,
    reviewing: (i, k, item) => `⏎ Da confermare ${i}/${k}: ${item}`,
    approve: 'Approva', reject: 'Rifiuta', show: 'Mostra nel grafo',
    toConfirm: 'da confermare', toDecide: 'da decidere', away: counts => `⏎ Mentre eri via: ${counts}`,
    approveAll: 'Approva tutto', oneByOne: 'Rivedi una per una',
    invalid: (line, id, rule, message, more) => `⚠ grafo non valido: riga ${line}${id ? ` ${id}` : ''} [${rule}] ${message}${more}`,
    empty: "ariadne: nessun grafo in .ariadne/ · l'agente lo crea con il primo piano",
    next: title => ` · prossimo: ${title}`, open: 'Apri il grafo',
  },
})

/** `text` cut to `max` characters, the last one an ellipsis when cut. */
export const cut = (text, max) => (text.length <= max ? text : `${text.slice(0, max - 1)}…`)

const row = (kind, text, actions = []) => ({ kind, text, actions })

/** The nearest of `id` and its containers that is `kind` and still open. */
function nearest(g, id, kind) {
  return [id, ...g.containers(id)].map(g.get).find(n => n?.kind === kind && OPEN.includes(n.status)) ?? null
}

function context(g, nodes, current) {
  const detour = nearest(g, current, 'detour')
  if (detour?.reentry) {
    const back = g.get(detour.reentry)?.title ?? detour.reentry
    return row('context', say('detour', cut(back, WIDTH.other)), [{ label: say('closeAndBack'), say: say('back') }])
  }
  const list = g.containers(current).map(g.get).find(n => n.kind === 'list')
  if (list) {
    const points = g.childrenOf(list.id)
    const decided = points.filter(p => p.status === 'done').length
    return row('context', say('list', cut(list.title, WIDTH.other), decided, points.length), [{ label: say('toList'), say: say('back') }])
  }
  const here = new Set([current, ...g.containers(current)])
  const waiting = nodes.filter(n => n.kind === 'detour' && OPEN.includes(n.status) && n.reentry && !here.has(n.id))
  if (waiting.length === 0) return null
  const [first] = waiting
  const back = g.get(first.reentry)?.title ?? first.reentry
  return row('context', say('waiting', waiting.length, cut(first.title, WIDTH.container), cut(back, WIDTH.container)))
}

/** What waits on you: first the count with «Approve all», then item `review` (0-based) of the queue. */
function queue(nodes, review) {
  const confirm = nodes.filter(n => n.review === 'confirm')
  const decide = nodes.filter(n => n.review === 'decide')
  if (confirm.length + decide.length === 0) return null
  const item = confirm[review ?? -1]
  if (item) {
    return row('queue', say('reviewing', review + 1, confirm.length, cut(`${item.id} ${item.title}`, WIDTH.other)), [
      { label: say('approve'), run: ['confirm', item.id] },
      { label: say('reject'), run: ['reject', item.id] },
      { label: say('show'), open: item.id },
    ])
  }
  const counts = [[confirm.length, say('toConfirm')], [decide.length, say('toDecide')]].filter(([k]) => k > 0).map(([k, w]) => `${k} ${w}`)
  return row('queue', say('away', counts.join(', ')), [
    { label: say('approveAll'), run: ['confirm', '--all'] },
    ...(confirm.length ? [{ label: say('oneByOne'), review: 0 }] : []),
  ])
}

function last(text, log) {
  const errors = validate(text)
  if (errors.length > 0) {
    const [e] = errors
    const more = errors.length > 1 ? ` (+${errors.length - 1})` : ''
    return row('error', say('invalid', e.line, e.id, e.rule, e.message, more), e.id ? [{ label: say('show'), open: e.id }] : [])
  }
  const latest = log.at(-1)
  return latest ? row('outcome', `↺ ${latest.text}`) : null
}

/**
 * The band's rows for graph `text` (null when there is no graph), `thread` ({ current }), the diary
 * entries in `log`, and `review`, the queue item being reviewed one at a time (null for the count).
 */
export function band({ text, thread, log = [], review = null }) {
  if (text == null) return [row('empty', say('empty'))]
  const nodes = parse(text)
  const g = makeGraph(nodes)
  const current = g.get(thread?.current) ?? nodes.find(n => n.status === 'active' && n.kind !== 'milestone')
  const rows = []
  const ctx = current ? context(g, nodes, current.id) : null
  if (current) {
    const path = g.containers(current.id).map(g.get).filter(n => n.kind !== 'list').reverse()
    const next = ctx ? null : g.next(current.id)
    rows.push({
      kind: 'where',
      before: path.map(n => `${cut(n.title, WIDTH.container)} › `).join(''),
      current: cut(current.title, WIDTH.current),
      after: next ? say('next', cut(g.get(next).title, WIDTH.next)) : '',
      actions: [{ label: say('open'), run: ['open'] }],
    })
  }
  for (const r of [ctx, queue(nodes, review), last(text, log)]) if (r) rows.push(r)
  return rows
}
