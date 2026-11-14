# Piano di valutazione

*Bozza del 2026-11-14 (passo `m4.3.3`), da sottoporre a revisione indipendente. Si giudica contro
`principi.md` (citati come P1–P20); le fonti sono in `ricerca-metodi.md` e `ricerca-usabilita.md`.*

## 1. Che cosa vogliamo sapere

ariadne sostituisce due file scritti a mano con un grafo di processo. Le due promesse sono separate
(P7) e diventano due domande:

- **D1 — l'agente.** Dopo un azzeramento del contesto (`/clear`), un agente riprende il lavoro in modo
  più corretto, più affidabile e più economico con ariadne che con STATE.md e LOG.md?
- **D2 — la persona.** Una persona che torna su un progetto ritrova più in fretta e con meno fatica dove
  è, perché, e cosa viene dopo?

Due domande di supporto servono a decidere come migliorare ariadne:

- **D3 — l'osservatore.** Un modello che ai checkpoint confronta il lavoro fatto con il grafo trova le
  incoerenze? A che costo, e con quale modello?
- **D4 — il contesto.** Dove si colloca ariadne rispetto agli strumenti simili, sui criteri fissati prima?

## 2. Parole del piano

Le parole di `principi.md` (soggetto, condizione, fixture, ground truth, grader, prova appaiata,
ripetizione, pass^k, errore iniettato, pre-registrazione) valgono anche qui. In più:

- **Scenario:** la storia di un progetto finto, scritta come lista di **eventi**: «piano approvato con
  i passi A, B, C», «passo A chiuso dal commit X che tocca il file Y», «deviazione D aperta e chiusa»,
  «passo C rinviato alla milestone 2», «decisione E sostituita da F». Uno scenario è la fonte unica di
  verità da cui nasce tutto il resto.
- **Generatore:** lo script che da uno scenario produce, sempre identici, il repository git del progetto
  finto (commit con date e autori fissi, quindi stessi sha), i file di stato di ciascuna condizione e le
  domande con le risposte giuste.
- **Prova di ripresa:** un soggetto apre il progetto finto «a contesto vuoto», riceve ciò che la sua
  condizione inietta all'avvio e risponde a una domanda.
- **Categoria di domanda:** il tipo di cosa chiesta. Riprende le abilità di LongMemEval (M § 1)
  tradotte nel nostro dominio:

| Categoria | Esempio | Dove sta la risposta in *prima* | in *ariadne* |
|---|---|---|---|
| Dove | «Su quale passo sei e qual è il prossimo?» | STATE.md, Next | riassunto iniettato |
| Perché | «Perché il passo B è stato fatto così?» | messaggi di commit, documenti | `ariadne why`, campo `why` |
| Prova | «Quale file contiene il risultato di B?» | commit, documenti | prove `file` del nodo |
| Rinvio e deviazione | «Cosa è stato rinviato e dove riprende?» | STATE.md se ancora vero, git | nodi `deferred`, `detour` |
| Aggiornamento | «Quale decisione vale oggi su E?» | STATE.md, git | nodo `replaced` → successore |
| Astensione | domanda su qualcosa mai avvenuto | risposta giusta: «non risulta» | idem |

## 3. Dove vive la valutazione

**Scelta:** un repository separato, `~/Sviluppo/Personal/ariadne-eval`, locale e senza remote. Contiene
scenari, generatore, runner, grader, analisi e uscite grezze. I risultati riassunti tornano in questo repo
in `docs/valutazione/rapporto.md`.

- *Perché separato:* la storia della valutazione non sporca quella del prodotto, e i progetti finti
  (repository git generati) non finiscono annidati in questo repo. Era la richiesta dell'utente.
- *Alternativa scartata:* una cartella `eval/` qui dentro. Più comoda, ma i repository generati
  andrebbero ignorati da git a mano e ogni commit della valutazione muoverebbe la storia del prodotto.
- *Versione di ariadne:* il runner usa la CLI di questo repo a uno sha fissato e lo registra in ogni
  uscita (P2). Se ariadne cambia, si rilancia con il nuovo sha e i risultati restano confrontabili.

