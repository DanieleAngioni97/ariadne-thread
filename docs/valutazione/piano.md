# Piano di valutazione

*Versione 3.1 del 2026-11-14 (passo `m4.3.5`), riscritta dopo due revisioni indipendenti
(`revisione-1.md`, `revisione-2.md`) e corretta dopo un'ultima rilettura. Si giudica contro `principi.md`
(P1–P28); le fonti sono in `ricerca-metodi.md` (M) e `ricerca-usabilita.md` (U). Le §§ 13–14 rispondono a
ogni rilievo.* *Versione 3.2 del 2026-11-14 (passo `m4.4.5`): la § 0 riduce la valutazione per stare nella
quota di un account base, e prevale sulle sezioni che seguono.*

## 0. Versione snella (2026-11-14, approvata dall'utente)

L'utente ha un account base: il vincolo è la quota per finestra di 5 ore, non il costo in dollari. Restano
le due domande principali, D1 (l'agente) e D2 (la persona); il resto si riduce o si toglie.

| Parte | Versione 3.1 | Versione snella |
|---|---|---|
| Pilota (§ 6) | 6 scenari × 2 ripetizioni, Opus e Sonnet: 336 prove | 6 scenari × 1 ripetizione, solo Haiku: 84 prove |
| E1, soggetto (§ 6) | Opus se il budget lo consente, altrimenti Sonnet; Haiku secondario | solo Sonnet 5.5; Opus su 2–3 scenari come controllo, se resta quota |
| E1, dimensione (§ 6) | ≥ 16 scenari, 3 ripetizioni + 3 sulla parafrasi | 12 scenari, 2 ripetizioni; parafrasi con 1 ripetizione su 4 scenari |
| H1b (§ 6) | pass^3 | pass^2 |
| Potenza (§ 6) | simulazione per 15 punti con potenza 0,8 | la simulazione del pilota dichiara la differenza rilevabile con 12 scenari e 2 ripetizioni (attesa: 20–25 punti) |
| E1b (§ 6) | 672 prove | tolto; il ritardo del filo è un limite dichiarato |
| E2 (§ 7) | varianti A, B, C su 40 checkpoint | solo la variante A (Haiku sull'ultimo turno), stessi 40 checkpoint e 3 ripetizioni: con 20 F0 la soglia sui falsi allarmi sarebbe irraggiungibile (limite superiore 0,16 anche con zero allarmi) |
| D4 (§ 10) | criteri e schede da un modello terzo, due giudici esterni, 50 etichette | confronto descrittivo sui criteri di § 10, senza giudici né etichette |
| E3 (§ 8) | 8 sessioni | invariato |

*Cosa si perde, da dichiarare nel rapporto:* il test vede solo differenze grandi; il risultato vale per
Sonnet, non per Opus che l'utente usa; l'affidabilità si misura con 2 ripetizioni.

*Domande dopo il primo pilota (2026-11-14):* «Aggiornamento» faceva 0 su 5 in entrambe le condizioni con
risposte giuste, perché la decisione si descrive invece di nominarne il titolo, e Haiku rispondeva in italiano.
Aggiornamento e Rinvio diventano a scelta tra 5 opzioni come Perché (la risposta giusta, la decisione
sostituita o i passi e le milestone più simili, «non risulta»; il caso dà il 20%); il prompt chiede l'inglese.
Dove resta aperta. Il primo pilota resta in `eval/runs/pilot-haiku/` come registro.

*Dopo il secondo pilota (2026-11-14):*
- Continua con *ariadne* faceva 0 su 5: l'agente concatena i comandi (`ariadne log; echo ---; … | head`) e
  Claude Code nega l'intero comando composto. In entrambe le condizioni si ammettono `echo`, `head`, `tail`, `wc`,
  `sort` e `git status`; in *ariadne* tutta la CLI, come nell'uso vero. Una lettura fuori dalla copia resta
  esclusa dal controllo dei percorsi.
- Il pilota ha trovato un bug di ariadne: chiudere un passo avviava il passo rinviato nella milestone invece del
  successivo del piano (`06c7b09`). Si corregge prima della pre-registrazione, che fissa lo sha di ariadne; il
  rapporto lo riporta tra i risultati.
- Da riportare come osservazione sul prodotto: con una modifica in coda («Da confermare») l'agente di *ariadne*
  tende a fermarsi e chiedere la conferma invece di riprendere il lavoro.

*Dopo il terzo pilota (2026-11-14):*
- Continua chiede «the first code change»: l'agente di *ariadne* faceva come prima modifica `ariadne close`
  sul passo aperto, e si fermava lì. Da riportare come osservazione sul prodotto (contabilità del grafo prima
  del lavoro, chiusure premature).
- Continua vieta solo i file dei passi rinviati o sostituiti: il passo aperto può dover toccare i file di un
  passo finito (in `dev-04` l'invalidazione della cache tocca la cache).
- Prova accetta qualsiasi file proprio del passo: un passo può tenere il risultato in più file.

*Dopo il quarto pilota (2026-11-14):*
- Dove si risponde in due campi, `RISPOSTA: <passo corrente> | <passo successivo>`; ogni campo è giusto se il
  titolo di passo più vicino (quota delle sue parole presenti, confrontate sulle prime cinque lettere, almeno
  metà) è quello atteso. Prima si vietavano gli altri titoli nella risposta: penalizzava *prima*, il cui
  STATE.md racconta più contesto e porta a nominare più passi.
- Prova prende il primo percorso della risposta: un commento dopo il percorso non la rende sbagliata.
- Il controllo su `..` vale solo per i percorsi dei tool sui file: un comando può contenere codice con import
  relativi.

*Dopo il quinto pilota (2026-11-15, approvato dall'utente):*
- Soffitto raggiunto: 0,93 (*prima*) e 0,99 (*ariadne*), entrambe sopra 0,90. Gli scenari di test diventano più
  difficili, con regole che il generatore controlla (`check(…, { test: true })`): 60–120 eventi, più distrattori;
  ogni handoff cade alla fine di una milestone, come prescrive la skill `handoff`, e dopo l'ultimo il lavoro
  prosegue con un piano nuovo per almeno 5 commit; il passo aperto ha una cartella sua che nessun altro passo
  tocca. *prima* riceve comunque l'handoff alla fine dello scenario, come prescrive la § 6 (utente,
  2026-11-15): l'handoff dimenticato è un argomento di logistica per il rapporto, non una baseline più debole.
  Gli scenari di sviluppo restano com'erano.
- Da riportare nel rapporto (`eval/pilot.md`): il Continua debole di *ariadne* come problema di chiarezza del
  passo aperto nel riassunto, e l'autonomia (fermate per chiedere, handoff e aggiornamenti chiesti dall'utente,
  filo rimasto indietro) come risultato descrittivo e limite: il piano non la misura come ipotesi.

*Dopo il settimo pilota (2026-11-15). Decisioni dell'utente: la parità di correttezza va bene, il costo in
più no; il resto della valutazione è delegato, push escluso.*
- Prodotto: la scheda di stato all'avvio e il riassunto solo quando cambia (specifica § Riassunto per
  l'agente). Pilota 7: costo −10% su *prima*, dove il pilota 6 dava +21% (`eval/pilot.md`).
- Generatore: dopo un rinvio il lavoro va sul nodo che lo riprende (`a78cafc`). Nei piloti 1–6 il grafo di
  quei passi era sbagliato a sfavore di *ariadne*.
- **Ipotesi della versione snella** (sostituiscono H1a, H1b e H2 della § 6):
  - **H1 (co-primaria, non inferiorità):** la differenza di quota giusta, *ariadne* − *prima*, sulle sei
    categorie a domanda ha il limite inferiore dell'intervallo unilaterale al 97,5% sopra −10 punti.
    Analisi: il GEE della § 6 (`bias_reduced`, t con scenari − 1 gradi di libertà).
  - **H2 (co-primaria):** il costo normalizzato per prova differisce tra le condizioni, a due code.
    Costo normalizzato (`eval/cost.mjs`): prezzi di listino, con le letture dalla cache della prima chiamata
    pagate come scrittura, così l'ordine delle prove non conta. Statistica: per scenario, il log del rapporto
    tra le medie delle due condizioni; Wilcoxon esatto con segno sui 12 rapporti. Si riporta la media
    geometrica dei rapporti con intervallo bootstrap per scenario. Media e non mediana: la spesa sta nelle
    prove lunghe (Continua, ricerche), che la mediana ignora. Sul pilota 7 la mediana dava −2%, la media −9%.
  - Holm su {H1, H2}.
  - *Secondarie, senza significatività:* pass^2, Continua (H3), token non in cache (la vecchia metrica di H2,
    che pesava le letture dalla cache dieci volte il loro prezzo), costo fatturato.
  - **Autonomia (descrittiva, richiesta dell'utente):** le fermate per chiedere su Continua (`asked`: nessun
    file cambiato e risposta che finisce con una domanda), per condizione; da E4, le richieste di handoff o di
    aggiornamento dello stato fatte dall'utente per sessione, prima e dopo ariadne; i commit senza `Thread:`.
- **Potenza** (`eval/power.mjs` sul pilota 7, 4 scenari, α = 0,025): con 12 scenari × 2 ripetizioni, 0,93
  sull'effetto stimato (−9%) e 0,45 se la variabilità tra scenari fosse al limite alto del suo intervallo
  all'80%; non inferiorità 0,88. Con 16 scenari 0,98, 0,65 e 0,95, ma il costo supera il tetto: si resta a 12.
- Soggetto: Sonnet 5.5; Opus su 2 scenari come controllo se resta quota.
- Tetto di spesa a prezzi di listino per bozze, *prima*, E1 ed E2: 30 $ (stima 26 $).

*Ripresa:* il runner salta le prove già registrate, così una prova interrotta dal limite d'uso si rifà nella
finestra successiva invece di andare persa.

**Procedura snella** (sostituisce la § 15 dal punto 5):

1. Pilota di E1 su Haiku; potenza per simulazione; quota per prova e numero di finestre per E1.
2. Scenari di test (12) e di E3 (8) bozzati dal brief e congelati; trascrizioni di E2 (40 checkpoint).
3. Commit di pre-registrazione.
4. E1 su Sonnet ed E2 variante A; analisi.
5. E3 con l'utente; KLM; valutazione euristica.
6. D4 descrittivo.
7. `rapporto.md`.

## 1. Cos'è ariadne, in breve

Le parole del prodotto, nell'ordine in cui servono:

- **Sessione:** una conversazione con l'agente di coding (Claude Code). Diventa lunga quando il contesto si
  riempie; `/clear` la azzera e l'agente riparte senza memoria.
- **Hook:** un comando che Claude Code esegue da solo a un evento (avvio della sessione, invio di un
  prompt, fine di un comando); il testo che stampa può entrare nel contesto dell'agente.
- **Skill:** un insieme di istruzioni che l'agente carica per un compito preciso.
- **Milestone:** una fase del progetto con un obiettivo (per esempio «M3 Implementazione»); contiene passi.
- **Checkpoint:** un momento in cui il lavoro si consolida: un commit, un passo chiuso, un cambio di argomento.
- **Prima:** il modo di tenere il filo che ariadne sostituisce. `STATE.md` (≤ 60 righe: milestone, prossimi
  passi, decisioni aperte, puntatori) si riscrive a fine milestone con la skill `handoff`; un hook lo inietta
  nel contesto all'avvio della sessione. `LOG.md` ha una riga per milestone. Il perché delle scelte sta nei
  messaggi di commit e nei documenti.
- **Grafo:** il cuore di ariadne. Un file con un **nodo** per riga. Un nodo è un passo di lavoro con:
  - uno **stato**: `todo` da fare, `active` in corso, `done` fatto, `deferred` rinviato, `replaced`
    sostituito da un altro;
  - un perché;
  - delle **prove**: il commit, il file o il messaggio che lo dimostrano.

  Una **deviazione** è un nodo fuori piano che dice dove si rientra.
- **Trailer `Thread:`:** una riga nel messaggio di commit (`Thread: <id> done: <esito>`). Un hook la legge e
  aggiorna il grafo da solo a ogni commit.
- **Riassunto:** circa 240 token calcolati dal grafo (dove sei, da dove vieni, cosa viene dopo, file utili).
  Un hook lo inietta nel contesto all'avvio e a ogni prompt.
- **CLI:** `ariadne show <id>` e `why <id>` mostrano un nodo e la catena dei suoi perché; `ariadne validate`
  controlla che il grafo rispetti le sue regole.
- **Banda:** 2–4 righe sopra il prompt nel terminale (dove sei, cosa aspetta una tua conferma, l'ultimo
  esito). La **coda** sono le modifiche fatte dall'agente da solo che aspettano la tua conferma.
- **Viewer:** il grafo disegnato nel browser; hover = una frase, clic = perché e prove.
- **Osservatore:** un modello che a ogni checkpoint confronta il lavoro appena fatto con il grafo e segnala
  nella banda dove si contraddicono. Non scrive mai nel grafo. Si può far girare sul solo turno, oppure come
  **fork**, cioè una copia dell'intera sessione.
- **Scribe:** un modello di ariadne, ancora da costruire nel passo `m4.2`, che traduce una nota dell'agente in
  operazioni sul grafo. Il suo modello si sceglie con la misura dell'osservatore. (Non va confuso con le linee
  guida SCRIBE della § 8, che hanno solo lo stesso nome.)

## 2. Che cosa vogliamo sapere

Le due promesse restano separate (P7):

- **D1 — l'agente.** Dopo `/clear`, un agente riprende il lavoro in modo più corretto, più affidabile e più
  economico con ariadne che con *prima*?
- **D2 — la persona.** Una persona che torna su un progetto ritrova più in fretta e con meno fatica dove è,
  perché, e cosa viene dopo?
- **D3 — l'osservatore** (di supporto). Trova le incoerenze tra lavoro e grafo? A che costo, con quale modello?
- **D4 — il contesto** (di supporto). Dove si colloca ariadne rispetto agli strumenti simili, su criteri
  fissati prima?

## 3. Parole del piano

Valgono le parole di `principi.md`: soggetto, condizione, fixture, ground truth, grader, prova appaiata,
ripetizione, pass^k, discordante, kappa, cluster, set di sviluppo e di test, errore iniettato,
pre-registrazione. In più:

- **Scenario:** la storia di un progetto finto, scritta come lista di **eventi** («piano approvato con i
  passi A, B, C», «A chiuso dal commit che tocca `src/a.js`», «deviazione D», «C rinviato», «decisione E
  sostituita da F»). È la fonte unica di verità da cui nasce tutto il resto.
- **Distrattore:** materiale dello scenario non pertinente o superato (un documento vecchio, un commit di
  manutenzione, un passo dal titolo simile), messo apposta perché trovare la risposta richieda di scegliere.
- **Generatore:** lo script che da uno scenario produce sempre gli stessi byte: il repository git del progetto
  finto, i file della condizione *ariadne* e le domande con le risposte giuste.
- **Mappa delle evidenze:** per ogni domanda, dove sta la risposta in ciascuna condizione.
- **Prova di ripresa:** un soggetto apre una copia isolata del progetto finto a contesto vuoto, riceve ciò che
  la sua condizione inietta, e risponde a una domanda o compie un'azione.
- **Pilota:** prove sul set di sviluppo per stimare costo, varianza e difficoltà; non entrano nei risultati.
- **Effetto soffitto:** quando entrambe le condizioni rispondono quasi sempre bene, la prova non distingue più.

Termini statistici, in ordine d'uso:

- **Precision e recall:** per un rilevatore, la quota dei suoi allarmi che sono veri (precision) e la quota
  degli errori veri che trova (recall).
- **Bootstrap:** stima dell'incertezza ottenuta ricampionando i dati molte volte; *per cluster* se si
  ricampionano scenari interi.
- **GEE:** un modello di regressione che stima l'effetto della condizione tenendo conto che le prove dello
  stesso cluster sono correlate. Con pochi cluster serve una correzione dell'errore standard (Mancl-DeRouen).
- **Wilcoxon:** test appaiato che confronta due condizioni senza assumere una distribuzione normale.
- **Holm:** correzione che alza l'asticella quando si fanno più test, per non trovare effetti per caso.
- **TOST:** test di equivalenza; dice «pari» solo se la differenza sta dentro un margine fissato prima.

## 4. Dove vive la valutazione e con cosa

**Scelta (cambiata il 2026-11-14, passo `m4.4.2`):** una cartella `eval/` in questo repo: scenari,
generatore, runner, grader, analisi. Il rapporto finale va in `docs/valutazione/rapporto.md`.

- *Niente repository annidati:* i progetti finti non si committano. Il generatore li ricrea, identici, in
  `eval/out/`, che git ignora; si committano gli scenari, i testi congelati e i loro hash.
- *Uscite grezze* delle prove in `eval/runs/`, anch'essa ignorata da git; si committano solo i riassunti e i
  loro hash.
- *Perché è cambiata:* un repository fuori da questo chiedeva un'approvazione per ogni scrittura, e avrebbe
  diviso il filo di ariadne in due posti. Il prezzo sono i commit di valutazione nella storia del prodotto.
- *Alternativa scartata:* il repository separato `~/Sviluppo/Personal/ariadne-eval` della versione 3.
- *Isolamento:* ogni prova gira su una copia temporanea della fixture fuori da questo repo (P21, § 6).

**Strumenti:**

- Runner in Node senza dipendenze, che lancia `claude -p` come sottoprocesso e salva il flusso grezzo degli
  eventi (P2).
- Analisi in Python con `scipy` e `statsmodels` lanciati con `uv` e un lockfile, per non riscrivere test
  statistici già verificati.
- *Alternativa scartata:* Inspect AI. Ha ripetizioni e log nativi, ma il suo valore principale (sandbox, API
  dei modelli) non serve con un soggetto che è una CLI. Si riconsidera se il runner supera ~300 righe.

**Cosa si fissa e si registra (P1, P2):**

- la versione della CLI `claude` (oggi 2.1.302), con l'aggiornamento automatico spento durante le prove;
- gli id completi dei modelli (`claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5`), le versioni di
  Node e di git, il lockfile di `uv`;
- `TZ=UTC`, date di commit fisse (`GIT_AUTHOR_DATE`, `GIT_COMMITTER_DATE`), autore git fisso;
- un orologio finto per i campi `at` che la CLI di ariadne scrive: la variabile `ARIADNE_NOW`, da aggiungere
  ad ariadne come primo punto della procedura (§ 15);
- i seed per l'ordine delle prove, il mescolamento delle opzioni, le chiusure tolte in E1b e il bootstrap;
- lo sha di ariadne, e gli hash della skill `handoff`, degli hook, dei CLAUDE.md di condizione, dei prompt e
  di ogni fixture.

**Generato e congelato:**

- *Generati* dal generatore, identici a ogni esecuzione: il repository del progetto finto, il grafo (con la
  CLI vera e l'orologio finto), le domande con le risposte giuste.
- *Congelati una volta*, perché scritti da un modello: STATE.md e LOG.md di *prima*, le parafrasi, le
  trascrizioni dei checkpoint per E2, i casi naturali, gli scenari di test. Si committano con il loro hash.

## 5. Fixture (P4, P6, P22, P23)

**Scenari scritti come dati, non presi dalla storia di questo repo.** Quella storia cambia a ogni commit (P1)
e contiene conversazioni private. Serve solo per E4 e per i casi naturali di E2, congelata in un archivio
(`git bundle`) a uno sha fissato.

**Due set (P22):**

- *Sviluppo:* 6 scenari (2 brevi da ~15 eventi, 2 medi da ~40, 2 lunghi da ~120), per costruire l'harness e
  per il pilota. *Cambiato il 2026-11-14 (passo `m4.4.4`):* il primo (`dev-01`) è scritto a mano; gli altri 5 li
  bozza un modello dal brief degli scenari di test (`eval/brief.md`), con il controllo di coerenza. Così il
  pilota stima soffitto e varianza su scenari fatti come quelli di test, e il brief si collauda prima che conti.
- *Test:* almeno 16 scenari (il numero finale lo decide la simulazione di potenza, § 6), **bozzati da un
  modello** da un brief fisso con requisiti di struttura. Il generatore ne controlla la coerenza da solo;
  l'autore legge solo il rapporto di coerenza, non le domande. Un revisore con contesto pulito ne controlla 4
  a caso con criteri scritti: si risponde in entrambe le condizioni? Le domande usano vocabolario di ariadne?
  Si congelano prima di ogni prova.
  - *Perché bozzati da un modello:* uno scenario scritto da chi ha fatto ariadne tende a chiedere ciò che
    ariadne sa già rispondere (§ 12). L'autore scrive il brief: è un'influenza residua, e si dichiara.
  - *Alternativa scartata:* scenari scritti tutti dall'autore. Più controllo, ma più distorsione.

**Contenuto minimo di ogni scenario:**

- un piano e chiusure con commit e file;
- una deviazione, un rinvio e una decisione sostituita;
- una scelta il cui perché sta solo in un documento;
- distrattori (P23).

Ogni passo ha almeno un file suo, non condiviso con altri passi, così il compito Continua si può valutare.

**Le due condizioni dallo stesso scenario (P6), entrambe al loro meglio in E1:**

- *ariadne:* il generatore applica gli eventi con la CLI vera (`plan`, `close`, `add detour`, `defer`,
  `replace`, commit con `Thread:`). Cosa finisce in ogni nodo (rilievo M5 della revisione 2):
  - il titolo;
  - l'esito (`what`), che è la prima riga del messaggio del commit di chiusura;
  - il campo `why` solo quando lo scenario lo mette nel messaggio di commit, con lo stesso testo;
  - per le scelte il cui perché sta solo in un documento, il nodo ha soltanto una prova `file` che punta alla
    sezione del documento.

  Il grafo non contiene quindi informazioni che *prima* non abbia nei commit o nei documenti.
- *prima:* un modello scrive STATE.md e LOG.md con la skill `handoff` originale, eseguendo un handoff a ogni
  fine milestone e uno alla fine dello scenario, come prescrive la skill. Un secondo modello, che vede gli
  eventi e una checklist scritta prima ma **non** le domande, segnala solo errori di fatto rispetto agli eventi
  («nessuna aggiunta di contenuto, nessuna riscrittura di stile»). Le correzioni si applicano e il diff si registra.
- *Stessi file di progetto:* codice, documenti e messaggi di commit (salvo la riga `Thread:`) sono identici
  nelle due condizioni.

**Domande (P4, P5, P26):** 7 per scenario, una per categoria.

| Categoria | Esempio | Risposta | Grader |
|---|---|---|---|
| Dove | «Su quale passo sei, e qual è il prossimo?» | aperta: due titoli | confronto esatto normalizzato, con alias |
| Perché | «Perché la cache è stata fatta in memoria?» | scelta tra 5 motivi | lettera giusta |
| Prova | «Quale file contiene il risultato del passo X?» | aperta: un percorso | percorso normalizzato |
| Rinvio e deviazione | «Cosa è stato rinviato, e a quale milestone?» | aperta: titolo e milestone | confronto esatto normalizzato, con alias |
| Aggiornamento | «Quale decisione vale oggi su E?» | aperta: titolo | confronto esatto normalizzato, con alias |
| Astensione | domanda su qualcosa mai avvenuto | aperta | giusta solo «non risulta» |
| Continua | «Riprendi il lavoro: fai la prima modifica che faresti.» | azione | regola su file modificati (sotto) |

Come funzionano le risposte e i voti:

- *Risposta aperta dove si può (rilievo M2):* la scelta multipla trasformerebbe il ricordo in riconoscimento
  e alzerebbe il soffitto per entrambe le condizioni. Resta solo per Perché, dove una risposta libera
  richiederebbe un giudice LLM.
  - Le 5 opzioni di Perché sono identiche nelle due condizioni: 1 motivo vero; 3 motivi di passi dal titolo
    simile nello stesso scenario; «non risulta». L'ordine si mescola a ogni prova con un seed. Per caso si
    indovina il 20%, e si riporta.
- *Normalizzazione:* minuscole, spazi e punteggiatura uniformati, articoli tolti.
  - Gli alias di ogni risposta (per esempio «cache in memoria» per «Cache in memoria del parser») li scrive il
    generatore dallo scenario, prima delle prove.
  - Le risposte che il grader non riconosce vanno in un elenco che un revisore etichetta senza sapere la
    condizione. Si riporta quante sono e come cambiano il risultato.
- *Chiave neutrale (bloccante 1 della revisione 1):* titoli e percorsi sono gli stessi nelle due condizioni;
  nessuna domanda chiede id di nodo o sha.
- *Continua, regola deterministica (rilievo M4):* il grader confronta i file modificati nella copia.
  - Insieme vuoto: sbagliata.
  - Giusta se l'insieme comprende almeno un file del prossimo passo vero **e** nessun file di passi rinviati,
    sostituiti o già fatti.
  - I file nuovi contano solo se stanno nella cartella del prossimo passo.
  - Continua non entra in H1a: è un esito sul comportamento, analizzato a parte (H3).
- *Mappa delle evidenze (rilievo M3):*
  - Per *ariadne* la scrive il generatore.
  - Per *prima* la calcola un controllo per stringa: cerca titoli, percorsi e motivi in STATE.md, LOG.md,
    messaggi di commit e documenti.
  - Si dichiara quante risposte di *prima* stanno **solo** in git o nei documenti.
  - Una domanda senza risposta in una condizione si scarta.
- *Parafrasi (P26):* ogni domanda ha una parafrasi, scritta da un modello e congelata.

## 6. Esperimento E1 — la ripresa dell'agente (D1)

**Soggetto e configurazione (P21).** Ogni prova lancia, nella copia temporanea del progetto finto e con
lo stdin chiuso:

```
claude -p "<domanda>" --model <id> --effort medium --restricted
  --tools "Read,Grep,Glob,Bash[,Edit,Write]" --settings <condizione>.json
  --permission-mode <modo> --strict-mcp-config --disable-slash-commands
  --no-session-persistence --output-format stream-json --verbose
  --append-system-prompt "<istruzioni della condizione>"
```

- `--restricted` confina i tool sui file alla cartella di lavoro e ignora i file di impostazioni dell'utente.
- `Edit` e `Write` ci sono solo nelle prove di Continua; il permission mode accetta le modifiche dentro la copia.
- `--effort medium` è il valore fissato per tutte le prove; si riconsidera solo nel pilota.
- *Verificato il 2026-11-14 con Haiku:*
  - con `--tools` esplicito, Bash esegue i comandi ammessi;
  - un `git -C <percorso assoluto>` viene negato;
  - il testo dell'hook `SessionStart` compare nel flusso come `hook_response` e il modello lo vede;
  - in modalità `--restricted` il CLAUDE.md globale dell'utente non arriva al modello (contesto di ~2.600 token,
    nessuna traccia delle sue istruzioni);
  - una HOME temporanea non è praticabile, perché toglie il login;
  - in modalità `--restricted` non arriva nemmeno il CLAUDE.md del progetto, neanche con `--add-dir`; arriva
    il testo passato con `--append-system-prompt` (prova con una parola segreta, passo `m4.4.2`).
- `--settings` dà a ogni condizione i suoi hook e i comandi Bash ammessi:
  - in entrambe `git log`, `git show` e `git diff`, senza percorsi assoluti né `--no-index` (rilievo m5);
  - in *ariadne* anche `node .ariadne/cli/bin/ariadne.mjs show|why|log`: il generatore copia la CLI in
    `.ariadne/cli/`, fuori dai file di progetto;
  - ogni altro comando è negato, salvo i comandi di sola lettura che Claude Code ammette da sé dentro la
    cartella di lavoro (come `ls`): non escono dalla copia, e la prova canarino del 2026-11-14 lo conferma
    (`cat` con percorso assoluto o relativo, Read e `git -C` fuori dalla copia: tutti negati).
- `--no-session-persistence` non lascia trascrizioni che una prova successiva potrebbe leggere.
- Il runner scarta e riporta ogni prova in cui un tool riceve un percorso fuori dalla copia.
- Il pilota ripete la **prova canarino**: un file con una parola segreta messo fuori dalla copia, che il
  soggetto non deve poter citare.
- Tempo massimo per prova: 300 s.

**Cosa riceve all'avvio, e la verifica (P25, rilievi m1 e m6).**

- In *prima* l'hook `SessionStart` inietta STATE.md: una volta.
- In *ariadne* gli hook iniettano il riassunto all'avvio e al prompt: due volte, come nell'uso vero con un
  solo prompt.
- Il runner cerca il testo iniettato negli eventi `hook_response` del flusso; una prova senza lo scarta e la riporta.
  L'hook al prompt non lascia eventi nel flusso: ogni hook copia il suo output in un file della prova, fuori
  dalla copia, e il runner controlla che non sia vuoto.

**Prompt della prova.** Lo stesso modello di testo nelle due condizioni, committato con la pre-registrazione:
la domanda, poi «Nell'ultima riga scrivi `RISPOSTA: <risposta>`; se il progetto non contiene la risposta,
scrivi `RISPOSTA: non risulta`».

- Per Perché la risposta è la lettera dell'opzione; per Continua non si chiede la riga, conta l'azione.
- *Fuori formato:* manca la riga `RISPOSTA:`, oppure ce n'è più d'una con contenuti diversi.
- Per Astensione è giusta solo `non risulta`; le altre formule («nessuna traccia») vanno nell'elenco delle
  risposte non riconosciute (§ 5).

**Istruzioni di condizione** (il «CLAUDE.md di condizione» della versione 3): lo stesso modello di testo, con
lunghezza entro ±10%, che dice solo dove sta il filo e come consultarlo.

- *Come arrivano (cambiato il 2026-11-14, passo `m4.4.2`):* con `--append-system-prompt`, lo stesso
  meccanismo nelle due condizioni, perché `--restricted` non carica il CLAUDE.md del progetto. Nell'uso vero
  arrivano come CLAUDE.md: la differenza vale per entrambe le condizioni e si dichiara.

- In *prima*: «STATE.md e LOG.md; per il perché, i messaggi di commit e i documenti».
- In *ariadne*: «il grafo in `.ariadne/`; per il perché, `ariadne why`».
- Il testo esatto si committa con la pre-registrazione; il suggerimento sui comandi fa parte del trattamento
  e si dichiara.

**Modelli:** Opus 5.5, quello che l'utente usa, come soggetto principale, se il budget dopo il pilota lo
consente; altrimenti Sonnet 5.5. La scelta si committa prima di toccare il set di test. Haiku 5.5 come
analisi secondaria.

**Ripetizioni:** 3 per domanda e condizione sulla formulazione originale, più 3 sulla parafrasi (rilievo P26
della revisione 2: una sola ripetizione non separa la formulazione dal rumore).

- 3 è il minimo per pass^3 e la scelta di partenza.
- *Alternativa scartata:* 5 ripetizioni, che danno una stima di pass^k più stabile ma costano il 67% in più.
  La simulazione del pilota può alzare il numero.

**Ordine (P24):** tutte le prove in un ordine casuale con seed, con le condizioni interlacciate.

**Prove fallite (P24):**

- Una risposta fuori formato conta come sbagliata e si conta a parte.
- Timeout ed errori dell'API si riprovano fino a 2 volte, poi la prova si esclude.
- pass^3 di una domanda si calcola sulle ripetizioni valide se sono almeno 2; altrimenti la domanda si
  esclude da H1b in entrambe le condizioni.
- Le esclusioni si riportano per condizione.

**Ipotesi e analisi pre-registrate (P8, P9, P10).** Unità: la singola prova sulla formulazione originale;
cluster: lo scenario.

- **H1a (primaria):** la probabilità di risposta giusta, sulle sei categorie a domanda, è più alta in *ariadne*.
  - Analisi: GEE logistico con la condizione come effetto, correlazione scambiabile dentro lo scenario, errore
    standard corretto per pochi cluster (`cov_type="bias_reduced"`, Mancl-DeRouen) e intervallo con t a
    (scenari − 1) gradi di libertà (rilievo M6).
  - Si riporta la differenza di probabilità con intervallo al 95%.
  - *Sensibilità:* bootstrap wild per cluster; modello misto con effetti casuali di scenario e domanda.
- **H1b (co-primaria):** la quota di domande giuste in tutte le ripetizioni (pass^3) è più alta in *ariadne*.
  Differenza appaiata con intervallo bootstrap per cluster (scenari ricampionati).
- **H2:** i token per prova differiscono tra le condizioni, a due code.
  - Wilcoxon appaiato sulle mediane **per scenario**, così i cluster restano indipendenti (rilievo m3).
  - Token = ingresso + scrittura in cache + lettura dalla cache + uscita, contati come se nulla fosse in
    cache: l'ordine delle prove non deve cambiare il conteggio. Il costo reale in $ si riporta a parte.
- **H3 (secondaria):** quota di Continua giusti per condizione, con intervallo bootstrap per cluster.
- **Correzione:** Holm sulla famiglia {H1a, H1b, H2}. Haiku, E1b, H3, categorie e parafrasi sono analisi
  secondarie, riportate senza dichiarare significatività.
- **Equivalenza (P9):** per dire che in una categoria le condizioni sono pari serve un TOST con margine di ±10
  punti percentuali, fissato ora; altrimenti si dice «non determinato».

**Costo per sessione (rilievo 6 della revisione 1).** Nell'uso vero ariadne inietta il riassunto a ogni prompt,
*prima* inietta STATE.md una volta sola.

- Con le dimensioni misurate e N = prompt mediani per sessione da E4 (che gira prima della pre-registrazione,
  rilievo M7), si calcola il costo di una sessione e il numero di prompt oltre il quale ariadne costa più di *prima*.
- Si riporta accanto ad H2.

**Pilota (rilievo 10 della revisione 1, rilievo m2 della revisione 2).**

- *Su cosa:* tutti e 6 gli scenari di sviluppo, 2 ripetizioni, entrambe le condizioni, Opus e Sonnet.
- *Cosa stima:* costo per prova, varianza, correlazione dentro lo scenario, quota di discordanti, soffitto,
  risposte non riconosciute dal grader, prova canarino.
- *Regola del soffitto:* se entrambe le condizioni superano il 90%, si allungano gli scenari e si aggiungono
  distrattori prima di congelare il set di test.
- *Potenza:* si calcola per simulazione dalle stime del pilota. Fissa il numero di scenari di test (minimo 16)
  e di ripetizioni, per una potenza ≥ 0,8 su una differenza di 15 punti percentuali, oppure dichiara quella
  raggiungibile con il budget.
  - *Alternativa scartata:* fissare ora 16 scenari. Senza la correlazione dentro lo scenario non si sa se bastano.
- Ogni modifica a questo piano dopo il pilota si data e si committa prima di toccare il set di test.

**E1b, il filo che resta indietro (secondaria).** Nella realtà STATE.md si aggiorna a fine milestone e il grafo
a ogni commit, ma anche il grafo perde dei commit (quelli senza `Thread:`).

- Stessi scenari di test e stesse domande, 3 ripetizioni sulla formulazione originale, con il modello
  principale di E1: 16 × 7 × 2 × 3 = 672 prove, metà di E1 (§ 11).
- STATE.md riflette solo l'ultimo handoff di fine milestone, come prescrive la skill.
- Il grafo perde una quota di chiusure pari al tasso di commit senza `Thread:` misurato in E4, scelte con un
  seed fisso.
- Le due degradazioni sono realistiche ciascuna per la sua condizione, e si dichiarano.

## 7. Esperimento E2 — l'osservatore (D3)

**Fixture (P12, P13).** Unità di misura: il checkpoint (rilievo B2). 40 checkpoint presi dagli scenari di test.
Per ognuno, una **trascrizione congelata** della sessione fino al checkpoint, generata dagli eventi da un
modello (rilievo M1), il cui ultimo turno è il lavoro del checkpoint. Il grafo di ogni checkpoint esiste in 5
versioni:

- F0: senza errori;
- F1: un passo segnato fatto ma non fatto;
- F2: un lavoro fatto ma assente;
- F3: una deviazione non registrata;
- F4: il nodo corrente sbagliato.

Un test verifica che ogni versione passi `ariadne validate` e che differisca da F0 solo nei campi voluti: è il
controllo che nessun marcatore riveli l'errore.

**Casi naturali:** le incoerenze vere di questo progetto, etichettate prima di lanciare le prove e congelate
dall'archivio. Per esempio il passo lasciato aperto il 2026-11-14 da tre commit con il trailer `Thread:` non letto.

**Varianti, in ordine di costo:**

- A: Haiku legge l'ultimo turno e il grafo;
- B: Haiku legge l'intera trascrizione e il grafo;
- C: Opus legge l'intera trascrizione e il grafo (il fork).

Tutte girano sulle stesse fixture, con 3 ripetizioni (P3). A e B girano sempre; C gira solo se né A né B
rispettano la regola: è il ripiego costoso, e così le varianti restano confrontabili sulle stesse fixture.

**Grader:**

- L'osservatore risponde con un elenco di allarmi `{titolo del passo, tipo}`.
- Un errore conta come trovato in un checkpoint se un allarme nomina il passo dell'errore e il tipo giusto in
  almeno 2 ripetizioni su 3.
- Un falso allarme su F0 conta se compare in almeno 2 ripetizioni su 3.
- Il passo giusto con il tipo sbagliato si riporta a parte.

**Metriche:** recall per tipo di errore e complessivo, precision, falsi allarmi su F0, costo e durata per
checkpoint.

**Regola di decisione (pre-registrata).** Si adotta la variante più economica in cui:

- il limite inferiore dell'intervallo al 95% del recall complessivo (160 errori) è ≥ 0,6;
- il limite superiore dei falsi allarmi su F0 (40 checkpoint) è ≤ 0,15.

*Come si calcolano i limiti:* i 160 errori stanno 4 per checkpoint e i checkpoint stanno in pochi scenari,
quindi non sono indipendenti. I limiti della regola si calcolano con un bootstrap per scenario, che ricampiona
insieme gli scenari con i loro checkpoint ed errori. Wilson, che assume l'indipendenza, si usa solo per la
verifica di raggiungibilità qui sotto.

*Verifica di raggiungibilità (rilievo B2), nel caso ottimistico di prove indipendenti:*

- con 40 F0 e 0 falsi allarmi il limite superiore è ~0,09, con 1 è ~0,13, con 2 è ~0,17. La soglia richiede
  quindi al più 1 falso allarme su 40;
- con 160 errori serve un recall osservato di circa il 68%;
- con la correlazione dentro lo scenario l'intervallo si allarga e serve un recall osservato più alto: il
  pilota stima di quanto, e il valore si scrive prima di toccare il set di test.

Le soglie sono **di prodotto**, scelte da noi e senza fonte:

- oltre il 15% di falsi allarmi, un allarme falso ogni 6–7 checkpoint, e la persona smette di leggere la banda;
- un recall di 0,6 supera il 55% di ConStory-Checker, un rilevatore di incoerenze nei racconti (M § 2).

Se nessuna variante passa, l'osservatore resta fuori e il rapporto lo dice (P20). La stessa misura sceglie il
modello dello scribe.

## 8. Esperimento E3 — la persona (D2)

**Parole.**

- *Disegno a caso singolo (SCED):* un solo soggetto provato più volte in condizioni alternate, con l'analisi
  sull'andamento delle sue prove. La variante *a trattamenti alternati* alterna le condizioni a caso tra
  sessioni. Il resoconto segue le linee guida **SCRIBE 2016** (U § 1).
- *Test di randomizzazione:* confronta il risultato con tutti gli ordini casuali possibili delle condizioni;
  con 4 sessioni per condizione il p minimo è 1/70 ≈ 0,014.
- *SEQ:* una domanda dopo ogni compito, «quanto è stato facile?», da 1 a 7.
- *NASA-TLX:* un questionario sul carico di lavoro con 6 scale; usiamo solo la scala *Mental Demand*, il carico
  mentale, da 0 a 100.
- *UX-Lite:* due domande (utilità e facilità) a fine serie.
- *KLM:* stima del tempo di un esperto contando le azioni elementari (tasti, puntamenti, pause mentali).

**Disegno (P14, P27, P28).** First-person, con l'autore come utente, in disegno a caso singolo con trattamenti
alternati.

- 8 sessioni, 4 per condizione, in ordine casuale con seed; una sessione ogni giorno o due.
- Ogni sessione usa uno scenario diverso, preso da un set E3 bozzato da un modello e non letto dall'autore.
  Gli scenari hanno **struttura equivalente** (stessa lunghezza e stesse categorie di eventi) e contenuti
  diversi (rilievo m8).
- In ogni sessione si svolgono tutti e 4 i compiti, così ogni compito ha 4 prove per condizione.

**Compiti, con l'equivalente nelle due condizioni:**

| Compito | *prima* | *ariadne* |
|---|---|---|
| T1 Dove sei e cosa viene dopo | STATE.md | banda o riassunto |
| T2 Perché una decisione | git, documenti | viewer o `why` |
| T3 Dove sta il risultato di un passo | git, documenti | viewer, prove |
| T4 Cosa è cambiato mentre eri via | LOG.md, `git log` | coda della banda e `ariadne log` |

**Misure:** tempo e correttezza per compito (chiave scritta prima); SEQ e Mental Demand per compito; UX-Lite
alla fine di ogni condizione.

**Analisi:**

- *Primaria:* un solo test di randomizzazione per trattamenti alternati sul tempo totale della sessione
  (somma dei 4 compiti), a una coda a favore di ariadne.
- *Secondarie:* grafici e test di randomizzazione per compito, riportati senza dichiarare significatività.
- *Perché un solo test:* con 4 sessioni per condizione il p minimo è 0,014. Holm sui 4 compiti chiederebbe
  p < 0,0125 al primo, cioè un risultato impossibile; 4 test senza correzione, invece, salverebbero l'ipotesi per
  caso circa una volta su cinque.

**Criteri di falsificazione, scritti ora (P28, rilievo m7).** L'ipotesi «ariadne aiuta la persona» è smentita se:

- il test primario sul tempo totale dà p ≥ 0,05, **oppure**
- in un qualsiasi compito la correttezza con ariadne è più bassa di almeno 2 prove su 4.

**Senza utenti, come ipotesi (P16):**

- KLM su tutti i compiti nelle due condizioni;
- valutazione euristica di banda e viewer da parte di un revisore LLM su screenshot, confermata dall'utente.

**Diario d'uso:** una voce per ogni sessione lunga di lavoro vero, con il passo di interpretazione (cosa mi
aspettavo, cosa è successo, cosa cambia) (P14).

