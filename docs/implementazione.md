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

**Decisione (2026-11-11, utente).** Il grafo non frena mai l'agente: traccia quello che fa già. Ogni
operazione entra subito; la struttura decisa dall'agente resta segnata `review: confirm` e la confermi
quando vuoi («Approva tutto» = 1 azione). Via mandato, `review: decide`, `prudent`, proposte in attesa
e la differenza accompagnato / da solo (cambiano R2, R25, R26 della specifica). Lo scribe (`m3.7`) e la
sua misura (`m3.8`) si rinviano: l'agente scrive già operazioni strutturate, non note libere.

**Obiettivo.** Tre usi provati sul grafo di questo repo: (1) sviluppo con deviazioni e cose
temporanee, senza perdersi; (2) su richiesta, un ragionamento da investigatore: indizi e deduzioni
come `point` con `after` = premesse, un'ipotesi smentita `replace` dall'indizio che la smentisce;
(3) dopo un `/clear` improvviso l'agente riparte dal riassunto, risale con `why` e apre solo i file che
servono ora (riga «File utili»).

**Ingressi, dal più economico.**
- Commit con la riga `Thread: <id>` (R18): prova sul nodo. `Thread: <id> done: <esito>`: chiude il
  nodo con il commit come prova e passa al successivo. Li legge `ariadne sync`, chiamato da un hook
  `PostToolUse` sui comandi Bash; idempotente (un commit già tra le prove si salta).
- Sottocomandi per ciò che il commit non dice: `plan`, `start`, `close`, `add`, `fill`, `defer`,
  `replace`, `move`, `undo`, `confirm`, `reject`; `apply <ops.json>` per le operazioni grezze.
- `close` di un `detour` torna al suo `reentry`; di un passo, al successivo (`next`) o al contenitore.

**File.** `src/apply.mjs` (operazioni pure: testo del grafo + filo + operazioni → nuovo testo, filo,
righe di diario; righe dei nodi non toccati identiche, nuovi in fondo; tutto o niente col validatore),
`src/trailers.mjs` (righe `Thread:` → operazioni), `src/validate.mjs` (`review: confirm` vale come
conferma; `review` solo `confirm`), `src/summary.mjs` (righe «File utili» e «Da confermare»),
`bin/ariadne.mjs` (sottocomandi, `sync`, `log`, riga `⚠ k commit senza Thread`),
`.claude/settings.json` (hook `PostToolUse`).

**Diario.** `.ariadne/log.jsonl`, una riga per operazione: `{at, id, op, text, proof?}`; `text` è una
frase leggibile così com'è da banda e viewer; `ariadne log [n]` la stampa.

**Fatto quando.** Tutti i test verdi; `m3.6` chiuso da un commit `Thread: m3.6 done: …`; i tre usi
provati e riportati nel nodo; via STATE.md, LOG.md e la riga di `CLAUDE.md` sul grafo a mano.

## m3.8 — costo dell'osservatore
Da dettagliare all'avvio. Riprende `m2.4`: qualità e costo per checkpoint di Haiku sul turno contro un
fork della sessione; decide anche il modello dello scribe.

## m3.7 — scribe
Da dettagliare all'avvio. Prompt, ingresso e uscita in specifica § Scribe; `note` chiama il modello,
valida, ritenta una volta, poi segnala.

## m3.9 — Task tools come sorgente
Verifica del 2026-11-14 su Claude Code 2.1.302 (Opus 5.5), dai tipi della build e da questa sessione.

- **Esistono nel catalogo della build:** `TaskCreate` (subject, description), `TaskUpdate` (status
  `pending | in_progress | completed | deleted`, `addBlockedBy`, `addBlocks`), `TaskGet`, `TaskList`,
  e il più vecchio `TodoWrite`. Hook `TaskCreated` e `TaskCompleted`: solo id, subject, description.
- **Non sono esposti all'agente in questa sessione:** né tra i tool né in ToolSearch;
  `~/.claude/tasks` non esiste, quindi non sono mai stati usati qui. La condizione che li attiva non è
  verificata.
- **Come sorgente valgono poco:** stato e dipendenze sì (`completed` → `done`, `blockedBy` → `after`),
  ma niente prova, perché, deviazioni, rinvii né posizione; li scrive il modello (il rischio di piani
  inventati della ricerca § 7.1) e stanno fuori da git.
