// The only way to change the graph: typed operations, applied all or nothing (R14).
// Rules: docs/implementazione.md § m3.6 and specifica.md § Operazioni. Pure: text in, text out.
// Untouched nodes keep their line byte for byte and new nodes go at the end, so diffs stay small (R19).

import { makeGraph } from './graph.mjs'
import { words } from './i18n.mjs'
import { TITLE_LIMIT, validate } from './validate.mjs'

const isStructural = n => n.kind === 'milestone' || n.kind === 'detour' || n.status === 'deferred' || n.status === 'replaced'
const say = words({
  en: {
    kind: { milestone: 'milestone', step: 'step', list: 'list', point: 'point', detour: 'detour' },
    invalid: line => `invalid graph at line ${line}: fix it before changing it`,
    unknown: id => `node ${id} not found`,
    taken: id => `id ${id} already used`,
    noRef: 'plan: the reference to the approved plan is missing (ref)',
    noProof: id => `close ${id}: R3, a proof is needed (commit, file or message)`,
    milestoneWhat: id => `fill ${id}: a milestone's what is yours to change`,
    longTitle: k => `title too long (${k} characters, max ${TITLE_LIMIT}): a few words, the details go in --what`,
    noRelink: from => `relink: no proof points to ${from}`,
    nothingToUndo: 'No correction to undo.',
    staleUndo: id => `I can't undo it: ${id} changed afterwards. Tell me where to move it.`,
    rejectWhich: id => `reject ${id}: tell me which node replaces it`,
    unknownOp: op => `unknown operation: ${op}`,
    lineError: (line, id, rule, message) => `line ${line} ${id} [${rule}] ${message}`,
    started: (reopened, id, title) => `${reopened ? 'reopened' : 'started'} ${id} ${title}`,
    notStarted: (id, status) => `pause ${id}: the step is not started (it is ${status})`,
    paused: (id, title) => `back among the todo steps ${id} ${title}`,
    planned: (title, steps) => `plan for ${title ?? 'the project'}: ${steps}`,
    proofFor: (id, parts) => `proof for ${id}: ${parts}`,
    closed: (id, title, what) => `closed ${id} ${title}: ${what}`,
    filled: (id, parts) => `filled ${id}: ${parts}`,
    relinked: (from, to, ids) => `relinked ${from} → ${to} in ${ids.length} ${ids.length === 1 ? 'node' : 'nodes'} (${ids.join(', ')})`,
    detour: (id, title, reentry) => `detour ${id} ${title}, returns to ${reentry}`,
    added: (label, id, title, parent, after) => `added ${label} ${id} ${title}${parent ? ` under ${parent}` : ''}${after?.length ? `, from ${after.join(', ')}` : ''}`,
    deferred: (id, title, target, resume) => `deferred ${id} ${title} to ${target} (${resume})`,
    replaced: (id, title, successor) => `replaced ${id} ${title} with ${successor}`,
    moved: (id, parent) => `moved ${id} under ${parent} (your correction)`,
    undone: (id, parent) => `undone: ${id} goes back under ${parent ?? 'the root'}`,
    confirmedAll: n => `confirmed ${n} changes`,
    confirmed: (id, title) => `confirmed ${id} ${title}`,
    rejected: (id, title) => `rejected ${id} ${title}: kept on record, outside the plan`,
  },
  it: {
    kind: { milestone: 'milestone', step: 'passo', list: 'lista', point: 'punto', detour: 'deviazione' },
    invalid: line => `grafo non valido alla riga ${line}: correggilo prima di cambiarlo`,
    unknown: id => `nodo ${id} non trovato`,
    taken: id => `id ${id} già usato`,
    noRef: 'plan: serve il riferimento al piano approvato (ref)',
    noProof: id => `close ${id}: R3, serve una prova (commit, file o messaggio)`,
    milestoneWhat: id => `fill ${id}: il cosa di una milestone lo cambi tu`,
    longTitle: k => `titolo troppo lungo (${k} caratteri, massimo ${TITLE_LIMIT}): poche parole, i dettagli vanno in --what`,
    noRelink: from => `relink: nessuna prova punta a ${from}`,
    nothingToUndo: 'Nessuna correzione da annullare.',
    staleUndo: id => `Non posso annullarla: ${id} è cambiato dopo. Dimmi dove spostarlo.`,
    rejectWhich: id => `reject ${id}: dimmi quale nodo lo sostituisce`,
    unknownOp: op => `operazione sconosciuta: ${op}`,
    lineError: (line, id, rule, message) => `riga ${line} ${id} [${rule}] ${message}`,
    started: (reopened, id, title) => `${reopened ? 'riaperto' : 'iniziato'} ${id} ${title}`,
    notStarted: (id, status) => `pause ${id}: il passo non è avviato (è ${status})`,
    paused: (id, title) => `rimesso tra i da fare ${id} ${title}`,
    planned: (title, steps) => `piano per ${title ?? 'il progetto'}: ${steps}`,
    proofFor: (id, parts) => `prova per ${id}: ${parts}`,
    closed: (id, title, what) => `chiuso ${id} ${title}: ${what}`,
    filled: (id, parts) => `completato ${id}: ${parts}`,
    relinked: (from, to, ids) => `ricollegato ${from} → ${to} in ${ids.length} ${ids.length === 1 ? 'nodo' : 'nodi'} (${ids.join(', ')})`,
    detour: (id, title, reentry) => `deviazione ${id} ${title}, rientra in ${reentry}`,
    added: (label, id, title, parent, after) => `aggiunto ${label} ${id} ${title}${parent ? ` sotto ${parent}` : ''}${after?.length ? `, da ${after.join(', ')}` : ''}`,
    deferred: (id, title, target, resume) => `rinviato ${id} ${title} a ${target} (${resume})`,
    replaced: (id, title, successor) => `sostituito ${id} ${title} con ${successor}`,
    moved: (id, parent) => `spostato ${id} sotto ${parent} (correzione tua)`,
    undone: (id, parent) => `annullato: ${id} torna sotto ${parent ?? 'la radice'}`,
    confirmedAll: n => `confermate ${n} modifiche`,
    confirmed: (id, title) => `confermato ${id} ${title}`,
    rejected: (id, title) => `rifiutato ${id} ${title}: resta tracciato fuori dal piano`,
  },
})
const DESCRIPTIVE = ['what', 'why', 'detail', 'title']

