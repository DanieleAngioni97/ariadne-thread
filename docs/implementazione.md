# Implementazione — M3
2026-11-11 · Piano approvato in chat il 2026-11-11 · Fonte del comportamento: `docs/ux/allineamento/specifica.md`

Questo documento dice **come** si costruisce ciò che la specifica descrive: dove vive il codice, quali
moduli, in che ordine. Il grafo (`.ariadne/graph.jsonl`) è l'indice: un nodo per passo, snello, che
punta qui (`§ <id>`) e ai file di progettazione con `detail` e `proof`. Questo file non ripete la
specifica: la cita per sezione.

## Sede del codice

Il codice nasce dove resterà nel pacchetto per la community, non in una cartella di dogfooding.

| Cartella | Contenuto | Note |
|---|---|---|
| `src/` | logica pura in ESM, solo libreria standard di Node: grafo, validatore, riassunto, operazioni, scribe | test `*.test.mjs` accanto a ogni file, con `node:test` |
| `bin/ariadne.mjs` | la CLI: legge i file di `.ariadne/`, chiama `src/`, scrive su stdout | unico punto che tocca il disco |
| `viewer/` | il viewer web (`m3.2`), sostituisce `spikes/viewer/` | importa `src/` nel browser |
| `mod/` | la mod con la banda (`m3.1`), oggi in `~/.claude/dev-mods/…/ariadne-spike/` | chiama `bin/ariadne.mjs` |
| `scripts/ariadne/` | solo `convert-trace.mjs`, una tantum | `validate.mjs` passa in `src/` in `m3.5` |

Perché: `scripts/` era la sede di comodo del dogfooding (R24). Spostare dopo vorrebbe dire rifare
import, comandi in `CLAUDE.md` e test due volte. `package.json` e il nome del pacchetto arrivano in M5.

## Architettura

```
.ariadne/graph.jsonl ─┐
.ariadne/thread.json ─┼─► bin/ariadne.mjs ─► src/graph.mjs     (carica, indicizza, contenitori, dipendenze)
.ariadne/log.jsonl ───┘         │          ├► src/validate.mjs  (regole R2, R3, R5, R15, R16, R22, R25)
                                │          ├► src/summary.mjs   (riassunto R7)
                                │          ├► src/inspect.mjs   (show, why)
                                │          ├► src/apply.mjs     (operazioni tipizzate, m3.6)
                                │          └► src/scribe.mjs    (nota → operazioni, m3.7)
     hook di Claude Code ───────┤ summary
     mod (banda) ───────────────┤ summary, apply confirm/reject
     agente ────────────────────┘ show, why, apply (dalla nota, tramite lo scribe)
viewer/ ── legge .ariadne/ e usa src/graph.mjs e src/validate.mjs
```

Comandi della CLI, quando M3 è finita: `summary`, `show <id>`, `why <id>`, `apply <ops.json>`,
`note "<testo>"` (scribe + apply), `validate`.

## Ordine e dipendenze

| Passo | Cosa | Dopo | Specifica |
|---|---|---|---|
| `m3.5` | CLI: `summary`, `show`, `why`, `validate`; hook di contesto | — | § Riassunto per l'agente, § Pezzi del sistema |
| `m3.6` | `apply`: operazioni, regole del mandato e della coda, `log.jsonl`, annulla; via STATE.md e LOG.md | `m3.5` | § Dati, § Operazioni, § Interazioni |
| `m3.8` | misurare il costo dell'osservatore (riprende `m2.4`) | `m3.5` | § Scribe (scelta del modello) |
| `m3.7` | scribe: `note` → operazioni → `apply` | `m3.6`, `m3.8` | § Scribe |
| `m3.2` | viewer che legge `.ariadne/` (dentro: layout stabile, riprende `m2.6`) | `m3.6` | § Viewer |
| `m3.1` | banda nella mod | `m3.6` | § Banda, § Rientro |
| `m3.9` | Task tools come sorgente (riprende `m2.5`) | `m3.7` | — |
| `m3.4` | segnalibri nella chat (riprende `b5`) | `m3.1` | — |

`m3.3` (export di STATE e LOG) è sostituito da `m3.5` + `m3.6`: il riassunto prende il posto di
STATE.md, `log.jsonl` quello di LOG.md.

Ogni passo: test prima (rosso), codice (verde), commit; poi il nodo si chiude con le prove e
`node bin/ariadne.mjs validate` dice `ok`. Il dettaglio di un passo si scrive qui quando parte.

## m3.5 — CLI e riassunto

**Obiettivo.** Dopo `/clear`, dopo la compattazione e a ogni turno l'agente riceve il riassunto R7
calcolato dal grafo, senza modello. È il primo pezzo che rende inutile STATE.md.

