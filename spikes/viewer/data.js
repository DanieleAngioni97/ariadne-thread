// Sample thread for the spike: the real history and plan of this project, written in the user's language.
// Shape (draft of the .ariadne/ format): one flat list of nodes;
// `parent` = the node that contains it (levels), `after` = the nodes it follows (order, prerequisites).
// A step left open when its milestone closes is `deferred` to a task in a later milestone,
// which points back with `continues`. `files` = what the step created or edited, and why.

const S = '9491e746'

export const data = {
  project: 'ariadne-thread',
  current: 'm1.2',
  nodes: [
    {
      id: 'p0', title: 'Visione del progetto', status: 'done',
      summary: 'Una UI a grafo per non perdere il filo di un processo a più passi.',
      detail: 'In una chat il ragionamento scorre via: si dimentica come si è arrivati a una funzione precisa, e perché.',
      files: [
        { path: 'docs/vision.md', change: 'created', why: 'Il problema, i requisiti di massima e il meta-processo da seguire.' },
        { path: 'README.md', change: 'created', why: 'Ingresso del repo, rimanda alla visione.' },
        { path: 'CLAUDE.md', change: 'created', why: 'Regole del progetto per Claude: lingua, traccia del processo.' },
        { path: 'STATE.md', change: 'created', why: 'Dove siamo e cosa viene dopo, per riprendere in una nuova sessione.' },
        { path: 'LOG.md', change: 'created', why: 'Storia delle sessioni, una riga per passaggio.' },
      ],
      chat: [],
    },

    // M0 — closed, with four open steps deferred to later milestones.
    {
      id: 'm0', title: 'M0 Ricerca', status: 'done', after: ['p0'],
      summary: 'Cosa esiste già, e come alimentare il grafo da una sessione di Claude Code.',
      detail: 'Fase 1 del meta-processo: niente codice, niente stack. Chiusa con una mod come sorgente e un viewer web per il grafo.',
      files: [
        { path: 'docs/process-trace.md', change: 'created', why: 'La traccia a mano di questo processo: caso d’uso reale e primo dataset.' },
      ],
      chat: [{ session: S, role: 'user', at: '09:02', text: 'Siamo alla fase 1 del meta-processo: la ricerca. Non scrivere codice e non scegliere ancora uno stack.' }],
    },
    {
      id: 'm0.2', parent: 'm0', title: 'Strumenti esistenti', status: 'done',
      summary: 'Circa 25 strumenti tra mind map, librerie di grafi, viewer di DAG e tracer di agenti.',
      detail: 'Nessun clone dell’obiettivo. Il più vicino è Agent Flow, che disegna cosa fa l’agente, non il processo. Per disegnare: React Flow + un layout DAG.',
      files: [{ path: 'docs/research.md', change: 'created', why: 'Il censimento degli strumenti, con cosa riusare e cosa no.' }],
      chat: [{ session: S, role: 'assistant', at: '09:20', text: 'Nessun clone del nostro obiettivo: ci sono grafi live dell’esecuzione, non del processo.' }],
    },
    { id: 'f1', parent: 'm0.2', title: 'Mind map', status: 'done', summary: 'Markmap, Mermaid, JSON Canvas, Excalidraw, tldraw.', detail: 'Alberi e tele; nessuno stato per nodo, poca crescita dal vivo.', files: [], chat: [] },
    { id: 'f2', parent: 'm0.2', title: 'Librerie di grafi', status: 'done', summary: 'React Flow, Cytoscape, ELK, dagre, d3-dag, Sigma, G6.', detail: 'React Flow per i nodi su misura, ELK per i layout annidati.', files: [], chat: [] },
    { id: 'f3', parent: 'm0.2', title: 'Tracer di agenti', status: 'done', summary: 'Langfuse, Phoenix, Agent Flow, claude-code-viewer.', detail: 'Tracciano l’esecuzione a posteriori; nessuno mostra dove sei adesso.', files: [], chat: [] },
    {
      id: 'b1', parent: 'm0.2', title: 'Codice di Agent Flow', status: 'done', after: ['f3'],
      summary: 'Non è una base: il modello dati delle tool call è cucito ovunque.',
      detail: 'Estensione VS Code + web UI con d3-force. Con la strada della mod restano solo le idee di ingestione.',
      files: [], chat: [],
    },
    {
      id: 'b2', parent: 'm0.2', title: 'Layout stabile', status: 'deferred', after: ['f2'],
      deferred: { to: 'm2.6', why: 'Dipende dal viewer: si verifica quando si progetta la UI, non prima.' },
      summary: 'Il grafo deve crescere senza far saltare i nodi già piazzati.',
      detail: 'Nato dal confronto tra le librerie di layout; nessuna garantisce da sola la stabilità.',
      files: [], chat: [],
    },
    {
      id: 'm0.3', parent: 'm0', title: 'Alimentare il grafo da Claude Code', status: 'done',
      summary: 'Hook, MCP, un file che Claude modifica, transcript, SDK, OpenTelemetry.',
      detail: 'Gli hook danno la meccanica affidabile, MCP l’unica semantica, i transcript solo per il recupero perché il formato è interno.',
      files: [{ path: 'docs/research.md', change: 'edited', why: 'Aggiunte le sei vie per alimentare il grafo, con pro e contro.' }],
      chat: [],
    },
    {
      id: 'b3', parent: 'm0', title: 'Task tools come sorgente', status: 'deferred', after: ['m0.3'],
      deferred: { to: 'm2.5', why: 'Serve sapere come si aggiorna il grafo prima di scegliere le sorgenti.' },
      summary: 'TaskCreate/TaskUpdate sono già un grafo con stato e dipendenze.',
      detail: 'La disponibilità per modello non è verificata.',
      files: [], chat: [],
    },
    {
      id: 'm0.4', parent: 'm0', title: 'Repository propri', status: 'done',
      summary: 'Pezzi riusabili in usage_collect.py, kb-cyberpunk e calderone-alchemico.',
      detail: 'Lettore JSONL incrementale, hook che non bloccano mai, un server MCP sullo stesso service layer di una web UI.',
      files: [], chat: [],
    },
    {
      id: 'm0.5', parent: 'm0', title: 'Sintesi', status: 'done', after: ['m0.2', 'm0.3', 'm0.4'],
      summary: 'Tre architetture candidate; si parte da un file e si cresce verso l’aggiornamento automatico.',
      detail: 'Il valore distintivo è il modello dati del processo e la UI, non l’ingestione.',
      files: [{ path: 'docs/research.md', change: 'edited', why: 'Aggiunta la sintesi con la raccomandazione.' }],
      chat: [],
    },
    {
      id: 'm0.8', parent: 'm0', title: 'Una mod di Claude Code', status: 'done', after: ['m0.5'],
      summary: 'Una mod vede ogni riga della chat, chiama il modello da sola, disegna una banda e dei pannelli.',
      detail: 'Sostituisce demone, server MCP e lettura dei transcript. L’API è in early access.',
      files: [{ path: 'docs/analysis-mod.md', change: 'created', why: 'Cosa può fare una mod, cosa no, e i rischi dell’API in early access.' }],
      chat: [{ session: S, role: 'user', at: '10:05', text: 'Possiamo valutare direttamente una mod per claude code anziché incasinarci no?' }],
    },
    {
      id: 'b4', parent: 'm0', title: 'Costo dell’osservatore', status: 'deferred', after: ['m0.8'],
      deferred: { to: 'm2.4', why: 'Si misura sul flusso di aggiornamento progettato in M2, non su un’ipotesi.' },
      summary: 'Misurare qualità e costo per turno dell’estrazione automatica dei nodi.',
      detail: 'Haiku sul singolo turno contro un fork sull’intera sessione.',
      files: [], chat: [],
    },
    {
      id: 'm0.9', parent: 'm0', title: 'STATE e LOG', status: 'done', after: ['m0.5'],
      summary: 'Il grafo diventa la fonte; STATE e LOG un export, per ora.',
      detail: 'Il grafo fine resta locale e non versionato; STATE e LOG restano il resoconto grezzo che chiunque legge.',
      files: [{ path: 'docs/analysis-mod.md', change: 'edited', why: 'Aggiunta l’analisi di STATE, LOG e Next dentro il grafo.' }],
      chat: [],
    },
    {
      id: 'd1', parent: 'm0', kind: 'detour', title: 'Quale licenza, e i crediti?', status: 'done', after: ['m0.9'],
      summary: 'Domanda laterale: cosa cambia tra le licenze, e come sapere chi lo usa.',
      detail: 'Ogni licenza comune tiene il copyright; Apache-2.0 aggiunge il file NOTICE. Nessuna licenza dice chi usa il codice.',
      files: [{ path: 'docs/analysis-mod.md', change: 'edited', why: 'Aggiunte le opzioni di licenza a confronto.' }],
      chat: [{ session: S, role: 'user', at: '10:31', text: 'Non ne ho idea, cosa cambia? Se la gente lo usa vorrei saperlo e vorrei i crediti.' }],
    },
    {
      id: 'm0.11', parent: 'm0', title: 'Spike nel terminale', status: 'done', after: ['m0.8', 'm0.9'],
      summary: 'Una banda e un pannello /thread disegnati nel terminale.',
      detail: 'Giudizio: carino, ma troppo da terminale. Il grafo va in un viewer nel browser; la banda resta.',
      files: [{ path: 'docs/analysis-mod.md', change: 'edited', why: 'Registrato lo spike (il codice vive fuori dal repo) e il giudizio.' }],
      chat: [{ session: S, role: 'user', at: '11:12', text: 'Sembra carina ma è troppo da terminale, la vorrei esterna per farla carina.' }],
    },
    {
      id: 'b5', parent: 'm0', title: 'Segnalibri nella chat', status: 'deferred', after: ['m0.11'],
      deferred: { to: 'm3.4', why: 'Già nei requisiti (C6); si costruisce insieme alla mod.' },
      summary: 'Marcare i punti importanti della chat e tornarci con un click.',
      detail: 'Visti in VS Code, assenti nel terminale. Un segnalibro è un nodo agganciato all’id di un messaggio.',
      files: [],
      chat: [{ session: S, role: 'user', at: '10:28', text: 'Su VS Code c’erano anche dei bookmarks per segnare punti della chat importanti.' }],
    },

    // M1 — in progress.
    {
      id: 'm1', title: 'M1 Analisi e requisiti', status: 'active', after: ['m0'],
      summary: 'Trasformare visione e ricerca in requisiti verificabili.',
      detail: 'Bozza scritta; lo spike del viewer decide l’aspetto prima di fissare i requisiti.',
      files: [], chat: [],
    },
    {
      id: 'm1.1', parent: 'm1', title: 'Bozza dei requisiti', status: 'done',
      summary: 'Requisiti con id su forma, livelli, stato, contesto al click, salto alla chat.',
      detail: 'Il salto alla chat passa dalla banda del terminale: Claude Code fa scorrere la chat solo su un tuo input lì.',
      files: [{ path: 'docs/requirements-draft.md', change: 'created', why: 'I requisiti con id, ricavati da visione e decisioni di M0.' }],
      chat: [{ session: S, role: 'user', at: '11:40', text: 'Con un click uno possa vedere il contesto, file di riferimento, e saltare a un punto della chat.' }],
    },
    {
      id: 'm1.2', parent: 'm1', title: 'Spike del viewer', status: 'active', after: ['m1.1'],
      summary: 'Questa pagina: livelli da aprire, stati, il filo, deviazioni e rinvii, contesto al click.',
      detail: 'Usa e getta, sul branch spike/viewer. Serve a giudicare l’aspetto prima di fissare i requisiti.',
      files: [
        { path: 'spikes/viewer/index.html', change: 'created', why: 'La pagina, con le librerie caricate da CDN: niente installazione.' },
        { path: 'spikes/viewer/app.js', change: 'created', why: 'Il disegno: layout ELK, nodi, frecce, pannello, tooltip.' },
        { path: 'spikes/viewer/model.js', change: 'created', why: 'La logica pura del grafo: filo, livelli visibili, rinvii e anomalie.' },
        { path: 'spikes/viewer/model.test.mjs', change: 'created', why: 'I test della logica, eseguiti con node --test.' },
        { path: 'spikes/viewer/data.js', change: 'created', why: 'Questo progetto come dati di prova; bozza del formato di .ariadne/.' },
        { path: 'spikes/viewer/i18n.js', change: 'created', why: 'Le parole dell’interfaccia nella lingua di chi la usa.' },
        { path: 'spikes/viewer/styles.css', change: 'created', why: 'Colori e simboli di stati, filo, deviazioni e rinvii.' },
      ],
      chat: [
        { session: S, role: 'user', at: '11:40', text: 'Bisogna rendere evidente cosa è stato fatto, cosa è da fare, dove siamo adesso, le deviazioni.' },
        { session: S, role: 'user', at: '14:05', text: 'Tutte le volte che qualcosa è rimandato va creato il task per una delle milestones successive previste.' },
      ],
    },
    {
      id: 'm1.3', parent: 'm1', title: 'Rifinire i requisiti', status: 'todo', after: ['m1.2'],
      summary: 'Portare il giudizio sullo spike nei requisiti.',
      detail: 'Tra le novità: ogni rinvio crea un task in una milestone successiva; il piano è segnato fino in fondo.',
      files: [{ path: 'docs/requirements-draft.md', change: 'edited', why: 'Da aggiornare col giudizio sullo spike.' }],
      chat: [],
    },

    // M2..M5 — planned, with what is already known.
    {
      id: 'm2', title: 'M2 Progettazione', status: 'todo', after: ['m1'],
      summary: 'Modello dati del grafo, come si aggiorna, la UI.',
      detail: 'Parte quando i requisiti sono fissati.',
      files: [], chat: [],
    },
    { id: 'm2.1', parent: 'm2', title: 'Modello dati di .ariadne/', status: 'todo', summary: 'Nodi piatti, livelli con parent, ordine con after, rinvii.', detail: 'La bozza è in spikes/viewer/data.js.', files: [], chat: [] },
    { id: 'm2.2', parent: 'm2', title: 'Flusso di aggiornamento', status: 'todo', after: ['m2.1'], summary: 'Come la mod propone nodi, stati e posizione a fine turno.', detail: 'Requisiti A1–A3.', files: [], chat: [] },
    { id: 'm2.3', parent: 'm2', title: 'UI del viewer', status: 'todo', after: ['m2.1'], summary: 'Dallo spike al disegno definitivo.', detail: 'Parte dal giudizio sullo spike.', files: [], chat: [] },
    { id: 'm2.4', parent: 'm2', title: 'Misurare il costo dell’osservatore', status: 'todo', after: ['m2.2'], continues: 'b4', summary: 'Qualità e costo per turno: Haiku sul turno o fork sulla sessione.', detail: 'Decide il default (requisito A4).', files: [], chat: [] },
    { id: 'm2.5', parent: 'm2', title: 'Task tools come sorgente', status: 'todo', after: ['m2.2'], continues: 'b3', summary: 'Verificare se TaskCreate/TaskUpdate sono disponibili e utili.', detail: 'Se sì, sono una sorgente di stato già strutturata.', files: [], chat: [] },
    { id: 'm2.6', parent: 'm2', title: 'Layout stabile', status: 'todo', after: ['m2.3'], continues: 'b2', summary: 'Il grafo cresce senza far saltare i nodi già piazzati.', detail: 'Da provare con ELK e le posizioni precedenti come vincolo.', files: [], chat: [] },
    { id: 'm2.7', parent: 'm2', title: 'Verifiche sulla mod', status: 'todo', after: ['m2.2'], summary: '/btw, canale browser → mod, scorrimento della chat a un messaggio.', detail: 'Punti aperti nei requisiti, sezione “Da verificare”.', files: [], chat: [] },

    { id: 'm3', title: 'M3 Implementazione', status: 'todo', after: ['m2'], summary: 'La mod come sorgente e il viewer web.', detail: 'Test prima del codice, un passo alla volta.', files: [], chat: [] },
    { id: 'm3.1', parent: 'm3', title: 'Mod: osservatore e banda', status: 'todo', summary: 'Legge la chat, scrive .ariadne/, tiene la banda sopra il prompt.', detail: 'API in early access: test da rilanciare a ogni release.', files: [], chat: [] },
    { id: 'm3.2', parent: 'm3', title: 'Viewer web', status: 'todo', after: ['m3.1'], summary: 'Il grafo nel browser, servito in locale dalla mod.', detail: 'Parte dalla UI progettata in M2.', files: [], chat: [] },
    { id: 'm3.3', parent: 'm3', title: 'Export di STATE e LOG', status: 'todo', after: ['m3.1'], summary: 'STATE e LOG generati dal grafo a fine milestone.', detail: 'Requisito F6.', files: [], chat: [] },
    { id: 'm3.4', parent: 'm3', title: 'Segnalibri nella chat', status: 'todo', after: ['m3.1'], continues: 'b5', summary: 'Un punto della chat marcato a mano diventa un nodo.', detail: 'Requisito C6.', files: [], chat: [] },

    { id: 'm4', title: 'M4 Revisione e feedback', status: 'todo', after: ['m3'], summary: 'Usarlo sul serio e correggere.', detail: 'Il primo utente è questo progetto.', files: [], chat: [] },
    { id: 'm4.1', parent: 'm4', title: 'Dogfooding su questo progetto', status: 'todo', summary: 'Sostituire la traccia a mano con quella generata.', detail: 'Confronto con docs/process-trace.md.', files: [], chat: [] },
    { id: 'm4.2', parent: 'm4', title: 'Prova su una nuova release', status: 'todo', after: ['m4.1'], summary: 'Rilanciare i test della mod su una release nuova di Claude Code.', detail: 'L’API delle mod può cambiare.', files: [], chat: [] },

    { id: 'm5', title: 'M5 Pubblicazione', status: 'todo', after: ['m4'], summary: 'Aprirlo alla community.', detail: 'Repo pubblico, in inglese.', files: [], chat: [] },
    { id: 'm5.1', parent: 'm5', title: 'LICENSE e NOTICE', status: 'todo', summary: 'Apache-2.0, con i crediti nel NOTICE.', detail: 'Decisa in M0 (deviazione sulla licenza).', files: [], chat: [] },
    { id: 'm5.2', parent: 'm5', title: 'README e docs in inglese', status: 'todo', summary: 'Installazione, uso, formato di .ariadne/.', detail: 'Le note di lavoro possono restare in italiano.', files: [], chat: [] },
    { id: 'm5.3', parent: 'm5', title: 'Rilascio', status: 'todo', after: ['m5.1', 'm5.2'], summary: 'Repo pubblico e prima versione.', detail: '', files: [], chat: [] },
  ],
}
