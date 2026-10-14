import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchUniversalCounts,
  getReactionLeaders,
  getUniversalKey,
  incrementReaction,
  incrementUniversalCount,
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

  it('atomically increments reaction counts locally and optimistically', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ value: 1 }),
    });

    await incrementReaction('rahul', 'heart', fakeFetch);
    await incrementReaction('rahul', 'heart', fakeFetch);
    await incrementReaction('rahul', 'like', fakeFetch);
    await incrementReaction('modi', 'like', fakeFetch);

    const state = loadReactions();
    expect(state.rahul.heart).toBe(2);
    expect(state.rahul.like).toBe(1);
    expect(state.modi.like).toBe(1);
  });

  it('serializes rapid concurrent increments thread-safely', async () => {
    let serverCount = 0;
    const fakeFetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ value: ++serverCount }),
      }),
    );

    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(incrementReaction('akhilesh', 'heart', fakeFetch));
    }
    await Promise.all(promises);

    const state = loadReactions();
    expect(state.akhilesh.heart).toBe(10);
  });

  it('generates consistent universal cloud keys', () => {
    expect(getUniversalKey('modi', 'heart')).toBe('tde_2026_modi_heart');
    expect(getUniversalKey('rahul', 'like')).toBe('tde_2026_rahul_like');
  });

  it('fetches and merges universal counts across all users', async () => {
    const mockFetch = vi.fn().mockImplementation((url) => {
      if (url.includes('tde_2026_modi_heart')) {
        return Promise.resolve({ ok: true, json: async () => ({ value: 150 }) });
      }
      if (url.includes('tde_2026_rahul_like')) {
        return Promise.resolve({ ok: true, json: async () => ({ value: 85 }) });
      }
      return Promise.resolve({ ok: false });
    });

    const state = await fetchUniversalCounts(['modi', 'rahul'], mockFetch);
    expect(state.modi.heart).toBe(150);
    expect(state.rahul.like).toBe(85);
  });

  it('increments universal count on cloud API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ key: 'tde_2026_yogi_heart', value: 42 }),
    });

    const count = await incrementUniversalCount('yogi', 'heart', mockFetch);
    expect(count).toBe(42);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://countapi.mileshilliard.com/api/v1/hit/tde_2026_yogi_heart',
      { mode: 'cors' },
    );
  });
});
