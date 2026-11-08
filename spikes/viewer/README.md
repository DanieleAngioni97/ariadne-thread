# Viewer spike (throwaway)

A static page to judge the look of the thread viewer before the requirements are fixed.
Sample data in `data.js` (this project's history and end-to-end plan, in Italian); graph logic in `model.js`;
interface words in `i18n.js` (English and Italian).

```sh
python3 -m http.server 8790 --bind 127.0.0.1 --directory spikes/viewer   # then open http://127.0.0.1:8790/
node --test spikes/viewer/                                                # model tests
```

Optional URL state: `?level=milestones|path|all`, `?select=<node id>`, `?lang=en|it` (default: the browser's language).
Libraries load from esm.sh/unpkg (React 19, @xyflow/react 12.12.1, elkjs 0.12.1, htm 3.1.1): no install, needs network.
"Show in chat" is simulated.
