# Analisi — viewer attuale
2026-11-15 · bozza: i conteggi per compito arrivano dopo il brief

## Osservazioni dagli screenshot (1440×900, dati veri del filo)
- A vista intera (`fitView`) il testo dei nodi scende a ~5 px: per leggere serve sempre zoomare.
- In «Dove sono» il corrente appena creato (deviazione m4.4.12.5) è tra «1 nascosto sotto»: contro
  la specifica (la finestra contiene sempre il corrente). Bug da verificare in `viewer/model.js`.
- Legenda fissa in basso: ~70 px di altezza, simboli testuali (✓ ○ ↷ ⊘ ⤷) diversi dalle icone tonde
  dei nodi.
- Nessuna tastiera (solo zoom ±), nessuna ricerca, nessun segno di cosa è fuori schermo.
- Il diario `.ariadne/log.jsonl` ha 206 eventi in 5 giorni (fill 97, close 40, start 34, add 13,
  plan 7, move 4, defer 3, confirm 3, relink 3, replace 2), non mostrati.
- Movimento già presente: `fitView` 240 ms, volo al nodo 500 ms, lampeggio «arriving» 700 ms ×2,
  `prefers-reduced-motion` rispettato (`viewer/styles.css:275`).

## Riferimento calderone (cosa riusare come principio, non come stile)
Calderone non ha un grafo: i modelli utili sono il registro, i filtri, la tastiera e il movimento.
- Registro: più recenti prima, raggruppato per giorno, prime 12 voci poi «Mostra tutte»
  (`calderone-alchemico/frontend/src/pages/Registro.tsx:19-117`).
- Filtri: ricerca + chip a scelta singola; chip dei criteri attivi rimovibili con `aria-label`
  (`pages/Inventario.tsx:113-130`, `components/RecipeList.tsx:572-624`).
- Icone: SVG a mano, viewBox 24, `stroke: currentColor`, nessuna libreria (`components/ClassIcon.tsx:4-31`).
- Dove sei: `aria-current` sulle viste, badge di conteggio (`Shell.tsx:258, 344, 348`); frecce/Home/End
  con giro (`src/keys.ts:5-15`); Cmd+Z annulla l'ultimo toast (`components/Ui.tsx:470-482`).
- Movimento: solo transform/opacity (`calderone-design/docs/movimento-e-suono.md:7`); durate 100 /
  160 / 240 / 360 ms, ease-out `cubic-bezier(.23,1,.32,1)` (`styles.css:55-60`); cambio vista con
  View Transitions 240 ms (`ottone.css:384-422`); reduced motion via `gsap.matchMedia`.
- Toast: 3,5 s, errori 9 s, pausa su hover/focus, `aria-live=polite` (`components/Ui.tsx:489-540`).
