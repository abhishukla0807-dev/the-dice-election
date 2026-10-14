/**
 * Counts whole seconds down and fires `onElapsed` each time it reaches zero,
 * then starts over. Driven from outside via `tick()`.
 * @param {{
 *   seconds: number,
 *   onTick: (remaining: number) => void,
 *   onElapsed: () => void,
 *   initialRemaining?: number,
 * }} options
 */
export function createCountdown({ seconds, onTick, onElapsed, initialRemaining }) {
  if (!Number.isInteger(seconds) || seconds < 1) {
    throw new RangeError('seconds must be a positive integer.');
  }
  let remaining = initialRemaining !== undefined ? initialRemaining : seconds;
  return {
    get remaining() {
      return remaining;
    },
    reset(newRemaining = seconds) {
      remaining = newRemaining;
      onTick(remaining);
    },
    tick() {
      remaining -= 1;
      if (remaining <= 0) {
        remaining = seconds;
        onElapsed();
      }
      onTick(remaining);
    },
  };
}
