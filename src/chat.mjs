// What a node leaves in the chat alone (m6.16): after /clear the chat is gone, so a step or a proof that
// only points to it loses its content. Pure.

// "chat <date>" and nothing more: the message proof names the conversation, not what was said in it.
const BARE = /^chat(\s+\d{4}-\d{2}-\d{2}(T[\d:]+Z?)?)?\s*$/i
// A field that sends the reader to the chat: "as agreed in chat", "vedi la chat", "see the chat".
const POINTS = /\b(in|nella|from the|dalla|see the|vedi( la)?|as (agreed|discussed) in( the)?) chat\b/i

/** The bare chat references and the fields that point to the chat, in that order; empty when none. */
export function onlyInChat(node) {
  const bare = (node.proof ?? []).filter(p => p.type === 'message' && BARE.test(p.ref)).map(p => p.ref)
  const fields = ['what', 'detail', 'why'].filter(k => typeof node[k] === 'string' && POINTS.test(node[k]))
  return [...bare, ...fields]
}
