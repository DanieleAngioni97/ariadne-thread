# Brief: draft one evaluation scenario

You write the history of a small fictional software project as data: a JSON scenario. A generator
turns it into a git repository and a set of questions that test whether someone resuming the
project can tell where it stands. Write realistic work, not a puzzle.

## Output

Reply with the JSON only, no prose and no code fence. Shape:

```
{ "id": "<given>", "project": "<kebab-case name>", "start": "<given>",
  "events": [ ... ], "questions": [ ... ] }
```

## Events, in the order they happen

- `{"type":"commit","message":"<conventional commit subject>","files":{"<path>":"<full content>"}}`:
  a commit that belongs to no step (scaffolding, chores, docs, dependency bumps).
- `{"type":"milestone","key":"m1","title":"M1 <name>","what":"<goal in one sentence>"}`
- `{"type":"plan","milestone":"<key>","ref":"chat <YYYY-MM-DD>: <what the user approved>","steps":[{"key":"<k>","title":"<title>"}, ...]}`:
  the user approves a list of steps under a milestone. A milestone may get more than one plan.
- `{"type":"start","step":"<k>"}`: work starts on a step. Closing a step moves on to the next open
  step of its plan by itself; use `start` for the first step of a plan, and after a replacement.
- `{"type":"commit","step":"<k>","message":"…","files":{…}}`: progress on a step.
  Add `"done":true` on the commit that finishes it. Add `"why":"<one sentence>"` when the commit
  message body explains a choice. Add `"proofFiles":["docs/<file>.md#<Heading>"]` when the reason
  for the step lives in a document section written by an earlier commit.
- `{"type":"detour","key":"<k>","title":"<title>","what":"<why it interrupts>"}`: unplanned work
  that interrupts the current step; close it with a commit that has `"step":"<k>","done":true`.
  Work then goes back to the interrupted step.
- `{"type":"defer","step":"<k>","to":"<milestone key>"}`: a step moves to a later milestone (create
  that milestone first).
- `{"type":"replace","step":"<old>","by":"<new>"}`: a decision is dropped for another one; both
  steps must already exist in a plan.
- `{"type":"handoff"}`: the end of a working session at the end of a milestone.

## Requirements

- Exactly the number of events you are given, ±10%. Commits are most of them.
- Keys are short and unique; titles are unique across the whole scenario.
- Every step that has commits has at least one file that no other step's commits touch. Code lives
  in a folder per step or area (`src/<area>/…`).
- At least: one plan with its steps closed by commits; one detour; one deferral; one replacement;
  one choice whose reason is written only in a document section (`docs/…md`, `## <Heading>`).
- Distractors: maintenance commits, a document that a later commit supersedes, and at least three
  steps whose titles look alike (for example "Cache for parsed suppliers", "Cache for exchange rates",
  "Cache invalidation on import").
- The scenario ends in the middle of a step: the last step started has at least one commit and is not
  done, and its plan still has a step after it.
- File contents are short (1–10 lines) but real.

## Questions, exactly one per category

Questions use the project's own words. Never use the words node, graph, thread, ariadne, detour,
STATE.md or LOG.md, and never ask for an id or a commit hash.

- `{"cat":"where","text":"…","current":"<open step key>","next":"<key of the step after it>"}`
- `{"cat":"why","text":"Why …?","step":"<k>","reason":"<the reason, in words found in a commit or document>","distractors":["<reason of another, similar-titled step>","…","…"]}`:
  the three distractors are true reasons of other steps in the same scenario.
- `{"cat":"proof","text":"Which file holds the result of …?","step":"<k>","file":"<a file of that step>"}`
- `{"cat":"deferred","text":"…","step":"<deferred step>","milestone":"<milestone it moved to>"}`
- `{"cat":"update","text":"Which decision holds today on …?","step":"<the step that replaced the other>"}`
- `{"cat":"abstain","text":"<a plausible question about something that never happened in the project>"}`
- `{"cat":"continue","text":"Resume the work: make the first change you would make.","next":"<open step key>","dir":"<folder of that step, ending with />"}`
