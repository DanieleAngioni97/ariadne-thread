# State — ariadne-thread
Aggiornato: 2026-11-08 · Branch: `spike/viewer` (da `docs/m0-research`) · PR: nessuna (scelta dell'utente)

## Milestone
M2 — Progettazione. M1 chiusa il 2026-11-08: spike del viewer approvato ("va benissimo per ora"),
requisiti in `docs/requirements-draft.md`, brief dell'allineamento persona ↔ modello chiuso
(`docs/ux/allineamento/brief.md`, R1–R24, modalità nuovo, profondità standard).

## Next
1. Fase 3 di `ux:design-flow` (il brief è già chiuso, la fase 2 si salta perché la modalità è
   nuovo): 2–3 concetti di flusso davvero diversi in `docs/ux/allineamento/concetti.md` (chi scrive
   e quando, come approvi, cosa legge l'agente, liste e "↩ Torna a", rami con rientro), con lo
   schema dei nodi quanto basta per confrontarli. Raccomandane uno; sceglie l'utente.
2. Dogfooding (R24, approvato): `plan-before-coding`, poi conversione di `docs/process-trace.md` in
   `.ariadne/graph.jsonl` + validatore come script (test prima). STATE/LOG restano finché il
   riassunto per l'agente (R7) non li sostituisce.
3. Poi prototipo (fase 4), revisione d'usabilità leggera (fase 5), `specifica.md` (fase 6).
4. A ogni passo aggiornare `docs/process-trace.md` (nodo corrente `m2.2`; formato in testa al file).

## Decisioni aperte e rischi
- Non pubblicati: 5 commit su `docs/m0-research` e 23 su `spike/viewer` (non sul remote). Push solo su richiesta.
- Lo scribe (R21) non esiste da nessuna parte: è da progettare in M2.
- API delle mod in EARLY ACCESS: rilanciare i test della mod a ogni aggiornamento di Claude Code.
- Da verificare (task `m2.7`): se la mod vede `/btw`; canale browser → mod → banda; scorrimento della
  chat con `$.ui.scroll({ to: { requestId } })`, ammesso solo su un input della persona; una mod non
  riceve `session.start` su `/branch` (solo `session.end`).
- Per le questioni laterali con tool usare `/subtask` o un fork, non la conversazione principale.
- UI del grafo nel terminale bocciata: non rifarla. Porta 8765 occupata: spike sulla 8790.
- Il browser tiene in cache i moduli dello spike: dopo ogni modifica, Cmd+Shift+R.

## Pointers
- Brief `docs/ux/allineamento/brief.md` · Requisiti `docs/requirements-draft.md` · Ricerca
  `docs/research.md` (§7: memoria per agenti e controllo del grafo) · Analisi mod `docs/analysis-mod.md`
  · Traccia `docs/process-trace.md` · Visione `docs/vision.md`.
- Spike viewer: `python3 -m http.server 8790 --bind 127.0.0.1 --directory spikes/viewer` →
  http://127.0.0.1:8790/ (`?level=milestones|path|all`, `?select=<id>`, `?lang=it|en`); bozza del
  formato in `spikes/viewer/data.js`, regole dei rinvii in `spikes/viewer/model.js`.
- Verifica: `node --test spikes/viewer/` → 12 pass. Spike mod fuori dal repo
  (`~/.claude/dev-mods/9491e746-5169-4bed-8881-53945d893b0b/ariadne-spike/`): `claude plugin test` → 7 pass.
- Proposte per l'harness nate qui: repo dotclaude, `docs/spec-driven/proposte-harness.md`.
- Skill suggerite: `ux:design-flow` (riprende da `docs/ux/allineamento/`); `plan-before-coding` e
  `commit-checkpoint` per il dogfooding; `plugin-authoring` per la mod; `domain-modeling` per lo schema.
