# Ricerca: come si valutano memoria e contesto degli agenti

*Ricerca del 2026-11-14 (subagente `researcher`), passo `m4.3.1`. Confidenza per affermazione tra
parentesi; molti paper letti solo come abstract o sintesi: va verificato prima di citarli nel rapporto.*

## 1. Benchmark di memoria e contesto lungo

- **LongMemEval** ([2410.10813](https://arxiv.org/abs/2410.10813)): 500 domande su 5 abilità (estrazione,
  ragionamento su più sessioni, temporale, aggiornamento della conoscenza, astensione). Ground truth
  costruito: fatti seed → «evidence statements» → sessioni sintetiche mescolate a distrattori.
  Accuratezza con giudice GPT-4o, più Recall@k sulle evidenze. Calo ~30% negli assistenti commerciali. (alta)
  - Riusabile: «stato noto → piantato nella storia → domanda con risposta nota → recall dell'evidenza».
    Aggiornamento della conoscenza e astensione corrispondono a deviazioni/rinvii e a «non so» quando
    manca la prova. (alta sulla fonte, media sull'adattamento)
- **LoCoMo** ([2402.17753](https://arxiv.org/abs/2402.17753)): conversazioni di ~300 turni / 35 sessioni,
  generate da agenti con persona e grafo di eventi, verificate da umani; QA, riassunto di eventi, dialogo. (alta; metriche non verificate)
- **MemoryAgentBench** ([2507.05257](https://arxiv.org/abs/2507.05257)): retrieval accurato, apprendimento
  durante il test, comprensione a lungo raggio, dimenticanza selettiva. (alta; metriche non verificate)
- **Coding con compattazione o handoff:** nessun benchmark specifico per l'handoff tra sessioni. Il più
  vicino è SWE-ContextBench ([2602.08316](https://arxiv.org/html/2602.08316v2)): riassunti compatti contro
  traiettorie complete; il contesto non filtrato dà beneficio limitato o negativo. (media)
- **tau-bench** ([2406.12045](https://arxiv.org/abs/2406.12045)): ground truth deterministico sullo stato
  finale; definisce pass^k. Lezione: verificare lo stato, non il testo. (alta)

## 2. Metriche

- **pass@k** ([Chen 2021](https://arxiv.org/pdf/2107.03374)): 1 − C(n−c,k)/C(n,k). **pass^k**: probabilità
  che tutte le k prove riescano, C(c,k)/C(n,k) (formula da verificare sul paper tau-bench). Per una
  ripresa conta pass^k: deve riuscire sempre. (alta / media)
- Accuratezza su domande a risposta nota; Recall@k dell'evidenza.
- **Rilevatore di inconsistenze:** precision, recall, F1 sugli errori iniettati, più tasso di falsi allarmi
  su casi puliti (ConStory-Checker: 55% di recall su 1000 errori piantati, [2603.05890](https://arxiv.org/html/2603.05890v1)). (media)
- **Costo e latenza:** nessuno standard; si riportano token e $ accanto all'accuratezza. (bassa)
- Riportare media con errore standard o intervallo di confidenza, mai solo il punto.

## 3. Ripetibilità e harness

- Ground truth generato una volta e distribuito statico nei benchmark sopra. (media)
- **Ripetizioni:** Anthropic ([2411.00640](https://arxiv.org/html/2411.00640v1)) raccomanda più risposte per
  domanda e sconsiglia di abbassare la temperatura per ridurre il rumore. (alta)
- **Inspect AI** (UK AISI): `epochs` ripete ogni campione e riduce i punteggi; log strutturati; scorer
  `model_graded_fact`; esiste un bridge per Claude Code, ma richiede sandbox. (alta / media)
- **promptfoo:** provider custom con `output`, `tokenUsage`, `cost`; `--repeat N`. (media)
- Per `claude -p` come soggetto basta un runner minimo che salva il JSON grezzo; Inspect se servono log
  ed epochs nativi. lm-eval-harness e OpenAI evals non adatti (orientati ai modelli). (media)
- **Fissare** id del modello e versione della CLI; salvare l'output grezzo con l'hash del prompt.

## 4. Giudice LLM

- Bias di posizione, verbosità e auto-preferenza; GPT-4 > 80% d'accordo con umani ([Zheng 2023](https://arxiv.org/abs/2306.05685)). (alta)
- L'accordo grezzo sovrastima: usare kappa, con l'accordo tra umani come tetto, su 50–100 casi etichettati
  ([2606.00093](https://arxiv.org/html/2606.00093v1)). (media)
- Per noi: grader deterministici sulle risposte a risposta nota (id, stato, commit); giudice LLM solo per
  risposte libere, di un modello diverso dal soggetto, validato con kappa.

## 5. Statistica con pochi casi appaiati

- Analizzare le differenze appaiate per domanda, intervalli al 95%, errori clusterizzati per domande
  correlate ([2411.00640](https://arxiv.org/html/2411.00640v1)); con pochi casi l'intervallo è largo e va dichiarato. (alta)
- **McNemar esatto** sui discordanti quando sono pochi ([PMC3716987](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3716987/)). (media-alta)
- Scegliere il test in base alle assunzioni ([Dror 2018](https://aclanthology.org/P18-1128/)). (alta)
- **Wilcoxon** per token, $ e latenza appaiati; effetto con intervallo bootstrap appaiato. (media)
- **Pre-registrazione** di ipotesi, metriche, N, ripetizioni e test, committata prima dei dati;
  correzione per confronti multipli. (bassa-media: nessuna fonte primaria specifica)

## 6. Errori iniettati per un verificatore

- Pratica diffusa: ConStory-Bench, ContraGen ([2510.03418](https://arxiv.org/html/2510.03418v1)),
  perturbazioni su artefatti ([2604.03447](https://arxiv.org/html/2604.03447v1)). (media)
- **Limiti:** errori innaturali o con marcatori che rivelano l'iniezione; rilevatore che impara le
  idiosincrasie sintetiche ([2305.14540](https://arxiv.org/pdf/2305.14540)). Mitigazione: errori realistici,
  senza marcatori, affiancati a contraddizioni reali. (media)

## Principi candidati (dal ricercatore)

1. Domande a risposta nota con ground truth costruito (fatto → evidenza → domanda).
2. Grader deterministico per default; giudice LLM solo dove inevitabile.
3. Riportare pass^k oltre alla media.
4. Stessa domanda, due condizioni: analisi appaiata con intervallo.
5. Con pochi casi: McNemar esatto, bootstrap appaiato, discordanti grezzi, potenza dichiarata.
6. Più ripetizioni per domanda, temperatura non abbassata.
7. Pre-registrare ipotesi, metriche, N e test; commit prima di eseguire.
8. Fixture congelate, versioni fissate, output grezzo salvato.
9. Costo e latenza sempre accanto all'accuratezza, compreso il costo fisso di iniezione.
10. Osservatore: precision e recall su errori iniettati, falsi allarmi su casi puliti, nessun marcatore.
11. Validità ecologica: affiancare contraddizioni reali agli errori iniettati.
12. Giudice LLM: kappa su un golden set, modello diverso dal soggetto, ordine casuale.

**Lacune:** metriche esatte di LoCoMo e MemoryAgentBench; formula pass^k sul paper; provider exec di
promptfoo; nessun benchmark per l'handoff tra sessioni di coding; nessuna fonte primaria sulla
pre-registrazione nelle valutazioni di LLM.