**Gruppo esterno:** 3–5 sviluppatori, solo per trovare problemi (P15), dopo che ariadne è installabile (M5, la
milestone di pubblicazione).

## 9. Descrizione E4 — fedeltà nel progetto vero

Descrittiva: nessuna causa si deduce da qui. Gira **prima** della pre-registrazione, perché E1b e il costo per
sessione ne usano i numeri (rilievo M7). Sull'archivio congelato di questo repo si contano:

- quante volte STATE.md è rimasto indietro rispetto ai commit;
- la quota di commit senza `Thread:`;
- i nodi chiusi con solo un messaggio come prova;
- i riferimenti a file rotti;
- il numero mediano di prompt per sessione, dalle trascrizioni dell'utente, contato una volta e congelato come
  numero.

## 10. Confronto con i concorrenti (D4)

I concorrenti sono gli strumenti trovati dalla ricerca (`docs/research.md` § 7.1): Beads, Task Master, Spec Kit,
Backlog.md, CCPM, Claude Code Tasks e il server MCP memory.

**Criteri (P17):**

- Un modello terzo, che non ha scritto ariadne né questo piano, estrae i criteri dalla documentazione dei
  concorrenti e da quella di ariadne, con un modello di scheda fisso.
- Si aggiungono le 16 Cognitive Dimensions di Green e Petre, cioè proprietà di una notazione come visibilità,
  viscosità e impegno prematuro.
