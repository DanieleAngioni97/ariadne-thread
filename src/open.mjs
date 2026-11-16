// «Apri il grafo» (specifica § Banda): opens the viewer in the browser, starting it first when this
// project's viewer is not up. The port, the server and the browser come in as functions, so this stays testable.

import { words } from './i18n.mjs'

const say = words({
  en: {
    taken: port => `port ${port} is held by another server: close it or use another --port`,
    down: port => `the viewer did not start (port ${port})`,
  },
  it: {
    taken: port => `porta ${port} occupata da un altro server: chiudilo o usa un'altra --port`,
    down: port => `il viewer non è partito (porta ${port})`,
  },
})

/** The command that opens `url` in the default browser: `open` on macOS, `start` on Windows, `xdg-open` elsewhere. */
export function browserCommand(platform, url) {
  if (platform === 'darwin') return ['open', [url]]
  if (platform === 'win32') return ['cmd', ['/c', 'start', '', url]]
  return ['xdg-open', [url]]
}

/**
 * Opens the viewer of `root`, on node `id` when given. `port()` is the project's port, read again
 * on every try because a viewer started elsewhere may save another one; `probe(port)` answers what
 * /root says (null when nothing listens), `start()` launches the viewer, `launch(url)` opens the browser.
 * A port `fixed` by hand is never swapped: another server on it is an error.
 * `own` is the package this command runs from; `packageOf(port)` what /package says (null before 0.1.3),
 * `quit(port)` asks that viewer to close. A viewer of this project run by another package, as after
 * `claude plugin update`, would serve the old code: it is closed and started anew from `own`.
 */
export async function openViewer({
  root, port, id, probe, start, launch, fixed = false, wait = 100, tries = 30,
  own, packageOf = async () => own, quit = async () => {},
}) {
  const ours = async () => {
    const at = port()
    return (await probe(at)) === root && (await packageOf(at)) === own
  }
  const answer = await probe(port())
  if (fixed && answer !== null && answer !== root) throw new Error(say('taken', port()))
  const current = answer === root && (await packageOf(port())) === own
  if (answer === root && !current) await quit(port())
  if (!current) {
    // Nothing there, another project's server or an old viewer that would not close: the viewer finds a port of its own.
    start()
    let up = false
    for (let i = 0; i < tries && !up; i++) {
      await new Promise(resolve => setTimeout(resolve, wait))
      up = await ours()
    }
    if (!up) throw new Error(say('down', port()))
  }
  const url = `http://127.0.0.1:${port()}/${id ? `?select=${encodeURIComponent(id)}` : ''}`
  launch(url)
  return url
}
