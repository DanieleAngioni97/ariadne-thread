# Revisione indipendente 1 del piano

*2026-11-14, revisore Opus con contesto pulito (subagente `reviewer`), passo `m4.3.4`. Ha letto solo
meta-piano, principi, piano, le due ricerche, lo STATE.md originale, la skill `handoff` e specifica § Dati.
Testo riportato senza modifiche di sostanza; righe riferite alla bozza `cb48d0f`.*

**Verdetto:** pronto con correzioni sostanziali. L'impianto regge (D1–D4 separate, pre-registrazione,
E2 con fixture F0), ma E1 misura in parte l'aderenza al formato di ariadne, il soggetto non è isolato dal
ground truth ed E3 non ha un disegno.

## Bloccanti

1. **Chiave di risposta nel vocabolario di ariadne** (piano:96-97, 114-115, 39-45). In *prima* non esistono
   id di nodo e gli sha cambiano tra condizioni. *Correzione:* chiave neutrale (titoli e percorsi con alias, o
   scelta multipla identica), sha per condizione, e per ogni domanda un controllo scritto di dove sta la
   risposta in ciascuna condizione.
2. **«Perché» non si valuta con un confronto esatto** (piano:42, 114-115). O degrada a «Prova», o serve un
   giudice LLM validato con kappa su 50–100 casi (P5). *Correzione:* decidere ora.
3. **Il ground truth può arrivare al soggetto** (piano:50, 110-111): lettura libera, fixture dentro
   `ariadne-eval` con scenari e risposte, trascrizioni dei run in `~/.claude/projects`. *Correzione:* copia
   isolata per prova, lettura limitata alla cartella, controllo nei log.

## Maggiori

4. Rilanciare con un nuovo sha fa degli scenari un set di sviluppo (piano:59): separare sviluppo/pilota da un
   set di test congelato, usato una volta per sha pre-registrato.
5. Le condizioni sono idealizzate in modo diverso (piano:85-92, 223): grafo perfetto dalla CLI, *prima* da un
   modello corretto senza regole. *Correzione:* grafo da un agente o omissioni ai tassi di E4; correzione di
   *prima* con checklist scritta prima, da chi non vede le domande, con diff registrato.
6. Un solo prompt per prova nasconde il costo per-prompt di ariadne (~240 token a prompt contro ~700 una
   volta): H2 è favorevole per costruzione; nessuno verifica che l'iniezione avvenga.
7. Configurazione del soggetto non fissata: hook, memoria, skill, flag, testo dei CLAUDE.md di condizione,
   max-turns, effort. Il CLAUDE.md è una leva: istruzioni di pari lunghezza e forza.
8. Validità di costrutto: E1 misura il recupero di fatti, non la ripresa; niente distrattori; rischio di
   effetto soffitto. *Correzione:* compito «continua il lavoro» con esito deterministico; distrattori.
9. Statistica di H1: 48 coppie non indipendenti (8 domande in 6 scenari); pass^3 butta informazione;
   potenza esatta di McNemar con 48 coppie: 0,68 (25%/5% discordanti), 0,46 (20%/5%), 0,23 (15%/5%).
   *Correzione:* più scenari con meno domande; modello logistico misto o McNemar per cluster come primaria;
   pass^3 co-primaria; potenza per simulazione dal pilota.
10. Pilota troppo piccolo e dopo la pre-registrazione, senza regola per modificarla.
11. Mancano regole per uscite non JSON, timeout, errori API; code di H2; cosa conta come token (cache);
    quali test entrano in Holm; ordine delle prove interlacciato e casuale con seed.
12. E2: niente ripetizioni; C su 12 checkpoint non confrontabile con A e B; decisione su stime puntuali e
    soglie non motivate; abbinamento allarme–errore non definito; nessun controllo che gli errori non
    lascino tracce.
13. E3: ogni compito in una sola condizione (compito e condizione confusi); l'autore conosce lo schema degli
    scenari; T4 senza equivalente in *prima*; SCED ignorato. *Correzione:* ogni compito in entrambe le
    condizioni, controbilanciato, randomizzato, ≥ 3 prove per condizione, scenari scritti da altri, criteri
    di falsificazione scritti prima.
14. D4: criteri da `research.md`, scritto per motivare ariadne; chi estrae le schede; ariadne riconoscibile;
    kappa tra due LLM non è il kappa contro etichette umane.
15. Ripetibilità: versioni fissate (CLI `claude` senza aggiornamento automatico, modelli, Node, git, scipy
    con lockfile), orologio finto e TZ per i campi `at`, `GIT_*_DATE`, seed, hash di skill, hook, riassunto e
    prompt; quali fixture si generano e quali si congelano.

## Minori

16. E1b: «ultime 5 chiusure» è metà di uno scenario corto; il grafo non è mai indietro.
17. Mancano le minacce di E2, E4 e D4; la revisione degli scenari non dice chi, quando, con quali criteri.
18. Lunghezza confusa con lo scenario (2 per lunghezza): solo descrittiva. Meta-piano: 8–15 principi, qui 20;
    mancano le alternative scartate per 3 ripetizioni, 6 scenari, soglie di E2, McNemar su pass^3.
19. Concetti usati prima di introdurli: checkpoint, nodo, prove, stati, riassunto, trailer `Thread:`, fork,
    scribe, coda, banda, viewer, SEQ, NASA-TLX, UX-Lite, KLM, discordanti, kappa, m3.1.4, M5, ~566 token.

## Lacune nei principi

- Dalle ricerche: SCED; errori clusterizzati; recall dell'evidenza e distrattori; cognitive walkthrough e
  think-aloud.
- Dalla conoscenza del revisore: isolamento del soggetto; set di sviluppo e di test; esito sul comportamento;
  test di equivalenza con margine (TOST); potenza per simulazione; regole per prove fallite; ordine
  randomizzato e interlacciato; controllo che il trattamento sia avvenuto; sensibilità alla formulazione;
  controbilanciamento; criteri di falsificazione nel first-person.

## Conformità ai principi

| P | Esito | P | Esito |
|---|---|---|---|
| P1 | parziale | P11 | parziale |
| P2 | parziale | P12 | parziale |
| P3 | parziale (violato in E2) | P13 | conforme |
| P4 | parziale | P14 | conforme |
| P5 | parziale | P15 | conforme |
| P6 | parziale | P16 | conforme |
| P7 | conforme | P17 | parziale |
| P8 | parziale | P18 | conforme |
| P9 | parziale | P19 | parziale |
| P10 | conforme | P20 | conforme |
