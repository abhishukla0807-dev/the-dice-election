/**
 * A turn policy decides who rolls next. It is a pure function of the match
 * progress, so new policies can be added without touching `Match` (OCP).
 * @typedef {(progress: { rollCount: number }) => string} TurnPolicy
 */

/**
 * Candidates take turns in the order given.
 * @param {readonly string[]} candidateIds
 * @returns {TurnPolicy}
 */
export function roundRobin(candidateIds) {
  return ({ rollCount }) => candidateIds[rollCount % candidateIds.length];
}
