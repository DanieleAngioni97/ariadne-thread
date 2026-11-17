// Validates an ariadne thread: one JSON node per line (.ariadne/graph.jsonl).
// Rules come from docs/ux/allineamento/brief.md (R2, R3, R5, R15, R16, R22) and concetti.md (schema).
// Pure, for the CLI (`ariadne validate`) and the viewer alike.

// decision: a choice the user makes, blocking what has it in `after`; risk: a warning on its parent.
const KINDS = ['milestone', 'step', 'list', 'point', 'detour', 'decision', 'risk']
const STATUSES = ['todo', 'active', 'done', 'deferred', 'replaced']
const PROOF_TYPES = ['commit', 'file', 'message']
const AUTHORS = ['agent', 'user']
const REFERENCES = ['parent', 'reentry', 'deferred_to', 'continues', 'replaced_by']
const DATE = /^\d{4}-\d{2}-\d{2}/
// A title is read in a graph box and in the card: a few words; the details go in what, shown on hover.
export const TITLE_LIMIT = 80

const isStructural = n => n.kind === 'milestone' || n.kind === 'detour' || n.status === 'deferred' || n.status === 'replaced'
const isOpen = n => n.status === 'active' || n.status === 'todo'

/** Returns `{ line, id, rule, message }` for every broken rule, in file order. */
export function validate(text) {
  const errors = []
  const nodes = []
  const lineOf = new Map()

  text.split('\n').forEach((raw, index) => {
    const line = index + 1
    if (raw.trim() === '') return
    let n
    try { n = JSON.parse(raw) } catch { n = null }
    if (n === null || typeof n !== 'object' || Array.isArray(n) || typeof n.id !== 'string') {
      errors.push({ line, id: null, rule: 'json', message: 'not a JSON object with a string id' })
      return
    }
    if (lineOf.has(n.id)) {
      errors.push({ line, id: n.id, rule: 'unique-id', message: `id already used on line ${lineOf.get(n.id)}` })
      return
    }
    lineOf.set(n.id, line)
    nodes.push(n)
  })

  const ids = new Set(nodes.map(n => n.id))
  const fail = (n, rule, message) => errors.push({ line: lineOf.get(n.id), id: n.id, rule, message })

  for (const n of nodes) {
    if (!KINDS.includes(n.kind)) fail(n, 'kind', `kind must be one of ${KINDS.join(', ')}`)
    if (!STATUSES.includes(n.status)) fail(n, 'status', `status must be one of ${STATUSES.join(', ')}`)
    if (typeof n.what !== 'string' || n.what.trim() === '') fail(n, 'what', 'R5: say the decision or result')
    if (typeof n.title === 'string' && n.title.length > TITLE_LIMIT) fail(n, 'title', `a few words, at most ${TITLE_LIMIT} characters: the details go in what`)
    if (!AUTHORS.includes(n.by)) fail(n, 'by', `R16: by must be one of ${AUTHORS.join(', ')}`)
    if (typeof n.at !== 'string' || !DATE.test(n.at)) fail(n, 'at', 'R16: at must be a date (YYYY-MM-DD…)')

    const proofs = Array.isArray(n.proof) ? n.proof : []
    const badProof = proofs.some(p => !PROOF_TYPES.includes(p?.type) || typeof p.ref !== 'string' || p.ref === '')
    if (badProof || (proofs.length === 0 && !n.uncertain)) fail(n, 'proof', 'R3: needs a commit, file or message, or `uncertain` with the reason')

    if (n.review !== undefined && n.review !== 'confirm') fail(n, 'review', 'review can only be confirm')
    const waiting = n.review === 'confirm'
    if (isStructural(n) && !waiting && !(n.confirmed && DATE.test(n.confirmed.at ?? ''))) fail(n, 'confirmed', 'R2: structural node without the user confirmation or review: confirm')
    if (n.kind === 'detour' && isOpen(n) && !n.reentry) fail(n, 'reentry', 'R22: an open detour declares where it re-enters')
    if (n.kind === 'decision' && n.status === 'active') fail(n, 'decision', 'a decision is the user\'s: it stays todo until they choose')
    if (n.kind === 'risk' && n.status === 'active') fail(n, 'risk', 'a risk is not work: todo while open, done when it is over')
    if (n.kind === 'risk' && !n.parent) fail(n, 'parent', 'a risk hangs on the node it threatens')
    if (n.status === 'replaced' && !n.replaced_by) fail(n, 'replaced_by', 'R15: a replaced node points to its successor')
    if (n.status === 'deferred' && !n.deferred_to) fail(n, 'deferred_to', 'a deferred node points to the task that resumes it')

    const targets = [...REFERENCES.map(f => n[f]).filter(Boolean), ...(n.after ?? [])]
    for (const target of targets) {
      if (!ids.has(target)) fail(n, 'reference', `unknown node ${target}`)
    }
  }

  const cycle = findCycle(nodes, ids)
  if (cycle) fail(nodes.find(n => n.id === cycle[0]), 'cycle', `parent/after cycle: ${cycle.join(' → ')}`)
  return errors
}

function findCycle(nodes, ids) {
  const edges = new Map(nodes.map(n => [n.id, [n.parent, ...(n.after ?? [])].filter(t => ids.has(t))]))
  const state = new Map()
  const path = []
  const visit = id => {
    if (state.get(id) === 'done') return null
    if (state.get(id) === 'visiting') return [...path.slice(path.indexOf(id)), id]
    state.set(id, 'visiting')
    path.push(id)
    for (const next of edges.get(id)) {
      const found = visit(next)
      if (found) return found
    }
    path.pop()
    state.set(id, 'done')
    return null
  }
  for (const n of nodes) {
    const found = visit(n.id)
    if (found) return found
  }
  return null
}
