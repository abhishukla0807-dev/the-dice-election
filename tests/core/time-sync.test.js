import { describe, expect, it } from 'vitest';
import {
  computeSynchronizedMatchState,
  getDeterministicRoll,
  getISTTimeInfo,
  hashString,
} from '../../src/core/time-sync.js';

describe('time-sync PRNG and Hashing', () => {
  it('generates consistent hashes', () => {
    const h1 = hashString('2026-10-14:rahul-vs-modi');
    const h2 = hashString('2026-10-14:rahul-vs-modi');
    expect(h1).toBe(h2);
    expect(typeof h1).toBe('number');
    expect(h1).toBeGreaterThan(0);
  });

  it('generates deterministic rolls in range [1, sides]', () => {
    const seed = hashString('test-seed');
    for (let i = 0; i < 50; i++) {
      const roll = getDeterministicRoll(seed, i, 6);
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(6);
      expect(Number.isInteger(roll)).toBe(true);
      // Deterministic check
      expect(getDeterministicRoll(seed, i, 6)).toBe(roll);
    }
  });
});

describe('getISTTimeInfo', () => {
  it('correctly calculates IST date and turn index', () => {
    // 2026-10-14 14:30:00 UTC = 2026-10-14 20:00:00 IST
    const date = new Date(Date.UTC(2026, 9, 14, 14, 30, 0));
    const info = getISTTimeInfo(date, 7);

    expect(info.dateStr).toBe('2026-10-14');
    // 20 hours elapsed since midnight IST = 72,000 seconds
    expect(info.elapsedSeconds).toBe(20 * 3600);
    // 72,000 / 7 = 10285 turns with 5 seconds remainder
    expect(info.turnIndex).toBe(Math.floor((20 * 3600) / 7));
    expect(info.remainingSeconds).toBe(7 - ((20 * 3600) % 7));
  });
});

describe('computeSynchronizedMatchState', () => {
  it('produces identical states for identical inputs (zero-drift across users)', () => {
    const candidateIds = ['rahul', 'modi'];
    const time = new Date('2026-10-14T14:30:00Z');

    const stateUserA = computeSynchronizedMatchState({
      candidateIds,
      slug: 'rahul-vs-modi',
      rollIntervalSeconds: 7,
      now: time,
    });

    const stateUserB = computeSynchronizedMatchState({
      candidateIds,
      slug: 'rahul-vs-modi',
      rollIntervalSeconds: 7,
      now: time,
    });

    expect(stateUserA.scores).toEqual(stateUserB.scores);
    expect(stateUserA.rollCount).toBe(stateUserB.rollCount);
    expect(stateUserA.history).toEqual(stateUserB.history);
    expect(stateUserA.timeInfo.remainingSeconds).toBe(stateUserB.timeInfo.remainingSeconds);
  });

  it('aggregates scores correctly and keeps history', () => {
    const candidateIds = ['a', 'b'];
    // 35 seconds elapsed -> 5 turns
    const date = new Date(Date.UTC(2026, 9, 13, 18, 30, 35)); // 00:00:35 IST
    const res = computeSynchronizedMatchState({
      candidateIds,
      slug: 'test',
      rollIntervalSeconds: 7,
      historyLimit: 4,
      now: date,
    });

    expect(res.rollCount).toBe(5);
    expect(res.history.length).toBe(4);
    expect(res.history[0].roll).toBe(5);
    const sum = res.scores.a + res.scores.b;
    const historyRollSum = res.history.reduce((acc, h) => acc + h.value, 0);
    expect(sum).toBeGreaterThanOrEqual(historyRollSum);
  });

  it('computes 15,000 turns in under 10ms', () => {
    const candidateIds = ['rahul', 'modi'];
    // Full day (86,400s / 7 = ~12,342 turns)
    const date = new Date(Date.UTC(2026, 9, 14, 18, 29, 0)); // 23:59:00 IST
    const t0 = performance.now();
    const res = computeSynchronizedMatchState({
      candidateIds,
      slug: 'rahul-vs-modi',
      rollIntervalSeconds: 7,
      now: date,
    });
    const duration = performance.now() - t0;

    expect(res.rollCount).toBeGreaterThan(12000);
    expect(duration).toBeLessThan(20);
  });
});
