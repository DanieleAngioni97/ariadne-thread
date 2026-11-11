# State — ariadne-thread
Aggiornato: 2026-11-11 · Branch: `feat/m3.5-cli` (da `spike/viewer`) · PR: nessuna (scelta dell'utente)

## Milestone
M3 — Implementazione. Design chiuso (`docs/ux/allineamento/specifica.md`, M2 chiusa). Piano di M3 approvato:
`docs/implementazione.md` (sede del codice `src/` + `bin/`, ordine dei passi) e nodi in `.ariadne/graph.jsonl`;
nodo corrente `m3.6` (`.ariadne/thread.json`). Il grafo è l'indice: nodi snelli che puntano ai documenti.

## Next
1. `m3.5` chiuso: riassunto R7 visto nel contesto dopo `/clear`. Ora `m3.6` (operazioni tipizzate
   e diario, `docs/implementazione.md` § m3.6): prima `plan-before-coding`, su un branch nuovo.
2. A ogni checkpoint aggiornare `.ariadne/graph.jsonl` (e `thread.json`), poi
   `node src/validate.mjs` → `ok`. Un passo nuovo fuori piano si propone all'utente prima
   di aggiungerlo (concetto A). STATE.md e LOG.md vanno via alla fine di `m3.6`.

## Decisioni aperte e rischi
- Non pubblicati: 5 commit su `docs/m0-research` 36 su `spike/viewer` e 8 su `feat/m3.5-cli`. Push solo su richiesta.
- `docs/process-trace.md` è congelato: non aggiornarlo. 25 nodi storici su 38 sono `uncertain`.
- Il viewer dello spike legge ancora `spikes/viewer/data.js`, non `.ariadne/`.
- API delle mod in EARLY ACCESS; verifiche aperte in `m2.7` (/btw, canale browser → mod, scroll).
- Prototipi da far provare all'utente: pulsanti con nomi e una riga di guida, mai tasti nascosti;
  aprirli con `open`, non con `human-review` (rende la pagina modificabile e rompe i tasti).
- Screenshot con Playwright: `uv run --with playwright`, `executable_path` sul Chromium in
  `~/Library/Caches/ms-playwright/chromium_headless_shell-1243/` (le versioni nuove non lo trovano).
- UI del grafo nel terminale bocciata. Porta 8765 occupata: spike sulla 8790. Dopo modifiche allo
  spike, Cmd+Shift+R.

## Pointers
- UX: `docs/ux/allineamento/` → `brief.md` (R1–R26, Decisioni), `concetti.md`, `prototipo/index.html`,
  `valutazione.md`. Requisiti `docs/requirements-draft.md` · Ricerca `docs/research.md` §7.
- Grafo: `.ariadne/graph.jsonl` · validatore `src/validate.mjs` · convertitore (una tantum)
  `scripts/ariadne/convert-trace.mjs`.
- Verifica: `node --test src/ bin/ scripts/ariadne/ spikes/viewer/` → 67 pass · `node src/validate.mjs` → ok.
- Spike mod fuori dal repo (`~/.claude/dev-mods/9491e746-5169-4bed-8881-53945d893b0b/ariadne-spike/`):
  `claude plugin test` → 7 pass.
- Skill: `ux:design-flow` (riprende da `docs/ux/allineamento/`, fase 6); poi `plan-before-coding`,
  `commit-checkpoint`; `plugin-authoring` per la mod; `domain-modeling` per lo schema.
