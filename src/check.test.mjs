import { test } from 'node:test'
import assert from 'node:assert/strict'

import { behind, lastTurn } from './check.mjs'

// These tests read what ariadne writes in Italian; English has its own tests.
process.env.ARIADNE_LANG = 'it'

const prompt = text => ({ type: 'user', message: { role: 'user', content: text } })
const said = text => ({ type: 'assistant', message: { content: [{ type: 'text', text }] } })
const tool = (name, input) => ({ type: 'assistant', message: { content: [{ type: 'tool_use', id: name, name, input }] } })
const result = () => ({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'x', content: 'ok' }] } })
const meta = text => ({ type: 'user', isMeta: true, message: { content: [{ type: 'text', text }] } })
const bash = command => tool('Bash', { command })

const ROOT = '/work/project'
const base = { root: ROOT, home: '/home/me', ignore: ['/tmp/'], cited: [], untracked: 0 }
const check = (entries, fields) => behind({ ...base, entries, ...fields })

test('the turn starts at the last prompt the person typed, past tool results and skill text', () => {
  const turn = lastTurn([prompt('prima'), said('a'), prompt('Procedi'), tool('Skill', {}), meta('skill body'), result(), said('b')])
  assert.equal(turn.prompt, 'Procedi')
  assert.equal(turn.entries.length, 4)
})

test('a quiet turn leaves the thread as it is', () => {
  assert.deepEqual(check([prompt('spiegami il grafo'), said('ecco')]), [])
})

test('a file written outside the project and cited by no node asks for fill --file', () => {
  const entries = [prompt('scrivi il rapporto'), tool('Write', { file_path: '/home/me/Documents/rapporto.html', content: 'x' }), result()]
  const [reason] = check(entries)
  assert.match(reason, /\/home\/me\/Documents\/rapporto\.html/)
  assert.match(reason, /ariadne fill <id> --file/)
})

test('a file outside the project already cited by a node, inside it, or in a scratch folder is not flagged', () => {
  const write = path => [prompt('scrivi'), tool('Edit', { file_path: path, old_string: 'a', new_string: 'b' }), result()]
  assert.deepEqual(check(write('/home/me/Documents/rapporto.html'), { cited: ['~/Documents/rapporto.html#Inizio'] }), [])
  assert.deepEqual(check(write(`${ROOT}/src/a.mjs`)), [])
  assert.deepEqual(check(write('/tmp/scratch.py')), [])
})

test('a commit in the turn without Thread: is flagged, one without a commit in the turn is not', () => {
  const entries = [prompt('committa'), bash('git commit -m "fix: x"'), result()]
  assert.match(check(entries, { untracked: 1 })[0], /Thread:/)
  assert.deepEqual(check([prompt('ciao'), said('ciao')], { untracked: 1 }), [])
  assert.deepEqual(check(entries, { untracked: 0 }), [])
})

test('a short approval with no ariadne command after it asks to record the plan or the direction', () => {
  for (const text of ['Procedi pure', 'ok', 'sì, vai', 'Approvo', 'go ahead', 'LGTM']) {
    const [reason] = check([prompt(text), bash('npm test'), result(), said('fatto')])
    assert.match(reason ?? '', /ariadne plan/, text)
  }
})

test('an approval followed by an ariadne command, or a long request, is not flagged', () => {
  assert.deepEqual(check([prompt('ok'), bash('node bin/ariadne.mjs plan m4 "a" --ref "chat"'), result()]), [])
  assert.deepEqual(check([prompt('ok'), bash('ariadne fill m4.8 --message "chat"'), result()]), [])
  assert.deepEqual(check([prompt('ok, ma prima rifai il grafico delle barre e poi controlla che i numeri tornino con il rapporto'), said('fatto')]), [])
  assert.deepEqual(check([prompt('okkupato?'), said('no')]), [])
})

test('answers to a question in the turn count as a decision to record', () => {
  const asked = tool('AskUserQuestion', { questions: [] })
  assert.match(check([prompt('continua'), asked, result(), said('procedo')])[0], /ariadne plan/)
  assert.deepEqual(check([prompt('continua'), asked, result(), bash('ariadne fill m4.8 --message "chat"'), result()]), [])
  assert.match(check([prompt('continua'), bash('ariadne fill m4.8 --message "x"'), asked, result()])[0], /ariadne plan/)
})
