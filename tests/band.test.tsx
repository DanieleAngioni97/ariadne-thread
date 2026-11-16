import { describe, expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import type { Band, WhereRow } from '../types'

const BAND = {
  component: 'AbovePrompt',
  props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 4, bodyColumns: 100, scroll: { offset: 0, bodyRows: 4 }, view: {} },
} as const

const where: WhereRow = { kind: 'where', before: 'M3 Implementazione › ', current: 'Banda nella mod', after: '', actions: [{ label: 'Apri il grafo', run: ['open'] }] }
const count: Band = {
  viewer: 8790,
  rows: [
    where,
    { kind: 'context', text: '⤷ deviazione · rientro: Viewer', actions: [{ label: 'Chiudi e torna', say: 'torna' }] },
    { kind: 'queue', text: '⏎ Mentre eri via: 2 da confermare', actions: [{ label: 'Approva tutto', run: ['confirm', '--all'] }, { label: 'Rivedi una per una', review: 0 }] },
    { kind: 'outcome', text: '↺ chiuso m3.2 Viewer', actions: [] },
  ],
}
const item: Band = {
  viewer: 8790,
  rows: [
    where,
    { kind: 'queue', text: '⏎ Da confermare 1/2: x1 Passo', actions: [{ label: 'Approva', run: ['confirm', 'x1'] }, { label: 'Rifiuta', run: ['reject', 'x1'] }, { label: 'Mostra nel grafo', open: 'x1' }] },
  ],
}

type Call = readonly string[]

/** What each call asked of the CLI, past `node <cli>`. */
const args = (calls: Call[]) => calls.map(c => c.slice(2))

/** Stands for the host: `ariadne band` answers `count`, or `item` with --review; every call is kept. */
function host(on: On, calls: Call[], prompts: string[], exitCode = 0) {
  on('process.run', (_, e) => {
    calls.push(e.argv)
    const isBand = e.argv[2] === 'band'
    const band = e.argv.includes('--review') ? item : count
    return { value: { exitCode, stdout: isBand ? JSON.stringify(band) : '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('prompt.submit', (_, e) => {
    prompts.push(e.text)
    return { text: e.text }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  // The engine's own band, which the plugin leaves in place outside an ariadne project.
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine band</Text>
  })
}

const start = { surface: 'terminal', isInteractive: true, cwd: '/work' } as const

describe('ariadne band', () => {
  for (const surface of ['terminal', 'desktop'] as const) {
    test(`${surface}: the band draws the rows of ariadne band and runs its actions`, async ($, on) => {
      const calls: Call[] = []
      const prompts: string[] = []
      host(on, calls, prompts)
      await $.session.start(start)
      const band = await $.ui.mount({ plugin: 'ariadne', surface, ...BAND })
      expect(await band.find({ type: 'Text', text: /Banda nella mod/ })).toBeDefined()
      expect(await band.find({ type: 'Text', text: /Mentre eri via: 2 da confermare/ })).toBeDefined()
      expect(await band.find({ type: 'Text', text: /↺ chiuso m3\.2 Viewer/ })).toBeDefined()

      await band.press({ key: 'queue-Approva tutto' })
      expect(args(calls)).toContainEqual(['confirm', '--all'])

      await band.press({ key: 'context-Chiudi e torna' })
      expect(prompts).toEqual(['torna'])

      await band.press({ key: 'where-Apri il grafo' })
      expect(args(calls)).toContainEqual(['open'])
      await band.unmount()
    })

    test(`${surface}: one by one shows an item and confirms it`, async ($, on) => {
      const calls: Call[] = []
      host(on, calls, [])
      await $.session.start(start)
      const band = await $.ui.mount({ plugin: 'ariadne', surface, ...BAND })
      await band.press({ key: 'queue-Rivedi una per una' })
      expect(args(calls)).toContainEqual(['band', '--review', '0'])
      expect(await band.find({ type: 'Text', text: /Da confermare 1\/2: x1 Passo/ })).toBeDefined()

      await band.press({ key: 'queue-Approva' })
      expect(args(calls)).toContainEqual(['confirm', 'x1'])
      await band.press({ key: 'queue-Mostra nel grafo' })
      expect(args(calls)).toContainEqual(['open', 'x1'])
      await band.unmount()
    })
  }

  test('the CLI runs from the plugin\'s own folder, whatever the session\'s folder', async ($, on) => {
    const calls: Call[] = []
    host(on, calls, [])
    await $.session.start(start)
    expect(calls.length).toBeGreaterThan(0)
    for (const call of calls) {
      expect(call[0]).toBe('node')
      expect(call[1]).toMatch(/^\/.+\/bin\/ariadne\.mjs$/)
    }
  })

  test('a rule in the theme subtle color sets the band apart from the chat, when a row is free for it', async ($, on) => {
    host(on, [], [])
    await $.session.start(start)
    const roomy = await $.ui.mount({ plugin: 'ariadne', surface: 'terminal', ...BAND })
    await roomy.press({ key: 'queue-Rivedi una per una' })
    const rule = await roomy.find({ type: 'Text', text: /^── ariadne ─+$/ })
    expect(rule).toBeDefined()
    expect(rule?.props.color).toBe('subtle')
    expect(rule?.text.length).toBe(BAND.props.bodyColumns)
    await roomy.unmount()

    // Still one by one: two rows and no outcome, which fill a band of two.
    const full = await $.ui.mount({ plugin: 'ariadne', surface: 'terminal', ...BAND, props: { ...BAND.props, maxRows: 2 } })
    expect(await full.find({ type: 'Text', text: /Da confermare 1\/2/ })).toBeDefined()
    expect(await full.find({ type: 'Text', text: /── ariadne/ })).toBeUndefined()
    await full.unmount()
  })

  test('the last outcome rides on the rule, so it takes no row of its own', async ($, on) => {
    host(on, [], [])
    await $.session.start(start)
    const band = await $.ui.mount({ plugin: 'ariadne', surface: 'terminal', ...BAND })
    const rule = await band.find({ type: 'Text', text: /^── ariadne · ↺ chiuso m3\.2 Viewer ─+$/ })
    expect(rule).toBeDefined()
    expect(rule?.text.length).toBe(BAND.props.bodyColumns)
    // One row each for where, the detour and the queue: none for the outcome. Rows, not every Box:
    // the engine wraps the band in a column of its own (2.1.325, for the collapse mark).
    const rows = (await band.findAll({ type: 'Box' })).filter(box => box.props.flexDirection === 'row')
    expect(rows).toHaveLength(3)
    expect(rows.some(row => /chiuso m3\.2/.test(row.text))).toBe(false)
    await band.unmount()
  })

  test('outside an ariadne project the band leaves the engine its own', async ($, on) => {
    host(on, [], [], 1)
    await $.session.start(start)
    const band = await $.ui.mount({ plugin: 'ariadne', surface: 'terminal', ...BAND })
    expect(await band.find({ type: 'Text', text: /Banda nella mod/ })).toBeUndefined()
    expect(await band.find({ type: 'Text', text: /engine band/ })).toBeDefined()
    await band.unmount()
  })
})
