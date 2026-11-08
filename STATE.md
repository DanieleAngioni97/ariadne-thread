# State — ariadne-thread
Aggiornato: 2026-11-08 · Branch: `spike/viewer` (da `docs/m0-research`) · PR: nessuna (scelta dell'utente)

## Milestone
M2 — Progettazione. Scelto il concetto A «Piano prima» (`docs/ux/allineamento/concetti.md`):
prototipo provato dall'utente ("mi torna"), revisione leggera fatta (`valutazione.md`). Dogfooding
avviato: la fonte del processo è `.ariadne/graph.jsonl`, nodo corrente `m2.10` (`.ariadne/thread.json`).

## Next
1. Fase 6 di `ux:design-flow`: scrivere `docs/ux/allineamento/specifica.md` (formato in
   `references/specifica.md` della skill) da brief R1–R26, concetti, `prototipo/index.html` e
   `valutazione.md`. Dentro i 6 minori della valutazione (§ Correzioni 4–9), il mandato (R25), la
   coda al rientro (R26) e lo schema dei nodi di `concetti.md`.
2. A ogni checkpoint aggiornare `.ariadne/graph.jsonl` (e `thread.json`), poi
   `node scripts/ariadne/validate.mjs` → `ok`. Un passo nuovo fuori piano si propone all'utente prima
   di aggiungerlo (concetto A). Chiudere `m2.10` con le prove quando la specifica è approvata.
3. Poi `plan-before-coding` per l'implementazione (scribe, riassunto R7 dal grafo, banda nella mod,
   viewer che legge `.ariadne/`). Quando il riassunto R7 esiste, togliere STATE.md e LOG.md (R8, R24).

## Decisioni aperte e rischi
- Non pubblicati: 5 commit su `docs/m0-research` e 36 su `spike/viewer`. Push solo su richiesta.
- `docs/process-trace.md` è congelato: non aggiornarlo. 25 nodi storici su 38 sono `uncertain`.
- Lo scribe (R21) è ancora solo un'idea: prompt, modello e operazioni vanno nella specifica.
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
- Grafo: `.ariadne/graph.jsonl` · validatore `scripts/ariadne/validate.mjs` · convertitore (una tantum)
  `scripts/ariadne/convert-trace.mjs`.
- Verifica: `node --test scripts/ariadne/ spikes/viewer/` → 31 pass · `node scripts/ariadne/validate.mjs` → ok.
- Spike mod fuori dal repo (`~/.claude/dev-mods/9491e746-5169-4bed-8881-53945d893b0b/ariadne-spike/`):
  `claude plugin test` → 7 pass.
- Skill: `ux:design-flow` (riprende da `docs/ux/allineamento/`, fase 6); poi `plan-before-coding`,
  `commit-checkpoint`; `plugin-authoring` per la mod; `domain-modeling` per lo schema.
