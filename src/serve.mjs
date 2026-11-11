// The viewer's local server: the page from viewer/, the logic from src/, the data from .ariadne/.
// Read-only and bound to 127.0.0.1; nothing else in the repo is reachable.

import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join } from 'node:path'

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.jsonl': 'text/plain',
}
const FOLDERS = ['src', '.ariadne']
const FILE = /^[\w.-]+$/

/** The repo-relative file for a URL path, or null when it falls outside what the viewer may read. */
export function resolvePath(url) {
  let path
  try {
    path = decodeURIComponent(url.split('?')[0])
  } catch {
    return null
  }
  if (path === '/') return 'viewer/index.html'
  const parts = path.split('/').slice(1)
  const ok = name => FILE.test(name) && !name.startsWith('.')
  if (parts.length === 1 && ok(parts[0])) return `viewer/${parts[0]}`
  if (parts.length === 2 && FOLDERS.includes(parts[0]) && ok(parts[1])) return `${parts[0]}/${parts[1]}`
  return null
}

/** Serves the viewer for the repo in `root` (its path at /root, for links to files); `no-store` so a reload always reads the graph as it is now. */
export function serve(root, port) {
  return createServer(async (req, res) => {
    if (req.url === '/root') return res.end(root)
    const file = resolvePath(req.url)
    try {
      if (!file) throw new Error('outside')
      const body = await readFile(join(root, file))
      res.writeHead(200, { 'content-type': `${TYPES[extname(file)] ?? 'text/plain'}; charset=utf-8`, 'cache-control': 'no-store' })
      res.end(body)
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('not found')
    }
  }).listen(port, '127.0.0.1')
}
