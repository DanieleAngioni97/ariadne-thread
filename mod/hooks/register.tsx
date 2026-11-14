// The band above the prompt (specifica § Banda). The rows come from `ariadne band` (src/band.mjs):
// this module only draws them and runs their actions, so the logic stays tested in src/.

import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Action, Band, Row } from '../types'

const CLI = ['node', 'bin/ariadne.mjs']

const band = atom({ plugin: 'ariadne', key: 'band' } as const, null)
const review = atom({ plugin: 'ariadne', key: 'review' } as const, null)

/** Reads the band again; outside an ariadne project (the CLI missing or failing) there is none. */
async function refresh($: EngineInterface): Promise<void> {
  const index = await read($, review)
  const args = index === null ? ['band'] : ['band', '--review', String(index)]
  let next: Band | null = null
  try {
    const { exitCode, stdout } = await $.process.run([...CLI, ...args])
    next = exitCode === 0 ? (JSON.parse(stdout) as Band) : null
  } catch {
    next = null
  }
  await update($, band, () => next)
}

async function act($: EngineInterface, action: Action): Promise<void> {
  if ('run' in action) {
    await $.process.run([...CLI, ...action.run])
    // Confirming or rejecting an item keeps the place: the next item takes it, or the count comes back.
    if (action.run[1] === '--all') await update($, review, () => null)
  } else if ('say' in action) {
    await $.prompt.submit({ text: action.say, asUser: true })
  } else if ('open' in action) {
    // Through the CLI, which starts the viewer when it is off.
    await $.process.run([...CLI, 'open', action.open])
  } else {
    await update($, review, () => action.review)
  }
  await refresh($)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    await refresh($)
    return started
  })

  // Every checkpoint passes through a tool call (a commit, an ariadne command) or ends a turn.
  on('tool.call', async ($, e, next) => {
    const result = await next(e)
    if (e.tool === 'Bash') await refresh($)
    return result
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    await refresh($)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const current = await read($, band)
    if (!current || current.rows.length === 0 || e.props.hasSurvey) return next(e)
    const { Box, Button, Text } = $.ui.resolve(e)

    const buttons = (row: Row) =>
      row.actions.map(action => <Button key={`${row.kind}-${action.label}`} label={action.label} onPress={() => act($, action)} />)

    const line = (row: Row) => {
      if (row.kind === 'where') {
        return (
          <Box flexDirection="row" columnGap={1}>
            <Text wrap="truncate-end">
              {row.before}
              <Text bold>{row.current}</Text>
              <Text dimColor>{row.after}</Text>
            </Text>
            {buttons(row)}
          </Box>
        )
      }
      const color = row.kind === 'outcome' ? 'success' : row.kind === 'error' ? 'warning' : row.kind === 'queue' ? 'suggestion' : undefined
      return (
        <Box flexDirection="row" columnGap={1}>
          <Text color={color} wrap="truncate-end">{row.text}</Text>
          {buttons(row)}
        </Box>
      )
    }

    // A rule in the theme's subtle color sets the band apart from the chat on any background; it
    // takes a row, so it shows only when the band would not scroll for it.
    const label = '── ariadne '
    const rule = current.rows.length < e.props.maxRows && (
      <Text color="subtle" wrap="truncate-end">{label + '─'.repeat(Math.max(0, e.props.bodyColumns - label.length))}</Text>
    )

    return (
      <Box flexDirection="column">
        {rule}
        {current.rows.map(line)}
      </Box>
    )
  })
}
