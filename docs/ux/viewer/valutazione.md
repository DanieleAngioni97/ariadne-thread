# Valutazione — revisione del viewer · livello leggero · 2026-11-15
Revisione fatta da me su richiesta dell'utente («fatti tu da revisore»): giudico il mio lavoro, quindi
ho guardato più a fondo i passi di cui ero meno sicuro (adattamento, volo al nodo, tastiera).
Screenshot a 1440×900 e 900×800 sui dati veri del filo, un'immagine dopo ogni azione.

## Prima occhiata
- Si capisce che è il filo del lavoro: il percorso «Sei qui» in alto e il corrente col bordo rosso,
  leggibile senza zoom (prima: testo a ~5 px).
- L'occhio va al nodo corrente e al pannello; le tre schede Grafo · Cronologia · Elenco si vedono ma
  non rubano peso.

## Percorso per compito

| Compito | Passi | Esito | Problema |
|---|---|---|---|
| T1 Dove sono | 0 (apertura) | corrente visibile e leggibile | — |
| T2 Leggere un nodo, chiudere e riaprire il pannello | clic · × · clic | ok, il grafo prende tutta la larghezza | — |
| T3 Cosa è successo oggi, poi vederlo nel grafo | Cronologia · chip · clic su evento · «Mostra nel grafo» | **prima della correzione il volo finiva altrove** | il volo partiva sul layout vecchio e il livello si apriva tutto senza bisogno |
| T4 Rimandati nell'elenco | Elenco · chip «rimandato» · clic | ok | — |
| T5 Cerca e vai | / · testo · Invio | ok anche per nodi nascosti | — |
| T6 Finestra stretta (900 px) | — | il pannello copre tutto il canvas; si chiude con × | accettato: a quella larghezza non c'è posto per entrambi |

## Euristiche

| # | Esito | Problema (dove) | Gravità | Correzione |
|---|---|---|---|---|
| H1 | ok | — | — | pillola «Sei qui» quando il corrente è fuori vista |
| H3 | ok | — | — | × ed Esc chiudono; un clic riapre; la selezione resta tra le viste |
| H4 | ok | — | — | stesse icone ovunque; Esc chiude, Invio conferma |
| H6 | corretto | le frecce non avevano alcun indizio visibile | minor | una riga con i tre tasti in fondo alla legenda |
| H8 | ok | la legenda aperta alla prima visita copre l'angolo in basso a sinistra | minor | ricorda la chiusura; lasciato così |

## Criteri del brief

| Criterio | Obiettivo | Misurato | Esito |
|---|---|---|---|
| V1 corrente sempre visibile | mai tra i nascosti | visibile in tutti i livelli (test di finestra) | ✓ |
| V2 testo leggibile | titolo ≥ 11 px | zoom automatico ≥ 0,8 → 11,2 px | ✓ |
| V3 «cosa è successo oggi» | ≤ 2 azioni | 1 (scheda Cronologia) | ✓ |
| V4 stati senza legenda | forma diversa per stato | 6 forme distinte | ✓ (prova con un collega: da fare) |
| V5 dove sta il resto, torna al corrente | 1 azione | 1 (pillola o ultimo elemento del percorso) | ✓ |
| V6 tastiera | senza mouse | frecce, Invio, Esc, / | ✓ |
| V7 ricerca | ≤ 3 azioni | 3 (/ · testo · Invio) | ✓ |
| V8 movimento | ≤ 300 ms, ridotto se richiesto | 160–240 ms; volo 500 ms come prima | ✓ (volo invariato) |
| V9 da elenco/cronologia al grafo e ritorno | — | «Mostra nel grafo»; il ritorno ricrea la lista in cima | parziale: la posizione di scorrimento non si conserva |
| V10 pannello ritraibile | × o Esc | ✓ | ✓ |
| V11 comandi ≤ 28 px | — | tutti a 28 px | ✓ |

## Correzioni in ordine
1. [major, corretto] T3 «Mostra nel grafo» volava sul layout vecchio — `choose` ora apre un livello
   per intero solo se il nodo vi è nascosto, e il volo aspetta il layout che ha chiesto.
2. [minor, corretto] H6 tasti invisibili — riga nella legenda.
3. [minor, aperto] V9 tornando a Cronologia o Elenco lo scorrimento riparte dall'alto.
4. [minor, aperto] Finestra stretta: il pannello copre tutto.
