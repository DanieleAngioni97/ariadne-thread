import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Background, BaseEdge, Controls, Handle, MarkerType, Position, ReactFlow, ReactFlowProvider, useReactFlow,
} from '@xyflow/react'
import ELK from 'elkjs'
import htm from 'htm'

import { parse } from '../src/graph.mjs'
import { lang, t } from './i18n.js'
import {
  anomalies, cameFrom, continuationOf, defaultExpanded, deferredCount, filesWithin, fromGraph, hasChildren, holdsCurrent,
  ledTo, origin, pathTo, threadSet, visibleEdges, visibleNodes,
} from './model.js'

const html = htm.bind(React.createElement)
const elk = new ELK()

const STEP = { width: 232, height: 64 }
const GLYPH = { done: '✓', active: '▶', todo: '○', deferred: '»', dropped: '×', detour: '↪' }

// The repo as it is now: `ariadne view` serves .ariadne/ and tells the page where the repo lives.
const read = path => fetch(path).then(r => (r.ok ? r.text() : null))
const [graphText, threadText, ROOT] = await Promise.all([read('.ariadne/graph.jsonl'), read('.ariadne/thread.json'), read('root')])
const data = fromGraph(parse(graphText ?? ''), threadText ? JSON.parse(threadText) : null)

document.documentElement.lang = lang

const byId = new Map(data.nodes.map(n => [n.id, n]))
const thread = threadSet(data)
const problems = new Map(anomalies(data).map(a => [a.id, a.reason]))
const childCount = id => data.nodes.filter(n => n.parent === id).length
const allContainers = () => new Set(data.nodes.filter(n => hasChildren(data, n.id)).map(n => n.id))
/** "M2 Progettazione" → "M2": the short name of the milestone holding `id`. */
const milestoneTag = id => pathTo(data, id)[0]?.title.split(' ')[0] ?? id

/** What a node is, at a glance: its look follows this, not the raw status. */
const kindOf = node => (node.kind === 'detour' ? 'detour' : node.status)

function metaOf(node) {
  if (node.id === data.current) return t.here
  if (holdsCurrent(data, node.id)) return t.inside
  if (node.kind === 'detour') return t.detour
  if (node.status === 'deferred') {
    const next = continuationOf(data, node.id)
    return next ? t.deferredTo(milestoneTag(next.id)) : t.status.deferred
  }
  const deferred = node.status === 'done' && deferredCount(data, node.id)
  return deferred ? t.closedWith(deferred) : t.status[node.status]
}

function classesOf(node, selected, arriving) {
  return [
    `k-${kindOf(node)}`,
    thread.has(node.id) && 'is-thread',
    holdsCurrent(data, node.id) && 'holds-current',
    node.id === data.current && 'is-current',
    node.id === selected && 'is-selected',
    node.id === arriving && 'is-arriving',
    problems.has(node.id) && 'has-anomaly',
  ].filter(Boolean).join(' ')
}

