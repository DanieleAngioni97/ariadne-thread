# ariadne-thread

UI a grafo che traccia un processo multi-step (ricerca → … → deploy, o debugging):
nodi con stato, rami, posizione corrente, contesto su hover/click.

- Visione e requisiti: `docs/vision.md`. Milestone e Next: `STATE.md`. Storia: `LOG.md`.
- Destinato alla community: codice, README e docs pubblici vanno in inglese quando si
  passa all'implementazione; le note di lavoro in `docs/` possono restare in italiano.
- Mantenere `.ariadne/graph.jsonl` aggiornato a ogni checkpoint (dogfooding, R24): una riga per nodo,
  schema in `docs/ux/allineamento/concetti.md`; nodo corrente in `.ariadne/thread.json`. Dopo ogni
  modifica: `node src/validate.mjs` deve dire `ok`. `docs/process-trace.md` è congelato.
