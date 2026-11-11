# ariadne-thread

UI a grafo che traccia un processo multi-step (ricerca → … → deploy, o debugging):
nodi con stato, rami, posizione corrente, contesto su hover/click.

- Visione e requisiti: `docs/vision.md`. Piano di M3: `docs/implementazione.md`. Specifica:
  `docs/ux/allineamento/specifica.md` (brief R1–R26 in `brief.md`).
- Destinato alla community: codice, README e docs pubblici vanno in inglese quando si
  passa all'implementazione; le note di lavoro in `docs/` possono restare in italiano.

## Il filo (dogfooding, R24)

`ariadne` = `node bin/ariadne.mjs`. Dove sei, da dove vieni e cosa viene dopo stanno in `.ariadne/`, non in
STATE.md o LOG.md, che non esistono più: `handoff` qui non serve. Il riassunto arriva da solo a ogni
prompt. Non frenare il lavoro per il grafo: traccia quello che fai già.

- **Riprendere dopo `/clear`:** leggi il riassunto, poi `node bin/ariadne.mjs why <id>` sui nodi che
  servono e apri solo i «File utili». `show <id>` per un nodo, `log` per gli ultimi eventi.
- **Commit:** ogni messaggio porta `Thread: <id>` del nodo su cui lavori; l'ultimo di un passo
  `Thread: <id> done: <esito in una riga>`. Un hook registra la prova e passa al passo successivo.
- **Piano approvato:** `ariadne plan <parent> "<passo>"… --ref "chat <data>: <cosa hai approvato>"`.
- **Fuori piano** (deviazione, cosa temporanea, rinvio): `ariadne add detour "<titolo>" --what "…"
  --start` (rientra da solo dove eri; chiudila con `close`), `defer <id> <milestone>`,
  `replace <id> <successore>`. Entrano subito; la persona le conferma quando vuole.
- **Ragionamento da investigatore** (quando la persona lo chiede): una `list` per l'indagine, un
  `point` per indizio, una deduzione `point --after <indizi> --why "…"`; un'ipotesi smentita
  `replace <id> <indizio che la smentisce>`. `why <deduzione>` ricostruisce la catena.
- Le correzioni della persona («sposta X sotto Y», «annulla», «approvo tutto») →
  `move`, `undo`, `confirm --all`. Mai modificare `.ariadne/` a mano.

## Note operative

- Verifica: `node --test src/ bin/ scripts/ariadne/ viewer/` · `node bin/ariadne.mjs validate`.
- `docs/process-trace.md` è congelato; 25 nodi storici sono `uncertain`.
- Prototipi da far provare: pulsanti con nomi e una riga di guida; aprirli con `open`, non con
  `human-review`. UI del grafo nel terminale bocciata. Viewer: `ariadne view`, porta 8790
  (8765 occupata), dopo modifiche Cmd+Shift+R.
- Screenshot: `uv run --with playwright`, `executable_path` sul Chromium in
  `~/Library/Caches/ms-playwright/chromium_headless_shell-1243/`.
- Spike della mod fuori dal repo: `~/.claude/dev-mods/9491e746-5169-4bed-8881-53945d893b0b/ariadne-spike/`
  (`claude plugin test`); API delle mod in early access, verifiche aperte in `m2.7`.
- Push solo su richiesta; PR nessuna per scelta dell'utente.
