# Process trace — ariadne-thread

Traccia a mano del processo di questo progetto: il caso d'uso reale e il primo dataset per il grafo.

## Formato

- Righe in testa: `current: <id>` (posizione corrente).
- Un nodo = un titolo `### <id> — <titolo>` seguito da campi `- chiave: valore`, uno per riga.
- Campi:
  - `status`: `done` | `active` | `todo` | `dropped`
  - `parent`: id del nodo da cui nasce (vuoto per la radice). Più genitori separati da virgola.
  - `summary`: una frase, mostrata in hover.
  - `detail`: contesto per il click (perché, a cosa serve, da dove viene). Una riga.
  - `branches`: id dei rami aperti a partire da questo nodo (vuoto se nessuno).
- Gli id sono stabili: un nodo non si rinumera, al massimo passa a `dropped`.

## Grafo

current: m0.7

### p0 — Visione del progetto
- status: done
- parent:
- summary: Nasce l'idea di una UI a grafo per non perdere il filo di un processo multi-step.
- detail: In chat il ragionamento scorre e si perde come si è arrivati a un punto; visione e requisiti in docs/vision.md.
- branches:

### m0 — M0 Ricerca
- status: active
- parent: p0
- summary: Capire cosa esiste già e come alimentare il grafo da una sessione Claude Code.
- detail: Fase 1 del meta-processo; nessun codice e nessuna scelta di stack. Esito in docs/research.md.
- branches:

### m0.1 — Branch docs/m0-research
- status: done
- parent: m0
- summary: Lavoro della ricerca isolato su un branch dedicato.
- detail: Regola del repo: niente lavoro su main; la ricerca arriva come unità revisionabile.
- branches:

### m0.2 — Strumenti esistenti per grafi di processo
- status: done
- parent: m0
- summary: Valutati ~25 strumenti tra mind map, librerie grafo, DAG viewer e tool per agenti.
- detail: Nessun clone dell'obiettivo; il più vicino è Agent Flow (grafo dell'esecuzione, non del processo). Rendering ricorrente: React Flow + ELK/dagre.
- branches: b1, b2

### m0.3 — Come alimentare il grafo da Claude Code
- status: done
- parent: m0
- summary: Confrontate hooks, MCP, file aggiornato, transcript JSONL, SDK, OTel, Task tools.
- detail: Hooks danno eventi meccanici affidabili, MCP l'unica semantica (fase, perché), transcript solo per recupero perché il formato è interno.
- branches: b3

### m0.4 — Inventario dei repo propri
- status: done
- parent: m0
- summary: Trovati pezzi riusabili in usage_collect.py, kb-cyberpunk e calderone-alchemico.
- detail: Lettore JSONL incrementale, hook non bloccanti, grafo vis-network, server MCP sullo stesso service layer della UI.
- branches:

### m0.5 — Sintesi e raccomandazione
- status: done
- parent: m0.2, m0.3, m0.4
- summary: Tre architetture candidate; raccomandata file-first che evolve in daemon con hooks e MCP.
- detail: Il valore distintivo è il modello dati del processo e la UI, non l'ingestione; si parte dal formato e da un viewer. Dettagli in docs/research.md.
- branches:

### m0.6 — Formato della process trace
- status: done
- parent: m0
- summary: Fissato questo formato markdown leggibile a mano e da un parser.
- detail: Bozza del modello dati: id, titolo, stato, genitori, frase hover, dettaglio, rami aperti, posizione corrente.
- branches:

### m0.7 — Decisioni dell'utente prima dei requisiti
- status: active
- parent: m0.5
- summary: In attesa delle scelte dell'utente sulle domande aperte della ricerca.
- detail: Serve un ok su architettura di partenza, perimetro (solo Claude Code o generico), forma della UI e riuso di Agent Flow.
- branches:

### m1 — M1 Analisi e requisiti
- status: todo
- parent: m0.7
- summary: Trasformare visione e ricerca in requisiti verificabili.
- detail: Fase 2 del meta-processo; parte dopo le decisioni di m0.7.
- branches:

### b1 — Leggere il codice di Agent Flow
- status: todo
- parent: m0.2
- summary: Capire se il suo modello dati si estende al processo o se conviene solo ispirarsi.
- detail: Apache-2.0, ingestione via hooks HTTP già pronta; decide tra fork e costruzione da zero.
- branches:

### b2 — Prototipo di layout stabile
- status: todo
- parent: m0.2
- summary: Verificare che il grafo cresca senza far saltare i nodi già piazzati.
- detail: ELK e dagre ricalcolano tutto; serve fissare le posizioni esistenti e animare solo i nuovi.
- branches:

### b3 — Task tools come sorgente di stato
- status: todo
- parent: m0.3
- summary: Verificare se TaskCreate/TaskUpdate sono disponibili e utili sui modelli attuali.
- detail: Sono già un grafo con stato e dipendenze osservabile via hooks, ma la disponibilità per modello non è verificata.
- branches:
