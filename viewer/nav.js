// Pure geometry for moving around the graph: what to fit, where an arrow key goes, where to point.
// Boxes are { x, y, width, height }.

const centre = r => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 })

/**
 * The first frame (widest first) whose fit keeps the zoom at least `minZoom` in `size`; else the last.
 * Frames are { ids, bounds }.
 */
export function fitTarget(frames, size, minZoom) {
  const zoomFor = b => Math.min(size.width / b.width, size.height / b.height)
  return frames.find(f => zoomFor(f.bounds) >= minZoom) ?? frames.at(-1)
}

const AXES = {
  right: ({ dx, dy }) => [dx, dy],
  left: ({ dx, dy }) => [-dx, dy],
  down: ({ dx, dy }) => [dy, dx],
  up: ({ dx, dy }) => [-dy, dx],
}

/** The node an arrow key moves to from `fromId`: ahead on that side, close, and off the line by little. */
export function nearest(rects, fromId, dir) {
  const from = rects.get(fromId)
  if (!from) return null
  const a = centre(from)
  let best = null
  for (const [id, r] of rects) {
    if (id === fromId) continue
    const b = centre(r)
    const [ahead, aside] = AXES[dir]({ dx: b.x - a.x, dy: b.y - a.y })
    if (ahead <= 1) continue
    const score = ahead + 2 * Math.abs(aside)
    if (!best || score < best.score) best = { id, score }
  }
  return best?.id ?? null
}

/**
 * Where to point at a box that lies out of `view` (screen pixels): its centre pulled inside by `margin`,
 * and the side it lies beyond. Null when any part of it is in sight.
 */
export function offscreen(rect, view, margin = 24) {
  const inside = rect.x < view.width && rect.x + rect.width > 0 && rect.y < view.height && rect.y + rect.height > 0
  if (inside) return null
  const c = centre(rect)
  const x = Math.min(Math.max(c.x, margin), view.width - margin)
  const y = Math.min(Math.max(c.y, margin), view.height - margin)
  const over = { left: -c.x, right: c.x - view.width, up: -c.y, down: c.y - view.height }
  const side = Object.entries(over).sort((p, q) => q[1] - p[1])[0][0]
  return { x, y, side }
}

/**
 * The viewport that shows `bounds` centred in `view` (pixels, from its top-left corner), `pad` pixels
 * from every edge, at the largest zoom between `minZoom` and `maxZoom` that fits.
 */
export function viewportFor(bounds, view, { pad = 0, minZoom = 0, maxZoom = Infinity } = {}) {
  const fits = Math.min((view.width - 2 * pad) / bounds.width, (view.height - 2 * pad) / bounds.height)
  const zoom = Math.min(maxZoom, Math.max(minZoom, fits))
  return {
    x: (view.width - bounds.width * zoom) / 2 - bounds.x * zoom,
    y: (view.height - bounds.height * zoom) / 2 - bounds.y * zoom,
    zoom,
  }
}

/** Where a laid-out node sits in the flow: its offset plus those of the open containers around it. */
export function absoluteOf(nodes, id) {
  const byId = new Map(nodes.map(n => [n.id, n]))
  if (!byId.has(id)) return null
  let x = 0
  let y = 0
  for (let n = byId.get(id); n; n = n.parentId ? byId.get(n.parentId) : null) {
    x += n.position.x
    y += n.position.y
  }
  return { x, y }
}

/** The viewport that shows flow point `at` on screen point `screen`, at `zoom`: what you clicked stays put. */
export const keepAt = (screen, at, zoom) => ({ x: screen.x - at.x * zoom, y: screen.y - at.y * zoom, zoom })
