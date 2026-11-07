import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Background, Controls, Handle, MarkerType, Position, ReactFlow, ReactFlowProvider, useReactFlow } from '@xyflow/react'
import ELK from 'elkjs'
import htm from 'htm'

import { data } from './data.js'
import {
  cameFrom, defaultExpanded, hasChildren, holdsCurrent, ledTo, pathTo, threadSet, visibleEdges, visibleNodes,
} from './model.js'

const html = htm.bind(React.createElement)
const elk = new ELK()

const STEP = { width: 216, height: 64 }
const GLYPH = { done: '✓', active: '◐', todo: '○', dropped: '×' }
const WORDS = { done: 'Done', active: 'In progress', todo: 'To do', dropped: 'Dropped' }
const ROOT = '/Users/danieleangioni/Sviluppo/Personal/ariadne-thread'

const byId = new Map(data.nodes.map(n => [n.id, n]))
const thread = threadSet(data)
const childCount = id => data.nodes.filter(n => n.parent === id).length
const allContainers = () => new Set(data.nodes.filter(n => hasChildren(data, n.id)).map(n => n.id))

function metaOf(node) {
  if (node.id === data.current) return 'You are here'
  if (holdsCurrent(data, node.id)) return 'You are inside'
  if (node.kind === 'detour') return 'Side question'
  return WORDS[node.status]
}

function classesOf(node, selected) {
  return [
    `s-${node.status}`,
    thread.has(node.id) && 'is-thread',
    node.kind === 'detour' && 'is-detour',
    holdsCurrent(data, node.id) && 'holds-current',
    node.id === data.current && 'is-current',
    node.id === selected && 'is-selected',
  ].filter(Boolean).join(' ')
}

/** ELK lays out the visible nodes, open containers holding their children. */
async function layout(expanded, focus) {
  const shown = visibleNodes(data, expanded, focus)
  const shownIds = new Set(shown.map(n => n.id))
  const edges = visibleEdges(data, expanded, focus)
  const isOpen = n => expanded.has(n.id) && hasChildren(data, n.id)

  const toElk = n => isOpen(n)
    ? {
        id: n.id,
        layoutOptions: { 'elk.padding': '[top=56,left=20,bottom=20,right=20]' },
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
      'elk.layered.spacing.nodeNodeBetweenLayers': '48',
      'elk.spacing.nodeNode': '28',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
    },
    children: roots.map(toElk),
    edges: edges.map(e => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  })

  const nodes = []
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

  return {
    nodes,
    edges: edges.map(e => {
      const color = e.isThread ? 'var(--thread)' : e.isDetour ? 'var(--detour)' : 'var(--line)'
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'smoothstep',
        pathOptions: { borderRadius: 12 },
        zIndex: 2,
        style: { stroke: color, strokeWidth: e.isThread ? 2.5 : 1.25, strokeDasharray: e.isDetour ? '5 4' : undefined },
        markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color },
      }
    }),
  }
}

const Ctx = React.createContext(null)

function Step({ data: { node } }) {
  const { selected, toggle } = React.useContext(Ctx)
  const inside = childCount(node.id)
  return html`
    <div class=${`step ${classesOf(node, selected)}`}>
      <${Handle} type="target" position=${Position.Left} />
      <span class="glyph" aria-hidden="true">${GLYPH[node.status]}</span>
      <div class="txt">
        <div class="title">${node.title}</div>
        <div class="meta">${metaOf(node)}</div>
      </div>
      ${inside > 0 && html`
        <button class="expand" aria-label=${`Open ${inside} steps inside ${node.title}`}
          onClick=${e => { e.stopPropagation(); toggle(node.id) }}>+${inside}</button>`}
      <div class="tip" role="tooltip">${node.summary}</div>
      <${Handle} type="source" position=${Position.Right} />
    </div>`
}

function Group({ data: { node } }) {
  const { selected, toggle } = React.useContext(Ctx)
  return html`
    <div class=${`group ${classesOf(node, selected)}`}>
      <${Handle} type="target" position=${Position.Left} />
      <div class="group-head">
        <span class="glyph" aria-hidden="true">${GLYPH[node.status]}</span>
        <div class="title">${node.title}</div>
        <div class="meta">${metaOf(node)}</div>
        <button class="expand" aria-label=${`Close ${node.title}`}
          onClick=${e => { e.stopPropagation(); toggle(node.id) }}>−</button>
        <div class="tip" role="tooltip">${node.summary}</div>
      </div>
      <${Handle} type="source" position=${Position.Right} />
    </div>`
}

const nodeTypes = { step: Step, group: Group }

