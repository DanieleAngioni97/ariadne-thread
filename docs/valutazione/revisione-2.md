# Revisione indipendente 2 del piano

*2026-11-14, secondo revisore Opus con contesto pulito: verifica della versione 2 (`2de33d8`) contro
`revisione-1.md`. Ha letto revisione 1, piano, principi e ricerca-metodi; ha eseguito `claude --version`
(2.1.302) e `claude --help`. Testo riportato senza modifiche di sostanza.*

**Verdetto:** servono correzioni maggiori. Il comando di E1 toglie Bash al soggetto e la regola di
decisione di E2 non si può soddisfare; scelta multipla, mappa delle evidenze di *prima* e grafo idealizzato
lasciano aperti i rilievi 1, 5 e 8.

## Rilievi della revisione 1

| # | Esito | Cosa manca |
|---|---|---|
| 1 | parziale | la mappa per *prima* non è generabile (M3) |
| 2 | risolto | dubbio sulla scelta multipla (M2) |
| 3 | parziale | Bash non confinato (m5); CLAUDE.md dell'utente forse caricato (B1) |
| 4 | risolto | — |
| 5 | parziale | nell'analisi primaria il grafo è il ground truth ricodificato (M5) |
| 6 | risolto con riserva | contraddizione sull'iniezione (m1) |
| 7 | parziale | `--effort` senza valore; manca il permission mode per Continua |
| 8 | parziale | Continua non deterministico (M4); la scelta multipla alza il soffitto (M2) |
| 9 | parziale | GEE con 16 cluster senza correzione (M6) |
| 10 | parziale | 3 scenari non stimano la correlazione nello scenario; ripetizioni già fissate |
| 11 | risolto con riserva | pass^3 con una ripetizione esclusa |
| 12 | parziale | soglia irraggiungibile (B2); ingresso di B e C (M1) |
| 13 | parziale | T4 fuori dalla falsificazione; l'autore conosce il brief |
| 14 | parziale | 30 etichette dall'autore (M8) |
| 15 | risolto | — |
| 16 | risolto | E1b senza N, scenari, ripetizioni, seed |
| 17 | risolto | — |
| 18 | parziale | alternative a 3 ripetizioni e 16 scenari |
| 19 | parziale | vedi Chiarezza |

## Bloccanti

- **B1** (piano:169-178). `--restricted` rimuove Bash «unless --tools names them»: senza `--tools` il soggetto
  non usa `git` né la CLI. Ignora solo i *settings files*: non è provato che ignori il CLAUDE.md dell'utente.
  *Correzione:* `--tools` esplicito, `--permission-mode` per le scritture di Continua, prova canarino
  dell'isolamento nel pilota.
- **B2** (piano:253, 281). Con 20 F0, anche 0 falsi allarmi danno un limite superiore di 0,161 (Wilson) o
  0,168 (Clopper-Pearson), sopra 0,15: nessuna variante passa. Per il recall per tipo con n = 20 servono ≥ 17/20.
  *Correzione:* ≥ 40 checkpoint F0 con unità = checkpoint, o soglia rivista con motivo.

## Maggiori

- **M1** (254 contro 267-268). B e C leggono «l'intera sessione», ma la fixture ha solo il turno: congelare
  una trascrizione per checkpoint.
- **M2** (142-147). La scelta multipla trasforma il ricordo in riconoscimento e alza il soffitto. *Correzione:*
  risposta aperta con confronto esatto normalizzato con alias per Dove, Prova, Rinvio; scelta multipla solo per
  Perché, con distrattori dai passi dal titolo simile.
- **M3** (160-161). La mappa delle evidenze di *prima* non la scrive il generatore: controllo per stringa in
  STATE.md, LOG.md, commit e documenti; dichiarare quante risposte di *prima* stanno solo in git.
- **M4** (148, 157-159). Continua non deterministico: regola per più file, file nuovi, nessuna modifica, file
  condivisi; un file distinto per passo; dire se entra in H1a.
- **M5** (123, 128-129). Se il nodo contiene il perché, la «scelta il cui perché sta solo in un documento» non
  lo è più in *ariadne*: dire cosa scrive il generatore in ogni nodo.
- **M6** (211-215). GEE con 16 cluster sottostima l'errore: `cov_type="bias_reduced"` (Mancl-DeRouen) con t a
  15 gradi di libertà, o bootstrap wild per cluster.
- **M7** (228, 248, 352 contro 449-451). E1b e il costo per sessione usano E4, che gira dopo la
  pre-registrazione: spostare E4 prima.
- **M8** (376). 30 etichette < 50–100 di P5, e l'etichettatore riconosce ariadne: ≥ 50, seconda persona o bias
  dichiarato.

## Minori

- **m1** In `-p` ariadne inietta all'avvio e al prompt: 2 iniezioni, non una.
- **m2** Ripetizioni fissate ma «il pilota le fissa»; il pilota su tutti e 6 gli scenari di sviluppo, la
  simulazione decide anche il numero di scenari.
- **m3** Wilcoxon per domanda ignora i cluster: aggregare per scenario.
- **m4** Il caso al 20% vale solo per Perché: 5 opzioni ovunque ci sia scelta.
- **m5** `git diff --no-index` legge fuori dalla copia; il flusso mostra il comando, non i file: negare
  `--no-index` e percorsi assoluti, o HOME temporanea.
- **m6** Il file dell'hook prova che l'hook è partito, non che il testo è entrato nel contesto: cercarlo nello
  stream-json.
- **m7** La falsificazione esclude T4; con 4 contro 4 basta una differenza qualsiasi; non è legata al test di
  randomizzazione.
- **m8** «Struttura variabile» contrasta con il «materiale equivalente» di P27.

**P21–P28:** P21 parziale (B1, m5); P22 conforme; P23 parziale (M4); P24 conforme salvo esclusioni; P25
parziale (m6); P26 conforme ma la parafrasi ha una sola ripetizione; P27 conforme salvo m8; P28 conforme salvo m7.

**Chiarezza:** SCRIBE (linea guida) si confonde con lo Scribe di ariadne; «diario» in T4 non definito;
`ariadne validate` manca in § 1. Senza definizione: GEE, Holm, TOST, Wilcoxon, bootstrap, precision/recall,
effetto soffitto, hook, skill, milestone, ConStory-Checker, Beads/Backlog.md, `m4.4`. NASA-TLX solo nominato.
