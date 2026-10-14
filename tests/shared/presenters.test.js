import { describe, expect, it } from 'vitest';
import { createMatch } from '../../src/core/match.js';
import { roundRobin } from '../../src/core/turn-policies.js';
import {
  cardLeadText,
  cardStatus,
  leadChipText,
  nextRollText,
  pointsToWin,
  progressRatio,
  rollResultText,
} from '../../src/shared/presenters.js';

const ids = ['a', 'b'];
const names = { a: 'Ann', b: 'Bob' };
const nameOf = (id) => names[id];
const sample = createMatch({
  candidateIds: ids,
  target: 50,
  turnPolicy: roundRobin(ids),
  initial: {
    scores: { a: 27, b: 24 },
    rollCount: 12,
    history: [{ id: 'b', value: 4, roll: 12 }],
  },
}).state;

describe('presenters', () => {
  it('describes the lead', () => {
    expect(leadChipText(sample, nameOf)).toBe('Ann leads by 3');
    expect(cardLeadText(sample, 'a')).toBe('Leading by 3');
    expect(cardLeadText(sample, 'b')).toBe('Trailing by 3');
  });

  it('describes whose turn it is and the last roll', () => {
    expect(cardStatus(sample, 'a')).toEqual({ label: 'Rolls next', tone: 'next' });
    expect(cardStatus(sample, 'b')).toEqual({ label: 'Just rolled +4', tone: 'idle' });
    expect(rollResultText(sample, nameOf)).toBe('Bob rolled 4');
    expect(nextRollText(sample, nameOf)).toContain('Ann');
  });

  it('computes progress', () => {
    expect(progressRatio(27, 50)).toBeCloseTo(0.54);
    expect(progressRatio(60, 50)).toBe(1);
    expect(pointsToWin(sample, 'a')).toBe(23);
  });

  it('describes a finished match', () => {
    const done = createMatch({
      candidateIds: ids,
      target: 5,
      turnPolicy: roundRobin(ids),
      initial: { scores: { a: 5, b: 1 } },
    }).state;
    expect(leadChipText(done, nameOf)).toBe('Ann wins');
    expect(cardStatus(done, 'a').tone).toBe('winner');
    expect(cardLeadText(done, 'b')).toBe('Final score');
  });
});
