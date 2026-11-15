// `ariadne show <id>` and `ariadne why <id>`: one node in full, and how it came about.
// Rows: the detail panel of docs/ux/allineamento/specifica.md § Viewer, plus the `detail` pointer.

import { makeGraph } from './graph.mjs'
import { words } from './i18n.mjs'

const MAX_WHY = 10

const say = words({
  en: {
    rows: ['What', 'Why', 'Detail', 'Status', 'Proof', 'Uncertain', 'Decided by', 'Confirmed', 'To confirm', 'Returns to', 'Deferred to', 'Resumes', 'Replaced by'],
    you: 'you', agent: 'agent',
    confirmedOn: (at, ref) => `by you on ${at} (${ref})`,
    unconfirmed: id => `decided by the agent without your confirmation (ariadne confirm ${id})`,
    because: 'why', from: 'Comes from:', start: '- (start of the branch)', context: 'context',
  },
  it: {
    rows: ['Cosa', 'Perché', 'Dettaglio', 'Stato', 'Prova', 'Incerto', 'Deciso da', 'Confermato', 'Da confermare', 'Rientra in', 'Rimandato a', 'Riprende', 'Sostituito da'],
    you: 'da te', agent: 'agente',
    confirmedOn: (at, ref) => `da te il ${at} (${ref})`,
    unconfirmed: id => `deciso dall'agente senza la tua conferma (ariadne confirm ${id})`,
    because: 'perché', from: 'Viene da:', start: '- (inizio del ramo)', context: 'contesto',
  },
})

const author = by => say(by === 'user' ? 'you' : 'agent')

export function show(nodes, id) {
  const n = makeGraph(nodes).get(id)
  if (!n) return null
  const proofs = (n.proof ?? []).map(p => `${p.type}: ${p.ref}`).join(' · ')
  const values = [
    n.what, n.why, n.detail, n.status, proofs || '—', n.uncertain, `${author(n.by)}, ${n.at}`,
    n.confirmed && say('confirmedOn', n.confirmed.at, n.confirmed.ref),
    n.review === 'confirm' && say('unconfirmed', n.id),
    n.reentry, n.deferred_to, n.continues, n.replaced_by,
  ]
  const rows = say('rows').map((label, i) => [label, values[i]])
  return [`${n.id} — ${n.title}`, ...rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`)].join('\n')
}

const line = n => `${n.id} ${n.title}: ${n.what}${n.why ? ` — ${say('because')}: ${n.why}` : ''}`

export function why(nodes, id) {
  const g = makeGraph(nodes)
  const n = g.get(id)
  if (!n) return null
  // A point (a clue, a deduction) comes from its premises; the wider context is one command away.
  const premises = n.kind === 'point' ? g.dependencies(id, { own: true }) : []
  const deps = (premises.length ? premises : g.dependencies(id)).map(g.get)
  const shown = deps.slice(0, MAX_WHY)
  const out = [line(n), say('from'), ...shown.map(d => `- ${line(d)}${d.status === 'done' ? '' : ` [${d.status}]`}`)]
  if (shown.length === 0) out.push(say('start'))
  if (deps.length > shown.length) out.push(`(+${deps.length - shown.length}: ariadne why ${shown.at(-1).id})`)
  if (premises.length && n.parent) out.push(`(${say('context')}: ariadne why ${n.parent})`)
  return out.join('\n')
}
