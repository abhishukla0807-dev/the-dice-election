/**
 * @typedef {object} RollRecord
 * @property {string} id Candidate id.
 * @property {number} value Dice value.
 * @property {number} roll Sequence number of the roll (1-based).
 *
 * @typedef {object} MatchState
 * @property {number} target
 * @property {readonly string[]} candidateIds
 * @property {Readonly<Record<string, number>>} scores
 * @property {number} rollCount
 * @property {readonly RollRecord[]} history Newest first.
 * @property {string | null} nextId
 * @property {RollRecord | null} lastRoll
 * @property {string | null} leaderId
 * @property {number} lead
 * @property {string | null} winnerId
 *
 * @typedef {object} MatchOptions
 * @property {readonly string[]} candidateIds
 * @property {number} target
 * @property {import('./turn-policies.js').TurnPolicy} turnPolicy
 * @property {number} [historyLimit]
 * @property {{ scores?: Record<string, number>, rollCount?: number, history?: RollRecord[] }} [initial]
 */

/**
 * Pure game state machine. It knows nothing about dice, timers or the DOM.
 * @param {MatchOptions} options
 */
export function createMatch({ candidateIds, target, turnPolicy, historyLimit = 4, initial = {} }) {
  if (new Set(candidateIds).size < 2) {
    throw new RangeError('A match needs at least two distinct candidates.');
  }
  const isUnlimited = target === Infinity || target === null || target === undefined;
  if (!isUnlimited && (!Number.isInteger(target) || target < 1)) {
    throw new RangeError('target must be a positive integer.');
  }

  /** @type {Record<string, number>} */
  let scores;
  let rollCount;
  /** @type {RollRecord[]} */
  let history;
  /** @type {string | null} */
  let winnerId;

  function load({ scores: s = {}, rollCount: n = 0, history: h = [] } = {}) {
    scores = Object.fromEntries(candidateIds.map((id) => [id, s[id] ?? 0]));
    rollCount = n;
    history = h.slice(0, historyLimit).map((entry) => ({ ...entry }));
    winnerId = !isUnlimited ? (candidateIds.find((id) => scores[id] >= target) ?? null) : null;
  }
  load(initial);

  /** @returns {MatchState} */
  function snapshot() {
    const ranked = [...candidateIds].sort((a, b) => scores[b] - scores[a]);
    const hasLeader = scores[ranked[0]] > scores[ranked[1]];
    return Object.freeze({
      target,
      candidateIds,
      scores: Object.freeze({ ...scores }),
      rollCount,
      history: Object.freeze(history.map((entry) => Object.freeze({ ...entry }))),
      nextId: winnerId ? null : turnPolicy({ rollCount }),
      lastRoll: history[0] ?? null,
      leaderId: hasLeader ? ranked[0] : null,
      lead: hasLeader ? scores[ranked[0]] - scores[ranked[1]] : 0,
      winnerId,
    });
  }

  return {
    get state() {
      return snapshot();
    },

    /**
     * Adds `value` points to the candidate whose turn it is.
     * @param {number} value
     * @returns {RollRecord | null} The recorded roll, or null once the match is decided.
     */
    applyRoll(value) {
      if (!Number.isInteger(value) || value < 1) {
        throw new RangeError('A roll must be a positive integer.');
      }
      if (winnerId) return null;
      const id = turnPolicy({ rollCount });
      scores[id] += value;
      rollCount += 1;
      const record = { id, value, roll: rollCount };
      history = [record, ...history].slice(0, historyLimit);
      if (!isUnlimited && scores[id] >= target) winnerId = id;
      return { ...record };
    },

    /** Starts a fresh match with zero scores. */
    reset() {
      load();
    },

    /** Updates match state from synchronized state. */
    syncState(next = {}) {
      load(next);
    },
  };
}
