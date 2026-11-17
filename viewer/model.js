// Pure graph logic for the viewer spike: which nodes show, which edges join them, where the thread runs.

const byId = data => new Map(data.nodes.map(n => [n.id, n]))

const childrenOf = (data, id) => data.nodes.filter(n => (n.parent ?? null) === id)

/** The containers of `id`, innermost first. */
function containers(nodes, id) {
  const out = []
  let at = nodes.get(id)?.parent
  while (at && nodes.has(at)) {
    out.push(at)
    at = nodes.get(at).parent
  }
  return out
}

/**
 * How you got here: the current node, the nodes that contain it, every node any of them comes after,
 * and, inside each of those, the finished steps that are not detours.
 */
export function threadSet(data) {
  const nodes = byId(data)
  const seen = new Set()
  const walk = id => {
    if (seen.has(id) || !nodes.has(id)) return
    seen.add(id)
    for (const before of nodes.get(id).after ?? []) walk(before)
    for (const child of childrenOf(data, id)) {
      if (child.status === 'done' && child.kind !== 'detour') walk(child.id)
    }
  }
  if (data.current) [data.current, ...containers(nodes, data.current)].forEach(walk)
  return seen
}

/** Opening the containers of the current node, outermost first, shows where you are. */
export function defaultExpanded(data) {
  return new Set(containers(byId(data), data.current).reverse())
}

export function hasChildren(data, id) {
  return data.nodes.some(n => n.parent === id)
}

/** Whether `id` holds the current node somewhere inside it. */
export function holdsCurrent(data, id) {
  return containers(byId(data), data.current).includes(id)
}

const LIMITS = { essenziale: 2, standard: 3, esteso: 5 }

/** How many children of a level show at once for a profile (R4); standard when unknown. */
export const limitOf = profile => LIMITS[profile] ?? LIMITS.standard

/**
 * Where a level's window must sit: the current node, what holds it, or where the current detour
 * returns (specifica § Viewer, Raggruppamento); else the first open step; else the last one.
 */
function anchorOf(data, live) {
  const nodes = byId(data)
  const here = new Set([data.current, ...containers(nodes, data.current)])
  const returns = new Set()
  for (const at of here) {
    const node = nodes.get(at)
    if (node?.kind === 'detour' && node.reentry) [node.reentry, ...containers(nodes, node.reentry)].forEach(a => returns.add(a))
  }
  // The current node wins over where its detour returns: you must always see where you are.
  const found = [
    live.findIndex(n => here.has(n.id)),
    live.findIndex(n => returns.has(n.id)),
    live.findIndex(n => n.status === 'todo' || n.status === 'active'),
  ]
  return found.find(i => i >= 0) ?? live.length - 1
}

/**
 * The children of `level` that show, at most `limit` in a window around the anchor, and what hides:
 * `above` and `below` the window, `replaced` (hidden until asked, R15, then in `tail` at the end). `revealed` holds the levels
 * opened in full (their id, '' for the top) and those showing their replaced steps (`replaced:<id>`).
 */
/**
 * Siblings in the order of the plan: each one after the siblings it comes `after`, file order between
 * the rest. `move` changes `after` but not the file, so the file alone would mix far-apart steps.
 */
function planOrder(kids) {
  const ids = new Set(kids.map(n => n.id))
  const placed = new Set()
  const out = []
  while (out.length < kids.length) {
    const left = kids.filter(n => !placed.has(n.id))
    const next = left.find(n => (n.after ?? []).every(a => !ids.has(a) || placed.has(a))) ?? left[0]
    placed.add(next.id)
    out.push(next)
  }
  return out
}

function levelWindow(data, level, { limit = Infinity, revealed = new Set() } = {}) {
  const key = level ?? ''
  const kids = planOrder(childrenOf(data, level))
  const live = kids.filter(n => n.status !== 'replaced')
  const gone = kids.filter(n => n.status === 'replaced')
  const withReplaced = revealed.has(`replaced:${key}`)
  const tail = withReplaced ? gone : []
  const replaced = withReplaced ? 0 : gone.length
  if (revealed.has(key) || live.length <= limit) return { key, shown: live, above: [], below: [], tail, replaced }
  const anchor = anchorOf(data, live)
  const start = Math.max(0, Math.min(anchor - Math.floor((limit - 1) / 2), live.length - limit))
  return { key, shown: live.slice(start, start + limit), above: live.slice(0, start), below: live.slice(start + limit), tail, replaced }
}

/**
 * Visible nodes in display order: a container is followed by its children when it is open. Where a level
 * hides children, a marker node stands in their place: `{ id: 'more-<above|below|replaced>:<level>', more, count, level }`.
 * Also returns `alias`: each hidden node → the marker that stands for it.
 */
