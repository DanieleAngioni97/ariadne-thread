// What a node leaves in the chat alone (m6.16): after /clear the chat is gone, so a step or a proof that
// only points to it loses its content. Pure.

import { makeGraph } from './graph.mjs'
import { words } from './i18n.mjs'

// "chat <date>" and nothing more: the message proof names the conversation, not what was said in it.
const BARE = /^chat(\s+\d{4}-\d{2}-\d{2}(T[\d:]+Z?)?)?\s*$/i
// A field that sends the reader to the chat ("as agreed in chat", "vedi la chat"), not one that talks about it.
const POINTS = /\b(see the chat|vedi (la )?chat|(agreed|discussed|decided|said) in( the)? chat|(detto|deciso|concordato|discusso) in chat)\b/i

/** The bare chat references and the fields that point to the chat, in that order; empty when none. */
export function onlyInChat(node) {
  const bare = (node.proof ?? []).filter(p => p.type === 'message' && BARE.test(p.ref)).map(p => p.ref)
  const fields = ['what', 'detail', 'why'].filter(k => typeof node[k] === 'string' && POINTS.test(node[k]))
  return [...bare, ...fields]
}


const say = words({
  en: {
    safe: 'ariadne check --clear: nothing lives only here: you can /clear',
    uncommitted: files => `Not committed: ${files}`,
    chat: list => `Only in the chat: ${list}`,
    outside: list => `Outside the repo: ${list} (kept on this disk, not in git)`,
    todo: 'Before /clear: commit, write what was said into the steps (ariadne fill <id> --message "chat <date>: …"), or move the files into the repo.',
  },
  it: {
    safe: 'ariadne check --clear: niente vive solo qui: puoi fare /clear',
    uncommitted: files => `Non committato: ${files}`,
    chat: list => `Solo in chat: ${list}`,
    outside: list => `Fuori dal repo: ${list} (restano su questo disco, non in git)`,
    todo: 'Prima di /clear: committa, scrivi nei passi cosa è stato detto (ariadne fill <id> --message "chat <data>: …"), o porta i file nel repo.',
  },
})

/**
 * What a /clear could lose (m6.17): files not committed (`status` is `git status --porcelain`), and, among
 * the nodes of the current milestone and the open ones, those whose content is only in the chat or
 * whose files are outside the repo.
 */
export function beforeClear({ nodes, thread, status = '' }) {
  const g = makeGraph(nodes)
  const milestoneOf = id => [id, ...g.containers(id)].find(c => g.get(c)?.kind === 'milestone')
  const here = thread.current && milestoneOf(thread.current)
  const watched = nodes.filter(n => n.kind !== 'milestone' && ((here && milestoneOf(n.id) === here) || n.status === 'todo' || n.status === 'active'))
  const uncommitted = status.split('\n').filter(l => l.trim()).map(l => l.slice(3).split(' -> ').at(-1))
  // A bare chat proof loses something only for a closed node with no file or commit: its result.
  const kept = n => n.status === 'done' && !(n.proof ?? []).some(p => p.type === 'file' || p.type === 'commit')
  const chat = watched.map(n => ({ id: n.id, where: onlyInChat(n).filter(w => kept(n) || !BARE.test(w)) })).filter(c => c.where.length)
  const outside = watched.flatMap(n => (n.proof ?? []).filter(p => p.type === 'file' && /^(~\/|\/)/.test(p.ref)).map(p => ({ id: n.id, ref: p.ref })))
  return { uncommitted, chat, outside }
}

export function clearReport({ uncommitted, chat, outside }) {
  if (!uncommitted.length && !chat.length && !outside.length) return say('safe')
  return [
    uncommitted.length && say('uncommitted', uncommitted.join(', ')),
    chat.length && say('chat', chat.map(c => `${c.id} (${c.where.join(', ')})`).join(', ')),
    outside.length && say('outside', outside.map(o => `${o.id} ${o.ref}`).join(', ')),
    say('todo'),
  ].filter(Boolean).join('\n')
}
