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
import { absoluteOf, fitTarget, keepAt, nearest, offscreen, viewportFor } from './nav.js'
import { dayOffset, groupOf, kindOf, lastActivity, listCounts, listRows, openComments, parseLog, reviewQueue, searchNodes, timeline } from './views.js'
import { lang, t } from './i18n.js'
import { CHOICES, readSettings, writeSetting } from './settings.js'
import {
  anomalies, cameFrom, defaultExpanded, emptyNote, fromGraph, hasChildren, holdsCurrent, labelOf, ledTo, panelRows, pathTo, threadSet,
  limitOf, visibleEdges, visibleNodes, progressOf } from './model.js'

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
// The zoom below which a 14px title drops under 11px on screen: automatic fits never go lower.
const READABLE = 0.8
const FIT_PAD = 40
const FLY_PAD = 160
const ARROWS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }
const GROUP_HEAD = 48
// The join bar of a container with parallel branches (m7.2): a node of its own in the layout.
const JOIN = '::join'
const JOIN_SIZE = { width: 36, height: 64 }

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
/** Light or dark on the page; «auto» follows the system. */
const applyTheme = theme => {
  if (theme === 'auto') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = theme
}
applyTheme(readSettings(localStorage).theme)
// The summary from src/ speaks the interface's language.
globalThis.ARIADNE_LANG = lang

// Your acts on the graph go through the viewer's server, as you (m6.19): null when done, else the refusal.
// The page then reads the files again at once instead of at the next tick.
const act = body => fetch('act', { method: 'POST', headers: { 'content-type': 'application/json', 'x-ariadne-act': '1' }, body: JSON.stringify(body) })
  .then(async r => {
    if (!r.ok) return (await r.text()) || String(r.status)
    dispatchEvent(new Event('ariadne:changed'))
    return null
  }, error => error.message)

/** Approve or reject one node the agent added alone. */
function ReviewActions({ id }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const run = async body => { setBusy(true); setError(await act(body)); setBusy(false) }
  return html`
    <div class="review-actions">
      <button class="btn btn-primary" disabled=${busy} onClick=${() => run({ op: 'confirm', id })}>${t.review.approve}</button>
      <button class="btn" disabled=${busy} onClick=${() => run({ op: 'reject', id })}>${t.review.reject}</button>
      ${error && html`<span class="act-error" role="alert">${error}</span>`}
    </div>`
}

/** Your comments on a node, the agent's answers, and a box for a new one. */
function Comments({ node }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const list = node.comments ?? []
  const send = async e => {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    const refused = await act({ op: 'comment', id: node.id, text })
    setError(refused)
    if (!refused) setText('')
    setBusy(false)
  }
  return html`
    <section>
      <h3>${t.comments.title}${openComments(node).length ? ` · ${t.comments.open(openComments(node).length)}` : ''}</h3>
      ${list.length > 0 && html`
        <ol class="comments">
          ${list.map((c, i) => html`
            <li key=${i}>
              <p>${c.text}</p>
              <span class="when">${shortDate(c.at)} ${timeOf(c.at)}</span>
              ${c.answer ? html`<p class="answer"><b>${t.comments.agent}</b> ${c.answer.text}</p>` : html`<p class="waiting">${t.comments.waiting}</p>`}
            </li>`)}
        </ol>`}
      <form class="comment-form" onSubmit=${send}>
        <textarea rows="3" value=${text} onInput=${e => setText(e.target.value)} placeholder=${t.comments.placeholder} aria-label=${t.comments.title}></textarea>
        <div class="row-actions">
          <button class="btn" type="submit" disabled=${busy || !text.trim()}>${t.comments.send}</button>
          <span class="hint">${t.comments.hint}</span>
        </div>
        ${error && html`<p class="act-error" role="alert">${error}</p>`}
      </form>
    </section>`
}

const childCount = id => data.nodes.filter(n => n.parent === id).length
const allContainers = () => new Set(data.nodes.filter(n => hasChildren(data, n.id)).map(n => n.id))
/** The key of the level that holds `id`, as the window and its markers name it. */
const levelKey = id => byId.get(id)?.parent ?? ''


/** The words at the right of a node (specifica § Viewer), else its status. */
function labelText(node) {
  const label = labelOf(data, node.id)
  if (!label) return ['detour', 'decision', 'risk'].includes(kindOf(node)) ? t.kind[kindOf(node)] : t.status[node.status]
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

  // An open container whose sub-steps run in two or more branches ends in a join bar: all of them close it.
  const joins = shown.filter(n => isOpen(n) && n.kind !== 'milestone' && (progressOf(data, n.id)?.ends.filter(id => shownIds.has(id)).length ?? 0) >= 2)
  const joinEdges = joins.flatMap(n => progressOf(data, n.id).ends.filter(id => shownIds.has(id)).map(id => ({ id: `${id}->${n.id}${JOIN}`, source: id, target: n.id + JOIN, isJoin: true })))
  const toElk = n => isOpen(n)
    ? {
        id: n.id,
        layoutOptions: { 'elk.padding': '[top=60,left=24,bottom=24,right=24]' },
        children: [...shown.filter(c => c.parent === n.id).map(toElk), ...(joins.includes(n) ? [{ id: n.id + JOIN, ...JOIN_SIZE }] : [])],
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
    edges: [...edges, ...joinEdges].map(e => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  })

  const nodes = []
  const routes = new Map()
  const walk = (elkNode, parentId) => {
    if (elkNode.id.endsWith(JOIN)) {
      nodes.push({ id: elkNode.id, type: 'join', position: { x: elkNode.x ?? 0, y: elkNode.y ?? 0 }, parentId, style: { width: elkNode.width, height: elkNode.height }, data: { node: byId.get(parentId) }, draggable: false, selectable: false, zIndex: 1 })
      return
    }
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
    edges: [...edges, ...joinEdges].map(e => {
      const color = e.isThread ? 'var(--thread)' : e.isDetour ? 'var(--detour)' : 'var(--line-strong)'
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'routed',
        data: { sections: routes.get(e.id) ?? [] },
        zIndex: 2,
        style: { stroke: color, strokeWidth: e.isThread ? 2.5 : 1.5, strokeDasharray: e.isDetour ? '5 4' : e.isJoin ? '2 3' : undefined },
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
        <div class="meta">${[labelText(node), progressOf(data, node.id) && t.progress(progressOf(data, node.id))].filter(Boolean).join(' · ')}</div>
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
        <div class="txt">
          <div class="title"><span class="nid">${node.id}</span> ${node.title}</div>
          <div class="meta">${[labelText(node), progressOf(data, node.id) && `${t.progress(progressOf(data, node.id))} · ${t.closesWith}`].filter(Boolean).join(' · ')}</div>
        </div>
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
      <button onClick=${e => { e.stopPropagation(); reveal([key], node.id) }}>${t.more.show}</button>
      <${Handle} type="source" position=${Position.Right} />
    </div>`
}

/** Where the branches of a container meet: it closes when all of them are done (AND-join, m7.2). */
function Join({ data: { node } }) {
  const p = progressOf(data, node.id)
  return html`
    <div class=${`join ${p.done === p.total ? 'is-done' : ''}`} title=${t.joinHint(node.title)}>
      <${Handle} type="target" position=${Position.Left} />
      <div class="join-line"></div>
      <div class="count">${p.done}/${p.total}</div>
    </div>`
}

const nodeTypes = { step: Step, group: Group, more: More, join: Join }
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
      ${node.review === 'confirm' && html`
        <div class="review-box">
          <p>${t.review.note}</p>
          <${ReviewActions} key=${node.id} id=${node.id} />
        </div>`}
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

      <${Comments} key=${node.id} node=${node} />

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
const KINDS = ['active', 'done', 'todo', 'deferred', 'detour', 'decision', 'risk', 'dropped']

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
          <p class="legend-keys">${t.keys}</p>
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
/** On opening a sheet, the chosen node's row comes into sight: the same node across the views. */
const useSelectedInSight = () => useEffect(() => {
  requestAnimationFrame(() => document.querySelector('.sheet .is-selected')?.scrollIntoView({ block: 'center' }))
}, [])

function Timeline({ query, selected, onSelect, onMenu }) {
  useSelectedInSight()
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
                    title=${e.text} onClick=${() => node && onSelect(node.id)} onContextMenu=${ev => node && onMenu(ev, node.id)}>
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

/** Everything the agent added or changed alone, to approve or reject one by one or all at once. */
function ReviewQueue({ selected, onSelect }) {
  const rows = reviewQueue(data)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const all = async () => { setBusy(true); setError(await act({ op: 'confirmAll' })); setBusy(false) }
  const why = node => t.review.why[node.status === 'deferred' ? 'deferred' : node.status === 'replaced' ? 'replaced' : node.kind === 'milestone' ? 'milestone' : 'added']
  return html`
    <section class="sheet" aria-label=${t.views.review(rows.length)}>
      <div class="review-head">
        <p>${rows.length ? t.review.intro(rows.length) : t.review.none}</p>
        ${rows.length > 1 && html`<button class="btn btn-primary" disabled=${busy} onClick=${all}>${t.review.approveAll(rows.length)}</button>`}
        ${error && html`<span class="act-error" role="alert">${error}</span>`}
      </div>
      <ul class="review-list">
        ${rows.map(({ node, milestone }) => html`
          <li key=${node.id} class=${`review-item k-${kindOf(node)} ${node.id === selected ? 'is-selected' : ''}`}>
            <button class="row-title" onClick=${() => onSelect(node.id)}>
              <span class="badge"><${StatusIcon} kind=${kindOf(node)} /></span>
              <span><span class="nid">${node.id}</span> ${node.title}</span>
            </button>
            <p class="review-what"><b>${why(node)}</b>${node.what && node.what !== node.title ? ` · ${node.what}` : ''}</p>
            <p class="muted">${[milestone?.title, node.at && shortDate(node.at)].filter(Boolean).join(' · ')}</p>
            <${ReviewActions} id=${node.id} />
          </li>`)}
      </ul>
    </section>`
}

const FILTERS = ['all', 'active', 'todo', 'done', 'deferred', 'detour', 'decision', 'risk', 'dropped']

/**
 * Every node in graph order. Like an issue list: status chips that combine (none = all), a milestone
 * filter, the shared search, and a reset.
 */
function NodeList({ query, selected, onSelect, onMenu }) {
  useSelectedInSight()
  const [kinds, setKinds] = useState(() => new Set())
  const [milestone, setMilestone] = useState('')
  const counts = listCounts(data)
  const rows = listRows(data, { filter: kinds, query, milestone: milestone || null })
  const flat = kinds.size > 0 || query || milestone
  const flip = key => setKinds(prev => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })
  const milestones = data.nodes.filter(n => n.kind === 'milestone')
  return html`
    <section class="sheet" aria-label=${t.views.list}>
      <div class="filters" role="group" aria-label=${t.filters}>
        <span class="filter-label">${t.status}</span>
        ${FILTERS.filter(key => key !== 'all' && counts[key] > 0).map(key => html`
          <button key=${key} class=${`filter k-${key}`} aria-pressed=${kinds.has(key)} onClick=${() => flip(key)}>
            <${StatusIcon} kind=${key} size=${14} />
            ${t.kinds[key]} <span class="count">${counts[key]}</span>
          </button>`)}
        <select class="filter-select" aria-label=${t.cols.milestone} value=${milestone} onChange=${e => setMilestone(e.target.value)}>
          <option value="">${t.anyMilestone}</option>
          ${milestones.map(m => html`<option key=${m.id} value=${m.id}>${m.title}</option>`)}
        </select>
        ${(kinds.size > 0 || milestone) && html`
          <button class="link" onClick=${() => { setKinds(new Set()); setMilestone('') }}>${t.clearFilters}</button>`}
        <span class="count filter-total">${rows.length} / ${counts.all}</span>
      </div>
      ${rows.length === 0 && html`<p class="empty">${t.noNodes(query)}</p>`}
      ${rows.length > 0 && html`
        <table class="nodes">
          <thead><tr><th>${t.cols.title}</th><th>${t.cols.milestone}</th><th>${t.cols.last}</th></tr></thead>
          <tbody>
            ${rows.map(({ node, depth, milestone: m }) => html`
              <tr key=${node.id} class=${`k-${kindOf(node)} ${node.id === selected ? 'is-selected' : ''} ${node.id === data.current ? 'is-current' : ''}`}>
                <td>
                  <button class="row-title" style=${{ paddingLeft: `${8 + (flat ? 0 : depth * 18)}px` }}
                    onClick=${() => onSelect(node.id)} onContextMenu=${e => onMenu(e, node.id)}>
                    <span class="badge"><${StatusIcon} kind=${kindOf(node)} /></span>
                    <span><span class="nid">${node.id}</span> ${node.title}</span>
                  </button>
                </td>
                <td class="muted">${m?.title ?? ''}</td>
                <td class="muted nowrap">${lastAt.has(node.id) ? shortDate(lastAt.get(node.id)) : ''}</td>
              </tr>`)}
          </tbody>
        </table>`}
    </section>`
}

/** The settings: theme, language (it reloads the page) and the level the graph opens on. */
function Settings() {
  const [open, setOpen] = useState(false)
  const [now, setNow] = useState(() => readSettings(localStorage))
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onKey = e => e.key === 'Escape' && close()
    addEventListener('click', close)
    addEventListener('keydown', onKey)
    return () => { removeEventListener('click', close); removeEventListener('keydown', onKey) }
  }, [open])
  const set = (key, value) => {
    setNow(writeSetting(localStorage, key, value))
    if (key === 'theme') applyTheme(value)
    if (key === 'lang') location.reload()
  }
  const label = (key, value) => (key === 'level' ? t.levels[value] : t.settings[value])
  return html`
    <div class="settings" onClick=${e => e.stopPropagation()}>
      <button class="gear" aria-label=${t.settings.title} title=${t.settings.title} aria-expanded=${open} onClick=${() => setOpen(o => !o)}>
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8.4 4.6-.1-2.2 2-1.6-2-3.4-2.4.8a8 8 0 0 0-1.9-1.1L15.5 3h-4l-.5 2.6a8 8 0 0 0-1.9 1.1l-2.4-.8-2 3.4 2 1.6a8 8 0 0 0 0 2.2l-2 1.6 2 3.4 2.4-.8a8 8 0 0 0 1.9 1.1l.5 2.6h4l.5-2.6a8 8 0 0 0 1.9-1.1l2.4.8 2-3.4Z"/></svg>
      </button>
      ${open && html`
        <div class="settings-pop" role="dialog" aria-label=${t.settings.title}>
          ${Object.keys(CHOICES).map(key => html`
            <div class="setting" key=${key}>
              <span class="filter-label">${t.settings[key]}</span>
              <div class="seg" role="group" aria-label=${t.settings[key]}>
                ${CHOICES[key].map(v => html`<button key=${v} aria-pressed=${now[key] === v} onClick=${() => set(key, v)}>${label(key, v)}</button>`)}
              </div>
            </div>`)}
        </div>`}
    </div>`
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
  const [level, setLevel] = useState(() => params.get('level') ?? readSettings(localStorage).level)
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
  const [view, setView] = useState(() => (['timeline', 'list', 'review'].includes(params.get('view')) ? params.get('view') : 'graph'))
  const [query, setQuery] = useState('')
  const searchRef = useRef(null)
  const tipTimer = useRef(null)
  // Where to fly after the next layout (a step chosen from the panel or the breadcrumb), and the step just reached.
  const [flyTo, setFlyTo] = useState(null)
  const [arriving, setArriving] = useState(null)
  // True while a fly waits for the layout its choice asked for.
  const waitLayout = useRef(false)
  const flow = useReactFlow()

  const stageRef = useRef(null)
  /** The part of the stage not under the panel, in screen pixels: every fit frames inside it. */
  const viewSize = () => ({
    width: (stageRef.current?.clientWidth ?? innerWidth) - (panelOpen ? PANEL_WIDTH : 0),
    height: stageRef.current?.clientHeight ?? innerHeight,
  })
  /** The box around drawn nodes, from their absolute positions (children of open containers included). */
  const boundsOf = ids => {
    const boxes = ids.map(id => flow.getInternalNode(id)).filter(Boolean).map(n => {
      const at = n.internals.positionAbsolute
      return { x: at.x, y: at.y, right: at.x + (n.measured.width ?? 0), bottom: at.y + (n.measured.height ?? 0) }
    })
    const x = Math.min(...boxes.map(b => b.x))
    const y = Math.min(...boxes.map(b => b.y))
    return { x, y, width: Math.max(...boxes.map(b => b.right)) - x, height: Math.max(...boxes.map(b => b.bottom)) - y }
  }
  /** Runs `fn` once every node in `ids` is drawn and measured: a frame needs real sizes. */
  const whenDrawn = (ids, fn) => {
    let tries = 0
    const step = () => {
      if (ids.every(id => flow.getInternalNode(id)?.measured?.width)) fn()
      else if (tries++ < 60) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }
  const frame = (ids, { pad = FIT_PAD, maxZoom = 1.1, duration = 240 } = {}) =>
    flow.setViewport(viewportFor(boundsOf(ids), viewSize(), { pad, maxZoom, minZoom: 0.05 }), { duration })
  // «Adatta» shows everything drawn, however small: you asked for the overview.
  const fit = useCallback(() => frame(flow.getNodes().map(n => n.id)), [panelOpen])
  /** The drawn node that stands for the current one: itself, or the innermost drawn container holding it. */
  const hereId = () => [...pathTo(data, data.current)].reverse().map(n => n.id).find(id => flow.getInternalNode(id))
  /**
   * Fit as much as stays readable: everything, else the widest container of the current node that fits,
   * else the current node alone.
   */
  const readableFit = useCallback(() => {
    const drawn = flow.getNodes()
    if (!drawn.length) return
    const holders = pathTo(data, data.current).map(n => n.id).filter(id => flow.getInternalNode(id))
    const frames = [drawn.map(n => n.id), ...holders.map(id => [id])].map(ids => ({ ids, bounds: boundsOf(ids) }))
    const size = viewSize()
    const usable = { width: size.width - 2 * FIT_PAD, height: size.height - 2 * FIT_PAD }
    frame(fitTarget(frames, usable, READABLE).ids)
  }, [panelOpen])

  // «Sei qui» on the edge when the current node is out of sight; it updates when the view stops moving.
  const [pill, setPill] = useState(null)
  const placePill = useCallback(() => {
    const id = hereId()
    const node = id && flow.getInternalNode(id)
    if (!node) return setPill(null)
    const { x, y, zoom } = flow.getViewport()
    const at = node.internals.positionAbsolute
    const tall = node.type === 'group' ? GROUP_HEAD : node.measured.height
    const rect = { x: at.x * zoom + x, y: at.y * zoom + y, width: node.measured.width * zoom, height: tall * zoom }
    setPill(offscreen(rect, viewSize(), 64))
  }, [panelOpen])
  useEffect(() => { const timer = setTimeout(placePill, 320); return () => clearTimeout(timer) }, [graph, panelOpen, placePill])

  // «mostra» and +/− change the graph where you clicked: that spot stays still on screen, at the same zoom.
  const anchor = useRef(null)
  const pin = id => {
    const node = id && flow.getInternalNode(id)
    if (!node) return void (anchor.current = { id: null })
    const { x, y, zoom } = flow.getViewport()
    const at = node.internals.positionAbsolute
    anchor.current = { id, screen: { x: at.x * zoom + x, y: at.y * zoom + y } }
  }

  // A reload keeps the viewport: only a change you made refits the view.
  const drawn = useRef(version)
  useEffect(() => {
    let alive = true
    const reloaded = drawn.current !== version
    drawn.current = version
    layout(expanded, focus, revealed).then(next => {
      if (!alive) return
      // A fly waiting on this layout may go now: the node sits where it will stay.
      waitLayout.current = false
      const held = anchor.current
      anchor.current = null
      setGraph(next)
      const at = held?.id && absoluteOf(next.nodes, held.id)
      if (at) flow.setViewport(keepAt(held.screen, at, flow.getViewport().zoom), { duration: 240 })
      else if (!held && !flyTo && !reloaded) whenDrawn(next.nodes.map(n => n.id), readableFit)
    })
    return () => { alive = false }
  }, [expanded, focus, revealed, version])

  useEffect(() => {
    const tick = async () => {
      const next = await readFiles().catch(() => null)
      if (!next || signature(next) === loaded) return
      const was = data.current
      load(next)
      setVersion(v => v + 1)
      // Looking at where you are follows where you are; any other choice stays.
      setSelected(id => (id === was ? data.current : id))
    }
    const timer = setInterval(tick, RELOAD_MS)
    addEventListener('ariadne:changed', tick)
    return () => { clearInterval(timer); removeEventListener('ariadne:changed', tick) }
  }, [])

  // Zoom onto the chosen step once it is drawn, then make it pulse so the eye lands on it.
  useEffect(() => {
    if (!flyTo || waitLayout.current || !graph.nodes.some(n => n.id === flyTo)) return
    const target = flyTo
    whenDrawn([target], () => frame([target], { pad: FLY_PAD, duration: 500 }))
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
    pin(id)
    setLevel('custom')
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  /**
   * Opens levels in full; a new set only if something opens. From a «mostra» marker, what stays still is
   * the container of that level, else a step the marker is linked to: the marker itself goes away.
   */
  const reveal = useCallback((keys, from) => {
    if (from && !keys.every(k => now.current.revealed.has(k))) {
      const level = keys[0].replace(/^replaced:/, '')
      const linked = flow.getEdges().filter(e => e.source === from || e.target === from).map(e => (e.source === from ? e.target : e.source))
      pin([level, ...linked].find(id => id && flow.getInternalNode(id)))
    }
    setRevealed(prev => (keys.every(k => prev.has(k)) ? prev : new Set([...prev, ...keys])))
  }, [])

  const select = useCallback(id => {
    setSelected(id)
    setPanelOpen(true)
  }, [])

  // Esc puts the panel away; / goes to the search.
  useEffect(() => {
    const onKey = e => {
      if (e.target.closest?.('input, textarea')) return
      if (e.key === 'Escape') setPanelOpen(false)
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); searchRef.current?.focus() }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [])

  // The state the next choice reads, without making `choose` change at every render.
  const now = useRef(null)
  now.current = { expanded, revealed, focus }

  const choose = useCallback(id => {
    select(id)
    // Make sure the step is drawn: open what contains it; open its levels in full only if it is hidden there.
    const { expanded: open, revealed: shown, focus: only } = now.current
    const holders = pathTo(data, id).slice(0, -1).map(n => n.id)
    const opened = holders.every(at => open.has(at)) ? open : new Set([...open, ...holders])
    const levels = [...holders, id].map(levelKey)
    const wanted = byId.get(id)?.status === 'replaced' ? [...levels, `replaced:${levelKey(id)}`] : levels
    const drawnThere = visibleNodes(data, opened, only, { limit: LIMIT, revealed: shown }).some(n => n.id === id)
    const unveiled = drawnThere || wanted.every(k => shown.has(k)) ? shown : new Set([...shown, ...wanted])
    waitLayout.current = opened !== open || unveiled !== shown
    setExpanded(opened)
    setRevealed(unveiled)
    setFlyTo(id)
  }, [])

  // In the graph, arrows move the selection to the closest node on that side; Enter opens or closes a container.
  useEffect(() => {
    if (view !== 'graph') return
    const onKey = e => {
      if (e.target.closest?.('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Enter' && selected && hasChildren(data, selected)) return toggle(selected)
      const dir = ARROWS[e.key]
      if (!dir) return
      e.preventDefault()
      const rects = new Map()
      for (const n of flow.getNodes()) {
        if (n.type === 'more') continue
        const internal = flow.getInternalNode(n.id)
        const at = internal.internals.positionAbsolute
        rects.set(n.id, { x: at.x, y: at.y, width: internal.measured.width, height: n.type === 'group' ? GROUP_HEAD : internal.measured.height })
      }
      const next = nearest(rects, rects.has(selected) ? selected : hereId(), dir)
      if (!next) return
      setSelected(next)
      const r = rects.get(next)
      const { x, y, zoom } = flow.getViewport()
      const onScreen = { x: r.x * zoom + x, y: r.y * zoom + y, width: r.width * zoom, height: r.height * zoom }
      const size = viewSize()
      const shown = onScreen.x >= 0 && onScreen.y >= 0 && onScreen.x + onScreen.width <= size.width && onScreen.y + onScreen.height <= size.height
      if (!shown) flow.setCenter(r.x + r.width / 2 + (panelOpen ? PANEL_WIDTH / 2 / zoom : 0), r.y + r.height / 2, { zoom, duration: 240 })
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [view, selected, panelOpen, toggle])

  // Right click: what you can do with this node, or with the view; «Back» undoes «Show only this».
  const [menu, setMenu] = useState(null)
  const [trail, setTrail] = useState([])
  const openMenu = (e, id) => { e.preventDefault(); if (id) select(id); setMenu({ x: e.clientX, y: e.clientY, id }) }
  const focusOn = id => { setTrail(prev => [...prev, focus]); setFocus(id); setExpanded(prev => new Set([...prev, id])) }
  const back = () => { setFocus(trail.at(-1) ?? null); setTrail(prev => prev.slice(0, -1)) }
  const showAll = () => { setFocus(null); setTrail([]) }
  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    const onKey = e => e.key === 'Escape' && close()
    addEventListener('click', close)
    addEventListener('keydown', onKey)
    addEventListener('wheel', close)
    return () => { removeEventListener('click', close); removeEventListener('keydown', onKey); removeEventListener('wheel', close) }
  }, [menu])
  /** The same node in another view: the graph flies to it, the sheets bring its row into sight. */
  const goView = (key, id = selected) => {
    setView(key)
    if (key === 'graph' && id) choose(id)
  }

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
          <div class="brand">
            <svg class="brand-mark" viewBox="0 0 64 64" aria-hidden="true">
              <mask id="brand-m"><rect width="64" height="64" fill="#fff" /><g fill="none" stroke="#000" strokeWidth="6" strokeLinecap="round" transform="rotate(-30 32 32)"><path d="M0 24 Q32 8 64 24" /><path d="M0 46 Q32 30 64 46" /></g></mask>
              <circle cx="32" cy="32" r="29" fill="var(--thread)" mask="url(#brand-m)" />
            </svg>
            ariadne
          </div>
          <nav class="views" aria-label=${t.views.label}>
            ${['graph', 'timeline', 'list'].map(key => html`
              <button key=${key} aria-current=${view === key ? 'page' : undefined} onClick=${() => goView(key)}>${t.views[key]}</button>`)}
            <button key="review" class=${reviewQueue(data).length ? 'has-review' : ''} aria-current=${view === 'review' ? 'page' : undefined} onClick=${() => setView('review')}>${t.views.review(reviewQueue(data).length)}</button>
          </nav>
          <nav class="where" aria-label=${t.here}>
            <span class="where-label">${t.here}</span>
            ${path.map((n, i) => html`
              ${i > 0 && html`<span class="sep" key=${`s${n.id}`}>›</span>`}
              <button key=${n.id} class=${`crumb ${i === path.length - 1 ? 'is-here' : ''}`} title=${n.title} onClick=${() => choose(n.id)}>${n.title}</button>`)}
          </nav>
          <${Search} view=${view} query=${query} setQuery=${setQuery} onGo=${choose} inputRef=${searchRef} />
          <${Settings} />
        </header>
        <main class="stage" ref=${stageRef}>
          ${missing && html`<p class="no-graph">${t.noGraph}</p>`}
          <div class="overlays"><${Invalid} /></div>
          ${view === 'timeline' && html`<${Timeline} query=${query} selected=${selected} onSelect=${select} onMenu=${openMenu} />`}
          ${view === 'list' && html`<${NodeList} query=${query} selected=${selected} onSelect=${select} onMenu=${openMenu} />`}
          ${view === 'review' && html`<${ReviewQueue} selected=${selected} onSelect=${select} />`}
          <div class="canvas-tools" hidden=${view !== 'graph'}>
            <div class="seg" role="group" aria-label=${t.detail}>
              ${['milestones', 'path', 'all'].map(key => html`
                <button key=${key} aria-pressed=${level === key} onClick=${() => showLevel(key)}>${t.levels[key]}</button>`)}
            </div>
            ${focus && html`<div class="focus-note">${t.only(byId.get(focus).title)} ${trail.length > 0 && html`<button class="link" onClick=${back}>${t.menu.back}</button>`} <button class="link" onClick=${showAll}>${t.showAll}</button></div>`}
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
            onNodeContextMenu=${(e, n) => (n.type === 'more' || n.type === 'join' ? e.preventDefault() : openMenu(e, n.id))}
            onPaneContextMenu=${e => openMenu(e, null)}
            onMoveStart=${() => { hover(null); setPill(null) }}
            onMoveEnd=${placePill}
            nodesDraggable=${false}
            nodesConnectable=${false}
            minZoom=${0.05}
            proOptions=${{ hideAttribution: true }}
          >
            <${Background} gap=${24} size=${1} color="var(--dots)" />
          <//>
          ${view === 'graph' && pill && html`
            <button class=${`here-pill to-${pill.side}`} style=${{ left: `${pill.x}px`, top: `${pill.y}px` }} onClick=${() => choose(data.current)}>
              <span class="dot" aria-hidden="true"></span>${t.here}
              <svg class="arrow" width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>`}
          <div class="bottom-tools" hidden=${view !== 'graph'}>
            ${!missing && html`<${Legend} />`}
            <${ZoomTools} onFit=${fit} />
          </div>
          ${node && html`<${Panel} node=${node} open=${panelOpen} expanded=${expanded} focus=${focus}
            onShowInGraph=${view === 'graph' ? null : showInGraph}
            onSelect=${view === 'graph' ? choose : select} onToggle=${toggle} onClose=${() => setPanelOpen(false)}
            onFocus=${focusOn} />`}
          ${menu && html`
            <div class="menu" role="menu" style=${{ left: `${menu.x}px`, top: `${menu.y}px` }} onContextMenu=${e => e.preventDefault()}>
              ${menu.id && view === 'graph' && hasChildren(data, menu.id) && html`
                <button role="menuitem" onClick=${() => focusOn(menu.id)}>${t.menu.only}</button>
                <button role="menuitem" onClick=${() => toggle(menu.id)}>${expanded.has(menu.id) ? t.menu.close : t.menu.open}</button>`}
              ${view === 'graph' && trail.length > 0 && html`<button role="menuitem" onClick=${back}>${t.menu.back}</button>`}
              ${view === 'graph' && focus && html`<button role="menuitem" onClick=${showAll}>${t.menu.all}</button>`}
              ${menu.id && ['graph', 'timeline', 'list'].filter(k => k !== view).map(k => html`
                <button key=${k} role="menuitem" onClick=${() => goView(k, menu.id)}>${t.menu[k]}</button>`)}
            </div>`}
        </main>
      </div>
      <${Tip} tip=${tip} />
    <//>`
}

createRoot(document.getElementById('app')).render(html`<${ReactFlowProvider}><${App} /><//>`)
