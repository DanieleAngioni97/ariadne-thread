// R7: the summary the agent reads every turn, computed from the graph without any model.
// Format: docs/ux/allineamento/specifica.md § Riassunto per l'agente.

import { makeGraph } from './graph.mjs'

export const LIMIT = 300
const MAX_DEPENDENCIES = 3
const MAX_FILES = 3
const PATH = /[\w.-]+(?:\/[\w.-]+)*\.[a-z]{1,5}\b/g

/** The files to open now: proofs and paths in `detail`, of the current node first, then its containers. */
function usefulFiles(g, id) {
  const files = []
  for (const n of [id, ...g.containers(id)].map(g.get)) {
    const own = [...(n.proof ?? []).filter(p => p.type === 'file').map(p => p.ref), ...(n.detail?.match(PATH) ?? [])]
    for (const f of own) if (!files.includes(f)) files.push(f)
  }
  return files.slice(0, MAX_FILES)
}

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
  const review = confirm > 0 ? [`Da confermare: ${confirm} modifiche dell'agente (ariadne confirm --all)`] : []
  const files = current ? usefulFiles(g, current.id) : []

  const nextId = current && g.next(current.id)
  const tail = [
    ...reentries,
    ...review,
    `Prossimo: ${nextId ? `${nextId} ${g.get(nextId).title}` : 'nessuno nel piano'}`,
    ...(files.length ? [`File utili: ${files.join(' · ')}`] : []),
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
