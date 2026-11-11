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

/** Visible nodes in display order: a container is followed by its children when it is open. */
export function visibleNodes(data, expanded, focus = null) {
  const out = []
  const visit = (node, depth) => {
    out.push({ ...node, depth })
    if (expanded.has(node.id)) childrenOf(data, node.id).forEach(child => visit(child, depth + 1))
  }
  const roots = focus ? data.nodes.filter(n => n.id === focus) : childrenOf(data, null)
  roots.forEach(root => visit(root, 0))
  return out
}

/** `after` edges between visible nodes; an endpoint inside a closed container moves to that container. */
export function visibleEdges(data, expanded, focus = null) {
  const nodes = byId(data)
  const shown = new Set(visibleNodes(data, expanded, focus).map(n => n.id))
  const thread = threadSet(data)
  const lift = id => [id, ...containers(nodes, id)].find(at => shown.has(at)) ?? null

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
 * `summary` (the outcome), `files` (file proofs), `deferred` (where it continues) and `dropped` for replaced.
 * Without a thread file the current node is the first active one.
 */
export function fromGraph(nodes, thread) {
  const continuation = new Map(nodes.filter(n => n.continues).map(n => [n.continues, n.id]))
  return {
    project: thread?.project ?? '',
    current: thread?.current ?? nodes.find(n => n.status === 'active')?.id ?? null,
    nodes: nodes.map(n => ({
      ...n,
      status: n.status === 'replaced' ? 'dropped' : n.status,
      summary: n.what,
      files: (n.proof ?? []).filter(p => p.type === 'file').map(p => ({ path: p.ref, change: 'edited', why: n.what })),
      ...(n.status === 'deferred' ? { deferred: { to: continuation.get(n.id), why: n.why } } : {}),
    })),
  }
}
