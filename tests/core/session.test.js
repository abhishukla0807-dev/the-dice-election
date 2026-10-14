import { describe, expect, it, vi } from 'vitest';
import { createMatch } from '../../src/core/match.js';
import { createSession } from '../../src/core/session.js';
import { roundRobin } from '../../src/core/turn-policies.js';

const ids = ['a', 'b'];
function setup(target = 5) {
  const match = createMatch({ candidateIds: ids, target, turnPolicy: roundRobin(ids) });
  const dice = { sides: 6, roll: vi.fn(() => 5) };
  return { session: createSession({ match, dice }), dice };
}

describe('createSession', () => {
  it('rolls, applies and notifies', () => {
    const { session, dice } = setup(50);
    const listener = vi.fn();
    session.subscribe(listener);
    session.step();
    expect(dice.roll).toHaveBeenCalledOnce();
    const [state, meta] = listener.mock.calls[0];
    expect(state.scores.a).toBe(5);
    expect(meta).toMatchObject({ type: 'roll', roll: { id: 'a', value: 5 } });
  });

  it('emits "win" then starts over on the next step', () => {
    const { session } = setup(5);
    const types = [];
    session.subscribe((_, meta) => types.push(meta.type));
    session.step();
    session.step();
    expect(types).toEqual(['win', 'reset']);
    expect(session.state.scores).toEqual({ a: 0, b: 0 });
  });

  it('stops notifying after unsubscribe', () => {
    const { session } = setup(50);
    const listener = vi.fn();
    const off = session.subscribe(listener);
    off();
    session.step();
    expect(listener).not.toHaveBeenCalled();
  });
});