**Strumenti:** runner in Node senza dipendenze (`claude -p` come sottoprocesso, come verificato: contesto di
base ~566 token, uscita JSON con token, costo e durata); analisi statistica in Python con `scipy` lanciato
con `uv`, per non riscrivere a mano test statistici già verificati.

- *Alternativa scartata:* Inspect AI. Offre log strutturati e ripetizioni native, ma il suo valore
  (sandbox, API dei modelli) qui non serve: il soggetto è una CLI, e un runner che salva il JSON grezzo
  copre P2 e P3. Si riconsidera se il runner cresce oltre ~300 righe.

## 4. Fixture (P1, P4, P6)

**Scelta:** scenari scritti a mano come dati, generati in modo deterministico. Si scartano due alternative:

- *Storia e trascrizioni di questo repo:* cambiano a ogni commit (P1) e contengono conversazioni private.
  Restano solo per i casi naturali di D3 (§ 6) e per la descrizione di § 8, congelate una volta.
- *Scenari generati da un modello:* più vari, ma il ground truth dipenderebbe dal modello. Un modello si
  può usare per proporre bozze di scenari, che poi si congelano e si rileggono.

**Quanti:** 6 scenari, in tre lunghezze (2 brevi da ~10 eventi, 2 medi da ~30, 2 lunghi da ~80), per vedere
se il vantaggio cresce con la lunghezza della sessione. Ogni scenario contiene almeno: un piano, chiusure
con commit e file, una deviazione, un rinvio, una decisione sostituita, e una scelta il cui perché sta solo
in un documento.

**Le due condizioni dallo stesso scenario (P6):**

- *ariadne:* il generatore applica gli eventi con la CLI vera (`plan`, `close`, `add detour`, `defer`,
  `replace`, commit con `Thread:`). Il grafo è quello che ariadne produrrebbe davvero.
- *prima:* STATE.md e LOG.md scritti secondo la skill `handoff` com'era (STATE ≤ 60 righe, con Milestone, Next,
  Decisioni aperte e Pointers; LOG una riga per milestone), con il perché nei messaggi di commit e nei
  documenti, come nel progetto reale. Li scrive un modello con la skill `handoff`, una volta per scenario.
  Poi una persona li corregge fino a che non contengono errori: si congelano così. *Perché un modello:* è
  come nascevano davvero. *Perché la correzione:* una baseline con errori di trascrizione gonfierebbe il
  vantaggio (P6).
- *Stessi file di progetto:* codice e documenti sono identici nelle due condizioni; cambia solo come si
  tiene il filo.

**Domande:** 8 per scenario, almeno una per categoria, 48 in tutto, con la risposta giusta in un formato
che un programma sa confrontare (id del passo, percorso del file, sha, «non risulta»).

## 5. Esperimento E1 — la ripresa dell'agente (risponde a D1)

**Soggetto:** `claude -p` nella cartella del progetto finto, con il modello che l'utente usa davvero
(Opus 5.5) come soggetto principale e Haiku 5.5 come analisi secondaria (il vantaggio regge su un modello
piccolo?).

**Cosa riceve all'avvio:** ciò che la sua condizione inietta davvero. In *prima* STATE.md tramite l'hook
di avvio; in *ariadne* il riassunto di `ariadne summary`. Gli hook dell'utente, il suo CLAUDE.md e le sue
skill non si caricano: il CLAUDE.md di ciascun progetto finto dice solo come si tiene il filo in quella
condizione.

**Strumenti del soggetto:** lettura e ricerca di file, `git log` e `git show` in entrambe le condizioni;
in *ariadne* anche `node bin/ariadne.mjs show|why|log`. Niente scrittura, niente rete. *Perché:* un
agente reale dopo `/clear` esplora i file; vietarlo premierebbe chi inietta di più.

**Risposta:** un oggetto JSON con un campo per il dato chiesto. Il grader è un programma (P5): confronto
esatto per id, sha e percorsi; insieme di elementi per le liste; «non risulta» per l'astensione.

**Ripetizioni:** 3 per domanda e condizione (P3). Prove: 48 domande × 2 condizioni × 3 = 288 per modello.

**Ipotesi pre-registrate (P8):**

