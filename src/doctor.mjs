// `ariadne doctor`: what still leans on STATE.md and LOG.md once a project keeps its state in .ariadne/.
// Hooks that inject them, skills and rules that write them, project notes that cite them: each with the
// line, and what to change. It only reads; the user's configuration is theirs to edit.

import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { isGenerated } from './export.mjs'
import { words } from './i18n.mjs'

const say = words({
  en: {
    clean: 'ariadne doctor: no source mentions STATE.md or LOG.md any more: the state lives only in the graph',
    head: (lines, files) => `ariadne doctor: ${lines} lines in ${files} files still mention STATE.md or LOG.md (nothing was changed)`,
    more: k => `  … +${k} more lines in this file`,
    hook: 'Hooks', skill: 'Skills', rule: 'Rules and instructions', project: 'Project', root: 'Files in the root', ready: 'Already ready for ariadne',
    fixHook: '→ in a project with .ariadne/, skip STATE.md (e.g. `[ -d .ariadne ] && exit 0`): ariadne already gives the card at session start',
    fixSkill: '→ add: "If the project has .ariadne/, the state lives there: don\'t write STATE.md or LOG.md, record with ariadne."',
    fixProject: '→ point to the ariadne card and the generated .ariadne/STATE.md instead of STATE.md',
    fixRoot: '→ ariadne migrate brings them into the graph (preview first, then --apply; --undo goes back); until then STATE.md and the ariadne card may disagree',
  },
  it: {
    clean: 'ariadne doctor: nessuna fonte parla più di STATE.md o LOG.md: lo stato sta solo nel grafo',
    head: (lines, files) => `ariadne doctor: ${lines} righe in ${files} file parlano ancora di STATE.md o LOG.md (non ho modificato niente)`,
    more: k => `  … +${k} righe in questo file`,
    hook: 'Hook', skill: 'Skill', rule: 'Regole e istruzioni', project: 'Progetto', root: 'File nella root', ready: 'Già pronti per ariadne',
    fixHook: '→ in un progetto con .ariadne/ salta STATE.md (per esempio `[ -d .ariadne ] && exit 0`): la scheda di ariadne arriva già a inizio sessione',
    fixSkill: '→ aggiungi: «Se il progetto ha .ariadne/, lo stato sta lì: non scrivere STATE.md né LOG.md, registra con ariadne.»',
    fixProject: '→ punta alla scheda di ariadne e alla vista generata .ariadne/STATE.md invece che a STATE.md',
    fixRoot: '→ ariadne migrate li porta nel grafo (prima l\'anteprima, poi --apply; --undo torna indietro); fino ad allora STATE.md e la scheda di ariadne possono non coincidere',
  },
})

// STATE.md or LOG.md on its own, not a path such as .ariadne/STATE.md (ariadne's generated view).
const MENTION = /(?<![\w./-])(?:STATE|LOG)\.md\b/
const READY = /\.ariadne\b/
const SCRIPT = /\.(?:py|sh|bash|zsh|js|mjs|cjs|ts|rb)$/
const GROUPS = ['hook', 'skill', 'rule', 'project']
// A long script would drown the rest: a few lines per file say where to look.
const PER_FILE = 3
const FIX = { hook: 'fixHook', skill: 'fixSkill', rule: 'fixSkill', project: 'fixProject' }

const isFile = path => {
  try { return statSync(path).isFile() } catch { return false }
}
const read = path => (isFile(path) ? readFileSync(path, 'utf8') : '')
const listDir = dir => {
  try { return readdirSync(dir) } catch { return [] }
}
/** The markdown files under `dir`, at any depth. */
const markdownIn = dir => listDir(dir).flatMap(name => {
  const path = join(dir, name)
  if (isFile(path)) return name.endsWith('.md') ? [path] : []
  return markdownIn(path)
})

/**
 * Every line that still leans on STATE.md or LOG.md, `{ group, file, line, text, via? }` in the order
 * hook, skill, rule, project; and `rootFiles`, which of the two sit in the project's root.
 */
