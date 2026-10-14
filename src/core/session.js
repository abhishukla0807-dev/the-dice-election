import { createEmitter } from './events.js';

/**
 * @typedef {object} ChangeMeta
 * @property {'roll' | 'win' | 'reset'} type
 * @property {import('./match.js').RollRecord} [roll]
 */

/**
 * Orchestrates one step of play: roll the dice, apply it to the match, notify
 * subscribers. Depends only on small abstractions (DIP).
 * @param {{
 *   match: ReturnType<typeof import('./match.js').createMatch>,
 *   dice: import('./dice.js').Dice,
 * }} deps
 */
export function createSession({ match, dice }) {
  const changes = createEmitter();

  return {
    get state() {
      return match.state;
    },

    /** Plays one roll, or starts a new match if the last one is decided. */
    step() {
      if (match.state.winnerId) {
        match.reset();
        changes.emit({ state: match.state, meta: { type: 'reset' } });
        return;
      }
      const roll = match.applyRoll(dice.roll());
      const state = match.state;
      changes.emit({
        state,
        meta: { type: state.winnerId ? 'win' : 'roll', roll: roll ?? undefined },
      });
    },

    /** @param {(state: import('./match.js').MatchState, meta: ChangeMeta) => void} listener */
    subscribe(listener) {
      return changes.on(({ state, meta }) => listener(state, meta));
    },
  };
}
