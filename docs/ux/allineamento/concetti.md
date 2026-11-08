# Concetti — allineamento persona ↔ modello sul grafo
2026-11-08 · Fase 3 di `ux:design-flow` · Brief: `brief.md` (R1–R24)

Il brief fissa già molto: scrive l'agente ai checkpoint con una nota che lo scribe traduce in
operazioni (R1, R21); la struttura passa da una tua conferma nella banda (R2, R11); l'agente legge
un riassunto calcolato dal codice (R7). Resta aperta la domanda che decide il resto: **quando nasce
la struttura del grafo**. I tre concetti rispondono in modo diverso: prima (piano), dopo (diario),
mentre si lavora (pila di contesti). Da questa risposta dipendono quante conferme ti chiede,
quanto spazio ha lo scribe per inventare, e come funzionano liste, deviazioni e "↩ Torna a".

Un'azione = un clic, un tasto o una frase in chat chiusa da Invio (come nel brief).
Oggi = traccia e STATE.md scritti a mano dall'agente su tua richiesta, controllati da te leggendo
il diff.

## Schema dei nodi in comune

Una riga JSONL per nodo in `.ariadne/graph.jsonl` (R19). Parte dalla bozza dello spike
(`spikes/viewer/data.js`: `parent` = contenitore, `after` = ordine e prerequisiti).

| Campo | Cosa | Requisito |
|---|---|---|
| `id`, `title`, `kind` | `milestone` · `step` · `list` · `point` · `detour` | R5, R12 |
| `status` | `todo` · `active` · `done` · `deferred` · `replaced` | R15 |
| `parent`, `after` | livello e ordine | R4 |
| `what`, `why` | decisione o risultato in una riga; perché | R5 |
| `proof[]` | `{type: commit\|file\|message, ref}`; `uncertain: "<motivo>"` se non verificata | R3, R17 |
| `by`, `at` | chi ha deciso e quando (`agent` / `user`) | R16 |
| `confirmed` | `{at, ref}` per i nodi strutturali | R2 |
| `reentry` | per `detour` e rami: id del nodo dove rientra | R22 |
| `deferred_to`, `continues`, `replaced_by` | rinvii e sostituzioni | R15, vincolo m1.2 |

Ogni concetto aggiunge o toglie poco; le differenze sono indicate sotto.

---

## Concetto A — Piano prima

**Idea.** All'inizio di una milestone o di un passo l'agente propone il piano come nodi `todo`; tu
lo approvi una volta. Da lì i checkpoint *riempiono e chiudono* nodi già esistenti. Una struttura
nuova nasce solo quando il lavoro esce dal piano, ed è sempre una proposta.

**Storyboard — un passo si chiude e parte il successivo** (il compito di scrittura più frequente):
1. L'agente fa il commit → scrive la nota "m2.2 chiuso: concetti scritti, scelto A, prova commit abc".
2. Lo scribe la traduce in `close m2.2` + `start m2.3`: sono dettagli, entrano da soli (R2).
3. Tu vedi nella banda `m2 › m2.3 Dogfooding · prossimo: m2.4` → 0 azioni.

**Storyboard — il lavoro esce dal piano:**
1. Durante m2.3 serve un passo non previsto → la nota dice "serve un validatore prima della conversione".
2. Lo scribe emette `add step` → è struttura: diventa proposta, la banda mostra
   `Proposta: nuovo passo "Validatore" prima di m2.3.2 · [a]pprova [r]ifiuta`; il viewer la mostra in grigio.
3. Tu premi `a` → 1 azione.

**Liste e "↩ Torna a".** Una lista (es. le domande di un round) è un piano in piccolo: un nodo
`list` con i punti `todo` approvati in blocco. Tornare all'indice = il genitore del punto corrente;
la banda lo calcola dal lineage, senza operazioni in più.

**Deviazioni e rami.** Una deviazione è una proposta con `reentry` obbligatorio = il nodo del
piano da cui sei uscito. Il piano dice già dove rientrare.

**Schema.** Nodi `todo` con `proof = {type: message, ref: <proposta del piano>}`: la prova di un
nodo futuro è il momento in cui l'hai approvato.

