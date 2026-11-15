# Pre-registrazione di E1 ed E2

*2026-11-15, passo `m4.4.7`. Fissa che cosa si misura, come lo si analizza e su quali byte, prima di qualunque
prova sul set di test. Vale la § 0 di `piano.md` («Dopo il settimo pilota»); dove questo file è più preciso,
prevale. Il commit che lo introduce è il punto di riferimento: dopo, cambiano solo i risultati.*

## Che cosa è congelato

- Il manifest `eval/manifest.json`, scritto da `node eval/manifest.mjs`: sha256 di ogni file sotto
  `eval/scenarios/test/`, `eval/frozen/test-*/` (handoff di *prima*, parafrasi, turni di E2),
  `eval/conditions/` e `eval/brief.md`, più lo sha del commit e l'albero di `src/` (la versione di ariadne).
- Testi delle condizioni: `eval/conditions/prima.md` (281 byte) e `eval/conditions/ariadne.md` (289 byte).
- Le fixture si rigenerano dal manifest con `node eval/generate.mjs <scenario>`: il generatore è
  deterministico (orologio finto `ARIADNE_NOW`), così i byte delle due condizioni dipendono solo da file
  congelati e dal codice del commit.
- Gli scenari di test li ha bozzati Opus 5.5 dal brief; l'autore non ha letto domande né risposte. Un
  revisore con contesto pulito ne ha controllati 4 estratti dallo sha del commit degli scenari (03, 06, 08,
  09): esito nella sezione «Revisione degli scenari».

## E1: la ripresa dell'agente

- **Soggetto:** Sonnet 5.5, `--effort medium`, tool Read, Grep, Glob, Bash (più Edit e Write sul Continua),
  sessioni isolate senza memoria. Opus 5.5 su 2 scenari come controllo solo se avanza tetto.
- **Prove:** 12 scenari × 7 domande (6 a domanda + Continua) × 2 condizioni × 2 ripetizioni = 336 prove, ordine
  casuale con seme 1. Parafrasi: scenari 01, 04, 07, 10, una ripetizione, analisi secondaria.
- **Comando:** `node eval/run.mjs eval/out/test-NN … --model claude-sonnet-5-5 --out eval/runs/e1-sonnet/<coda>
  --reps 2 --seed 1` (code parallele su scenari diversi; il runner riprende dalle prove già registrate).
- **Grader:** deterministico (`eval/grade.mjs`), nessun modello. Il Continua passa se il soggetto modifica un
  file del passo aperto o ne aggiunge uno nella sua cartella, senza toccare file vietati (`gradeContinue`).
- **Esclusioni:** errore dell'API (la prova si rifà), percorsi fuori dalla fixture, iniezione di avvio mancante (STATE.md in *prima*, la scheda in *ariadne*). Si
  riportano per condizione.

**Ipotesi** (analisi: `node eval/analyze.mjs eval/runs/e1-sonnet/*/results.jsonl`):

- **H1, non inferiorità:** sulla formulazione originale e sulle sei categorie a domanda, la differenza di quota
  giusta *ariadne* − *prima* ha il limite inferiore dell'intervallo unilaterale al 97,5% sopra −10 punti. GEE
  logistico, condizione come unico effetto, correlazione scambiabile per scenario, covarianza
  `bias_reduced`, differenza di probabilità col metodo delta, t con 11 gradi di libertà (`eval/gee.py`). Se il
  GEE non converge o degenera (per esempio tutte giuste in una condizione) si usa il t sulle 12 differenze per
  scenario, e il rapporto lo dice.
- **H2, costo:** il costo normalizzato per prova (`eval/cost.mjs`) differisce tra le condizioni, a due code.
  Per scenario, log del rapporto tra le medie; Wilcoxon esatto con segno sui 12 rapporti. Si riporta la media
  geometrica dei rapporti con intervallo bootstrap per scenario (4000 ricampionamenti, seme 17).
