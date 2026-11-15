// Pure logic for the views beside the graph: the timeline of the log, the list of nodes, the search.

/** What a node is, at a glance: its look follows this, not the raw status. */
export const kindOf = node => (node.kind === 'detour' ? 'detour' : node.status === 'replaced' ? 'dropped' : node.status)

const GROUPS = {
  start: 'progress', close: 'progress',
  fill: 'detail', relink: 'detail',
}

/** Progress (started, closed), detail (filled, relinked) or structure (everything else, new operations too). */
export const groupOf = op => GROUPS[op] ?? 'structure'

/** The events of `.ariadne/log.jsonl`, in file order; a line that does not parse is skipped. */
export function parseLog(text) {
  const out = []
  for (const line of (text ?? '').split('\n')) {
    if (!line.trim()) continue
    try {
      out.push(JSON.parse(line))
    } catch {
      // A torn or foreign line: the rest of the log still reads.
    }
  }
  return out
}

const matches = (query, ...texts) => texts.some(s => s && s.toLowerCase().includes(query))

/**
 * The log by day, newest day first and newest event first inside it, keeping the chosen `groups`.
 * `query` matches the node id, the node title (from `nodes`) or the event text; `dayOf` names an event's day.
 */
export function timeline(events, { groups, query = '', nodes = new Map(), dayOf = at => at.slice(0, 10) }) {
  const q = query.trim().toLowerCase()
  const days = new Map()
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]
    if (!groups.has(groupOf(e.op))) continue
    if (q && !matches(q, e.id, nodes.get(e.id)?.title, e.text)) continue
    const day = e.at ? dayOf(e.at) : ''
    if (!days.has(day)) days.set(day, [])
    days.get(day).push(e)
  }
  return [...days].sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0)).map(([day, list]) => ({ day, events: list }))
}

/** Whole days from `day` back to `today` (both YYYY-MM-DD): 0 today, 1 yesterday. */
export const dayOffset = (day, today) => Math.round((Date.parse(today) - Date.parse(day)) / 86_400_000)

/** When each node last changed, from the log: id → `at` of its latest event. */
export function lastActivity(events) {
  const out = new Map()
  for (const e of events) if (e.id && e.at && !(out.get(e.id) > e.at)) out.set(e.id, e.at)
  return out
}

/** Every node in graph order (a container, then what it holds), with its depth and milestone. */
function inOrder(data) {
  const kids = new Map()
  for (const n of data.nodes) {
    const key = n.parent ?? null
    if (!kids.has(key)) kids.set(key, [])
    kids.get(key).push(n)
  }
  const out = []
  const visit = (node, depth, milestone) => {
    out.push({ node, depth, milestone })
    for (const child of kids.get(node.id) ?? []) visit(child, depth + 1, milestone ?? node)
  }
  for (const root of kids.get(null) ?? []) visit(root, 0, undefined)
  return out
}

/** The list rows, filtered by kind (`all` or one of kindOf's) and by id or title. */
export function listRows(data, { filter = 'all', query = '' }) {
  const q = query.trim().toLowerCase()
  return inOrder(data).filter(({ node }) =>
    (filter === 'all' || kindOf(node) === filter) && (!q || matches(q, node.id, node.title)))
}

/** How many nodes each filter chip would show. */
export function listCounts(data) {
  const counts = { all: data.nodes.length, active: 0, todo: 0, done: 0, deferred: 0, detour: 0, dropped: 0 }
  for (const n of data.nodes) counts[kindOf(n)] = (counts[kindOf(n)] ?? 0) + 1
  return counts
}

/** Nodes whose id or title holds `query`: exact id, then id prefix, then a title word, then anywhere. */
export function searchNodes(data, query, limit = 8) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const rank = n => {
    const id = n.id.toLowerCase()
    const title = (n.title ?? '').toLowerCase()
    if (id === q) return 0
    if (id.startsWith(q)) return 1
    if (title.split(/\s+/).some(w => w.startsWith(q))) return 2
    if (id.includes(q) || title.includes(q)) return 3
    return null
  }
  return data.nodes
    .map((n, i) => ({ n, i, r: rank(n) }))
    .filter(x => x.r !== null)
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .slice(0, limit)
    .map(x => x.n)
}
