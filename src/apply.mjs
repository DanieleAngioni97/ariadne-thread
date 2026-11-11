// The only way to change the graph: typed operations, applied all or nothing (R14).
// Rules: docs/implementazione.md § m3.6 and specifica.md § Operazioni. Pure: text in, text out.
// Untouched nodes keep their line byte for byte and new nodes go at the end, so diffs stay small (R19).

import { makeGraph } from './graph.mjs'
import { validate } from './validate.mjs'

const isStructural = n => n.kind === 'milestone' || n.kind === 'detour' || n.status === 'deferred' || n.status === 'replaced'
const KIND_LABEL = { milestone: 'milestone', step: 'passo', list: 'lista', point: 'punto', detour: 'deviazione' }
const DESCRIPTIVE = ['what', 'why', 'detail', 'title']

class Refusal extends Error {}
const refuse = message => { throw new Refusal(message) }

/**
 * Applies `ops` to the graph `text` and the `thread`, at time `at`, on behalf of `by` (agent or user).
 * Returns `{ ok: true, text, thread, log }` or `{ ok: false, errors }`; on refusal nothing changes.
 */
export function apply({ text, thread, ops, at, by = 'agent' }) {
  const lines = text.split('\n').filter(raw => raw.trim() !== '')
  const nodes = lines.map(raw => JSON.parse(raw))
  const touched = new Set()
  const state = { thread: { ...thread }, log: [] }

  const g = () => makeGraph(nodes)
  const get = id => nodes.find(n => n.id === id) ?? refuse(`nodo ${id} non trovato`)
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
    return fresh
  }

  function start(n) {
    const reopened = n.status === 'done'
    if (n.status !== 'active') { n.status = 'active'; touch(n) }
    state.thread.current = n.id
    log(n.id, 'start', `${reopened ? 'riaperto' : 'iniziato'} ${n.id} ${n.title}`)
  }

  function create(fields) {
    const n = { ...fields, id: fields.id ?? freeId(fields.parent, fields.kind) }
    if (nodes.some(x => x.id === n.id && x !== n)) refuse(`id ${n.id} già usato`)
    for (const k of Object.keys(n)) if (n[k] === undefined) delete n[k]
    nodes.push(n)
    touch(n)
    return n
  }

  const handlers = {
    none() {},

    plan({ parent, titles = [], ref }) {
      if (parent) get(parent)
      if (!ref) refuse('plan: serve il riferimento al piano approvato (ref)')
      let previous
      const made = titles.map(item => {
        const { title, what, id } = typeof item === 'string' ? { title: item } : item
        const n = create({ id, kind: 'step', title, status: 'todo', parent, after: previous ? [previous] : undefined, what: what ?? title, proof: [{ type: 'message', ref }], by: 'user', at })
        previous = n.id
        return n
      })
      log(parent ?? '', 'plan', `piano per ${parent ? get(parent).title : 'il progetto'}: ${made.map(n => n.title).join(' → ')}`)
    },

    start({ id }) { start(get(id)) },

    close({ id, what, proof = [] }) {
      const n = get(id)
      if (proof.length === 0) refuse(`close ${id}: R3, serve una prova (commit, file o messaggio)`)
      if (n.status === 'done') {
        const fresh = addProof(n, proof)
        if (fresh.length) { touch(n); log(id, 'fill', `prova per ${id}: ${fresh.map(p => `${p.type} ${p.ref}`).join(', ')}`, fresh) }
        return
      }
      n.status = 'done'
      if (what) n.what = what
      addProof(n, proof)
      touch(n)
      log(id, 'close', `chiuso ${id} ${n.title}: ${n.what}`, proof)
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
      const changed = DESCRIPTIVE.filter(k => fields[k] !== undefined && fields[k] !== n[k])
      if (changed.includes('what') && n.kind === 'milestone' && by !== 'user') refuse(`fill ${id}: il cosa di una milestone lo cambi tu`)
      for (const k of changed) n[k] = fields[k]
      const fresh = addProof(n, proof)
      if (changed.length === 0 && fresh.length === 0) return
      touch(n)
      const parts = [...changed, ...fresh.map(p => `${p.type} ${p.ref}`)]
      log(id, 'fill', changed.length ? `completato ${id}: ${parts.join(', ')}` : `prova per ${id}: ${parts.join(', ')}`, fresh)
    },

    add({ node }) {
      const here = state.thread.current && get(state.thread.current)
      const { start: startNow, ...fields } = node
      const detour = fields.kind === 'detour'
      const parent = 'parent' in fields ? fields.parent : fields.kind === 'milestone' ? undefined : detour ? here?.parent : here?.id
      const n = create({ status: startNow ? 'active' : 'todo', ...fields, parent, reentry: detour ? fields.reentry ?? here?.id : fields.reentry, proof: fields.proof ?? chatProof(), by, at })
      sign(n)
      const label = KIND_LABEL[n.kind] ?? n.kind
      const premises = n.after?.length ? `, da ${n.after.join(', ')}` : ''
      log(n.id, 'add', detour ? `deviazione ${n.id} ${n.title}, rientra in ${n.reentry}` : `aggiunto ${label} ${n.id} ${n.title}${n.parent ? ` sotto ${n.parent}` : ''}${premises}`)
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
      log(id, 'defer', `rinviato ${id} ${n.title} a ${target.title} (${resume.id})`)
    },

    replace({ id, by: successor }) {
      const n = get(id)
      get(successor)
      n.status = 'replaced'
      n.replaced_by = successor
      touch(n)
      sign(n)
      log(id, 'replace', `sostituito ${id} ${n.title} con ${successor}`)
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
      log(id, 'move', `spostato ${id} sotto ${parent} (correzione tua)`)
    },

    undo() {
      const c = state.thread.last_correction
      if (!c) refuse('Nessuna correzione da annullare.')
      if (c.stale) refuse(`Non posso annullarla: ${c.id} è cambiato dopo. Dimmi dove spostarlo.`)
      const n = get(c.id)
      if (c.parent === null) delete n.parent
      else n.parent = c.parent
      if (c.after === null) delete n.after
      else n.after = c.after
      delete state.thread.last_correction
      touched.add(n.id)
      log(c.id, 'undo', `annullato: ${c.id} torna sotto ${c.parent ?? 'la radice'}`)
    },

    confirm({ id, all }) {
      const queue = all ? nodes.filter(n => n.review === 'confirm') : [get(id)]
      for (const n of queue) {
        delete n.review
        n.confirmed = { at, ref: 'chat' }
        touch(n)
      }
      log(all ? '' : id, 'confirm', all ? `confermate ${queue.length} modifiche` : `confermato ${id} ${queue[0].title}`)
    },

    reject({ id, by: successor }) {
      const n = get(id)
      delete n.review
      n.status = 'replaced'
      n.replaced_by = successor ?? n.parent ?? refuse(`reject ${id}: dimmi quale nodo lo sostituisce`)
      n.confirmed = { at, ref: 'chat' }
      touch(n)
      log(id, 'reject', `rifiutato ${id} ${n.title}: resta tracciato fuori dal piano`)
    },
  }

  try {
    for (const { op, ...args } of ops) {
      const handler = Object.hasOwn(handlers, op) ? handlers[op] : refuse(`operazione sconosciuta: ${op}`)
      handler(args)
    }
  } catch (error) {
    if (error instanceof Refusal) return { ok: false, errors: [error.message] }
    throw error
  }

  const out = nodes.map((n, i) => (i < lines.length && !touched.has(n.id) ? lines[i] : JSON.stringify(n)))
  const newText = out.join('\n') + '\n'
  const errors = validate(newText)
  if (errors.length) return { ok: false, errors: errors.map(e => `riga ${e.line} ${e.id ?? ''} [${e.rule}] ${e.message}`) }
  return { ok: true, text: touched.size ? newText : text, thread: state.thread, log: state.log }
}
