// The E1 runner (docs/valutazione/piano.md § 6): one trial = an isolated copy of a fixture condition, a
// `claude -p` subject with the condition's hooks and instructions, the raw stream kept, the answer graded.

import { spawnSync } from 'node:child_process'
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { normalizedCost } from './cost.mjs'
import { grade, gradeContinue } from './grade.mjs'

// The evaluation was frozen with ariadne writing in Italian.
process.env.ARIADNE_LANG ??= 'it'

const CONDITIONS = ['prima', 'ariadne']
const ARIADNE = 'node .ariadne/cli/bin/ariadne.mjs'
const TIMEOUT_MS = 300_000
const RETRIES = 2
const FORMAT = 'Answer in English. In the last line write `RISPOSTA: <answer>`; if the project does not contain the answer, write `RISPOSTA: non risulta`.'

/** A seeded generator in [0, 1) (mulberry32): the same seed, the same order. */
export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle(items, random) {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// Continua asks for code: closing the step in the thread first is bookkeeping, not the next piece of work.
const CONTINUE = 'Resume the work: make the first code change you would make.'

export function promptFor(q, order) {
  if (q.cat === 'continue') return CONTINUE
  const options = q.options ? `\n\n${order.map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`).join('\n')}\n\nAnswer with the letter.` : ''
  const format = q.cat === 'where' ? FORMAT.replace('<answer>', '<current step> | <next step>') : FORMAT
  return `${q.text}${options}\n\n${format}`
}

/** Hooks and allowed commands of a condition; each hook also copies its output to `injectDir`. */
export function settingsFor(condition, { injectDir, edits = false }) {
  const hook = (command, event) => [{ hooks: [{ type: 'command', command: `${command} | tee '${join(injectDir, `${event}.txt`)}'` }] }]
  const hooks = condition === 'prima'
    ? { SessionStart: hook('cat STATE.md', 'SessionStart') }
    : { SessionStart: hook(`${ARIADNE} card --hook`, 'SessionStart'), UserPromptSubmit: hook(`${ARIADNE} summary --hook`, 'UserPromptSubmit') }
  // The helpers models chain to their reads (`a; echo ---; b | head`): without them a compound command is
  // denied whole. A read outside the copy is still caught by `outside` and excludes the trial.
  const helpers = ['echo', 'head', 'tail', 'wc', 'sort', 'git status'].map(c => `Bash(${c}:*)`)
  const allow = ['Read', 'Grep', 'Glob', 'Bash(git log:*)', 'Bash(git show:*)', 'Bash(git diff:*)', ...helpers]
  if (condition === 'ariadne') allow.push(`Bash(${ARIADNE}:*)`)
  if (edits) allow.push('Edit', 'Write')
  return { hooks, permissions: { allow, deny: ['Bash(git diff --no-index:*)', 'Bash(git -C:*)'] } }
}

/** Paths a tool call names outside the copy: absolute paths elsewhere, `..` or `~`. */
function outside(events, copy) {
  const roots = [copy, realpathSync(copy)].flatMap(r => [r, r.replace(/^\/private/, '')])
  const found = []
  for (const e of events) {
    for (const c of Array.isArray(e.message?.content) ? e.message.content : []) {
      if (c.type !== 'tool_use') continue
      for (const key of ['file_path', 'path', 'command', 'notebook_path']) {
        const value = c.input?.[key]
        if (typeof value !== 'string') continue
        // A path only if its first folder exists: `/\.md$/` in a regular expression is not one.
        for (const [p] of value.matchAll(/(?<![\w.~-])\/(?!\/)[^\s'"`;|&)]+/g)) {
          if (p === '/dev/null' || roots.some(r => p === r || p.startsWith(`${r}/`))) continue
          if (existsSync(`/${p.split('/')[1]}`)) found.push(p)
        }
        // `..` and `~` only in the path of a file tool: a command may hold code with relative imports.
        if (key !== 'command' && /(^|[\s/'"])\.\.(\/|$|\s)|(^|\s)~/.test(value)) found.push(value)
      }
    }
  }
  return found
}

function changedFiles(copy) {
  const r = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: copy, encoding: 'utf8' })
  const lines = r.stdout.split('\n').filter(Boolean)
  return {
    modified: lines.filter(l => !l.startsWith('??')).map(l => l.slice(3)),
    added: lines.filter(l => l.startsWith('??')).map(l => l.slice(3)),
  }
}

