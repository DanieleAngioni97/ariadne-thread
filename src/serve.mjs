// The viewer's local server: the page from viewer/ and the logic from src/, both in this package,
// the data from the project's .ariadne/.
// Read-only and bound to 127.0.0.1; nothing else in the repo is reachable.

import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.jsonl': 'text/plain',
}
const FOLDERS = ['src', '.ariadne']
const FILE = /^[\w.-]+$/
export const PACKAGE = fileURLToPath(new URL('..', import.meta.url))

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

/**
 * Serves the viewer for the repo in `root` (its path at /root, for links to files); `no-store` so a reload always reads the graph as it is now.
 * /package says which installed copy runs it, so `ariadne open` can replace a viewer left from an older version;
 * POST /quit closes it, only with the x-ariadne-quit header, which a page from another site cannot add.
 */
export function serve(root, port) {
  const server = createServer(async (req, res) => {
    if (req.url === '/root') return res.end(root)
    if (req.url === '/package') return res.end(PACKAGE)
    if (req.url === '/quit' && req.method === 'POST' && req.headers['x-ariadne-quit'] === '1') {
      res.end('closing')
      server.close()
      server.closeAllConnections()
      return
    }
    const file = resolvePath(req.url)
    try {
      if (!file) throw new Error('outside')
      const body = await readFile(join(file.startsWith('.ariadne/') ? root : PACKAGE, file))
      res.writeHead(200, { 'content-type': `${TYPES[extname(file)] ?? 'text/plain'}; charset=utf-8`, 'cache-control': 'no-store' })
      res.end(body)
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('not found')
    }
  })
  return server.listen(port, '127.0.0.1')
}
