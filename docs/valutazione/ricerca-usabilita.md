# Ricerca: usabilità con un solo utente e confronto con i concorrenti

*Ricerca del 2026-11-14 (subagente `researcher`), passo `m4.3.1`. Confidenza tra parentesi; molte fonti
lette come sintesi.*

**In breve:** con un solo utente il metodo riconosciuto è il design autobiografico (first-person),
dichiarato come tale; si rafforza con un disegno a caso singolo su misure oggettive, con 3–5
sviluppatori esterni e con valutatori LLM come supporto. Per i concorrenti non ci sono valutazioni
indipendenti; le uniche metriche dichiarate (CCPM) sono auto-riportate.

## 1. Un solo utente

- **Design autobiografico** e autoetnografia sono accettati in HCI ma non generalizzano; servono un passo
  interpretativo esplicito e la possibilità di falsificare ([Neustaedter & Sengers, DIS 2012](https://antle.iat.sfu.ca/wp-content/uploads/NeustaedterSengers_2012DIS_AutobioDesignMethodology.pdf)). (alta)
- Senza interpretazione resta un racconto; metodi first-person longitudinali e diari in
  [Lucero et al. 2021](https://users.aalto.fi/~luceroa1/publications/2021/lucero21_longitudinal.pdf). (media)
- **Disegno a caso singolo (SCED):** ABAB richiede un intervento ritirabile; *multiple baseline* quando non
  si può disimparare; ≥ 3 punti per fase; analisi con test di randomizzazione; reporting SCRIBE 2016
  ([PMC7004358](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7004358/)). (alta)
- Inferenza del ricercatore: alternare sessioni con e senza ariadne e misurare il tempo di ripresa; l'effetto
  di apprendimento non si annulla, quindi multiple baseline più di ABAB.
- **Limiti da dichiarare:** autore = utente, nessun cieco, effetto novità, confondenti tra sessioni. Vale per
  ipotesi e scoperta di problemi, non come prova di efficacia.

## 2. Strumenti standardizzati

- **SUS** con pochi utenti: affidabile, poco preciso (con 5 utenti ±6 punti nel 50% dei campioni); riportare
  l'intervallo; media storica 68 ([MeasuringU](https://measuringu.com/sample-sizes-for-sus-ci/)). (alta)
- **UMUX-Lite / UX-Lite** (2 domande) correla r ≈ 0,74–0,87 con SUS: adatto a ripetere la misura a ogni
  sessione ([MeasuringU](https://measuringu.com/from-umux-lite-to-ux-lite/)). (alta)
- **NASA-TLX:** nei paper CHI quasi sempre in versione Raw ([review di 522 paper](https://dl.acm.org/doi/10.1145/3837858));
  MeasuringU ne dubita rispetto alla **SEQ** (una domanda per compito). Proposta: SEQ per compito più la sola
  sottoscala Mental Demand. (media)
- **KLM:** stima il tempo di un esperto senza utenti, entro ~20%; K 0,2 s, M 1,35 s; il numero di M pesa molto
  ([Kieras](https://web.eecs.umich.edu/~kieras/docs/GOMS/KLM.pdf)). Non modella l'attenzione né lo sguardo alla banda. (alta)
- Successo, tempo ed errori per compito hanno senso solo con compiti definiti prima e una baseline.

## 3. Senza utenti

- **Valutazione euristica:** 3–5 valutatori trovano ~65–75% dei problemi, uno solo ~35% ([MeasuringU](https://measuringu.com/he-cw/)). (media)
- **Cognitive walkthrough snello** (Spencer, CHI 2000): due domande per passo. (media)
- **Valutatori LLM:** 73–77% dei problemi contro 57% di 5 esperti ([2507.02306](https://arxiv.org/pdf/2507.02306)); severità variabile,
  serve supervisione ([2512.04262](https://arxiv.org/pdf/2512.04262)); percepiscono l'interfaccia come testo
  e prendono il percorso più efficiente ([UXAgent](https://arxiv.org/pdf/2502.12561)). Generatori di ipotesi, mai prova. (media)

## 4. Un piccolo gruppo esterno

- 5 utenti trovano in media ~85% dei problemi, ma gruppi di 5 vanno dal 55% al 99% (Faulkner 2003) e ~35% su
  compiti aperti ([sintesi](https://www.researchgate.net/publication/200553185_Why_and_when_five_test_users_aren't_enough)). (alta)
- 5 per trovare problemi, correggere, poi altri 5; **non** per stimare metriche.
- Protocollo leggero: 1–3 compiti scritti prima; think-aloud (retrospettivo se si misura il tempo); SEQ per
  compito; SUS o UX-Lite alla fine; debrief. Partecipanti: sviluppatori che usano già agenti da terminale. (media)

## 5. Confronto con i concorrenti

- **DESMET** (Kitchenham): analisi delle funzioni con criteri e scale definiti prima; soggettiva, va dichiarato
  ([parte 7](https://www.researchgate.net/publication/234831965_Evaluating_software_engineering_methods_and_tools_part_7_planning_feature_analysis_evaluation)). (media)
- **Cognitive Dimensions** (Green & Petre 1996): 16 dimensioni; questionario di Blackwell & Green 2000
  ([PPIG](https://ppig.org/papers/2000-ppig-12th-blackwell/index.html)). (alta)
- Contro i criteri di parte (pratiche derivate, senza fonte specifica): congelare e datare i criteri prima;
  includere criteri in cui ariadne perde; estrarre i criteri dai documenti dei concorrenti; giudice cieco
  sull'identità dello strumento.

## 6. Valutazioni dichiarate dai concorrenti

- **CCPM:** «89% meno tempo perso, 75% meno bug, 3× più veloce» senza fonte; benchmark auto-riportato
  (100% contro 27,7% su 3–4 casi) che misura l'aderenza dell'agente alla skill, non l'usabilità ([README](https://github.com/automazeio/ccpm)). (alta)
- **Task Master:** «~70% di token in meno» della modalità core: una configurazione, non una valutazione. (alta)
- **Beads, Backlog.md, Spec Kit:** nessuna metrica nel README. (media)
- **MCP memory:** implementazione di riferimento, nessuna valutazione.
- **Claude Code Tasks:** nessuno studio; blog in contraddizione sulla persistenza. (bassa)
- **Studi indipendenti:** su Spec Kit solo lavori degli autori o piloti non controllati
  ([2604.05278](https://arxiv.org/html/2604.05278v1), [2605.01160](https://arxiv.org/pdf/2605.01160)); su Beads un aneddoto. Nessuno studio di
  usabilità umana per nessuno dei sette.

## Principi candidati (dal ricercatore)

1. Dichiarare il disegno come first-person, autore = utente: esplorativo, non generalizzabile.
2. Un passo interpretativo esplicito oltre al diario.
3. Disegno a caso singolo, multiple baseline, ≥ 3 punti per fase, soglie decise prima, SCRIBE.
4. Misure oggettive e leggere (tempo di ripresa, azioni KLM, SEQ); UX-Lite o SUS con intervallo, mai da soli.
5. 3–5 sviluppatori esterni per trovare problemi, mai per stimare metriche.
6. Valutatori LLM solo per ipotesi, con conferma umana.
7. Criteri del confronto congelati e datati prima, compresi quelli in cui perdiamo.
8. Cognitive Dimensions come secondo asse del confronto.
9. Distinguere «l'agente obbedisce meglio» da «la persona ritrova il filo».
10. Numeri dei concorrenti non verificati: non usarli come baseline.

**Lacune:** paper originali di Nielsen, Spencer e Rubin non letti; nessun esempio di SCED in HCI;
documentazione ufficiale di Claude Code Tasks non verificata; nessuna fonte sui criteri non di parte.
