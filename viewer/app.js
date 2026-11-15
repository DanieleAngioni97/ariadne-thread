import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Background, BaseEdge, Handle, MarkerType, Position, ReactFlow, ReactFlowProvider, useReactFlow,
} from '@xyflow/react'
import ELK from 'elkjs'
import htm from 'htm'

import { parse } from '../src/graph.mjs'
import { fileRef, showRef } from '../src/refs.mjs'
import { summarize } from '../src/summary.mjs'
import { validate } from '../src/validate.mjs'
import { StatusIcon } from './icons.js'
import { dayOffset, groupOf, kindOf, lastActivity, listCounts, listRows, parseLog, searchNodes, timeline } from './views.js'
import { lang, t } from './i18n.js'
import {
  anomalies, cameFrom, defaultExpanded, emptyNote, fromGraph, hasChildren, holdsCurrent, labelOf, ledTo, panelRows, pathTo, threadSet,
  limitOf, visibleEdges, visibleNodes,
} from './model.js'

const html = htm.bind(React.createElement)
const elk = new ELK()

const STEP = { width: 232, height: 64 }
const MORE = { width: 232, height: 36 }
const STEP_CHARS_PER_LINE = 18
/** Titles wrap, never cut (specifica § Stati del viewer): a step grows one line at a time. */
const heightOf = node => {
  const lines = Math.ceil(`${node.id} ${node.title}`.length / STEP_CHARS_PER_LINE)
  return Math.max(STEP.height, 42 + 19 * lines)
}
const PROOFS_SHOWN = 3
const RELOAD_MS = 2000
const PANEL_WIDTH = 400

// The repo as it is now: `ariadne view` serves .ariadne/ and tells the page where the repo lives.
// The files are read again every RELOAD_MS; `load` swaps the graph in when they change.
const read = path => fetch(path).then(r => (r.ok ? r.text() : null))
const readFiles = () => Promise.all([read('.ariadne/graph.jsonl'), read('.ariadne/thread.json'), read('.ariadne/log.jsonl')])
const signature = files => files.join('\0')
let data, byId, thread, problems, LIMIT, loaded, missing, errors, agentSummary, events, lastAt
function load([graphText, threadText, logText]) {
  loaded = signature([graphText, threadText, logText])
  events = parseLog(logText)
  lastAt = lastActivity(events)
  missing = graphText == null
  errors = missing ? [] : validate(graphText)
  const nodes = parse(graphText ?? '')
  data = fromGraph(nodes, threadText ? JSON.parse(threadText) : null)
  agentSummary = data.current ? summarize(nodes, { current: data.current }) : ''
  byId = new Map(data.nodes.map(n => [n.id, n]))
  thread = threadSet(data)
  problems = new Map(anomalies(data).map(a => [a.id, a.reason]))
  LIMIT = limitOf(data.profile)
}
const [files, ROOT] = await Promise.all([readFiles(), read('root')])
load(files)

document.documentElement.lang = lang

const childCount = id => data.nodes.filter(n => n.parent === id).length
const allContainers = () => new Set(data.nodes.filter(n => hasChildren(data, n.id)).map(n => n.id))
/** The key of the level that holds `id`, as the window and its markers name it. */
const levelKey = id => byId.get(id)?.parent ?? ''


/** The words at the right of a node (specifica § Viewer), else its status. */
function labelText(node) {
  const label = labelOf(data, node.id)
  if (!label) return node.kind === 'detour' ? t.kind.detour : t.status[node.status]
  if (label.type === 'deferred') return t.label.deferred(label.to)
  if (label.type === 'list') return t.label.list(label.done, label.total)
  return t.label[label.type]
}

function classesOf(node, selected, arriving) {
  return [
    `k-${kindOf(node)}`,
    thread.has(node.id) && 'is-thread',
    holdsCurrent(data, node.id) && 'holds-current',
    node.id === data.current && 'is-current',
    node.id === selected && 'is-selected',
    node.id === arriving && 'is-arriving',
    node.review && 'is-review',
    node.uncertain && 'is-uncertain',
    problems.has(node.id) && 'has-anomaly',
  ].filter(Boolean).join(' ')
}

/**
 * ELK lays out the visible nodes and routes the edges; edge points come back in root coordinates.
 * Stable layout (m2.6): the layout follows the file order, so a new node moves only what comes after
 * it, sideways. ELK's interactive mode was measured worse (docs/implementazione.md § m3.2).
 */
