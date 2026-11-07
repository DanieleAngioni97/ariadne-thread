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
