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

/**
 * How many of the latest commits carry no `Thread:` line. Not counted: a merge without one (it brings
 * commits that have their own), a commit already recorded as proof, and a commit older than `since`,
 * when the thread began (`at`, the committer date): history from before `ariadne init` is no one's debt.
 */
export function untracked(commits, { recorded = new Set(), since } = {}) {
  const latest = commits.filter(c => !graphOnly(c) && !(c.merge && c.thread.length === 0))
  const k = latest.findIndex(c => c.thread.length > 0 || recorded.has(c.sha))
  if (k !== -1) return k
  // No tracked commit yet, as right after init: the date tells history from the thread's own commits.
  // The log keeps minutes, so a commit in the minute the thread began counts as before it.
  const MINUTE = 60_000
  const start = since ? Date.parse(since) : NaN
  const before = c => c.at && Math.floor(Date.parse(c.at) / MINUTE) * MINUTE <= start
  return latest.filter(c => !before(c)).length
}
