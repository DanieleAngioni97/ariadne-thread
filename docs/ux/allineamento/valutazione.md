# Valutazione — allineamento persona ↔ modello · livello leggero · 2026-11-08

Revisione fatta da chi ha costruito il prototipo (`prototipo/index.html`, concetto A): giudico il
mio lavoro, quindi ho guardato di più i passi su cui ero meno sicuro (liste, deviazioni,
assenza). 21 schermate, una per azione, catturate con Playwright a 1400 × 860 e 1000 × 760; elenco
delle azioni nel trace (non versionato: si rigenera da `prototipo/index.html`).

Prima di questa revisione l'utente ha provato il prototipo: la prima versione, tutta a tasti
senza nome, non si capiva ("ti giuro che non ho capito nulla"). Corretta con pulsanti, una riga
di guida e la scena dell'assenza (R25, R26).

## Prima occhiata
- A cosa serve: a sinistra Claude Code con la banda, a destra il grafo; la riga gialla lo dice.
- L'occhio va al pulsante blu "Fai lavorare l'agente" e al nodo bordato di rosso nel grafo: è
  giusto per il compito più frequente (sapere dove sei).
- La banda dice dove sei e cosa viene dopo in una riga: "M2 Correzione › Riprodurre il timeout in un
  test · prossimo: Patch del retry con backoff".

## Percorso per compito

### Compito 1: sapere dove sei e cosa viene dopo (ogni pochi turni)
| Passo | Q1 | Q2 | Q3 | Q4 | Dove guardare / costo | Problema |
|---|---|---|---|---|---|---|
| t1-s0 guardare la banda | ✓ | ✓ | ✓ | — | 0 azioni, banda sopra il prompt | — |
| t3-s4 dentro una lista | ✓ | ✓ | ~ | — | la banda va su 2 righe a 770 px | minore 4 |

### Compito 2: approvare una proposta strutturale
| Passo | Q1 | Q2 | Q3 | Q4 | Dove guardare / costo | Problema |
|---|---|---|---|---|---|---|
| t2-s2 arriva la proposta | ✓ | ✓ | ✓ | — | banda gialla + nodo tratteggiato nel grafo | — |
| t2-s3 Mostra nel grafo | ✓ | ✓ | ✓ | ✓ | il nodo lampeggia | — |
| t2-s4 Approva | ✓ | ✓ | ✓ | ✗ → ✓ | conferma solo in chat, lontano dal clic | maggiore 2 (corretto) |

### Compito 3: discutere un punto di una lista e tornare all'indice
| Passo | Q1 | Q2 | Q3 | Q4 | Dove guardare / costo | Problema |
|---|---|---|---|---|---|---|
| t3-s2 lista approvata | ✓ | ✓ | ✓ | ✓ | "↩ Commenti della review (0/5)" nella banda | — |
| t3-s4 Torna alla lista | ✓ | ✓ | ✓ | ✓ | indice in chat, la guida dice di scrivere il numero | minore 3 |
| t3-s5 scrive 4 | ✓ | ~ | ✓ | ✗ → ✓ | il punto 4 era nascosto in "+ altri 2" | bloccante 1 (corretto) |

### Compito 4: questione laterale e ritorno
| Passo | Q1 | Q2 | Q3 | Q4 | Dove guardare / costo | Problema |
|---|---|---|---|---|---|---|
| t4-s1 /btw | ✓ | ✓ | ✓ | ✗ → ✓ | la deviazione non si vedeva nel grafo | bloccante 1 (corretto) |
| t4-s2 Chiudi e torna | ✓ | ✓ | ✓ | ✓ | banda: "rientrato in …" | — |

### Compito 5: rientro dopo ore di lavoro non sorvegliato
| Passo | Q1 | Q2 | Q3 | Q4 | Dove guardare / costo | Problema |
|---|---|---|---|---|---|---|
| t5-s1 rientro | ✓ | ✓ | ✓ | ✓ | riepilogo in chat + "Mentre eri via: 2 da confermare, 1 da decidere" | — |
| t5-s3/s4 approva, rifiuta | ✓ | ✓ | ✓ | ✗ → ✓ | il nodo rifiutato sembrava ancora nel piano | maggiore 1 (corretto) |
| t5-s5 Lascia così | ✓ | ✓ | ~ | ~ | la decisione fuori mandato sparisce senza traccia | minore 5 |

### Compito 6: riprendere dopo /clear
| Passo | Q1 | Q2 | Q3 | Q4 | Dove guardare / costo | Problema |
|---|---|---|---|---|---|---|
| t6-s1 /clear | ✓ | ✓ | ✓ | ✓ | riassunto in chat, 137 token | — |
| t6-s2 Cosa legge l'agente | ✓ | ✓ | ✓ | ✓ | stesso testo in testa al grafo | — |

