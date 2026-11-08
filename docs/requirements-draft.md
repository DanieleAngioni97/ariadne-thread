# Requisiti — bozza

*2026-11-07. Prima stesura, da rifinire in M1. Raccoglie `docs/vision.md` e le decisioni di M0
(`docs/analysis-mod.md`). Ogni requisito ha un id per poterlo citare nei nodi e nei test.*

## Forma del prodotto

- **F1** Una mod di Claude Code legge la chat e aggiorna il grafo in automatico.
- **F2** Il grafo vive in `.ariadne/`, **versionato in git** come JSONL: una sola fonte di verità (brief R9, R19).
- **F3** Nel terminale resta solo una banda sopra il prompt: dove sei, da dove vieni, cosa è aperto.
- **F4** Il grafo si guarda in un viewer web locale, nel browser, che si aggiorna in diretta.
- **F5** Il viewer legge solo il file: funziona anche con un grafo scritto a mano.
- **F6** Il grafo sostituisce STATE.md, LOG.md e Next: il LOG è append-only dentro `.ariadne/` (brief R8, R24).
- **F7** Licenza Apache-2.0.

## Livelli e annidamento

- **L1** Ogni nodo può contenere un sotto-grafo: un ramo nasce come un solo nodo e si può
  "esplodere" nei suoi passaggi, ognuno dei quali può a sua volta contenerne altri.
- **L2** Si espande e si richiude un nodo sul posto, senza perdere di vista il resto.
- **L3** Si può restringere la vista: per milestone, per ramo, per livello di dettaglio
  (solo milestone → passaggi → tutto).
- **L4** Due relazioni distinte: *contiene* (livelli) e *dipende da* (ordine e prerequisiti).

## Stato visibile

- **S1** Ogni nodo mostra a colpo d'occhio se è fatto, in corso, da fare o abbandonato.
- **S2** La posizione corrente è sempre evidente, a ogni livello: se il nodo corrente è dentro un
  nodo chiuso, il nodo chiuso lo segnala.
- **S3** Il percorso che ha portato al punto corrente (il filo) si distingue dal resto.
- **S4** Le **deviazioni** si vedono come tali: una domanda laterale (es. `/btw`) o una
  digressione che non c'entra con il piano esce dalla linea principale e, se c'è, vi rientra.

## Contesto al click

- **C1** Hover: una frase che dice perché il nodo esiste.
- **C2** Click: un pannello con perché, a cosa serve, da dove viene, cosa ha aperto.
- **C3** I **file di riferimento** del nodo (letti, modificati, citati), apribili con un click.
- **C4** I **momenti della chat** legati al nodo: estratti dei messaggi, leggibili subito nel
  viewer, anche per sessioni passate.
- **C5** **Salto alla chat**: da un momento si torna a quel punto della conversazione (vedi sotto).
- **C6** Segnalibri: un punto della chat marcato a mano diventa un nodo (o un momento di un nodo).

## Salto alla chat: come funziona

Claude Code lascia scorrere la chat a una mod solo in risposta a un input della persona dentro
Claude Code (un click o un tasto nel terminale). Un click nel browser non conta. Per questo:

1. **Leggere il contesto non richiede salti.** La mod salva, per ogni momento, l'id del
   messaggio, la sessione e un estratto. Il viewer li mostra nel pannello del nodo.
2. **"Mostra in chat" dal viewer** manda la richiesta alla mod. Nel terminale la banda diventa
   `↪ Vai a: <momento>  [ Vai ]`: un click o un tasto lì fa scorrere la chat al messaggio.
3. **Momento di una sessione passata**: il viewer offre il comando per riprenderla
   (`claude --resume <sessione>`) e poi vale il punto 2.

Da verificare nello spike della mod: il canale viewer → mod (il viewer è un processo avviato
dalla mod, che ne legge l'output) e lo scorrimento a un messaggio nel terminale.

## Aggiornamento automatico

- **A1** Ai checkpoint l'agente principale scrive una nota (cosa, perché, prova); uno scribe la traduce in operazioni tipizzate che un validatore controlla. L'osservatore segnala soltanto (brief R1, R6, R14, R20, R21).
- **A2** Una domanda laterale o un cambio di argomento crea una deviazione (S4), non un passo del piano.
- **A3** I file toccati dai tool nel turno si agganciano al nodo corrente (C3).
- **A4** Il costo per turno va misurato e tenuto basso (ramo `b4`).

## Allineamento persona ↔ modello

Requisiti completi con i criteri di verifica: `docs/ux/allineamento/brief.md` (R1–R24, chiuso il
2026-11-08). In sintesi: prova obbligatoria per ogni nodo; struttura solo con la tua conferma;
limiti di leggibilità per livello che non limitano l'esplorazione; liste con "↩ Torna a"; rami con
punto di rientro; mai cancellare; decisioni firmate; `Thread:` nei commit; riassunto per l'agente
calcolato dal codice (≤ 300 token).

## Da verificare

- Se la mod vede `/btw`: la domanda passa da `prompt.submit`, ma la risposta potrebbe non
  entrare nella conversazione registrata.
- Stabilità dell'API delle mod (EARLY ACCESS).