- **Esito:** non diventano una sorgente. Resta un adattatore possibile, non pianificato: un hook della
  mod su `tool.call` di `TaskUpdate` con `status: completed` che mette in coda di conferma un `close`
  sul nodo con lo stesso titolo. Per la valutazione, «Claude Code Tasks» è uno dei termini di confronto.

## m3.11 — nodi agganciati a file e sezioni
La memoria sta nei file, non nella chat (chat 2026-11-14): ogni nodo deve dire dove sta il suo risultato.

- **Sezioni:** una prova `file` è `percorso#inizio del titolo` (`docs/implementazione.md#m3.9`);
  `src/refs.mjs` la legge e la mostra come `percorso § sezione` nel riassunto e nel viewer.
- **Riferimenti rotti:** `ariadne validate` controlla che i file esistano e che la sezione sia un titolo
  markdown del file (regola `file-ref`); il validatore puro resta senza disco, per il viewer e la banda.
- **File spostati:** `ariadne relink <vecchio> <nuovo>` aggiorna tutte le prove che ci puntano.
- **Chiusure senza file:** `close` con solo un messaggio come prova avvisa e suggerisce `fill --file`.
- **Misura di partenza (2026-11-14):** 67 nodi, 24 prove `file`, 0 con sezione, 2 file spariti (riparati
  con `relink`); 13 nodi chiusi su 48 senza file né commit.

## m3.2 — viewer
Riparte da `spikes/viewer/` (base visiva approvata in `m1.2`), spostato in `viewer/`; legge
`.ariadne/`, comportamento in specifica § Viewer; include il layout stabile (`m2.6`).

- **Servire:** `ariadne view [--port n]` (`src/serve.mjs`): pagina da `viewer/`, logica da `src/`,
  dati da `.ariadne/`, solo lettura su 127.0.0.1; qualunque altro percorso è rifiutato.
- **Dati:** `fromGraph` in `viewer/model.js` porta nodi e `thread.json` nella forma del disegno.
- **Raggruppamento (R4):** finestra di `limitOf(profile)` figli per livello attorno al nodo
  corrente, a ciò che lo contiene o al rientro della deviazione; i nascosti diventano marcatori a cui
  si attaccano gli archi; i sostituiti in fondo al livello quando li chiedi.
- **Ricarica:** la pagina rilegge i file ogni 2 s e ridisegna senza ricaricare né rifare lo zoom;
  il pannello segue il nodo corrente se lo stavi guardando.
- **Layout stabile, misura del 2026-11-11** (copia del repo, «Tutto», un passo aggiunto in `m3.2`):
  layout deterministico in ordine di file → si spostano solo gli 8 nodi dopo il nuovo, di lato,
  sulla stessa riga; modalità interattiva di ELK (posizioni precedenti come vincolo) → 58 nodi su 60
  si spostano e alcuni cambiano ordine. Scelto il layout deterministico; l'interattiva scartata.

## m3.1 — banda nella mod
Porta la mod da `~/.claude/dev-mods/…/ariadne-spike/` in `mod/`; righe e testi in specifica § Banda.
API in early access.

- **Logica fuori dalla mod:** `src/band.mjs` calcola le righe (dove, contesto, coda, esito o errore)
  con le larghezze della specifica; `ariadne band [--review i]` le stampa in JSON e non fallisce mai.
- **Mod (`mod/`, nome `ariadne`):** legge `ariadne band` all'avvio, dopo ogni chiamata Bash e a fine
  turno, e disegna le righe. Pulsanti: `run` → `node bin/ariadne.mjs …` (confirm, reject), `say` →
  la frase in chat («torna»), `open` → `ariadne open <id>`, che avvia il viewer se è spento e apre
  `?select=<id>` (sulla riga «dove», «Apri il grafo» senza id), `review` → una voce alla volta.
  Fuori da un progetto ariadne la banda resta quella del motore.
- **Sviluppo:** la cartella delle mod della sessione contiene un link a `mod/`; il motore segue il
  link. Verifica: `claude plugin test mod` · `claude plugin validate mod`.
- **Verifiche di `m2.7`:** il canale browser → mod non serve (il viewer non ha controlli di modifica,
  R10; «Mostra nel grafo» va da mod a browser con l'URL). `/btw` e lo scorrimento della chat
  riguardano `m3.4` e le deviazioni, non la banda.
