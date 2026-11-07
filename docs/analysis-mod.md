# Analisi — mod di Claude Code, STATE/LOG, formato

*2026-11-07. Segue `docs/research.md`. Risponde alle decisioni del primo giro (nodo `m0.7` di
`docs/process-trace.md`).*

Fonti: reference e tipi delle mod nel build installato (Claude Code 2.1.302, `plugin-authoring`:
`reference.md`, `types/claude-code.d.ts`); DeepWiki su `patoles/agent-flow`; codice pubblico di
mod esistenti (grep MCP). Nessuna mod scritta o eseguita: è un'analisi.

## Decisioni prese

| # | Domanda | Decisione |
|---|---|---|
| 1 | Architettura | B (file-first) che evolve in A (aggiornamento automatico) |
| 2 | Perimetro | Principalmente seguire il discorso con gli agenti; uso a mano possibile |
| 3 | Agent Flow | Riusare se è un buon punto di partenza, non reinventare |
| 4 | Dove gira la UI | Valutare una mod di Claude Code → §1 |
| 5 | Chi aggiorna | Claude in automatico; versionare forse no; valutare STATE/LOG → §2 |
| 6 | Formato | Chiarire a cosa serve il markdown → §3 |
| 7 | Licenza | Dipende dal codice di base → §4 |

## 1. Una mod di Claude Code come UI

Una mod è un plugin con un modulo TypeScript che aggancia eventi del motore (`on(event, hook)`)
e disegna nell'interfaccia. Gira dentro Claude Code: niente server, niente browser.

### Cosa vede

- **Ogni riga della conversazione** (`session.append`): prompt dell'utente, ogni blocco della
  risposta del modello, tool call e risultati, notifiche, compattazione; anche nei subagent
  (`agentId`). È l'input/output della chat, senza leggere i transcript dal disco.
- **Ciclo di vita**: `session.start` (startup, resume, clear, compact, fork), `turn.start`,
  `turn.complete`, `session.end`; gli hook classici come `classic.<Event>`.
- **Il prompt prima dell'invio** (`prompt.submit`) e **il system prompt** (`prompt.compose`):
  la mod può iniettare "dove siamo" in ogni turno.

### Cosa può fare

- **Chiamare il modello da sola**: `$.model.complete` (una completion, es. `haiku`, senza
  storia) e `$.model.fork` (una completion sulla trascrizione della sessione stessa, servita
  dalla cache, senza tool). È il pezzo che rende possibile "Claude in automatico" senza
  chiedere disciplina al modello principale.
- **Registrare tool per il modello** (`$.tool.register`, visti come `mcp__<plugin>__<nome>`):
  sostituisce un server MCP separato.
- **Persistere**: `$.state` (sessione), `$.store` (tra sessioni), `$.fs` (file del progetto).
- **Comandi slash** (`/thread …`), toast, voce nella status line.

### Cosa può disegnare

| Dove | Elemento | Uso per noi |
|---|---|---|
| Banda sopra il prompt (`AbovePrompt`) | Box/Text/Button | **Posizione corrente sempre visibile**: "📍 m0.7 Decisioni · da m0.5 · 3 rami aperti" |
| Pannello (`Pane`) | Box/Text/Button/Markdown | Il grafo: affiancato alla chat nel layout fullscreen da ~110–144 colonne, altrimenti inline |
| Hover | `Box` con stili `hover` + `position: "absolute"` | Card con la frase di contesto sopra il nodo |
| Click | `Button onPress`, link in `Markdown` | Dettaglio del nodo nel pannello |
| Regione custom (`Client`) | modulo di superficie con eventi puntatore, tastiera, clock | Grafo disegnato a celle con hover/click veri (terminal e desktop) |
| Desktop, VS Code, mobile | `Svg` (interattivo in frame sandbox) | Grafo 2D vero, in una fase successiva |

Su terminale non c'è `Svg`: il grafo è testo. La forma realistica è un albero verticale stile
`git log --graph` (✓ fatto, ● in corso, ○ da fare, ✗ abbandonato) con il nodo corrente
evidenziato. Un layout DAG 2D a celle è possibile ma è il pezzo più difficile.

### Pro e contro

- \+ Un solo pezzo: niente daemon, niente server MCP, niente hook HTTP, niente parsing di un
  formato JSONL interno. L'architettura A si riduce a una mod.
- \+ La banda copre il requisito più importante (non perdere mai la posizione) a costo quasi nullo.
- \+ Distribuzione già pronta: marketplace su GitHub, `/plugin install`.
- \+ È una strada già battuta: mod con pannelli esistono (`anthropics/claude-code` `mods/diff`,
  `zhangfengcdt/memoir`, `qf-studio/navigator`).
- − Vive solo in Claude Code: altri agenti (Codex, Cursor) o un uso del tutto a mano restano fuori.
  Il formato dati resta portabile, quindi un viewer separato si può aggiungere dopo.
- − Grafo testuale sul terminale; il 2D vero solo su desktop/VS Code.
- − API giovane: l'intestazione dei tipi dice "EARLY ACCESS: this surface may change between
  releases without notice". Il file è di ~22.000 righe e cambia col build. Da trattare come
  dipendenza che si muove: test della mod a ogni aggiornamento di Claude Code.
- − Da verificare: se una libreria di layout (dagre, MIT) si può includere nel modulo (niente
  Node, niente DOM; si importano solo file del plugin).

### Chi estrae i nodi dalla chat

| Modo | Come | Pro | Contro |
|---|---|---|---|
| Osservatore leggero | A `turn.complete`, `$.model.complete` (haiku) su grafo attuale + righe del turno → patch JSON | Automatico, fuori dal contesto principale, economico | Vede solo il turno: qualità da misurare |
| Osservatore con fork | Come sopra con `$.model.fork` sulla sessione intera | Vede tutto il discorso; prefisso dalla cache | Costo per turno che cresce col contesto |
| Tool del modello | `thread_update` registrato, istruito via `prompt.compose` | Preciso nei momenti di decisione | Disciplina del modello, token nel contesto principale |

Proposta: osservatore leggero di default, fork per riallineare (a richiesta o alla
compattazione), tool solo per i momenti espliciti ("apri un ramo qui"). I costi vanno misurati
con un prototipo prima di fissarlo.

Idea da Navigator: rileva quando un prompt esce dalla "rotta" corrente e propone una deviazione.
Per noi è la nascita automatica di un ramo.

## 2. STATE, LOG, Next: integrare o tenere separato

Oggi: `STATE.md` (milestone, Next, pointer) iniettato a ogni avvio dall'hook git-guard;
`LOG.md` una riga per milestone; le skill `handoff` e `commit-checkpoint` li scrivono; tutto
versionato nel repo.

**Il grafo li contiene già come concetto:**

| Oggi | Nel grafo |
|---|---|
| Milestone | Nodo di primo livello `active` |
| Next | Nodi `todo` figli del corrente, in ordine, + rami aperti |
| LOG | Nodi `done` con data, in ordine |
| Pointer | Link nel dettaglio dei nodi |
| Iniezione a SessionStart | `prompt.compose`: la mod inietta posizione e Next |

**Ma hanno granularità e lettori diversi.** Il grafo cambia a ogni turno e serve a te durante
la chat. STATE e LOG cambiano a ogni milestone e servono a chi apre il repo senza lo strumento:
GitHub, un'altra macchina, un altro agente, gli hook e le skill che già li leggono.

| Opzione | Pro | Contro |
|---|---|---|
| Tenere separati | Nessun rischio, niente da cambiare | Due fonti dello stesso stato: si disallineano |
| Sostituire con il grafo | Una sola fonte, strutturata | Si perde il tracciato versionato e leggibile senza tool; lock-in sulla mod; rompe git-guard, handoff, commit-checkpoint |
| **Grafo come fonte, STATE/LOG come proiezione** | Una fonte; resta un tracciato versionato e grossolano | Va scritto l'export; STATE/LOG non si editano più a mano |

**Raccomandazione: proiezione, a tappe.** All'inizio separati (la mod deve prima dimostrarsi
affidabile). Poi la mod genera `STATE.md` (milestone, Next) e la riga di `LOG.md` alla chiusura
di una milestone, prendendo il posto del passo di scrittura di `handoff`.

**Versionare il grafo?** Il grafo fine no: rumore nei diff a ogni turno, conflitti, e può
contenere pezzi di conversazione (problema in un repo pubblico). Va salvato in locale, legato al
progetto e non alla sessione, così sopravvive a `/clear` e alle sessioni successive: un file in
`.ariadne/` ignorato da git, ispezionabile e copiabile, oppure `$.store`. Il tracciato versionato
è la proiezione STATE/LOG. Eccezione: `docs/process-trace.md` di questo repo resta versionato
perché è il dataset di prova.

