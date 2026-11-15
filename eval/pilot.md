# Pilot of E1 on the dev scenarios (2026-11-14)

Haiku 5.5, 6 dev scenarios, both conditions; raw runs in `eval/runs/` (not in git). Share correct on the six
question categories (Continua apart), after the exclusions.

| Run | Reps | prima | ariadne | Continua prima / ariadne | What it changed next |
|---|---|---|---|---|---|
| pilot-haiku | 1 | 0.57 | 0.72 | 0.80 / 0.25 | update and deferred became multiple choice, answers in English |
| pilot-haiku-2 | 1 | 0.89 | 0.86 | 0.80 / 0.00 | helper commands allowed; ariadne bug in `next` fixed (`c73faca`) |
| pilot-haiku-3 | 1 | 0.89 | 0.94 | 0.83 / 0.33 | Continua asks for a code change; Prova accepts any own file |
| pilot-haiku-4 | 2 | 0.85 | 0.93 | 0.75 / 0.82 | Where graded on two fields by the closest title |
| pilot-haiku-5 | 2 | 0.93 | 0.99 | 0.75 / 0.55 | ceiling rule reached: both above 0.90 |

Last run: pass^2 0.86 (prima) and 0.97 (ariadne); about 28k tokens per trial counted as uncached; about 1.2 $
for the five runs at list price.

Product observations for the report: with a change in the queue the ariadne agent stops to ask for confirmation;
it tends to close the open step in the graph before doing the work; it may jump to the step the summary shows as
next instead of finishing the open one.

Decision (approved by the user on 2026-11-15): test scenarios of 60–120 events with more distractors (the
ceiling rule), ending mid-milestone after the last handoff as the handoff skill prescribes (instead of a
handoff at the very end), and an open step whose work lives in its own files. Then an optional small Haiku
pilot, the test drafts, the pre-registration and E1 on Sonnet once.

For the report (user, 2026-11-15; the plan stays as approved):

- The weak Continua with ariadne is a clarity problem of the current node: the summary shows "Prossimo" as
  prominently as the open step, with nothing on what is left of it. The open step must be at least as clear
  as in the handoff notes.
- ariadne was born from two needs, not only a better resume: explainability (a clearer flow for the person)
  and logistics (no manual handoff, no reminders to write the state). The report must also weigh autonomy:
  how often the agent stops to ask, how often the user has to prompt a handoff or a state update, how often
  the thread falls behind with nobody updating it. The plan measures none of these as a hypothesis; report
  them as descriptive findings and as a limit.
