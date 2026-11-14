# Principi di valutazione

*Scritti il 2026-11-14, prima del piano (passo `m4.3.2`); rivisti lo stesso giorno dopo la revisione
indipendente (`revisione-1.md`): cambiano P5 e P9, si aggiungono P21–P28. Fonti: `ricerca-metodi.md` (M) e
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
- **Discordante:** in una prova appaiata, una domanda a cui una condizione risponde bene e l'altra no.
  I test appaiati guardano solo questi casi.
- **Kappa di Cohen:** misura dell'accordo tra due valutatori che toglie l'accordo dovuto al caso; 1 =
  accordo perfetto, 0 = come a caso.
- **Cluster:** un gruppo di prove che non sono indipendenti tra loro, per esempio le domande dello stesso
  scenario. L'analisi deve tenerne conto, altrimenti sovrastima la certezza.
- **Set di sviluppo e set di test:** gli scenari su cui si prova e si mette a punto (sviluppo) e quelli,
  congelati, che si usano una sola volta per misurare (test).
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

**P5. Il grader è deterministico per default.** La risposta giusta si esprime in un formato neutrale
rispetto alle condizioni (per esempio una scelta tra opzioni identiche nelle due condizioni) e la confronta
un programma. Un giudice LLM si usa solo dove non si può fare altrimenti; in quel caso è un modello diverso
dal soggetto, l'ordine è casuale, e il suo accordo con etichette **umane**, raccolte prima dei dati su
50–100 casi, si misura con il kappa. *Perché:* bias di posizione, verbosità e auto-preferenza; la
percentuale d'accordo sovrastima (M § 4); una chiave nel vocabolario di una condizione la favorisce
(revisione 1, bloccante 1).

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

**P9. Il confronto è appaiato, tiene conto dei cluster ed è onesto sui numeri piccoli.** Si analizzano
le differenze domanda per domanda, con un modello che tiene conto che le domande dello stesso scenario sono
correlate (errori raggruppati per scenario). Si riportano la dimensione dell'effetto con intervallo al 95% e
i casi discordanti grezzi. La potenza si stima prima, per simulazione dalle stime del pilota. Con più
metriche si corregge per i confronti multipli. Per dire che due condizioni sono **pari** serve un test di
equivalenza con un margine dichiarato prima (TOST), non un risultato non significativo. *Perché:* M § 5
(Anthropic 2411.00640, McNemar PMC3716987, Dror 2018); revisione 1, punto 9.

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

### H. Aggiunti dopo la revisione 1

**P21. Il soggetto è isolato dal ground truth.** Ogni prova gira su una copia della fixture in una cartella
temporanea; i tool possono leggere solo lì; i log si controllano per accessi fuori. Scenari, risposte e
uscite precedenti non sono mai raggiungibili. *Perché:* contaminazione (revisione 1, bloccante 3).

**P22. Sviluppo e test sono separati.** Gli scenari del pilota e della messa a punto non si usano per
misurare. Il set di test si congela, si usa una volta per ogni versione di ariadne pre-registrata, e ogni
uso successivo si dichiara esplorativo. *Perché:* altrimenti ariadne si adatta alle domande (revisione 1, punto 4).

**P23. Oltre a ricordare, si misura il comportamento, in mezzo al rumore.** Accanto alle domande sui fatti,
un compito chiede di continuare il lavoro, con un esito che un programma può verificare. Gli scenari
contengono distrattori (commit e documenti non pertinenti o superati), come in LongMemEval. Il pilota
controlla l'effetto soffitto. *Perché:* tau-bench verifica lo stato, non il testo (M § 1); revisione 1, punto 8.

**P24. Le regole sulle prove fallite e sull'ordine si decidono prima.** Uscite non valide, timeout ed errori
dell'API hanno una regola scritta (riprovare o contare come errore); le prove delle due condizioni si
alternano in un ordine casuale con seed. *Perché:* deriva dell'API e cache non devono favorire una
condizione (revisione 1, punto 11).

**P25. Si verifica che il trattamento sia avvenuto.** Ogni prova registra la prova che la condizione ha
fatto ciò che dichiara (per esempio che il contenuto iniettato all'avvio c'era). *Perché:* un hook che non
parte rende le due condizioni uguali senza che nessuno se ne accorga (revisione 1, punto 6).

**P26. La formulazione non deve decidere il risultato.** Ogni domanda ha almeno una parafrasi; la
sensibilità alla formulazione si riporta. *Perché:* conoscenza del revisore (revisione 1, lacune).

**P27. Quando la stessa persona prova le due condizioni, si controbilancia.** Ogni compito si svolge in
entrambe le condizioni, su materiale diverso ma equivalente, in ordine casuale, con almeno 3 prove per
condizione, secondo un disegno a caso singolo (SCED). *Perché:* U § 1 (PMC7004358); revisione 1, punto 13.

**P28. Il first-person ha criteri di falsificazione scritti prima.** Prima delle prove con l'utente si scrive
cosa smentirebbe l'ipotesi. *Perché:* U § 1 (Neustaedter & Sengers); revisione 1, punto 13.