### Compito 7: correggere un nodo
| Passo | Q1 | Q2 | Q3 | Q4 | Dove guardare / costo | Problema |
|---|---|---|---|---|---|---|
| t7-s1 sposta m2.1b sotto m1 | ✓ | ~ | ✓ | ✓ | 1 frase; il nodo si sposta nel grafo | minore 2 |

## Euristiche
| # | Esito | Problema (dove) | Gravità | Correzione |
|---|---|---|---|---|
| H1 | ✗ → ✓ | t3-s5, t4-s1: il nodo corrente nascosto nel raggruppamento | bloccante | la finestra dei 3 figli contiene sempre il nodo corrente (fatto) |
| H2 | ~ | "tu" a destra dei nodi: non si capisce che vuol dire "deciso da te" | minore | etichetta "da te" o legenda |
| H3 | ~ | t7-s1: una correzione non si annulla se non con un'altra frase | minore | nella specifica: "annulla l'ultima correzione" in chat |
| H4 | ✓ | stessi colori e simboli tra banda e grafo | — | — |
| H5 | ✓ | nulla di strutturale entra senza conferma o mandato | — | — |
| H6 | ~ | grafo senza legenda (bordo rosso, linea rossa, sottolineato, ?, ↷, ⤷) | minore | legenda compatta nel viewer |
| H7 | ✓ | approva = 1 clic; "Approva tutto" al rientro | — | — |
| H8 | ✓ | la riga gialla è del prototipo, non del prodotto | — | — |
| H9 | ✓ | comandi non riconosciuti: risposta chiara, il grafo non cambia | — | — |
| H10 | ✓ | guida contestuale (solo prototipo) | — | — |
| Feedback vicino all'azione | ✗ → ✓ | t2-s4, t5-s3: conferma solo in chat | maggiore | riga verde nella banda dopo ogni scelta (fatto) |

## Criteri del brief
| Criterio | Obiettivo | Misurato | Esito |
|---|---|---|---|
| R11 approvare senza lasciare il terminale | 1 azione | 1 clic nella banda | ✓ |
| R12 tornare all'indice | 1 azione | 1 clic (+1 frase per scegliere il punto) | ✓ |
| R10 correggere un nodo | 1 azione | 1 frase in chat | ✓ |
| R26 vedere il riepilogo / approvare tutto | 1 / 1 azione | 0 (appare da solo) / 1 | ✓ |
| R7 riassunto per l'agente | ≤ 300 token | 137 token | ✓ |
| R17 nodi incerti attenuati | nessuno mostrato come verificato | attenuato con "?" nel grafo e "incerto" nel riassunto | ✓ |
| R4 un ramo lungo resta leggibile | ≤ 3 aperti, nessuna esplorazione rifiutata | 3 + "mostra"; il nodo corrente sempre visibile dopo la correzione | ✓ |
| R22 rientro dichiarato | 0 rami aperti senza rientro | la banda mostra "rientro: …" | ✓ |
| Dove sei in ≤ 5 s dalla banda | 1 riga | 1 riga; 2 righe dentro una lista a 770 px | ~ |

## Correzioni in ordine
1. [bloccante, fatto] t3-s5, t4-s1 — grafo, raggruppamento "+ altri 2" — la finestra dei figli
   visibili contiene sempre il nodo corrente, ciò che lo contiene o il nodo da cui parte la
   deviazione corrente.
2. [maggiore, fatto] t5-s4 — grafo, nodo rifiutato — barrato e attenuato con ⊘: si vede che è
   fuori dal piano.
3. [maggiore, fatto] t2-s4, t5-s3 — banda — riga verde con l'esito dopo ogni Approva/Rifiuta.
4. [minore] grafo — legenda compatta dei segni (H6) ed etichetta "da te" invece di "tu" (H2).
5. [minore] t7-s1 — chat — "annulla l'ultima correzione" (H3); da mettere nella specifica.
6. [minore] t3-s4 — chat — scegliere un punto scrivendo il numero: naturale nel terminale, ma
   va ricordato; nella mod si può valutare un menu nella banda.
7. [minore] t3-s4 — banda — dentro una lista va su 2 righe a 770 px: togliere "prossimo" quando
   c'è la riga "↩".
8. [minore] t5-s5 — una decisione fuori mandato lasciata com'è non lascia traccia: nella specifica
   diventa un nodo-decisione dell'agente ("ha scelto l'opzione prudente") con la tua firma.
9. [minore] t4-s1 — "+ altri 2" non dice che i nascosti sono sopra: "2 nascosti sopra · mostra".
