# Scaletta: ariadne ai colleghi (10 minuti)

Pubblico: tecnici che usano già Claude Code (decisione m9.6). Materiale d'appoggio, non un
copione: per ogni blocco le frasi da cui improvvisare. Fonte dei numeri:
`~/ariadne-report/rapporto-testo-v2.md` §4. Slide di partenza: `~/ariadne-report/slide-v2.html`
(10 slide, citate sotto come v2-N).

Tre messaggi:

1. **Il grafo lo gestisce Claude**, come contesto: lo scrive mentre lavora, lo rilegge dopo `/clear`.
2. **Gli esperimenti dicono che riprende meglio**: passo giusto 24 su 24 contro 14 su 24, a
   costo pari.
3. **Per te è facile**: approvi, guardi la mappa, confermi o commenti.

## 1. Slide ad alto livello (~3', 4 slide)

| Slide | Da v2 | Frase da cui partire |
|---|---|---|
| Promessa | v2-1 | «Dopo `/clear` l'agente riparte dal passo giusto, senza note.» |
| Problema | v2-2 | «`/compact` riassume a modo suo; le note funzionano se qualcuno si ricorda di chiederle (io 44 volte in 107 sessioni).» |
| Claude gestisce il filo | v2-5 | «Il filo sta in `.ariadne/`, nel repo; Claude lo aggiorna mentre lavora e dopo `/clear` riceve la scheda: dove sei, da dove vieni, cosa viene dopo.» |
| La prova | v2-9 | «12 progetti finti, due copie: note a mano contro ariadne. Riprende dal passo giusto 24 su 24 contro 14 su 24; risposte sullo stato alla pari; costo pari.» |

Sull'efficienza dire «costo pari», non «costa meno»: il −5% medio non è significativo
(rapporto §4). Il vantaggio dimostrato è la correttezza della ripresa.

## 2. Demo della UI (~4')

Progetto sintetico di m9.4, terminale a sinistra e viewer a destra. Le mosse sostituiscono dal vivo
le slide v2-3, v2-4, v2-6, v2-7 e v2-8, che restano come piano B.

1. **Approvi un piano** in chat → Claude lo registra, i passi compaiono nel viewer. «Io approvo,
   lui scrive.»
2. **Commit** → il passo si chiude con il commit come prova, parte il successivo.
3. **Il viewer**: dove sei, da dove vieni, cosa viene dopo; hover per il dettaglio, click per le
   prove. Una deviazione e una decisione aperta già nel grafo.
4. **Conferma e commento** dal viewer → Claude legge il commento al prompt dopo e risponde.
5. **«Posso fare /clear?»** → `/clear`, «riprendi» → riparte dal passo giusto. Fine demo.

## 3. Come si inizia e domande (~3', 2 slide)

| Slide | Da v2 | Contenuto |
|---|---|---|
| Come si inizia | nuova | `/plugin install ariadne --marketplace DanieleAngioni97/ariadne-thread`, poi `/ariadne:init`; con STATE.md/LOG.md esistenti `ariadne migrate` (anteprima, `--apply`, `--undo`). Prova vera: Atlas, citato a voce. |
| Chiusura | v2-10 | Ripetere la promessa; il tutorial (m9.3) resta a loro. |

Domande probabili, risposta in una riga:

- *Quanti token costa?* In prova costo pari.
- *E in team, conflitti su `.ariadne/`?* Va in git col lavoro; [da verificare prima].
- *E la compattazione?* Prevista, ma nella prova non l'abbiamo misurata.
- *Chi ha fatto la prova?* Io: regole fissate nei commit prima dei risultati, nessun controllo di
  terzi.
- *Senza commit?* `close` con il file o il messaggio dove vive il risultato.

## Da chiarire prima della presentazione

- Il repo `DanieleAngioni97/ariadne-thread` è leggibile dai colleghi? Altrimenti il comando di
  installazione fallisce.
- Banda sopra il prompt: richiede `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1`; mostrarla in demo solo
  se attiva sulla macchina della presentazione.
