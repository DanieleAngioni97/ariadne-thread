// The viewer's local server: the page from viewer/ and the logic from src/, both in this package,
// the data from the project's .ariadne/.
// Bound to 127.0.0.1; nothing else in the repo is reachable. It reads files and, through POST /act, runs
// your confirm, reject and comment with the CLI, as the chat would (m6.19).

import { execFile } from 'node:child_process'
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
const CLI = join(PACKAGE, 'bin', 'ariadne.mjs')

// What the page may do: your own acts on the graph, never the agent's (start, close, plan…).
const ID = /^[\w.]+$/
const TEXT_MAX = 2000
const ACTS = {
  confirm: b => ID.test(b.id ?? '') && ['confirm', b.id],
  confirmAll: () => ['confirm', '--all'],
  reject: b => ID.test(b.id ?? '') && ['reject', b.id],
  comment: b => ID.test(b.id ?? '') && typeof b.text === 'string' && b.text.trim() && b.text.length <= TEXT_MAX && ['comment', b.id, b.text.trim()],
}

/** Runs one act from the page through the CLI, as you: 200 with its output, 409 with its refusal. */
function act(root, req, res) {
  let body = ''
  req.on('data', chunk => { body += chunk; if (body.length > TEXT_MAX * 2) req.destroy() })
  req.on('end', () => {
    let args = null
    try {
      const b = JSON.parse(body)
      args = Object.hasOwn(ACTS, b.op) ? ACTS[b.op](b) : null
    } catch {}
    if (!args) {
      res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' })
      return res.end('unknown act')
    }
    execFile(process.execPath, [CLI, ...args, '--by', 'user'], { cwd: root }, (error, stdout, stderr) => {
      res.writeHead(error ? 409 : 200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' })
      res.end(error ? stderr || error.message : stdout)
    })
  })
}

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
    // The header is the guard: a page from another site cannot add it to a cross-origin POST.
    if (req.url === '/act' && req.method === 'POST') {
      // And the host: a name rebound to 127.0.0.1 would make another site's page same-origin.
      const local = /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host ?? '')
      if (req.headers['x-ariadne-act'] !== '1' || !local) {
        res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' })
        return res.end('forbidden')
      }
      return act(root, req, res)
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
