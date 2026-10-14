import { describe, expect, it, vi } from 'vitest';
import { createCountdown } from '../../src/core/countdown.js';
import { createTicker } from '../../src/core/ticker.js';

describe('createCountdown', () => {
  it('fires onElapsed at zero and restarts', () => {
    const onTick = vi.fn();
    const onElapsed = vi.fn();
    const countdown = createCountdown({ seconds: 3, onTick, onElapsed });
    countdown.tick();
    countdown.tick();
    expect(onElapsed).not.toHaveBeenCalled();
    countdown.tick();
    expect(onElapsed).toHaveBeenCalledOnce();
    expect(onTick.mock.calls.map(([n]) => n)).toEqual([2, 1, 3]);
  });
});

describe('createTicker', () => {
  it('starts once and stops cleanly using injected timers', () => {
    const timers = { setInterval: vi.fn(() => 7), clearInterval: vi.fn() };
    const ticker = createTicker({ intervalMs: 1000, onTick: () => {}, timers });
    ticker.start();
    ticker.start();
    expect(timers.setInterval).toHaveBeenCalledTimes(1);
    expect(ticker.running).toBe(true);
    ticker.stop();
    expect(timers.clearInterval).toHaveBeenCalledWith(7);
    expect(ticker.running).toBe(false);
  });
});