function Panel({ node, expanded, focus, onSelect, onToggle, onFocus, onToast }) {
  const inside = childCount(node.id)
  const from = cameFrom(data, node.id)
  const led = ledTo(data, node.id)
  const isCurrent = node.id === data.current
  return html`
    <aside class="panel" aria-label="Step details">
      <div class=${`status ${isCurrent ? 'is-here' : ''}`}>
        <span aria-hidden="true">${GLYPH[node.status]}</span>
        <span>${WORDS[node.status]}${node.kind === 'detour' ? ', side question' : ''}${isCurrent ? ', you are here' : ''}</span>
      </div>
      <h2>${node.title}</h2>
      <p class="summary">${node.summary}</p>

      <h3>Why</h3>
      <p>${node.detail}</p>

      ${inside > 0 && html`
        <h3>Inside</h3>
        <p>${inside} steps</p>
        <div class="row-actions">
          <button class="action" onClick=${() => onToggle(node.id)}>${expanded.has(node.id) ? 'Close' : 'Open'} steps</button>
          ${focus !== node.id && html`<button class="action quiet" onClick=${() => onFocus(node.id)}>Show only this</button>`}
        </div>`}

      ${from.length > 0 && html`
        <h3>Came from</h3>
        <div class="chips">${from.map(n => html`<button class="chip" key=${n.id} onClick=${() => onSelect(n.id)}>${n.title}</button>`)}</div>`}

      ${led.length > 0 && html`
        <h3>Led to</h3>
        <div class="chips">${led.map(n => html`<button class="chip" key=${n.id} onClick=${() => onSelect(n.id)}>${n.title}</button>`)}</div>`}

      <h3>Files</h3>
      ${node.files?.length
        ? html`<ul class="files">${node.files.map(f => html`
            <li key=${f}><a href=${`vscode://file/${f.startsWith('~') ? f : `${ROOT}/${f}`}`}>${f}</a></li>`)}</ul>`
        : html`<p class="empty">No files yet.</p>`}

      <h3>In the chat</h3>
      ${node.chat?.length
        ? node.chat.map((m, i) => html`
            <div class=${`moment ${m.role === 'user' ? 'is-user' : ''}`} key=${i}>
              <div class="who">${m.role === 'user' ? 'You' : 'Claude'}, ${m.at}</div>
              <p>${m.text}</p>
              <div class="row-actions">
                <button class="action quiet" title="Simulated in this spike"
                  onClick=${() => onToast('Sent to Claude Code. Press Go in the band above the prompt.')}>Show in chat</button>
              </div>
            </div>`)
        : html`<p class="empty">No chat moments linked yet.</p>`}
    </aside>`
}

function App() {
  // ?level=milestones|path|all and ?select=<id> open the page in a given state.
  const params = new URLSearchParams(location.search)
  const [level, setLevel] = useState(() => params.get('level') ?? 'path')
  const [expanded, setExpanded] = useState(() =>
    level === 'milestones' ? new Set() : level === 'all' ? allContainers() : defaultExpanded(data))
  const [focus, setFocus] = useState(null)
  const [selected, setSelected] = useState(() => (byId.has(params.get('select')) ? params.get('select') : data.current))
  const [graph, setGraph] = useState({ nodes: [], edges: [] })
  const [toast, setToast] = useState(null)
  const flow = useReactFlow()

  useEffect(() => {
    let alive = true
    layout(expanded, focus).then(next => {
      if (!alive) return
      setGraph(next)
      requestAnimationFrame(() => flow.fitView({ padding: 0.12, duration: 240 }))
    })
    return () => { alive = false }
  }, [expanded, focus])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

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
    // Make sure the step is drawn: open everything that contains it.
    setExpanded(prev => new Set([...prev, ...pathTo(data, id).slice(0, -1).map(n => n.id)]))
  }, [])

  const showLevel = name => {
    setLevel(name)
    setExpanded(name === 'milestones' ? new Set() : name === 'all' ? allContainers() : defaultExpanded(data))
  }

  const path = pathTo(data, data.current)
  const node = byId.get(selected) ?? byId.get(data.current)
  const ctx = useMemo(() => ({ selected, toggle }), [selected, toggle])

  return html`
    <${Ctx.Provider} value=${ctx}>
      <div class="shell">
        <header class="bar">
          <div class="brand">ariadne<span>·</span></div>
          <nav class="where" aria-label="Where you are">
            <span class="where-label">You are here</span>
            <span>${data.project}</span>
            ${path.map((n, i) => html`
              <span class="sep" key=${`s${n.id}`}>›</span>
              <button key=${n.id} class=${`crumb ${i === path.length - 1 ? 'is-here' : ''}`} onClick=${() => choose(n.id)}>${n.title}</button>`)}
          </nav>
          ${focus && html`<div class="focus-note">Only ${byId.get(focus).title} <button onClick=${() => setFocus(null)}>Show all</button></div>`}
          <div class="levels" role="group" aria-label="Detail">
            ${[['milestones', 'Milestones'], ['path', 'Where I am'], ['all', 'Everything']].map(([key, label]) => html`
              <button key=${key} aria-pressed=${level === key} onClick=${() => showLevel(key)}>${label}</button>`)}
          </div>
        </header>
        <main class="canvas">
          <${ReactFlow}
            nodes=${graph.nodes}
            edges=${graph.edges}
            nodeTypes=${nodeTypes}
            onNodeClick=${(_, n) => setSelected(n.id)}
            nodesDraggable=${false}
            nodesConnectable=${false}
            minZoom=${0.2}
            proOptions=${{ hideAttribution: true }}
          >
            <${Background} gap=${24} size=${1} color="#cfd5dc" />
            <${Controls} position="bottom-right" showInteractive=${false} />
          <//>
          <div class="legend" aria-label="Legend">
            <span><b>✓</b>Done</span><span><b>◐</b>In progress</span><span><b>○</b>To do</span>
            <span class="detour"><b>┅</b>Side question</span><span class="thread"><b>━</b>How you got here</span>
          </div>
        </main>
        <${Panel} node=${node} expanded=${expanded} focus=${focus}
          onSelect=${choose} onToggle=${toggle}
          onFocus=${id => { setFocus(id); setExpanded(prev => new Set([...prev, id])) }}
          onToast=${setToast} />
      </div>
      ${toast && html`<div class="toast" role="status">${toast}</div>`}
    <//>`
}

createRoot(document.getElementById('app')).render(html`<${ReactFlowProvider}><${App} /><//>`)
