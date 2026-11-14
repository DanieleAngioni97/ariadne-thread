// File proofs point where the memory lives: a path, and after `#` the start of a section title
// (`docs/implementazione.md#m3.9`). Pure: the disk comes in as `read(path)`, so the CLI checks it
// and the viewer can still show refs it cannot read.

/** `{ path, section }` of a file proof's ref; `section` is null without `#`. */
export function fileRef(ref) {
  const at = ref.indexOf('#')
  return at < 0 ? { path: ref, section: null } : { path: ref.slice(0, at), section: ref.slice(at + 1) }
}

/** The ref as people read it: `path § section`. */
export function showRef(ref) {
  const { path, section } = fileRef(ref)
  return section ? `${path} § ${section}` : path
}

const headings = text => text.split('\n').filter(l => /^#{1,6}\s/.test(l)).map(l => l.replace(/^#+\s+/, '').trim())

/**
 * Every file proof in `nodes` whose file is gone or whose section is not a heading of it, as
 * `{ id, ref, reason }`. `read(path)` answers the file's text, '' for a folder, null when missing.
 */
export function brokenRefs(nodes, { read }) {
  const broken = []
  for (const n of nodes) {
    for (const p of n.proof ?? []) {
      if (p?.type !== 'file' || typeof p.ref !== 'string') continue
      const { path, section } = fileRef(p.ref)
      const text = read(path)
      if (text === null) broken.push({ id: n.id, ref: p.ref, reason: 'file not found' })
      else if (section && !headings(text).some(h => h.startsWith(section))) broken.push({ id: n.id, ref: p.ref, reason: 'section not found' })
    }
  }
  return broken
}
