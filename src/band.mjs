// The band above the prompt (specifica § Banda): at most four rows, computed from .ariadne/ alone.
// Rows: where (always) · context (detour, list or reentries in waiting) · queue (what waits on you) ·
// the last outcome or the first broken rule. Each action is a CLI call (`run`), a chat phrase (`say`),
// a node to show in the viewer (`open`) or the queue item to review (`review`).

import { makeGraph, parse } from './graph.mjs'
import { validate } from './validate.mjs'

const WIDTH = { current: 44, container: 24, next: 30, other: 38 }
const OPEN = ['todo', 'active']

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
    return row('context', `⤷ deviazione · rientro: ${cut(back, WIDTH.other)}`, [{ label: 'Chiudi e torna', say: 'torna' }])
  }
  const list = g.containers(current).map(g.get).find(n => n.kind === 'list')
  if (list) {
    const points = g.childrenOf(list.id)
    const decided = points.filter(p => p.status === 'done').length
    return row('context', `↩ ${cut(list.title, WIDTH.other)} (${decided}/${points.length} decisi)`, [{ label: 'Torna alla lista', say: 'torna' }])
  }
  const here = new Set([current, ...g.containers(current)])
  const waiting = nodes.filter(n => n.kind === 'detour' && OPEN.includes(n.status) && n.reentry && !here.has(n.id))
  if (waiting.length === 0) return null
  const [first] = waiting
  const back = g.get(first.reentry)?.title ?? first.reentry
  return row('context', `⤷ ${waiting.length} rientri in sospeso: ${cut(first.title, WIDTH.container)} → ${cut(back, WIDTH.container)}`)
}

/** What waits on you: first the count with «Approva tutto», then item `review` (0-based) of the queue. */
function queue(nodes, review) {
  const confirm = nodes.filter(n => n.review === 'confirm')
  const decide = nodes.filter(n => n.review === 'decide')
  if (confirm.length + decide.length === 0) return null
  const item = confirm[review ?? -1]
  if (item) {
    return row('queue', `⏎ Da confermare ${review + 1}/${confirm.length}: ${cut(`${item.id} ${item.title}`, WIDTH.other)}`, [
      { label: 'Approva', run: ['confirm', item.id] },
      { label: 'Rifiuta', run: ['reject', item.id] },
      { label: 'Mostra nel grafo', open: item.id },
    ])
  }
  const counts = [[confirm.length, 'da confermare'], [decide.length, 'da decidere']].filter(([k]) => k > 0).map(([k, w]) => `${k} ${w}`)
  return row('queue', `⏎ Mentre eri via: ${counts.join(', ')}`, [
    { label: 'Approva tutto', run: ['confirm', '--all'] },
    ...(confirm.length ? [{ label: 'Rivedi una per una', review: 0 }] : []),
  ])
}

function last(text, log) {
  const errors = validate(text)
  if (errors.length > 0) {
    const [e] = errors
    const more = errors.length > 1 ? ` (+${errors.length - 1})` : ''
    return row('error', `⚠ grafo non valido: riga ${e.line}${e.id ? ` ${e.id}` : ''} [${e.rule}] ${e.message}${more}`, e.id ? [{ label: 'Mostra nel grafo', open: e.id }] : [])
  }
  const latest = log.at(-1)
  return latest ? row('outcome', `↺ ${latest.text}`) : null
}

/**
 * The band's rows for graph `text` (null when there is no graph), `thread` ({ current }), the diary
 * entries in `log`, and `review`, the queue item being reviewed one at a time (null for the count).
 */
export function band({ text, thread, log = [], review = null }) {
  if (text == null) return [row('empty', "ariadne: nessun grafo in .ariadne/ · l'agente lo crea con il primo piano")]
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
      after: next ? ` · prossimo: ${cut(g.get(next).title, WIDTH.next)}` : '',
      actions: [{ label: 'Apri il grafo', run: ['open'] }],
    })
  }
  for (const r of [ctx, queue(nodes, review), last(text, log)]) if (r) rows.push(r)
  return rows
}