function walk(data, expanded, focus, options) {
  const out = []
  const alias = new Map()
  const marker = (more, w, count, depth, parent) => ({
    id: `more-${more}:${w.key}`, more, count, level: w.key, depth, ...(parent ? { parent } : {}),
  })
  const visitLevel = (level, depth) => {
    const w = levelWindow(data, level, options)
    if (w.above.length) out.push(marker('above', w, w.above.length, depth, level))
    w.shown.forEach(child => visit(child, depth))
    if (w.below.length) out.push(marker('below', w, w.below.length, depth, level))
    w.tail.forEach(child => visit(child, depth))
    if (w.replaced) out.push(marker('replaced', w, w.replaced, depth, level))
    for (const [side, hidden] of [['above', w.above], ['below', w.below]]) {
      for (const n of hidden) alias.set(n.id, `more-${side}:${w.key}`)
    }
  }
  const visit = (node, depth) => {
    out.push({ ...node, depth })
    if (expanded.has(node.id)) visitLevel(node.id, depth + 1)
  }
  if (focus) data.nodes.filter(n => n.id === focus).forEach(root => visit(root, 0))
  else visitLevel(null, 0)
  return { nodes: out, alias }
}

export function visibleNodes(data, expanded, focus = null, options = {}) {
  return walk(data, expanded, focus, options).nodes
}

/**
 * `after` edges between visible nodes. An endpoint inside a closed container moves to that container;
 * a hidden one moves to the marker that stands for it.
 */
export function visibleEdges(data, expanded, focus = null, options = {}) {
  const nodes = byId(data)
  const { nodes: visible, alias } = walk(data, expanded, focus, options)
  const shown = new Set(visible.map(n => n.id))
  const thread = threadSet(data)
  const lift = id => {
    for (const at of [id, ...containers(nodes, id)]) {
      if (shown.has(at)) return at
      if (alias.has(at)) return alias.get(at)
    }
    return null
  }

  const edges = new Map()
  for (const node of data.nodes) {
    for (const before of node.after ?? []) {
      const source = lift(before)
      const target = lift(node.id)
      if (!source || !target || source === target) continue
      const id = `${source}->${target}`
      const isThread = thread.has(before) && thread.has(node.id)
      const isDetour = node.kind === 'detour'
      const seen = edges.get(id)
      edges.set(id, {
        id,
        source,
        target,
        isThread: isThread || (seen?.isThread ?? false),
        isDetour: isDetour || (seen?.isDetour ?? false),
      })
    }
  }
  return [...edges.values()]
}

/** Every node that comes before `id`, for the "came from" list. */
export function cameFrom(data, id) {
  const nodes = byId(data)
  return (nodes.get(id)?.after ?? []).map(before => nodes.get(before)).filter(Boolean)
}

/** Nodes that list `id` among the nodes they come after. */
export function ledTo(data, id) {
  return data.nodes.filter(n => (n.after ?? []).includes(id))
}

/** Containers of `id`, outermost first, for the breadcrumb. */
export function pathTo(data, id) {
  const nodes = byId(data)
  return [...containers(nodes, id).reverse(), id].map(at => nodes.get(at)).filter(Boolean)
}

/** The outermost container of `id` (its milestone), or `id` itself at the top level. */
function milestoneOf(nodes, id) {
  return containers(nodes, id).at(-1) ?? id
}

/** Whether `later` comes after `earlier` or a step inside it, following `after` back through any number of steps. */
function comesAfter(nodes, later, earlier) {
  const seen = new Set()
  const stack = [...(nodes.get(later)?.after ?? [])]
  while (stack.length) {
    const at = stack.pop()
    if (at === earlier || containers(nodes, at).includes(earlier)) return true
    if (seen.has(at)) continue
    seen.add(at)
    stack.push(...(nodes.get(at)?.after ?? []))
  }
  return false
}

/**
 * Open steps a closed container leaves behind must be deferred to a task in a later milestone.
 * Reasons: left-behind (not deferred), no-target, unknown-target, not-later.
 */
export function anomalies(data) {
  const nodes = byId(data)
  const out = []
  for (const node of data.nodes) {
    if (node.status === 'deferred') {
      const to = node.deferred?.to
      if (!to) out.push({ id: node.id, reason: 'no-target' })
      else if (!nodes.has(to)) out.push({ id: node.id, reason: 'unknown-target' })
      else if (!comesAfter(nodes, milestoneOf(nodes, to), milestoneOf(nodes, node.id))) {
        out.push({ id: node.id, reason: 'not-later' })
      }
    } else if (node.status === 'todo' || node.status === 'active') {
      if (containers(nodes, node.id).some(at => nodes.get(at).status === 'done')) {
        out.push({ id: node.id, reason: 'left-behind' })
      }
    }
  }
  return out
}

