// Sample thread for the spike: the real history of this project's first session.
// Shape (draft of the .ariadne/ format): one flat list of nodes;
// `parent` = the node that contains it (levels), `after` = the nodes it follows (order, prerequisites).

const S = '9491e746'

export const data = {
  project: 'ariadne-thread',
  current: 'm1.2',
  nodes: [
    {
      id: 'p0', title: 'Project vision', status: 'done',
      summary: 'A graph UI so you never lose the thread of a multi-step process.',
      detail: 'In a chat the reasoning scrolls away; you forget how you reached a very specific function and why.',
      files: ['docs/vision.md'],
      chat: [],
    },
    {
      id: 'm0', title: 'M0 Research', status: 'done', after: ['p0'],
      summary: 'What already exists, and how to feed the graph from a Claude Code session.',
      detail: 'Phase 1 of the meta-process: no code, no stack. Ended with a mod as the source and a web viewer for the graph.',
      files: ['docs/research.md', 'docs/analysis-mod.md'],
      chat: [{ session: S, role: 'user', at: '09:02', text: 'Siamo alla fase 1 del meta-processo: la ricerca. Non scrivere codice e non scegliere ancora uno stack.' }],
    },
    {
      id: 'm0.2', parent: 'm0', title: 'Existing tools', status: 'done',
      summary: 'About 25 tools across mind maps, graph libraries, DAG viewers and agent tracers.',
      detail: 'No clone of the goal. Closest: Agent Flow, which graphs what the agent does, not the process. Rendering: React Flow + a DAG layout.',
      files: ['docs/research.md'],
      chat: [{ session: S, role: 'assistant', at: '09:20', text: 'Nessun clone del nostro obiettivo: ci sono grafi live dell’esecuzione, non del processo.' }],
    },
    { id: 'f1', parent: 'm0.2', title: 'Mind maps', status: 'done', summary: 'Markmap, Mermaid, JSON Canvas, Excalidraw, tldraw.', detail: 'Trees and canvases; no state per node, little live growth.', files: [], chat: [] },
    { id: 'f2', parent: 'm0.2', title: 'Graph libraries', status: 'done', summary: 'React Flow, Cytoscape, ELK, dagre, d3-dag, Sigma, G6.', detail: 'React Flow for custom nodes, ELK for nested layouts.', files: [], chat: [] },
    { id: 'f3', parent: 'm0.2', title: 'Agent tracers', status: 'done', summary: 'Langfuse, Phoenix, Agent Flow, claude-code-viewer.', detail: 'They trace execution after the fact; none shows where you are now.', files: [], chat: [] },
    {
      id: 'm0.3', parent: 'm0', title: 'Feeding from Claude Code', status: 'done',
      summary: 'Hooks, MCP, a file Claude edits, transcripts, SDK, OpenTelemetry.',
      detail: 'Hooks give reliable mechanics, MCP the only semantics, transcripts only for recovery because their format is internal.',
      files: ['docs/research.md'],
      chat: [],
    },
    {
      id: 'm0.4', parent: 'm0', title: 'Own repositories', status: 'done',
      summary: 'Reusable pieces in usage_collect.py, kb-cyberpunk and calderone-alchemico.',
      detail: 'Incremental JSONL reader, hooks that never block, an MCP server over the same service layer as a web UI.',
      files: ['~/.claude/scripts/usage_collect.py'],
      chat: [],
    },
    {
      id: 'm0.5', parent: 'm0', title: 'Synthesis', status: 'done', after: ['m0.2', 'm0.3', 'm0.4'],
      summary: 'Three candidate architectures; file-first that grows into automatic updates.',
      detail: 'The distinctive value is the process data model and the UI, not the ingestion.',
      files: ['docs/research.md'],
      chat: [],
    },
    {
      id: 'm0.8', parent: 'm0', title: 'A Claude Code mod', status: 'done', after: ['m0.5'],
      summary: 'A mod sees every row of the chat, calls the model on its own, draws a band and panes.',
      detail: 'It replaces a daemon, an MCP server and transcript parsing. The API is early access.',
      files: ['docs/analysis-mod.md'],
      chat: [{ session: S, role: 'user', at: '10:05', text: 'Possiamo valutare direttamente una mod per claude code anziché incasinarci no?' }],
    },
    {
      id: 'm0.9', parent: 'm0', title: 'STATE and LOG', status: 'done', after: ['m0.5'],
      summary: 'The graph becomes the source; STATE and LOG an export, for now.',
      detail: 'The fine graph stays local and unversioned; STATE and LOG remain the coarse record anyone can read.',
      files: ['STATE.md', 'LOG.md', 'docs/analysis-mod.md'],
      chat: [],
    },
    {
      id: 'd1', parent: 'm0', kind: 'detour', title: 'Which licence, and credits?', status: 'done', after: ['m0.9'],
      summary: 'A side question: what changes between licences, and how to know who uses it.',
      detail: 'Every common licence keeps the copyright; Apache-2.0 adds a NOTICE file. No licence can say who uses the code.',
      files: [],
      chat: [{ session: S, role: 'user', at: '10:31', text: 'Non ne ho idea, cosa cambia? Se la gente lo usa vorrei saperlo e vorrei i crediti.' }],
    },
    {
      id: 'm0.11', parent: 'm0', title: 'Terminal spike', status: 'done', after: ['m0.8', 'm0.9'],
      summary: 'A band and a /thread pane drawn in the terminal.',
      detail: 'Verdict: nice, but too terminal. The graph moves to a browser viewer; the band stays.',
      files: [],
      chat: [{ session: S, role: 'user', at: '11:12', text: 'Sembra carina ma è troppo da terminale, la vorrei esterna per farla carina.' }],
    },
    {
      id: 'b5', parent: 'm0', title: 'Chat bookmarks', status: 'todo', after: ['m0.11'],
      summary: 'Mark important points of the chat and come back with one click.',
      detail: 'Seen in VS Code, missing in the terminal. A bookmark is a node tied to a message id.',
      files: [],
      chat: [{ session: S, role: 'user', at: '10:28', text: 'Su VS Code c’erano anche dei bookmarks per segnare punti della chat importanti.' }],
    },
    {
      id: 'b4', parent: 'm0', title: 'Cost of the observer', status: 'todo', after: ['m0.8'],
      summary: 'Measure the quality and cost per turn of extracting nodes automatically.',
      detail: 'Haiku on the turn versus a fork over the whole session.',
      files: [],
      chat: [],
    },
    {
      id: 'm1', title: 'M1 Requirements', status: 'active', after: ['m0'],
      summary: 'Turn vision and research into requirements you can check.',
      detail: 'Draft written; the viewer spike decides the look before the requirements are fixed.',
      files: ['docs/requirements-draft.md'],
      chat: [],
    },
    {
      id: 'm1.1', parent: 'm1', title: 'Requirements draft', status: 'done',
      summary: 'Ids for shape, levels, state, context on click, jumping to the chat.',
      detail: 'Jumping to the chat goes through the terminal band: Claude Code only scrolls the chat on your own input there.',
      files: ['docs/requirements-draft.md'],
      chat: [{ session: S, role: 'user', at: '11:40', text: 'Con un click uno possa vedere il contesto, file di riferimento, e saltare a un punto della chat.' }],
    },
    {
      id: 'm1.2', parent: 'm1', title: 'Viewer spike', status: 'active', after: ['m1.1'],
      summary: 'This page: levels you can open, states, the thread, detours, context on click.',
      detail: 'Throwaway, on the spike/viewer branch. It is here so you can judge the look before the requirements are fixed.',
      files: ['spikes/viewer/index.html', 'spikes/viewer/model.js'],
      chat: [{ session: S, role: 'user', at: '11:40', text: 'Bisogna rendere evidente cosa è stato fatto, cosa è da fare, dove siamo adesso, le deviazioni.' }],
    },
    {
      id: 'm1.3', parent: 'm1', title: 'Refine requirements', status: 'todo', after: ['m1.2'],
      summary: 'Fold the spike verdict into the requirements.',
      detail: 'Then M2: data model, update flow, UI.',
      files: ['docs/requirements-draft.md'],
      chat: [],
    },
    {
      id: 'm2', title: 'M2 Design', status: 'todo', after: ['m1'],
      summary: 'Data model of the graph, how it updates, the UI.',
      detail: 'Starts once the requirements are fixed.',
      files: [],
      chat: [],
    },
  ],
}
