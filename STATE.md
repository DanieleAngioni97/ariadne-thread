# State — ariadne-thread
Aggiornato: 2026-11-07 · Branch: `spike/viewer` (da `docs/m0-research`) · PR: nessuna (scelta dell'utente)

## Milestone
M2 — Progettazione. M1 chiusa il 2026-11-08: spike del viewer approvato, requisiti in
`docs/requirements-draft.md` e brief dell'allineamento persona ↔ modello chiuso
(`docs/ux/allineamento/brief.md`, R1–R24).

## Next
1. Fase 3 di `ux:design-flow`: 2–3 concetti di flusso in `docs/ux/allineamento/concetti.md`
   (chi scrive, come approvi, cosa legge l'agente), con lo schema dei nodi quanto basta; scegli tu.
2. Dogfooding (R24): `plan-before-coding`, poi conversione di `docs/process-trace.md` in
   `.ariadne/graph.jsonl` + validatore come script; STATE/LOG restano finché il riassunto non li sostituisce.
3. Poi prototipo (fase 4), revisione (fase 5), specifica (fase 6).
4. A ogni passo aggiornare `docs/process-trace.md` (nodo corrente `m2.2`).

## Decisioni aperte e rischi
- Non pubblicati: 5 commit su `docs/m0-research`; `spike/viewer` non è sul remote. Push solo su richiesta.
- API delle mod in EARLY ACCESS (può cambiare tra release): rilanciare i test della mod a ogni aggiornamento.
- Da verificare: se la mod vede `/btw`; il canale browser → mod → banda per "Show in chat"; lo
  scorrimento della chat a un messaggio nel terminale; il costo per turno dell'osservatore (`b4`).
- UI a pannello nel terminale bocciata ("troppo da terminale"): non rifare il grafo nel terminale.
- La porta 8765 è occupata da un altro processo dell'utente: servire lo spike sulla 8790.

## Pointers
- Visione `docs/vision.md` · Ricerca `docs/research.md` · Analisi mod/STATE `docs/analysis-mod.md`
  · Requisiti (bozza) `docs/requirements-draft.md` · Traccia/dataset `docs/process-trace.md`
- Spike viewer: `python3 -m http.server 8790 --bind 127.0.0.1 --directory spikes/viewer`
  → http://127.0.0.1:8790/ (`?level=milestones|path|all`, `?select=<id>`); serve la rete (CDN).
- Verifica: `node --test spikes/viewer/` → 12 pass. Spike mod (fuori dal repo,
  `~/.claude/dev-mods/9491e746-5169-4bed-8881-53945d893b0b/ariadne-spike/`):
  `claude plugin test <cartella>` → 7 pass; si carica solo con `claude --plugin-dir <cartella>`.
- Remote: github.com/DanieleAngioni97/ariadne-thread (privato).
- Skill suggerite: `design:frontend` + `emil-design-eng` per il viewer; `plugin-authoring` per la
  mod; `plan-before-coding` prima dell'implementazione di M2; `commit-checkpoint` a ogni commit.