Azioni tue per passo: 0 (dentro il piano) · 1 (fuori dal piano) · 1 per piano. Oggi: 1–2 (chiedi
l'aggiornamento, leggi il diff). Cambi di contesto: 0 (banda).

**Guadagni.** Lo scribe ha poco da inventare: chiude e riempie nodi esistenti, quindi i rami
allucinati sono impossibili senza una tua conferma (critica su haiku, R2, R14). Il grafo mostra
anche il futuro, coerente con il piano segnato fino in fondo (vincolo m1.2). È il principio Q6: lo
strumento guida il ragionamento invece di registrarlo. Riassunto per l'agente semplice: lineage +
prossimo `todo` (R7).

**Perdi.** Se il piano cambia spesso, le proposte si moltiplicano (rischio sulla metrica "≤ 1
rifiutata su 5"). Un piano approvato in fretta può contenere nodi che poi diventano `replaced`:
il grafo resta vero ma più affollato di nascosti (R15).

---

## Concetto B — Diario dopo

**Idea.** L'agente lavora libero; a ogni checkpoint scrive la nota e lo scribe ricava *dalla
nota* cosa è successo, struttura compresa. Le operazioni strutturali di un checkpoint arrivano
come un'unica proposta. Il futuro è solo il "prossimo passo", non un piano.

**Storyboard — un passo si chiude e parte il successivo:**
1. Commit → nota "concetti scritti, scelto A; ora dogfooding".
2. Lo scribe emette `close m2.2`, `add step "Dogfooding"`, `start` → `add` è struttura.
3. La banda mostra `Checkpoint: 1 passo nuovo · [a]pprova [v]edi` → tu premi `a`: 1 azione.

**Liste e "↩ Torna a".** La lista nasce quando lo scribe riconosce una lista nella nota; i punti
vengono aggiunti man mano che li discuti. "k/n decisi" è noto solo se la nota elenca tutti i punti.

**Deviazioni e rami.** Lo scribe deve capire dalla nota che sei uscito e dove rientri; se la nota
non lo dice, il validatore rifiuta il ramo (R22) e l'agente riscrive la nota.

**Schema.** Niente nodi `todo` oltre al prossimo passo; `proof` sempre a posteriori.

Azioni tue per passo: 1 (quasi ogni checkpoint ha struttura). Cambi di contesto: 0.

**Guadagni.** Il grafo coincide con ciò che è successo davvero, senza piani rimasti indietro
(critica "deve coincidere con il workflow adottato"). Nessuna fase di pianificazione.

**Perdi.** Tutta la struttura passa dallo scribe, cioè dal modello economico: è esattamente il
rischio "haiku crea rami ovunque" (R2 lo argina, ma a prezzo di una conferma quasi a ogni
checkpoint). Non vedi cosa resta da fare né i rinvii verso il futuro (vincolo m1.2). Liste e
rientri dipendono da quanto è completa la nota (R12, R22 deboli).

---

## Concetto C — Pila di contesti

**Idea.** La sessione è una pila: milestone › passo › lista › punto › questione laterale. L'agente
emette solo `apri` (push), `chiudi` (pop) e `rimanda`; il grafo è la storia della pila. La banda
*è* la pila.

**Storyboard — una questione laterale e ritorno:**
1. Mentre discuti Q3 di una lista apri una questione → l'agente emette `apri detour "Formato data"`
   → proposta nella banda, `a`: 1 azione.
2. La banda mostra `m2 › m2.2 › Domande (2/5) › Q3 › Formato data`.
3. Chiusa la questione, `chiudi` → la banda torna a `… › Q3`: il rientro è il livello sotto, per
   costruzione (R22).

**Liste e "↩ Torna a".** Naturali: "Torna a" = pop. È il caso che C risolve meglio (R12, R13).

**Deviazioni e rami.** Le deviazioni sono gratis; i rami paralleli (due passi aperti insieme) e i
rinvii a una milestone successiva non stanno in una pila: servono operazioni extra (`salta a`,
`rimanda`) che rompono il modello.

**Schema.** Aggiunge l'ordine di push/pop (o un campo `opened_from`); `reentry` è implicito.

Azioni tue per passo: 0–1. Cambi di contesto: 0.

**Guadagni.** "Dove sono" e "dove torno" sono sempre esatti e leggibili in una riga (metrica
"≤ 5 s guardando la banda"). Le operazioni sono poche e facili da validare (R14).

**Perdi.** Un `chiudi` dimenticato lascia la pila sporca: la banda mente finché non la correggi
(R10, fiducia). Il processo reale non è annidato: rinvii, rami che rientrano altrove e passi
paralleli (m2.4–m2.7 tutti aperti) non sono una pila. Non mostra il futuro.

---

## Confronto

| Requisito | A Piano prima | B Diario dopo | C Pila |
|---|---|---|---|
| R2 struttura su conferma, poche conferme | ✓ (solo fuori piano) | ~ (quasi ogni checkpoint) | ✓ |
| Rischio rami allucinati (critica haiku) | ✓ basso | ✗ alto | ~ medio |
| R3 prova per ogni nodo | ~ (i `todo` hanno solo la proposta) | ✓ | ✓ |
| R7 riassunto semplice da calcolare | ✓ | ~ (manca il futuro) | ✓ |
| R12 liste e "↩ Torna a" | ✓ | ~ | ✓ |
| R13/R22 deviazioni con rientro | ✓ | ~ | ✓ (solo se annidate) |
| Rinvii e piano fino in fondo (m1.2) | ✓ | ✗ | ✗ |
| Grafo = processo reale | ~ (`replaced` nascosti) | ✓ | ~ (pila sporca) |
| Principio Q6 (guidare, non rispecchiare) | ✓ | ✗ | ~ |
| Costo dello scribe | basso (chiude/riempie) | alto (inventa) | basso |

## Raccomandazione

**A — Piano prima**, prendendo da C solo la banda: `m2 › m2.2 › Domande (2/5)` si calcola dal
lineage del nodo corrente, quindi non servono operazioni push/pop né una pila da tenere pulita.

Perché: è l'unico concetto in cui lo scribe economico non decide la struttura, che è il rischio
principale del brief; rispetta il piano segnato fino in fondo con i rinvii; e applica il principio
Q6. B registra bene ma lascia la struttura al modello più debole; C è ottimo per le questioni
laterali ma non regge i rami paralleli e i rinvii, che questo repo usa già (m2.4–m2.7).

Rischio da tenere d'occhio nel prototipo: quante proposte "fuori piano" arrivano per passo. Se
sono più di una su cinque rifiutate (metrica del brief), il piano va proposto a grana più grossa.

**Scelta (2026-11-08, utente):** A, con la banda calcolata dal lineage come proposto.
