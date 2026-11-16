// The band above the prompt (specifica § Banda). The rows come from `ariadne band` (src/band.mjs):
// this module only draws them and runs their actions, so the logic stays tested in src/.

import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Action, Band, Row, TextRow } from '../types'

/** The CLI shipped in this plugin, run in the session's folder: the project the band is about. */
const cli = ($: EngineInterface, args: readonly string[]) => $.process.run(['node', `${$.plugin.root}/bin/ariadne.mjs`, ...args])

const band = atom({ plugin: 'ariadne', key: 'band' } as const, null)
const review = atom({ plugin: 'ariadne', key: 'review' } as const, null)

/** Reads the band again; outside an ariadne project (the CLI missing or failing) there is none. */
async function refresh($: EngineInterface): Promise<void> {
  const index = await read($, review)
  const args = index === null ? ['band'] : ['band', '--review', String(index)]
  let next: Band | null = null
  try {
    const { exitCode, stdout } = await cli($, args)
    next = exitCode === 0 ? (JSON.parse(stdout) as Band) : null
  } catch {
    next = null
  }
  await update($, band, () => next)
}

async function act($: EngineInterface, action: Action): Promise<void> {
  if ('run' in action) {
    await cli($, action.run)
    // Confirming or rejecting an item keeps the place: the next item takes it, or the count comes back.
    if (action.run[1] === '--all') await update($, review, () => null)
  } else if ('say' in action) {
    await $.prompt.submit({ text: action.say, asUser: true })
  } else if ('open' in action) {
    // Through the CLI, which starts the viewer when it is off.
    await cli($, ['open', action.open])
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

    // A rule in the theme's subtle color sets the band apart from the chat on any background. The
    // last outcome has no buttons, so it rides on the rule and the two take one row; a bare rule
    // shows only when the band would not scroll for it.
    const outcome = current.rows.find((row): row is TextRow => row.kind === 'outcome' && row.actions.length === 0)
    const rows = current.rows.filter(row => row !== outcome)
    const label = outcome ? `── ariadne · ${outcome.text} ` : '── ariadne '
    const fill = '─'.repeat(Math.max(0, e.props.bodyColumns - label.length))
    const rule = (outcome || rows.length < e.props.maxRows) && (
      <Text color="subtle" wrap="truncate-end">
        {outcome ? ['── ariadne · ', <Text key="outcome" color="success">{outcome.text}</Text>, ' ' + fill] : label + fill}
      </Text>
    )

    return (
      <Box flexDirection="column">
        {rule}
        {rows.map(line)}
      </Box>
    )
  })
}
