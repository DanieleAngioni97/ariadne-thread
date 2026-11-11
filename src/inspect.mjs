// `ariadne show <id>` and `ariadne why <id>`: one node in full, and how it came about.
// Rows: the detail panel of docs/ux/allineamento/specifica.md § Viewer, plus the `detail` pointer.

import { makeGraph } from './graph.mjs'

const MAX_WHY = 10

const author = by => (by === 'user' ? 'da te' : 'agente')

export function show(nodes, id) {
  const n = makeGraph(nodes).get(id)
  if (!n) return null
  const proofs = (n.proof ?? []).map(p => `${p.type}: ${p.ref}`).join(' · ')
  const rows = [
    ['Cosa', n.what],
    ['Perché', n.why],
    ['Dettaglio', n.detail],
    ['Stato', n.status],
    ['Prova', proofs || '—'],
    ['Incerto', n.uncertain],
    ['Deciso da', `${author(n.by)}, ${n.at}`],
    ['Confermato', n.confirmed && `da te il ${n.confirmed.at} (${n.confirmed.ref})`],
    ['Da confermare', n.review === 'confirm' && "fatto dall'agente in tua assenza, dentro il mandato"],
    ['Da decidere', n.review === 'decide' && `fuori dal mandato; scelta prudente: ${n.prudent}`],
    ['Mandato', n.mandate && `${n.mandate.allow.join(', ')} (dal ${n.mandate.at})`],
    ['Rientra in', n.reentry],
    ['Rimandato a', n.deferred_to],
    ['Riprende', n.continues],
    ['Sostituito da', n.replaced_by],
  ]
  return [`${n.id} — ${n.title}`, ...rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`)].join('\n')
}

const line = n => `${n.id} ${n.title}: ${n.what}${n.why ? ` — perché: ${n.why}` : ''}`

export function why(nodes, id) {
  const g = makeGraph(nodes)
  const n = g.get(id)
  if (!n) return null
  const deps = g.dependencies(id).map(g.get)
  const shown = deps.slice(0, MAX_WHY)
  const out = [line(n), 'Viene da:', ...shown.map(d => `- ${line(d)}${d.status === 'done' ? '' : ` [${d.status}]`}`)]
  if (shown.length === 0) out.push('- (inizio del ramo)')
  if (deps.length > shown.length) out.push(`(+${deps.length - shown.length}: ariadne why ${shown.at(-1).id})`)
  return out.join('\n')
}