async function layout(expanded, focus, revealed) {
  const options = { limit: LIMIT, revealed }
  const shown = visibleNodes(data, expanded, focus, options)
  const shownIds = new Set(shown.map(n => n.id))
  const markers = new Map(shown.filter(n => n.more).map(n => [n.id, n]))
  const edges = visibleEdges(data, expanded, focus, options)
  const isOpen = n => !n.more && expanded.has(n.id) && hasChildren(data, n.id)

  const toElk = n => isOpen(n)
    ? {
        id: n.id,
        layoutOptions: { 'elk.padding': '[top=60,left=24,bottom=24,right=24]' },
        children: shown.filter(c => c.parent === n.id).map(toElk),
      }
    : n.more ? { id: n.id, ...MORE } : { id: n.id, width: STEP.width, height: heightOf(n) }

  const roots = shown.filter(n => !n.parent || !shownIds.has(n.parent))
  const graph = await elk.layout({
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.json.edgeCoords': 'ROOT',
      'elk.layered.spacing.nodeNodeBetweenLayers': '56',
      'elk.layered.spacing.edgeNodeBetweenLayers': '20',
      'elk.spacing.nodeNode': '28',
      'elk.spacing.edgeEdge': '12',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
    },
    children: roots.map(toElk),
    edges: edges.map(e => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  })

  const nodes = []
  const routes = new Map()
  const walk = (elkNode, parentId) => {
    const node = byId.get(elkNode.id) ?? markers.get(elkNode.id)
    const open = isOpen(node)
    nodes.push({
      id: node.id,
      type: node.more ? 'more' : open ? 'group' : 'step',
      position: { x: elkNode.x ?? 0, y: elkNode.y ?? 0 },
      ...(parentId ? { parentId } : {}),
      style: { width: elkNode.width, height: elkNode.height },
      data: { node },
      draggable: false,
      zIndex: open ? 0 : 1,
    })
    for (const child of elkNode.children ?? []) walk(child, node.id)
  }
  for (const child of graph.children ?? []) walk(child, null)
  // ELK may file an edge under any container; with ROOT edge coordinates its points are absolute anyway.
  const collect = elkNode => {
    for (const edge of elkNode.edges ?? []) routes.set(edge.id, edge.sections ?? [])
    for (const child of elkNode.children ?? []) collect(child)
  }
  collect(graph)

  return {
    nodes,
    edges: edges.map(e => {
      const color = e.isThread ? 'var(--thread)' : e.isDetour ? 'var(--detour)' : 'var(--line-strong)'
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'routed',
        data: { sections: routes.get(e.id) ?? [] },
        zIndex: 2,
        style: { stroke: color, strokeWidth: e.isThread ? 2.5 : 1.5, strokeDasharray: e.isDetour ? '5 4' : undefined },
        markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color },
      }
    }),
  }
}

/** An orthogonal polyline with rounded corners through ELK's points. */
function roundedPath(points, radius = 8) {
  if (points.length < 2) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length - 1; i++) {
    const [a, b, c] = [points[i - 1], points[i], points[i + 1]]
    const r = Math.min(radius, Math.hypot(b.x - a.x, b.y - a.y) / 2, Math.hypot(c.x - b.x, c.y - b.y) / 2)
    const toward = (p, q) => ({ x: p.x + Math.sign(q.x - p.x) * r, y: p.y + Math.sign(q.y - p.y) * r })
    const before = toward(b, a)
    const after = toward(b, c)
    d += ` L ${before.x} ${before.y} Q ${b.x} ${b.y} ${after.x} ${after.y}`
  }
  const last = points.at(-1)
  return `${d} L ${last.x} ${last.y}`
}

function RoutedEdge({ id, data: { sections }, sourceX, sourceY, targetX, targetY, style, markerEnd }) {
  const path = sections.length
    ? sections.map(s => roundedPath([s.startPoint, ...(s.bendPoints ?? []), s.endPoint])).join(' ')
    : `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`
  return html`<${BaseEdge} id=${id} path=${path} style=${style} markerEnd=${markerEnd} />`
}

const Ctx = React.createContext(null)

/** The drawn icon that says what a node is, in the node's colour. */
const Badge = ({ node, size }) => html`<span class="badge"><${StatusIcon} kind=${kindOf(node)} size=${size} /></span>`
const Alert = ({ node }) => problems.has(node.id) && html`<span class="alert" title=${t.anomaly[problems.get(node.id)]}>!</span>`

