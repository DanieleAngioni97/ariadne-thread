# Process trace — ariadne-thread

Traccia a mano del processo di questo progetto: il caso d'uso reale e il primo dataset per il grafo.

## Formato

- Righe in testa: `current: <id>` (posizione corrente).
- Un nodo = un titolo `### <id> — <titolo>` seguito da campi `- chiave: valore`, uno per riga.
- Campi:
  - `status`: `done` | `active` | `todo` | `deferred` | `dropped`
  - `deferred`: per un nodo `deferred`, `<id del task> — <perché>`. Un passo lasciato aperto quando la
    sua milestone si chiude va sempre rimandato a un task di una milestone successiva.
  - `continues`: per quel task, l'id del passo rimandato che riprende.
  - `parent`: id del nodo da cui nasce (vuoto per la radice). Più genitori separati da virgola.
  - `summary`: una frase, mostrata in hover.
  - `detail`: contesto per il click (perché, a cosa serve, da dove viene). Una riga.
  - `branches`: id dei rami aperti a partire da questo nodo (vuoto se nessuno).
- Gli id sono stabili: un nodo non si rinumera, al massimo passa a `dropped`.

## Grafo

current: m2.8

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
- status: done
- parent: m0.5
- summary: Scelte B che evolve in A, focus sugli agenti, aggiornamento automatico; chieste due analisi.
- detail: L'utente propone una mod di Claude Code come UI e chiede se STATE/LOG/Next vanno integrati nel tool. Tabella in docs/analysis-mod.md.
- branches: m0.8, m0.9

### m0.8 — Analisi: mod di Claude Code come UI
- status: done
- parent: m0.7
- summary: Una mod vede ogni riga della chat, chiama il modello da sola e disegna banda, pannello, hover e click.
- detail: Sostituisce daemon, server MCP e lettura dei transcript; su terminale il grafo è testo (albero stile git log --graph). Agent Flow non è una base; Navigator è la mod più vicina, solo come idee.
- branches: b4

### m0.9 — Analisi: STATE, LOG e Next nel grafo
- status: done
- parent: m0.7
- summary: Il grafo è la fonte; STATE e LOG diventano una sua proiezione versionata, a tappe.
- detail: Grafo fine locale e non versionato (rumore, privacy); STATE/LOG restano il tracciato grossolano leggibile senza tool. Il markdown della traccia è solo dataset: il formato vero sarà un log di eventi JSON.
- branches:

### m0.10 — Secondo giro di decisioni
- status: done
- parent: m0.8, m0.9
- summary: Mod sì se la UI è bella; STATE/LOG come export; grafo in un file ignorato; remote privato.
- detail: Chiarito che $.model.fork è una domanda laterale, non un fork della chat; aggiunti i segnalibri; licenza spiegata, proposta Apache-2.0. Dettagli in docs/analysis-mod.md §6.
- branches: b5

### m0.11 — Spike visivo della mod
- status: done
- parent: m0.10
- summary: Una mod usa e getta con dati finti per giudicare se la UI può essere bella e comoda.
- detail: Banda + pannello /thread costruiti, test verdi. Giudizio dell'utente: carina ma troppo da terminale; la vuole esterna per farla bella.
- branches: m0.12

### m0.12 — Viewer esterno + mod come sorgente
- status: done
- parent: m0.11
- summary: Confermato: mod come sorgente e banda nel terminale, grafo in un viewer web nel browser; licenza Apache-2.0.
- detail: La mod scrive il grafo in .ariadne/; il viewer lo legge in diretta. Tornano React Flow ed ELK (layout annidato). L'utente aggiunge requisiti: livelli espandibili, file e momenti della chat al click, salto alla chat, deviazioni visibili.
- branches:

### m1 — M1 Analisi e requisiti
- status: done
- parent: m0.12
- summary: Trasformare visione e ricerca in requisiti verificabili.
- detail: Fase 2 del meta-processo; bozza in docs/requirements-draft.md.
- branches:

### m1.1 — Bozza dei requisiti
- status: done
- parent: m1
- summary: Requisiti con id su forma, livelli, stato, contesto al click, salto alla chat, aggiornamento.
- detail: Il salto alla chat passa dalla banda del terminale: Claude Code fa scorrere la chat a una mod solo su un input della persona dentro Claude Code.
- branches:

### m1.2 — Spike visivo del viewer
- status: done
- parent: m1.1
- summary: Pagina web usa e getta che mostra livelli espandibili, stati, filo, deviazioni, rinvii e pannello di contesto.
- detail: Su branch spike/viewer (spikes/viewer/). Primo giudizio dell'utente: verso sinistra→destra ok; tooltip coperto dai nodi, frecce incasinate, tipi poco leggibili da lontano, todo di M0 rimasti lì senza motivo, interfaccia da avere nella lingua dell'utente, pannello da strutturare con tutti i file e il loro perché. Regole nuove: ogni rinvio crea un task in una milestone successiva; il piano va segnato fino in fondo per quanto si sa. Seconda versione pronta. Poi: navigando a un altro passo non si capiva dove andava il grafo; ora zooma sul passo scelto e lo fa pulsare. Secondo giudizio: il mockup va benissimo per ora; si passa a progettare l'allineamento tra persona e modello.
- branches:

### m1.3 — Rifinire i requisiti
- status: done
- parent: m1.2
- summary: Portare il giudizio sullo spike in docs/requirements-draft.md.
- detail: Tra le novità: rinvii come task in milestone successive, piano end-to-end, interfaccia nella lingua dell'utente, file con il loro perché. Si chiude con un grilling su backend e frontend (skill grilling + ux:design-flow): chi scrive il grafo, cosa nasce senza conferma, prove per ogni nodo, budget di leggibilità, il grafo al posto di STATE/LOG/Next.
- branches:

### d2 — Davvero non esisteva nulla?
- status: done
- parent: m1.3
- summary: Ricerca su memoria strutturata per agenti (Beads, Task Master, Spec Kit…) e su come tenere ordinato un grafo scritto da un LLM.
- detail: Domanda laterale durante il grilling. Nessuno registra il processo avvenuto con decisioni, rinvii e perché; Beads è il motore più vicino (idee, non backend). Ne escono 11 regole candidate per il brief. docs/research.md §7.
- branches:

### d3 — Cosa prendere dal metodo spec-driven
- status: done
- parent: m1.3
- summary: Lettura di un documento interno su Spec Kit e su un harness di Claude Code, per idee utili ad ariadne e all'harness.
- detail: Idee per il brief: decisioni firmate dall'utente con data, riga Thread: nei commit come prova, marcatori con esito "da rivedere" se manca la prova, vincolo nel posto giusto (hook/gate/prompt), riassunto rimesso davanti dopo la compattazione, convergenza, rework = nodo chiuso e poi riaperto. Il documento (classificato interno) è stato spostato nel repo dotclaude, in docs/spec-driven/, con le proposte per l'harness da rivedere lì.
- branches:

### m2 — M2 Progettazione
- status: active
- parent: m1
- summary: Modello dati del grafo, come si aggiorna, la UI.
- detail: Fase 3 del meta-processo. Task noti: m2.1 modello dati di .ariadne/; m2.2 flusso di aggiornamento; m2.3 UI del viewer; m2.4 costo dell'osservatore (riprende b4); m2.5 task tools come sorgente (riprende b3); m2.6 layout stabile (riprende b2); m2.7 verifiche sulla mod (/btw, canale browser → mod, scorrimento della chat).
- branches:

### m1.4 — Brief dell'allineamento
- status: done
- parent: m1.3
- summary: Grilling in tre round (skill ux:design-flow): 24 requisiti verificabili su chi scrive il grafo, conferme, prove, leggibilità, contesto per l'agente.
- detail: docs/ux/allineamento/brief.md. Decisioni chiave: scrive l'agente ai checkpoint con uno scribe economico; struttura su conferma; prova obbligatoria; mai cancellare; grafo JSONL versionato al posto di STATE/LOG/Next; dogfooding prima della mod.
- branches:

### m2.2 — Flusso di aggiornamento: concetti
- status: done
- parent: m2
- summary: Fase 3 di ux:design-flow: 2–3 flussi diversi per scrivere, approvare e leggere il grafo, contro il brief.
- detail: docs/ux/allineamento/concetti.md: A piano prima (raccomandato), B diario dopo, C pila di contesti, con lo schema dei nodi (m2.1) quanto basta per confrontarli; scelto A il 2026-11-08 (con la banda calcolata dal lineage, presa da C). Poi dogfooding (R24): conversione di questa traccia in .ariadne/.
- branches:

### m2.8 — Dogfooding: grafo in .ariadne/
- status: active
- parent: m2.2
- summary: Conversione di questa traccia in .ariadne/graph.jsonl con lo schema del concetto A, più un validatore come script (test prima).
- detail: R24 del brief. STATE e LOG restano finché il riassunto per l'agente (R7) non li sostituisce. Poi prototipo (fase 4 di ux:design-flow).
- branches:

### m2.4 — Misurare il costo dell'osservatore
- status: todo
- parent: m2
- continues: b4
- summary: Qualità e costo per turno: Haiku sul turno o fork sulla sessione.
- detail: Decide il default (requisito A4).
- branches:

### m2.5 — Task tools come sorgente
- status: todo
- parent: m2
- continues: b3
- summary: Verificare se TaskCreate/TaskUpdate sono disponibili e utili.
- detail: Se sì, sono una sorgente di stato già strutturata.
- branches:

### m2.6 — Layout stabile
- status: todo
- parent: m2
- continues: b2
- summary: Il grafo cresce senza far saltare i nodi già piazzati.
- detail: Da provare con ELK e le posizioni precedenti come vincolo.
- branches:

### m3 — M3 Implementazione
- status: todo
- parent: m2
- summary: La mod come sorgente e il viewer web.
- detail: Fase 4 del meta-processo. Task noti: m3.1 mod (osservatore e banda); m3.2 viewer web; m3.3 export di STATE e LOG (F6); m3.4 segnalibri nella chat (riprende b5).
- branches:

### m3.4 — Segnalibri nella chat
- status: todo
- parent: m3
- continues: b5
- summary: Un punto della chat marcato a mano diventa un nodo.
- detail: Requisito C6; salto con lo scorrimento della chat della mod.
- branches:

### m4 — M4 Revisione e feedback
- status: todo
- parent: m3
- summary: Usarlo sul serio e correggere.
- detail: Task noti: m4.1 dogfooding su questo progetto (sostituire questa traccia a mano); m4.2 test della mod su una nuova release di Claude Code.
- branches:

### m5 — M5 Pubblicazione
- status: todo
- parent: m4
- summary: Aprirlo alla community.
- detail: Task noti: m5.1 LICENSE e NOTICE (Apache-2.0); m5.2 README e docs in inglese; m5.3 repo pubblico e primo rilascio.
- branches:

### b1 — Leggere il codice di Agent Flow
- status: done
- parent: m0.2
- summary: Non è una base: modello dati di tool call e agenti cucito in ingestione, simulazione e canvas.
- detail: Estensione VS Code + web UI React con d3-force (via DeepWiki); con la strada della mod restano solo le idee di ingestione.
- branches:

### b2 — Prototipo di layout stabile
- status: deferred
- deferred: m2.6 — dipende dal viewer: si verifica quando si progetta la UI.
- parent: m0.2
- summary: Verificare che il grafo cresca senza far saltare i nodi già piazzati.
- detail: Con la mod diventa: albero testuale stabile su terminale; 2D con Svg solo su desktop/VS Code. Verificare se dagre si include nel modulo.
- branches:

### b3 — Task tools come sorgente di stato
- status: deferred
- deferred: m2.5 — serve sapere come si aggiorna il grafo prima di scegliere le sorgenti.
- parent: m0.3
- summary: Verificare se TaskCreate/TaskUpdate sono disponibili e utili sui modelli attuali.
- detail: Sono già un grafo con stato e dipendenze osservabile via hooks, ma la disponibilità per modello non è verificata.
- branches:

### b4 — Prototipo dell'osservatore e dei suoi costi
- status: deferred
- deferred: m2.4 — si misura sul flusso di aggiornamento progettato in M2, non su un’ipotesi.
- parent: m0.8
- summary: Misurare qualità e costo per turno dell'estrazione automatica dei nodi.
- detail: Confronto tra $.model.complete con haiku sul turno e $.model.fork sulla sessione intera; decide il default.
- branches:

### b5 — Segnalibri sui messaggi
- status: deferred
- deferred: m3.4 — già nei requisiti (C6); si costruisce insieme alla mod.
- parent: m0.10
- summary: Marcare i punti importanti della chat e tornarci con un click.
- detail: Richiesta dell'utente (visti in VS Code, assenti nel terminale); un segnalibro è un nodo agganciato all'uuid del messaggio; salto con $.ui.scroll.
- branches:
