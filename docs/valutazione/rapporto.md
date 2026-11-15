# ariadne: il filo del lavoro con un agente, senza handoff

*Rapporto finale della valutazione, 2026-11-15 (passo `m4.4.12`). Versione completa per chi vuole il metodo.
Ogni termine in grassetto è spiegato dove compare la prima volta; dopo si usa senza spiegarlo di nuovo.*

## In breve

ariadne tiene traccia di dove sta il lavoro con un agente di coding, del perché di ogni scelta e delle prove,
senza che nessuno scriva note a mano. Su 12 progetti di prova un agente che riprende il lavoro con ariadne
risponde giusto quanto con le note scritte a mano (98,6% contro 96,5%), spende un po' meno (−5%, differenza
non dimostrata) e riprende il lavoro aperto meglio (24 su 24 contro 14 su 24; 20 su 24 con un criterio più
largo). Un modello piccolo che controlla il filo trova il 93% degli errori, con 2 falsi allarmi su 48. Il vantaggio principale non è nei numeri di ripresa: è che le note non vanno più scritte né chieste.

## 1. Il problema

Un **agente di coding** è un modello linguistico che lavora in un repository: legge file, lancia comandi,
scrive codice (qui Claude Code). Lavora in **sessioni**: conversazioni che finiscono, per scelta o perché
la memoria di lavoro si riempie. Quella memoria è il **contesto**: tutto il testo che il modello vede in un
dato momento, pagato a token a ogni richiesta.

Quando una sessione finisce, il contesto si perde. La pratica comune è l'**handoff**: prima di chiudere,
l'agente scrive due note, `STATE.md` (dove siamo, cosa viene dopo) e `LOG.md` (cosa è successo), e la
sessione successiva le legge. In questo rapporto la chiamiamo condizione ***note a mano***: è il termine di paragone di ogni numero.

L'handoff ha due difetti, ed è da questi che ariadne nasce.

- **Logistica.** Qualcuno deve ricordarsi di chiederlo. Nell'archivio di 7 progetti dell'autore (107
  sessioni, 1085 prompt) l'utente ha chiesto un handoff o un aggiornamento dello stato 44 volte: 0,41 per
  sessione, in circa due sessioni su cinque. Quando nessuno lo chiede, le note restano indietro.
- **Explainability.** Le note dicono dove sei, non come ci sei arrivato: perché si è scelta una strada,
  quale è stata abbandonata, che cosa è stato rinviato e dove sta la prova che un passo è finito.

## 2. Cosa fa ariadne

ariadne sostituisce le note con un **filo**: un grafo del lavoro salvato nel repository, in
`.ariadne/graph.jsonl`, una riga per nodo. Un **nodo** è una milestone, un **passo** del piano o una
**deviazione** (un lavoro fuori piano, da cui si rientra). Ogni nodo ha uno stato (da fare, attivo, fatto,
rinviato, sostituito), un «perché» e una **prova**: il commit o il file che dimostra che il passo è finito.
Il codice verifica che la prova esista.

Il filo si aggiorna da solo, senza handoff:

- ogni commit porta la riga `Thread: <id>` del passo su cui l'agente lavora;
- un **hook** (un comando che Claude Code lancia a ogni evento, come un commit o un nuovo prompt) legge
  quella riga, registra il commit come prova e chiude il passo se il messaggio dice `done`;
- all'avvio di una sessione un altro hook inietta nel contesto la **scheda di stato**: una pagina di al più
  3500 caratteri con dove sei, cosa resta da fare del passo aperto, il prossimo passo e le decisioni
  sostituite. A ogni prompt successivo arriva un riassunto solo se lo stato è cambiato.

Per la persona ci sono una **barra** sopra il prompt (il passo corrente, il prossimo, l'ultima cosa
successa) e una **mappa** (il viewer): una pagina web locale, in sola lettura, con il grafo, la cronologia
e un elenco da cercare; un clic su un nodo mostra il suo «perché», da cosa dipende e la prova.