export function findConflicts({ project, configDirs, home }) {
  const seen = new Set()
  const found = []
  const ready = []
  // A file reached through a link shows its real path: that is the one to edit.
  const realOf = path => (existsSync(path) ? realpathSync(path) : path)
  const [realProject, realHome] = [realOf(project), realOf(home)]
  const show = path => (path.startsWith(realProject + '/') ? relative(realProject, path) : path.startsWith(realHome + '/') ? `~/${relative(realHome, path)}` : path)
  const scan = (group, path, via) => {
    if (!isFile(path)) return
    const real = realpathSync(path)
    if (seen.has(real)) return
    seen.add(real)
    const content = read(path)
    const lines = content.split('\n').flatMap((text, i) => (MENTION.test(text) ? [{ group, file: show(real), line: i + 1, text: text.trim().replace(/\s+/g, ' ').slice(0, 100), ...(via ? { via } : {}) }] : []))
    // A file that names .ariadne/ already tells the two cases apart: ready, not a conflict.
    if (lines.length && READY.test(content)) ready.push(show(real))
    else found.push(...lines)
  }

  // Hooks: the settings that declare them, and the scripts their commands run.
  const dirs = [...new Map(configDirs.filter(d => existsSync(d)).map(d => [realpathSync(d), d])).keys()]
  const settings = [
    ...dirs.flatMap(d => [join(d, 'settings.json'), join(d, 'settings.local.json')]),
    join(project, '.claude', 'settings.json'), join(project, '.claude', 'settings.local.json'),
  ]
  const scripts = new Map()
  const expand = token => token.replace(/^~(?=\/)/, home).replace(/^\$\{?HOME\}?/, home).replace(/^\$\{?CLAUDE_PROJECT_DIR\}?/, project)
  for (const file of settings) {
    let hooks = {}
    try { hooks = JSON.parse(read(file) || '{}').hooks ?? {} } catch {}
    for (const [event, entries] of Object.entries(hooks)) {
      for (const command of (entries ?? []).flatMap(e => e.hooks ?? []).map(h => h.command ?? '')) {
        if (MENTION.test(command)) scan('hook', file, event)
        for (const token of command.match(/(?:~|\$\{?HOME\}?|\$\{?CLAUDE_PROJECT_DIR\}?|\.{0,2})\/[^\s'";|&]+/g) ?? []) {
          const path = expand(token)
          if (SCRIPT.test(path) && isFile(path)) scripts.set(path, [...(scripts.get(path) ?? []), event])
        }
      }
    }
  }
  for (const [path, events] of scripts) scan('hook', path, [...new Set(events)].sort().join(', '))

  // Skills, commands and agents; then rules and instructions.
  const skillsOf = base => [
    ...listDir(join(base, 'skills')).map(name => join(base, 'skills', name, 'SKILL.md')),
    ...['commands', 'agents'].flatMap(sub => markdownIn(join(base, sub))),
  ]
  for (const path of [...dirs.flatMap(skillsOf), ...skillsOf(join(project, '.claude'))]) scan('skill', path)
  for (const path of dirs.flatMap(d => [join(d, 'CLAUDE.md'), ...markdownIn(join(d, 'rules'))])) scan('rule', path)

  // The project's own notes for agents.
  for (const name of ['CLAUDE.md', 'CLAUDE.local.md', 'AGENTS.md', join('.claude', 'CLAUDE.md')]) scan('project', join(project, name))

  const findings = GROUPS.flatMap(group => found.filter(f => f.group === group))
  // A STATE.md or LOG.md that `ariadne export` wrote is the thread itself, not a second source.
  const rootFiles = ['STATE.md', 'LOG.md'].filter(name => isFile(join(project, name)) && !isGenerated(read(join(project, name))))
  return { findings, rootFiles, ready }
}

/** The findings as text, one section per group, each with what to change. */
export function report({ findings, rootFiles, ready = [] }) {
  const readyBlock = ready.length ? ['', `## ${say('ready')}`, ...ready.map(f => `- ${f}`)] : []
  if (findings.length === 0 && rootFiles.length === 0) return [say('clean'), ...readyBlock].join('\n')
  const files = new Set(findings.map(f => f.file)).size
  const out = [say('head', findings.length, files)]
  for (const group of GROUPS) {
    const mine = findings.filter(f => f.group === group)
    if (mine.length === 0) continue
    out.push('', `## ${say(group)}`)
    for (const file of new Set(mine.map(f => f.file))) {
      const lines = mine.filter(f => f.file === file)
      out.push(...lines.slice(0, PER_FILE).map(f => `- ${f.file}:${f.line}${f.via ? ` (${f.via})` : ''} ${f.text}`))
      if (lines.length > PER_FILE) out.push(say('more', lines.length - PER_FILE))
    }
    out.push(say(FIX[group]))
  }
  if (rootFiles.length) out.push('', `## ${say('root')}`, `- ${rootFiles.join(', ')}`, say('fixRoot'))
  out.push(...readyBlock)
  return out.join('\n')
}
