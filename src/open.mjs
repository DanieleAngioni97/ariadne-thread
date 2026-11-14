// «Apri il grafo» (specifica § Banda): opens the viewer in the browser, starting it first when the
// port is free. The port, the server and the browser come in as functions, so this stays testable.

/**
 * Opens the viewer of `root` on `port`, on node `id` when given. `probe()` answers what /root says
 * (null when nothing listens), `start()` launches the viewer, `launch(url)` opens the browser.
 */
export async function openViewer({ root, port, id, probe, start, launch, wait = 100, tries = 30 }) {
  let answer = await probe()
  if (answer === null) {
    start()
    for (let i = 0; i < tries && answer !== root; i++) {
      await new Promise(resolve => setTimeout(resolve, wait))
      answer = await probe()
    }
    if (answer !== root) throw new Error(`il viewer non è partito sulla porta ${port}`)
  }
  if (answer !== root) throw new Error(`porta ${port} occupata da un altro server: chiudilo o usa --port`)
  const url = `http://127.0.0.1:${port}/${id ? `?select=${encodeURIComponent(id)}` : ''}`
  launch(url)
  return url
}
