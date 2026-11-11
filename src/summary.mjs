// R7: the summary the agent reads every turn, computed from the graph without any model.
// Format: docs/ux/allineamento/specifica.md § Riassunto per l'agente.

import { makeGraph } from './graph.mjs'

export const LIMIT = 300
const MAX_DEPENDENCIES = 3

/** Rough token count, the same estimate as the prototype: characters / 4. */
export const tokens = text => Math.ceil(text.length / 4)

export function summarize(nodes, thread) {
  const g = makeGraph(nodes)
  const current = g.get(thread.current)
  const where = current
    ? `Sei in: ${[...g.containers(current.id)].reverse().map(id => g.get(id).title).concat(current.title).join(' › ')} (${current.status})`
    : `Sei in: ${thread.current} (nodo non trovato nel grafo)`

  const behind = current
    ? g.dependencies(current.id).map(g.get).filter(n => n.status === 'done').slice(0, MAX_DEPENDENCIES)
      .map(n => `- ${n.id} ${n.title}: ${n.what}${n.uncertain ? ` (incerto: ${n.uncertain})` : ''}`)
    : []

  const open = nodes.filter(n => n.kind === 'detour' && (n.status === 'active' || n.status === 'todo') && n.reentry)
  const reentries = open.length
    ? ['Rientri in sospeso:', ...open.map(n => `- ${n.title} → rientra in ${n.reentry}`)]
    : ['Rientri in sospeso: nessuno']

  const confirm = nodes.filter(n => n.review === 'confirm').length
  const decide = nodes.filter(n => n.review === 'decide').length
  const review = confirm + decide > 0 ? [`Da rivedere al rientro: ${confirm} da confermare, ${decide} da decidere`] : []

  const nextId = current && g.next(current.id)
  const tail = [
    ...reentries,
    ...review,
    `Prossimo: ${nextId ? `${nextId} ${g.get(nextId).title}` : 'nessuno nel piano'}`,
    'Per approfondire: ariadne show <id> · ariadne why <id>',
  ]

  const placeholder = behind.length
    ? `- (${behind.length} tagliate per stare nel limite: ariadne why ${current.id})`
    : '- (inizio del ramo)'
  const render = deps => [where, 'Da dove viene (solo le dipendenze):', ...(deps.length ? deps : [placeholder]), ...tail].join('\n')
  // Over the limit, the farthest dependencies go first; the other lines always stay.
  let deps = behind
  while (deps.length > 0 && tokens(render(deps)) > LIMIT) deps = deps.slice(0, -1)
  return render(deps)
}
