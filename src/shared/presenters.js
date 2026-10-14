/**
 * Pure state -> text/number helpers shared by the server-rendered markup and
 * the browser views, so both always agree.
 * @typedef {import('../core/match.js').MatchState} MatchState
 * @typedef {(id: string) => string} NameOf
 */

/** @param {number} score @param {number} target */
export const progressRatio = (score, target) => Math.min(1, score / target);

/** @param {MatchState} state @param {string} id */
export const pointsToWin = (state, id) => Math.max(0, state.target - state.scores[id]);

/** @param {MatchState} state */
export function rollLabel(state) {
  return state.rollCount === 0 ? 'Ready' : `Roll ${state.rollCount}`;
}

/** @param {MatchState} state @param {NameOf} nameOf */
export function leadChipText(state, nameOf) {
  if (state.winnerId) return `${nameOf(state.winnerId)} wins`;
  if (!state.leaderId) return 'Scores level';
  return `${nameOf(state.leaderId)} leads by ${state.lead}`;
}

/** @param {MatchState} state @param {string} id */
export function cardLeadText(state, id) {
  if (state.winnerId) return state.winnerId === id ? 'Winner' : 'Final score';
  if (!state.leaderId) return 'Level';
  return state.leaderId === id ? `Leading by ${state.lead}` : `Trailing by ${state.lead}`;
}

/**
 * @param {MatchState} state
 * @param {string} id
 * @returns {{ label: string, tone: 'next' | 'idle' | 'winner' }}
 */
export function cardStatus(state, id) {
  if (state.winnerId) {
    return state.winnerId === id
      ? { label: 'Winner', tone: 'winner' }
      : { label: 'Final', tone: 'idle' };
  }
  if (state.nextId === id) return { label: 'Rolls next', tone: 'next' };
  if (state.lastRoll?.id === id) {
    return { label: `Just rolled +${state.lastRoll.value}`, tone: 'idle' };
  }
  return { label: 'Waiting', tone: 'idle' };
}

/** @param {MatchState} state @param {NameOf} nameOf */
export function rollResultText(state, nameOf) {
  if (state.winnerId) {
    return `${nameOf(state.winnerId)} wins with ${state.scores[state.winnerId]} points`;
  }
  if (!state.lastRoll) return 'Waiting for the first roll';
  return `${nameOf(state.lastRoll.id)} rolled ${state.lastRoll.value}`;
}

/** @param {MatchState} state @param {NameOf} nameOf */
export function nextRollText(state, nameOf) {
  return state.nextId
    ? `Rolls automatically. Next score goes to ${nameOf(state.nextId)}.`
    : 'A new round starts at the next roll.';
}