function Step({ data: { node } }) {
  const { selected, arriving, toggle, hover } = React.useContext(Ctx)
  const inside = childCount(node.id)
  return html`
    <div class=${`step ${classesOf(node, selected, arriving)}`}
      onMouseEnter=${e => hover(node, e.currentTarget)} onMouseLeave=${() => hover(null)}>
      <${Handle} type="target" position=${Position.Left} />
      <${Badge} node=${node} size=${20} />
      <div class="txt">
        <div class="title"><span class="nid">${node.id}</span> ${node.title}${node.uncertain && html` <span class="unsure" title=${node.uncertain} aria-label=${t.uncertain}>?</span>`}</div>
        <div class="meta">${labelText(node)}</div>
      </div>
      ${inside > 0 && html`
        <button class="expand" aria-label=${t.open(inside, node.title)}
          onClick=${e => { e.stopPropagation(); toggle(node.id) }}>+${inside}</button>`}
      <${Alert} node=${node} />
      <${Handle} type="source" position=${Position.Right} />
    </div>`
}

function Group({ data: { node } }) {
  const { selected, arriving, toggle, hover } = React.useContext(Ctx)
  return html`
    <div class=${`group ${classesOf(node, selected, arriving)}`}>
      <${Handle} type="target" position=${Position.Left} />
      <div class="group-head" onMouseEnter=${e => hover(node, e.currentTarget)} onMouseLeave=${() => hover(null)}>
        <${Badge} node=${node} size=${20} />
        <div class="title"><span class="nid">${node.id}</span> ${node.title}</div>
        <div class="meta">${labelText(node)}</div>
        <button class="expand" aria-label=${t.close(node.title)}
          onClick=${e => { e.stopPropagation(); toggle(node.id) }}>−</button>
      </div>
      <${Handle} type="source" position=${Position.Right} />
    </div>`
}

/** Stands for the children a level hides: «k nascosti sopra · mostra», «k sostituiti · mostra». */
function More({ data: { node } }) {
  const { reveal } = React.useContext(Ctx)
  const key = node.more === 'replaced' ? `replaced:${node.level}` : node.level
  return html`
    <div class="more">
      <${Handle} type="target" position=${Position.Left} />
      <span>${t.more[node.more](node.count)} · </span>
      <button onClick=${e => { e.stopPropagation(); reveal([key]) }}>${t.more.show}</button>
      <${Handle} type="source" position=${Position.Right} />
    </div>`
}

const nodeTypes = { step: Step, group: Group, more: More }
const edgeTypes = { routed: RoutedEdge }

/** One tooltip for the whole page, above everything, placed under the hovered node. */
function Tip({ tip }) {
  if (!tip) return null
  const { node, rect } = tip
  const below = rect.bottom + 8 + 80 < innerHeight
  const style = {
    left: `${Math.min(rect.left, innerWidth - 300)}px`,
    top: below ? `${rect.bottom + 8}px` : undefined,
    bottom: below ? undefined : `${innerHeight - rect.top + 8}px`,
  }
  return html`<div class="tip" role="tooltip" style=${style}>${node.what}${node.uncertain && html`<p class="unsure-why">? ${node.uncertain}</p>`}</div>`
}

const Chip = ({ node, onSelect }) => html`
  <button class=${`chip k-${kindOf(node)}`} onClick=${() => onSelect(node.id)}>
    <${Badge} node=${node} size=${14} /><span>${node.title}</span>
  </button>`

/** One proof: a commit sha, a file that opens in the editor, or the message that approved it. */
function Proof({ proof }) {
  if (proof.type === 'file') {
    const { path: ref } = fileRef(proof.ref)
    const path = ref.startsWith('~') || !ROOT ? ref : `${ROOT}/${ref}`
    return html`<a href=${`vscode://file/${path}`}><code>${showRef(proof.ref)}</code></a>`
  }
  return proof.type === 'commit' ? html`<code>${proof.ref}</code>` : html`<span>${proof.ref}</span>`
}

/** The first proofs, then `+k` that opens the full list (specifica § Stati del viewer, «Molte prove»). */
function Proofs({ list }) {
  const [all, setAll] = useState(false)
  const shown = all ? list : list.slice(0, PROOFS_SHOWN)
  return html`
    <ul class="proofs">
      ${shown.map((p, i) => html`<li key=${i}><${Proof} proof=${p} /></li>`)}
      ${!all && list.length > PROOFS_SHOWN && html`
        <li><button class="action quiet" onClick=${() => setAll(true)}>${t.panel.more(list.length - PROOFS_SHOWN)}</button></li>`}
    </ul>`
}

function RowValue({ row, onSelect }) {
  const { key, value } = row
  if (['reentry', 'deferredTo', 'continues', 'replacedBy'].includes(key)) {
    const target = byId.get(value)
    return target ? html`<div class="chips"><${Chip} node=${target} onSelect=${onSelect} /></div>` : html`<p>${value}</p>`
  }
  if (key === 'status') return html`<p>${t.status[value]}</p>`
  if (key === 'proof') return html`<${Proofs} list=${value} />`
  if (key === 'by') return html`<p>${t.panel.by[value.by] ?? value.by}${value.at ? `, ${value.at}` : ''}</p>`
  if (key === 'confirmed') return html`<p>${[value.at, value.ref].filter(Boolean).join(' · ')}</p>`
  if (key === 'review') return html`<p>${t.panel.review[value] ?? value}</p>`
  return html`<p>${value}</p>`
}