- **H1 (primaria):** la quota di domande giuste in tutte e tre le ripetizioni (pass^3, P10) è più alta in
  *ariadne*. Test: McNemar esatto sulle 48 coppie, a due code, α = 0,05.
- **H2:** i token totali consumati per prova sono meno in *ariadne*. Test: Wilcoxon appaiato sulle
  mediane per domanda.
- **H3 (per categoria, esplorativa):** il vantaggio sta in Perché, Rinvio e Aggiornamento; in Dove le
  condizioni sono pari. Solo descrittiva: con 8 domande per categoria non c'è potenza (P9).
- Metriche secondarie: accuratezza media con intervallo bootstrap appaiato al 95% raggruppato per
  scenario; costo in $; durata; numero di chiamate ai tool; costo fisso iniettato (P11).
- Correzione per confronti multipli: Holm su H1 e H2.

**Potenza dichiarata:** con 48 coppie, McNemar esatto rileva con buona probabilità solo differenze grandi
(circa 10 o più casi discordanti a favore di una parte). Un risultato nullo non dimostra l'equivalenza.

**Variante E1b (secondaria, pre-registrata):** «stato rimasto indietro». Nella realtà STATE.md si aggiorna
a fine milestone, il grafo a ogni commit. In E1b le ultime 5 chiusure dello scenario non sono in STATE.md;
nel grafo ci sono perché passano dai commit. Misura il valore dell'aggiornamento automatico, che E1 per
equità esclude. Si riporta separata, con l'assunzione dichiarata.

**Costo stimato:** misurato prima con un **pilota** (1 scenario, 1 ripetizione) che non entra nei
risultati. Stima di partenza per Opus: 0,10–0,30 $ a prova, cioè 30–90 $ per E1. L'esecuzione completa
parte solo dopo il pilota e l'approvazione del budget da parte dell'utente.

## 6. Esperimento E2 — l'osservatore (risponde a D3)

**Cosa si misura:** un verificatore che legge il lavoro di un checkpoint e il grafo, e segnala dove si
contraddicono (P12).

**Fixture:** per ogni checkpoint degli scenari, il testo del turno (generato una volta dagli eventi e
congelato) e il grafo in 5 versioni: F0 senza errori; F1 un passo segnato fatto ma non fatto; F2 un lavoro
fatto ma assente; F3 una deviazione non registrata; F4 il nodo corrente sbagliato. Nessun marcatore che
riveli l'errore (P12). In più i **casi naturali** (P13): le incoerenze vere già note di questo progetto,
congelate come fixture. Per esempio i 3 commit di oggi con il trailer non letto, che hanno lasciato
m3.1.4 aperto.

**Varianti:** A Haiku sul solo turno; B Haiku sull'intera sessione fino al checkpoint; C Opus sull'intera
sessione (il «fork»), su un sottoinsieme di 12 checkpoint per il costo.

**Metriche:** recall per tipo di errore, precision, falsi allarmi su F0, costo e durata per checkpoint.

**Regola di decisione (pre-registrata):** si adotta la variante più economica con recall complessivo
≥ 0,7 e falsi allarmi ≤ 0,1. Se nessuna li raggiunge, l'osservatore resta fuori e il rapporto lo dice
(P20). La stessa misura sceglie il modello dello scribe (`m4.2`).

## 7. Esperimento E3 — la persona (risponde a D2)

**Disegno:** first-person, l'autore è l'utente (P14). Vale per trovare problemi e formulare ipotesi, non
come prova di efficacia.

**Compiti** (decisi qui, prima): T1 riprendere dopo `/clear` e dire dove sei e cosa viene dopo; T2
ricostruire il perché di una decisione; T3 trovare il file di un risultato; T4 smaltire la coda di cose da
confermare.

**Come:** l'utente svolge i compiti su scenari che **non conosce** (generati per lui da un set separato),
per togliere il vantaggio della memoria del proprio progetto. Metà compiti con *prima* (legge STATE.md,
LOG.md, git), metà con *ariadne* (banda e viewer), con l'ordine alternato. Si misurano tempo, correttezza,
una domanda di facilità per compito (SEQ) e la sottoscala Mental Demand del NASA-TLX; alla fine UX-Lite
(P15).

