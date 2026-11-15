# Viewer

The thread viewer: reads `.ariadne/` from the repo it is started in and draws the graph.
Graph logic for the drawing in `model.js`; interface words in `i18n.js` (English and Italian).

```sh
node bin/ariadne.mjs view [--port 8790]   # then open http://127.0.0.1:8790/
node --test viewer/                       # model, view and geometry tests
```

Three views share the detail panel: Graph, Timeline (`.ariadne/log.jsonl` by day) and List (every node by kind).
View logic in `views.js`, graph geometry in `nav.js`, state icons in `icons.js`.
Keys: arrows move between steps, Enter opens or closes a container, `/` searches, Esc closes the panel.

Optional URL state: `?view=graph|timeline|list`, `?level=milestones|path|all`, `?select=<node id>`, `?lang=en|it` (default: the browser's language).
Libraries load from esm.sh/unpkg (React 19, @xyflow/react 12.12.1, elkjs 0.12.1, htm 3.1.1): no install, needs network.
"Show in chat" is simulated.
