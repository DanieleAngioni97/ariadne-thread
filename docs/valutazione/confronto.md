# Confronto con i concorrenti (D4, versione leggera)

*2026-11-15, passo `m4.4.11`. Deviazione dalla § 10 del piano, scelta dall'utente: niente schede anonime, giudici
di altre famiglie né kappa. Un agente `researcher` ha compilato una tabella a criteri fissi (scritti prima, con
i criteri 10–13 in cui un progetto giovane perde) da README e metadati GitHub. Non ha letto il codice dei
concorrenti. Legenda: [C] verificato (qui solo i metadati del repo), [D] dichiarato in README o docs,
[W] fonte secondaria. I numeri dei concorrenti sono dichiarazioni, non misure (P18). Confidenza: media.*

## Repository (API GitHub, 2026-11-15) [C]

| Strumento | Stelle | Ultimo push | Licenza |
|---|---|---|---|
| [Beads](https://github.com/gastownhall/beads) | 28,7k | 2026-11-15 | MIT |
| [Task Master](https://github.com/eyaltoledano/claude-task-master) | 28,4k | 2026-04-28 | MIT + Commons Clause |
| [Spec Kit](https://github.com/github/spec-kit) | 150k | 2026-11-12 | MIT |
| [Backlog.md](https://github.com/MrLesk/Backlog.md) | 7,4k | 2026-11-11 | MIT |
| [CCPM](https://github.com/automazeio/ccpm) | 8,5k | 2026-11-04 | MIT |
| [MCP servers](https://github.com/modelcontextprotocol/servers) (memory) | 92k | 2026-11-12 | NOASSERTION |
| [Cline](https://github.com/cline/cline) (Memory Bank) | 71,7k | 2026-11-13 | Apache-2.0 |
| [Aider](https://github.com/Aider-AI/aider) | 50,1k | 2026-05-22 | Apache-2.0 |
| [Agent Flow](https://github.com/patoles/agent-flow) | 1,8k | 2026-10-29 | Apache-2.0 |

## Criteri

1 registra il processo avvenuto · 2 «perché» delle decisioni · 3 prova verificata passo → commit/file ·
4 posizione corrente e prossimo passo · 5 deviazioni, rinvii e decisioni sostituite · 6 si aggiorna senza
richiesta · 7 costo di contesto limitato · 8 vista del processo · 9 in git, leggibile nei diff ·
10 maturità · 11 più agenti o team · 12 issue tracker · 13 installazione ed editor supportati.

y = sì, p = in parte, n = no, ? = non verificato.

| Strumento | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **ariadne** | y | y | y | y | y | y | y | y | y | n | n | n | p (solo Claude Code) |
| Beads | p | n | n | y | p | p | p | n | p | y | y | p | y |
| Task Master | n | p | n | y | p | n | p | n | p | p | n | ? | y |
| Spec Kit | p | y | n | p | n | n | n | n | ? | y | n | ? | y |
| Backlog.md | n | p | n | p | n | n | n | y | y | p | p | n | y |
| CCPM | p | p | p | y | n | p | n | n | y | p | y | y | y |
| Claude Code Tasks | n | n | n | p | n | y | ? | p | n | y | p | n | p |
| Claude Code auto-memory / CLAUDE.md | n | p | n | n | n | y | y | n | p | y | p | n | p |
| MCP memory | n | n | n | n | n | p | n | n | p | y | n | n | y |
| Cline Memory Bank | p | p | n | p | n | p | n | n | y | y | n | n | p |
| Aider (repo map) | n | n | n | n | n | y | y | n | p | y | n | n | y |
| Cursor memories/rules | n | p | n | n | n | p | ? | n | p | y | p | n | p |
| Agent Flow | y | n | n | p | n | y | – | y | n | p | p | n | p |
| Lore (arXiv 2603.15566) | p | y | y | n | p | p | p | n | y | n | n | n | y |

Note per cella, dal rapporto del researcher: Beads `bd ready` per il prossimo passo, `supersedes` come link,
Dolt come archivio e JSONL solo export; CCPM collega i commit a `Issue #N` senza verificarli; auto-memory
carica le prime 200 righe o 25 KB [W]; Aider ha un budget di token per la mappa [W]; Agent Flow mostra
l'esecuzione dal vivo senza salvare nulla; Lore mette il «perché» nei trailer dei commit, senza grafo dei passi.

La riga di ariadne la compila l'autore dal prodotto, non il researcher: è la parte meno indipendente.

## Che cosa porta ariadne

- **Prova e «perché» nello stesso grafo in git:** nessun altro lega ogni passo a un commit verificato e al suo
  motivo. I più vicini: CCPM (commit legati alle issue, non verificati) e Lore («perché» per commit, senza passi).
- **Contesto a tetto con lo stato del lavoro:** la scheda d'avvio ha un limite (≤ 3500 caratteri) e il
  riassunto per prompt arriva solo se cambia. Auto-memory e Aider hanno un tetto, ma non portano lo stato del
  processo.
- **Mai cancellare:** le decisioni sostituite puntano al successore; deviazioni e rinvii sono nodi. Solo Beads
  ha qualcosa di simile (`supersedes`).
- **Niente handoff a mano:** il grafo si aggiorna da hook e trailer dei commit. Cline Memory Bank, CCPM e Task
  Master aspettano che qualcuno lo chieda.
- **Una vista della storia del lavoro:** Backlog.md mostra una kanban, Agent Flow l'esecuzione dal vivo; nessuno
  dei due la storia persistente.

## Dove gli altri sono migliori

- Maturità e comunità: Spec Kit 150k stelle, Cline 71,7k, Beads 28,7k. ariadne è un progetto di una persona.
- Più agenti e team: Beads (claim atomico, messaggi, server Dolt) e CCPM (worktree, agenti in parallelo).
- Issue tracker: CCPM e Beads sincronizzano GitHub Issues; ariadne no.
- Editor e agenti: Spec Kit, Beads e Backlog.md ne supportano molti; ariadne solo Claude Code.
- Interfaccia modificabile: Backlog.md ha una kanban editabile; il viewer di ariadne è in sola lettura.

## Lacune

Non verificati sulla documentazione ufficiale: persistenza dei Tasks di Claude Code, memorie di Cursor, budget
della mappa di Aider. Nessuna implementazione di riferimento cercata per Lore né altri strumenti ADR del 2026.
