// One drawn icon per kind of step, the same in every view: the shape says the state, the colour
// (--k, from the .k-<kind> class around it) repeats it. Hand-drawn on a 16-unit grid, no icon library.
import React from 'react'
import htm from 'htm'

const html = htm.bind(React.createElement)

const RING = html`<circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.75" />`
const SHAPES = {
  done: html`<g><circle cx="8" cy="8" r="7" fill="currentColor" /><path d="M4.9 8.3l2 2 4.3-4.5" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></g>`,
  active: html`<g>${RING}<circle cx="8" cy="8" r="2.75" fill="currentColor" /></g>`,
  todo: RING,
  deferred: html`<g>${RING}<path d="M5 8h5.2M8.4 5.8 10.6 8l-2.2 2.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></g>`,
  dropped: html`<g>${RING}<path d="M3.8 12.2 12.2 3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></g>`,
  detour: html`<g><path d="M2.5 11.5H9a3.25 3.25 0 0 0 0-6.5H5.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" /><path d="M7.4 2.9 5.3 5l2.1 2.1" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /></g>`,
  decision: html`<g><path d="M8 1.4 14.6 8 8 14.6 1.4 8Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M6.5 6.6a1.5 1.5 0 1 1 2.1 1.4c-.4.2-.6.5-.6.9v.3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><circle cx="8" cy="11" r="0.9" fill="currentColor" /></g>`,
  risk: html`<g><path d="M8 1.9 14.6 13.6H1.4Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M8 6.2v3.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><circle cx="8" cy="11.7" r="0.95" fill="currentColor" /></g>`,
}

/** The icon for a kind (done, active, todo, deferred, dropped, detour, decision, risk); decorative, the text next to it names it. */
export const StatusIcon = ({ kind, size = 16 }) => html`
  <svg class="icon" width=${size} height=${size} viewBox="0 0 16 16" aria-hidden="true">${SHAPES[kind] ?? RING}</svg>`