function Panel({ node, open, expanded, focus, onSelect, onToggle, onFocus, onClose, onShowInGraph }) {
  const inside = childCount(node.id)
  const from = cameFrom(data, node.id)
  const led = ledTo(data, node.id)
  const isCurrent = node.id === data.current
  const problem = problems.get(node.id)
  // What happened to this node, newest first; details stay in the timeline.
  const history = events.filter(e => e.id === node.id && groupOf(e.op) !== 'detail').reverse().slice(0, 6)
  return html`
    <aside class="panel" aria-label=${t.panel.label} aria-hidden=${!open} inert=${!open || undefined}>
      <header class=${`panel-head k-${kindOf(node)}`}>
        <button class="close" aria-label=${t.panel.close} title=${t.panel.closeHint} onClick=${onClose}>
          <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" /></svg>
        </button>
        <div class=${`status ${isCurrent ? 'is-here' : ''}`}>
          <${Badge} node=${node} size=${18} />
          <span>${labelText(node)}${isCurrent ? ` · ${t.here}` : ''}</span>
        </div>
        <h2><span class="nid">${node.id}</span> ${node.title}</h2>
        ${onShowInGraph && html`<button class="link" onClick=${() => onShowInGraph(node.id)}>${t.panel.showInGraph}</button>`}
      </header>

      ${problem && html`<div class="warning" role="alert"><b>!</b> ${t.anomaly[problem]}</div>`}
      ${emptyNote(data, node.id) && html`<p class="empty-note">${t.empty[emptyNote(data, node.id)]}</p>`}

      <dl class="rows">
        ${panelRows(data, node.id).map(row => html`
          <div class=${`row row-${row.key}`} key=${row.key}>
            <dt>${t.panel.rows[row.key]}</dt>
            <dd><${RowValue} row=${row} onSelect=${onSelect} /></dd>
          </div>`)}
      </dl>

      ${inside > 0 && html`
        <section>
          <h3>${t.panel.inside}</h3>
          <p>${t.panel.steps(inside)}</p>
          <div class="row-actions">
            <button class="link" onClick=${() => onToggle(node.id)}>${expanded.has(node.id) ? t.panel.closeSteps : t.panel.openSteps}</button>
            ${focus !== node.id && html`<button class="link" onClick=${() => onFocus(node.id)}>${t.panel.showOnly}</button>`}
          </div>
        </section>`}

      ${(from.length > 0 || led.length > 0) && html`
        <section>
          <h3>${t.panel.links}</h3>
          ${from.length > 0 && html`<div class="sub">${t.panel.cameFrom}</div>
            <div class="chips">${from.map(n => html`<${Chip} key=${n.id} node=${n} onSelect=${onSelect} />`)}</div>`}
          ${led.length > 0 && html`<div class="sub">${t.panel.ledTo}</div>
            <div class="chips">${led.map(n => html`<${Chip} key=${n.id} node=${n} onSelect=${onSelect} />`)}</div>`}
        </section>`}

      ${history.length > 0 && html`
        <section>
          <h3>${t.panel.history}</h3>
          <ol class="history">
            ${history.map((e, i) => html`<li key=${i}><span class="when">${shortDate(e.at)} ${timeOf(e.at)}</span> ${t.ops[e.op] ?? e.op}${outcomeOf(e.text) ? `: ${outcomeOf(e.text)}` : ''}</li>`)}
          </ol>
        </section>`}

      ${isCurrent && agentSummary && html`
        <section>
          <details class="agent-summary">
            <summary>${t.agentReads}</summary>
            <pre>${agentSummary}</pre>
          </details>
        </section>`}
    </aside>`
}

const LEGEND_KEY = 'ariadne.legend'
const KINDS = ['active', 'done', 'todo', 'deferred', 'detour', 'dropped']

/**
 * The legend behind a small button: open on the first visit, then as you left it.
 * The same icons as the nodes, then the four cues that are not icons.
 */
