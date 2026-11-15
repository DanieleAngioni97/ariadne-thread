// «Apri il grafo» (specifica § Banda): opens the viewer in the browser, starting it first when this
// project's viewer is not up. The port, the server and the browser come in as functions, so this stays testable.

/**
 * Opens the viewer of `root`, on node `id` when given. `port()` is the project's port, read again
 * on every try because a viewer started elsewhere may save another one; `probe(port)` answers what
 * /root says (null when nothing listens), `start()` launches the viewer, `launch(url)` opens the browser.
 * A port `fixed` by hand is never swapped: another server on it is an error.
 */
export async function openViewer({ root, port, id, probe, start, launch, fixed = false, wait = 100, tries = 30 }) {
  let answer = await probe(port())
  if (fixed && answer !== null && answer !== root) throw new Error(`porta ${port()} occupata da un altro server: chiudilo o usa un'altra --port`)
  if (answer !== root) {
    // Nothing there, or another project's server: the viewer finds a port of its own.
    start()
    for (let i = 0; i < tries && answer !== root; i++) {
      await new Promise(resolve => setTimeout(resolve, wait))
      answer = await probe(port())
    }
    if (answer !== root) throw new Error(`il viewer non è partito (porta ${port()})`)
  }
  const url = `http://127.0.0.1:${port()}/${id ? `?select=${encodeURIComponent(id)}` : ''}`
  launch(url)
  return url
}
