# Piano di valutazione

*Versione 2 del 2026-11-14 (passo `m4.3.5`), riscritta dopo la revisione indipendente
(`revisione-1.md`). Si giudica contro `principi.md` (P1–P28); le fonti sono in `ricerca-metodi.md` (M)
e `ricerca-usabilita.md` (U). La § 13 risponde a ogni rilievo.*

## 1. Cos'è ariadne, in breve

Le parole del prodotto, nell'ordine in cui servono:

- **Sessione:** una conversazione con l'agente di coding (Claude Code). Diventa lunga quando il contesto si
  riempie; `/clear` la azzera e l'agente riparte senza memoria.
- **Checkpoint:** un momento in cui il lavoro si consolida: un commit, un passo chiuso, un cambio di
  argomento.
- **Prima:** il modo di tenere il filo che ariadne sostituisce. `STATE.md` (≤ 60 righe: milestone, prossimi
  passi, decisioni aperte, puntatori) si riscrive a fine milestone con la skill `handoff` ed è iniettato
  nel contesto all'avvio della sessione; `LOG.md` ha una riga per milestone. Il perché delle scelte sta nei
  messaggi di commit e nei documenti.
- **Grafo:** il cuore di ariadne. Un file con un **nodo** per riga; un nodo è un passo di lavoro con uno
  **stato** (`todo` da fare, `active` in corso, `done` fatto, `deferred` rinviato, `replaced` sostituito da
  un altro), un perché e delle **prove** (il commit, il file o il messaggio che lo dimostrano). Una
  **deviazione** è un nodo fuori piano che dice dove si rientra.
- **Trailer `Thread:`:** una riga nel messaggio di commit (`Thread: <id> done: <esito>`) che un hook legge per
  aggiornare il grafo da solo a ogni commit.
- **Riassunto:** ~240 token calcolati dal grafo (dove sei, da dove vieni, cosa viene dopo, file utili),
  iniettati nel contesto a ogni prompt.