- Si aggiungono criteri in cui ariadne perde: maturità, comunità, lavoro con più agenti, integrazione con le
  issue, installazione.
- I criteri si committano prima delle schede. `docs/research.md` non è una fonte di criteri, perché è stato
  scritto per motivare ariadne.

**Schede anonime:** lo stesso modello terzo scrive una scheda per strumento con il modello fisso, dai soli
documenti pubblici, con i nomi sostituiti da lettere.

- *Prova di riconoscibilità:* un giudice deve indovinare quale scheda è ariadne. Se ci riesce più che per caso,
  il cieco è fallito e si dichiara.

**Giudizio:** due giudici di famiglie diverse da Claude (per esempio GPT tramite Codex), per ridurre
l'auto-preferenza. Validazione umana (rilievo M8):

- l'utente etichetta 50 giudizi prima di vedere quelli dei modelli;
- si riporta il kappa tra ogni giudice e l'utente;
- l'utente riconosce ariadne nelle schede, e il bias si dichiara;
- se si trova una seconda persona, etichetta gli stessi 50 giudizi e si riporta anche il suo kappa.

**Numeri dei concorrenti:** citati come dichiarazioni, mai come baseline (P18).

**Esplorativo:** se resta budget, Beads o Backlog.md come terza condizione di E1 su 2 scenari, con la
mappatura dichiarata.