/** Steps inside `id` (at any depth) that were deferred to later. */
export function deferredCount(data, id) {
  const nodes = byId(data)
  return data.nodes.filter(n => n.status === 'deferred' && containers(nodes, n.id).includes(id)).length
}

/** The task a deferred step continues in, or null. */
export function continuationOf(data, id) {
  const to = byId(data).get(id)?.deferred?.to
  return (to && byId(data).get(to)) ?? null
}

/** The deferred step a task picks up, or null. */
export function origin(data, id) {
  const from = byId(data).get(id)?.continues
  return (from && byId(data).get(from)) ?? null
}

/**
 * Files touched by `id` and every step inside it, once per path in the order first touched.
 * A file counts as created if any step created it; each step that touched it adds its reason.
 */
export function filesWithin(data, id) {
  const nodes = byId(data)
  const out = new Map()
  for (const node of data.nodes) {
    if (node.id !== id && !containers(nodes, node.id).includes(id)) continue
    for (const f of node.files ?? []) {
      const seen = out.get(f.path) ?? { path: f.path, change: f.change, reasons: [] }
      if (f.change === 'created') seen.change = 'created'
      seen.reasons.push({ step: node.id, why: f.why })
      out.set(f.path, seen)
    }
  }
  return [...out.values()]
}

/**
 * The viewer's shape from the .ariadne/ files. Each node keeps its fields and gains what the drawing reads:
 * `summary` (the outcome), `files` (file proofs) and `deferred` (where it continues).
 * Without a thread file the current node is the first active one.
 */
export function fromGraph(nodes, thread) {
  const continuation = new Map(nodes.filter(n => n.continues).map(n => [n.continues, n.id]))
  return {
    project: thread?.project ?? '',
    profile: thread?.profile,
    current: thread?.current ?? nodes.find(n => n.status === 'active')?.id ?? null,
    nodes: nodes.map(n => ({
      ...n,
      summary: n.what,
      files: (n.proof ?? []).filter(p => p.type === 'file').map(p => ({ path: p.ref, change: 'edited', why: n.what })),
      ...(n.status === 'deferred' ? { deferred: { to: continuation.get(n.id), why: n.why } } : {}),
    })),
  }
}

/**
 * The label at the right of a node (specifica § Viewer): what waits on you, where a deferral went,
 * how far a list is, or that you decided it. Null when there is nothing to say.
 */
export function labelOf(data, id) {
  const node = byId(data).get(id)
  if (!node) return null
  if (node.review === 'confirm' || node.review === 'decide') return { type: node.review }
  if (node.status === 'deferred' && node.deferred?.to) return { type: 'deferred', to: node.deferred.to }
  if (node.kind === 'list') {
    const points = childrenOf(data, id)
    return { type: 'list', done: points.filter(p => p.status === 'done').length, total: points.length }
  }
  return node.by === 'user' ? { type: 'user' } : null
}

/** The detail panel's rows in the order of specifica § Viewer, only those with a value. */
export function panelRows(data, id) {
  const n = byId(data).get(id)
  if (!n) return []
  const rows = [
    ['what', n.what],
    ['why', n.why],
    ['detail', n.detail],
    ['status', n.status],
    ['proof', n.proof?.length ? n.proof : null],
    ['uncertain', n.uncertain],
    ['by', n.by ? { by: n.by, at: n.at } : null],
    ['confirmed', n.confirmed],
    ['review', n.review],
    ['reentry', n.reentry],
    ['deferredTo', n.deferred?.to],
    ['continues', n.continues],
    ['replacedBy', n.replaced_by],
  ]
  return rows.filter(([, value]) => value != null && value !== '').map(([key, value]) => ({ key, value }))
}

/** Why a container has nothing inside yet (specifica § Stati del viewer): 'plan', 'list' or null. */
export function emptyNote(data, id) {
  const node = byId(data).get(id)
  if (!node || hasChildren(data, id)) return null
  return node.kind === 'milestone' ? 'plan' : node.kind === 'list' ? 'list' : null
}

/**
 * What closes a container (m7.2): its sub-steps and decisions, done out of total (risks only warn), and
 * the ends of its branches — the sub-steps no sibling waits for. Null for a node with nothing inside.
 */
export function progressOf(data, id) {
  const kids = data.nodes.filter(n => n.parent === id && n.kind !== 'risk')
  if (kids.length === 0) return null
  const waited = new Set(kids.flatMap(k => k.after ?? []))
  return {
    done: kids.filter(k => k.status === 'done').length,
    total: kids.filter(k => k.status !== 'replaced' && k.status !== 'deferred').length,
    ends: kids.filter(k => !waited.has(k.id) && k.status !== 'replaced' && k.status !== 'deferred').map(k => k.id),
  }
}