Quello che si decide in chat (un piano approvato, un'indicazione, un file salvato fuori dal repo) non passa
dai commit: la skill chiede all'agente di registrarlo nello stesso turno, e un hook a fine turno
(`ariadne check --hook`) lo ferma una volta se trova un «sì» o una risposta senza registrazione, un file
esterno che nessun nodo cita o un commit senza `Thread:`.

## 3. Le ricerche alla base

Il progetto è partito da quattro filoni di ricerca (`docs/research.md`, `docs/valutazione/ricerca-*.md`).

| Filone | Che cosa abbiamo trovato | Che cosa ne abbiamo preso |
|---|---|---|
| Strumenti visivi (Markmap, Mermaid, React Flow, n8n, LangGraph, Langfuse, Agent Flow) | Mostrano codice o esecuzione, non un processo con stato e «perché» | Un viewer del processo, non dell'esecuzione |
| Memoria per agenti (Beads, Task Master, Spec Kit, Backlog.md, CCPM, Claude Code Tasks, MCP memory) | Sono tracker di cose da fare: decisioni, rinvii e «perché» non sono di prima classe | Gli stati di Beads (rinviato, sostituito), il formato leggibile nei diff di Backlog.md |
| Grafi scritti da un LLM (Mem0, Zep/Graphiti, JSON Whisperer, ALCE, Anthropic) | Operazioni piccole per id costano meno e sbagliano meno della riscrittura; un fatto contraddetto non si cancella; ogni affermazione cita una fonte | Operazioni tipizzate, validatore deterministico, mai cancellare, prova obbligatoria |
| Context engineering (Anthropic, Manus, prompt caching) | Al modello serve poco contesto subito e il resto su richiesta; ripetere il piano tiene l'agente in rotta, ma ogni testo iniettato si paga a ogni richiesta | Scheda a tetto fisso all'avvio, riassunto solo se cambia, dettagli con `show` e `why` |

Per la valutazione abbiamo studiato i benchmark di memoria per agenti, le metriche ripetute (pass^k), il
giudizio con modelli e la statistica con pochi casi (`ricerca-metodi.md`), e gli strumenti standard di
usabilità con un solo utente (SUS, SEQ, KLM, Cognitive Dimensions; `ricerca-usabilita.md`).

## 4. I principi, e dove stanno nel codice

| Pilastro | Principio | Dove |
|---|---|---|
| Explainability | Ogni nodo ha «perché», autore, data e prova; `why <id>` ricostruisce la catena delle dipendenze | `src/inspect.mjs`, `src/validate.mjs` |
| Explainability | Mai cancellare: un nodo sostituito punta al successore | `src/apply.mjs` |
| Efficienza | Scheda ≤ 3500 caratteri, riassunto per prompt solo se cambia (una sessione lo riceve una volta) | `src/card.mjs`, `bin/ariadne.mjs` |
| Efficienza | Nessun modello per costruire scheda e riassunto: sono calcolati dal grafo | `src/summary.mjs`, `src/card.mjs` |
| Context engineering | Poco subito, il resto su richiesta: `.ariadne/STATE.md` una riga per nodo, `show` e `why` per il dettaglio | `src/card.mjs` (`view`) |
| Context engineering | Gli hook non bloccano mai: con un grafo non valido l'agente riceve il riassunto e un avviso | `bin/ariadne.mjs` |
| Knowledge base | Operazioni tipizzate per id e un validatore deterministico, mai la riscrittura del grafo | `src/apply.mjs`, `src/validate.mjs` |
| Knowledge base | JSONL in git, una riga per nodo: diff leggibili, storia completa, prove legate ai commit | `.ariadne/`, `src/trailers.mjs` |

## 5. Cosa porta in più rispetto a ciò che esiste

Il confronto (`confronto.md`) mette ariadne accanto a 13 strumenti su 13 criteri fissi, compresi quattro in
cui un progetto giovane perde. Le fonti sono README e metadati GitHub, non il codice; la riga di ariadne
l'ha compilata l'autore.

Nessuno degli strumenti esaminati fa queste tre cose insieme:

1. lega ogni passo a un commit verificato e al suo «perché», in un grafo versionato in git;
2. tiene un tetto al contesto iniettato *e* porta lo stato del processo (auto-memory di Claude Code e Aider
   hanno un tetto, ma non lo stato);
3. si aggiorna senza che qualcuno lo chieda, dai commit (Cline Memory Bank, CCPM e Task Master aspettano una
   richiesta).

Gli altri sono migliori in maturità (Spec Kit 150k stelle, Beads 28,7k), lavoro di squadra e con più agenti
(Beads, CCPM), integrazione con le issue (CCPM, Beads) e numero di editor supportati. ariadne funziona solo
con Claude Code.

## 6. Come l'abbiamo valutato

### Il metodo

La domanda principale (D1): un agente che riprende il lavoro a contesto vuoto se la cava con ariadne almeno
quanto con le note scritte a mano, e a che costo?

- **Scenari.** Uno **scenario** è la storia di un progetto finto: piani, commit, deviazioni, rinvii,
  decisioni sostituite, da 60 a 120 eventi. Da ogni scenario un generatore deterministico costruisce due
  copie del repository, una per **condizione**: *note a mano* (con `STATE.md` e `LOG.md` scritti dalla skill di
  handoff a ogni fine milestone e alla fine) e *ariadne* (con il filo). Il codice del progetto finto è lo
  stesso nelle due.
- **Domande.** Sette per scenario: dove sei, perché, quale prova, cosa è stato rinviato, quale decisione
  vale oggi, una domanda senza risposta (per vedere se l'agente inventa) e la **prova di ripartenza**: «riprendi il
  lavoro, fai la prima modifica». La prova di ripartenza passa se l'agente modifica un file del passo aperto, o ne
  aggiunge uno nella sua cartella, senza toccare lavoro sostituito o rinviato.
- **Cieco.** I 12 scenari di test li ha scritti un modello (Opus 5.5) da un brief fisso. L'autore di ariadne
  non ha letto né domande né risposte. Un revisore con contesto pulito ne ha controllati 4 estratti a caso e
  ha trovato un difetto del grader, corretto prima di iniziare.
- **Pre-registrazione.** Ipotesi, analisi, comandi e budget sono stati committati prima di ogni prova sul
  set di test, con l'hash di ogni file congelato (`preregistrazione.md`, `eval/manifest.json`). Così non si
  possono scegliere a posteriori le analisi che danno ragione.
- **Prove.** Il soggetto è Sonnet 5.5, in sessioni isolate: 12 scenari × 7 domande × 2 condizioni × 2
  ripetizioni = 336 prove, più 56 con le domande riformulate e 56 con Opus 5.5 come controllo.
- **Spesa.** 26,3 $ a prezzi di listino, contro un tetto di 30 $ fissato prima: scenari 7,2, note a mano
  scritte per gli scenari 7,8, prove di ripresa 7,5, controllo Opus 2,4, osservatore e il resto 1,3.
- **Pilota.** Sette piloti su Haiku, su scenari di sviluppo separati, hanno messo a punto domande e grader e
  hanno trovato tre difetti di ariadne, poi corretti (sotto).

### Le ipotesi

- **Ipotesi 1, correttezza.** ariadne non è peggio delle *note a mano* di più di 10 punti percentuali. È un test di **non
  inferiorità**: passa se il limite basso dell'**intervallo** al 97,5% (l'insieme dei valori compatibili con
  i dati) sta sopra −10 punti.
- **Ipotesi 2, costo.** Il costo per prova differisce tra le due condizioni. Il costo è a prezzi di listino, con la
  **cache** (il testo già visto dal modello, che costa un decimo) trattata allo stesso modo in entrambe, così
  l'ordine delle prove non cambia il conto.

## 7. I risultati

### Ripresa del lavoro (Sonnet 5.5)

| Misura | *note a mano* | ariadne | Esito |
|---|---|---|---|
| Domande giuste (sei categorie) | 96,5% | 98,6% | **ipotesi 1 confermata**: +2,1 punti, limite basso −2,7 contro −10 |
| Giuste in entrambe le ripetizioni | 95,8% | 97,2% | — |
| Costo per prova, rapporto ariadne/*note a mano* | 1 | 0,95 (0,90–1,00) | **ipotesi 2 non confermata** (p = 0,11) |
| Ripartenza | 14/24 | 24/24 | secondaria |
| Ripartenza, criterio largo (deciso dopo) | 20/24 | 24/24 | secondaria |
| Domande riformulate (4 scenari) | 95,8% | 100% | secondaria |
| Fermate per chiedere sulla ripartenza | 0/24 | 0/24 | — |
| Controllo Opus 5.5 (2 scenari) | 95,8% | 100% | costo −11% |

- **Correttezza.** Le due condizioni sono quasi al massimo. Gli errori sono tutti astensioni («non risulta»)
  sulla domanda di prova: 5 con le *note a mano*, 2 con ariadne. Nessuna risposta sbagliata.
- **Costo.** ariadne costa meno in 8 scenari su 12 (da −19% a +11%). Costa meno dove con le *note a mano* bisogna cercare nel
  LOG: decisione attuale (−23%), rinvii (−19%), dove sei (−10%). Costa uguale su perché, prova e ripartenza.
- **Ripartenza.** Con il criterio fissato prima ariadne riprende il passo giusto 24 volte su 24, le *note a mano* 14. Ma 6 dei 10 errori delle *note a mano* sono
  inizi giusti in un file fuori dalla cartella del passo, come `tests/test_letters.py`: con un criterio che
  accetta ogni file che nomina l'area del passo, le *note a mano* salgono a 20. Gli errori veri delle *note a mano* sono due
  scenari su dodici: lavora su un'altra area, o tocca solo la configurazione.

### L'osservatore (prototipo non ancora nel prodotto)

Un **osservatore** è un modello piccolo (Haiku 5.5) che legge l'ultimo turno dell'agente e la vista del filo
e segnala se il filo è rimasto indietro: un passo finito non registrato, una deviazione non annotata, la
posizione sbagliata. La misura usa 48 momenti di 12 scenari, ognuno con il filo giusto e con quattro filoni
sbagliati apposta. Il **recall** è la quota di errori trovati; un **falso allarme** è una segnalazione sul
filo giusto. La regola pre-registrata lo adotta se il recall è almeno 0,6 e i falsi allarmi al più 0,15.

| Misura | Valore | Soglia |
|---|---|---|
| Recall complessivo | 0,93 (0,88–0,96) | limite basso ≥ 0,6 |
| Falsi allarmi sul filo giusto | 2 su 48 = 0,04 (0–0,10) | limite alto ≤ 0,15 |
| Costo per controllo | ~0,0006 $ (Haiku) | — |

**La regola passa: l'osservatore si adotta.** Trova quasi sempre un passo segnato finito senza esserlo
(0,96), il lavoro mancante (0,98) e la posizione sbagliata (1,00); le deviazioni non annotate sono le più
difficili (0,77). Nel pilota il primo prompt dava falsi allarmi nel 75% dei casi: bastava definire meglio
«finito» e «corrente».

### Cosa ha corretto la valutazione

La valutazione ha cambiato il prodotto prima di misurarlo:

- **La ripartenza.** Nei primi piloti ariadne riprendeva peggio delle *note a mano* (25% contro 80%): il riassunto
  mostrava il prossimo passo con lo stesso peso di quello aperto, e non diceva cosa ne restava. La scheda di
  stato ora apre con «Sei in» e «Resta da fare»: sul test, 24 su 24.
- **Il costo.** Al sesto pilota ariadne costava il 21% in più, perché il riassunto si ripeteva a ogni prompt.
  Con la scheda all'avvio e il riassunto solo se cambia, il settimo pilota dava −10% e il test −5%.
- **Comportamenti.** L'agente con ariadne tendeva a chiudere un passo prima di farlo, a saltare al passo
  successivo, a fermarsi a chiedere conferma. Sul test non si è mai fermato a chiedere.

## 8. Pro e contro rispetto alle note a mano

| | ariadne | *note a mano* (handoff) |
|---|---|---|
| Correttezza della ripresa | pari (98,6%) | pari (96,5%) |
| Costo della ripresa | uguale o poco meno (−5%, non significativo) | riferimento |
| Riprendere il lavoro aperto | 24/24 | 14/24 (20/24 col criterio largo) |
| Chi aggiorna lo stato | gli hook, a ogni commit | l'utente lo chiede (0,41 volte per sessione) |
| Perché e prove | per ogni nodo, verificate | nel testo delle note, se qualcuno le scrive |
| Decisioni sostituite e rinvii | nodi con il successore | righe nel LOG |
| Da imparare | una CLI e la regola `Thread:` nei commit | niente |
| Dipende da | l'agente che scrive `Thread:` e registra le decisioni prese in chat; hook installati | l'utente che ricorda l'handoff |
| Ecosistema | solo Claude Code, un autore | qualunque agente |

## 9. Limiti

- **Un solo autore e un solo utente.** La prova con la persona non è ancora fatta: questo rapporto dice
  come se la cava l'agente, non quanto la persona capisce meglio il flusso.
- **Scenari sintetici.** Progetti finti scritti da un modello, non lavoro vero; il set è piccolo (12).
- **Effetto soffitto.** Entrambe le condizioni sono vicine al 100%: il test misura la non inferiorità, non
  un vantaggio.
- **Le note a mano ci sono sempre.** Negli scenari la condizione *note a mano* riceve l'handoff alla fine, come prescrive la
  skill. Nella pratica l'handoff si dimentica: il vantaggio logistico di ariadne non entra nei numeri.
- **Autonomia.** Le richieste di handoff vengono da un filtro automatico sui prompt, di precisione non
  verificata; con ariadne ci sono solo 3 sessioni, troppe poche per un confronto.
- **Le decisioni prese in chat.** Scrivendo il rapporto interno, le approvazioni e le indicazioni date in
  chat non sono state registrate: prima di chiudere la sessione è servito un riassunto a mano, proprio
  l'handoff che ariadne vuole evitare. Ora la skill chiede di registrarle subito (provata su 2 scenari
  scritti da noi: la skill nuova li fa giusti, la vecchia no) e il controllo a fine turno segnala quelle
  rimaste indietro. Il controllo riconosce il «sì» con regole semplici e non è ancora misurato.
- **Confronto con i concorrenti leggero.** Da documentazione pubblica, senza giudici ciechi.
- **Vista.** Gli id dei passi seguono l'ordine di creazione, non quello delle milestone: un agente che legge
  gli id e non i titoli può confondersi.

## 10. Prossimi passi

1. **Prova con la persona:** 8 sessioni alternate a caso tra le due condizioni, con 4 compiti di comprensione ciascuna; tempo, facilità percepita (SEQ) e carico mentale.
2. **Scribe:** trasformare la nota dell'agente in operazioni validate, per i casi che i commit non coprono.
3. **Osservatore nel prodotto:** la valutazione lo adotta. Oggi a fine turno gira un controllo a regole
   (`src/check.mjs`); il passo successivo è misurarlo e affiancargli, o sostituirgli, il modello piccolo.
4. **Uso da parte di altri:** il plugin si installa già con `/plugin install ariadne --marketplace DanieleAngioni97/ariadne-thread` e `/ariadne:init`; serve qualcuno che lo provi su un progetto vero.

## Fonti e materiali

- Piano, pre-registrazione, confronto: `docs/valutazione/`
- Risultati grezzi e analisi: `eval/results/`; scenari e fixture congelati: `eval/scenarios/test/`,
  `eval/frozen/`; hash: `eval/manifest.json`
- Piloti: `eval/pilot.md`; ricerche: `docs/research.md`, `docs/valutazione/ricerca-*.md`
