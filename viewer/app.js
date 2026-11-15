import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Background, BaseEdge, Controls, Handle, MarkerType, Position, ReactFlow, ReactFlowProvider, useReactFlow,
} from '@xyflow/react'
import ELK from 'elkjs'
import htm from 'htm'

import { parse } from '../src/graph.mjs'
import { fileRef, showRef } from '../src/refs.mjs'
import { summarize } from '../src/summary.mjs'
import { validate } from '../src/validate.mjs'
import { StatusIcon } from './icons.js'
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

// The repo as it is now: `ariadne view` serves .ariadne/ and tells the page where the repo lives.
// The files are read again every RELOAD_MS; `load` swaps the graph in when they change.
const read = path => fetch(path).then(r => (r.ok ? r.text() : null))
const readFiles = () => Promise.all([read('.ariadne/graph.jsonl'), read('.ariadne/thread.json')])
let data, byId, thread, problems, LIMIT, loaded, missing, errors, agentSummary
function load([graphText, threadText]) {
  loaded = `${graphText}\0${threadText}`
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

/** What a node is, at a glance: its look follows this, not the raw status. */
const kindOf = node => (node.kind === 'detour' ? 'detour' : node.status === 'replaced' ? 'dropped' : node.status)

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

function Panel({ node, expanded, focus, onSelect, onToggle, onFocus }) {
  const inside = childCount(node.id)
  const from = cameFrom(data, node.id)
  const led = ledTo(data, node.id)
  const isCurrent = node.id === data.current
  const problem = problems.get(node.id)
  return html`
    <aside class="panel" aria-label=${t.panel.label}>
      <header class=${`panel-head k-${kindOf(node)}`}>
        <div class=${`status ${isCurrent ? 'is-here' : ''}`}>
          <${Badge} node=${node} size=${18} />
          <span>${labelText(node)}${isCurrent ? ` · ${t.here}` : ''}</span>
        </div>
        <h2><span class="nid">${node.id}</span> ${node.title}</h2>
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
            <button class="action" onClick=${() => onToggle(node.id)}>${expanded.has(node.id) ? t.panel.closeSteps : t.panel.openSteps}</button>
            ${focus !== node.id && html`<button class="action quiet" onClick=${() => onFocus(node.id)}>${t.panel.showOnly}</button>`}
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

/** What the agent reads at every prompt (R7), hidden until asked. */
function AgentSummary({ onClose }) {
  return html`
    <div class="agent-summary" role="dialog" aria-label=${t.agentReads}>
      <div class="agent-summary-head"><b>${t.agentReads}</b><button class="action quiet" onClick=${onClose}>${t.closeSummary}</button></div>
      <pre>${agentSummary}</pre>
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
  const [summaryOpen, setSummaryOpen] = useState(false)
  const tipTimer = useRef(null)
  // Where to fly after the next layout (a step chosen from the panel or the breadcrumb), and the step just reached.
  const [flyTo, setFlyTo] = useState(null)
  const [arriving, setArriving] = useState(null)
  const flow = useReactFlow()

  // A reload keeps the viewport: only a change you made refits the view.
  const drawn = useRef(version)
  useEffect(() => {
    let alive = true
    const reloaded = drawn.current !== version
    drawn.current = version
    layout(expanded, focus, revealed).then(next => {
      if (!alive) return
      setGraph(next)
      if (!flyTo && !reloaded) requestAnimationFrame(() => flow.fitView({ padding: 0.12, duration: 240 }))
    })
    return () => { alive = false }
  }, [expanded, focus, revealed, version])

  useEffect(() => {
    const timer = setInterval(async () => {
      const next = await readFiles().catch(() => null)
      if (!next || `${next[0]}\0${next[1]}` === loaded) return
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
    requestAnimationFrame(() => flow.fitView({ nodes: [{ id: flyTo }], padding: 0.6, maxZoom: 1.1, duration: 500 }))
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

  const choose = useCallback(id => {
    setSelected(id)
    setFlyTo(id)
    // Make sure the step is drawn: open everything that contains it and every level it sits in.
    const holders = pathTo(data, id).slice(0, -1).map(n => n.id)
    setExpanded(prev => (holders.every(at => prev.has(at)) ? prev : new Set([...prev, ...holders])))
    const levels = [...holders, id].map(levelKey)
    reveal(byId.get(id)?.status === 'replaced' ? [...levels, `replaced:${levelKey(id)}`] : levels)
  }, [])

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
      <div class="shell">
        <header class="bar">
          <div class="brand">ariadne<span>·</span></div>
          <nav class="where" aria-label=${t.here}>
            <span class="where-label">${t.here}</span>
            <span>${data.project}</span>
            ${path.map((n, i) => html`
              <span class="sep" key=${`s${n.id}`}>›</span>
              <button key=${n.id} class=${`crumb ${i === path.length - 1 ? 'is-here' : ''}`} onClick=${() => choose(n.id)}>${n.title}</button>`)}
          </nav>
          ${focus && html`<div class="focus-note">${t.only(byId.get(focus).title)} <button onClick=${() => setFocus(null)}>${t.showAll}</button></div>`}
          ${agentSummary && html`<button class="action quiet" aria-expanded=${summaryOpen} onClick=${() => setSummaryOpen(o => !o)}>${t.agentReads}</button>`}
          <div class="levels" role="group" aria-label=${t.detail}>
            ${['milestones', 'path', 'all'].map(key => html`
              <button key=${key} aria-pressed=${level === key} onClick=${() => showLevel(key)}>${t.levels[key]}</button>`)}
          </div>
        </header>
        <main class="canvas">
          ${missing && html`<p class="no-graph">${t.noGraph}</p>`}
          <div class="overlays">
            <${Invalid} />
            ${summaryOpen && html`<${AgentSummary} onClose=${() => setSummaryOpen(false)} />`}
          </div>
          <${ReactFlow}
            nodes=${graph.nodes}
            edges=${graph.edges}
            nodeTypes=${nodeTypes}
            edgeTypes=${edgeTypes}
            onNodeClick=${(_, n) => n.type !== 'more' && setSelected(n.id)}
            onMoveStart=${() => hover(null)}
            nodesDraggable=${false}
            nodesConnectable=${false}
            minZoom=${0.2}
            proOptions=${{ hideAttribution: true }}
          >
            <${Background} gap=${24} size=${1} color="#cfd5dc" />
            <${Controls} position="bottom-right" showInteractive=${false} />
          <//>
          ${!missing && html`<${Legend} />`}
        </main>
        ${node && html`<${Panel} node=${node} expanded=${expanded} focus=${focus}
          onSelect=${choose} onToggle=${toggle}
          onFocus=${id => { setFocus(id); setExpanded(prev => new Set([...prev, id])) }} />`}
      </div>
      <${Tip} tip=${tip} />
    <//>`
}

createRoot(document.getElementById('app')).render(html`<${ReactFlowProvider}><${App} /><//>`)
