# Brief — revisione dell'esperienza del viewer
2026-11-15 · Modalità: migliora · Profondità: standard, compressa (revisione fatta da me)

Tema: il viewer web (`viewer/`, `ariadne view`) che disegna il filo. Base: la specifica
`docs/ux/allineamento/specifica.md` § Viewer, implementata in M3. Questo giro rivede come si legge,
come ci si muove e cosa manca; non tocca come il grafo viene scritto (operazioni, banda, scribe).
Riferimento di qualità per l'interazione: l'app calderone (analisi in `analisi.md`).

## Chi lo usa
- Tu, sviluppatore che lavora con Claude Code: tieni il viewer nel browser accanto alla chat.
- Colleghi e community: lo vedono per la prima volta, senza il tuo contesto (slide, demo).

## Compiti (con frequenza)

| Compito | Frequenza | Oggi: passi / problemi |
|---|---|---|
| Sapere dove sei e cosa viene dopo | ogni pochi turni, di sfuggita | breadcrumb chiaro; nel grafo il corrente può finire tra i nascosti (visto oggi con m4.4.12.5) |
| Leggere un nodo (cosa, perché, prova) | più volte per sessione | clic → pannello, buono; ma prima serve zoomare: a vista intera il testo è ~5 px |
| Ricostruire cosa è successo (ieri, in questa sessione) | ogni sessione | nessuna vista nel tempo: il diario (`log.jsonl`, 206 eventi) non si vede nel viewer |
| Filtrare per tipo (fatti, da fare, deviazioni, rimandati…) | qualche volta per sessione | impossibile: solo i tre livelli Milestone / Dove sono / Tutto |
| Riconoscere lo stato di un nodo a colpo d'occhio | sempre | simboli testuali piccoli, legenda fissa che ripete simboli diversi da quelli dei nodi |
| Orientarsi nel grafo grande (cosa sto guardando, dove sono gli altri pezzi) | ogni volta che si zooma | nessun segno di cosa è fuori schermo; niente tastiera; niente ricerca |
| Mostrare il progetto a qualcuno | raro, ma decide la prima impressione | pulsanti grandi e legenda fissa pesano |
| Selezionare un nodo | continuo | poco agevole: bersagli piccoli a zoom basso, i contenitori aperti catturano i clic |
| Vedere il grafo a tutta larghezza | quando il grafo è grande | il pannello non si chiude mai |

## Contesto d'uso
- Browser accanto al terminale, finestra di 1000–1440 px; mouse e trackpad, tastiera a portata.
- Lo sguardo è di sfuggita mentre segui la chat; a volte una lettura lunga (fine giornata, demo).
- Il viewer si ricarica da solo quando `.ariadne/` cambia (polling).

## Critiche ricevute (testuali)
- "Creare delle viste come se fosse Jira per vedere lo storico delle azioni, filtrando anche tra task fatti, background ecc."
- "Migliorare le icone che usi per segnalare gli stati di ogni nodo."
- "Migliorare la navigazione e gli hint visivi per mostrare i nodi che si stanno visualizzando."
- Dal giro precedente, ancora valide: "Quando vado su un altro nodo non è chiaro dal grafo dove sta andando."

## Obiettivi
- Funzionali: vedere il filo nel tempo e filtrarlo; riconoscere stati e tipi senza legenda;
  sapere sempre cosa si sta guardando e dove sta il resto.
- Di esperienza: leggibile al primo sguardo, calmo (il movimento spiega, non decora), all'altezza
  di calderone; un collega che lo vede la prima volta capisce senza spiegazioni.

## Requisiti e criteri di accettazione
Un'azione = un clic, un tasto, o un testo scritto chiuso da Invio.

| # | Requisito | Criterio verificabile | Priorità |
|---|---|---|---|
| V1 | Il nodo corrente è sempre visibile e riconoscibile | in ogni vista e livello il corrente è disegnato, mai tra i nascosti; trovato in ≤ 2 s | deve |
| V2 | Il testo dei nodi si legge senza zoomare | all'apertura e dopo ogni «vai a», corpo del titolo ≥ 11 px a schermo | deve |
| V3 | Vista nel tempo dello storico, con filtri | da qualunque vista, ≤ 2 azioni per vedere «cosa è successo oggi» filtrato per tipo *(forma: Q4)* | deve |
| V4 | Stati riconoscibili senza legenda | forma diversa per ogni stato (non solo colore); un collega nuovo li nomina giusti ≥ 5 su 6 | deve |
| V5 | Sai sempre cosa stai guardando e dove sta il resto | segni per ciò che è fuori schermo o nascosto; «torna al corrente» in 1 azione *(forma: Q6)* | deve |
| V6 | Si naviga da tastiera | spostarsi tra nodi, aprire/chiudere il dettaglio, cambiare vista senza mouse | dovrebbe |
| V7 | Ricerca per id o titolo | trovato e centrato un nodo in ≤ 3 azioni | dovrebbe |
| V8 | Il movimento spiega i cambiamenti | nuovi nodi, cambio vista e «vai a» animati ≤ 300 ms; nulla si muove senza una causa; `prefers-reduced-motion` rispettato | dovrebbe |
| V10 | Pannello ritraibile | `×` o `Esc` lo chiude, il grafo prende tutta la larghezza; un clic su un nodo lo riapre | deve |
| V11 | Comandi discreti, pochi simboli | nessun pulsante della barra più alto di 28 px; nessuna scorciatoia obbligatoria; un solo set di icone | deve |
| V9 | Dalla vista nel tempo al grafo e ritorno | clic su un evento → nodo selezionato nel grafo; ritorno nella stessa posizione della lista | dovrebbe |

## Vincoli
- Stack attuale: React 19 + @xyflow/react + elkjs da CDN, niente build; nessuna dipendenza nuova
  se lo stdlib o il codice esistente bastano.
- Il viewer legge `.ariadne/` e non lo scrive (le correzioni passano dalla chat).
- Italiano e inglese (`i18n.js`); accessibilità come in specifica § Accessibilità.

## Fuori ambito
- Come il grafo viene scritto (operazioni, banda, scribe, mandato).
- Modificare il grafo dal viewer (Q7), anche il pulsante «copia comando».
- Lavori in background di Claude Code (Q3).

## Metriche (prima / obiettivo)
*(da misurare in analisi.md: azioni e secondi per i compiti sopra, oggi e dopo)*

## Decisioni
| Data | Decisione | Motivo | Chi |
|---|---|---|---|
| 2026-11-15 | Modalità migliora, profondità standard | Q1, Q2 | tu |
| 2026-11-15 | «Background» lasciato cadere | Q3: non ricordi l'intento | tu |
| 2026-11-15 | Cronologia + Elenco come schede, niente board | Q4 | tu |
| 2026-11-15 | Fastidi: selezione dei nodi, pannello non ritraibile, pulsanti ingombranti | Q5 | tu |
| 2026-11-15 | Minimo di simboli, azioni e movimenti da ricordare | Q6 | tu |
| 2026-11-15 | Sola lettura, niente «copia comando» | Q7: non chiaro a cosa serve → non vale un simbolo in più | io, su tuo ok |
| 2026-11-15 | Niente giri di concetti/prototipo: specifica diretta, revisione fatta da me | «sono modifiche semplici… fatti tu da revisore» | tu |

## Domande aperte

Nessuna: brief chiuso il 2026-11-15.
