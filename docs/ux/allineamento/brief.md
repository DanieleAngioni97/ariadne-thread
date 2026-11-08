# Brief — allineamento persona ↔ modello sul grafo
2026-11-08 · Modalità: nuovo · Profondità: standard (revisione d'usabilità leggera)

Tema: come il grafo viene scritto, tenuto in ordine e letto, da te e dall'agente, così che
coincida con il processo reale e resti leggibile nel tempo; e come sostituisce STATE, LOG e Next
in questo repo. Copre il backend (chi scrive, con quali regole) e il frontend (cosa vedi, cosa
approvi, come correggi). Base visiva: lo spike `spikes/viewer/` (giudizio: "va benissimo").

## Chi lo usa
- Tu, sviluppatore che lavora con Claude Code su processi lunghi (ricerca → deploy, debugging).
- L'agente stesso: legge il grafo per sapere dove si trova e lo aggiorna.
- Più avanti: la community (sviluppatori con Claude Code), che non ha il tuo contesto.

## Compiti (con frequenza)

| Compito | Frequenza | Oggi: passi / problemi |
|---|---|---|
| Sapere dove sei e cosa viene dopo | ogni pochi turni | leggere STATE.md o chiedere all'agente |
| Riprendere dopo `/clear` o il giorno dopo | ogni sessione | hook che inietta STATE.md (~2,7 KB) |
| Ricostruire perché si è arrivati a un punto | qualche volta a settimana | grep su LOG.md e traccia a mano |
| Verificare che il grafo dica il vero | ogni aggiornamento strutturale | — (oggi la traccia è a mano) |
| Approvare una proposta strutturale | qualche volta per sessione | — |
| Discutere un punto di una lista e tornare all'indice | più volte per sessione | si riscrive o si scorre la chat |
| Aprire una questione laterale e tornare | qualche volta per sessione | resta nella stessa chat e la sporca |
| Correggere un nodo sbagliato | raro, si spera | — |

## Contesto d'uso
- Terminale con Claude Code (chat + banda sopra il prompt); viewer nel browser accanto.
- Lavori mentre segui la chat: il grafo si guarda di sfuggita, non si studia.

## Critiche ricevute (testuali)
- "Sembra carina ma è troppo da terminale, la vorrei esterna per farla carina." (spike mod)
- "Le frecce sono tutte incasinate." (spike viewer, v1)
- "Deve essere chiaro perché siamo andati avanti in un branch se c'erano ancora dei todo da fare indietro." (v1)
- "Quando vado su un altro nodo non è chiaro dal grafo dove sta andando." (v2)
- "Vorrei evitare che ci siano flussi di ragionamento fuori controllo, ad esempio che haiku abbia
  allucinazioni e inizi a creare rami ovunque, impedendo la comprensione umana a lungo andare."
- "Quello che si vede nel grafo [deve coincidere] davvero con il workflow adottato e il flusso di
  ragionamento/processo che ci ha portato a un certo punto."

## Obiettivi
- Principio (Q6): lo strumento non deve rispecchiare il ragionamento umano, con i suoi limiti; deve
  guidarlo, strutturarlo e tenerlo ordinato e tracciato.
- Funzionali: il grafo si aggiorna mentre lavori; sostituisce STATE/LOG/Next in questo repo;
  l'agente lo usa come contesto per orientarsi.
- Di esperienza: ordinato, leggibile, interpretabile anche dopo settimane; ti fidi di ciò che vedi.

## Requisiti e criteri di accettazione
Un'azione = un clic, un tasto, o una frase scritta in chat chiusa da Invio.

| # | Requisito | Criterio verificabile | Priorità |
|---|---|---|---|
| R1 | Chi scrive: l'agente principale ai checkpoint, con un tool; l'osservatore controlla e segnala, non scrive (Q3) | nessun nodo nel grafo ha come autore l'osservatore | deve |
| R2 | Dettagli in automatico (stato, file, momenti); struttura (ramo, deviazione, milestone, rinvio, cancellazione) solo dopo la tua conferma (Q4) | ogni nodo strutturale ha una conferma tua con data | deve |
| R3 | Ogni nodo ha almeno una prova verificabile (messaggio, commit, file); il controllo automatico rifiuta il resto (Q5) | 0 nodi senza prova esistente | deve |
| R4 | Limiti di leggibilità: di default max 3 rami aperti per livello e 3 nodi nuovi per aggiornamento, regolabili; oltre, si propone di chiudere o rimandare (Q6) | il validatore rifiuta il superamento con una proposta alternativa | deve |
| R5 | Un nodo è una decisione o un risultato verificabile, non un turno né un'azione (Q7) | nessun nodo senza decisione o risultato nel campo "cosa" | deve |
| R6 | Aggiornamento ai checkpoint: commit, passo chiuso, cambio di argomento, tua richiesta (Q8) | nessuna scrittura fuori da un checkpoint | deve |
| R7 | All'agente, a ogni turno, un riassunto compatto calcolato dal grafo (corrente, percorso, rami aperti, prossimo); il resto su richiesta (Q9) | ≤ 300 token; presente anche dopo la compattazione | deve |
| R8 | LOG generato dal grafo, poi sostituito del tutto (Q10) | LOG.md coincide con l'export | dovrebbe |
| R9 | Il grafo è versionato in git, in un formato leggibile nei diff: una sola fonte di verità (Q11) | STATE.md e Next non scritti più a mano | deve |
| R10 | Correzioni in chat ("sposta X sotto Y"); il viewer resta di sola lettura (Q16) | una correzione = 1 azione | deve |

## Vincoli
- API delle mod in early access: può cambiare a ogni release.
- `$.ui.scroll` muove la chat solo su un tuo input dentro Claude Code (non dal browser).
- Il viewer legge solo il file (F5): funziona anche con un grafo scritto a mano.
- Ogni rinvio crea un task in una milestone successiva; il piano è segnato fino in fondo (decisione di m1.2).

## Fuori ambito
Altri agenti (Codex, Cursor), più persone sullo stesso grafo, mobile, editing nel viewer (Q17).

## Metriche (prima / obiettivo)
Obiettivo dopo una settimana d'uso (Q15): ≥ 90% dei nodi giusti senza ritocchi; ≤ 1 proposta
strutturale rifiutata su 5; capisci dove sei in ≤ 5 s guardando la banda; token per turno sotto quelli
di oggi. Prima: STATE.md ~2,7 KB (≈700 token) iniettato a inizio sessione; traccia a mano.

## Decisioni
| Data | Decisione | Motivo | Chi |
|---|---|---|---|
| 2026-11-07 | Una mod è la sorgente; il grafo si guarda in un viewer web | M0 | tu |
| 2026-11-08 | Rinvio = task in una milestone successiva; piano end-to-end | m1.2 | tu |
| 2026-11-08 | Il mockup del viewer va bene come base | m1.2 | tu |
| 2026-11-08 | Modalità nuovo, profondità standard | Q1, Q2 | tu |
| 2026-11-08 | Scrive l'agente ai checkpoint; l'osservatore solo segnala | Q3; conferma da docs/research.md §7.2 | tu |
| 2026-11-08 | Struttura su conferma, dettagli in automatico | Q4 | tu |
| 2026-11-08 | Prova obbligatoria per ogni nodo | Q5 | tu |
| 2026-11-08 | Limiti di leggibilità di default 3/3, regolabili per persona | Q6 | tu |
| 2026-11-08 | Nodo = decisione o risultato; i casi d'uso si ricavano dalle chat passate | Q7 | tu |
| 2026-11-08 | Aggiornamento ai checkpoint | Q8 | tu |
| 2026-11-08 | Riassunto compatto a ogni turno, calcolato senza modello | Q9 | tu |
| 2026-11-08 | LOG generato dal grafo, poi eliminato; export append-only per data | Q10 | tu |
| 2026-11-08 | Grafo in git, una sola fonte di verità | Q11 | tu |
| 2026-11-08 | Compiti e metriche come proposti; correzioni in chat; fuori ambito come proposto | Q13, Q15, Q16, Q17 | tu |

## Domande aperte

Round 2 — rispondi sotto ogni «Risposta:» (basta la lettera, o "ok" per la proposta ➡️).
Nascono dalle tue risposte, da `docs/research.md` §7 e dal metodo spec-driven (nodo `d3`).
Le più importanti: **Q18, Q19, Q22, Q25**. Q20 aspetta un fatto che sto cercando (strumenti nativi di Claude Code).

### Q12 — Dove approvi una proposta strutturale (frontend)
(a) Nella banda sopra il prompt: "Proposta: nuovo ramo «X» [Sì] [No] [Vedi]" · (b) Nel viewer, in una coda di proposte · (c) La banda avvisa e approva; il viewer mostra la proposta in grigio nel grafo, per vederla nel contesto.
➡️ (c): approvi senza lasciare il terminale (1 azione), e chi vuole capire dove cade il ramo lo vede nel grafo.
Risposta:

### Q18 — Indice e ritorno: la lista di domande (backend + frontend)
Il tuo caso: una decina di punti, ne discuti uno, vuoi tornare all'indice senza riscriverlo. (a) Un nodo "lista" i cui punti sono figli con stato (aperto / discusso / deciso); entrare in un punto sposta la posizione lì, e la banda mostra sempre "↩ Torna a: Round 2 (7/12 decisi)" · (b) Solo un segnalibro sul messaggio con la lista · (c) Niente di speciale: si scorre la chat.
➡️ (a): l'indice vive nel grafo, non nella chat, e il ritorno costa 1 azione; vale anche per le review con 10 punti.
Risposta:

### Q19 — Profili di intensità (da Q6)
(a) Tre profili per progetto — essenziale (2 rami / 2 nodi), standard (3/3), esteso (5/5) — scelti in un file di configurazione · (b) Numeri liberi · (c) Il sistema li adatta da solo all'uso.
➡️ (a): facile da scegliere e da confrontare; (c) è opaco e rende il grafo imprevedibile.
Risposta:

### Q20 — Questione laterale che rischia di sporcare la chat
Il tuo caso: in una review del frontend emerge un dubbio sul backend. (a) Deviazione nel grafo, nella stessa chat, con ritorno esplicito al punto lasciato · (b) Una conversazione separata (fork di Claude Code) registrata come ramo collegato, che a fine discussione porta indietro solo la decisione · (c) Entrambe: deviazione per le cose brevi, fork per quelle lunghe o con molto lavoro.
➡️ (c), da confermare quando arriva il censimento degli strumenti nativi (fork, /btw, rewind).
Risposta:

### Q21 — Cosa scrive l'agente (backend)
(a) Solo operazioni piccole e tipizzate, per id: aggiungi, chiudi, rimanda, collega, sostituisce, niente · (b) Il grafo intero riscritto.
➡️ (a): costano meno token, il validatore le controlla una per una e "niente" è un esito valido (docs/research.md §7.2).
Risposta:

### Q22 — Mai cancellare (backend + frontend)
Un nodo sbagliato o superato: (a) si marca "sostituito da Y" e il viewer lo nasconde di default, mostrandolo su richiesta · (b) si cancella.
➡️ (a): la storia resta fedele e spiegabile; il grafo che vedi resta pulito.
Risposta:

### Q23 — Decisioni firmate
(a) Ogni decisione registra se l'ha presa l'agente (proposta) o se l'hai confermata tu, con la data, anche quando va contro la raccomandazione; il viewer le distingue · (b) Non serve distinguerle.
➡️ (a): è la risposta più diretta a "il grafo deve coincidere col processo": si vede chi ha deciso cosa.
Risposta:

### Q24 — Nodo non ancora verificato (frontend)
La prova esiste ma il controllo che la sostenga è incerto. (a) Il nodo appare attenuato con un "?" e un motivo nel pannello · (b) Resta nascosto finché non è verificato · (c) Appare come gli altri.
➡️ (a): non perdi informazione, ma sai di cosa fidarti.
Risposta:

### Q25 — Il commit come prova (backend)
(a) Ogni commit porta una riga `Thread: <id del nodo>` nel corpo; il nodo ha così una prova verificabile e si può misurare il rework (un nodo chiuso e poi riaperto) · (b) No.
➡️ (a): costa una riga; collega codice e processo nei due sensi.
Risposta:

### Q26 — Il riassunto per l'agente: come si calcola (da Q9)
(a) Dal codice, senza modello, a ogni turno: il grafo cambia, il riassunto si aggiorna da solo; tetto fisso di 300 token, e se sfora si tagliano prima i rami lontani · (b) Lo scrive un modello a ogni checkpoint.
➡️ (a): zero token per produrlo, deterministico, sempre allineato al grafo.
Risposta:

### Q27 — Formato su disco (da Q11)
(a) Un file JSONL, un nodo per riga in ordine stabile: il diff mostra esattamente quali nodi sono cambiati · (b) Un file markdown per nodo, con intestazione · (c) Un unico markdown come `docs/process-trace.md` oggi.
➡️ (a): leggibile nei diff, facile da validare, il viewer lo legge com'è; la storia la dà git.
Risposta:

### Q28 — Cosa controlla l'osservatore (da Q3)
(a) Ai checkpoint confronta gli ultimi turni con il grafo e segnala nella banda: passo mancante, stato sbagliato, prova che non sostiene il nodo · (b) Rilegge l'intera sessione a ogni checkpoint · (c) Niente osservatore per ora.
➡️ (a), con costo misurato nel task `m2.4`; (b) solo a richiesta.
Risposta:

### Q29 — LOG append-only (da Q10)
(a) Una riga aggiunta a LOG.md ogni volta che un nodo si chiude, in ordine di data · (b) Un blocco a fine milestone.
➡️ (a): il LOG è sempre aggiornato e nessuno lo scrive a mano.
Risposta:
