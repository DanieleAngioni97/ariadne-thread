# Visione

*Idea annotata il 2026-11-07.*

## Problema
In chat il ragionamento scorre e resta nel contesto, fuori controllo. Si perde il filo:
non si ricorda come si è arrivati a una funzione iperspecifica, perché la si sta facendo,
a cosa serve.

## Cosa vogliamo
Una UI che mostra, man mano che procede, il flusso di un processo a più step,
sequenziali e paralleli, con dipendenze. Esempi:
- una procedura completa: ricerca → analisi → requisiti → progettazione → implementazione → revisione → feedback → deploy;
- una sessione di debugging.

Requisiti:
- **Grafo** gradevole che cresce durante il lavoro.
- **Branch**: un punto nuovo da esplorare crea un ramo.
- **Stato** visibile per ogni nodo: affrontato, da fare, in corso.
- **Posizione corrente** sempre evidente: non si perde mai il punto in cui si è.
- **Hover** su un nodo: una frase di contesto.
- **Click** su un nodo: contesto dettagliato (perché, a cosa serve, da dove viene).
- Generico: supporto grafico a qualunque processo multi-step, non legato a un dominio.

## Obiettivo a lungo termine
Pubblicarlo per la community (open source).

## Come lo affrontiamo
Il progetto stesso segue un meta-processo:
1. Ricerca: strumenti esistenti (mind map, DAG viewer, task graph, tool per agenti) e come alimentare il grafo dalla sessione con Claude.
2. Analisi e requisiti.
3. Progettazione: modello dati del grafo, come si aggiorna, UI.
4. Implementazione, revisione, feedback.
