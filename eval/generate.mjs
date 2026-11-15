// The fixture generator (docs/valutazione/piano.md § 5): one scenario → the fake project in both conditions
// and the questions with their answers, the same bytes on every run.
// `ariadne/` applies the events with the real CLI and `Thread:` lines; `prima/` has the same commits without
// them. The thread files (.ariadne/, STATE.md, LOG.md) stay out of git, so the project files are identical.

import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalize } from './grade.mjs'

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

/**
 * Builds `<dir>/ariadne`, `<dir>/prima`, the questions and the grading key; returns `{ dir, questions, key }`.
 * `until` stops before that event and leaves out the frozen STATE.md and LOG.md: the handoffs of prima start there.
 */
export function generate(scenario, dir, { until, paraphrases } = {}) {
  const errors = check(scenario)
  if (errors.length) throw new Error(`${scenario.id}: ${errors.join('; ')}`)
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

  scenario.events.slice(0, until).forEach((e, i) => {
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
      case 'defer': {
        cli('defer', ids[e.step], ids[e.to], '--by', 'user')
        // Later work on the step goes to the node that resumes it in the new milestone, as an agent writes it.
        const old = ids[e.step]
        ids[e.step] = readFileSync(join(ariadne, '.ariadne', 'graph.jsonl'), 'utf8').trimEnd().split('\n').map(l => JSON.parse(l)).find(n => n.continues === old).id
        break
      }
      case 'replace':
        cli('replace', ids[e.step], ids[e.by], '--by', 'user')
        break
      case 'handoff':
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

  for (const f of until === undefined ? ['STATE.md', 'LOG.md'] : []) {
    const frozen = join(FROZEN, scenario.id, 'prima', f)
    if (existsSync(frozen)) cpSync(frozen, join(prima, f))
  }
  // A partial generation, for the handoffs of prima, needs no questions: the steps they name may not exist yet.
  if (until !== undefined) return { dir }
  // Frozen paraphrases (eval/paraphrase.mjs), when the scenario has them.
  const frozenParaphrases = join(FROZEN, scenario.id, 'paraphrases.json')
  const reworded = paraphrases ?? (existsSync(frozenParaphrases) ? JSON.parse(readFileSync(frozenParaphrases, 'utf8')) : [])
  const questions = scenario.questions.map((q, i) => ({ cat: q.cat, text: q.text, ...(reworded[i] ? { paraphrase: reworded[i] } : {}), ...answer(q, scenario, titles) }))
  writeFileSync(join(dir, 'questions.json'), JSON.stringify(questions, null, 2) + '\n')
  // What the graders need besides each answer: every step title, to catch an answer that names the wrong one.
  // Milestones are kept apart: an answer may name the milestone around a step without naming a wrong step.
  const milestones = new Set(scenario.events.filter(e => e.type === 'milestone').map(e => e.key))
  const key = {
    titles: Object.entries(titles).filter(([k]) => !milestones.has(k)).map(([, t]) => t),
    milestones: [...milestones].map(k => titles[k]),
    aliases: scenario.aliases ?? {},
  }
  writeFileSync(join(dir, 'key.json'), JSON.stringify(key, null, 2) + '\n')
  return { dir, questions, key }
}

const CATEGORIES = ['where', 'why', 'proof', 'deferred', 'update', 'abstain', 'continue']

/** What a scenario breaks: references, steps without a file of their own, answers the events contradict. */
export function check(scenario, { test = false } = {}) {
  const errors = []
  const titles = {}
  const plans = []
  const status = {}
  const reentry = {}
  let current = null
  const handoffs = []
  const plannedAt = {}
  const known = key => key in titles || errors.push(`unknown key: ${key}`)
  for (const e of scenario.events) {
    for (const k of [e.step, e.milestone, e.to, e.by].filter(Boolean)) known(k)
    if (e.type === 'milestone') titles[e.key] = e.title
    if (e.type === 'plan') {
      for (const s of e.steps) { titles[s.key] = s.title; status[s.key] = 'todo'; plannedAt[s.key] = scenario.events.indexOf(e) }
      plans.push(e.steps.map(s => s.key))
    }
    if (e.type === 'start') { current = e.step; status[e.step] = 'active' }
    if (e.type === 'detour') { titles[e.key] = e.title; reentry[e.key] = current; current = e.key; status[e.key] = 'active' }
    if (e.type === 'handoff') handoffs.push({ at: scenario.events.indexOf(e), open: Object.keys(status).filter(k => ['todo', 'active'].includes(status[k])) })
    if (e.type === 'defer') status[e.step] = 'deferred'
    if (e.type === 'replace') status[e.step] = 'replaced'
    if (e.type === 'commit' && e.done) {
      status[e.step] = 'done'
      if (e.step === current) {
        const plan = plans.find(p => p.includes(e.step))
        current = e.step in reentry ? reentry[e.step] : plan?.slice(plan.indexOf(e.step) + 1).find(k => status[k] === 'todo') ?? null
        if (current && status[current] === 'todo') status[current] = 'active'
      }
    }
  }
  const values = Object.values(titles)
  for (const t of new Set(values.filter((t, i) => values.indexOf(t) !== i))) errors.push(`title used twice: ${t}`)

  const stepsWithCommits = [...new Set(scenario.events.filter(e => e.type === 'commit' && e.step).map(e => e.step))]
  for (const key of stepsWithCommits) {
    const others = new Set(stepsWithCommits.filter(k => k !== key).flatMap(k => filesOf(scenario, k)))
    if (!filesOf(scenario, key).some(f => !others.has(f))) errors.push(`${key}: no file of its own`)
  }

  const missing = CATEGORIES.filter(c => !scenario.questions.some(q => q.cat === c))
  if (missing.length) errors.push(`missing categories: ${missing.join(', ')}`)
  const texts = scenario.events.filter(e => e.type === 'commit').flatMap(e => [e.message, e.why ?? '', ...Object.values(e.files)])
  for (const q of scenario.questions) {
    if (q.cat === 'where') {
      if (q.current !== current) errors.push(`where: "${q.current}" is not the open step (${current})`)
      if (status[q.next] !== 'todo') errors.push(`where: next "${q.next}" is not a step still to do`)
    }
    if (q.cat === 'deferred' && !scenario.events.some(e => e.type === 'defer' && e.step === q.step && e.to === q.milestone)) errors.push(`deferred: "${q.step}" was not deferred to ${q.milestone}`)
    if (q.cat === 'proof' && !filesOf(scenario, q.step).includes(q.file)) errors.push(`proof: ${q.file} is not a file of "${q.step}"`)
    if (q.cat === 'why') {
      if (!texts.some(t => normalize(t).includes(normalize(q.reason)))) errors.push('why: the reason is in no document or commit')
      if (q.distractors?.length !== 3 || q.distractors.includes(q.reason)) errors.push('why: needs 3 distractors other than the reason')
    }
    if (q.cat === 'update' && !scenario.events.some(e => e.type === 'replace' && e.by === q.step)) errors.push(`update: "${q.step}" replaces nothing`)
    if (q.cat === 'continue' && q.next !== current) errors.push(`continue: "${q.next}" is not the open step (${current})`)
  }
  if (test) errors.push(...testRules(scenario, { handoffs, plannedAt, current, stepsWithCommits }))
  return errors
}

/** Test scenarios only (eval/pilot.md): handoffs at the end of a milestone, as the handoff skill prescribes;
 *  work planned after the last one; an open step whose work lives in a folder of its own. */
function testRules(scenario, { handoffs, plannedAt, current, stepsWithCommits }) {
  const errors = []
  if (handoffs.length === 0) return ['test: no handoff']
  for (const h of handoffs) if (h.open.length) errors.push(`test: handoff at event ${h.at} with steps still open: ${h.open.join(', ')}`)
  const last = handoffs.at(-1).at
  if (current && !(plannedAt[current] > last)) errors.push('test: the open step was planned before the last handoff')
  const after = scenario.events.slice(last + 1).filter(e => e.type === 'commit').length
  if (after < 5) errors.push(`test: ${after} commits after the last handoff, at least 5`)
  const dir = scenario.questions.find(q => q.cat === 'continue')?.dir
  if (dir) {
    for (const f of filesOf(scenario, current)) if (!f.startsWith(dir)) errors.push(`test: ${f} of the open step is outside ${dir}`)
    for (const key of stepsWithCommits.filter(k => k !== current)) {
      for (const f of filesOf(scenario, key)) if (f.startsWith(dir)) errors.push(`test: ${key} touches ${f}, in the folder of the open step`)
    }
  }
  return errors
}

/** The files a step's commits touched, with the files its proofs point to. */
function filesOf(scenario, key) {
  const commits = scenario.events.filter(e => e.type === 'commit' && e.step === key)
  return commits.flatMap(e => [...Object.keys(e.files), ...(e.proofFiles ?? []).map(f => f.split('#')[0])])
}

const milestoneKeys = scenario => scenario.events.filter(e => e.type === 'milestone').map(e => e.key)

/** The other steps, the most alike in words first; ties keep the scenario order. */
function similar(scenario, titles, key) {
  const words = k => new Set(normalize(titles[k]).split(' '))
  const mine = words(key)
  const milestones = new Set(milestoneKeys(scenario))
  return Object.keys(titles).filter(k => k !== key && !milestones.has(k))
    .map((k, i) => ({ k, i, shared: [...words(k)].filter(w => mine.has(w)).length }))
    .sort((x, y) => y.shared - x.shared || x.i - y.i).map(x => x.k)
}

function answer(q, scenario, titles) {
  switch (q.cat) {
    case 'where': return { answer: { current: titles[q.current], next: titles[q.next] } }
    case 'why': return { answer: q.reason, options: [q.reason, ...q.distractors, NONE] }
    case 'proof': {
      // Any file of the step's own is right: a step may hold its result in several.
      const others = new Set(Object.keys(titles).filter(k => k !== q.step).flatMap(k => filesOf(scenario, k)))
      return { answer: [...new Set(filesOf(scenario, q.step).filter(f => !others.has(f)))].sort() }
    }
    case 'deferred': {
      const others = milestoneKeys(scenario).filter(k => k !== q.milestone)
      const [a, b, c] = similar(scenario, titles, q.step)
      const right = `${titles[q.step]} → ${titles[q.milestone]}`
      const wrong = [`${titles[a]} → ${titles[q.milestone]}`, `${titles[q.step]} → ${titles[others[0] ?? q.milestone]}`, `${titles[b]} → ${titles[others[0] ?? q.milestone]}`, `${titles[c]} → ${titles[q.milestone]}`]
      return { answer: right, options: [right, ...[...new Set(wrong)].filter(o => o !== right).slice(0, 3), NONE] }
    }
    case 'update': {
      // The replaced decision is the natural wrong answer; the other two are the closest titles.
      const replaced = scenario.events.filter(e => e.type === 'replace' && e.by === q.step).map(e => e.step)
      const wrong = [...replaced, ...similar(scenario, titles, q.step).filter(k => !replaced.includes(k))].slice(0, 3)
      return { answer: titles[q.step], options: [titles[q.step], ...wrong.map(k => titles[k]), NONE] }
    }
    case 'abstain': return { answer: NONE }
    case 'continue': {
      const sorted = files => [...new Set(files)].sort()
      // Finished steps' files are allowed: the open step may build on them. Set-aside work is not.
      const allowed = sorted(filesOf(scenario, q.next))
      const aside = scenario.events.filter(e => e.type === 'defer' || e.type === 'replace').map(e => e.step)
      return { answer: { dir: q.dir, allowed, forbidden: sorted(aside.flatMap(k => filesOf(scenario, k))).filter(f => !allowed.includes(f)) } }
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
