# Specifica — allineamento persona ↔ modello sul grafo
2026-11-08 · Fase 6 di `ux:design-flow` · Concetto A «Piano prima»
Riferimenti: `brief.md` (R1–R26), `concetti.md`, `prototipo/index.html`, `valutazione.md`

Descrive il comportamento, non il codice. Un'azione = un clic, un tasto o una frase in chat chiusa
da Invio (come nel brief). «Tu» = la persona che lavora con Claude Code.

## Pezzi del sistema

| Pezzo | Cosa fa | Scrive nel grafo? |
|---|---|---|
| Agente principale | lavora; a ogni checkpoint scrive la nota (R21); passa le tue correzioni | no, tramite lo scribe |
| Scribe | traduce la nota in operazioni tipizzate (R14) | sì, solo dopo il validatore |
| Validatore | rifiuta operazioni che rompono le regole (R2, R3, R5, R15, R16, R22, R25) | no |
| `ariadne` (CLI) | `apply`, `summary`, `show <id>`, `why <id>`; unica via di scrittura | sì |
| Hook di contesto | inietta il riassunto R7 all'avvio, dopo `/clear` e la compattazione, e a ogni turno | no |
| Banda (mod) | dove sei, rientri, proposte, coda al rientro, esito dell'ultima scelta | no (le tue scelte passano da `ariadne apply`) |
| Viewer (browser) | mostra il grafo in sola lettura (R10) | no |
| Osservatore | ai checkpoint confronta gli ultimi turni col grafo e segnala nella banda (R20) | no (R1) |

Prima che la mod esista (dogfooding, R24) ogni riga della banda diventa una riga in chat scritta
dall'agente e ogni pulsante la frase equivalente (tabella Interazioni). Il resto è uguale.

## Dati

### Nodo — `.ariadne/graph.jsonl`, una riga per nodo, ordine stabile (R19)

Schema di `concetti.md` § Schema, allineato al validatore attuale, più tre campi nuovi (★).

| Campo | Valori | Note |
|---|---|---|
| `id`, `title`, `kind` | `milestone` · `step` · `list` · `point` · `detour` | id stabile, mai riusato |
| `status` | `todo` · `active` · `done` · `deferred` · `replaced` | mai cancellare (R15) |
| `parent`, `after[]` | contenitore; ordine e prerequisiti | |
| `what`, `why`, `detail` | decisione o risultato in una riga (R5); perché; dettaglio libero | |
| `proof[]` | `{type: commit\|file\|message, ref}` | un nodo `todo` ha come prova il messaggio del piano approvato |
| `uncertain` | motivo, se la prova non è verificabile (R17) | |
| `by`, `at` | `agent` / `user`; data o data-ora ISO (R16) | |
| `confirmed` | `{at, ref}` per i nodi strutturali (R2) | `ref`: `banda`, `chat`, `revisione al rientro` |
| `reentry` | id dove rientra un `detour` o un ramo aperto (R22) | |
| `deferred_to`, `continues`, `replaced_by` | rinvii e sostituzioni | |
| ★ `mandate` | solo sulle milestone: `{at, ref, allow[]}` | cosa l'agente può fare da solo (R25) |
| ★ `review` | `confirm` · `decide` | in coda per il rientro (R26); sparisce quando decidi |
| ★ `prudent` | l'opzione prudente scelta, solo con `review: decide` | |

Mandato di default quando approvi un piano: `allow: ["step", "detour"]` dentro la milestone corrente.
Mai nel mandato: milestone nuove, rinvii (`deferred`), sostituzioni (`replaced`), spostamenti,
cambi di `what` di una milestone.

### Stato del filo — `.ariadne/thread.json`

`{project, current, profile, last_correction?}`. `profile`: `essenziale` (2/2) · `standard` (3/3,
default) · `esteso` (5/5) (R4). `last_correction`: l'ultima operazione `move` tua con i valori
precedenti, per annullarla (valutazione § Correzioni 5).

### Diario — `.ariadne/log.jsonl` (R8)