## 11. Costi e approvazioni

| Voce | Stima di partenza | Quando si decide |
|---|---|---|
| Pilota E1 ed E2 | ~25–45 $ | si parte dopo l'approvazione di questo piano |
| E1, modello principale | Opus ~120–240 $; Sonnet circa un terzo | dopo il pilota, con l'approvazione dell'utente |
| E1b, modello principale | Opus ~60–120 $; Sonnet circa un terzo | idem |
| E1, Haiku | ~5 $ | idem |
| E2, A e B | ~15 $; C ~60–120 $ solo se serve | idem |
| D4, giudici | ~2 $ | idem |

Il calcolo, da verificare nel pilota, parte da ~0,09–0,18 $ per prova su Opus:

- E1: 16 scenari × 7 domande × 2 condizioni × 6 ripetizioni (3 originali + 3 parafrasi) = 1.344 prove;
- E1b: 16 × 7 × 2 × 3 = 672 prove;
- pilota E1: 6 × 7 × 2 × 2 ripetizioni × 2 modelli = 336 prove, 168 su Opus (~15–30 $) e 168 su Sonnet
  (~5–10 $); il pilota di E2 su Haiku aggiunge pochi dollari.

I prezzi sono di listino; con l'abbonamento si consuma quota, non denaro.

## 12. Minacce alla validità (P19)