**File.**
- `src/validate.mjs` ← `git mv` da `scripts/ariadne/validate.mjs` (con il suo test), senza modifiche
  di logica; aggiornati `CLAUDE.md`, `STATE.md` e l'import di `convert-trace.mjs` se lo usa.
- `src/graph.mjs`: `parse(text)` → nodi in ordine di file; `index(nodes)`; `containers(id)`;
  `dependencies(id)` = per il nodo e i suoi contenitori, `after` e `continues` a ritroso, in ordine di
  distanza, esclusi i contenitori e le milestone; `next(current)` = il primo `todo` nello stesso
  contenitore, in ordine di file, con tutti gli `after` fatti; se non c'è, si sale di un livello.
  Logica di partenza: `threadSet` di `spikes/viewer/model.js`, ristretta alle sole dipendenze.
- `src/summary.mjs`: `summarize(nodes, thread)` → il testo nel formato della specifica (righe
  «Sei in», «Da dove viene», «Rientri in sospeso», «Da rivedere al rientro» solo se ci sono nodi con
  `review`, «Prossimo», «Per approfondire»). Al più 3 dipendenze; token stimati come caratteri / 4;
  sopra 300 si tolgono le dipendenze più lontane, mai le altre righe.
- `src/inspect.mjs`: `show(id)` → le righe del pannello di dettaglio della specifica (solo quelle
  con un valore, «da te» / «agente»); `why(id)` → la catena delle dipendenze di `id`, una riga per
  nodo con `what` e `why`, al più 10.
- `bin/ariadne.mjs`: `summary`, `show <id>`, `why <id>`, `validate [file]`. Grafo assente → stampa
  `ariadne: nessun grafo in .ariadne/ · l'agente lo crea con il primo piano` ed esce con 0. Grafo non
  valido → riassunto dall'ultimo stato leggibile più la riga `⚠ grafo non valido: …`, uscita 0: un hook
  non deve mai bloccare il prompt.
- `.claude/settings.json` (nuovo, del progetto): hook `SessionStart` (avvio, `/clear`, compattazione)
  e `UserPromptSubmit` → `node bin/ariadne.mjs summary`. Modifica di configurazione: comando a parte.

**Test (prima del codice).** `src/graph.test.mjs` (contenitori, dipendenze senza fratelli estranei,
`next` con prerequisiti aperti, ciclo non infinito), `src/summary.test.mjs` (formato riga per riga,
taglio a 300 token dalle dipendenze lontane, righe facoltative, nodo incerto marcato «incerto»),
`src/inspect.test.mjs`, `bin/ariadne.test.mjs` (grafo assente e non valido → uscita 0).

**Fatto quando.** Criterio R7 della specifica: `node bin/ariadne.mjs summary` sul grafo di questo repo
≤ 300 token e 0 chiamate a modelli; presente in una sessione nuova dopo `/clear` (prova a mano,
riportata nel nodo). Tutti i test verdi.

**Non tocca.** Le regole del validatore, lo spike, STATE.md e LOG.md (vanno via in `m3.6`),
`~/.claude/scripts/git_guard.py`: finché STATE.md esiste, all'avvio arrivano sia STATE.md sia il
riassunto.

## m3.6 — operazioni e diario
Da dettagliare all'avvio. Già fissato dalla specifica: tabella § Operazioni; campi `mandate`, `review`,
`prudent`; `thread.json.last_correction`; `log.jsonl` append-only; regole nuove del validatore
(§ Cosa cambia rispetto a oggi). Chiude togliendo STATE.md e LOG.md e la riga di `CLAUDE.md` sul grafo
a mano.

## m3.8 — costo dell'osservatore
Da dettagliare all'avvio. Riprende `m2.4`: qualità e costo per checkpoint di Haiku sul turno contro un
fork della sessione; decide anche il modello dello scribe.

## m3.7 — scribe
Da dettagliare all'avvio. Prompt, ingresso e uscita in specifica § Scribe; `note` chiama il modello,
valida, ritenta una volta, poi segnala.

## m3.2 — viewer
Da dettagliare all'avvio. Riparte da `spikes/viewer/` (base visiva approvata in `m1.2`), legge
`.ariadne/`, comportamento in specifica § Viewer; include il layout stabile (`m2.6`).

## m3.1 — banda nella mod
Da dettagliare all'avvio. Porta la mod da `~/.claude/dev-mods/…/ariadne-spike/` in `mod/`; righe e
testi in specifica § Banda. Prima: le verifiche aperte di `m2.7` (`/btw`, canale browser → mod, scroll).
API in early access.
