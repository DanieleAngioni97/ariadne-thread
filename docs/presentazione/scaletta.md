# Scaletta: ariadne ai colleghi (10 minuti)

Pubblico: tecnici che usano già Claude Code (decisione m9.6). Materiale d'appoggio, non un
copione: per ogni blocco le frasi da cui improvvisare. Fonte dei numeri:
`~/ariadne-report/rapporto-testo-v2.md` §4.

Messaggio da far ricordare: **dopo `/clear` l'agente riparte dal passo giusto, senza che
nessuno scriva note, perché il filo si aggiorna dai commit.**

## 1. Problema e vantaggi (~2')

- «Chiudete il venerdì, il lunedì aprite una sessione e chiedete: dove eravamo?»
- Oggi due rimedi: `/compact` (il riassunto lo decide il modello, si perde ciò che era solo in
  chat) e le note di passaggio (funzionano, ma qualcuno deve ricordarsi di chiederle: io 44 volte
  in 107 sessioni).
- ariadne sposta la nota dentro il flusso: il filo sta in `.ariadne/`, versionato col codice, e
  avanza con i commit che portano `Thread:`. Tre domande: **dove sei, da dove vieni, cosa viene
  dopo**.
- Numero eroe, una frase: «riprendi il lavoro» → passo giusto **24 su 24 con ariadne, 14 su 24
  con note a mano** (12 progetti finti × 2 prove), a costo pari. Limiti solo se chiedono.

Slide: 1 (promessa), 2 (problema), 3 (24 su 24).

## 2. Demo dal vivo (~5')

Sul progetto sintetico di m9.4, terminale a sinistra e viewer a destra. Ogni mossa ~40".

1. **Apri la sessione** → la scheda arriva da sola («Sei in», «Resta da fare», «Next»).
   «La scheda è per l'agente, il viewer è per voi.»
2. **Approvi un piano** → Claude lo registra, i passi compaiono nel viewer.
   «Parto dal piano che approvo comunque: nessun lavoro in più.»
3. **Commit con `Thread: <id> done: …`** → il passo si chiude con il commit come prova, parte il
   successivo. «Il commit è la prova.»
4. **Deviazione**: «prima sistemiamo X» → detour, a fine lavoro rientra da solo dov'era.
5. **Decisione aperta**: Claude chiede, il nodo resta in attesa; nel viewer confermo e commento,
   l'agente legge il commento al prompt dopo.
6. **«Posso fare /clear?»** → `check --clear` elenca cosa vive solo in chat; `/clear`;
   «riprendi» → riparte dal passo giusto. Chiudere la demo qui: è la promessa mantenuta.

Piano B: screenshot delle sei mosse (m9.4).

## 3. Come si installa e domande (~3')

- Due comandi: `/plugin install ariadne --marketplace DanieleAngioni97/ariadne-thread`, poi
  `/ariadne:init` nel progetto. Node 20+. Dove non c'è `init` il plugin tace.
- Avete già STATE.md o LOG.md? `ariadne migrate` mostra l'anteprima e non scrive niente; con
  `--apply` le voci entrano da confermare, `--undo` torna indietro.
- Prova vera: Atlas migrato e seguito con ariadne (citarlo, non mostrarlo).
- Chiusura: ripetere il messaggio da ricordare; il tutorial (m9.3) resta a loro.

Domande probabili, risposta in una riga:

- *Quanti token costa?* In prova costo pari (−5% medio, non significativo).
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