Append-only, una riga per nodo chiuso (`done`, `deferred`, `replaced`), in ordine di data:
`{at, id, status, what, proof}`. Generato da `ariadne apply`, mai scritto a mano. Sostituisce LOG.md.

## Operazioni (R14)

> **Cambiato il 2026-11-11** (`brief.md` § Decisioni, `implementazione.md` § m3.6): ogni operazione entra
> subito; la struttura decisa dall'agente resta `review: confirm`. Mandato, `review: decide`, `prudent`,
> ◆ Proposta in attesa e la distinzione accompagnato / da solo non valgono più. Le regole sotto restano
> come storia del concetto A.

L'unico modo di cambiare il grafo. Ogni operazione nomina i nodi per id.

| Operazione | Effetto | Tipo |
|---|---|---|
| `plan {parent, nodes[], mandate}` | aggiunge i nodi `todo` del piano approvato; registra il mandato | struttura, approvata dal piano stesso |
| `start {id}` | `todo` → `active`; diventa `current` | dettaglio |
| `close {id, what, proof[]}` | `active` → `done` con la prova (R3) | dettaglio |
| `fill {id, why?, detail?, proof[]?}` | completa campi descrittivi | dettaglio |
| `add {node}` | nodo fuori piano (`step`, `list`, `point`, `detour`, `milestone`) | struttura |
| `defer {id, to}` | `deferred` + crea il nodo che lo riprende in una milestone successiva (vincolo m1.2) | struttura |
| `replace {id, by}` | `replaced`, punta al successore (R15) | struttura |
| `move {id, parent, after?}` | correzione tua (R10) | struttura, firmata da te |
| `confirm {id}` · `reject {id}` | esito di una proposta o di una voce in coda | tua scelta |
| `none` | il checkpoint non cambia il grafo | — |

- **Dettagli** entrano subito (R2). Eccezione: i punti di una lista approvata in blocco sono dettagli.
- **Struttura**, sessione accompagnata: diventa una ◆ Proposta; il grafo non cambia finché non approvi.
- **Struttura**, lavoro da solo: dentro il mandato entra subito con `review: confirm`; fuori dal
  mandato non entra: lo scribe aggiunge un nodo `review: decide` con l'opzione `prudent`, e l'agente
  prosegue con quella (R25).
- **Lavoro da solo** inizia quando dici all'agente di proseguire senza di te ("vai avanti da solo",
  `/loop`, lavoro in background) e finisce al tuo messaggio successivo: quello è il rientro (R26).
- Una proposta rifiutata non lascia nodi. Una voce `confirm` rifiutata al rientro diventa `replaced`
  (con `replaced_by` = il nodo del piano da cui era uscita) e resta tracciata.

## Scribe (R21)

- **Quando:** a ogni checkpoint (R6): commit, passo chiuso, cambio di argomento, tua richiesta.
  Fuori dai checkpoint nessuna scrittura.
- **Ingresso:** la nota dell'agente (1–3 righe: cosa, perché, prova), il nodo corrente con i suoi
  figli e fratelli `todo`, il mandato della milestone, se il lavoro è accompagnato o da solo.
- **Uscita:** solo un array JSON di operazioni dalla tabella sopra. Niente testo.
- **Modello:** il più economico disponibile (Haiku); scelta definitiva dopo la misura di `m2.4`.
- **Prompt (bozza):** «Sei lo scribe di un grafo di processo. Ricevi una nota e il piano attorno al
  nodo corrente. Traduci la nota in operazioni. Preferisci sempre `close`, `start` e `fill` su nodi
  che esistono già. Usa `add` solo se la nota dice esplicitamente che il lavoro esce dal piano, e
  allora metti `reentry` per i `detour`. Se la nota non cambia nulla, rispondi `[{"op":"none"}]`.
  Ogni `close` ha una prova presa dalla nota; se la nota non ne ha, non chiudere.»
- **Rifiuto del validatore:** le operazioni non entrano; l'agente riceve gli errori (una riga per
  regola, come `validate.mjs`) e riscrive la nota una volta. Al secondo rifiuto la banda mostra
  l'errore e il checkpoint resta senza aggiornamento finché non intervieni.

