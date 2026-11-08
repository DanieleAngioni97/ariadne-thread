# Ricerca — M0

*2026-11-07. Fase 1 del meta-processo (`docs/vision.md`). Nessuno stack scelto qui: solo cosa
esiste e quali strade sono aperte.*

Metodo: web e pagine GitHub (stelle e ultimo push letti dall'API il 2026-11-07), doc ufficiale
di Claude Code (code.claude.com: hooks, mcp, sessions, monitoring-usage, statusline, headless,
tools-reference), `rg` in `~/Sviluppo`, `gh search code` sugli account e le org dell'utente.
Nessuno strumento è stato installato o provato: le valutazioni vengono da doc, README e codice letto.

## 1. Strumenti esistenti

Requisiti di riferimento (da `vision.md`): **G** grafo che cresce live · **R** rami ·
**S** stato per nodo · **P** posizione corrente · **H** hover con una frase · **C** click con
dettaglio · **X** generico.

| Nome | Famiglia | Cosa fa bene | Cosa manca vs requisiti | Licenza | Mantenuto (★, ultimo push) |
|---|---|---|---|---|---|
| [Markmap](https://github.com/markmap/markmap) | mind map | Markdown → mappa ad albero collassabile | Solo albero (no DAG), niente S/P, crescita live debole | MIT | 13.2k, 11-2026 |
| [Mermaid](https://github.com/mermaid-js/mermaid) (mindmap/flowchart) | mind map / diagrammi | Testo → diagramma, si rende ovunque (GitHub, Obsidian) | Statico, re-render totale, H/C poveri | MIT | 91k, 11-2026 |
| [JSON Canvas](https://github.com/obsidianmd/jsoncanvas) | formato | Spec aperta nodi + archi (Obsidian Canvas) | Solo formato: niente live, niente stato | MIT | 3.8k, 07-2026 |
| [Excalidraw](https://github.com/excalidraw/excalidraw) | lavagna | Estetica hand-drawn gradevole, embeddabile | Pensato per disegno manuale, non per dati | MIT | 135k, 11-2026 |
| [tldraw](https://github.com/tldraw/tldraw) | lavagna / SDK | Canvas infinito, shape custom in React | Licenza SDK non permissiva (da leggere per intero) | custom | 51k, 11-2026 |
| [React Flow (xyflow)](https://github.com/xyflow/xyflow) | libreria grafo | Nodi React custom (stato, hover, popover), pan/zoom, minimappa, centra su nodo | Nessun layout automatico (serve ELK/dagre) | MIT | 38.9k, 11-2026 |
| [Cytoscape.js](https://github.com/cytoscape/cytoscape.js) | libreria grafo | Matura, molti layout, API a eventi | Nodi non componibili come UI ricca | MIT | 11.3k, 11-2026 |
| [ELK.js](https://github.com/kieler/elkjs) | layout | Layout layered di alta qualità per DAG | Re-layout non incrementale: i nodi possono saltare | EPL-2.0 | 2.9k, 10-2026 |
| [dagre](https://github.com/dagrejs/dagre) | layout | Layout DAG semplice e veloce | Qualità inferiore a ELK | MIT | 5.8k, 10-2026 |
| [d3-dag](https://github.com/erikbrinkman/d3-dag) | layout | Sugiyama e altri layout DAG | Solo layout, community piccola | MIT | 1.5k, 11-2026 |
| [Sigma.js](https://github.com/jacomyal/sigma.js) | libreria grafo | WebGL, migliaia di nodi | Sovradimensionato; nodi ricchi difficili | MIT | 12.2k, 11-2026 |
| [vis-network](https://github.com/visjs/vis-network) | libreria grafo | Fisica, animazione di crescita facile | Aspetto datato, nodi poco personalizzabili | Apache-2.0 / MIT | 3.6k, 11-2026 |
| [G6 (AntV)](https://github.com/antvis/G6) | libreria grafo | Layout e animazioni integrati, nodi custom | Meno diffuso nell'ecosistema React occidentale | MIT | 12.4k, 10-2026 |
| Airflow / Prefect / Argo / Temporal UI | DAG/workflow viewer | Colori per stato, run corrente evidenziata, pannello di dettaglio | Grafo dichiarato dall'orchestratore; solo idee UX | Apache-2.0 (Temporal UI MIT) | attivi |
| [n8n](https://github.com/n8n-io/n8n) | workflow | Canvas con stato di esecuzione live | Licenza fair-code (non OSI), non estraibile | Sustainable Use | 210k, 11-2026 |
| [LangGraph](https://github.com/langchain-ai/langgraph) (+ Studio) | agenti | Grafo del flusso con nodo corrente evidenziato | Grafo definito a priori, legato al framework | MIT | 44.6k, 11-2026 |
| [Langfuse](https://github.com/langfuse/langfuse) | LLM tracing | Albero di trace/span, vista agenti | Self-host pesante, a posteriori, niente P | MIT + `ee/` | 37k, 11-2026 |
| [Arize Phoenix](https://github.com/Arize-ai/phoenix) | LLM tracing | Trace OpenTelemetry/OpenInference | Come Langfuse; licenza non OSI | Elastic 2.0 | 12.2k, 11-2026 |
| [AgentOps](https://github.com/AgentOps-AI/agentops) | LLM tracing | Replay di sessioni | Orientato al SaaS, ultimo push 06-2026 | MIT | 5.9k, 06-2026 |
| [ccusage](https://github.com/ccusage/ccusage) | Claude Code | Costi e token dai JSONL | Nessun grafo | MIT | 19.4k, 11-2026 |
| [opcode](https://github.com/winfunc/opcode) / [claudecodeui](https://github.com/siteboon/claudecodeui) | Claude Code GUI | Gestione sessioni in GUI | Chat e sessioni, non mappa del processo | AGPL-3.0 | 22.4k / 14.5k, 11-2026 |
| [claude-code-viewer](https://github.com/d-kimuson/claude-code-viewer), [claude-devtools](https://github.com/matt1398/claude-devtools) | Claude Code log | Lettura JSONL con live tail (watcher + SSE) | Timeline/lista, non grafo | MIT | 1.3k / 4.0k |
| [multi-agent observability (disler)](https://github.com/disler/claude-code-hooks-multi-agent-observability) | Claude Code hooks | Dashboard di eventi alimentata da hooks | Feed di eventi, non grafo; nessuna licenza dichiarata | nessuna | 1.6k, 02-2026 |
| **[Agent Flow](https://github.com/patoles/agent-flow)** | Claude Code / Codex | Grafo live via hooks HTTP, rami per subagent, click → dettaglio, replay JSONL, `npx`, estensione VS Code | Grafo dell'**esecuzione** (tool call, agenti), non del **processo**: niente S fatto/da fare, niente "perché" | Apache-2.0 | 1.8k, 10-2026 |
| claude-session-visualizer, claude-agent-graph, claude-code-graph, ecc. | Claude Code | Grafi live di sessioni e subagent (alcuni su React Flow) | Stesso limite di Agent Flow; 0–5★ | MIT | 2026 |
| [plan-explorer](https://github.com/cruxxxxxx/plan-explorer) | Claude Code skill | Mappa un piano in diagrammi e note | Piano statico a sezioni, non grafo che cresce | nessuna | 0★, 11-2026 |

### Cosa ne esce

- **Nessun clone del nostro obiettivo.** Ci sono molti grafi live dell'*esecuzione* di un agente
  (cosa fa: tool, subagent) e alcuni viewer di piani statici. Nessuno mostra il *processo*
  (fasi, decisioni, rami aperti) con stato, posizione corrente e "perché". Confidenza media-alta:
  ricerca web, non esaustiva.
- **Il più vicino è Agent Flow**: stessa ingestione (hooks HTTP + replay JSONL), stesso tipo di UI.
  Il modello dati però è un altro. È fonte di idee o base per un fork; codice non ancora letto.
- **Rendering**: la combinazione ricorrente è React Flow + un layout (ELK/dagre/d3-dag). Il punto
  critico per "grafo che cresce" è la stabilità del layout: i nodi già piazzati non devono saltare.
  Nessuna libreria lo dà gratis.
- **UX da copiare**: badge e colori di stato + pannello laterale (Airflow/Prefect/Temporal),
  nodo attivo evidenziato (LangGraph), look hand-drawn (Excalidraw), JSON Canvas come export.

## 2. Come alimentare il grafo da una sessione Claude Code

| Strada | Cosa cattura | Pro | Contro | Stabilità |
|---|---|---|---|---|
| **Hooks** | Eventi meccanici: SessionStart/End, UserPromptSubmit, Pre/PostToolUse (`tool_name`, `tool_input`, `tool_use_id`), SubagentStart/Stop, TaskCreated/Completed, Stop, PreCompact. Payload comune: `session_id`, `prompt_id`, `transcript_path`, `cwd` | Push in tempo reale, non dipende dal modello; tipi `command`, `http`, `mcp_tool`; `async` non blocca; si distribuisce in un plugin | Nessuna semantica (fase, perché); un processo per evento se `command`; un hook `http` fallito perde l'evento; timeout stretti su alcuni eventi | Alta: API pubblica documentata |
| **MCP server** | Ciò che il modello dichiara: `add_node`, `set_status`, "fase", "perché" | Unica strada che porta l'intento; schema validato lato server; stdio o HTTP; stesso processo può servire la UI | Il modello deve ricordarsi di chiamare i tool (va guidato da skill/CLAUDE.md/hook); costa token e tool call | Protocollo alta; disciplina del modello bassa |
| **File aggiornato da Claude** (+ watcher) | Ciò che Claude scrive nel file | Semplicissimo, leggibile, versionato in git, indipendente dal client; è quello che facciamo già con `process-trace.md` | Edit/Write costano token; lo schema può rompersi; aggiornamenti in blocco o dimenticati | Media: formato nostro, fedeltà del modello |
| **Transcript JSONL** (`~/.claude/projects/<proj>/<session>.jsonl`) | Tutta la conversazione; catena `uuid`/`parentUuid` (rami, rewind); subagent in file separati | Zero strumentazione; ricostruzione a posteriori; funziona su sessioni passate | Formato interno: la doc avverte che cambia tra versioni; fase e perché vanno inferiti dalla prosa; retention 30 giorni | Bassa sul formato |
| Agent SDK / `claude -p --output-format stream-json` | Stream tipizzato di messaggi, `parent_tool_use_id` | Formato documentato | Solo se ariadne lancia la sessione: non si aggancia a una sessione interattiva | Alta |
| OpenTelemetry (`CLAUDE_CODE_ENABLE_TELEMETRY`) | `user_prompt`, `tool_result`, `api_request`; trace in beta | Standard OTLP; ariadne può fare da collector | Contenuti redatti di default; setup pesante; trace beta | Alta (log), beta (trace) |
| Task tools (TaskCreate/Update) | Task con stato e dipendenze, scritti dal modello | È già un grafo con stato; osservabile con hooks | Disponibilità per modello da verificare; niente rami né contesto | Media: feature in evoluzione |
| Statusline | `session_id`, costo, contesto | Mostra il nodo corrente in terminale | Una sola per utente (collide con quella attuale) | Alta |

**Chiavi di join** tra le sorgenti: `session_id` + `prompt_id` + `tool_use_id` + `agent_id`.

## 3. Cosa c'è già nei tuoi repo

| Dove | Cosa | Riuso possibile |
|---|---|---|
| `~/.claude/scripts/usage_collect.py` | Lettore incrementale dei JSONL (offset per file, dedup per `message.id`, lock), stdlib, lanciato da hook | Lettore transcript per ricostruzione a posteriori |
| `kb-cyberpunk/tools/transcripts.py`, `save_transcript.py` | Hook SubagentStop che copia i transcript; parsing di usage e risposte; mai bloccante | Schema "hook che non blocca mai" |
| `kb-cyberpunk/tools/telemetry.py` | Log eventi JSONL append-only, fallimenti non bloccanti | Event log come sorgente del grafo |
| `kb-cyberpunk/tools/graph.py` | Grafo HTML interattivo con vis-network da dati strutturati | Prototipo di viewer statico, già fatto una volta |
| `calderone-alchemico/src/calderone/mcp/server.py` | Server MCP (`mcp>=2.2`) sopra lo stesso service layer della web UI (Vite), con journal e origine "claude" | **Lo schema dell'architettura A**: MCP e UI sullo stesso modello e journal |
| `~/.claude/scripts/hc_agent_status.py` | Hook che mappano eventi → stato agente (working/blocked/done/idle) | Mappatura eventi → stato del nodo corrente |

Su GitHub (`gh search code` su DanieleAngioni97, pralab, Banda-Musicale-G-Verdi-Sestu)
nulla in più: solo la configurazione hook di `kb-cyberpunk`.

## 4. Architetture candidate

### A. Daemon locale + plugin (hooks + MCP)
Un processo locale tiene il grafo (event log append-only + snapshot), serve la UI web e riceve:
hooks HTTP per posizione corrente ed eventi meccanici, tool MCP per nodi, stati e "perché".
Plugin Claude Code che installa hooks, MCP e una skill che guida il modello.

- \+ Copre tutti i requisiti; tempo reale vero; schema validato dal server.
- \+ Pattern già usato in calderone-alchemico (MCP e UI sullo stesso service layer).
- − Più pezzi da costruire e distribuire; un processo sempre acceso.
- − La qualità semantica dipende dalla disciplina del modello nel chiamare i tool.

### B. File-first: il grafo è un file nel repo
Il grafo vive in un file versionato (evoluzione di `docs/process-trace.md`). Claude lo aggiorna
guidato da una skill; un viewer lo legge e si aggiorna con un file watcher. Hook opzionale solo
per "posizione corrente".

- \+ Il più semplice; leggibile e diffabile in git; funziona anche senza Claude (processi a mano).
- \+ Generico per costruzione: il formato è il prodotto.
- − Edit/Write costano token e possono rompere il formato; aggiornamenti in ritardo o dimenticati.
- − Nessun dato meccanico (tool, subagent) senza aggiungere altro.

### C. Passivo: ricostruzione da hooks + transcript
Nessun intervento del modello: il grafo si inferisce da tool call, Task tools e subagent, con un
eventuale riassunto LLM a posteriori per titoli e contesto.

- \+ Zero disciplina richiesta; funziona su sessioni passate.
- − È il terreno di Agent Flow & co.: grafo dell'esecuzione, non del processo.
- − Formato JSONL interno e instabile; "perché" e fasi solo inferiti, costosi e imprecisi.

## 5. Raccomandazione

**Partire da B e farla evolvere verso A**, con lo stesso modello dati.

1. **Il formato del grafo è il cuore** e va fissato per primo: un file leggibile, versionato,
   indipendente da Claude. Soddisfa "generico" e fa da dataset di prova (`process-trace.md`).
2. **Viewer che legge il file** (live via watcher): valida subito la parte che nessuno ha fatto —
   stato, posizione corrente, hover/click, crescita stabile — senza costruire l'ingestione.
3. **Poi un server MCP che scrive lo stesso formato** con tool validati: toglie i costi e i rischi
   di Edit/Write, come in calderone-alchemico. **Hooks** per la posizione corrente e gli eventi
   meccanici, come livello che funziona anche se il modello salta le chiamate.
4. **Transcript solo per recupero/import**, con schema permissivo, riusando `usage_collect.py`.

Perché: il valore distintivo (processo, non esecuzione) sta nel modello dati e nella UI, non
nell'ingestione, che Agent Flow ha già risolto in modo simile. B è il passo più piccolo che lo
mette alla prova; A arriva senza riscrivere nulla perché condivide il formato. C da sola
replicherebbe strumenti esistenti.

> **Aggiornamento (stesso giorno):** dopo le decisioni dell'utente la strada è una mod di
> Claude Code, che fa da UI e da ingestione insieme. Vedi `docs/analysis-mod.md`.

## 6. Punti aperti (da verificare in fase 2–3)

- Leggere il codice di Agent Flow: modello dati estendibile? fork o ispirazione?
- Prototipo di crescita stabile del layout (nodi fissi, anima solo i nuovi).
- Disponibilità reale dei Task tools sui modelli attuali e loro uso come sorgente di stato.
- Licenze da leggere per intero: tldraw, n8n.
- Parti della doc hooks non lette (schemi esatti di Stop, PreCompact, hook HTTP).

## 7. Memoria strutturata per agenti e controllo del grafo (M1, 2026-11-08)

Domanda dell'utente durante il grilling di `m1.3`: davvero non esisteva nulla che facesse questo?
La sezione 1 aveva censito solo strumenti *visivi*; qui gli strumenti che danno all'agente una
memoria del piano, e le tecniche per tenere ordinata una struttura scritta da un LLM. Due ricerche
web in parallelo. Legenda: [C] verificato nel codice · [D] dichiarato (README, DeepWiki) ·
[W] fonte secondaria. I numeri vanno riverificati alla fonte prima di citarli altrove.

### 7.1 Strumenti

| Nome | Licenza | ★ / push | Formato su disco | Chi scrive | Anti-caos | Costo contesto | UI | Per noi |
|---|---|---|---|---|---|---|---|---|
| [Beads](https://github.com/gastownhall/beads) | MIT | 28,6k / 11-2026 | Dolt in `.beads/` [D]; JSONL solo export | CLI `bd` + MCP, nessuna conferma | `bd ready`, `defer`, `supersedes`, compattazione | `bd prime` ~1k token [W]; esploso con 61 memorie ([#7208](https://github.com/gastownhall/beads/issues/7208)) | TUI e viewer di terzi (anche React Flow) | Idee |
| [Task Master](https://github.com/eyaltoledano/claude-task-master) | MIT + Commons Clause [C] | 28,3k / 04-2026 | un `tasks.json` (1,5 MB nel loro repo) [C] | l'LLM genera i task da un PRD | controllo delle dipendenze, nessun limite | tool MCP 5k–21k token [D] | CLI | No |
| [Spec Kit](https://github.com/github/spec-kit) | MIT | 148,5k / 11-2026 | `spec.md`, `plan.md`, `tasks.md` [C] | slash command, l'LLM scrive | fasi con "clarify" e checklist umane | file letti a ogni fase | — | Idea: fasi con cancello |
| [Backlog.md](https://github.com/MrLesk/Backlog.md) | MIT | 7,3k / 11-2026 | un `.md` per task, frontmatter [D] | CLI + MCP | un task = una sessione = una PR [D] | — | TUI kanban + web | Idea: formato leggibile nei diff |
| [CCPM](https://github.com/automazeio/ccpm) | MIT | 8,4k / 11-2026 | markdown + GitHub Issues [D] | l'agente + script deterministici | ≤ 10 task per epic [D] | — | — | Idea: script deterministici |
| Claude Code Tasks | proprietario | — | JSON in `~/.claude/tasks`, fuori da git [W] | l'agente, con `blockedBy` | pronto se non bloccato | 4 tool | pannello nel terminale | Non versionato, niente "perché" |
| [MCP memory](https://github.com/modelcontextprotocol/servers) | — | monorepo | `memory.jsonl`, entità/relazioni [C] | MCP | quasi nulla: ignora i duplicati [C] | legge il grafo intero | — | No |
| adr-kit, Lore ([arXiv 2603.15566](https://arxiv.org/abs/2603.15566)) | MIT / paper | piccoli | ADR in markdown; trailer nei commit | l'agente, hook in CI | decisione legata a file:line o al commit | basso | — | Idea: il "perché" legato al commit |

- **Nessuno registra il processo avvenuto.** Sono tracker di lavoro da fare; decisioni, rami,
  rinvii e "perché" non sono di prima classe. Lo scopo (sostituire STATE/LOG/Next) resta scoperto.
- **Chi fa scrivere il piano all'LLM** (Task Master, Spec Kit) inventa task: l'opposto della fedeltà.
- **Beads** è il motore più vicino: stati `deferred`/`closed`, dipendenze `discovered-from` (≈ ramo),
  `supersedes` (≈ decisione rivista), `defer_until` (≈ rinvio), `close_reason`; il "pronto" come
  query. Come backend è sproporzionato (Dolt, federazione, multi-agente) e non sa "dove sei".
- **Formato**: JSONL o markdown con frontmatter battono un JSON unico o un database per i diff.
- **Nessuno garantisce un tetto ai token** iniettati: va costruito un riassunto a budget fisso.
- **Raccomandazione: prendere le idee e costruire** formato e backend; al più un export verso il
  JSONL di Beads per riusarne i viewer. Confidenza media-alta.

### 7.2 Tecniche per tenere ordinato un grafo scritto da un LLM

| Tema | Cosa dice la letteratura | Fonte | Misurato? |
|---|---|---|---|
| Schema e validazione | Lo schema garantisce la forma, non il senso; gli invarianti vanno controllati a parte | [arXiv 2607.18261](https://arxiv.org/abs/2607.18261) | sì |
| Patch | Operazioni piccole costano meno token della riscrittura; indirizzarle per id, non per posizione | [JSON Whisperer](https://arxiv.org/abs/2510.04717) | sì |
| Operazioni tipizzate | Il modello sceglie tra aggiungi / aggiorna / elimina / **niente**, dopo aver visto i 10 elementi più simili | [Mem0](https://arxiv.org/abs/2504.19413) | sì |
| Mai cancellare | Un fatto contraddetto non si cancella: riceve una data di invalidità | [Zep/Graphiti](https://arxiv.org/abs/2501.13956) | descritto |
| Prove | Ogni affermazione cita fonti; un modello verifica che la fonte la sostenga (accordo con umani 78–85%, ma altrove debole) | [ALCE](https://aclanthology.org/2023.emnlp-main.398.pdf), [survey](https://arxiv.org/abs/2510.10161) | sì |
| Consolidamento | Una passata a parte fonde duplicati e corregge confrontando col transcript; una nota sbagliata si propaga a ogni sessione | [Anthropic](https://www.anthropic.com/research/components-of-agent-memory) | descritto |
| Conferme umane | Si approva ~93% dei permessi e si coglie poco del pericoloso; si rifiuta il 39% dei piani | riassunti di terzi ([1](https://daily.dev/posts/humans-in-the-loop-miss-a-third-of-dangerous-ai-coding-agent-requests-823tnlnkc), [2](https://devops.com/anthropic-makes-claude-codes-auto-mode-the-default-betting-automation-beats-manual-review)) | da verificare |
| Chi scrive | L'agente racconta il proprio lavoro peggio di un osservatore (dichiara riuscito l'impossibile); l'osservatore però perde molti errori | [2602.22303](https://arxiv.org/abs/2602.22303), [2609.20812](https://arxiv.org/abs/2609.20812), [2606.10315](https://arxiv.org/abs/2606.10315) | sì |
| Contesto per turno | Riscrivere il piano in fondo al contesto tiene l'agente in rotta | [Manus](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus) | no |

Senza risposta: limiti pubblicati tipo "max N nodi per aggiornamento"; studi sull'estrazione di
eventi da conversazioni; misure dell'efficacia del contesto iniettato. Vanno decisi e misurati da noi.

### 7.3 Regole candidate (da decidere nel brief, `docs/ux/allineamento/brief.md`)

1. Il modello emette solo operazioni tipizzate per id (`add`, `close`, `defer`, `link`, `noop`), mai il grafo intero.
2. Un validatore deterministico applica gli invarianti (un solo corrente, niente cicli, padre esistente, transizioni ammesse, rinvii verso milestone successive); rifiuta con motivo, al più 3 tentativi.
3. Nessun nodo senza prova (id di un messaggio, commit, file), la cui esistenza è verificata dal codice.
4. Che la prova sostenga il nodo lo giudica un modello; se no, il nodo resta "non verificato" e il viewer lo attenua.
5. Budget per aggiornamento e cap ai rami aperti; oltre, si propone di chiudere o rimandare, non di aggiungere.
6. Prima di aggiungere, confronto con i nodi simili: aggiungi, aggiorna o niente.
7. Mai cancellare: un nodo superato punta al successore.
8. Consolidamento separato (fine sessione o soglia), confrontando col transcript.
9. Conferma umana solo per la struttura; se i rifiuti si accumulano, si passa a chiedere tutto.
10. Ruoli divisi: l'agente scrive intenzioni, decisioni e rinvii ai checkpoint; l'osservatore verifica i fatti e segnala.
11. All'agente, a ogni turno, solo un riassunto a budget fisso derivato dal grafo verificato; il resto su richiesta.
