#!/usr/bin/env node
// One-way conversion of the hand-written docs/process-trace.md into .ariadne/ (schema: docs/ux/allineamento/concetti.md).
// Usage: node scripts/ariadne/convert-trace.mjs  → writes .ariadne/graph.jsonl and .ariadne/thread.json

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const TRACE = 'docs/process-trace.md'
const PATH = /(?:[\w.-]+\/)+[\w.-]*\w|\b[A-Z]+\.md\b/g

const kindOf = id => (/^m\d+$/.test(id) ? 'milestone' : /^[bd]\d+$/.test(id) ? 'detour' : 'step')
const isStructural = n => n.kind === 'milestone' || n.kind === 'detour' || n.status === 'deferred' || n.status === 'replaced'
const list = value => (value ?? '').split(',').map(s => s.trim()).filter(Boolean)

/** The node whose id is a prefix of `id` (`m0.5` → `m0`), if it exists. */
const containerOf = (id, ids) => {
  const dot = id.lastIndexOf('.')
  return dot > 0 && ids.has(id.slice(0, dot)) ? id.slice(0, dot) : undefined
}

function parse(markdown) {
  const current = markdown.match(/^current: (\S+)/m)?.[1]
  const raw = []
  for (const line of markdown.split('\n')) {
    const heading = line.match(/^### (\S+) — (.+)$/)
    if (heading) raw.push({ id: heading[1], title: heading[2].trim(), fields: {} })
    const field = line.match(/^- (\w+):\s?(.*)$/)
    if (field && raw.length > 0) raw.at(-1).fields[field[1]] = field[2].trim()
  }
  return { current, raw }
}

/** `{ current, nodes }` from the trace; `dateOf(id)` and `exists(path)` are injected for tests. */
export function convert(markdown, { dateOf, exists }) {
  const { current, raw } = parse(markdown)
  const ids = new Set(raw.map(r => r.id))

  const nodes = raw.map(({ id, title, fields }) => {
    const kind = kindOf(id)
    const traceParents = list(fields.parent)
    const parent = kind === 'detour' ? containerOf(traceParents[0] ?? '', ids) : containerOf(id, ids)
    const after = traceParents.filter(p => p !== parent)
    const [deferredTo, reason] = (fields.deferred ?? '').split(' — ')
    const cited = [...new Set(`${fields.summary ?? ''} ${fields.detail ?? ''}`.match(PATH) ?? [])]
    const proof = cited.filter(exists).map(ref => ({ type: 'file', ref }))
    const at = dateOf(id)

    const node = { id, kind, title, status: fields.status }
    if (parent) node.parent = parent
    if (after.length > 0) node.after = after
    node.what = fields.summary
    if (reason) node.why = reason
    node.detail = fields.detail
    node.proof = proof
    if (proof.length === 0) node.uncertain = 'historical node, no proof found in the trace'
    node.by = 'agent'
    node.at = at
    if (deferredTo) node.deferred_to = deferredTo.trim()
    if (fields.continues) node.continues = fields.continues
    if (isStructural(node)) node.confirmed = { at, ref: TRACE }
    return node
  })
  return { current, nodes }
}

/** Date of the commit that first wrote the node heading into the trace. */
function firstCommitDate(id) {
  const out = execFileSync('git', ['log', '--reverse', '--format=%as', '-S', `### ${id} — `, '--', TRACE], { encoding: 'utf8' })
  return out.split('\n')[0] || new Date().toISOString().slice(0, 10)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { current, nodes } = convert(readFileSync(TRACE, 'utf8'), { dateOf: firstCommitDate, exists: existsSync })
  mkdirSync('.ariadne', { recursive: true })
  writeFileSync('.ariadne/graph.jsonl', nodes.map(n => JSON.stringify(n)).join('\n') + '\n')
  writeFileSync('.ariadne/thread.json', JSON.stringify({ project: 'ariadne-thread', current, profile: 'standard' }, null, 2) + '\n')
  console.log(`.ariadne/graph.jsonl: ${nodes.length} nodes, current ${current}`)
}
