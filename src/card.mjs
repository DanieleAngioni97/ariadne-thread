// The state card: what the agent gets at the start of a session instead of a hand-written STATE.md.
// Computed from the graph and git, without any model, so no one has to write a handoff. The view is the
// same card with every milestone in full, written to .ariadne/STATE.md for Read and grep.

import { makeGraph } from './graph.mjs'
import { showRef } from './refs.mjs'

export const CARD_LIMIT = 3500
const MAX_FILES = 4

/** The files of a node: its file proofs and the files its commits touched, outside .ariadne/. */
function filesOf(node, files) {
  const own = (node.proof ?? []).flatMap(p => (p.type === 'file' ? [showRef(p.ref)] : p.type === 'commit' ? files.get(p.ref) ?? [] : []))
  return [...new Set(own.filter(f => !f.startsWith('.ariadne/')))].sort().slice(0, MAX_FILES)
}

export function render(nodes, thread, files = new Map(), { full = false, brief = 0 } = {}) {
  const g = makeGraph(nodes)
  const current = g.get(thread.current)
  const milestoneOf = id => (g.get(id)?.kind === 'milestone' ? id : g.containers(id).find(c => g.get(c).kind === 'milestone'))
  const titled = id => `${id} ${g.get(id)?.title ?? '(non trovato)'}`
  const target = id => g.get(milestoneOf(id) ?? id)?.title ?? id

  const head = current
    ? [
        `Sei in: ${[...g.containers(current.id)].reverse().map(id => g.get(id).title).concat(current.title).join(' › ')} (${current.status})`,
        `Resta da fare: ${current.detail ?? current.what ?? '(non scritto)'}`,
      ]
    : [`Sei in: ${thread.current} (nodo non trovato nel grafo)`]
  const nextId = current && g.next(current.id)
  const open = nodes.filter(n => n.kind === 'detour' && (n.status === 'active' || n.status === 'todo') && n.reentry)
  head.push(`Prossimo: ${nextId ? titled(nextId) : 'nessuno nel piano'}`)
  head.push(open.length ? `Rientri in sospeso: ${open.map(n => `${n.title} → rientra in ${n.reentry}`).join(' · ')}` : 'Rientri in sospeso: nessuno')

  // brief 1: the other milestones lose their goal; brief 2: done steps keep only their title.
  const line = n => {
    const status = n.status === 'replaced' ? `replaced → ${titled(n.replaced_by)}` : n.status === 'deferred' ? `deferred → ${target(n.deferred_to)}` : n.status
    const bare = `- ${n.id} [${status}] ${n.title}`
    if (brief >= 2 && n.status === 'done' && n.id !== current?.id) return bare
    const what = n.what && n.what !== n.title ? `: ${n.what}` : ''
    const f = filesOf(n, files)
    return bare + what + (n.why ? ` · perché: ${n.why}` : '') + (f.length ? ` · file: ${f.join(', ')}` : '')
  }
  const milestones = nodes.filter(n => n.kind === 'milestone')
  const inside = m => nodes.filter(n => n.kind !== 'milestone' && milestoneOf(n.id) === m.id)
  // No one closes a milestone by hand: its steps tell its state.
  const state = m => {
    const steps = inside(m)
    if (steps.some(n => n.status === 'active')) return 'active'
    if (steps.length && steps.every(n => ['done', 'replaced', 'deferred'].includes(n.status))) return 'done'
    return m.status
  }
  const section = m => [`## ${m.title} (${state(m)})${m.what ? `: ${m.what}` : ''}`, ...inside(m).map(line)]
  const here = current && milestoneOf(current.id)
  const blocks = [head]
  if (full) {
    blocks.push(...milestones.map(section))
    const loose = nodes.filter(n => n.kind !== 'milestone' && !milestoneOf(n.id))
    if (loose.length) blocks.push(['## Fuori dalle milestone', ...loose.map(line)])
  } else {
    if (here) blocks.push(section(g.get(here)))
    const changed = nodes.filter(n => n.status === 'replaced' || n.status === 'deferred')
      .map(n => `- ${n.id} ${n.title} → ${n.status === 'replaced' ? `sostituito da ${titled(n.replaced_by)}` : `rinviato a ${target(n.deferred_to)}`}`)
    if (changed.length) blocks.push(['## Decisioni sostituite e rinvii', ...changed])
    const others = milestones.filter(m => m.id !== here).map(m => `- ${m.title} (${state(m)})${brief >= 1 || !m.what ? '' : `: ${m.what}`}`)
    if (others.length) blocks.push(['## Altre milestone', ...others])
    blocks.push(['Tutti i passi, una riga ciascuno: .ariadne/STATE.md'])
  }
  return [`# Stato del lavoro (${full ? 'vista generata da ariadne: non modificare a mano' : 'scheda generata da ariadne'})`, ...blocks.map(b => b.join('\n')).join('\n\n').split('\n')].join('\n')
}

/** The card for the start of a session, under CARD_LIMIT characters. */
export function card(nodes, thread, files) {
  let text = render(nodes, thread, files)
  for (let brief = 1; text.length > CARD_LIMIT && brief <= 2; brief++) text = render(nodes, thread, files, { brief })
  return text.length > CARD_LIMIT ? text.slice(0, CARD_LIMIT - 40).replace(/\n[^\n]*$/, '') + '\n… (tagliata: .ariadne/STATE.md)' : text
}

/** Every milestone in full: the file .ariadne/STATE.md. */
export const view = (nodes, thread, files) => render(nodes, thread, files, { full: true })