## 3. A cosa serve il markdown

Non serve a mostrare il grafo: lo disegna la UI. `process-trace.md` è in markdown solo perché
oggi lo scriviamo a mano, e fa da dataset per i test.

Nella mod il formato vero sarà **JSON**: un log di eventi append-only (`node.created`,
`status.changed`, `current.moved`, `branch.opened`) da cui si ricostruisce il grafo. Un log
risponde anche a "come ci sono arrivato", perché conserva l'ordine. Il markdown resta al più
come export leggibile. `process-trace.md` verrà convertito in quel formato e usato come fixture.

## 4. Codice di base e licenza

- **Agent Flow: non è una base per una mod.** È un'estensione VS Code con server HTTP per gli
  hook, watcher dei JSONL e una web UI React con canvas e `d3-force`. Il suo modello dati
  (`Agent`, `ToolCallNode`, `Edge`) attraversa ingestione, simulazione e rendering: cambiarlo
  vuol dire riscriverlo (DeepWiki). Restano le idee: doppia sorgente hook + transcript e la
  loro deduplica.
- **Navigator** (`qf-studio/navigator`, MIT, 355★, attivo): è la mod più vicina che ho trovato.
  Ha una banda di stato, una "rotta" a waypoint con la tappa corrente e il rilevamento delle
  deviazioni. Il suo scopo però è il context engineering: rotta lineare, legata al suo sistema
  di task e al suo runtime Python, modulo di ~1.000 righe. Fonte di idee, non base.
- **Riferimenti tecnici**: `mods/diff` nel repo `anthropics/claude-code` (pannello ufficiale),
  `zhangfengcdt/memoir` (Apache-2.0).
- **Licenza**: partendo da zero la scelta è libera. MIT è la più semplice. Apache-2.0 aggiunge
  la clausola sui brevetti. Una dipendenza come dagre (MIT) non vincola. ELK.js (EPL-2.0)
  aggiungerebbe obblighi, e comunque serve poco su terminale.

## 5. Cosa cambia rispetto a `research.md`

- B → A resta, ma con un solo veicolo: la mod. B = la mod legge e scrive il grafo locale e lo
  disegna, aggiornato a mano o dal tool. A = estrazione automatica con l'osservatore.
- Spariscono il daemon, il server MCP separato e la lettura dei transcript come sorgente.
- React Flow ed ELK escono dal percorso principale (niente DOM nella mod). Tornano solo se un
  giorno servirà un viewer web separato.

## 6. Secondo giro (nodo `m0.10`)

| # | Domanda | Decisione |
|---|---|---|
| 1 | Mod come prodotto | Sì, **a condizione** che la UI sia bella e comoda; altrimenti si rivaluta → spike visivo |
| 2 | Estrazione dei nodi | Da chiarire il fork (sotto); aggiungere i **segnalibri** sui messaggi |
| 3 | STATE/LOG | Per ora export generato dal grafo; integrazione dopo, se funziona |
| 4 | Dove vive il grafo | File di progetto ignorato da git (`.ariadne/`) |
| 5 | Licenza | Da scegliere: l'utente vuole i crediti e sapere chi lo usa (sotto) |
| 6 | Remote | Repo GitHub privato, niente PR per ora |

### "Fork" non è un fork della conversazione

