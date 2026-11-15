// The viewer's port, one per project: several sessions on several projects must not share one.
// Derived from the project's path; when another server holds it, `view` saves a free one in
// .ariadne/local.json (machine-local, not versioned) and band and open read it from there.

import { createHash } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE = 8800
const SPAN = 200
const local = root => join(root, '.ariadne', 'local.json')

/** A port in [8800, 9000) that depends only on the project's path. */
export function derivedPort(root) {
  return BASE + createHash('sha1').update(root).digest().readUInt32BE(0) % SPAN
}

/** The saved port when there is one, the derived one otherwise. */
export function viewerPort(root) {
  try {
    const { port } = JSON.parse(readFileSync(local(root), 'utf8'))
    if (Number.isInteger(port)) return port
  } catch {}
  return derivedPort(root)
}

export function savePort(root, port) {
  mkdirSync(join(root, '.ariadne'), { recursive: true })
  writeFileSync(local(root), JSON.stringify({ port }) + '\n')
  keepOut(root, 'local.json')
}

/** Adds `name` to .ariadne/.gitignore once: files generated or local to this machine stay out of git. */
export function keepOut(root, name) {
  const file = join(root, '.ariadne', '.gitignore')
  const lines = existsSync(file) ? readFileSync(file, 'utf8').split('\n') : []
  if (!lines.includes(name)) appendFileSync(file, `${name}\n`)
}
