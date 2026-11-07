# State — ariadne-thread
Aggiornato: 2026-11-07 · Branch: `spike/viewer` (da `docs/m0-research`) · PR: nessuna (scelta dell'utente)

## Milestone
M1 — Analisi e requisiti. M0 chiusa: una mod di Claude Code è la sorgente (legge la chat, scrive
`.ariadne/`, tiene una banda sopra il prompt); il grafo vive in un viewer web locale nel browser.
Licenza Apache-2.0. Spike del viewer costruito, in attesa del giudizio dell'utente.

## Next
1. Raccogliere il giudizio dell'utente sullo spike del viewer (`spikes/viewer/`, nodo `m1.2` di
   `docs/process-trace.md`): colori, densità, verso del grafo (ora sinistra→destra), pannello; e
   sul salto alla chat in 3 passi (`docs/requirements-draft.md`, sezione "Salto alla chat").
2. Portare il giudizio in `docs/requirements-draft.md` (nodo `m1.3`), poi M2 progettazione:
   modello dati di `.ariadne/` (bozza in `spikes/viewer/data.js`: nodi piatti, `parent` = livelli,
   `after` = ordine), flusso di aggiornamento, UI.
3. A ogni passo aggiornare `docs/process-trace.md` (formato in testa al file).

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
- Verifica: `node --test spikes/viewer/` → 7 pass. Spike mod (fuori dal repo,
  `~/.claude/dev-mods/9491e746-5169-4bed-8881-53945d893b0b/ariadne-spike/`):
  `claude plugin test <cartella>` → 7 pass; si carica solo con `claude --plugin-dir <cartella>`.
- Remote: github.com/DanieleAngioni97/ariadne-thread (privato).
- Skill suggerite: `design:frontend` + `emil-design-eng` per il viewer; `plugin-authoring` per la
  mod; `plan-before-coding` prima dell'implementazione di M2; `commit-checkpoint` a ogni commit.
