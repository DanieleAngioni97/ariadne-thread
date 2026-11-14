# Principi di valutazione

*Scritti il 2026-11-14, prima del piano (passo `m4.3.2`). Fonti: `ricerca-metodi.md` (M) e
`ricerca-usabilita.md` (U); le regole senza fonte primaria lo dicono. Il piano (`piano.md`) si
giudica contro questi principi; se un principio va cambiato, si cambia qui con il motivo, prima.*

## Parole usate in questo documento

Ogni parola è spiegata prima di essere usata nei principi.

- **Soggetto:** chi fa la prova. Può essere un agente (un modello lanciato con `claude -p`) o una persona.
- **Condizione:** un modo di tenere il filo messo alla prova. *Prima* = STATE.md e LOG.md scritti a
  mano; *ariadne* = grafo, riassunto, CLI, banda, viewer.
- **Fixture:** il materiale fisso di una prova: un progetto finto con la sua storia, i file di stato di
  ogni condizione, le domande e le risposte giuste.
- **Ground truth:** le risposte giuste, decise prima della prova e indipendenti da come risponde il
  soggetto.
- **Grader:** chi assegna il punteggio a una risposta. *Deterministico* se è un programma (stesso
  ingresso, stesso voto); *giudice LLM* se è un modello.
- **Prova appaiata:** la stessa domanda posta allo stesso tipo di soggetto in entrambe le condizioni, così
  il confronto avviene domanda per domanda.
- **Ripetizione:** la stessa prova rilanciata identica; misura la variabilità del modello.
- **pass^k:** la quota di domande a cui il soggetto risponde bene in **tutte** le k ripetizioni. È più
  severo della media e misura l'affidabilità.
- **Errore iniettato:** un errore inserito di proposito in una fixture, per sapere in anticipo cosa deve
  trovare un verificatore come l'osservatore.
- **Pre-registrazione:** ipotesi, metriche, numero di prove e test statistici scritti e committati prima
  di vedere i risultati.

## Principi

### A. Ripetibilità

