# ariadne-thread

UI a grafo che traccia un processo multi-step (ricerca → … → deploy, o debugging):
nodi con stato, rami, posizione corrente, contesto su hover/click.

- Visione e requisiti: `docs/vision.md`. Piano di M3: `docs/implementazione.md`. Specifica:
  `docs/ux/allineamento/specifica.md` (brief R1–R26 in `brief.md`).
- Destinato alla community: codice, README e docs pubblici vanno in inglese quando si
  passa all'implementazione; le note di lavoro in `docs/` possono restare in italiano.

## Il filo (dogfooding, R24)

`ariadne` = `node bin/ariadne.mjs`. Dove sei, da dove vieni e cosa viene dopo stanno in `.ariadne/`, non in
STATE.md o LOG.md scritti a mano: `handoff` qui non serve. All'avvio arriva da sola la scheda di stato;
a ogni prompt il riassunto, solo se è cambiato. Non frenare il lavoro per il grafo: traccia quello che fai già.

- **Riprendere dopo `/clear`:** leggi la scheda; per il resto cerca in `.ariadne/STATE.md` (una riga
  per nodo, generata), poi `node bin/ariadne.mjs why <id>` solo sui nodi che servono.
- **Commit:** ogni messaggio porta `Thread: <id>` del nodo su cui lavori; l'ultimo di un passo
  `Thread: <id> done: <esito in una riga>`. Un hook registra la prova e passa al passo successivo.
- **Piano approvato:** `ariadne plan <parent> "<passo>"… --ref "chat <data>: <cosa hai approvato>"`.
- **Fuori piano** (deviazione, cosa temporanea, rinvio): `ariadne add detour "<titolo>" --what "…"
  --start` (rientra da solo dove eri; chiudila con `close`), `defer <id> <milestone>`,
  `replace <id> <successore>`, `pause <id>` (un passo avviato troppo presto torna da fare). Entrano subito; la persona le conferma quando vuole.
- **Ragionamento da investigatore** (quando la persona lo chiede): una `list` per l'indagine, un
  `point` per indizio, una deduzione `point --after <indizi> --why "…"`; un'ipotesi smentita
  `replace <id> <indizio che la smentisce>`. `why <deduzione>` ricostruisce la catena.
- Le correzioni della persona («sposta X sotto Y», «annulla», «approvo tutto») →
  `move`, `undo`, `confirm --all`. Mai modificare `.ariadne/` a mano.

## Note operative

- Verifica: `node --test src/*.test.mjs bin/*.test.mjs hooks/*.test.mjs scripts/ariadne/*.test.mjs viewer/*.test.mjs eval/*.test.mjs` · `node bin/ariadne.mjs validate` ·
  `scripts/plugin-test.sh` (plugin: validazione e test della mod sui soli file tracciati).
- `docs/process-trace.md` è congelato; i nodi storici puntano alle sue sezioni e ai commit di allora.
- Prototipi da far provare: pulsanti con nomi e una riga di guida; aprirli con `open`, non con
  `human-review`. UI del grafo nel terminale bocciata. Viewer: `ariadne view`, porta 8790
  (8765 occupata), dopo modifiche Cmd+Shift+R.
- Screenshot: `uv run --with playwright`, `executable_path` sul Chromium in
  `~/Library/Caches/ms-playwright/chromium_headless_shell-1243/`.
- Spike della mod fuori dal repo: archiviato in `~/.claude/dev-mods-archive/ariadne-spike/` (il plugin vivo è la radice del repo: `.claude-plugin/`, `hooks/`, `types/`, `tests/`)
  (`claude plugin test`); API delle mod in early access, verifiche aperte in `m2.7`.
- Push solo su richiesta; PR nessuna per scelta dell'utente.
