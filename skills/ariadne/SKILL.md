---
name: ariadne
description: Keep the ariadne thread of a project — the graph in .ariadne/ that says where the work is, where it came from and what comes next. Use in any project that has an .ariadne/ folder, or when a session starts with an ariadne state card, whenever you plan work the user approved, commit, start or finish a step, go off plan (a detour, a deferral, a replaced step), resume after /clear, or the user corrects the graph ("move X under Y", "undo", "approve all"). Also use when the user asks to set up ariadne in a project.
---

# Keeping the thread

The graph in `.ariadne/` is the project's memory across sessions: where you are, where you came from,
what comes next. A hook shows its state card when a session starts and a short summary on each prompt
when it changed. Your job is to record the work you already do, as you do it, with the `ariadne`
command. Tracking must never slow the work down: one command at the moment something happens, no more.

Every `ariadne add` prints the id it gave the new node: use that id, don't guess one.
Write titles, `--what` and outcomes in the language the user speaks with you: the graph is theirs to read.
Change `.ariadne/` only through `ariadne`: it validates every change and keeps the log, the generated
`.ariadne/STATE.md` and the band in step. A hand edit can break the graph silently.

## Set up

No `.ariadne/` folder yet and the user wants the thread: run `ariadne init`. The graph starts with the
first milestone, `ariadne add milestone "<title>" --what "<the goal in one line>" --start`, and its plan.

## Resume after /clear

Read the state card first. For anything else, grep `.ariadne/STATE.md` (one line per node, generated),
then `ariadne why <id>` only for the nodes you need. Don't read the whole graph.

## While you work

The test of the thread: the user can `/clear` at any moment and the next session needs nothing from
you. Commits are recorded by a hook; what is decided in chat is recorded only if you do it, there and
then. If you ever feel you should write a recap before `/clear`, something was not recorded when it
happened: record it now, and next time earlier.

- **A plan the user approved:** `ariadne plan <parent> "<step>" "<step>"… --ref "chat <date>: <what was approved>"`.
  The `--ref` is the evidence that the user agreed; without an approval, don't plan.
- **Commits:** every commit message carries `Thread: <id>` for the node you work on; the last commit of
  a step carries `Thread: <id> done: <outcome in one line>`. A hook records the commit as proof, closes
  the step and starts the next one. Git reads trailers only in the message's last paragraph, so put
  `Thread:` there, next to any `Co-Authored-By:`, with no blank line between them.
- **Decided in chat, recorded at once,** in the same turn the user says it:
  - next steps the user agrees to: `ariadne plan <id> "<step>"… --ref "chat <date>: …"`, even in the
    middle of a step (they become its sub-steps). `plan` under the current step starts the first new
    step; when the user wants other work done first, plan and `start` that work, then plan the rest;
  - a direction that shapes the work ("no names", "less technical", "fix X before Y"):
    `ariadne fill <id> --message "chat <date>: <the direction>"` on the step it shapes;
  - a result saved outside the repo, or not committed yet: `ariadne fill <id> --file <path>` as soon as
    the file exists, so the next session finds it.
- **Work with no commit** (research, a decision, a document): `ariadne close <id> "<outcome>" --file <path>`
  so the result points to where it lives; `--message "chat <date>"` only when it lives nowhere else.
- **Off plan,** recorded at once, the user confirms later:
  - something unplanned you must do now: `ariadne add detour "<title>" --what "…" --start`; it closes
    like any step (a commit with `Thread: <id> done: …`, or `close` when nothing is committed) and the
    thread then returns to where you were;
  - a step pushed to a later milestone: `ariadne defer <id> <milestone>`;
  - a step that turned out wrong: `ariadne replace <id> <successor>`.

## Investigator reasoning (when the user asks for it)

One `ariadne add list "<question>" --what "…"` for the investigation, one
`ariadne add point "<clue>" --what "…" --under <list>` per clue, and a deduction
`ariadne add point "<conclusion>" --what "…" --under <list> --after <clue>,<clue> --why "…"`.
A hypothesis the evidence disproves: `ariadne replace <id> <clue that disproves it>`.
`ariadne why <deduction>` rebuilds the chain.

## The user's corrections

"Move X under Y" → `ariadne move X Y`; "undo" → `ariadne undo`; "approve all" → `ariadne confirm --all`;
"no, not that" → `ariadne reject <id>`. These are the user's own acts, recorded as theirs.

## Look

`ariadne open [id]` opens the graph in the browser; `ariadne show <id>`, `ariadne why <id>` and
`ariadne log` answer in the terminal. Run `ariadne` alone for every command.
