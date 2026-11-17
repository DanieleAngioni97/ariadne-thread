<p><img src="assets/logo-wordmark.svg" alt="ariadne" width="260"></p>

Ariadne's thread for long work with Claude Code. As you research, design, build and debug, a graph
of the steps grows in your project, and every session starts knowing where you are, where you came
from and what comes next — even after `/clear`.

- **A state card** when a session starts, and a short summary on each prompt when it changed.
- **A band above the prompt:** the current step, what waits for your confirmation, the last outcome.
- **A viewer in the browser:** the whole graph, a timeline and a list, with why each step exists.
- **No extra work:** Claude records steps as it goes; each commit with a `Thread:` line is the proof of a step.

## Install

You need [Claude Code](https://code.claude.com) and [Node.js](https://nodejs.org) 20 or later.
At the Claude Code prompt:

```
/plugin install ariadne --marketplace DanieleAngioni97/ariadne-thread
```

Answer `y` to add the marketplace, pick a scope, then, in each project you want to follow:

```
/ariadne:init
```

That's all. The plugin stays silent in projects without `ariadne init`.

**The band** above the prompt runs on Claude Code's hooks modules, still in early access and off by
default. To turn them on, add this to `~/.claude/settings.json` and restart Claude Code:

```json
"env": { "CLAUDE_CODE_ENABLE_FUNCTION_HOOKS": "1" }
```

Without it, the state card, the summaries, the commit hook and the viewer work all the same;
`/ariadne:init` reminds you when the flag is missing.

## Use it

Work as usual. When you approve a plan, Claude records its steps; when it commits, the step's
evidence is recorded and the thread moves on. Things you can say:

| You say | Claude runs |
| --- | --- |
| "ok, go with that plan" | `ariadne plan <parent> "<step>"… --what "<detail>"… --ref "chat <date>: …"` (short titles, one detail per step) |
| "fix CI first" | `ariadne add detour "…" --start` (it returns where you were) |
| "I'll decide where to host it later" | `ariadne add decision "Where to host?" --what "…"` (shown in the card until you answer) |
| "careful, the keys expire" | `ariadne add risk "Keys expire" --what "…" --under <step>` |
| "not that one yet, it comes later" | `ariadne pause <id>` (a step started too early goes back to todo) |
| "move X under Y", "undo", "approve all" | `ariadne move X Y`, `ariadne undo`, `ariadne confirm --all` |
| "open the graph" | `ariadne open` |
| "why are we doing this?" | `ariadne why <id>` |
| "move my STATE.md and LOG.md into the thread" | `ariadne migrate` (preview), then `ariadne migrate --apply`; `ariadne migrate --undo` goes back |
| "a teammate doesn't use ariadne" / "I want out" | `ariadne export --always` keeps a generated STATE.md and LOG.md in step; `ariadne export` writes them once, to leave |
| "can I /clear now?" | `ariadne check --clear` (what is not committed, only in the chat, or outside the repo) |
| "something still reads STATE.md" | `ariadne doctor` (hooks, skills and rules that still use STATE.md or LOG.md, and what to change; it edits nothing) |

The band's **Open the graph** button opens the viewer too. Each project gets its own viewer port,
so sessions on several projects don't collide.

Everything lives in `.ariadne/` in your project: `graph.jsonl` (the steps), `log.jsonl` (the diary)
and `thread.json` (where you are). Commit them with your code; the generated `STATE.md` and the
machine-local `local.json` stay out of git.

## How it works

- **The thread is a file.** `.ariadne/graph.jsonl` holds one JSON node per line: a milestone, a step, a
  detour, a list and its points for an investigation, a decision only you can make, or a risk on a
  step. Each node has a status (todo, active, done, deferred, replaced), a why, and proofs: a commit,
  a file, or a chat message. A decision blocks the work that waits for it and closes only with your
  answer; a risk only warns.
- **Changes are typed operations.** `ariadne plan`, `add`, `close`, `defer`, `replace` and the others
  are checked against the graph rules and applied all or nothing. Untouched lines stay byte for byte,
  so diffs stay small. Nothing is deleted: a deferred or replaced step stays, pointing to what took
  its place. Every change also lands in `log.jsonl`, the diary.
- **Commits move the thread.** A commit carries a `Thread: <id>` trailer, and the last one of a step
  `Thread: <id> done: <outcome>`. After a `git commit`, a hook runs `ariadne sync`: it links the
  commit to the step as proof, closes the step and starts the next one. Commits that touch only
  `.ariadne/` are not proof.
- **The agent gets the state on its own.** On session start, `/clear` and compaction, a hook injects
  the state card, at most 3,500 characters: where you are, what is left of the open step, what comes
  next, detours waiting to return, open decisions and the open risks of the milestone. On each prompt, a short summary arrives only when it changed.
- **Decisions taken in chat.** The skill asks Claude to record approvals, directions and files saved
  outside the project in the same turn. At the end of each turn, a Stop hook (`ariadne check`) reads
  the turn and, once, hands Claude back what the thread missed: a short "yes" with nothing recorded,
  a file written outside the project that no step cites, or a commit without `Thread:`. The check is
  rule-based and not yet measured.
- **Detours come back.** `ariadne add detour … --start` opens a detour from where you are; when it
  closes, the thread returns to the step you left.
- **Files outside the project** are saved as `~/…`, so the graph in git does not carry your user name.
  Folder names still show: check them before you publish a repository.

## Does it work?

We tested whether an agent resuming work with ariadne does as well as with handwritten handoff
notes. Each of 12 synthetic projects existed in two identical copies, one with notes, one with ariadne.
Claude Sonnet answered six questions about each project and was then told "resume the work".

- **Answers:** not worse than with notes, the hypothesis fixed in advance: 98.6% against 96.5% correct.
- **Resuming:** the first edit landed in the open step 24 times out of 24 with ariadne, 14 with notes
  (20 with a looser criterion decided afterwards). This was observed, not a pre-registered test.
- **Cost:** about the same; the 5% saving is not significant.

Limits: synthetic projects, one model, and the test was built by the author. Method, pre-registration
and full results are in [`docs/valutazione/`](docs/valutazione/) (in Italian).

## Status

Early. The band uses Claude Code's mods API, which is in early access (see [Install](#install) to turn it on).

ariadne speaks your language: English or Italian, from your system's locale (and your browser's, for
the viewer); anything else falls back to English. To pin a language for a project, put
`{ "lang": "en" }` or `{ "lang": "it" }` in `.ariadne/config.json`.

## Develop

```sh
git clone https://github.com/DanieleAngioni97/ariadne-thread && cd ariadne-thread
node --test src/*.test.mjs bin/*.test.mjs hooks/*.test.mjs scripts/ariadne/*.test.mjs viewer/*.test.mjs eval/*.test.mjs   # CLI, hooks and viewer
scripts/plugin-test.sh   # plugin validation and band tests
```

To run your working copy as the plugin, add the folder as a marketplace (`/plugin marketplace add ./`)
and install `ariadne` from it: the plugin is then read from the folder, and `/reload-plugins` picks
up your edits.

## License

[MIT](LICENSE)