| Esperimento | Minaccia | Cosa facciamo |
|---|---|---|
| E1 | baseline di comodo | skill `handoff` originale, handoff a ogni milestone, correzione di soli fatti da chi non vede le domande, diff registrato |
| E1 | grafo più ricco di *prima* | il generatore copia nei nodi solo ciò che sta nei commit; i perché dei documenti restano nei documenti |
| E1 | scenari di parte | scenari di test bozzati da un modello; l'autore scrive solo il brief e non legge le domande; controllo di 4 scenari da parte di un revisore |
| E1 | chiave di parte | titoli e percorsi comuni; mappa delle evidenze verificata in entrambe |
| E1 | contaminazione | copia isolata, `--restricted`, comandi ammessi, nessuna persistenza, controllo dei percorsi, prova canarino |
| E1 | trattamento non avvenuto | testo iniettato cercato nel flusso |
| E1 | istruzioni diverse | CLAUDE.md di pari lunghezza, testo pre-registrato, suggerimento sui comandi dichiarato |
| E1 | costo per prompt nascosto | costo per sessione di N prompt accanto ad H2 |
| E1 | soffitto | risposte aperte, distrattori, compito Continua, regola del pilota |
| E1 | adattamento agli scenari | set di test separato, usato una volta per sha |
| E1 | grader troppo rigido | alias, elenco delle risposte non riconosciute etichettato alla cieca |
| E1 | formulazione | parafrasi con 3 ripetizioni |
| E1 | lunghezza | pochi scenari per lunghezza: andamento descrittivo, non un test |
| E2 | errori sintetici | casi naturali; test contro i marcatori |
| E2 | trascrizioni sintetiche | stesse trascrizioni per tutte le varianti; limite dichiarato |
| E2 | errori non indipendenti | limiti della regola con bootstrap per scenario |
| E3 | test multipli sui compiti | un solo test primario sul tempo totale; compiti secondari |
| E3 | autore = utente | dichiarato; scenari non letti; criteri di falsificazione; gruppo esterno in seguito |
| E3 | apprendimento tra sessioni | ordine casuale; scenari sempre nuovi ma equivalenti |
| E4 | un solo progetto, un solo utente | solo descrittivo; nessuna conclusione causale |
| D4 | criteri e giudici di parte | criteri e schede da un modello terzo, prova di riconoscibilità, kappa con l'utente su 50 giudizi |