## Flusso dei compiti (oggi → progetto)

| Compito | Oggi | Progetto | Azioni |
|---|---|---|---|
| Sapere dove sei e cosa viene dopo | leggere STATE.md o chiedere | guardare la riga «dove» della banda | 1 → 0 |
| Riprendere dopo `/clear` | hook inietta STATE.md (~700 token) | hook inietta il riassunto R7 (137 token nel prototipo, ≤ 300) | 0 → 0 |
| Ricostruire perché | grep su LOG.md e traccia a mano | clic sul nodo nel viewer (pannello «Perché», «Prova»); l'agente usa `ariadne why <id>` | ≥ 2 → 1 |
| Verificare che il grafo dica il vero | leggere il diff | validatore automatico; nodi incerti attenuati; segnalazioni dell'osservatore nella banda | 1–2 → 0 |
| Approvare una proposta strutturale | — | «Approva» nella banda (o «approvo») | 1 |
| Discutere un punto e tornare all'indice | scorrere o riscrivere | «Torna alla lista», poi il numero del punto | 2 |
| Questione laterale e ritorno | resta nella chat | `/btw <argomento>`, poi «Chiudi e torna» | 2 |
| Rientro dopo lavoro da solo | — | riepilogo e coda appaiono da soli; «Approva tutto» | 0 / 1 |
| Correggere un nodo | — | «sposta <id> sotto <id>»; annullare: «annulla l'ultima correzione» | 1 |
| Approvare il piano di una milestone | — | «approvo» al piano proposto in chat, mandato di default incluso | 1 |

## Schermate e stati

### Banda (sopra il prompt)

Righe in quest'ordine, al più quattro, una riga ciascuna; titoli tagliati con «…» (dove 44 caratteri
per il nodo corrente, 24 per i contenitori, 30 per «prossimo», 38 altrove). Il viewer ha i titoli interi.

1. **Dove** (sempre): `<milestone> › <passo> › **<nodo corrente>** · prossimo: <titolo> [Apri il grafo]`.
   «Apri il grafo» apre il viewer nel browser e lo avvia se è spento (`ariadne open`); anche
   «Mostra nel grafo» passa da lì.
   I nodi `list` non compaiono nel percorso. «prossimo» si omette quando c'è la riga 2 (valutazione
   § Correzioni 7) o quando il piano non ha un prossimo passo.
2. **Contesto** (una sola, in quest'ordine di precedenza):
   - deviazione aperta: `⤷ deviazione · rientro: <titolo> [Chiudi e torna]`
   - dentro una lista: `↩ <lista> (k/n decisi) [Torna alla lista]`
   - rami aperti in sospeso (R22), se nessuna delle due: `⤷ k rientri in sospeso: <titolo> → <rientro>` (il primo; gli altri nel viewer)
3. **Coda al rientro** (se ci sono nodi con `review`):
   - prima vista: `⏎ Mentre eri via: c da confermare, d da decidere [Approva tutto] [Rivedi una per una]`
   - una per una: `⏎ Da confermare i/n: <testo> [Approva] [Rifiuta] [Mostra nel grafo]` oppure
     `⏎ Da decidere i/n: <testo> [Fallo] [Lascia così]`
4. **Ultima riga** (una sola):
   - proposta in attesa: `◆ Proposta: <testo> [Approva] [Rifiuta] [Mostra nel grafo]`; con più
     proposte `◆ Proposta i/n: …`, una alla volta
   - errore del validatore o segnalazione dell'osservatore: `⚠ <testo> [Mostra nel grafo]`
   - altrimenti l'esito dell'ultimo aggiornamento o della tua ultima scelta: `↺ <testo>` (verde),
     finché non arriva il checkpoint successivo

Stati: grafo assente → solo `ariadne: nessun grafo in .ariadne/ · l'agente lo crea con il primo piano`;
grafo non valido → riga 1 calcolata dall'ultimo stato valido e `⚠ grafo non valido: <prima regola rotta> (+k)`.

### Viewer (browser)

- **Ordine:** riassunto per l'agente (nascosto, si apre con «Cosa legge l'agente»), poi le
  milestone in ordine, ognuna con i suoi figli; legenda compatta in fondo (valutazione § Correzioni 4).
