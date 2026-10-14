import { describe, expect, it } from 'vitest';
import {
  formatCountdownIST,
  getISTDate,
  getISTDateString,
  getMsUntilMidnightIST,
  pickMatchupWinner,
} from '../../src/client/daily-winner.js';

describe('daily-winner time calculations', () => {
  it('correctly calculates IST date', () => {
    // 2026-10-14 12:00:00 UTC -> 2026-10-14 17:30:00 IST
    const utcDate = new Date(Date.UTC(2026, 9, 14, 12, 0, 0));
    const ist = getISTDate(utcDate);
    expect(ist.getUTCHours() * 60 + ist.getUTCMinutes()).toBe(17 * 60 + 30);
  });

  it('formats IST date string as YYYY-MM-DD', () => {
    const utcDate = new Date(Date.UTC(2026, 9, 14, 12, 0, 0));
    const ist = getISTDate(utcDate);
    const dateStr = getISTDateString(ist);
    expect(dateStr).toBe('2026-10-14');
  });

  it('calculates remaining milliseconds until midnight IST', () => {
    // 2026-10-14 17:30:00 IST -> 6.5 hours to midnight IST
    const utcDate = new Date(Date.UTC(2026, 9, 14, 12, 0, 0));
    const msLeft = getMsUntilMidnightIST(utcDate);
    const hoursLeft = msLeft / (1000 * 60 * 60);
    expect(hoursLeft).toBeCloseTo(6.5, 1);
  });

  it('formats countdown string as HHh MMm SSs', () => {
    const ms = 2 * 3600 * 1000 + 15 * 60 * 1000 + 42 * 1000;
    expect(formatCountdownIST(ms)).toBe('02h 15m 42s');
  });
});

describe('pickMatchupWinner (separate winners per matchup)', () => {
  const names = {
    rahul: 'Rahul Gandhi',
    modi: 'Narendra Modi',
    akhilesh: 'Akhilesh Yadav',
    yogi: 'Yogi Adityanath',
  };
  const nameOf = (id) => names[id] ?? id;

  it('picks winner only among candidates in the specified matchup', () => {
    // Even if Rahul has 99 points, on Akhilesh vs Yogi it must only evaluate Akhilesh & Yogi
    const scores = { rahul: 99, modi: 80, akhilesh: 35, yogi: 22 };
    const winner = pickMatchupWinner(scores, ['akhilesh', 'yogi'], nameOf);

    expect(winner).toEqual({
      id: 'akhilesh',
      name: 'Akhilesh Yadav',
      score: 35,
    });
  });

  it('picks Modi when Modi has higher score in Rahul vs Modi', () => {
    const scores = { rahul: 42, modi: 48, akhilesh: 60 };
    const winner = pickMatchupWinner(scores, ['rahul', 'modi'], nameOf);

    expect(winner).toEqual({
      id: 'modi',
      name: 'Narendra Modi',
      score: 48,
    });
  });

  it('returns null if candidate list is empty', () => {
    const winner = pickMatchupWinner({ rahul: 10 }, [], nameOf);
    expect(winner).toBeNull();
  });
});
