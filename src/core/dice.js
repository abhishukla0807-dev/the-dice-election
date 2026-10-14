/**
 * @typedef {object} Dice
 * @property {number} sides
 * @property {() => number} roll Returns an integer between 1 and `sides`.
 */

/**
 * @param {{ sides?: number, rng: import('./rng.js').Rng }} options
 * @returns {Dice}
 */
export function createDice({ sides = 6, rng }) {
  if (!Number.isInteger(sides) || sides < 2) {
    throw new RangeError('A dice needs at least two sides.');
  }
  if (typeof rng !== 'function') {
    throw new TypeError('createDice requires an rng function.');
  }
  return Object.freeze({
    sides,
    roll: () => Math.floor(rng() * sides) + 1,
  });
}
