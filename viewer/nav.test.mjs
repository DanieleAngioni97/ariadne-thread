import { test } from 'node:test'
import assert from 'node:assert/strict'

import { absoluteOf, fitTarget, keepAt, nearest, offscreen, viewportFor } from './nav.js'

const box = (x, y, width = 100, height = 50) => ({ x, y, width, height })

test('the fit takes the widest frame that stays readable, else the narrowest', () => {
  const frames = [
    { ids: ['all'], bounds: box(0, 0, 4000, 1000) },
    { ids: ['m4'], bounds: box(0, 0, 1200, 400) },
    { ids: ['here'], bounds: box(0, 0, 232, 64) },
  ]
  assert.deepEqual(fitTarget(frames, { width: 1000, height: 800 }, 0.8).ids, ['m4'])
  assert.deepEqual(fitTarget(frames, { width: 5000, height: 2000 }, 0.8).ids, ['all'])
  assert.deepEqual(fitTarget(frames, { width: 100, height: 100 }, 0.8).ids, ['here'])
})

test('an arrow moves to the closest node on that side, preferring the same row or column', () => {
  const rects = new Map([
    ['a', box(0, 0)], ['right', box(200, 0)], ['farRightLow', box(160, 300)], ['below', box(0, 120)], ['above', box(10, -120)],
  ])
  assert.equal(nearest(rects, 'a', 'right'), 'right')
  assert.equal(nearest(rects, 'a', 'down'), 'below')
  assert.equal(nearest(rects, 'a', 'up'), 'above')
  assert.equal(nearest(rects, 'a', 'left'), null)
  assert.equal(nearest(rects, 'missing', 'left'), null)
})

test('a node out of sight gives where to point from the edge; a visible one gives nothing', () => {
  const view = { width: 1000, height: 600 }
  assert.equal(offscreen(box(100, 100), view), null)
  assert.equal(offscreen(box(950, 100), view), null, 'partly visible counts as visible')
  const right = offscreen(box(1400, 275), view, 24)
  assert.deepEqual([right.x, right.y, right.side], [976, 300, 'right'])
  const upLeft = offscreen(box(-500, -400), view, 24)
  assert.deepEqual([upLeft.x, upLeft.y], [24, 24])
})

test('a frame centres the box in the view at the largest zoom that fits, within the limits', () => {
  const view = { width: 1000, height: 600 }
  assert.deepEqual(viewportFor(box(0, 0, 400, 200), view, { pad: 0, maxZoom: 1 }), { x: 300, y: 200, zoom: 1 })
  assert.deepEqual(viewportFor(box(100, 0, 2000, 300), view, { pad: 0, maxZoom: 1 }), { x: -50, y: 225, zoom: 0.5 })
  assert.equal(viewportFor(box(0, 0, 2000, 300), view, { pad: 100, maxZoom: 1 }).zoom, 0.4)
  assert.equal(viewportFor(box(0, 0, 20000, 300), view, { pad: 0, maxZoom: 1, minZoom: 0.2 }).zoom, 0.2)
})

test('a node inside open containers sits at the sum of its offsets; a missing one has no place', () => {
  const nodes = [
    { id: 'm', position: { x: 100, y: 50 } },
    { id: 'g', position: { x: 24, y: 60 }, parentId: 'm' },
    { id: 's', position: { x: 10, y: 5 }, parentId: 'g' },
  ]
  assert.deepEqual(absoluteOf(nodes, 's'), { x: 134, y: 115 })
  assert.deepEqual(absoluteOf(nodes, 'm'), { x: 100, y: 50 })
  assert.equal(absoluteOf(nodes, 'gone'), null)
})

test('keeping a node in place puts its new position where it was on screen, at the same zoom', () => {
  const vp = keepAt({ x: 300, y: 200 }, { x: 1000, y: 400 }, 0.5)
  assert.deepEqual(vp, { x: -200, y: 0, zoom: 0.5 })
  assert.equal(1000 * vp.zoom + vp.x, 300)
})