**P1. Gli ingressi sono fissi e versionati.** Ogni fixture è generata da uno script deterministico o
congelata come archivio, fuori dalla storia viva del progetto, con il suo hash. Rilanciare una prova
parte da byte identici. *Perché:* la storia di questo repo cambia a ogni commit (richiesta dell'utente);
i benchmark riconosciuti distribuiscono ground truth statico (M § 3).

**P2. Tutto ciò che varia è fissato o registrato.** Id del modello, versione della CLI, prompt (con hash)
e opzioni di lancio; per ogni chiamata si salva l'uscita grezza, con token, costo e durata. *Perché:* senza
l'uscita grezza non si può rifare l'analisi né verificare un punteggio (M § 3, Inspect `log_dir`).

**P3. La variabilità del modello si misura, non si nasconde.** Ogni prova si ripete più volte (almeno 3;
il numero esatto lo fissa il piano), alla temperatura normale del soggetto. *Perché:* abbassare la
temperatura riduce il rumore ma introduce bias (M § 3, Anthropic 2411.00640).

### B. Correttezza della misura

**P4. Ogni domanda ha una risposta giusta decisa prima.** Il ground truth nasce dallo stesso scenario da
cui si generano le condizioni (fatto → evidenza → domanda), non da come risponde il soggetto. *Perché:* è
lo schema di LongMemEval e tau-bench (M § 1).

**P5. Il grader è deterministico per default.** Id di nodo, stato, commit o percorso citati si confrontano
con un programma. Un giudice LLM si usa solo per risposte libere; in quel caso è un modello diverso dal
soggetto, l'ordine delle risposte è casuale, e il suo accordo con un'etichettatura umana si misura con il
kappa di Cohen su un campione di 50–100 casi. *Perché:* bias di posizione, verbosità e auto-preferenza; la
percentuale d'accordo sovrastima (M § 4).

**P6. Le due condizioni partono dalla stessa verità e ricevono la stessa cura.** Per ogni scenario, STATE.md
e LOG.md da un lato e il grafo dall'altro si generano dallo stesso evento di storia, ciascuno scritto al
meglio delle proprie regole (quelle di STATE.md e LOG.md com'erano nel progetto). *Perché:* un *prima* scritto
male gonfia il vantaggio (baseline di comodo). Senza fonte primaria: è una regola standard dei confronti
sperimentali.

**P7. Si separano le due promesse.** «L'agente riprende meglio» e «la persona ritrova il filo» sono
domande diverse, con soggetti, metriche e conclusioni separati; un risultato sull'una non si cita per
l'altra. *Perché:* le metriche dei concorrenti misurano l'obbedienza dell'agente, non l'usabilità (U § 6).

### C. Analisi

**P8. L'analisi è pre-registrata.** Ipotesi, metriche primarie e secondarie, numero di prove, ripetizioni,
test e soglie si committano prima dell'esecuzione. Ogni analisi aggiunta dopo si chiama *esplorativa*.
*Perché:* evita di adattare l'analisi ai risultati (M § 5; fonte primaria specifica mancante).

**P9. Il confronto è appaiato e onesto sui numeri piccoli.** Si analizzano le differenze domanda per
domanda: McNemar esatto per esiti giusto/sbagliato, Wilcoxon per token, costo e tempo; si riportano la
dimensione dell'effetto con intervallo al 95% (bootstrap appaiato) e i casi discordanti grezzi. Con pochi
casi si dichiara la potenza limitata; con più metriche si corregge per i confronti multipli. *Perché:*
M § 5 (Anthropic 2411.00640, McNemar PMC3716987, Dror 2018).

**P10. Accanto alla media si riporta pass^k.** Una ripresa del lavoro deve riuscire sempre, non almeno una
volta. *Perché:* M § 2 (tau-bench).

**P11. Il costo sta sempre accanto all'accuratezza.** Token, $ e tempo per prova e per condizione, compreso
il costo fisso di ciò che si inietta a ogni prompt (~240 token del riassunto contro ~700 di STATE.md).
*Perché:* un sistema più accurato ma più caro va giudicato con entrambi i numeri (M § 2; nessuno standard).

### D. Verificatori ed errori iniettati

**P12. Un verificatore si misura su errori noti e su casi puliti.** Precision e recall per tipo di errore,
più il tasso di falsi allarmi su fixture senza errori. Gli errori non lasciano marcatori che li rivelino.
*Perché:* M § 6 (ConStory-Bench).

**P13. Gli errori sintetici non bastano da soli.** Si affiancano casi naturali (contraddizioni vere, trovate
una volta nella storia del progetto e congelate come fixture) e si dichiara il limite di validità
ecologica, cioè quanto la prova somiglia all'uso vero. *Perché:* un rilevatore può imparare le
idiosincrasie degli errori sintetici (M § 6).

### E. Persone

**P14. Con un solo utente il disegno si dichiara per quello che è.** L'autore è anche l'utente: le prove
sono *first-person*, valgono per trovare problemi e formulare ipotesi, non come prova di efficacia. Ogni
diario ha un passo di interpretazione esplicito (cosa mi aspettavo, cosa è successo, cosa cambia).
*Perché:* U § 1 (Neustaedter & Sengers).

**P15. Le misure sulle persone sono leggere, oggettive quando si può, e decise prima.** Tempo di ripresa e
numero di azioni (stimato con KLM) sui compiti; una domanda di facilità per compito (SEQ); UX-Lite o SUS
con intervallo, mai da soli. Un eventuale gruppo esterno (3–5 sviluppatori) serve a trovare problemi, non
a stimare metriche. *Perché:* U § 2, § 4.

**P16. I valutatori LLM generano ipotesi, non prove.** Una valutazione euristica fatta da un modello si
riporta come tale e si conferma con una persona. *Perché:* U § 3.

### F. Confronto con i concorrenti

**P17. I criteri si fissano prima di guardare gli strumenti, e includono quelli in cui ariadne perde.**
Criteri e scale si datano e si committano prima del confronto; si estraggono anche dai documenti dei
concorrenti; dove si può il giudizio è cieco sull'identità dello strumento. Le Cognitive Dimensions di
Green & Petre fanno da secondo asse. *Perché:* U § 5 (DESMET, Blackwell & Green).

**P18. I numeri dei concorrenti non verificati non sono una baseline.** Si citano come dichiarazioni, con
la loro fonte. *Perché:* U § 6.

### G. Trasparenza

**P19. I limiti e le minacce alla validità si scrivono nel piano.** Per ogni esperimento: cosa potrebbe
spiegare il risultato oltre ad ariadne, e cosa facciamo per escluderlo. *Perché:* regola standard, senza
fonte primaria specifica.

**P20. I risultati negativi si pubblicano come quelli positivi.** Se *prima* vince su qualcosa, il rapporto
lo dice e lo usa per decidere cosa migliorare. *Perché:* lo scopo dichiarato della valutazione (meta-piano).
