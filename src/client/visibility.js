/**
 * Pauses a ticker while the tab is hidden, so the game does not burn battery
 * or silently play rounds nobody sees.
 * @param {{ start: () => void, stop: () => void }} ticker
 */
export function pauseWhenHidden(ticker) {
  const sync = () => (document.hidden ? ticker.stop() : ticker.start());
  document.addEventListener('visibilitychange', sync);
  sync();
}
