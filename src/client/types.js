/**
 * Every state-driven view implements this one small interface (ISP).
 * @typedef {object} StateView
 * @property {(state: import('../core/match.js').MatchState, meta: import('../core/session.js').ChangeMeta) => void} render
 *
 * @typedef {object} ViewContext
 * @property {(id: string) => string} nameOf
 * @property {(id: string) => 'left' | 'right'} sideOf
 */
export {};