export function launch(bin, args, cwd, env) {
  const [cmd, pre] = bin.endsWith('.mjs') ? [process.execPath, [bin]] : [bin, []]
  return spawnSync(cmd, [...pre, ...args], { cwd, input: '', timeout: TIMEOUT_MS, maxBuffer: 256 * 1024 * 1024, encoding: 'utf8', env: { ...process.env, ...env } })
}

/** One prompt to a model with no project around it: its text, whether it failed, and its costs. */
export function ask(prompt, { model, bin, env }) {
  const cwd = mkdtempSync(join(tmpdir(), 'ariadne-ask-'))
  try {
    const r = launch(bin, ['-p', prompt, '--model', model, '--restricted', '--tools', 'Read', '--permission-mode', 'dontAsk', '--strict-mcp-config',
      '--disable-slash-commands', '--no-session-persistence', '--output-format', 'stream-json', '--verbose'], cwd, env)
    const events = (r.stdout ?? '').split('\n').flatMap(l => { try { return [JSON.parse(l)] } catch { return [] } })
    const result = events.find(e => e.type === 'result')
    const firstReads = events.find(e => e.type === 'assistant')?.message?.usage?.cache_read_input_tokens ?? 0
    return { text: result?.result ?? '', error: !result || result.is_error, cost: result?.total_cost_usd ?? null, costNorm: result ? normalizedCost(model, result.usage ?? {}, firstReads) : null }
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
}

/** Runs one trial and returns its record; `raw` is a folder for the stream, kept as it came (P2). */
export function trial({ fixture, condition, q, key, model, seed, bin = 'claude', env = {}, raw, id = 'trial', phrasing = 'original' }) {
  const copy = mkdtempSync(join(tmpdir(), 'ariadne-trial-'))
  const injectDir = mkdtempSync(join(tmpdir(), 'ariadne-inject-'))
  try {
    cpSync(join(fixture, condition), copy, { recursive: true })
    const edits = q.cat === 'continue'
    const settings = join(injectDir, 'settings.json')
    writeFileSync(settings, JSON.stringify(settingsFor(condition, { injectDir, edits })))
    const order = q.options ? shuffle(q.options, rng(seed)) : undefined
    const text = phrasing === 'paraphrase' ? { ...q, text: q.paraphrase } : q
    const instructions = readFileSync(new URL(`./conditions/${condition}.md`, import.meta.url), 'utf8')
    const args = ['-p', promptFor(text, order), '--model', model, '--effort', 'medium', '--restricted',
      '--tools', `Read,Grep,Glob,Bash${edits ? ',Edit,Write' : ''}`, '--settings', settings,
      '--permission-mode', 'dontAsk', '--strict-mcp-config', '--disable-slash-commands', '--no-session-persistence',
      '--output-format', 'stream-json', '--verbose', '--append-system-prompt', instructions]

    let r, events, result
    let attempts = 0
    const started = Date.now()
    do {
      r = launch(bin, args, copy, env)
      events = (r.stdout ?? '').split('\n').flatMap(l => { try { return [JSON.parse(l)] } catch { return [] } })
      result = events.find(e => e.type === 'result')
      attempts++
    } while ((!result || result.is_error) && attempts <= RETRIES)
    if (raw) {
      mkdirSync(raw, { recursive: true })
      writeFileSync(join(raw, `${id}.jsonl`), r.stdout ?? '')
    }

    // The prompt hook of ariadne speaks only when the summary changed since the card: silent on the first prompt.
    const expected = ['SessionStart']
    const told = f => existsSync(join(injectDir, f)) && readFileSync(join(injectDir, f), 'utf8').trim() !== ''
    const injected = Object.fromEntries(expected.map(ev => [ev, told(`${ev}.txt`) && (ev !== 'SessionStart' || events.some(e => e.subtype === 'hook_response' && e.hook_event === 'SessionStart' && e.output?.trim()))]))
    const away = outside(events, copy)
    const u = result?.usage ?? {}
    const excluded = !result || result.is_error ? 'error' : away.length ? 'outside' : !Object.values(injected).every(Boolean) ? 'no-injection' : null
    const changed = edits ? changedFiles(copy) : null
    const graded = !result ? { status: 'format', value: null }
      : edits ? gradeContinue(q, changed.modified, changed.added)
      : grade(q, result.result ?? '', { ...key, order })
    // Autonomy (§ 0): on Continua, an agent that changed nothing and ended on a question stopped to ask.
    const asked = edits ? changed.modified.length + changed.added.length === 0 && /\?\s*$/.test(result?.result ?? '') : undefined
    const firstReads = events.find(e => e.type === 'assistant')?.message?.usage?.cache_read_input_tokens ?? 0
    return {
      id, condition, cat: q.cat, phrasing, model, seed, status: graded.status, value: graded.value, order, excluded, outside: away, injected, attempts,
      tokens: (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.output_tokens ?? 0),
      cost: result?.total_cost_usd ?? null, costNorm: result ? normalizedCost(model, u, firstReads) : null, asked, ms: Date.now() - started,
    }
  } finally {
    rmSync(copy, { recursive: true, force: true })
    rmSync(injectDir, { recursive: true, force: true })
  }
}

/** Every question × condition × repetition, in a seeded random order; each trial gets its own seed. */
export function schedule({ questions, reps, seed }) {
  const random = rng(seed)
  const all = questions.flatMap((q, index) => CONDITIONS.flatMap(condition => Array.from({ length: reps }, (_, rep) => ({ index, cat: q.cat, condition, rep }))))
  return shuffle(all, random).map(t => ({ ...t, seed: Math.floor(random() * 2 ** 31) }))
}

/**
 * Runs every scheduled trial of one fixture into `out/results.jsonl`, skipping the ids already there. An API
 * error, such as the usage limit, stops the run without recording the trial: the next run does it again.
 */
export function runFixture({ dir, model, reps, seed, out, phrasing = 'original', bin = 'claude', env = {}, log = () => {} }) {
  const questions = JSON.parse(readFileSync(join(dir, 'questions.json'), 'utf8'))
  const key = JSON.parse(readFileSync(join(dir, 'key.json'), 'utf8'))
  const name = dir.split('/').at(-1)
  mkdirSync(out, { recursive: true })
  const file = join(out, 'results.jsonl')
  const recorded = new Set(existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l).id) : [])
  const trials = schedule({ questions, reps, seed })
  let done = 0
  let skipped = 0
  for (const t of trials) {
    const id = `${name}-${phrasing}-q${t.index}-${t.condition}-r${t.rep}`
    if (recorded.has(id)) { skipped++; continue }
    const r = trial({ fixture: dir, condition: t.condition, q: questions[t.index], key, model, seed: t.seed, bin, env, raw: join(out, 'raw'), id, phrasing })
    if (r.excluded === 'error') {
      log(`${id}: errore dell'API (limite d'uso?), mi fermo; rilancia lo stesso comando per riprendere`)
      return { done, skipped, stopped: true }
    }
    appendFileSync(file, JSON.stringify({ fixture: name, index: t.index, rep: t.rep, ...r }) + '\n')
    done++
    log(`${done + skipped}/${trials.length} ${id}: ${r.status}${r.excluded ? ` (escluso: ${r.excluded})` : ''}`)
  }
  return { done, skipped, stopped: false }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { positionals: fixtures, values } = parseArgs({ allowPositionals: true, options: {
    model: { type: 'string' }, reps: { type: 'string', default: '2' }, seed: { type: 'string', default: '1' },
    out: { type: 'string' }, paraphrase: { type: 'boolean' }, bin: { type: 'string', default: 'claude' },
  } })
  if (fixtures.length === 0 || !values.model || !values.out) {
    console.error('uso: node eval/run.mjs <cartelle delle fixture>… --model <id> --out <cartella> [--reps 2] [--seed 1] [--paraphrase]')
    process.exit(2)
  }
  for (const fixture of fixtures) {
    const r = runFixture({ dir: resolve(fixture), model: values.model, reps: Number(values.reps), seed: Number(values.seed), out: resolve(values.out),
      phrasing: values.paraphrase ? 'paraphrase' : 'original', bin: values.bin, log: line => console.log(line) })
    if (r.stopped) process.exit(3)
  }
}
