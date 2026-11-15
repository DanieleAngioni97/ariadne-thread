// The pre-registration manifest (docs/valutazione/piano.md § 0, step 3): a sha256 per frozen file, so the
// report can show that the scenarios, fixtures, transcripts and condition texts did not change after it.

import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const sha = data => createHash('sha256').update(data).digest('hex')

function walk(root, path) {
  const full = join(root, path)
  if (!statSync(full).isDirectory()) return [path]
  return readdirSync(full).flatMap(name => walk(root, join(path, name)))
}

/** { files: { path: sha256 }, total } over every file under `paths`, relative to `root`, sorted by path. */
export function manifest(root, paths) {
  const names = paths.flatMap(p => walk(root, p)).map(p => relative(root, join(root, p))).sort()
  const files = Object.fromEntries(names.map(n => [n, sha(readFileSync(join(root, n)))]))
  return { files, total: sha(names.map(n => `${files[n]}  ${n}\n`).join('')) }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const paths = ['eval/scenarios/test', 'eval/conditions', 'eval/brief.md', ...readdirSync(join(root, 'eval/frozen')).filter(d => d.startsWith('test-')).map(d => `eval/frozen/${d}`)]
  const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
  const out = { commit: git(['rev-parse', 'HEAD']), ariadne: git(['rev-parse', 'HEAD:src']), ...manifest(root, paths) }
  writeFileSync(join(root, 'eval/manifest.json'), JSON.stringify(out, null, 2) + '\n')
  console.log(`${Object.keys(out.files).length} file, totale ${out.total.slice(0, 12)}, src ${out.ariadne.slice(0, 12)}`)
}
