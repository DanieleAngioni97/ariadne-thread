// What `ariadne band` prints (src/band.mjs): the rows of the band and the viewer's port.

export type Action =
  | { label: string; run: string[] }
  | { label: string; say: string }
  | { label: string; open: string }
  | { label: string; review: number }

export type WhereRow = { kind: 'where'; before: string; current: string; after: string }
export type TextRow = { kind: 'context' | 'queue' | 'error' | 'outcome' | 'empty'; text: string; actions: Action[] }
export type Row = WhereRow | TextRow

export type Band = { viewer: number; rows: Row[] }

declare module 'claude-code' {
  interface PluginState {
    ariadne: { band: Band | null; review: number | null }
  }
}