## 13. Risposta alla revisione 1

| Rilievo | Gravità | Dove si risolve |
|---|---|---|
| 1 chiave nel vocabolario di ariadne | bloccante | § 5: titoli e percorsi comuni, niente id né sha, mappa delle evidenze per entrambe |
| 2 «Perché» senza grader | bloccante | § 5: scelta tra 5 motivi; giudice LLM scartato con motivo |
| 3 ground truth raggiungibile | bloccante | § 4, § 6: copia temporanea, `--restricted`, comandi ammessi, prova canarino; P21 |
| 4 set di sviluppo | maggiore | § 5 due set; P22 |
| 5 idealizzazione diversa | maggiore | § 5: entrambe al meglio, contenuto dei nodi specificato; E1b entrambe degradate |
| 6 costo per prompt | maggiore | § 6 costo per sessione; verifica dell'iniezione nel flusso |
| 7 configurazione | maggiore | § 6 comando completo, effort, permission mode, impostazioni, CLAUDE.md |
| 8 costrutto e soffitto | maggiore | § 5 risposte aperte, Continua deterministico, distrattori; § 6 regola del soffitto |
| 9 statistica | maggiore | § 6 GEE con correzione per pochi cluster, pass^3 co-primaria, potenza per simulazione |
| 10 pilota | maggiore | § 6 pilota su 6 scenari, 2 ripetizioni, modifiche datate |
| 11 regole mancanti | maggiore | § 6 prove fallite, pass^3 con esclusioni, code di H2, token, famiglia di Holm, ordine casuale |
| 12 E2 | maggiore | § 7 stesse fixture, trascrizioni, 3 ripetizioni, regola raggiungibile, grader, test contro i marcatori |
| 13 E3 | maggiore | § 8 SCED a trattamenti alternati, 4 per condizione, scenari non letti, falsificazione |
| 14 D4 | maggiore | § 10 modello terzo, riconoscibilità, 50 etichette |
| 15 ripetibilità | maggiore | § 4 cosa si fissa; generato e congelato |
| 16 E1b | minore | § 6 ritardi realistici per entrambe, seed |
| 17 minacce mancanti | minore | § 12 una riga per esperimento |
| 18 lunghezza e alternative | minore | § 12 lunghezza descrittiva; alternative scartate in § 4, 5, 6 |
| 19 concetti prima dell'uso | minore | § 1 e § 3 |