- **Nodo:** simbolo di stato · id · titolo · `?` se incerto · etichetta a destra. Simboli: `✓` fatto,
  `●` attivo, `○` da fare, `↷` rimandato, `⊘` sostituito o rifiutato, `⤷` deviazione, `+` proposta.
  Etichetta: `proposta` · `da confermare` · `da decidere` · `rifiutato` · `→ <id>` (rimandato) ·
  `k/n` (lista) · `da te` se deciso da te (al posto di «tu», valutazione § Correzioni 4).
- **Filo:** il nodo corrente ha il bordo rosso; il lineage a ritroso (dipendenze di `after`,
  `continues`, contenitori) è collegato da una linea rossa.
- **Proposta:** il nodo proposto appare tratteggiato in grigio nel punto dove cadrebbe; «Mostra nel
  grafo» lo fa lampeggiare e scorre fino a lui.
- **Da confermare:** tratteggiato arancione. **Rifiutato:** barrato, attenuato, `⊘`.
- **Incerto:** attenuato con `?`; il motivo al passaggio del mouse e nel pannello (R17).
- **Raggruppamento (R4):** per livello al più N figli aperti (profilo). La finestra contiene sempre
  il nodo corrente, ciò che lo contiene o il nodo da cui parte la deviazione corrente. I nascosti si
  dicono con la posizione: `k nascosti sopra · mostra` e/o `k nascosti sotto · mostra` (valutazione
  § Correzioni 9). «mostra» apre il livello per intero; l'esplorazione non è mai rifiutata.
- **Sostituiti:** nascosti di default (R15); `k sostituiti · mostra` in fondo al livello.
- **Pannello di dettaglio** (clic su un nodo; secondo clic lo chiude): Cosa · Perché · Stato ·
  Prova · Incerto · Deciso da (`da te` / `agente`, data) · Confermato · Da confermare · Mandato ·
  Rientra in · Rimandato a · Riprende · Sostituito da. Solo le righe con un valore.
- **Aggiornamento:** il viewer legge `.ariadne/` (F5 o ricarica automatica quando il file cambia);
  il layout non sposta i nodi già piazzati (`m2.6`).

Stati del viewer:

| Stato | Cosa mostra |
|---|---|
| Nessun file | «Nessun grafo in `.ariadne/graph.jsonl`. Si crea quando approvi il primo piano.» |
| File non valido | i nodi leggibili, più una fascia «Grafo non valido: k errori» con le righe del validatore |
| Milestone senza piano | «Piano non ancora proposto: l'agente lo propone quando si apre la milestone.» |
| Lista vuota | «Nessun punto: la lista si riempie quando approvi i punti.» |
| Titolo lungo | va a capo, mai tagliato; id e simbolo restano sulla prima riga |
| Molte prove | le prime 3, poi `+k` che apre l'elenco nel pannello |
| Molti rientri in sospeso | tutti nel riassunto in cima e marcati `⤷` nel grafo |

### Riassunto per l'agente (R7)

Calcolato da `ariadne summary`, mai scritto da un modello. Iniettato all'avvio, dopo `/clear` e
la compattazione, e a ogni turno. Formato (dal prototipo):

```
Sei in: <milestone> › <passo> › <nodo> (<stato>)
Da dove viene (solo le dipendenze):
- <id> <titolo>: <what> [(incerto: <motivo>)]
Rientri in sospeso: nessuno | - <titolo> → rientra in <id>
Da rivedere al rientro: c da confermare, d da decidere   ← solo se ci sono
Prossimo: <id> <titolo> | nessuno nel piano
Per approfondire: ariadne show <id> · ariadne why <id>
```

Al più 3 dipendenze, le più vicine. Oltre 300 token si tagliano prima le dipendenze più lontane,
mai «Sei in», i rientri e «Prossimo».

