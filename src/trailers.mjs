// Commits as the cheapest input to the graph (R18): the `Thread:` lines the agent already writes.
// `Thread: <id>` adds the commit as proof; `Thread: <id> done: <result>` closes the node with it.
// Commits come newest first, as `git log` prints them: `{ sha, thread: [values of the Thread lines] }`.

const LINE = /^(\S+)(?:\s+done:\s*(.+))?$/

/** The operations for the commits not yet recorded as proof, oldest first. */
export function opsFromCommits(commits, recorded) {
  const ops = []
  for (const { sha, thread } of [...commits].reverse()) {
    if (recorded.has(sha)) continue
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
  const k = commits.findIndex(c => c.thread.length > 0)
  return k === -1 ? commits.length : k
}