`$.model.fork` è una **domanda laterale** al modello: rilegge la conversazione così com'è
(dalla cache, quindi costa poco) e risponde, per esempio "aggiorna il grafo con quello che è
successo". La chat non cambia, non si crea nessun ramo e il modello principale non vede né la
domanda né la risposta. Il fork della sessione di Claude Code (riprendere da un punto e andare
in un'altra direzione) è un'altra cosa e qui non serve.

### Segnalibri

Fattibili con la mod: ogni riga della chat ha un id (`uuid` in `session.append`), la mod può
disegnare un segno sul messaggio marcato e, a un tuo click, scorrere la chat fino a lì
(`$.ui.scroll` verso un messaggio, permesso solo in risposta a un tuo input). Un segnalibro
diventa un nodo del grafo agganciato a un messaggio: `/thread mark "titolo"` o un bottone.
Da verificare nello spike: il salto al messaggio in terminale.

### Come potrebbe apparire (terminale)

Banda sopra il prompt, sempre visibile:

```
 📍 m0.10 Secondo giro di decisioni   ← m0.8, m0.9   ⑂ 3 rami aperti   ★ 2 segnalibri
```

Pannello affiancato alla chat (layout fullscreen, terminale largo):

```
╭─ ariadne · M0 Ricerca ──────────────────╮
│ ✓ p0  Visione del progetto              │
│ ● m0  M0 Ricerca                        │
│ ├ ✓ m0.2 Strumenti esistenti            │
│ │ ├ ✓ b1 Codice di Agent Flow           │
│ │ └ ○ b2 Layout stabile                 │
│ ├ ✓ m0.3 Alimentare da Claude Code      │
│ ├ ✓ m0.5 Sintesi ★                      │
│ ├ ✓ m0.8 Mod come UI                    │
│ ├ ✓ m0.9 STATE e LOG                    │
│ └ ▶ m0.10 Secondo giro   ◀ sei qui      │
│ ○ m1  Analisi e requisiti               │
├─────────────────────────────────────────┤
│ m0.10 · in corso · da m0.8, m0.9        │
│ In attesa dell'ok su mod, estrazione,   │
│ STATE/LOG e licenza.  [ Vai al msg ]    │
╰─────────────────────────────────────────╯
```

Hover su una riga: card con la frase di contesto. Click: il dettaglio scende nel riquadro in
basso. Su desktop e VS Code lo stesso pannello può disegnare il grafo 2D in `Svg`.

**Questo non dimostra che sarà bello.** Il giudizio va dato su una cosa che si vede: per questo
il prossimo passo è uno spike visivo usa e getta (una mod con dati finti presi da questo file,
fuori dal repo), da guardare prima di confermare la strada.

### Licenza: cosa cambia

- **Crediti**: tutte le licenze open source comuni obbligano chi riusa il codice a conservare
  il copyright e la licenza. Il nome resta in ogni copia.
- **MIT**: la più breve; solo l'avviso di copyright.
- **Apache-2.0**: come MIT, più un file `NOTICE` che chi redistribuisce deve portarsi dietro
  (crediti più visibili), più una licenza esplicita sui brevetti. Comune nei progetti di tooling.
- **GPL/AGPL** (copyleft): chi modifica e distribuisce deve pubblicare le modifiche con la
  stessa licenza. Protegge il codice, ma molte aziende la evitano: meno adozione.
- **Sapere chi lo usa**: nessuna licenza open source lo impone (sarebbe non-OSI). Si misura con
  stelle e fork su GitHub, installazioni dal marketplace, issue e discussioni. Una telemetria
  dentro la mod è possibile solo opt-in e dichiarata, e per un tool che vede la conversazione
  sarebbe un problema di fiducia.

Proposta: **Apache-2.0** (crediti via `NOTICE`, nessun freno all'adozione).

### Spike visivo (nodo `m0.11`)

Mod usa e getta `ariadne-spike`, fuori dal repo (cartella delle mod di sessione,
`~/.claude/dev-mods/<sessione>/ariadne-spike/`). Legge `docs/process-trace.md` del progetto
aperto e si ricarica a fine turno.

- **Banda** sopra il prompt: `◆ <passo corrente>   from <genitori>   N open branches   [ Show thread ]`.
- **Pannello** `/thread`: albero con il filo rosso dalla radice al passo corrente, glifi di stato
  (✓ ◐ ○ ×), "you are here"; click su un passo → riquadro di dettaglio (bordo rosso se è il
  corrente); passando sopra un passo, la sua frase di contesto compare in fondo.
- Scelte UX: una sola nota forte (il rosso del filo), il resto in toni spenti; nessuna
  animazione (si guarda decine di volte al giorno); testi in sentence case che dicono cosa fare;
  stato vuoto che spiega come iniziare.
- Verifiche: 7 test (`claude plugin test`: parser, banda, pannello su terminal e desktop, stato
  vuoto), `claude plugin validate`, `tsc` puliti. Non verificati dai test: l'aspetto reale e
  l'hover, che dipendono dal terminale.
- Il primo test ha trovato un vincolo reale: un `Button` accetta solo testo, niente gruppi.
