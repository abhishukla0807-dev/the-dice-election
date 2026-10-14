import { beforeEach, describe, expect, it } from 'vitest';
import {
  getReactionLeaders,
  incrementReaction,
  loadReactions,
  saveReactions,
} from '../../src/client/reactions.js';

describe('Candidate Reactions & Thread-Safety', () => {
  beforeEach(() => {
    // Reset test storage
    saveReactions({});
  });

  it('determines the candidate with most hearts and most likes', () => {
    const reactions = {
      rahul: { heart: 25, like: 10 },
      modi: { heart: 12, like: 30 },
      akhilesh: { heart: 18, like: 15 },
      yogi: { heart: 8, like: 22 },
    };

    const leaders1 = getReactionLeaders(reactions, ['rahul', 'modi']);
    expect(leaders1.mostHearts).toEqual({ id: 'rahul', count: 25 });
    expect(leaders1.mostLikes).toEqual({ id: 'modi', count: 30 });

    const leaders2 = getReactionLeaders(reactions, ['akhilesh', 'yogi']);
    expect(leaders2.mostHearts).toEqual({ id: 'akhilesh', count: 18 });
    expect(leaders2.mostLikes).toEqual({ id: 'yogi', count: 22 });
  });

  it('handles empty or zero counts gracefully without declaring false leaders', () => {
    const reactions = {
      rahul: { heart: 0, like: 0 },
      modi: { heart: 0, like: 0 },
    };

    const leaders = getReactionLeaders(reactions, ['rahul', 'modi']);
    expect(leaders.mostHearts).toBeNull();
    expect(leaders.mostLikes).toBeNull();
  });

  it('atomically increments reaction counts', async () => {
    await incrementReaction('rahul', 'heart');
    await incrementReaction('rahul', 'heart');
    await incrementReaction('rahul', 'like');
    await incrementReaction('modi', 'like');

    const state = loadReactions();
    expect(state.rahul.heart).toBe(2);
    expect(state.rahul.like).toBe(1);
    expect(state.modi.like).toBe(1);
  });

  it('serializes rapid concurrent increments thread-safely', async () => {
    // Simulate 10 rapid concurrent clicks
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(incrementReaction('akhilesh', 'heart'));
    }
    await Promise.all(promises);

    const state = loadReactions();
    expect(state.akhilesh.heart).toBe(10);
  });
});
