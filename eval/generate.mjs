// The fixture generator (docs/valutazione/piano.md § 5): one scenario → the fake project in both conditions
// and the questions with their answers, the same bytes on every run.
// `ariadne/` applies the events with the real CLI and `Thread:` lines; `prima/` has the same commits without
// them. The thread files (.ariadne/, STATE.md, LOG.md) stay out of git, so the project files are identical.

import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const FROZEN = fileURLToPath(new URL('./frozen', import.meta.url))
const CLI = '.ariadne/cli/bin/ariadne.mjs'
const NONE = 'non risulta'

function sh(cmd, args, cwd, env = {}) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', env: { ...process.env, ...env } })
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')}: ${r.stderr || r.stdout}`)
  return r.stdout
}

// No global or system git config: the user's signing, hooks and templates must not reach a fixture.
const gitEnv = date => ({
  TZ: 'UTC', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'Dev', GIT_AUTHOR_EMAIL: 'dev@example.invalid', GIT_AUTHOR_DATE: date,
  GIT_COMMITTER_NAME: 'Dev', GIT_COMMITTER_EMAIL: 'dev@example.invalid', GIT_COMMITTER_DATE: date,
})

function init(dir, excluded) {
  mkdirSync(dir, { recursive: true })
  sh('git', ['init', '-q', '-b', 'main'], dir, gitEnv('2000-01-01T00:00:00Z'))
  writeFileSync(join(dir, '.git', 'info', 'exclude'), excluded.join('\n') + '\n')
}

function copyCli(dir) {
  cpSync(join(ROOT, 'bin', 'ariadne.mjs'), join(dir, '.ariadne', 'cli', 'bin', 'ariadne.mjs'))
  for (const f of readdirSync(join(ROOT, 'src')).filter(f => f.endsWith('.mjs') && !f.endsWith('.test.mjs'))) {
    cpSync(join(ROOT, 'src', f), join(dir, '.ariadne', 'cli', 'src', f))
  }
}

/** Builds `<dir>/ariadne`, `<dir>/prima` and the questions; returns `{ dir, questions }`. */
export function generate(scenario, dir) {
  const ariadne = join(dir, 'ariadne')
  const prima = join(dir, 'prima')
  init(ariadne, ['.ariadne/'])
  init(prima, ['STATE.md', 'LOG.md'])
  mkdirSync(join(ariadne, '.ariadne'), { recursive: true })
  writeFileSync(join(ariadne, '.ariadne', 'graph.jsonl'), '')
  copyCli(ariadne)

  const t0 = Date.parse(scenario.start)
  const titles = {}
  const ids = {}
  let clock
  const cli = (...args) => sh(process.execPath, [CLI, ...args], ariadne, { TZ: 'UTC', ARIADNE_NOW: clock.slice(0, 16) + 'Z' })
  const idOf = title => readFileSync(join(ariadne, '.ariadne', 'graph.jsonl'), 'utf8').trimEnd().split('\n').map(l => JSON.parse(l)).find(n => n.title === title).id
  const name = (key, title) => {
    if (Object.values(titles).includes(title)) throw new Error(`${scenario.id}: title used twice: ${title}`)
    titles[key] = title
    ids[key] = idOf(title)
  }

  scenario.events.forEach((e, i) => {
    clock = new Date(t0 + i * 60_000).toISOString().replace('.000', '')
    switch (e.type) {
      case 'milestone':
        cli('add', 'milestone', e.title, '--what', e.what, '--by', 'user')
        name(e.key, e.title)
        break
      case 'plan':
        cli('plan', ids[e.milestone], ...e.steps.map(s => s.title), '--ref', e.ref, '--by', 'user')
        for (const s of e.steps) name(s.key, s.title)
        break
      case 'start':
        cli('start', ids[e.step])
        break
      case 'detour':
        cli('add', 'detour', e.title, '--what', e.what, '--start')
        name(e.key, e.title)
        break
      case 'defer':
        cli('defer', ids[e.step], ids[e.to], '--by', 'user')
        break
      case 'replace':
        cli('replace', ids[e.step], ids[e.by], '--by', 'user')
        break
      case 'commit': {
        const message = [e.message, e.why].filter(Boolean).join('\n\n')
        const thread = e.step ? `\n\nThread: ${ids[e.step]}${e.done ? ` done: ${e.message}` : ''}` : ''
        for (const [repo, text] of [[prima, message], [ariadne, message + thread]]) {
          for (const [path, content] of Object.entries(e.files)) {
            mkdirSync(dirname(join(repo, path)), { recursive: true })
            writeFileSync(join(repo, path), content)
          }
          sh('git', ['add', '-A'], repo, gitEnv(clock))
          sh('git', ['commit', '-q', '-m', text], repo, gitEnv(clock))
        }
        if (!e.step) break
        cli('sync')
        if (e.why) cli('fill', ids[e.step], '--why', e.why)
        for (const f of e.proofFiles ?? []) cli('fill', ids[e.step], '--file', f)
        break
      }
      default:
        throw new Error(`${scenario.id}: unknown event ${e.type}`)
    }
  })

  for (const f of ['STATE.md', 'LOG.md']) {
    const frozen = join(FROZEN, scenario.id, 'prima', f)
    if (existsSync(frozen)) cpSync(frozen, join(prima, f))
  }
  const questions = scenario.questions.map(q => ({ cat: q.cat, text: q.text, ...answer(q, scenario, titles) }))
  writeFileSync(join(dir, 'questions.json'), JSON.stringify(questions, null, 2) + '\n')
  return { dir, questions }
}

/** The files a step's commits touched, with the files its proofs point to. */
function filesOf(scenario, key) {
  const commits = scenario.events.filter(e => e.type === 'commit' && e.step === key)
  return commits.flatMap(e => [...Object.keys(e.files), ...(e.proofFiles ?? []).map(f => f.split('#')[0])])
}

/** Steps that are over: closed by a commit, deferred or replaced. */
function finished(scenario) {
  const keys = scenario.events.flatMap(e => (e.type === 'commit' && e.done ? [e.step] : e.type === 'defer' || e.type === 'replace' ? [e.step] : []))
  return [...new Set(keys)]
}

function answer(q, scenario, titles) {
  switch (q.cat) {
    case 'where': return { answer: { current: titles[q.current], next: titles[q.next] } }
    case 'why': return { answer: q.reason, options: [q.reason, ...q.distractors, NONE] }
    case 'proof': return { answer: q.file }
    case 'deferred': return { answer: { step: titles[q.step], milestone: titles[q.milestone] } }
    case 'update': return { answer: titles[q.step] }
    case 'abstain': return { answer: NONE }
    case 'continue': {
      const sorted = files => [...new Set(files)].sort()
      return { answer: { dir: q.dir, allowed: sorted(filesOf(scenario, q.next)), forbidden: sorted(finished(scenario).flatMap(k => filesOf(scenario, k))) } }
    }
    default: throw new Error(`${scenario.id}: unknown question category ${q.cat}`)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [file, out] = process.argv.slice(2)
  if (!file) {
    console.error('uso: node eval/generate.mjs <scenario.json> [cartella]')
    process.exit(2)
  }
  const scenario = JSON.parse(readFileSync(file, 'utf8'))
  const dir = resolve(out ?? join(ROOT, 'eval', 'out', scenario.id))
  rmSync(dir, { recursive: true, force: true })
  generate(scenario, dir)
  console.log(`${scenario.id}: ${dir}`)
}