function Legend() {
  const [open, setOpen] = useState(() => localStorage.getItem(LEGEND_KEY) !== 'closed')
  const flip = () => setOpen(o => {
    localStorage.setItem(LEGEND_KEY, o ? 'closed' : 'open')
    return !o
  })
  return html`
    <div class="legend-wrap">
      ${open && html`
        <div class="legend" id="legend" role="region" aria-label=${t.legendTitle}>
          <ul class="legend-kinds">
            ${KINDS.map(kind => html`<li key=${kind} class=${`k-${kind}`}><${StatusIcon} kind=${kind} /> ${t.kinds[kind]}</li>`)}
          </ul>
          <ul class="legend-cues">
            ${t.cues.map(([key, text]) => html`<li key=${key} class=${`cue-${key}`}><span class="cue" aria-hidden="true"></span>${text}</li>`)}
            ${problems.size > 0 && html`<li class="cue-anomaly"><span class="alert">!</span>${t.anomalyKey}</li>`}
          </ul>
        </div>`}
      <button class="tool" aria-expanded=${open} aria-controls="legend" onClick=${flip}>${t.legendTitle}</button>
    </div>`
}

/** «Grafo non valido: k errori», then the validator's lines; the readable nodes stay drawn. */
function Invalid() {
  if (errors.length === 0) return null
  return html`
    <div class="invalid" role="alert">
      <b>${t.invalid(errors.length)}</b>
      <ul>${errors.map((e, i) => html`<li key=${i}><code>${t.errorLine(e)}</code></li>`)}</ul>
    </div>`
}

const pad2 = n => String(n).padStart(2, '0')
/** The local day of a moment, YYYY-MM-DD: the timeline groups by the day you lived, not by UTC. */
const localDay = at => {
  const d = new Date(at)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
const timeOf = at => new Date(at).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })
const shortDate = at => new Date(at).toLocaleDateString(lang, { day: 'numeric', month: 'short' })
function dayTitle(day) {
  const back = dayOffset(day, localDay(Date.now()))
  if (back === 0) return t.days.today
  if (back === 1) return t.days.yesterday
  return new Date(`${day}T12:00`).toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long' })
}

/** The outcome after «: » in an event's text, the part the row does not already say. */
const outcomeOf = text => {
  const at = (text ?? '').indexOf(': ')
  return at < 0 ? '' : text.slice(at + 2)
}

const TIMELINE_SHOWN = 60
const GROUP_KEYS = ['progress', 'structure', 'detail']

/** What happened, newest first, by day; chips choose which kinds of event show. */
function Timeline({ query, selected, onSelect }) {
  const [groups, setGroups] = useState(() => new Set(['progress', 'structure']))
  const [all, setAll] = useState(false)
  const flip = key => setGroups(prev => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })
  const days = timeline(events, { groups, query, nodes: byId, dayOf: localDay })
  let budget = all ? Infinity : TIMELINE_SHOWN
  const shownDays = days.map(d => {
    const list = d.events.slice(0, Math.max(0, budget))
    budget -= list.length
    return { ...d, events: list }
  }).filter(d => d.events.length)
  const total = days.reduce((k, d) => k + d.events.length, 0)
  return html`
    <section class="sheet" aria-label=${t.views.timeline}>
      <div class="filters" role="group" aria-label=${t.filters}>
        ${GROUP_KEYS.map(key => html`
          <button key=${key} class="filter" aria-pressed=${groups.has(key)} onClick=${() => flip(key)}>
            ${t.groups[key]} <span class="count">${events.filter(e => groupOf(e.op) === key).length}</span>
          </button>`)}
      </div>
      ${events.length === 0 && html`<p class="empty">${t.noEvents}</p>`}
      ${events.length > 0 && total === 0 && html`
        <p class="empty">${t.noMatch} <button class="link" onClick=${() => setGroups(new Set(GROUP_KEYS))}>${t.resetFilters}</button></p>`}
      ${shownDays.map(d => html`
        <div class="day" key=${d.day}>
          <h3 class="day-title">${dayTitle(d.day)}</h3>
          <ul class="events">
            ${d.events.map((e, i) => {
              const node = byId.get(e.id)
              const outcome = outcomeOf(e.text)
              return html`
                <li key=${`${e.at}${i}`}>
                  <button class=${`event ${node && node.id === selected ? 'is-selected' : ''}`} disabled=${!node}
                    title=${e.text} onClick=${() => node && onSelect(node.id)}>
                    <span class="time">${timeOf(e.at)}</span>
                    <span class=${`badge k-${node ? kindOf(node) : 'todo'}`}>${node ? html`<${StatusIcon} kind=${kindOf(node)} />` : ''}</span>
                    <span class="op">${t.ops[e.op] ?? e.op}</span>
                    <span class="what">
                      ${node ? html`<span class="nid">${node.id}</span> ${node.title}` : e.text}
                      ${node && outcome && html`<span class="outcome">${outcome}</span>`}
                    </span>
                  </button>
                </li>`
            })}
          </ul>
        </div>`)}
      ${!all && total > TIMELINE_SHOWN && html`
        <p class="more-rows"><button class="link" onClick=${() => setAll(true)}>${t.showAllEvents(total)}</button></p>`}
    </section>`
}

