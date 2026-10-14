/**
 * Calls `onTick` on a fixed interval. Timer functions are injectable so the
 * ticker can be tested without real time.
 * @param {{
 *   intervalMs: number,
 *   onTick: () => void,
 *   timers?: { setInterval: typeof setInterval, clearInterval: typeof clearInterval },
 * }} options
 */
export function createTicker({ intervalMs, onTick, timers = globalThis }) {
  /** @type {ReturnType<typeof setInterval> | null} */
  let handle = null;
  return {
    start() {
      if (handle === null) handle = timers.setInterval(onTick, intervalMs);
    },
    stop() {
      if (handle !== null) {
        timers.clearInterval(handle);
        handle = null;
      }
    },
    get running() {
      return handle !== null;
    },
  };
}