class Refusal extends Error {}
const refuse = message => { throw new Refusal(message) }

/**
 * Applies `ops` to the graph `text` and the `thread`, at time `at`, on behalf of `by` (agent or user).
 * Returns `{ ok: true, text, thread, log }` or `{ ok: false, errors }`; on refusal nothing changes.
 */
export function apply({ text, thread, ops, at, by = 'agent' }) {
  const broken = validate(text).find(e => e.rule === 'json')
  if (broken) return { ok: false, errors: [say('invalid', broken.line)] }
  const lines = text.split('\n').filter(raw => raw.trim() !== '')
  const nodes = lines.map(raw => JSON.parse(raw))
  const touched = new Set()
  const state = { thread: { ...thread }, log: [] }

  const g = () => makeGraph(nodes)
  const get = id => nodes.find(n => n.id === id) ?? refuse(say('unknown', id))
  const touch = n => { touched.add(n.id); if (state.thread.last_correction?.id === n.id && !state.moving) state.thread.last_correction.stale = true }
  const log = (id, op, text, proof) => state.log.push({ at, id, op, text, ...(proof?.length ? { proof } : {}) })
  const sign = n => { if (by === 'user') { delete n.review; if (isStructural(n)) n.confirmed = { at, ref: 'chat' } } else if (isStructural(n) && !n.confirmed) n.review = 'confirm' }
  const chatProof = () => [{ type: 'message', ref: `chat ${at.slice(0, 10)}` }]

  function freeId(parent, kind) {
    const prefix = parent ? `${parent}.` : kind === 'milestone' ? 'm' : 'n.'
    for (let k = 1; ; k++) if (!nodes.some(n => n.id === `${prefix}${k}`)) return `${prefix}${k}`
  }

  function addProof(n, proof = []) {
    const known = new Set((n.proof ?? []).map(p => `${p.type}:${p.ref}`))
    const fresh = proof.filter(p => !known.has(`${p.type}:${p.ref}`))
    if (fresh.length) n.proof = [...(n.proof ?? []), ...fresh]
    // A commit or a file is the evidence an uncertain node was missing; a chat message is not.
    if (n.uncertain && fresh.some(p => p.type !== 'message')) delete n.uncertain
    return fresh
  }

  function start(n) {
    const reopened = n.status === 'done'
    if (n.status !== 'active') { n.status = 'active'; touch(n) }
    state.thread.current = n.id
    log(n.id, 'start', say('started', reopened, n.id, n.title))
  }

  const shortTitle = title => {
    if (typeof title === 'string' && title.length > TITLE_LIMIT) refuse(say('longTitle', title.length))
  }

  function create(fields) {
    shortTitle(fields.title)
    const n = { ...fields, id: fields.id ?? freeId(fields.parent, fields.kind) }
    if (nodes.some(x => x.id === n.id && x !== n)) refuse(say('taken', n.id))
    for (const k of Object.keys(n)) if (n[k] === undefined) delete n[k]
    nodes.push(n)
    touch(n)
    return n
  }

  const handlers = {
    none() {},

    plan({ parent, titles = [], ref }) {
      if (parent) get(parent)
      if (!ref) refuse(say('noRef'))
      let previous
      const made = titles.map(item => {
        const { title, what, id } = typeof item === 'string' ? { title: item } : item
        const n = create({ id, kind: 'step', title, status: 'todo', parent, after: previous ? [previous] : undefined, what: what ?? title, proof: [{ type: 'message', ref }], by: 'user', at })
        previous = n.id
        return n
      })
      log(parent ?? '', 'plan', say('planned', parent ? get(parent).title : undefined, made.map(n => n.title).join(' → ')))
      // Planned under where you are, the work goes on with the plan's first step.
      if (made.length && parent === state.thread.current) start(made[0])
    },

    start({ id }) { start(get(id)) },

    // A step started too early, as a plan's first step is: back to todo, and the thread on its container.
    pause({ id }) {
      const n = get(id)
      if (n.status !== 'active') refuse(say('notStarted', id, n.status))
      n.status = 'todo'
      touch(n)
      if (state.thread.current === id) state.thread.current = n.parent
      log(id, 'pause', say('paused', id, n.title))
    },

    close({ id, what, proof = [] }) {
      const n = get(id)
      if (proof.length === 0) refuse(say('noProof', id))
      if (n.status === 'done') {
        const fresh = addProof(n, proof)
        if (fresh.length) { touch(n); log(id, 'fill', say('proofFor', id, fresh.map(p => `${p.type} ${p.ref}`).join(', ')), fresh) }
        return
      }
      n.status = 'done'
      if (what) n.what = what
      addProof(n, proof)
      touch(n)
      log(id, 'close', say('closed', id, n.title, n.what), proof)
      if (state.thread.current !== id) return
      if (n.kind === 'detour' && n.reentry) {
        const back = get(n.reentry)
        if (back.status === 'todo') start(back)
        else state.thread.current = back.id
        return
      }
      // The next step of the same level; a finished level goes back to its container, which you close.
      const following = g().next(id)
      if (following && get(following).parent === n.parent) start(get(following))
      else if (n.parent) state.thread.current = n.parent
      else if (following) start(get(following))
    },

    fill({ id, proof, ...fields }) {
      const n = get(id)
      shortTitle(fields.title)
      const changed = DESCRIPTIVE.filter(k => fields[k] !== undefined && fields[k] !== n[k])
      if (changed.includes('what') && n.kind === 'milestone' && by !== 'user') refuse(say('milestoneWhat', id))
      for (const k of changed) n[k] = fields[k]
      const fresh = addProof(n, proof)
      if (changed.length === 0 && fresh.length === 0) return
      touch(n)
      const parts = [...changed, ...fresh.map(p => `${p.type} ${p.ref}`)]
      log(id, 'fill', say(changed.length ? 'filled' : 'proofFor', id, parts.join(', ')), fresh)
    },

    // A file or folder moved: its file proofs follow it, sections kept, so refs say where memory is now.
    relink({ from, to }) {
      const moved = ref => ref === from || ref.startsWith(`${from}/`) || ref.startsWith(`${from}#`)
      const relinked = nodes.filter(n => (n.proof ?? []).some(p => p.type === 'file' && moved(p.ref)))
      if (relinked.length === 0) refuse(say('noRelink', from))
      for (const n of relinked) {
        n.proof = n.proof.map(p => (p.type === 'file' && moved(p.ref) ? { ...p, ref: to + p.ref.slice(from.length) } : p))
        touch(n)
      }
      log(null, 'relink', say('relinked', from, to, relinked.map(n => n.id)))
    },

    add({ node }) {
      const here = state.thread.current && get(state.thread.current)
      const { start: startNow, ...fields } = node
      const detour = fields.kind === 'detour'
      const parent = 'parent' in fields ? fields.parent : fields.kind === 'milestone' ? undefined : detour ? here?.parent : here?.id
      const n = create({ status: startNow ? 'active' : 'todo', ...fields, parent, reentry: detour ? fields.reentry ?? here?.id : fields.reentry, proof: fields.proof ?? chatProof(), by, at })
      sign(n)
      const label = say('kind')[n.kind] ?? n.kind
      log(n.id, 'add', detour ? say('detour', n.id, n.title, n.reentry) : say('added', label, n.id, n.title, n.parent, n.after))
      if (startNow) state.thread.current = n.id
    },

    defer({ id, to }) {
      const n = get(id)
      const target = get(to)
      const resume = create({ kind: n.kind, title: n.title, status: 'todo', parent: to, what: n.what, continues: id, proof: chatProof(), by, at })
      n.status = 'deferred'
      n.deferred_to = resume.id
      touch(n)
      sign(n)
      log(id, 'defer', say('deferred', id, n.title, target.title, resume.id))
    },

    replace({ id, by: successor }) {
      const n = get(id)
      get(successor)
      n.status = 'replaced'
      n.replaced_by = successor
      touch(n)
      sign(n)
      log(id, 'replace', say('replaced', id, n.title, successor))
    },

    move({ id, parent, after }) {
      const n = get(id)
      if (parent) get(parent)
      state.thread.last_correction = { id, parent: n.parent ?? null, after: n.after ?? null }
      state.moving = true
      if (parent !== n.parent) delete n.after
      n.parent = parent
      if (after) n.after = after
      touch(n)
      state.moving = false
      log(id, 'move', say('moved', id, parent))
    },

    undo() {
      const c = state.thread.last_correction
      if (!c) refuse(say('nothingToUndo'))
      if (c.stale) refuse(say('staleUndo', c.id))
      const n = get(c.id)
      if (c.parent === null) delete n.parent
      else n.parent = c.parent
      if (c.after === null) delete n.after
      else n.after = c.after
      delete state.thread.last_correction
      touched.add(n.id)
      log(c.id, 'undo', say('undone', c.id, c.parent))
    },

    confirm({ id, all }) {
      const queue = all ? nodes.filter(n => n.review === 'confirm') : [get(id)]
      for (const n of queue) {
        delete n.review
        n.confirmed = { at, ref: 'chat' }
        touch(n)
      }
      log(all ? '' : id, 'confirm', all ? say('confirmedAll', queue.length) : say('confirmed', id, queue[0].title))
    },

    reject({ id, by: successor }) {
      const n = get(id)
      delete n.review
      n.status = 'replaced'
      n.replaced_by = successor ?? n.parent ?? refuse(say('rejectWhich', id))
      n.confirmed = { at, ref: 'chat' }
      touch(n)
      log(id, 'reject', say('rejected', id, n.title))
    },
  }

  try {
    for (const { op, ...args } of ops) {
      const handler = Object.hasOwn(handlers, op) ? handlers[op] : refuse(say('unknownOp', op))
      handler(args)
    }
  } catch (error) {
    if (error instanceof Refusal) return { ok: false, errors: [error.message] }
    throw error
  }

  const out = nodes.map((n, i) => (i < lines.length && !touched.has(n.id) ? lines[i] : JSON.stringify(n)))
  const newText = out.join('\n') + '\n'
  const errors = validate(newText)
  if (errors.length) return { ok: false, errors: errors.map(e => say('lineError', e.line, e.id ?? '', e.rule, e.message)) }
  return { ok: true, text: touched.size ? newText : text, thread: state.thread, log: state.log }
}