const FILTERS = ['all', 'active', 'todo', 'done', 'deferred', 'detour', 'dropped']

/** Every node in graph order, one chip per kind with its count. */
function NodeList({ query, selected, onSelect }) {
  const [filter, setFilter] = useState('all')
  const counts = listCounts(data)
  const rows = listRows(data, { filter, query })
  return html`
    <section class="sheet" aria-label=${t.views.list}>
      <div class="filters" role="radiogroup" aria-label=${t.filters}>
        ${FILTERS.filter(key => key === 'all' || counts[key] > 0).map(key => html`
          <button key=${key} role="radio" class=${`filter k-${key}`} aria-checked=${filter === key} onClick=${() => setFilter(key)}>
            ${key !== 'all' && html`<${StatusIcon} kind=${key} size=${14} />`}
            ${key === 'all' ? t.all : t.kinds[key]} <span class="count">${counts[key]}</span>
          </button>`)}
      </div>
      ${rows.length === 0 && html`<p class="empty">${t.noNodes(query)}</p>`}
      ${rows.length > 0 && html`
        <table class="nodes">
          <thead><tr><th>${t.cols.title}</th><th>${t.cols.milestone}</th><th>${t.cols.last}</th></tr></thead>
          <tbody>
            ${rows.map(({ node, depth, milestone }) => html`
              <tr key=${node.id} class=${`k-${kindOf(node)} ${node.id === selected ? 'is-selected' : ''} ${node.id === data.current ? 'is-current' : ''}`}>
                <td>
                  <button class="row-title" style=${{ paddingLeft: `${8 + (filter === 'all' && !query ? depth * 18 : 0)}px` }} onClick=${() => onSelect(node.id)}>
                    <span class="badge"><${StatusIcon} kind=${kindOf(node)} /></span>
                    <span><span class="nid">${node.id}</span> ${node.title}</span>
                  </button>
                </td>
                <td class="muted">${milestone?.title ?? ''}</td>
                <td class="muted nowrap">${lastAt.has(node.id) ? shortDate(lastAt.get(node.id)) : ''}</td>
              </tr>`)}
          </tbody>
        </table>`}
    </section>`
}

/** One field for every view: in the graph it lists nodes to go to, elsewhere it filters the rows. */
function Search({ view, query, setQuery, onGo, inputRef }) {
  const [at, setAt] = useState(0)
  const results = view === 'graph' ? searchNodes(data, query) : []
  const go = node => {
    onGo(node.id)
    setQuery('')
    inputRef.current?.blur()
  }
  const onKey = e => {
    if (e.key === 'Escape') { setQuery(''); e.currentTarget.blur() }
    if (!results.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setAt(i => (i + 1) % results.length) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setAt(i => (i - 1 + results.length) % results.length) }
    if (e.key === 'Enter') go(results[Math.min(at, results.length - 1)])
  }
  return html`
    <div class="search">
      <svg class="search-icon" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="7" cy="7" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <input ref=${inputRef} type="search" value=${query} placeholder=${t.search.placeholder} aria-label=${t.search.label}
        role=${view === 'graph' ? 'combobox' : undefined} aria-expanded=${view === 'graph' ? results.length > 0 : undefined}
        aria-controls="search-results" onInput=${e => { setQuery(e.target.value); setAt(0) }} onKeyDown=${onKey} />
      <kbd aria-hidden="true">/</kbd>
      ${view === 'graph' && query.trim() && html`
        <ul class="results" id="search-results" role="listbox">
          ${results.length === 0 && html`<li class="none">${t.noNodes(query)}</li>`}
          ${results.map((n, i) => html`
            <li key=${n.id} role="option" aria-selected=${i === at} class=${`k-${kindOf(n)}`}
              onMouseDown=${e => { e.preventDefault(); go(n) }} onMouseEnter=${() => setAt(i)}>
              <span class="badge"><${StatusIcon} kind=${kindOf(n)} size=${14} /></span>
              <span class="nid">${n.id}</span><span class="result-title">${n.title}</span>
            </li>`)}
        </ul>`}
    </div>`
}

/** Zoom out, zoom in, fit: three small buttons next to the legend. */
function ZoomTools({ onFit }) {
  const flow = useReactFlow()
  return html`
    <div class="zoom" role="group" aria-label=${t.zoom.label}>
      <button class="tool" aria-label=${t.zoom.out} title=${t.zoom.out} onClick=${() => flow.zoomOut({ duration: 160 })}>−</button>
      <button class="tool" aria-label=${t.zoom.in} title=${t.zoom.in} onClick=${() => flow.zoomIn({ duration: 160 })}>+</button>
      <button class="tool" onClick=${onFit}>${t.zoom.fit}</button>
    </div>`
}

