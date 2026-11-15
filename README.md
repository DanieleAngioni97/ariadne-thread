# ariadne

Ariadne's thread for long work with Claude Code. As you research, design, build and debug, a graph
of the steps grows in your project, and every session starts knowing where you are, where you came
from and what comes next — even after `/clear`.

- **A state card** when a session starts, and a short summary on each prompt when it changed.
- **A band above the prompt:** the current step, what waits for your confirmation, the last outcome.
- **A viewer in the browser:** the whole graph, a timeline and a list, with why each step exists.
- **No extra work:** Claude records steps as it goes; each commit with a `Thread:` line is the proof of a step.

## Install

You need [Claude Code](https://code.claude.com) and [Node.js](https://nodejs.org) 20 or later.
At the Claude Code prompt:

```
/plugin install ariadne --marketplace DanieleAngioni97/ariadne-thread
```

Answer `y` to add the marketplace, pick a scope, then, in each project you want to follow:

```
/ariadne:init
```

That's all. The plugin stays silent in projects without `ariadne init`.

## Use it

Work as usual. When you approve a plan, Claude records its steps; when it commits, the step's
evidence is recorded and the thread moves on. Things you can say:

| You say | Claude runs |
| --- | --- |
| "ok, go with that plan" | `ariadne plan <parent> "<step>"… --ref "chat <date>: …"` |
| "fix CI first" | `ariadne add detour "…" --start` (it returns where you were) |
| "move X under Y", "undo", "approve all" | `ariadne move X Y`, `ariadne undo`, `ariadne confirm --all` |
| "open the graph" | `ariadne open` |
| "why are we doing this?" | `ariadne why <id>` |

The band's **Apri il grafo** button opens the viewer too. Each project gets its own viewer port,
so sessions on several projects don't collide.

Everything lives in `.ariadne/` in your project: `graph.jsonl` (the steps), `log.jsonl` (the diary)
and `thread.json` (where you are). Commit them with your code; the generated `STATE.md` and the
machine-local `local.json` stay out of git.

## Status

Early. The band uses Claude Code's mods API, which is in early access. The command line and the band
speak Italian for now; the viewer speaks English and Italian.

## Develop

```sh
git clone https://github.com/DanieleAngioni97/ariadne-thread && cd ariadne-thread
node --test src/ bin/ hooks/ scripts/ariadne/ viewer/ eval/*.test.mjs   # CLI, hooks and viewer
scripts/plugin-test.sh                                                  # plugin validation and band tests
```

To run your working copy as the plugin, add the folder as a marketplace (`/plugin marketplace add ./`)
and install `ariadne` from it: the plugin is then read from the folder, and `/reload-plugins` picks
up your edits.

## License

[MIT](LICENSE)
