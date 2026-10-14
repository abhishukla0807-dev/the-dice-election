import { select, setText } from '../dom.js';

const RING_CIRCUMFERENCE = 94;

/** Not state-driven: it renders the forward elapsed seconds of the current interval. */
export function createCountdownView(root, totalSeconds) {
  const seconds = select(root, '[data-countdown-seconds]');
  const ring = select(root, '[data-countdown-ring]');

  return {
    /** @param {number} remaining */
    render(remaining) {
      // Clock always goes in forward direction: 0 -> totalSeconds
      const elapsed = Math.max(0, Math.min(totalSeconds, totalSeconds - remaining));
      setText(seconds, String(elapsed));
      ring?.style.setProperty(
        'stroke-dashoffset',
        String(RING_CIRCUMFERENCE * (1 - elapsed / totalSeconds)),
      );
    },
  };
}