/** ELK lays out the visible nodes and routes the edges; edge points come back in root coordinates. */
async function layout(expanded, focus) {
  const shown = visibleNodes(data, expanded, focus)
  const shownIds = new Set(shown.map(n => n.id))
  const edges = visibleEdges(data, expanded, focus)
  const isOpen = n => expanded.has(n.id) && hasChildren(data, n.id)

  const toElk = n => isOpen(n)
    ? {
        id: n.id,
        layoutOptions: { 'elk.padding': '[top=60,left=24,bottom=24,right=24]' },
        children: shown.filter(c => c.parent === n.id).map(toElk),
      }
    : { id: n.id, ...STEP }

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
    const node = byId.get(elkNode.id)
    const open = isOpen(node)
    nodes.push({
      id: node.id,
      type: open ? 'group' : 'step',
      position: { x: elkNode.x ?? 0, y: elkNode.y ?? 0 },
      ...(parentId ? { parentId } : {}),
      ...(open ? { style: { width: elkNode.width, height: elkNode.height } } : {}),
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

/** The coloured badge that says what a node is, readable even zoomed out. */
const Badge = ({ node }) => html`<span class="badge" aria-hidden="true">${GLYPH[kindOf(node)]}</span>`
const Alert = ({ node }) => problems.has(node.id) && html`<span class="alert" title=${t.anomaly[problems.get(node.id)]}>!</span>`

function Step({ data: { node } }) {
  const { selected, arriving, toggle, hover } = React.useContext(Ctx)
  const inside = childCount(node.id)
  return html`
    <div class=${`step ${classesOf(node, selected, arriving)}`}
      onMouseEnter=${e => hover(node, e.currentTarget)} onMouseLeave=${() => hover(null)}>
      <${Handle} type="target" position=${Position.Left} />
      <${Badge} node=${node} />
      <div class="txt">
        <div class="title">${node.title}</div>
        <div class="meta">${metaOf(node)}</div>
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
        <${Badge} node=${node} />
        <div class="title">${node.title}</div>
        <div class="meta">${metaOf(node)}</div>
        <button class="expand" aria-label=${t.close(node.title)}
          onClick=${e => { e.stopPropagation(); toggle(node.id) }}>−</button>
      </div>
      <${Handle} type="source" position=${Position.Right} />
    </div>`
}

const nodeTypes = { step: Step, group: Group }
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
  return html`<div class="tip" role="tooltip" style=${style}>${node.summary}</div>`
}

const Chip = ({ node, onSelect }) => html`
  <button class=${`chip k-${kindOf(node)}`} onClick=${() => onSelect(node.id)}>
    <${Badge} node=${node} /><span>${node.title}</span>
  </button>`

/** Files touched in this step and in every step inside it, split into created and edited. */
function Files({ node, onSelect }) {
  const files = filesWithin(data, node.id)
  if (!files.length) return html`<p class="empty">${t.panel.noFiles}</p>`
  const groups = [['created', t.panel.created], ['edited', t.panel.edited]]
    .map(([change, label]) => [label, files.filter(f => f.change === change)])
    .filter(([, list]) => list.length)
  return groups.map(([label, list]) => html`
    <div class="file-group" key=${label}>
      <div class="sub">${label} <span class="count">${list.length}</span></div>
      <ul class="files">${list.map(f => html`
        <li key=${f.path}>
          <a href=${`vscode://file/${f.path.startsWith('~') ? f.path : `${ROOT}/${f.path}`}`}><code>${f.path}</code></a>
          ${f.reasons.map(r => html`
            <p key=${r.step}>
              ${r.step !== node.id && html`<button class="step-link" onClick=${() => onSelect(r.step)}>${byId.get(r.step).title}</button> `}
              ${r.why}
            </p>`)}
        </li>`)}
      </ul>
    </div>`)
}

function Panel({ node, expanded, focus, onSelect, onToggle, onFocus, onToast }) {
  const inside = childCount(node.id)
  const from = cameFrom(data, node.id)
  const led = ledTo(data, node.id)
  const next = continuationOf(data, node.id)
  const picks = origin(data, node.id)
  const isCurrent = node.id === data.current
  const problem = problems.get(node.id)
  return html`
    <aside class="panel" aria-label=${t.panel.label}>
      <header class=${`panel-head k-${kindOf(node)}`}>
        <div class=${`status ${isCurrent ? 'is-here' : ''}`}>
          <${Badge} node=${node} />
          <span>${node.kind === 'detour' ? t.detour : t.status[node.status]}${isCurrent ? ` · ${t.here}` : ''}</span>
        </div>
        <h2>${node.title}</h2>
        <p class="summary">${node.summary}</p>
      </header>

      ${problem && html`<div class="warning" role="alert"><b>!</b> ${t.anomaly[problem]}</div>`}

      ${node.deferred && html`
        <section class="deferred-box">
          <h3>${t.panel.deferred}</h3>
          <p>${node.deferred.why}</p>
          ${next && html`<div class="sub">${t.panel.continuesIn}</div><div class="chips"><${Chip} node=${next} onSelect=${onSelect} /></div>`}
        </section>`}

      ${picks && html`
        <section>
          <h3>${t.panel.picksUp}</h3>
          <div class="chips"><${Chip} node=${picks} onSelect=${onSelect} /></div>
          <p class="note">${picks.deferred?.why}</p>
        </section>`}

      ${node.detail && html`<section><h3>${t.panel.why}</h3><p>${node.detail}</p></section>`}

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

      <section>
        <h3>${t.panel.files}</h3>
        <${Files} node=${node} onSelect=${onSelect} />
      </section>

      <section>
        <h3>${t.panel.chat}</h3>
        ${node.chat?.length
          ? node.chat.map((m, i) => html`
              <div class=${`moment ${m.role === 'user' ? 'is-user' : ''}`} key=${i}>
                <div class="who">${m.role === 'user' ? t.panel.you : 'Claude'}, ${m.at}</div>
                <p>${m.text}</p>
                <div class="row-actions">
                  <button class="action quiet" title=${t.panel.simulated} onClick=${() => onToast(t.panel.sent)}>${t.panel.showInChat}</button>
                </div>
              </div>`)
          : html`<p class="empty">${t.panel.noChat}</p>`}
      </section>
    </aside>`
}

function Legend() {
  const item = (kind, label) => html`<span class=${`k-${kind}`} key=${kind}><span class="badge">${GLYPH[kind]}</span>${label}</span>`
  return html`
    <div class="legend" aria-label="Legend">
      ${['done', 'active', 'todo', 'deferred'].map(k => item(k, t.status[k]))}
      ${item('detour', t.detour)}
      <span class="current-key"><i></i>${t.legend.current}</span>
      <span class="thread"><b>━</b>${t.legend.thread}</span>
      ${problems.size > 0 && html`<span class="anomaly-key"><span class="alert">!</span>${t.legend.anomaly}</span>`}
    </div>`
}

function App() {
  // ?level=milestones|path|all, ?select=<id> and ?lang=xx open the page in a given state.
  const params = new URLSearchParams(location.search)
  const [level, setLevel] = useState(() => params.get('level') ?? 'path')
  const [expanded, setExpanded] = useState(() =>
    level === 'milestones' ? new Set() : level === 'all' ? allContainers() : defaultExpanded(data))
  const [focus, setFocus] = useState(null)
  const [selected, setSelected] = useState(() => (byId.has(params.get('select')) ? params.get('select') : data.current))
  const [graph, setGraph] = useState({ nodes: [], edges: [] })
  const [toast, setToast] = useState(null)
  const [tip, setTip] = useState(null)
  const tipTimer = useRef(null)
  // Where to fly after the next layout (a step chosen from the panel or the breadcrumb), and the step just reached.
  const [flyTo, setFlyTo] = useState(null)
  const [arriving, setArriving] = useState(null)
  const flow = useReactFlow()

  useEffect(() => {
    let alive = true
    layout(expanded, focus).then(next => {
      if (!alive) return
      setGraph(next)
      if (!flyTo) requestAnimationFrame(() => flow.fitView({ padding: 0.12, duration: 240 }))
    })
    return () => { alive = false }
  }, [expanded, focus])

  // Zoom onto the chosen step once it is drawn, then make it pulse so the eye lands on it.
  useEffect(() => {
    if (!flyTo || !graph.nodes.some(n => n.id === flyTo)) return
    requestAnimationFrame(() => flow.fitView({ nodes: [{ id: flyTo }], padding: 0.6, maxZoom: 1.1, duration: 500 }))
    setArriving(flyTo)
    setFlyTo(null)
    const timer = setTimeout(() => setArriving(null), 1600)
    return () => clearTimeout(timer)
  }, [graph, flyTo])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(timer)
  }, [toast])

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

  const choose = useCallback(id => {
    setSelected(id)
    setFlyTo(id)
    // Make sure the step is drawn: open everything that contains it (a new set only if something opens).
    const holders = pathTo(data, id).slice(0, -1).map(n => n.id)
    setExpanded(prev => (holders.every(at => prev.has(at)) ? prev : new Set([...prev, ...holders])))
  }, [])

  const showLevel = name => {
    setLevel(name)
    setExpanded(name === 'milestones' ? new Set() : name === 'all' ? allContainers() : defaultExpanded(data))
  }

  const path = pathTo(data, data.current)
  const node = byId.get(selected) ?? byId.get(data.current)
  const ctx = useMemo(() => ({ selected, arriving, toggle, hover }), [selected, arriving, toggle, hover])

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
          <div class="levels" role="group" aria-label=${t.detail}>
            ${['milestones', 'path', 'all'].map(key => html`
              <button key=${key} aria-pressed=${level === key} onClick=${() => showLevel(key)}>${t.levels[key]}</button>`)}
          </div>
        </header>
        <main class="canvas">
          <${ReactFlow}
            nodes=${graph.nodes}
            edges=${graph.edges}
            nodeTypes=${nodeTypes}
            edgeTypes=${edgeTypes}
            onNodeClick=${(_, n) => setSelected(n.id)}
            onMoveStart=${() => hover(null)}
            nodesDraggable=${false}
            nodesConnectable=${false}
            minZoom=${0.2}
            proOptions=${{ hideAttribution: true }}
          >
            <${Background} gap=${24} size=${1} color="#cfd5dc" />
            <${Controls} position="bottom-right" showInteractive=${false} />
          <//>
          <${Legend} />
        </main>
        <${Panel} node=${node} expanded=${expanded} focus=${focus}
          onSelect=${choose} onToggle=${toggle}
          onFocus=${id => { setFocus(id); setExpanded(prev => new Set([...prev, id])) }}
          onToast=${setToast} />
      </div>
      <${Tip} tip=${tip} />
      ${toast && html`<div class="toast" role="status">${toast}</div>`}
    <//>`
}

createRoot(document.getElementById('app')).render(html`<${ReactFlowProvider}><${App} /><//>`)