## 14. Risposta alla revisione 2

| Rilievo | Gravità | Dove si risolve |
|---|---|---|
| B1 Bash tolto da `--restricted`, CLAUDE.md dell'utente | bloccante | § 6: `--tools` esplicito, permission mode; verificato che Bash funziona, che i percorsi assoluti sono negati e che il CLAUDE.md globale non arriva |
| B2 soglia di E2 irraggiungibile | bloccante | § 7: 40 checkpoint, unità = checkpoint, verifica di raggiungibilità scritta |
| M1 ingresso di B e C | maggiore | § 7 trascrizioni congelate per checkpoint |
| M2 la scelta multipla alza il soffitto | maggiore | § 5 risposte aperte, scelta solo per Perché |
| M3 mappa di *prima* | maggiore | § 5 controllo per stringa, dichiarate le risposte solo in git |
| M4 Continua non deterministico | maggiore | § 5 regola scritta, file distinti per passo, H3 a parte |
| M5 perché nel grafo | maggiore | § 5 contenuto dei nodi |
| M6 GEE con pochi cluster | maggiore | § 6 Mancl-DeRouen, t a (scenari − 1) gradi di libertà, bootstrap wild |
| M7 E4 dopo la pre-registrazione | maggiore | § 9 e § 15: E4 prima |
| M8 etichette per D4 | maggiore | § 10 50 etichette, bias dichiarato, seconda persona se c'è |
| m1 iniezioni in `-p` | minore | § 6: una in *prima*, due in *ariadne* |
| m2 pilota e ripetizioni | minore | § 6 pilota su 6 scenari; la simulazione fissa scenari e ripetizioni |
| m3 Wilcoxon e cluster | minore | § 6 mediane per scenario |
| m4 caso al 20% | minore | § 5: scelta solo per Perché, 5 opzioni |
| m5 `--no-index` e percorsi assoluti | minore | § 6 negati, verificato |
| m6 iniezione nel contesto | minore | § 6 testo cercato in `hook_response` |
| m7 falsificazione di E3 | minore | § 8 tutti e 4 i compiti, legata al test di randomizzazione |
| m8 struttura degli scenari di E3 | minore | § 8 struttura equivalente, contenuti diversi |
| Chiarezza | minore | § 1 hook, skill, milestone, `validate`; § 3 termini statistici; § 8 SCRIBE e NASA-TLX; § 10 concorrenti |

## 15. Procedura (passo `m4.4`)

1. In ariadne: la variabile `ARIADNE_NOW` per l'orologio finto, con il suo test.
2. Creare `eval/` con il suo `.gitignore`; scrivere generatore, runner, grader e test dei grader.
3. E4 sull'archivio congelato: tassi e N, committati.
4. Scrivere i 6 scenari di sviluppo; generare; scrivere e correggere *prima*; generare le trascrizioni dei
   checkpoint di sviluppo per il pilota di E2.
5. Pilota E1 ed E2, con la prova canarino; potenza per simulazione; modifiche datate a questo piano.
6. Bozzare e congelare gli scenari di test, quelli di E3 e le trascrizioni di E2; controllo del revisore su 4 scenari.
7. **Commit di pre-registrazione:** piano, hash delle fixture, sha di ariadne, modelli, testi delle condizioni,
   numeri di E4.
8. **Approvazione del budget da parte dell'utente.**
9. E1, E1b, E2; analisi.
10. E3 con l'utente nelle settimane seguenti; KLM; valutazione euristica.
11. D4.
12. `rapporto.md`: risultati, risultati negativi, cosa migliorare, numeri accanto ai limiti.