function App() {
  // ?level=milestones|path|all, ?select=<id> and ?lang=xx open the page in a given state.
  const params = new URLSearchParams(location.search)
  const [level, setLevel] = useState(() => params.get('level') ?? 'path')
  const [expanded, setExpanded] = useState(() =>
    level === 'milestones' ? new Set() : level === 'all' ? allContainers() : defaultExpanded(data))
  const [focus, setFocus] = useState(null)
  // Levels opened in full past the profile's limit, and levels showing their replaced steps (`replaced:<id>`).
  const [revealed, setRevealed] = useState(() => (level === 'all' ? new Set(['', ...allContainers()]) : new Set()))
  const [selected, setSelected] = useState(() => (byId.has(params.get('select')) ? params.get('select') : data.current))
  const [graph, setGraph] = useState({ nodes: [], edges: [] })
  // Bumped when .ariadne/ changes on disk, so the graph is drawn again (F5 is never needed).
  const [version, setVersion] = useState(0)
  const [tip, setTip] = useState(null)
  // The panel slides away for a full-width graph; choosing anything brings it back.
  const [panelOpen, setPanelOpen] = useState(true)
  // Graph, timeline or list; the search text is shared by all three.
  const [view, setView] = useState(() => (['timeline', 'list'].includes(params.get('view')) ? params.get('view') : 'graph'))
  const [query, setQuery] = useState('')
  const searchRef = useRef(null)
  const tipTimer = useRef(null)
  // Where to fly after the next layout (a step chosen from the panel or the breadcrumb), and the step just reached.
  const [flyTo, setFlyTo] = useState(null)
  const [arriving, setArriving] = useState(null)
  const flow = useReactFlow()

  // Fitting leaves the panel's strip free while the panel is open.
  const padding = useCallback(
    (side = 0.12) => (panelOpen ? { top: side, bottom: side, left: side, right: `${PANEL_WIDTH + 24}px` } : side),
    [panelOpen])
  const fit = useCallback(() => flow.fitView({ padding: padding(), duration: 240 }), [padding])

  // A reload keeps the viewport: only a change you made refits the view.
  const drawn = useRef(version)
  useEffect(() => {
    let alive = true
    const reloaded = drawn.current !== version
    drawn.current = version
    layout(expanded, focus, revealed).then(next => {
      if (!alive) return
      setGraph(next)
      if (!flyTo && !reloaded) requestAnimationFrame(fit)
    })
    return () => { alive = false }
  }, [expanded, focus, revealed, version])

  useEffect(() => {
    const timer = setInterval(async () => {
      const next = await readFiles().catch(() => null)
      if (!next || signature(next) === loaded) return
      const was = data.current
      load(next)
      setVersion(v => v + 1)
      // Looking at where you are follows where you are; any other choice stays.
      setSelected(id => (id === was ? data.current : id))
    }, RELOAD_MS)
    return () => clearInterval(timer)
  }, [])

  // Zoom onto the chosen step once it is drawn, then make it pulse so the eye lands on it.
  useEffect(() => {
    if (!flyTo || !graph.nodes.some(n => n.id === flyTo)) return
    requestAnimationFrame(() => flow.fitView({ nodes: [{ id: flyTo }], padding: padding(0.6), maxZoom: 1.1, duration: 500 }))
    setArriving(flyTo)
    setFlyTo(null)
    const timer = setTimeout(() => setArriving(null), 1600)
    return () => clearTimeout(timer)
  }, [graph, flyTo])

  // Show the tooltip after a short pause; hide it at once.
  const hover = useCallback((node, el) => {
    clearTimeout(tipTimer.current)
    if (!node) return setTip(null)
    tipTimer.current = setTimeout(() => setTip({ node, rect: el.getBoundingClientRect() }), 350)
  }, [])

  const toggle = useCallback(id => {
    setLevel('custom')
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  /** Opens levels in full; a new set only if something opens. */
  const reveal = useCallback(keys => {
    setRevealed(prev => (keys.every(k => prev.has(k)) ? prev : new Set([...prev, ...keys])))
  }, [])

  const select = useCallback(id => {
    setSelected(id)
    setPanelOpen(true)
  }, [])

  // Esc puts the panel away; / goes to the search.
  useEffect(() => {
    const onKey = e => {
      if (e.target.closest?.('input')) return
      if (e.key === 'Escape') setPanelOpen(false)
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); searchRef.current?.focus() }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [])

  const choose = useCallback(id => {
    select(id)
    setFlyTo(id)
    // Make sure the step is drawn: open everything that contains it and every level it sits in.
    const holders = pathTo(data, id).slice(0, -1).map(n => n.id)
    setExpanded(prev => (holders.every(at => prev.has(at)) ? prev : new Set([...prev, ...holders])))
    const levels = [...holders, id].map(levelKey)
    reveal(byId.get(id)?.status === 'replaced' ? [...levels, `replaced:${levelKey(id)}`] : levels)
  }, [])

  const showInGraph = id => {
    setView('graph')
    choose(id)
  }

  const showLevel = name => {
    setLevel(name)
    setExpanded(name === 'milestones' ? new Set() : name === 'all' ? allContainers() : defaultExpanded(data))
    setRevealed(name === 'all' ? new Set(['', ...allContainers()]) : new Set())
  }

  const path = pathTo(data, data.current)
  const node = byId.get(selected) ?? byId.get(data.current)
  const ctx = useMemo(() => ({ selected, arriving, toggle, hover, reveal }), [selected, arriving, toggle, hover, reveal])

  return html`
    <${Ctx.Provider} value=${ctx}>
      <div class=${`shell ${panelOpen && node ? 'panel-open' : ''}`}>
        <header class="bar">
          <div class="brand">ariadne<span>·</span></div>
          <nav class="views" aria-label=${t.views.label}>
            ${['graph', 'timeline', 'list'].map(key => html`
              <button key=${key} aria-current=${view === key ? 'page' : undefined} onClick=${() => setView(key)}>${t.views[key]}</button>`)}
          </nav>
          <nav class="where" aria-label=${t.here}>
            <span class="where-label">${t.here}</span>
            ${path.map((n, i) => html`
              ${i > 0 && html`<span class="sep" key=${`s${n.id}`}>›</span>`}
              <button key=${n.id} class=${`crumb ${i === path.length - 1 ? 'is-here' : ''}`} title=${n.title} onClick=${() => choose(n.id)}>${n.title}</button>`)}
          </nav>
          <${Search} view=${view} query=${query} setQuery=${setQuery} onGo=${choose} inputRef=${searchRef} />
        </header>
        <main class="stage">
          ${missing && html`<p class="no-graph">${t.noGraph}</p>`}
          <div class="overlays"><${Invalid} /></div>
          ${view === 'timeline' && html`<${Timeline} query=${query} selected=${selected} onSelect=${select} />`}
          ${view === 'list' && html`<${NodeList} query=${query} selected=${selected} onSelect=${select} />`}
          <div class="canvas-tools" hidden=${view !== 'graph'}>
            <div class="seg" role="group" aria-label=${t.detail}>
              ${['milestones', 'path', 'all'].map(key => html`
                <button key=${key} aria-pressed=${level === key} onClick=${() => showLevel(key)}>${t.levels[key]}</button>`)}
            </div>
            ${focus && html`<div class="focus-note">${t.only(byId.get(focus).title)} <button class="link" onClick=${() => setFocus(null)}>${t.showAll}</button></div>`}
          </div>
          <${ReactFlow}
            nodes=${graph.nodes}
            edges=${graph.edges}
            nodeTypes=${nodeTypes}
            edgeTypes=${edgeTypes}
            onNodeClick=${(e, n) => {
              if (n.type === 'more') return
              // An open container answers only on its heading: the rest of it pans like the background.
              if (n.type === 'group' && !e.target.closest('.group-head')) return
              select(n.id)
            }}
            onMoveStart=${() => hover(null)}
            nodesDraggable=${false}
            nodesConnectable=${false}
            minZoom=${0.2}
            proOptions=${{ hideAttribution: true }}
          >
            <${Background} gap=${24} size=${1} color="#cfd5dc" />
          <//>
          <div class="bottom-tools" hidden=${view !== 'graph'}>
            ${!missing && html`<${Legend} />`}
            <${ZoomTools} onFit=${fit} />
          </div>
          ${node && html`<${Panel} node=${node} open=${panelOpen} expanded=${expanded} focus=${focus}
            onShowInGraph=${view === 'graph' ? null : showInGraph}
            onSelect=${view === 'graph' ? choose : select} onToggle=${toggle} onClose=${() => setPanelOpen(false)}
            onFocus=${id => { setFocus(id); setExpanded(prev => new Set([...prev, id])) }} />`}
        </main>
      </div>
      <${Tip} tip=${tip} />
    <//>`
}

createRoot(document.getElementById('app')).render(html`<${ReactFlowProvider}><${App} /><//>`)
