# Meta-piano: come lavoriamo alla valutazione

*Scritto il 2026-11-14, dalla richiesta in chat. Nodo del grafo: `m4.3`.*

## Perché questa è la parte più importante

ariadne promette due cose: che una persona non perda il filo in sessioni lunghe con un agente
(usabilità), e che l'agente riprenda il lavoro con meno contesto e più corretto (ingegneria del
contesto). Finché non lo misuriamo, sono ipotesi. Una misura fatta bene dice anche dove ariadne è
debole rispetto a prima (STATE.md e LOG.md) e rispetto ai concorrenti, cioè dove irrobustirlo.

## Tre parole che useremo

- **Condizione:** un modo di tenere il filo che mettiamo alla prova. Ne confrontiamo almeno due:
  *prima* (STATE.md e LOG.md scritti a mano) e *ariadne* (grafo, riassunto, banda, viewer).
- **Fixture:** il materiale fisso su cui gira una prova: un progetto finto con la sua storia di
  commit, i suoi file di stato e le domande con le risposte giuste. Fisso vuol dire che due
  esecuzioni della stessa prova partono da byte identici.
- **Ripetibile:** chiunque rilanci gli script ottiene gli stessi ingressi; le uscite del modello
  cambiano solo per la sua variabilità, che misuriamo ripetendo ogni prova.

## Il vincolo che cambia il primo piano

La prima proposta usava la storia di questo repo e le trascrizioni delle sessioni. Non è ripetibile:
la storia cresce a ogni commit, quindi gli ingressi cambiano «sotto il naso». Le fixture vanno
quindi tenute fuori dalla storia viva:

- generate da uno script deterministico (stesse date e stessi autori nei commit, quindi stessi sha),
  oppure congelate una volta come archivio (`git bundle` a uno sha fissato);
- in un repository di test separato, locale e senza push; se un push servisse, solo privato.

Quale delle due strade, e per quali prove, lo decide il piano (passo 3), non questo documento.

## I passi

| Passo | Cosa produce | Perché in quest'ordine |
|---|---|---|
| 1. Ricerca su metodi e metriche | note con fonti: come la community valuta memoria e contesto degli agenti, usabilità con un solo utente, confronto con i concorrenti | i principi devono venire da pratiche riconosciute, non da quello che ci fa comodo |
| 2. Principi di valutazione | `principi.md`: 8–15 regole, ognuna con la fonte | scritti **prima** del piano, così il piano si giudica contro di essi e non il contrario |
| 3. Piano di valutazione | `piano.md`: domande, ipotesi, condizioni, fixture, metriche, procedura, analisi, minacce alla validità, costi | ogni scelta giustificata e collegata a un principio |
| 4. Revisione indipendente | rapporto di un revisore Opus con contesto pulito: legge solo principi, piano e note di ricerca | chi ha scritto il piano non vede i propri punti ciechi |
| 5. Piano rivisto e approvato | `piano.md` corretto, con la risposta a ogni rilievo; tua approvazione | solo dopo si scrive l'harness (`m4.4`) |

## Regole di scrittura per principi e piano

- Ogni concetto si introduce, con una frase semplice, prima di usarlo in una frase complessa.
- Ogni scelta dice quale alternativa ha scartato e perché.
- Le ipotesi e l'analisi si scrivono prima di vedere i dati (pre-registrazione), per non adattarle
  ai risultati.
- I limiti si dichiarano nel piano, non si scoprono dopo.

## Cosa resta fuori da questo meta-piano

- L'esecuzione delle prove (`m4.4`) e lo scribe (`m4.2`): vengono dopo l'approvazione del piano.
- La misura dell'osservatore, che era `m4.1`, diventa uno degli esperimenti del piano.
