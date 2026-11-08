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
| R4 | Limiti di leggibilità per livello (profili essenziale 2/2, standard 3/3, esteso 5/5): limitano quanto si vede aperto a un livello, mai quanto si esplora; oltre, i nodi si raggruppano in un sotto-livello (Q6, Q19) | un ramo con 10 aspetti resta leggibile: ≤ N figli aperti per livello, nessuna esplorazione rifiutata | deve |
| R5 | Un nodo è una decisione o un risultato verificabile, non un turno né un'azione (Q7) | nessun nodo senza decisione o risultato nel campo "cosa" | deve |
| R6 | Aggiornamento ai checkpoint: commit, passo chiuso, cambio di argomento, tua richiesta (Q8) | nessuna scrittura fuori da un checkpoint | deve |
| R7 | All'agente, a ogni turno, un riassunto calcolato dal codice: il lineage a ritroso del passo corrente (solo le sue dipendenze), i rami che divergono e dovranno rientrare in una riga ciascuno, il prossimo passo, e come chiedere più contesto (Q9, Q26) | ≤ 300 token; 0 token di modello per produrlo; presente anche dopo la compattazione | deve |
| R8 | LOG append-only dentro `.ariadne/`, una riga per nodo chiuso in ordine di data; STATE.md e LOG.md in radice spariscono (Q10, Q29) | nessun file di stato fuori da `.ariadne/` | dovrebbe |
| R9 | Il grafo è versionato in git, in un formato leggibile nei diff: una sola fonte di verità (Q11) | STATE.md e Next non scritti più a mano | deve |
| R10 | Correzioni in chat ("sposta X sotto Y"); il viewer resta di sola lettura (Q16) | una correzione = 1 azione | deve |
| R11 | Proposte strutturali: la banda avvisa e fa approvare, il viewer le mostra in grigio nel punto dove cadrebbero (Q12) | approvare = 1 azione, senza lasciare il terminale | deve |
| R12 | Una lista di punti (domande, review) è un nodo con i punti come figli e stato; la banda mostra sempre "↩ Torna a: <lista> (k/n decisi)" (Q18) | tornare all'indice = 1 azione | deve |
| R13 | Questione laterale: deviazione nel grafo se breve; `/subtask` o `/branch` se lunga, registrati come ramo collegato al punto di partenza (Q20) | ogni `/branch` o `/subtask` ha il suo nodo di origine | dovrebbe |
| R14 | L'agente emette solo operazioni tipizzate per id (aggiungi, chiudi, rimanda, collega, sostituisce, niente) (Q21) | 0 riscritture del grafo intero | deve |
| R15 | Mai cancellare: un nodo superato punta al successore ed è nascosto di default (Q22) | ogni nodo "sostituito" ha un successore esistente | deve |
| R16 | Ogni decisione dice chi l'ha presa (agente / tu) e quando; il viewer le distingue (Q23) | 100% delle decisioni con autore e data | deve |
| R17 | Un nodo con prova incerta appare attenuato con "?" e il motivo (Q24) | nessun nodo incerto mostrato come verificato | deve |
| R18 | Ogni commit porta `Thread: <id>`; il rework è un nodo chiuso e poi riaperto (Q25) | 100% dei commit con la riga; rework contabile | deve |
| R19 | Formato: JSONL, un nodo per riga in ordine stabile, in `.ariadne/` versionato (Q27, Q11) | il diff di un commit mostra solo i nodi cambiati | deve |
| R20 | L'osservatore, ai checkpoint, confronta gli ultimi turni col grafo e segnala nella banda; rilettura completa solo a richiesta (Q28) | nessuna scrittura dell'osservatore; costo misurato in `m2.4` | deve |

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
| 2026-11-08 | Approvazione nella banda, anteprima in grigio nel viewer | Q12 | tu |
| 2026-11-08 | Le liste sono nodi con "↩ Torna a" | Q18 | tu |
| 2026-11-08 | I profili limitano la vista per livello, non l'esplorazione | Q19 | tu |
| 2026-11-08 | Questioni laterali: deviazione, `/subtask` o `/branch` | Q20 | tu |
| 2026-11-08 | Operazioni tipizzate; idea di uno scribe dedicato da valutare | Q21 | tu |
| 2026-11-08 | Mai cancellare; decisioni firmate; nodi incerti attenuati; `Thread:` nei commit | Q22–Q25 | tu |
| 2026-11-08 | Riassunto dal codice con lineage a ritroso e istruzioni per approfondire | Q26 | tu |
| 2026-11-08 | JSONL in `.ariadne/`; osservatore che segnala; LOG dentro `.ariadne/` | Q27–Q29 | tu |

## Domande aperte

Round 3 — l'ultimo prima dei concetti (fase 3). Rispondi sotto ogni «Risposta:».

### Q30 — Lo scribe (da Q21)
Mi dici dov'è l'agente "task scribe"? Non l'ho trovato in `~/Sviluppo` né nei tuoi repo su GitHub.
Intanto la scelta: (a) l'agente principale chiama direttamente le operazioni tipizzate · (b) l'agente principale, al checkpoint, scrive una nota di 1–3 righe (cosa, perché, prova) e uno scribe economico (Haiku/Sonnet) la traduce in operazioni, che il validatore controlla · (c) lo scribe legge da solo gli ultimi turni e decide cosa scrivere.
➡️ (b): il "perché" lo dà chi ha lavorato (R1), la fatica di formattare la fa un modello economico; (c) è l'osservatore che inventa, cioè il rischio da evitare.
Risposta:

### Q31 — Rami che devono rientrare (da Q26)
(a) Quando nasce un ramo si dichiara dove rientra (es. "torna in m1.3"); finché è aperto compare nel riassunto e nella banda come "rientro in sospeso" · (b) Nessun punto di rientro dichiarato: si vede solo che è aperto.
➡️ (a): "prima o poi dovranno tornare a unirsi" diventa una promessa che il sistema ricorda; è la stessa regola dei rinvii.
Risposta:

### Q32 — Raggruppare quando un livello si riempie (da Q19)
Sei al limite del profilo e arriva un nodo nuovo. (a) L'agente propone un nodo contenitore che raccoglie i fratelli affini, e tu confermi (è struttura) · (b) Raggruppa da solo, annullabile · (c) Solo un avviso.
➡️ (a): coerente con R2 (la struttura è tua) e non blocca nulla.
Risposta:

### Q33 — Iniziare a usarlo prima che esista la mod
(a) Subito, a mano: converto `docs/process-trace.md` in `.ariadne/graph.jsonl`, scrivo il validatore come script, e io (l'agente) aggiorno il grafo con le regole del brief a ogni checkpoint; STATE/LOG restano finché il riassunto non li sostituisce · (b) Solo quando c'è la mod (M3).
➡️ (a): misuriamo da subito token, errori e leggibilità sul caso vero (Q15), e il formato si stabilizza prima di scrivere la mod.
Risposta:
