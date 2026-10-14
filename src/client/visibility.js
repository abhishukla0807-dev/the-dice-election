/**
 * Pauses a ticker while the tab is hidden, so the game does not burn battery
 * or silently play rounds nobody sees.
 * @param {{ start: () => void, stop: () => void }} ticker
 * @param {() => void} [onResume]
 */
export function pauseWhenHidden(ticker, onResume) {
  const sync = () => {
    if (document.hidden) {
      ticker.stop();
    } else {
      onResume?.();
      ticker.start();
    }
  };
  document.addEventListener('visibilitychange', sync);
  sync();
  return () => document.removeEventListener('visibilitychange', sync);
}
