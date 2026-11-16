// Pure queries on an ariadne thread: where a node sits, what it depends on, what comes next.
// Rules: docs/implementazione.md § m3.5 (dependencies, next) and the R7 summary in specifica.md.

/** One node per non-empty line, in file order; unreadable lines are skipped (the validator reports them). */
export function parse(text) {
  const nodes = []
  for (const raw of text.split('\n')) {
    if (raw.trim() === '') continue
    try {
      const n = JSON.parse(raw)
      if (n && typeof n === 'object' && typeof n.id === 'string') nodes.push(n)
    } catch { /* reported by validate() */ }
  }
  return nodes
}

export function makeGraph(nodes) {
  const byId = new Map(nodes.map(n => [n.id, n]))
  const get = id => byId.get(id)
  const childrenOf = id => nodes.filter(n => (n.parent ?? null) === (id ?? null))

  /** The containers of `id`, innermost first. */
  function containers(id) {
    const out = []
    let at = get(id)?.parent
    while (at && byId.has(at) && !out.includes(at)) {
      out.push(at)
      at = get(at).parent
    }
    return out
  }

  /** A finished milestone stands for its last results: done children no sibling comes after. */
  function ends(id) {
    const kids = childrenOf(id).filter(k => k.status === 'done')
    const before = new Set(kids.flatMap(k => k.after ?? []))
    return kids.filter(k => !before.has(k.id)).map(k => k.id)
  }

  /**
   * What `id` comes from: `after` and `continues` backwards from it and its containers, nearest first.
   * Nearest = fewest hops from a milestone to an earlier one, then fewest steps: the chain inside the
   * own milestone comes before the results of earlier milestones. A detour also comes from the node it
   * left (`reentry`). With `own`, only the node's own chain: no containers (premises of a deduction).
   */
  function dependencies(id, { own = false } = {}) {
    const start = own ? [id] : [id, ...containers(id)]
    const done = new Set()
    const out = []
    const queue = start.map(at => ({ at, hops: 0, steps: 0 }))
    while (queue.length > 0) {
      queue.sort((a, b) => a.hops - b.hops || a.steps - b.steps)
      const { at, hops, steps } = queue.shift()
      if (done.has(at)) continue
      done.add(at)
      const n = get(at)
      const milestone = n.kind === 'milestone'
      if (!milestone && !start.includes(at)) out.push(at)
      const left = n.kind === 'detour' && n.reentry ? [n.reentry] : []
      const edges = [...(n.after ?? []), ...(n.continues ? [n.continues] : []), ...left].map(t => [t, milestone ? 1 : 0])
      if (milestone && !start.includes(at)) edges.push(...ends(at).map(t => [t, 0]))
      for (const [target, hop] of edges) {
        if (!done.has(target) && byId.has(target)) queue.push({ at: target, hops: hops + hop, steps: steps + 1 })
      }
    }
    return out
  }

  /**
   * The first ready todo inside `current`, when it is a container with work left (as after a pause); else
   * the todo that follows `current` in its plan; else the first todo, in file order, whose prerequisites are
   * done or are where you stand; climbs a level if none. The plan comes first: a step deferred into the
   * milestone sits earlier in the file but was not planned after anything.
   */
  function next(current) {
    const here = new Set([current, ...containers(current)])
    const ready = n => n.status === 'todo' && (n.after ?? []).every(a => here.has(a) || get(a)?.status === 'done')
    const inside = childrenOf(current).find(ready)
    if (inside) return inside.id
    for (const level of [get(current)?.parent, ...containers(current).map(c => get(c).parent)]) {
      const kids = childrenOf(level)
      const found = kids.find(k => ready(k) && (k.after ?? []).some(a => here.has(a))) ?? kids.find(ready)
      if (found) return found.id
      if (level === undefined) break
    }
    return null
  }

  /** With no step started yet, as after init and a first plan: the first ready todo step, in file order. */
  function first() {
    const ready = n => n.kind !== 'milestone' && n.status === 'todo' && (n.after ?? []).every(a => get(a)?.status === 'done')
    return nodes.find(ready)?.id ?? null
  }

  return { get, childrenOf, containers, dependencies, next, first }
}
