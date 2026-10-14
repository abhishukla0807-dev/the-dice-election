/**
 * Counts whole seconds down and fires `onElapsed` each time it reaches zero,
 * then starts over. Driven from outside via `tick()`.
 * @param {{
 *   seconds: number,
 *   onTick: (remaining: number) => void,
 *   onElapsed: () => void,
 * }} options
 */
export function createCountdown({ seconds, onTick, onElapsed }) {
  if (!Number.isInteger(seconds) || seconds < 1) {
    throw new RangeError('seconds must be a positive integer.');
  }
  let remaining = seconds;
  return {
    get remaining() {
      return remaining;
    },
    reset() {
      remaining = seconds;
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
