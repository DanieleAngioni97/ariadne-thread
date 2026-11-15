# Pilot of E1 on the dev scenarios (2026-11-14)

Haiku 5.5, 6 dev scenarios, both conditions; raw runs in `eval/runs/` (not in git). Share correct on the six
question categories (Continua apart), after the exclusions.

| Run | Reps | prima | ariadne | Continua prima / ariadne | What it changed next |
|---|---|---|---|---|---|
| pilot-haiku | 1 | 0.57 | 0.72 | 0.80 / 0.25 | update and deferred became multiple choice, answers in English |
| pilot-haiku-2 | 1 | 0.89 | 0.86 | 0.80 / 0.00 | helper commands allowed; ariadne bug in `next` fixed (`06c7b09`) |
| pilot-haiku-3 | 1 | 0.89 | 0.94 | 0.83 / 0.33 | Continua asks for a code change; Prova accepts any own file |
| pilot-haiku-4 | 2 | 0.85 | 0.93 | 0.75 / 0.82 | Where graded on two fields by the closest title |
| pilot-haiku-5 | 2 | 0.93 | 0.99 | 0.75 / 0.55 | ceiling rule reached: both above 0.90 |
| pilot-haiku-6 | 2 | 1.00 | 1.00 | 1.00 / 1.00 | 2 pilot scenarios under the test rules (75 and 102 events): ceiling again |
| pilot-haiku-7 | 2 | 0.94 | 0.96 | 0.75 / 0.88 | state card at start, view in `.ariadne/STATE.md`; 2 pilot + dev-05, dev-06 |

pilot-haiku-6: 56 trials, 1 excluded (a read outside the copy), about 0.10 $; median tokens per trial 19k
(prima) and 34k (ariadne). Longer scenarios and more distractors did not lift the ceiling: with a handoff at
the very end, STATE.md answers every category.

pilot-haiku-7 (state card, `5b64b03`; deferral fix in the generator, `a78cafc`): 112 trials, none excluded.
Cost 0.080 $ (ariadne) against 0.088 $ (prima), -10%, where pilot 6 had +21%; 3.4 turns against 3.8, and
the prompt hook stays silent. Still dearer: proof (x1.26) and abstain (x1.07); cheaper: update, deferred,
where (about x0.67) and continue (x0.85).

Run 5: pass^2 0.86 (prima) and 0.97 (ariadne); about 28k tokens per trial counted as uncached; about 1.2 $
for the five runs at list price.

Product observations for the report: with a change in the queue the ariadne agent stops to ask for confirmation;
it tends to close the open step in the graph before doing the work; it may jump to the step the summary shows as
next instead of finishing the open one.

Decision (approved by the user on 2026-11-15): test scenarios of 60–120 events with more distractors (the
ceiling rule), handoffs at the end of each milestone, the scenario ending mid-milestone after the last one,
and an open step whose work lives in its own files. prima still gets a handoff at the very end of the
scenario, as § 6 of the plan prescribes (user, 2026-11-15): the forgotten handoff is a logistics argument
for the report, not a weaker baseline. Then an optional small Haiku
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

## Pilot of E2 on the dev scenarios (2026-11-15)

Variant A (Haiku 5.5 on the last turn and the view), 12 checkpoints on dev-03..06, 3 runs per graph.

| Run | Recall (CI) | False alarms on F0 (CI) | Passes | Cost |
|---|---|---|---|---|
| e2-pilot-haiku | 0.94 (0.88–1) | 0.75 (0.67–0.92) | no | ~0.1 $ |
| e2-pilot-haiku-2 | 0.98 (0.94–1); unrecorded-detour 0.92 | 0 (0–0) | yes | 0.10 $ |

- The first run flagged a correct graph because the observer prompt did not say what "done" and "current"
  mean once a step is closed: a step the agent says it starts next is current, a finished step is done even
  if its tests were not run (`31213f8`). Only the prompt changed; the turns are the same frozen ones.