### Rientro (R26)

Al tuo primo messaggio dopo un lavoro da solo con voci in coda: in chat il riepilogo («Mentre eri
via: k checkpoint. Dentro il mandato ho …, da confermare. Fuori dal mandato non ho applicato nulla:
…; ho scelto <prudente>.») e nella banda la riga 3. Il riepilogo si calcola dal diario e dai nodi
con `review`, non dalla memoria dell'agente.

## Interazioni

Ogni pulsante della banda ha una frase equivalente in chat: si fa tutto da tastiera, senza tasti nascosti.

| Azione | Banda / viewer | Chat | Risposta visibile | Annullabile? |
|---|---|---|---|---|
| Approvare una proposta | «Approva» | «approvo» / «sì» / «ok» | `↺ approvato: <testo>`; il nodo diventa pieno | sì: «sposta» o `replace` |
| Rifiutare una proposta | «Rifiuta» | «rifiuto» / «no» | `↺ rifiutato, il grafo non cambia: <testo>` | — |
| Vedere la proposta nel grafo | «Mostra nel grafo» | — | il nodo lampeggia nel viewer | — |
| Tornare alla lista | «Torna alla lista» | «torna» | indice in chat (`✓` deciso, `▶` corrente, `·` da fare) + «Scrivi il numero del punto da discutere.» | — |
| Scegliere un punto | — | il numero | `↺ ora su: punto k` | sì: «torna» |
| Aprire una questione laterale | — | `/btw <argomento>` | deviazione `⤷` nel grafo, riga 2 della banda | sì: «Chiudi e torna» |
| Chiudere la questione | «Chiudi e torna» | «torna» | `↺ deviazione chiusa · rientrato in <titolo>` | — |
| Questione lunga | — | `/subtask` o `/branch` | ramo collegato al nodo di origine (R13) | — |
| Approvare tutta la coda | «Approva tutto» | «approvo tutto» | `↺ confermate tutte le modifiche fatte in tua assenza`; le voci «da decidere» restano con l'opzione prudente | ogni voce: «sposta» o `replace` |
| Rivedere una per una | «Rivedi una per una» | «una per una» | prima voce `i/n` | — |
| Confermare / rifiutare una voce | «Approva» / «Rifiuta» | «approvo» / «rifiuto» | `↺ confermato: …` / `↺ rifiutato, resta tracciato fuori dal piano: …` | — |
| Decidere una voce fuori mandato | «Fallo» / «Lascia così» | «fallo» / «lascia così» | `↺ la milestone arriverà come proposta` / `↺ il piano non cambia` | — |
| Correggere un nodo | — | «sposta <id> sotto <id>» | `↺ <id> spostato sotto <id> (correzione tua)`; il nodo si sposta | sì |
| Annullare la correzione | — | «annulla l'ultima correzione» | `↺ annullato: <id> torna sotto <id>` | una volta |
| Leggere un nodo | clic nel viewer | `ariadne show <id>` | pannello di dettaglio | — |

Regole:
- Con una proposta in attesa, l'agente non apre deviazioni né prosegue il piano: «C'è una proposta
  in attesa: approvala o rifiutala nella banda.»
- «Lascia così» non sparisce senza traccia (valutazione § Correzioni 8): il nodo `review: decide`
  diventa `done`, `what` = «Deciso: <prudente>», `by: user`, `confirmed`. «Fallo» lo chiude allo
  stesso modo e l'agente propone la modifica come ◆ Proposta (o come piano, se è una milestone).
- «annulla l'ultima correzione» vale solo per l'ultima `move` tua e solo se nessuna operazione
  successiva ha toccato quel nodo; altrimenti: «Non posso annullarla: <id> è cambiato dopo. Dimmi
  dove spostarlo.»
- Ogni commit porta la riga `Thread: <id>` del nodo corrente (R18). Riaprire un nodo `done` (rework)
  è `start` su quel nodo: resta nel diario come chiuso e poi riaperto.

## Testi

