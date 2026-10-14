import { describe, expect, it } from 'vitest';
import { createMatch } from '../../src/core/match.js';
import { roundRobin } from '../../src/core/turn-policies.js';

const ids = ['a', 'b'];
const make = (overrides = {}) =>
  createMatch({ candidateIds: ids, target: 10, turnPolicy: roundRobin(ids), ...overrides });

describe('createMatch', () => {
  it('alternates turns between candidates', () => {
    const match = make();
    expect(match.state.nextId).toBe('a');
    match.applyRoll(3);
    expect(match.state.nextId).toBe('b');
    match.applyRoll(4);
    expect(match.state.scores).toEqual({ a: 3, b: 4 });
    expect(match.state.nextId).toBe('a');
  });

  it('reports leader and lead', () => {
    const match = make();
    match.applyRoll(5);
    expect(match.state).toMatchObject({ leaderId: 'a', lead: 5 });
    match.applyRoll(5);
    expect(match.state).toMatchObject({ leaderId: null, lead: 0 });
  });

  it('declares a winner at the target and ignores further rolls', () => {
    const match = make({ target: 5 });
    match.applyRoll(5);
    expect(match.state.winnerId).toBe('a');
    expect(match.state.nextId).toBeNull();
    expect(match.applyRoll(6)).toBeNull();
    expect(match.state.scores.b).toBe(0);
  });

  it('keeps history newest first and capped', () => {
    const match = make({ historyLimit: 2 });
    [1, 2, 3].forEach((v) => match.applyRoll(v));
    expect(match.state.history.map((h) => h.value)).toEqual([3, 2]);
    expect(match.state.lastRoll).toMatchObject({ id: 'a', value: 3, roll: 3 });
  });

  it('starts from an initial state and can reset', () => {
    const match = make({ target: 50, initial: { scores: { a: 27, b: 24 }, rollCount: 12 } });
    expect(match.state.rollCount).toBe(12);
    expect(match.state.nextId).toBe('a');
    match.reset();
    expect(match.state).toMatchObject({ rollCount: 0, scores: { a: 0, b: 0 }, history: [] });
  });

  it('validates input', () => {
    expect(() => make({ candidateIds: ['a', 'a'] })).toThrow(RangeError);
    expect(() => make({ target: 0 })).toThrow(RangeError);
    expect(() => make().applyRoll(0)).toThrow(RangeError);
  });
});