- **CLI:** `ariadne show <id>` e `why <id>` mostrano un nodo e la catena dei suoi perché.
- **Banda:** 2–4 righe sopra il prompt nel terminale (dove sei, cosa aspetta una tua conferma, l'ultimo esito).
  La **coda** sono le modifiche fatte dall'agente da solo che aspettano la tua conferma.
- **Viewer:** il grafo disegnato nel browser; hover = una frase, clic = perché e prove.
- **Osservatore:** un modello che a ogni checkpoint confronta il lavoro appena fatto con il grafo e segnala
  nella banda dove si contraddicono. Non scrive mai nel grafo. Si può far girare sul solo turno, oppure
  come **fork**, cioè una copia dell'intera sessione.
- **Scribe:** un modello (ancora da costruire, `m4.2`) che traduce una nota dell'agente in operazioni sul
  grafo. Il suo modello si sceglie con la misura dell'osservatore.

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

Le parole di `principi.md` valgono anche qui (soggetto, condizione, fixture, ground truth, grader, prova
appaiata, ripetizione, pass^k, discordante, kappa, cluster, set di sviluppo e di test, errore iniettato,
pre-registrazione). In più:

- **Scenario:** la storia di un progetto finto, scritta come lista di **eventi** («piano approvato con i
  passi A, B, C», «A chiuso dal commit che tocca `src/a.js`», «deviazione D», «C rinviato», «decisione E
  sostituita da F»). È la fonte unica di verità da cui nasce tutto il resto.
- **Distrattore:** materiale dello scenario non pertinente o superato (un documento vecchio, un commit di
  manutenzione), messo apposta perché trovare la risposta richieda di scegliere.
- **Generatore:** lo script che da uno scenario produce sempre gli stessi byte: il repository git del
  progetto finto, i file di ciascuna condizione, le domande con le opzioni e la **mappa delle evidenze**
  (dove sta ogni risposta in ciascuna condizione).
- **Prova di ripresa:** un soggetto apre una copia isolata del progetto finto a contesto vuoto, riceve ciò
  che la sua condizione inietta all'avvio, e risponde a una domanda o compie un'azione.
- **Pilota:** prove sul set di sviluppo per stimare costo, varianza e difficoltà; non entrano nei risultati.

## 4. Dove vive la valutazione e con cosa

**Scelta:** un repository separato, `~/Sviluppo/Personal/ariadne-eval`, locale e senza remote: scenari,
generatore, runner, grader, analisi, uscite grezze. Il rapporto finale torna qui in `docs/valutazione/rapporto.md`.

- *Perché separato:* i progetti finti sono repository git e non devono finire annidati in quello del
  prodotto; la storia della valutazione non muove quella di ariadne. Era la richiesta dell'utente.
- *Alternativa scartata:* una cartella `eval/` in questo repo, più comoda ma con repository annidati e
  commit di valutazione nella storia del prodotto.
- *Isolamento:* le fixture si generano in una cartella temporanea per ogni prova, mai dentro
  `ariadne-eval` (P21, § 6).

**Strumenti:** runner in Node senza dipendenze, che lancia `claude -p` come sottoprocesso e salva il JSON
grezzo (P2); analisi in Python con `scipy` e `statsmodels` lanciati con `uv` e un lockfile, per non
riscrivere test statistici già verificati.

- *Alternativa scartata:* Inspect AI. Ripetizioni e log nativi, ma il suo valore principale (sandbox, API dei
  modelli) non serve con un soggetto che è una CLI. Si riconsidera se il runner supera ~300 righe.

**Cosa si fissa e si registra (P1, P2):**

- versione della CLI `claude` (oggi 2.1.302), con l'aggiornamento automatico spento durante le prove;
- id completi dei modelli (`claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5`), versioni di Node e di git, lockfile di `uv`;
- `TZ=UTC`, date di commit fisse (`GIT_AUTHOR_DATE`, `GIT_COMMITTER_DATE`), autore git fisso;
- un orologio finto per i campi `at` che la CLI di ariadne scrive. Serve una variabile `ARIADNE_NOW`, da
  aggiungere ad ariadne all'inizio di `m4.4`;
- seed per l'ordine delle prove, il mescolamento delle opzioni e il bootstrap;
- sha di ariadne, e hash della skill `handoff`, degli hook, dei CLAUDE.md di condizione, dei prompt e di ogni fixture.

**Generate e congelate:**

- *Generati* dal generatore, identici a ogni esecuzione: il repository git del progetto finto, il grafo (con la
  CLI vera e l'orologio finto), le domande e la mappa delle evidenze.
- *Congelati una volta*, perché scritti da un modello: STATE.md e LOG.md di *prima*, le parafrasi delle domande,
  i testi dei turni per E2, i casi naturali, gli scenari di test. Si committano con il loro hash.

## 5. Fixture (P4, P6, P22, P23)

**Scenari scritti come dati, non presi dalla storia di questo repo.** Quella storia cambia a ogni commit
(P1) e contiene conversazioni private; serve solo per E4 e per i casi naturali di E2, congelata in un
archivio (`git bundle`) a uno sha fissato.

**Due set (P22):**

- *Sviluppo:* 6 scenari scritti dall'autore (2 brevi da ~15 eventi, 2 medi da ~40, 2 lunghi da ~120),
  usati per costruire l'harness e per il pilota.
- *Test:* 16 scenari (4 brevi, 6 medi, 6 lunghi), **bozzati da un modello** da un brief fisso con requisiti
  di struttura. Il generatore ne controlla la coerenza da solo; l'autore legge solo il rapporto di
  coerenza, non le domande. Un revisore con contesto pulito ne controlla 4 a caso con criteri scritti (si
  risponde in entrambe le condizioni? c'è vocabolario di ariadne nelle opzioni?). Si congelano prima di
  ogni prova.
- *Perché bozzati da un modello:* uno scenario scritto da chi ha fatto ariadne tende a chiedere ciò che
  ariadne sa già rispondere (§ 12).
- *Alternativa scartata:* scenari scritti tutti dall'autore. Più controllo, ma più distorsione.

**Contenuto minimo di ogni scenario:** un piano; chiusure con commit e file; una deviazione; un rinvio; una
decisione sostituita; una scelta il cui perché sta solo in un documento; distrattori (documenti superati,
commit di manutenzione, passi con titoli simili) (P23).

**Le due condizioni dallo stesso scenario (P6), entrambe al loro meglio in E1:**

- *ariadne:* il generatore applica gli eventi con la CLI vera (`plan`, `close`, `add detour`, `defer`,
  `replace`, commit con `Thread:`).
- *prima:* un modello scrive STATE.md e LOG.md con la skill `handoff` originale, eseguendo un handoff a ogni
  fine milestone e uno alla fine dello scenario, come prescrive la skill. Un secondo modello, che vede gli
  eventi e una checklist scritta prima ma **non** le domande, segnala solo errori di fatto rispetto agli
  eventi («nessuna aggiunta di contenuto, nessuna riscrittura di stile»). Le correzioni si applicano e il
  diff si registra.
- *Stessi file di progetto:* codice, documenti e messaggi di commit (salvo la riga `Thread:`) sono identici
  nelle due condizioni.

**Domande (P4, P5, P26):** 7 per scenario, una per categoria, quindi 112 nel set di test.

| Categoria | Esempio | Formato della risposta |
|---|---|---|
| Dove | «Su quale passo sei, e qual è il prossimo?» | scelta tra i titoli dei passi |
| Perché | «Perché la cache è stata fatta in memoria?» | scelta tra 4 motivi (1 vero, 3 plausibili presi dallo scenario) |
| Prova | «Quale file contiene il risultato del passo X?» | scelta tra percorsi |
| Rinvio e deviazione | «Cosa è stato rinviato, e a quando?» | scelta tra coppie passo–milestone |
| Aggiornamento | «Quale decisione vale oggi su E?» | scelta tra le decisioni, compresa quella superata |
| Astensione | domanda su qualcosa mai avvenuto | scelta tra opzioni, una delle quali è «non risulta» |
| Continua | «Riprendi il lavoro: fai la prima modifica che faresti.» | **azione**: il grader controlla quale file è cambiato nella copia |

- *Chiave neutrale (bloccante 1):* le opzioni usano i titoli e i percorsi dello scenario, identici nelle due
  condizioni; nessun id di nodo né sha. Ogni domanda ha anche l'opzione «non risulta». L'ordine delle opzioni
  si mescola a ogni prova con un seed.
- *Perché la scelta multipla (bloccante 2):* un programma può dare il voto, anche per «Perché». Il caso
  rimane al 20% circa (5 opzioni) e si riporta.
- *Alternativa scartata:* risposta libera con un giudice LLM validato con kappa. Più naturale, ma richiede
  50–100 etichette umane prima dei dati e introduce i bias del giudice (P5).
- *Continua* è l'esito sul comportamento (P23): il soggetto ha la scrittura dentro la copia. Va bene se
  modifica il file del prossimo passo vero; sbaglia se tocca il file di un passo rinviato, sostituito o già
  fatto.
- *Mappa delle evidenze:* per ogni domanda il generatore scrive dove sta la risposta in ciascuna condizione;
  un test verifica che ci sia davvero in **entrambe**. Una domanda senza risposta in una condizione si scarta.
- *Parafrasi (P26):* ogni domanda ha una parafrasi, scritta da un modello e congelata.

## 6. Esperimento E1 — la ripresa dell'agente (D1)

**Soggetto e configurazione (P21, punto 7 della revisione).** Ogni prova lancia:

```
claude -p "<domanda>" --restricted --settings <condizione>.json --strict-mcp-config
  --disable-slash-commands --no-session-persistence --model <id> --effort <fisso>
  --output-format stream-json
```

nella copia temporanea del progetto finto.

- `--restricted` confina i tool sui file alla cartella e ignora le impostazioni e il CLAUDE.md dell'utente.
- `--settings` dà a ogni condizione i suoi hook e i comandi ammessi. Sono ammessi `git log`, `git show` e
  `git diff` in entrambe; in *ariadne* anche `node bin/ariadne.mjs show|why|log`. Ogni altro comando è negato.
- `--no-session-persistence` non lascia trascrizioni che una prova successiva potrebbe leggere.
- Il runner controlla nel flusso degli eventi che nessun tool abbia letto fuori dalla copia. Una prova che
  lo fa si scarta e si riporta.
- Tempo massimo per prova: 300 s.

**Cosa riceve all'avvio, e la verifica che sia avvenuto (P25).** In *prima*, un hook `SessionStart` inietta
STATE.md; in *ariadne*, gli hook iniettano il riassunto all'avvio e a ogni prompt. Ogni hook scrive anche ciò
che ha iniettato in un file fuori dalla copia; una prova senza quel file si scarta e si riporta.

**CLAUDE.md di condizione:** lo stesso modello di testo, con lunghezza entro ±10%, che dice solo dove sta
il filo e come consultarlo. In *prima*: «STATE.md e LOG.md; per il perché, i messaggi di commit e i documenti».
In *ariadne*: «il grafo in `.ariadne/`; per il perché, `ariadne why`». Il testo esatto si committa con la
pre-registrazione. Il suggerimento sui comandi fa parte del trattamento e si dichiara.

**Modelli:** Opus 5.5, quello che l'utente usa, come soggetto principale, se il budget dopo il pilota lo
consente; altrimenti Sonnet 5.5, deciso e committato prima di toccare il set di test. Haiku 5.5 come
analisi secondaria.

**Ripetizioni:** 3 per domanda e condizione sulla formulazione originale, più 1 sulla parafrasi (P3, P26).
Prove: 112 × 2 × 4 = 896 per modello principale.

**Ordine (P24):** tutte le prove in un ordine casuale con seed, con le due condizioni interlacciate.

**Prove fallite (P24):**

- Una risposta fuori formato conta come sbagliata e si conta a parte.
- Timeout ed errori dell'API si riprovano fino a 2 volte, poi la prova si esclude.
- Le esclusioni si riportano per condizione.

**Ipotesi e analisi pre-registrate (P8, P9, P10):**

- **H1a (primaria):** la probabilità di risposta giusta è più alta in *ariadne*. Modello logistico con la
  condizione come effetto e gli errori raggruppati per scenario (GEE con correlazione scambiabile), sulle
  singole prove della formulazione originale. Si riporta la differenza di probabilità con intervallo al 95%.
  - *Perché GEE:* tiene conto che le 7 domande di uno scenario sono correlate (punto 9).
  - *Alternativa scartata:* modello misto con effetti casuali di scenario e domanda; in `statsmodels` è solo
    approssimato. Si fa come analisi di sensibilità.
- **H1b (co-primaria):** la quota di domande giuste in tutte e 3 le ripetizioni (pass^3) è più alta in
  *ariadne*. Differenza appaiata con intervallo bootstrap che ricampiona gli scenari.
- **H2:** i token per prova differiscono tra le condizioni, a due code. Wilcoxon appaiato sulle mediane per
  domanda.
  - Token = ingresso + scrittura in cache + lettura dalla cache + uscita, contati come se nulla fosse in
    cache: l'ordine delle prove non deve cambiare il conteggio. Il costo reale in $ si riporta a parte.
- **Correzione:** Holm sulla famiglia {H1a, H1b, H2}. Haiku, E1b, categorie e parafrasi sono analisi
  secondarie, riportate senza dichiarare significatività.
- **Equivalenza (P9):** per dire che in una categoria le condizioni sono pari serve un test TOST con margine
  di ±10 punti percentuali, fissato ora; altrimenti si dice «non determinato».

**Costo per sessione (punto 6):** E1 inietta una volta sola in entrambe le condizioni, ma nella realtà
ariadne inietta a ogni prompt. Si calcola il costo di una sessione di N prompt, con N mediano preso da E4,
e il numero di prompt oltre il quale ariadne costa più di *prima*. Si riporta accanto ad H2.

**Pilota (punto 10):** sul set di sviluppo, uno scenario per lunghezza, 2 ripetizioni, entrambe le
condizioni, Opus e Sonnet.

- *Cosa stima:* costo per prova, varianza, quota di discordanti, effetto soffitto.
- *Regola del soffitto:* se entrambe le condizioni superano il 90%, si allungano gli scenari e si aggiungono
  distrattori prima di congelare il set di test.
- *Potenza:* si calcola per simulazione dalle stime del pilota (P9) e si fissa il numero di ripetizioni.
- Ogni modifica a questo piano dopo il pilota si data e si committa prima di toccare il set di test.

**Potenza attesa, per orientarsi:** con 112 domande in 16 scenari si può sperare di vedere solo differenze
medie o grandi. Il revisore ha calcolato che con 48 coppie e McNemar la potenza sarebbe 0,23–0,68; il
nuovo disegno ha più cluster, e la simulazione del pilota darà il numero vero.

**E1b, il filo che resta indietro (secondaria, punto 16).** Nella realtà STATE.md si aggiorna a fine
milestone e il grafo a ogni commit, ma anche il grafo perde dei commit (quelli senza `Thread:`).

- In E1b STATE.md riflette solo l'ultimo handoff di fine milestone, come prescrive la skill.
- Il grafo perde una quota di chiusure pari al tasso di commit senza `Thread:` misurato in E4.
- Le due degradazioni sono realistiche ciascuna per la sua condizione, e si dichiarano.

## 7. Esperimento E2 — l'osservatore (D3)

**Fixture (P12, P13).** 20 checkpoint presi dagli scenari di test. Per ognuno, il testo del turno (generato
dagli eventi da un modello e congelato) e il grafo in 5 versioni:

- F0: senza errori;
- F1: un passo segnato fatto ma non fatto;
- F2: un lavoro fatto ma assente;
- F3: una deviazione non registrata;
- F4: il nodo corrente sbagliato.

Un test verifica che ogni versione passi `ariadne validate` e che differisca da F0 solo nei campi voluti: è il
controllo che nessun marcatore riveli l'errore. In più i **casi naturali**: le incoerenze vere di questo
progetto, etichettate prima di lanciare le prove e congelate dall'archivio. Per esempio il passo lasciato
aperto il 2026-11-14 da tre commit con il trailer `Thread:` non letto.

**Varianti, in ordine di costo:** A Haiku sul turno; B Haiku sull'intera sessione fino al checkpoint; C Opus
sull'intera sessione (il fork).

- Tutte girano sulle stesse fixture, con 3 ripetizioni (P3).
- A e B girano sempre. C gira solo se né A né B rispettano la regola di decisione: è il ripiego costoso, e
  così le varianti restano confrontabili sulle stesse fixture.

**Grader:** l'osservatore risponde con un elenco di allarmi `{titolo del passo, tipo}`. Un allarme conta
come trovato se nomina il passo dell'errore e il tipo giusto. Il passo giusto con il tipo sbagliato si conta
a parte.

**Metriche:** recall per tipo di errore, precision, falsi allarmi su F0, costo e durata per checkpoint.

**Regola di decisione (pre-registrata):** si adotta la variante più economica in cui il limite inferiore
dell'intervallo al 95% del recall è ≥ 0,6 e il limite superiore dei falsi allarmi è ≤ 0,15. Le soglie sono
**di prodotto**:

- falsi allarmi oltre il 15% vogliono dire un allarme falso ogni 6–7 checkpoint, e la persona smette di
  leggere la banda;
- un recall di 0,6 supera il 55% di ConStory-Checker (M § 2) su un compito simile.

Se nessuna variante passa, l'osservatore resta fuori e il rapporto lo dice (P20). La stessa misura sceglie il
modello dello scribe.

## 8. Esperimento E3 — la persona (D2)

**Parole.**

- *Disegno a caso singolo (SCED):* un solo soggetto provato più volte in condizioni alternate, con
  l'analisi sull'andamento delle sue prove. La variante *alternating treatments* alterna le condizioni a
  caso tra sessioni.
- *SEQ:* una domanda dopo ogni compito, «quanto è stato facile?», da 1 a 7.
- *Mental Demand:* la sottoscala del NASA-TLX sul carico mentale, da 0 a 100.
- *UX-Lite:* due domande (utilità e facilità) a fine serie.
- *KLM:* stima del tempo di un esperto contando le azioni elementari (tasti, puntamenti, pause mentali).

**Disegno (P14, P27, P28).** First-person, con l'autore come utente, in disegno a caso singolo con
trattamenti alternati.

- 8 sessioni, 4 per condizione, in ordine casuale con seed; una sessione ogni giorno o due.
- Ogni sessione usa uno scenario diverso, preso da un set E3 bozzato da un modello che l'autore non ha letto,
  con struttura variabile.
- In ogni sessione si svolgono tutti e 4 i compiti, così ogni compito ha 4 prove per condizione (punto 13).

**Compiti, con l'equivalente nelle due condizioni:**

| Compito | *prima* | *ariadne* |
|---|---|---|
| T1 Dove sei e cosa viene dopo | STATE.md | banda o riassunto |
| T2 Perché una decisione | git, documenti | viewer o `why` |
| T3 Dove sta il risultato di un passo | git, documenti | viewer, prove |
| T4 Cosa è cambiato mentre eri via | LOG.md, git log | coda e diario |

**Misure:** tempo e correttezza per compito (chiave scritta prima); SEQ e Mental Demand per compito; UX-Lite
alla fine di ogni condizione.

**Analisi:** grafici per compito e test di randomizzazione per trattamenti alternati; resoconto secondo
SCRIBE (U § 1).

**Criteri di falsificazione, scritti ora (P28).** L'ipotesi «ariadne aiuta la persona» è smentita se, su
T1–T3:

- il tempo mediano con ariadne non è più basso in almeno 2 compiti su 3, **oppure**
- la correttezza con ariadne è più bassa in uno qualsiasi.

**Senza utenti, come ipotesi (P16):**

- KLM su tutti i compiti nelle due condizioni;
- valutazione euristica di banda e viewer da parte di un revisore LLM su screenshot, confermata dall'utente.

**Diario:** una voce per sessione lunga d'uso vero, con il passo di interpretazione (P14).

**Gruppo esterno:** 3–5 sviluppatori, solo per trovare problemi (P15), dopo che ariadne è installabile (M5,
la milestone di pubblicazione).

## 9. Descrizione E4 — fedeltà nel progetto vero

Descrittiva: nessuna causa si deduce da qui. Sull'archivio congelato di questo repo si contano:

- quante volte STATE.md è rimasto indietro rispetto ai commit;
- quota di commit senza `Thread:`;
- nodi chiusi con solo un messaggio come prova;
- riferimenti a file rotti;
- numero mediano di prompt per sessione, dalle trascrizioni dell'utente, contato una volta e congelato come numero.

Fornisce i tassi di E1b e la N del costo per sessione.

## 10. Confronto con i concorrenti (D4)

**Criteri (P17, punto 14):**

- Un modello terzo, che non ha scritto ariadne né questo piano, estrae i criteri dalla documentazione dei
  concorrenti e da quella di ariadne, con un modello di scheda fisso.
- Si aggiungono le 16 Cognitive Dimensions di Green e Petre, cioè proprietà di una notazione come visibilità,
  viscosità e impegno prematuro.
- Si aggiungono criteri in cui ariadne perde: maturità, comunità, lavoro con più agenti, integrazione con le
  issue, installazione.
- I criteri si committano prima delle schede. `docs/research.md` non è una fonte di criteri, perché è stato
  scritto per motivare ariadne.

**Schede anonime:** lo stesso modello terzo scrive una scheda per strumento con il modello fisso, dai soli
documenti pubblici, con nomi sostituiti da lettere.

- *Prova di riconoscibilità:* un giudice deve indovinare quale scheda è ariadne. Se ci riesce più che per caso,
  il cieco è fallito e si dichiara.

**Giudizio:** due giudici di famiglie diverse da Claude (per esempio GPT tramite Codex), per ridurre
l'auto-preferenza.

- L'utente etichetta un campione di 30 giudizi prima di vedere quelli dei modelli.
- Si riporta il kappa tra ogni giudice e l'utente (P5).

**Numeri dei concorrenti:** citati come dichiarazioni, mai come baseline (P18).

**Esplorativo:** se resta budget, Beads o Backlog.md come terza condizione di E1 su 2 scenari, con la
mappatura dichiarata.

## 11. Costi e approvazioni

| Voce | Stima di partenza | Quando si decide |
|---|---|---|
| Pilota E1 ed E2 | ~5–10 $ | si parte dopo l'approvazione di questo piano |
| E1, modello principale | Opus ~90–180 $; Sonnet circa un terzo (stima da verificare nel pilota) | dopo il pilota, con approvazione dell'utente |
| E1, Haiku | ~5 $ | idem |
| E2, A e B | ~5 $; C ~30–60 $ solo se serve | idem |
| D4, giudici | ~2 $ | idem |

I prezzi sono di listino; con l'abbonamento si consuma quota, non denaro.

## 12. Minacce alla validità (P19)

| Esperimento | Minaccia | Cosa facciamo |
|---|---|---|
| E1 | baseline di comodo | skill `handoff` originale, handoff a ogni milestone, correzione di soli fatti da chi non vede le domande, diff registrato |
| E1 | scenari di parte | scenari di test bozzati da un modello; l'autore non legge le domande; controllo di 4 scenari da parte di un revisore |
| E1 | chiave di parte | opzioni con titoli e percorsi comuni; mappa delle evidenze verificata in entrambe |
| E1 | contaminazione | copia isolata, `--restricted`, nessuna persistenza, controllo dei log |
| E1 | trattamento non avvenuto | file dell'iniezione obbligatorio |
| E1 | istruzioni diverse | CLAUDE.md di pari lunghezza, testo pre-registrato, suggerimento sui comandi dichiarato |
| E1 | costo per prompt nascosto | costo per sessione di N prompt accanto ad H2 |
| E1 | soffitto | pilota con regola; distrattori; compito Continua |
| E1 | adattamento agli scenari | set di test separato, usato una volta per sha |
| E1 | formulazione | parafrasi riportata |
| E1 | lunghezza | 4–6 scenari per lunghezza: si riporta come andamento descrittivo, non come test |
| E2 | errori sintetici | casi naturali; test contro i marcatori |
| E2 | testo del turno sintetico | stesso testo per tutte le varianti; limite dichiarato |
| E3 | autore = utente | dichiarato; scenari non letti; criteri di falsificazione; gruppo esterno in seguito |
| E3 | apprendimento tra sessioni | ordine casuale delle condizioni; scenari sempre nuovi |
| E4 | un solo progetto, un solo utente | solo descrittivo; nessuna conclusione causale |
| D4 | criteri e giudici di parte | criteri e schede da un modello terzo, prova di riconoscibilità, kappa con l'utente |

## 13. Risposta alla revisione 1

| Rilievo | Gravità | Dove si risolve |
|---|---|---|
| 1 chiave nel vocabolario di ariadne | bloccante | § 5 domande: opzioni comuni, niente id né sha, mappa delle evidenze |
| 2 «Perché» senza grader | bloccante | § 5: scelta multipla tra motivi; giudice LLM scartato con motivo |
| 3 ground truth raggiungibile | bloccante | § 4, § 6: copia temporanea, `--restricted`, nessuna persistenza, controllo dei log; P21 |
| 4 set di sviluppo | maggiore | § 5 due set; P22 |
| 5 idealizzazione diversa | maggiore | § 5 entrambe al meglio in E1 con regole scritte; E1b entrambe degradate ai tassi reali |
| 6 costo per prompt | maggiore | § 6 costo per sessione; P25 verifica dell'iniezione |
| 7 configurazione | maggiore | § 6 comando, impostazioni, CLAUDE.md, tempo massimo |
| 8 costrutto e soffitto | maggiore | § 5 Continua e distrattori; § 6 regola del soffitto; P23 |
| 9 statistica | maggiore | § 6 GEE per scenario, pass^3 co-primaria, potenza per simulazione, 16 scenari × 7 |
| 10 pilota | maggiore | § 6 pilota sul set di sviluppo, una per lunghezza, 2 ripetizioni, modifiche datate |
| 11 regole mancanti | maggiore | § 6 prove fallite, code di H2, token, famiglia di Holm, ordine casuale; P24 |
| 12 E2 | maggiore | § 7 stesse fixture, 3 ripetizioni, regola sui limiti dell'intervallo, grader, test contro i marcatori |
| 13 E3 | maggiore | § 8 SCED a trattamenti alternati, 4 per condizione, scenari non letti, falsificazione; P27, P28 |
| 14 D4 | maggiore | § 10 modello terzo, riconoscibilità, kappa con l'utente |
| 15 ripetibilità | maggiore | § 4 elenco di ciò che si fissa; generato e congelato |
| 16 E1b | minore | § 6 ritardi realistici per entrambe |
| 17 minacce mancanti | minore | § 12 una riga per esperimento; il revisore degli scenari è definito in § 5 |
| 18 lunghezza e alternative | minore | § 12 lunghezza descrittiva; alternative scartate in § 4, 5, 6; il meta-piano registra 28 principi |
| 19 concetti prima dell'uso | minore | § 1 e § 3 introducono tutte le parole; § 8 le misure sulla persona |

## 14. Procedura (passo `m4.4`)

1. In ariadne: la variabile `ARIADNE_NOW` per l'orologio finto, con il suo test.
2. Creare `ariadne-eval`; scrivere generatore, runner, grader e test dei grader.
3. Scrivere i 6 scenari di sviluppo; generare; scrivere e correggere *prima*.
4. Pilota; potenza per simulazione; modifiche datate a questo piano.
5. Bozzare e congelare i 16 scenari di test e quelli di E3; controllo del revisore su 4 di essi.
6. **Commit di pre-registrazione:** piano, hash delle fixture, sha di ariadne, modelli, testi delle condizioni.
7. **Approvazione del budget da parte dell'utente.**
8. E1, E1b, E2; E4; analisi.
9. E3 con l'utente nelle settimane seguenti; KLM; valutazione euristica.
10. D4.
11. `rapporto.md`: risultati, risultati negativi, cosa migliorare, numeri accanto ai limiti.
