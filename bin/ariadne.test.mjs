import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const CLI = fileURLToPath(new URL('./ariadne.mjs', import.meta.url))
const AT = '2026-11-11'
const n = (id, fields) => ({ id, kind: 'step', title: `Title ${id}`, status: 'done', what: `${id} result.`, proof: [{ type: 'file', ref: 'x.md' }], by: 'agent', at: AT, ...fields })
const GOOD = [n('a'), n('b', { status: 'active', after: ['a'] })]

function project({ graph, thread } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'ariadne-'))
  if (graph !== undefined || thread !== undefined) mkdirSync(join(dir, '.ariadne'))
  if (graph !== undefined) writeFileSync(join(dir, '.ariadne', 'graph.jsonl'), typeof graph === 'string' ? graph : graph.map(x => JSON.stringify(x)).join('\n') + '\n')
  if (thread !== undefined) writeFileSync(join(dir, '.ariadne', 'thread.json'), JSON.stringify(thread))
  return dir
}
const run = (dir, ...args) => spawnSync(process.execPath, [CLI, ...args], { cwd: dir, encoding: 'utf8' })

test('summary prints the R7 summary of the current node', () => {
  const r = run(project({ graph: GOOD, thread: { current: 'b' } }), 'summary')
  assert.equal(r.status, 0)
  assert.match(r.stdout, /^Sei in: Title b \(active\)\nDa dove viene \(solo le dipendenze\):\n- a Title a: a result\.\n/)
})

test('summary without a graph explains it and exits 0, so a hook never blocks the prompt', () => {
  const r = run(project(), 'summary')
  assert.equal(r.status, 0)
  assert.equal(r.stdout, "ariadne: nessun grafo in .ariadne/ · l'agente lo crea con il primo piano\n")
})

test('summary on an invalid graph summarizes what it can read and warns, exit 0', () => {
  const graph = GOOD.map(x => JSON.stringify(x)).join('\n') + '\nnot json\n' + JSON.stringify(n('c', { what: '' })) + '\n'
  const r = run(project({ graph, thread: { current: 'b' } }), 'summary')
  assert.equal(r.status, 0)
  assert.match(r.stdout, /^Sei in: Title b/)
  assert.match(r.stdout, /\n⚠ grafo non valido: riga 3 \[json\] not a JSON object with a string id \(\+1\)\n$/)
})

test('summary without thread.json starts from the active node', () => {
  const r = run(project({ graph: GOOD }), 'summary')
  assert.match(r.stdout, /^Sei in: Title b \(active\)/)
})

test('summary survives an unreadable thread.json and says so, exit 0', () => {
  const dir = project({ graph: GOOD })
  writeFileSync(join(dir, '.ariadne', 'thread.json'), '{broken')
  const r = run(dir, 'summary')
  assert.equal(r.status, 0)
  assert.match(r.stdout, /^ariadne: riassunto non disponibile \(.+\)\n$/)
})

test('show and why print a node; an unknown node fails', () => {
  const dir = project({ graph: GOOD, thread: { current: 'b' } })
  assert.match(run(dir, 'show', 'a').stdout, /^a — Title a\nCosa: a result\./)
  assert.match(run(dir, 'why', 'b').stdout, /^b Title b: b result\.\nViene da:\n- a Title a/)
  const r = run(dir, 'show', 'ghost')
  assert.equal(r.status, 1)
  assert.equal(r.stderr, 'ariadne: nodo ghost non trovato\n')
})

test('validate reports ok or the broken rules', () => {
  assert.equal(run(project({ graph: GOOD }), 'validate').stdout, '.ariadne/graph.jsonl: ok\n')
  const r = run(project({ graph: [n('a', { what: '' })] }), 'validate')
  assert.equal(r.status, 1)
  assert.match(r.stderr, /^\.ariadne\/graph\.jsonl:1 a \[what\] /)
})

test('an unknown command or a missing id prints the usage', () => {
  const dir = project({ graph: GOOD })
  for (const args of [['nope'], ['show'], []]) {
    const r = run(dir, ...args)
    assert.equal(r.status, 2, args.join(' '))
    assert.match(r.stderr, /^uso: ariadne summary \| show <id> \| why <id> \| validate \[file\]\n/)
  }
})
