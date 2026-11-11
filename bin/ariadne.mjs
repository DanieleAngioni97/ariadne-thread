#!/usr/bin/env node
// ariadne: the command line over .ariadne/ in the current directory.
// Commands: docs/implementazione.md § m3.5. `summary` always exits 0: a hook must never block the prompt.

import { existsSync, readFileSync } from 'node:fs'

import { parse } from '../src/graph.mjs'
import { show, why } from '../src/inspect.mjs'
import { summarize } from '../src/summary.mjs'
import { validate } from '../src/validate.mjs'

const GRAPH = '.ariadne/graph.jsonl'
const THREAD = '.ariadne/thread.json'
const USAGE = 'uso: ariadne summary | show <id> | why <id> | validate [file]'

function readThread(nodes) {
  if (existsSync(THREAD)) return JSON.parse(readFileSync(THREAD, 'utf8'))
  return { current: nodes.find(n => n.status === 'active' && n.kind !== 'milestone')?.id }
}

function summary() {
  if (!existsSync(GRAPH)) return console.log("ariadne: nessun grafo in .ariadne/ · l'agente lo crea con il primo piano")
  const text = readFileSync(GRAPH, 'utf8')
  const nodes = parse(text)
  const out = [summarize(nodes, readThread(nodes))]
  const errors = validate(text)
  if (errors.length > 0) {
    const [e] = errors
    const more = errors.length > 1 ? ` (+${errors.length - 1})` : ''
    out.push(`⚠ grafo non valido: riga ${e.line}${e.id ? ` ${e.id}` : ''} [${e.rule}] ${e.message}${more}`)
  }
  console.log(out.join('\n'))
}

function inspect(fn, id) {
  const text = fn(parse(readFileSync(GRAPH, 'utf8')), id)
  if (text === null) {
    console.error(`ariadne: nodo ${id} non trovato`)
    process.exit(1)
  }
  console.log(text)
}

function check(file = GRAPH) {
  const errors = validate(readFileSync(file, 'utf8'))
  for (const e of errors) console.error(`${file}:${e.line} ${e.id ?? ''} [${e.rule}] ${e.message}`)
  if (errors.length > 0) process.exit(1)
  console.log(`${file}: ok`)
}

const [command, arg] = process.argv.slice(2)
if (command === 'summary') {
  try {
    summary()
  } catch (error) {
    console.log(`ariadne: riassunto non disponibile (${error.message})`)
  }
}
else if (command === 'show' && arg) inspect(show, arg)
else if (command === 'why' && arg) inspect(why, arg)
else if (command === 'validate') check(arg)
else {
  console.error(USAGE)
  process.exit(2)
}