**Senza utenti:**

- KLM: conta e stima il tempo delle azioni di ogni compito nelle due condizioni.
- Valutazione euristica di banda e viewer da parte di un revisore LLM su screenshot, riportata come ipotesi
  e confermata dall'utente (P16).

**Diario:** nelle settimane d'uso, una voce per sessione lunga con il passo di interpretazione (cosa mi
aspettavo, cosa è successo, cosa cambia) (P14).

**Gruppo esterno:** 3–5 sviluppatori che usano agenti da terminale, solo per trovare problemi (P15). È
fuori da questo giro, perché va prima reso installabile ariadne (M5).

## 8. Descrizione E4 — fedeltà nel progetto vero

Descrittiva, non un esperimento: nessuna causa si deduce da qui. Su un archivio congelato di questo repo
(`git bundle` allo sha di partenza) si contano:

- quante volte STATE.md è rimasto indietro rispetto ai commit;
- quanti commit non portano `Thread:`;
- quanti nodi chiusi hanno solo un messaggio come prova;
- quanti riferimenti a file si sono rotti.

Dà il contesto reale ai numeri di E1b ed E2.

## 9. Confronto con i concorrenti (risponde a D4)

**Criteri, fissati e committati prima di riaprire i concorrenti (P17):** dalla tabella della ricerca
(§ 7.1 di `docs/research.md`) e dai documenti dei concorrenti, più le Cognitive Dimensions di Green e Petre
come secondo asse. Comprendono criteri in cui ariadne perde, per esempio maturità, comunità, lavoro con
più agenti, integrazione con le issue, installazione.

**Giudizio:** due giudici LLM di modelli diversi da quello che ha scritto ariadne. Valutano schede
descrittive anonime («strumento A, B…») estratte dai documenti, con l'ordine mescolato. Il loro accordo si
riporta con il kappa; l'utente conferma (P5, P16).

**Numeri dei concorrenti:** citati come dichiarazioni, mai come baseline (P18).

**Esplorativo:** se resta budget, uno o due concorrenti (Beads, Backlog.md) come condizione aggiuntiva di
E1 su uno scenario, con la mappatura dichiarata.

## 10. Minacce alla validità (P19)

| Minaccia | Cosa potrebbe spiegare il risultato | Cosa facciamo |
|---|---|---|
| Baseline di comodo | un STATE.md scritto peggio di com'era | skill `handoff` originale, correzione umana, esempi reali allegati |
| Scenari di parte | scenari scritti da chi ha fatto ariadne, con domande che ariadne sa già rispondere | categorie da LongMemEval; per ogni scenario almeno una domanda la cui risposta sta solo in un documento; revisione degli scenari da parte del revisore |
| Iniezione diversa | ariadne inietta a ogni prompt, STATE.md all'avvio | in E1 un solo prompt per prova, quindi l'iniezione è una sola in entrambe |
| Strumenti in più | la CLI di ariadne dà al soggetto un aiuto che *prima* non ha | è parte della condizione; si riporta quante volte il soggetto la usa |
| Modello | il risultato vale per un modello | Opus principale, Haiku secondario |
| Sintetico | gli scenari non somigliano all'uso vero | E4 descrive il progetto vero; casi naturali in E2 |
| Autore = utente | E3 conferma ciò che l'autore voleva | dichiarato; scenari non conosciuti; gruppo esterno in seguito |

## 11. Procedura ed esecuzione (passo `m4.4`)

1. Creare `ariadne-eval`; scrivere generatore e grader con i loro test.
2. Scrivere i 6 scenari (più quelli per E3); generare le fixture; scrivere e correggere le versioni
   *prima*; congelare tutto con gli hash.
3. **Commit di pre-registrazione:** questo piano, gli hash delle fixture, lo sha di ariadne, i modelli.
4. Pilota di E1 ed E2; stima del costo; **approvazione del budget da parte dell'utente.**
5. E1, E1b, E2; analisi; E4.
6. E3 con l'utente; valutazione euristica; KLM.
7. Confronto con i concorrenti.
8. `rapporto.md`: risultati, risultati negativi (P20), cosa migliorare, con i numeri accanto ai limiti.
