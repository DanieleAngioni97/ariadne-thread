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
Write titles, `--what` and outcomes in the language the project sets for its docs or notes in CLAUDE.md
or AGENTS.md: the graph lives in git, and teammates read it like the rest of the repo. When the project
sets none, use the language the user speaks with you: the graph is theirs to read.
A title is a few words, in that same language, like a box label: the graph and the card
show titles side by side, hovering a node shows its `--what`, and clicking it shows `--detail` and the
proofs. Put the explanation in `--what`, never in the title; `ariadne` refuses titles over 80 characters.
Change `.ariadne/` only through `ariadne`: it validates every change and keeps the log, the generated
`.ariadne/STATE.md` and the band in step. A hand edit can break the graph silently.

## Set up

No `.ariadne/` folder yet and the user wants the thread: run `ariadne init`. The graph starts with the
first milestone, `ariadne add milestone "<title>" --what "<the goal in one line>" --start`, and its plan.

A hand-written STATE.md or LOG.md in the root (init says so) moves into the thread, or there are two
sources of truth. `ariadne migrate` prints the preview and writes nothing: read each numbered open
item and fix the guessed kind with `--as <n>=decision|risk|pointer|drop` (a standing rule is a
`pointer`, work already planned elsewhere is `drop`). Then `ariadne migrate --apply --as …`: every
new node enters to confirm, the files move into `.ariadne/archive/`. Tell the user what moved, that
they confirm it in the viewer, and that `ariadne migrate --undo` goes back. Move the pointers and
the other sections the preview lists into CLAUDE.md or `docs/`, then run `ariadne doctor`.

## Resume after /clear

Read the state card first. For anything else, grep `.ariadne/STATE.md` (one line per node, generated),
then `ariadne why <id>` only for the nodes you need. Don't read the whole graph.

## While you work

The test of the thread: the user can `/clear` at any moment and the next session needs nothing from
you. Commits are recorded by a hook; what is decided in chat is recorded only if you do it, there and
then. If you ever feel you should write a recap before `/clear`, something was not recorded when it
happened: record it now, and next time earlier. When the user asks whether they can `/clear`, run
`ariadne check --clear`: it lists what is not committed, what lives only in the chat and what lives
outside the repo. At the end of a turn a hook may hand you back what the
thread missed (an approval, a file outside the project, a commit without `Thread:`): record it with the
command it names, or say in one line why there is nothing to record.

- **A plan the user approved:** `ariadne plan <parent> "<step>" "<step>"… --what "<detail of the first>"
  --what "<detail of the second>"… --ref "chat <date>: <what was approved>"`. Each `--what` goes to the
  step in the same position. The `--ref` is the evidence that the user agreed; without an approval, don't plan.
- **Commits:** every commit message carries `Thread: <id>` for the node you work on; the last commit of
  a step carries `Thread: <id> done: <outcome in one line>`. A hook records the commit as proof, closes
  the step and starts the next one. Git reads trailers only in the message's last paragraph, so put
  `Thread:` there, next to any `Co-Authored-By:`, with no blank line between them.
- **`.ariadne/` goes into git with the work.** Stage it with every commit. Recording the proof changes
  the graph after the commit, so the hook then asks you to save it: commit `.ariadne/` at once, on its
  own (`chore(ariadne): …` with the `Thread:` the hook names). Otherwise teammates and the next session
  read a thread behind the code. That commit touches only `.ariadne/`, so it is no proof and asks nothing more.
- **Decided in chat, recorded at once,** in the same turn the user says it:
  - next steps the user agrees to: `ariadne plan <id> "<step>"… --ref "chat <date>: …"`, even in the
    middle of a step (they become its sub-steps). `plan` under the current step starts the first new
    step; when the user wants other work done first, plan and `start` that work, then plan the rest.
    A step started too early goes back among the todo ones with `ariadne pause <id>`;
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
- **Open questions and risks,** instead of an "open decisions" note:
  - a choice only the user can make: `ariadne add decision "<question>" --what "<options>" --under <id>`;
    put it in the `after` of the work that waits for it. It is never started; it closes with the
    user's answer: `ariadne close <id> "<choice>" --message "chat <date>: …"`;
  - something that may go wrong while a step is open: `ariadne add risk "<risk>" --what "<what happens,
    what to do>" --under <step>`; close it with what happened when it no longer applies;
  - a standing rule or command ("never run X", "tests: …") is neither: it goes in CLAUDE.md or `docs/`.

## Investigator reasoning (when the user asks for it)

One `ariadne add list "<question>" --what "…"` for the investigation, one
`ariadne add point "<clue>" --what "…" --under <list>` per clue, and a deduction
`ariadne add point "<conclusion>" --what "…" --under <list> --after <clue>,<clue> --why "…"`.
A hypothesis the evidence disproves: `ariadne replace <id> <clue that disproves it>`.
`ariadne why <deduction>` rebuilds the chain.

## The user's corrections

"Move X under Y" → `ariadne move X Y`; "undo" → `ariadne undo`; "approve all" → `ariadne confirm --all`;
"no, not that" → `ariadne reject <id>`. These are the user's own acts, recorded as theirs.

The user can also comment on a node from the viewer: the card and the prompt summary show "Comments
to read". Read the node and its diff, change what the comment asks or explain why not, then
`ariadne answer <id> "<what you did or why>"`; the comment stays open until you answer.

## Look

`ariadne open [id]` opens the graph in the browser; `ariadne show <id>`, `ariadne why <id>` and
`ariadne log` answer in the terminal. Run `ariadne` alone for every command.