| Dove | Testo esatto |
|---|---|
| Banda, coda | `⏎ Mentre eri via: c da confermare, d da decidere` |
| Banda, pulsanti | `Apri il grafo` · `Approva` · `Rifiuta` · `Mostra nel grafo` · `Torna alla lista` · `Chiudi e torna` · `Approva tutto` · `Rivedi una per una` · `Fallo` · `Lascia così` |
| Chat, indice | `↩ <lista> (k/n decisi)` … `Scrivi il numero del punto da discutere.` |
| Chat, numero sbagliato | `Numero fuori lista.` |
| Chat, «torna» fuori contesto | `Non sei dentro una lista: niente a cui tornare.` |
| Chat, proposta in attesa | `C'è una proposta in attesa: approvala o rifiutala nella banda.` |
| Chat, nodo non trovato | `Non trovo uno dei due nodi: usa l'id che vedi nel viewer (es. «sposta m2.1b sotto m1»).` |
| Chat, correzione fatta | `Spostato «<titolo>» sotto «<titolo>». Firmato da te, con la data di oggi.` |
| Chat, deviazione aperta | `Apro una deviazione: «<titolo>». Rientro in <id> quando chiudiamo («Chiudi e torna» nella banda).` |
| Chat, approva tutto | `Approvate tutte le modifiche fatte in tua assenza; le decisioni aperte restano come le aveva lasciate l'agente.` |
| Chat, voce rifiutata | `Rifiutato (resta tracciato, fuori dal piano): <testo>.` |
| Viewer, legenda | `● corrente (bordo rosso) · linea rossa: da dove viene · ✓ fatto · ○ da fare · ↷ rimandato · ⊘ sostituito o rifiutato · ⤷ deviazione · tratteggio grigio: proposta · tratteggio arancione: da confermare · ? prova incerta · da te: deciso da te` |
| Viewer, raggruppamento | `k nascosti sopra · mostra` · `k nascosti sotto · mostra` · `k sostituiti · mostra` |
| Validatore | una riga per regola rotta: `riga <n> <id> <regola>: <messaggio>` (come `validate.mjs`) |

La riga gialla e la riga di guida del prototipo non fanno parte del prodotto (H8, H10).

## Accessibilità

- Viewer: ogni nodo è un `button`; ordine di tabulazione = ordine del grafo; focus visibile
  (contorno di 2 px, contrasto ≥ 3:1); Invio apre il pannello, Esc lo chiude.
- Lo stato non si affida al colore: simbolo ed etichetta testuale su ogni nodo; `?` ha il motivo
  come testo accessibile (`aria-label`), non solo come `title`.
- Contrasto del testo ≥ 4,5:1, anche per i nodi attenuati (si attenua lo sfondo, non il testo sotto soglia).
- Banda: regione `aria-live="polite"` dove la mod lo permette; ogni pulsante ha una frase equivalente
  in chat (tabella Interazioni).
- Il lampeggio di «Mostra nel grafo» rispetta `prefers-reduced-motion` (bordo fisso invece del lampeggio).

## Criteri di accettazione

Verificabili sul prodotto vero (grafo di questo repo e mod). Uno per requisito.

| # | Criterio |
|---|---|
| R1 | nessun nodo ha come autore l'osservatore; l'osservatore non chiama `ariadne apply` |
| R2 | ogni nodo strutturale ha `confirmed` con data, o `review: confirm` dentro il mandato |
| R3 | `validate.mjs` → 0 nodi senza prova o senza `uncertain` |
| R4 | un livello con 10 figli mostra ≤ N aperti più «k nascosti … · mostra», e il nodo corrente è sempre visibile |
| R5 | nessun nodo con `what` vuoto o che descrive un turno («ho letto il file») |
| R6 | ogni riga di `log.jsonl` corrisponde a un checkpoint (commit, passo chiuso, cambio di argomento, richiesta) |
| R7 | `ariadne summary` ≤ 300 token, 0 chiamate a modelli, presente dopo `/clear` e dopo la compattazione |
| R8 | `log.jsonl` append-only in `.ariadne/`; nessun STATE.md né LOG.md in radice |
| R9 | STATE.md e Next non più scritti a mano; il grafo è l'unica fonte |
| R10 | una correzione = 1 frase; il viewer non ha controlli di modifica |
| R11 | approvare = 1 clic nella banda o 1 frase, senza lasciare il terminale |
| R12 | tornare all'indice = 1 azione; la banda mostra sempre `↩ <lista> (k/n decisi)` dentro una lista |
| R13 | ogni `/btw`, `/subtask`, `/branch` ha un nodo con `reentry` sul punto di partenza |
| R14 | `ariadne apply` accetta solo operazioni della tabella; 0 riscritture del file intero (il diff mostra solo i nodi cambiati) |
| R15 | ogni nodo `replaced` ha un `replaced_by` esistente; nessun nodo cancellato tra due commit |
| R16 | 100% dei nodi con `by` e `at`; il viewer mostra «da te» o «agente» |
| R17 | ogni nodo con `uncertain` è attenuato con `?` nel viewer e marcato «incerto» nel riassunto |
| R18 | 100% dei commit con `Thread: <id>`; un rework compare nel diario come chiusura, riapertura, chiusura |
| R19 | due `ariadne apply` sullo stesso grafo danno lo stesso ordine di righe |
| R20 | l'osservatore scrive solo nella banda; costo per checkpoint misurato in `m2.4` |
| R21 | ogni operazione applicata viene da una nota; al secondo rifiuto del validatore la banda mostra l'errore |
| R22 | 0 rami o deviazioni aperti senza `reentry`; ognuno compare nel riassunto e nella banda |
| R23 | oltre il profilo, l'agente propone un contenitore e il livello si raggruppa solo dopo la tua conferma |
| R24 | il grafo di questo repo è aggiornato a ogni checkpoint e `validate.mjs` dice `ok` |
| R25 | il validatore rifiuta un nodo `review: confirm` di tipo non ammesso dal mandato; in lavoro da solo 0 modifiche fuori mandato applicate |
| R26 | al rientro il riepilogo appare senza azioni; «Approva tutto» = 1 azione; una voce rifiutata è `replaced` e visibile |

Metriche del brief, dopo una settimana d'uso: ≥ 90% di nodi giusti senza ritocchi; ≤ 1 proposta
rifiutata su 5; dove sei in ≤ 5 s dalla banda; token per turno sotto i ~700 di oggi; ≤ 1 voce su 5
rifiutata al rientro.

## Cosa cambia rispetto a oggi

- **Tolti** (quando `ariadne summary` funziona, R8, R24): `STATE.md` e `LOG.md` in radice;
  l'iniezione di STATE.md nell'hook di avvio, sostituita dal riassunto R7; la riga del CLAUDE.md
  che chiede di aggiornare `.ariadne/graph.jsonl` a mano, sostituita dal flusso nota → scribe.
- **Spostati:** il viewer dello spike legge `.ariadne/` invece di `spikes/viewer/data.js`.
- **Aggiunti:** campi `mandate`, `review`, `prudent` (validatore da estendere: regola del mandato,
  `review: decide` richiede `prudent`, `review` esenta da `confirmed`); `thread.json.last_correction`;
  `.ariadne/log.jsonl`; CLI `ariadne` (`apply`, `summary`, `show`, `why`); scribe; banda della mod;
  legenda e «da te» nel viewer.
- **Restano:** `docs/process-trace.md` congelato; `scripts/ariadne/convert-trace.mjs` (una tantum).

## Rischi da verificare in implementazione

- Distinguere «accompagnato» da «da solo» dipende da come l'agente segue l'istruzione: da misurare
  nel dogfooding (voci in coda create mentre eri presente = errore).
- API della mod in early access; aperte in `m2.7` le verifiche su `/btw`, canale browser → mod e scroll.
- `break-ui` non è stato eseguito sul prototipo, che verrà buttato: i casi limite sono nelle tabelle
  di stato sopra; da rifare sul viewer vero prima di chiudere M3.
