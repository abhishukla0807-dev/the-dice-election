import { describe, expect, it } from 'vitest';
import { createDice } from '../../src/core/dice.js';

describe('createDice', () => {
  it('maps the rng range onto 1..sides', () => {
    expect(createDice({ sides: 6, rng: () => 0 }).roll()).toBe(1);
    expect(createDice({ sides: 6, rng: () => 0.999999 }).roll()).toBe(6);
  });

  it('rejects invalid configuration', () => {
    expect(() => createDice({ sides: 1, rng: () => 0 })).toThrow(RangeError);
    expect(() => createDice({ sides: 6 })).toThrow(TypeError);
  });
});
