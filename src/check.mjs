// The check at the end of a turn: what happened in the turn that the thread does not know yet.
// Reads the session transcript, without any model: a file written outside the project and cited by no
// node, a commit without `Thread:`, a decision taken in chat (a short approval, an answered question)
// with no `ariadne` command after it. The Stop hook hands the reasons back to the agent, once per turn.

import { isAbsolute, resolve } from 'node:path'

import { words } from './i18n.mjs'

const say = words({
  en: {
    file: path => `${path} was written outside the project and no node cites it: ariadne fill <id> --file ${path}`,
    commit: k => `${k} commit(s) without Thread: — the next commit carries Thread: <id>, or ariadne fill <id> --commit <sha>`,
    decision: 'a decision was taken in chat and nothing recorded it: ariadne plan <id> "<step>"… --ref "chat <date>: …" for an approved plan, ariadne fill <id> --message "chat <date>: …" for a direction; nothing to record? say so in one line',
  },
  it: {
    file: path => `${path} è stato scritto fuori dal progetto e nessun nodo lo cita: ariadne fill <id> --file ${path}`,
    commit: k => `${k} commit senza Thread: — il prossimo commit porta Thread: <id>, oppure ariadne fill <id> --commit <sha>`,
    decision: 'in chat è stata presa una decisione e nulla l\'ha registrata: ariadne plan <id> "<passo>"… --ref "chat <data>: …" per un piano approvato, ariadne fill <id> --message "chat <data>: …" per una direzione; niente da registrare? dillo in una riga',
  },
})

const APPROVAL = /^(ok|okay|sì|si|yes|procedi|vai|approvo|approvato|va bene|perfetto|d'accordo|confermo|fallo|go|go ahead|proceed|approved|lgtm|sure|do it)(?![\p{L}\d])/iu
const SHORT = 40
const RECORDS = /\bariadne(?:\.mjs)?\s+(?:plan|fill|add|close|defer|replace|start)\b/
const COMMIT = /\bgit\b[^|;&]*\bcommit\b/
const WRITES = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit'])

const blocks = e => (Array.isArray(e.message?.content) ? e.message.content : [])
const typed = e => e.type === 'user' && !e.isMeta &&
  (typeof e.message?.content === 'string' || !blocks(e).some(b => b.type === 'tool_result'))
const text = e => typeof e.message.content === 'string' ? e.message.content : blocks(e).filter(b => b.type === 'text').map(b => b.text).join('\n')

/** The last prompt the person typed and the transcript entries after it. */
export function lastTurn(entries) {
  const at = entries.findLastIndex(typed)
  return at === -1 ? { prompt: null, entries } : { prompt: text(entries[at]).trim(), entries: entries.slice(at + 1) }
}

/** Why the thread is behind after the turn, one reason per line; empty when it kept up.
 * `real` resolves symlinks, so /var and /private/var are the same folder. */
export function behind({ entries, root, home, ignore = [], cited, untracked, real = path => path }) {
  const turn = lastTurn(entries)
  const uses = turn.entries.flatMap(e => blocks(e).filter(b => b.type === 'tool_use'))
  const commands = uses.map(u => (u.name === 'Bash' ? u.input?.command ?? '' : ''))
  const reasons = []

  const absolute = ref => {
    const path = ref.replace(/#.*$/, '').replace(/^~(?=\/)/, home)
    return real(isAbsolute(path) ? path : resolve(root, path))
  }
  const known = new Set(cited.map(absolute))
  const written = uses.filter(u => WRITES.has(u.name)).map(u => u.input?.file_path ?? u.input?.notebook_path).filter(Boolean).map(real)
  for (const path of new Set(written)) {
    if (path.startsWith(root + '/') || ignore.some(p => path.startsWith(p)) || known.has(path)) continue
    reasons.push(say('file', path))
  }

  if (untracked > 0 && commands.some(c => COMMIT.test(c))) reasons.push(say('commit', untracked))

  const lastRecord = commands.findLastIndex(c => RECORDS.test(c))
  const asked = uses.findLastIndex(u => u.name === 'AskUserQuestion')
  const approved = turn.prompt !== null && turn.prompt.length <= SHORT && APPROVAL.test(turn.prompt)
  if ((approved && lastRecord === -1) || asked > lastRecord) reasons.push(say('decision'))

  return reasons
}
