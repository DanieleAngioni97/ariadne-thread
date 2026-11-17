// R7: the summary the agent reads every turn, computed from the graph without any model.
// Format: docs/ux/allineamento/specifica.md § Riassunto per l'agente.

import { makeGraph } from './graph.mjs'
import { words } from './i18n.mjs'
import { showRef } from './refs.mjs'

const say = words({
  en: {
    where: (path, status) => `You are in: ${path} (${status})`, lost: id => `You are in: ${id} (node not found in the graph)`,
    idle: 'You are in: no step started (ariadne start <id>)',
    uncertain: 'uncertain', waiting: 'Returns waiting:', back: 'returns to', noWaiting: 'Returns waiting: none',
    next: 'Next', none: 'none in the plan', files: 'Useful files', more: 'To dig deeper: ariadne show <id> · ariadne why <id>',
    cut: (k, id) => `- (${k} cut to stay within the limit: ariadne why ${id})`, start: '- (start of the branch)',
    from: 'Comes from (dependencies only):',
    comments: list => `Comments to read: ${list} · answer: ariadne answer <id> "…"`,
  },
  it: {
    where: (path, status) => `Sei in: ${path} (${status})`, lost: id => `Sei in: ${id} (nodo non trovato nel grafo)`,
    idle: 'Sei in: nessun passo avviato (ariadne start <id>)',
    uncertain: 'incerto', waiting: 'Rientri in sospeso:', back: 'rientra in', noWaiting: 'Rientri in sospeso: nessuno',
    next: 'Prossimo', none: 'nessuno nel piano', files: 'File utili', more: 'Per approfondire: ariadne show <id> · ariadne why <id>',
    cut: (k, id) => `- (${k} tagliate per stare nel limite: ariadne why ${id})`, start: '- (inizio del ramo)',
    from: 'Da dove viene (solo le dipendenze):',
    comments: list => `Commenti da leggere: ${list} · rispondi: ariadne answer <id> "…"`,
  },
})

export const LIMIT = 300
const MAX_DEPENDENCIES = 3
const MAX_FILES = 3
const PATH = /[\w.-]+(?:\/[\w.-]+)*\.[a-z]{1,5}\b/g

/** The files to open now: proofs and paths in `detail`, of the current node first, then its containers. */
function usefulFiles(g, id) {
  const files = []
  for (const n of [id, ...g.containers(id)].map(g.get)) {
    const own = [...(n.proof ?? []).filter(p => p.type === 'file').map(p => showRef(p.ref)), ...(n.detail?.match(PATH) ?? [])]
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
    ? say('where', [...g.containers(current.id)].reverse().map(id => g.get(id).title).concat(current.title).join(' › '), current.status)
    : thread.current ? say('lost', thread.current) : say('idle')

  const behind = current
    ? g.dependencies(current.id).map(g.get).filter(n => n.status === 'done').slice(0, MAX_DEPENDENCIES)
      .map(n => `- ${n.id} ${n.title}: ${n.what}${n.uncertain ? ` (${say('uncertain')}: ${n.uncertain})` : ''}`)
    : []

  const detours = nodes.filter(n => n.kind === 'detour' && (n.status === 'active' || n.status === 'todo') && n.reentry)
  const reentries = detours.length
    ? [say('waiting'), ...detours.map(n => `- ${n.title} → ${say('back')} ${n.reentry}`)]
    : [say('noWaiting')]

  const files = current ? usefulFiles(g, current.id) : []

  const nextId = current ? g.next(current.id) : thread.current ? null : g.first()
  const tail = [
    ...reentries,
    `${say('next')}: ${nextId ? `${nextId} ${g.get(nextId).title}` : say('none')}`,
    ...(files.length ? [`${say('files')}: ${files.join(' · ')}`] : []),
    say('more'),
  ]

  const placeholder = behind.length
    ? say('cut', behind.length, current.id)
    : say('start')
  // Your comments from the viewer, until the agent answers them (m6.19): read on the next prompt.
  const open = nodes.flatMap(n => (n.comments ?? []).filter(c => !c.answer).map(c => `${n.id} «${c.text.length > 60 ? c.text.slice(0, 59) + '…' : c.text}»`))
  const comments = open.length ? [say('comments', open.slice(0, 3).join(', '))] : []
  const render = deps => [where, ...comments, say('from'), ...(deps.length ? deps : [placeholder]), ...tail].join('\n')
  // Over the limit, the farthest dependencies go first; the other lines always stay.
  let deps = behind
  while (deps.length > 0 && tokens(render(deps)) > LIMIT) deps = deps.slice(0, -1)
  return render(deps)
}
