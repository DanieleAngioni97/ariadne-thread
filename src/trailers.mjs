// Commits as the cheapest input to the graph (R18): the `Thread:` lines the agent already writes.
// `Thread: <id>` adds the commit as proof; `Thread: <id> done: <result>` closes the node with it.
// Commits come newest first, as `git log` prints them: `{ sha, thread: [values of the Thread lines], files? }`.
// A commit that only saves .ariadne/ is neutral: recording it would dirty the tree again, for ever.

const LINE = /^(\S+)(?:\s+done:\s*(.+))?$/
const graphOnly = c => c.files?.length > 0 && c.files.every(f => f.startsWith('.ariadne/'))

/** The operations for the commits not yet recorded as proof, oldest first. */
export function opsFromCommits(commits, recorded) {
  const ops = []
  for (const { sha, thread, ...c } of [...commits].reverse()) {
    if (recorded.has(sha) || graphOnly(c)) continue
    for (const value of thread) {
      const match = LINE.exec(value.trim())
      if (!match) continue
      const [, id, what] = match
      const proof = [{ type: 'commit', ref: sha }]
      ops.push(what ? { op: 'close', id, what: what.trim(), proof } : { op: 'fill', id, proof })
    }
  }
  return ops
}

/** How many of the latest commits carry no `Thread:` line. */
export function untracked(commits) {
  const latest = commits.filter(c => !graphOnly(c))
  const k = latest.findIndex(c => c.thread.length > 0)
  return k === -1 ? latest.length : k
}
