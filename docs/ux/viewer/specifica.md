# Specifica — revisione dell'esperienza del viewer
2026-11-15 · deriva da `brief.md` (V1–V9). Concetto unico: l'utente ha chiesto di procedere senza
giri di concetti e prototipo («sono modifiche semplici»); il prototipo è il viewer stesso, rivisto da me.

Regola guida (Q6): il minimo di simboli, azioni e movimenti da ricordare. Ogni cosa nuova sostituisce
qualcosa o si spiega da sola; niente scorciatoie obbligatorie.

## Struttura della pagina

```
┌ ariadne· │ Grafo  Cronologia  Elenco │ Sei qui › M4 › … › Revisione UI/UX │ [ Cerca…  / ] ┐
│                                                                        ┌──────────────┐│
│  [Milestone|Dove sono|Tutto]   (solo in Grafo, in alto a sinistra)      │ pannello  ×  ││
│                                                                        │ (sovrapposto,││
│                 grafo / cronologia / elenco                            │  ritraibile) ││
│                                                                        └──────────────┘│
│  ‹ ● Sei qui  (solo se il corrente è fuori schermo)        [Legenda] [− + ⤢]          │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

- **Viste** (V3): tre schede piccole sottolineate nella barra. Il pannello di dettaglio è lo stesso
  nelle tre; la selezione si conserva passando da una vista all'altra (V9).
- **Pannello** (richiesta dell'utente): sovrapposto al canvas a destra, scorre dentro/fuori (240 ms,
  solo `transform`). Si chiude con `×` o `Esc`; si riapre cliccando un nodo, una riga, un risultato.
  Quando è aperto, «adatta» e «vai a» lasciano libero il suo spazio.
- **Comandi più piccoli** (richiesta dell'utente): livelli come controllo compatto dentro il canvas;
  «Cosa legge l'agente» passa nel pannello del nodo corrente, come sezione apribile; «Apri i passi» e
  «Mostra solo questo» diventano link discreti; i controlli dello zoom più piccoli.

## Stati dei nodi (V4)
Un solo set di icone SVG disegnate a mano (viewBox 16, tratto 1,75, `currentColor`), usato ovunque:
grafo, pannello, chip, legenda, elenco, cronologia. La forma distingue lo stato, il colore lo rinforza.

| Stato | Forma | Colore |
|---|---|---|
| Fatto | cerchio pieno con spunta | verde |
| In corso | anello con punto al centro | blu |
| Da fare | cerchio vuoto | grigio |
| Rimandato | cerchio con freccia verso destra | viola |
| Sostituito/rifiutato | cerchio barrato | grigio chiaro |
| Deviazione | freccia che esce e rientra | ocra |

Restano come oggi, senza simboli nuovi: bordo rosso = corrente, linea rossa = da dove viene,
tratteggio arancione = da confermare, `?` = prova incerta.
**Legenda:** dietro il pulsante «Legenda»; aperta alla prima visita, poi ricorda se l'hai chiusa.

## Cronologia (V3)
Fonte: `.ariadne/log.jsonl`. Più recenti prima, raggruppate per giorno («Oggi», «Ieri», data).
Riga: ora · icona dello stato attuale del nodo · azione in parole («chiuso», «avviato», «aggiunto»…) ·
id e titolo del nodo · testo dell'evento attenuato. Filtri a chip, scelta multipla:
**Avanzamento** (avviato, chiuso) · **Struttura** (piano, aggiunto, spostato, rimandato, sostituito,
confermato) · **Dettagli** (completato, ricollegato). Di default i primi due; i dettagli sono metà degli
eventi e coprono il resto. Prime 60 righe, poi «Mostra tutte».

## Elenco (V3)
Tutti i nodi in ordine di grafo, con rientro per livello. Colonne: stato (icona) · id · titolo ·
milestone · ultimo evento (data). Chip a scelta singola con conteggio: Tutti · In corso · Da fare ·
Fatti · Rimandati · Deviazioni · Sostituiti. Clic su una riga = selezione e pannello.

## Ricerca (V7)
Un campo nella barra (`/` lo raggiunge). In Grafo apre fino a 8 risultati (id o titolo); Invio o clic
porta al nodo. In Cronologia ed Elenco filtra le righe. `Esc` svuota.

## Navigazione (V1, V2, V5, V6)
- **Corrente sempre disegnato:** nella finestra di un livello il corrente vince sul punto di rientro
  della sua deviazione (bug visto con m4.4.12.5).
- **Zoom leggibile:** gli adattamenti automatici (apertura, cambio di livello) non scendono sotto lo zoom a
  cui il titolo è ≥ 11 px; se tutto non ci sta, inquadrano il contenitore più grande del corrente che ci
  sta, altrimenti il corrente. Il pulsante «Adatta» mostra invece tutto: è la panoramica chiesta da te.
- **Corrente fuori schermo:** una pillola «● Sei qui» sul bordo, nella direzione del nodo; clic = vai.
- **Tastiera:** frecce = nodo più vicino in quella direzione; Invio = apre/chiude i passi del
  contenitore; `Esc` = chiude il pannello; `/` = cerca. Nessun'altra scorciatoia.
- **Selezione più facile:** un contenitore aperto si seleziona dalla sua intestazione; il resto della
  sua area trascina il grafo.

## Movimento (V8)
Solo `transform`/`opacity`, durate 160/240 ms, ease-out `cubic-bezier(.23,1,.32,1)` (come calderone).
Pannello che scorre; cambio vista con dissolvenza breve; pillola che compare; volo al nodo come oggi.
Niente animazioni sulle righe di cronologia ed elenco (azioni frequenti). `prefers-reduced-motion`:
tutto istantaneo.

## Stati vuoti e limiti
- Cronologia senza file o vuota: «Nessun evento ancora: il diario si riempie a ogni operazione.»
- Filtri senza risultati: «Nessun evento con questi filtri» + «Azzera i filtri».
- Ricerca senza risultati: «Nessun nodo per "<testo>"».
- Titoli lunghi vanno a capo nell'elenco; nella cronologia una riga con ellissi e titolo completo al passaggio.

## Criteri di accettazione
V1–V9 del brief; in più: con il pannello chiuso il grafo usa tutta la larghezza; nessun pulsante della
barra è più alto di 28 px; ogni icona di stato è la stessa in tutte le viste.

## Fuori ambito
Scrittura dal viewer (Q7: niente pulsante «copia comando», non aggiunge abbastanza da valere un simbolo
in più); lavori in background di Claude Code (Q3, lasciato cadere).