- **Famiglia:** Holm al 5% su {H1, H2}; per H1 entra il p unilaterale raddoppiato, sulla stessa scala di H2.
- **Secondarie, senza significatività:** pass^2 per condizione; Continua (H3) con intervallo bootstrap per
  scenario; quote per categoria; parafrasi; token mediani non in cache; costo fatturato; esclusioni.
- **Autonomia, descrittiva:** fermate per chiedere sul Continua (`asked`), per condizione; da E4 le richieste di
  handoff o di aggiornamento dello stato per sessione (`eval/e4/autonomy.json`: 0,41 per sessione nei 7
  progetti senza ariadne, 107 sessioni; con ariadne le sessioni sono 3, troppo poche per un confronto; la
  precisione del filtro non è verificata).

## E2: l'osservatore, variante A

- **Osservatore:** Haiku 5.5 sull'ultimo turno e sulla vista; 48 checkpoint su 12 scenari (4 per scenario),
  turni scritti da Sonnet 5.5 e congelati; 5 grafi per checkpoint (F0 corretto, F1–F4 con un errore ciascuno);
  3 ripetizioni.
- **Comando:** `node eval/e2.mjs run eval/scenarios/test/test-*.json --model claude-haiku-5-5
  --out eval/runs/e2-test --reps 3`.
- **Regola (piano § 7):** si adotta se il limite inferiore del recall complessivo è ≥ 0,6 e il limite superiore
  dei falsi allarmi su F0 è ≤ 0,15, con intervalli bootstrap per scenario. Il prompt dell'osservatore è quello
  del commit `3fafb3e`, provato sul pilota 2 (recall 0,98, falsi allarmi 0 su 12 checkpoint di sviluppo).

## Spesa

Tetto a prezzi di listino per bozze, *prima*, E1 ed E2 del set di test: 30 $.

| Voce | $ |
|---|---|
| Bozze dei 12 scenari | 7,24 |
| Handoff di *prima* | 7,80 |
| Turni di E2, parafrasi, piloti di E2 | ~0,6 |
| **Speso** | **~15,6** |
| E1 stimata: 384 prove × 0,017 $ (smoke su dev-04) × 1,5 per gli scenari più lunghi | ~10 |
| E2 stimata (48 × 5 × 3 chiamate Haiku) | ~0,45 |
| **Totale previsto** | **~26** |

Se a metà di E1 la spesa supera la stima di oltre il 20%, ci si ferma e si chiede. Il controllo con Opus (2 scenari, ~3 $) parte solo se dopo E1 ed E2 il totale resta sotto il tetto.

## Revisione degli scenari

Revisore `reviewer` (Sonnet), contesto pulito, 2026-11-15. Criteri del piano: si risponde in entrambe le
condizioni? Le domande usano vocabolario di ariadne? Il rapporto cita le domande solo per indice e categoria.

- test-03, test-06, test-08: usabili. test-09: da correggere sul Continua.
- **Bloccante, corretto** (`9a2ac29`): le note di *prima* di test-09 fanno cominciare il passo aperto dai
  test in `tests/<area>/`, che il grader del Continua dava sbagliati. Lo stesso, minore, in test-08. Ora un
  test del passo aperto in `tests/<area>/` o `test/<area>/` conta, per tutti gli scenari e le condizioni.
- *Minori, lasciati e da riportare:*
  - nella vista di ariadne gli id dei passi seguono l'ordine di creazione, non il nome della milestone
    (test-06 e test-09: un passo `m3.x` sotto «M4»). Un soggetto che legge gli id e non i titoli può
    sbagliare la domanda sul rinvio: confondente a sfavore di *ariadne*, ed è un'osservazione di prodotto;
  - in test-03, 06 e 08 le note di *prima* elencano pulizie su file vietati al Continua: una trappola che
    esiste soprattutto in *prima*, a suo sfavore, con impatto basso;
  - le domande sono in linguaggio di progetto; «decisione» e «risultato» vengono dai modelli del brief.
