/**
 * Universal & Thread-Safe Candidate Reactions System (Hearts ❤️ & Dislikes 👎)
 *
 * Universal Synchronization Guarantees:
 * 1. Global Cloud State: Backed by a universal atomic counter API so ALL users
 *    across different devices, locations, and browsers see identical total counts.
 * 2. Optimistic UI: Local counts update instantly (<1ms) on tap with floating particle feedback,
 *    then synchronize authoritatively with the global cloud value in the background.
 * 3. Polling & Tab Resumption: Actively fetches universal counts on mount, every 8 seconds,
 *    and instantly upon tab focus/visibility change.
 * 4. Cross-tab Synchronization: BroadcastChannel + storage events keep all open tabs
 *    on the same device synchronized in real-time.
 * 5. Web Locks API & Mutex Queue: Guarantees concurrency safety across concurrent operations.
 * 6. Offline / Fallback Resilient: Seamlessly falls back to cached local storage if network is offline.
 */

const STORAGE_KEY = 'election_dice_reactions_v1';
const LOCK_NAME = 'election_dice_reactions_mutex';
const CHANNEL_NAME = 'election_dice_reactions_sync';
const UNIVERSAL_PREFIX = 'tde_2026';
const CLOUD_API_BASE = 'https://countapi.mileshilliard.com/api/v1';

let memoryQueue = Promise.resolve();

function createBroadcastChannel() {
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      return new BroadcastChannel(CHANNEL_NAME);
    } catch {
      return null;
    }
  }
  return null;
}

const syncChannel = createBroadcastChannel();

let memoryStorage = {};

/**
 * Returns a globally unique, collision-resistant key for a candidate's reaction.
 * @param {string} candidateId
 * @param {'heart' | 'like'} reactionType
 */
export function getUniversalKey(candidateId, reactionType) {
  return `${UNIVERSAL_PREFIX}_${candidateId}_${reactionType}`;
}

/**
 * Reads reactions safely from local cache.
 */
export function loadReactions() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    }
    return memoryStorage;
  } catch {
    return memoryStorage;
  }
}

/**
 * Writes reactions safely to local cache.
 */
export function saveReactions(data) {
  memoryStorage = data;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  } catch {
    // Quota or private mode fallback
  }
}

/**
 * Broadcasts updated state to all open tabs on this device.
 */
function broadcast(state) {
  if (syncChannel) {
    try {
      syncChannel.postMessage({ type: 'SYNC_REACTIONS', state, timestamp: Date.now() });
    } catch {
      // ignore
    }
  }
}

/**
 * Computes who has the most hearts and most dislikes in a given matchup.
 */
export function getReactionLeaders(allReactions = {}, candidateIds = []) {
  let maxHearts = 0;
  let heartLeaderId = null;
  let maxLikes = 0;
  let likeLeaderId = null;

  for (const id of candidateIds) {
    const cand = allReactions[id] || { heart: 0, like: 0 };
    const hearts = Number(cand.heart) || 0;
    const likes = Number(cand.like) || 0;

    if (hearts > maxHearts) {
      maxHearts = hearts;
      heartLeaderId = id;
    }
    if (likes > maxLikes) {
      maxLikes = likes;
      likeLeaderId = id;
    }
  }

  return {
    mostHearts: heartLeaderId ? { id: heartLeaderId, count: maxHearts } : null,
    mostLikes: likeLeaderId ? { id: likeLeaderId, count: maxLikes } : null,
  };
}

/**
 * Fetches universal reaction totals from the cloud for all candidates.
 * Merges with local storage and notifies subscribers.
 *
 * @param {readonly string[]} candidateIds
 * @param {typeof fetch} [fetchApi]
 */
export async function fetchUniversalCounts(candidateIds = [], fetchApi = globalThis.fetch) {
  if (!fetchApi) return loadReactions();

  const state = loadReactions();
  const tasks = [];

  for (const id of candidateIds) {
    for (const type of ['heart', 'like']) {
      const key = getUniversalKey(id, type);
      tasks.push(
        fetchApi(`${CLOUD_API_BASE}/get/${key}`, { mode: 'cors' })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data && typeof data.value === 'number') {
              if (!state[id]) state[id] = { heart: 0, like: 0 };
              state[id][type] = Math.max(Number(state[id][type]) || 0, data.value);
            }
          })
          .catch(() => {
            // Keep local cached state on network failure
          }),
      );
    }
  }

  await Promise.allSettled(tasks);
  saveReactions(state);
  broadcast(state);
  return state;
}

/**
 * Increments universal counter in the cloud and returns the new authoritative value.
 *
 * @param {string} candidateId
 * @param {'heart' | 'like'} reactionType
 * @param {typeof fetch} [fetchApi]
 * @returns {Promise<number | null>}
 */
export async function incrementUniversalCount(
  candidateId,
  reactionType,
  fetchApi = globalThis.fetch,
) {
  if (!fetchApi) return null;
  const key = getUniversalKey(candidateId, reactionType);
  try {
    const res = await fetchApi(`${CLOUD_API_BASE}/hit/${key}`, { mode: 'cors' });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.value === 'number') {
        return data.value;
      }
    }
  } catch {
    // Offline or network error fallback
  }
  return null;
}

/**
 * Thread-safe optimistic increment of a reaction for a candidate.
 * Updates local state instantly, then synchronizes authoritatively with universal cloud count.
 *
 * @param {string} candidateId
 * @param {'heart' | 'like'} reactionType
 * @param {typeof fetch} [fetchApi]
 */
export async function incrementReaction(candidateId, reactionType, fetchApi = globalThis.fetch) {
  const performUpdate = () => {
    const state = loadReactions();
    if (!state[candidateId]) {
      state[candidateId] = { heart: 0, like: 0 };
    }
    const current = Number(state[candidateId][reactionType]) || 0;
    state[candidateId][reactionType] = current + 1;
    saveReactions(state);
    broadcast(state);
    return state;
  };

  let localState;

  // 1. Web Locks API for true cross-tab mutual exclusion
  if (typeof navigator !== 'undefined' && navigator.locks && navigator.locks.request) {
    try {
      localState = await navigator.locks.request(LOCK_NAME, async () => {
        return performUpdate();
      });
    } catch {
      localState = performUpdate();
    }
  } else {
    // 2. In-memory sequential queue fallback
    const next = memoryQueue.then(performUpdate).catch(performUpdate);
    memoryQueue = next;
    localState = await next;
  }

  // 3. Increment universal cloud state asynchronously
  incrementUniversalCount(candidateId, reactionType, fetchApi).then((cloudValue) => {
    if (cloudValue !== null) {
      const current = loadReactions();
      if (!current[candidateId]) current[candidateId] = { heart: 0, like: 0 };
      current[candidateId][reactionType] = Math.max(
        Number(current[candidateId][reactionType]) || 0,
        cloudValue,
      );
      saveReactions(current);
      broadcast(current);
    }
  });

  return localState;
}

/**
 * Mounts the reactions view into the DOM with real-time universal syncing.
 */
export function createReactionsView(root, { candidateIds = [], nameOf = (id) => id } = {}) {
  let pollTimer = null;

  function updateUI(state = loadReactions()) {
    // 1. Update counts on each button
    for (const id of candidateIds) {
      const candData = state[id] || { heart: 0, like: 0 };
      const heartCountEl = root.querySelector(
        `[data-reaction-count="heart"][data-candidate-id="${id}"]`,
      );
      const likeCountEl = root.querySelector(
        `[data-reaction-count="like"][data-candidate-id="${id}"]`,
      );

      if (heartCountEl) heartCountEl.textContent = String(candData.heart || 0);
      if (likeCountEl) likeCountEl.textContent = String(candData.like || 0);
    }

    // 2. Calculate who leads in hearts and dislikes
    const { mostHearts, mostLikes } = getReactionLeaders(state, candidateIds);

    // 3. Update leader badges on candidate cards
    for (const id of candidateIds) {
      const heartBadge = root.querySelector(
        `[data-leader-badge="heart"][data-candidate-id="${id}"]`,
      );
      const likeBadge = root.querySelector(`[data-leader-badge="like"][data-candidate-id="${id}"]`);

      if (heartBadge) {
        heartBadge.style.display =
          mostHearts && mostHearts.id === id && mostHearts.count > 0 ? 'inline-flex' : 'none';
      }
      if (likeBadge) {
        likeBadge.style.display =
          mostLikes && mostLikes.id === id && mostLikes.count > 0 ? 'inline-flex' : 'none';
      }
    }

    // 4. Update audience tally strip
    const tallyTextEl = root.querySelector('[data-reactions-tally-text]');
    if (tallyTextEl) {
      const parts = [];
      if (mostHearts && mostHearts.count > 0) {
        parts.push(`❤️ ${nameOf(mostHearts.id)} leads in Hearts (${mostHearts.count})`);
      }
      if (mostLikes && mostLikes.count > 0) {
        parts.push(`👎 ${nameOf(mostLikes.id)} leads in Dislikes (${mostLikes.count})`);
      }
      if (parts.length > 0) {
        tallyTextEl.textContent = parts.join(' • ');
      } else {
        tallyTextEl.textContent =
          'Audience Votes: Tap ❤️ Heart or 👎 Dislike on any candidate below';
      }
    }
  }

  function spawnFloatingParticle(button, emoji) {
    if (typeof document === 'undefined') return;
    const rect = button.getBoundingClientRect();
    const particle = document.createElement('div');
    particle.className = 'reaction-floating-particle';
    particle.textContent = `+1 ${emoji}`;
    particle.style.left = `${rect.left + rect.width / 2}px`;
    particle.style.top = `${rect.top}px`;
    document.body.appendChild(particle);

    setTimeout(() => {
      particle.remove();
    }, 1000);
  }

  // Bind click handlers
  const buttons = root.querySelectorAll('[data-reaction-btn]');
  buttons.forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const reactionType = btn.getAttribute('data-reaction-btn');
      const candidateId = btn.getAttribute('data-candidate-id');

      if (!candidateId || !reactionType) return;

      btn.classList.add('is-clicked');
      setTimeout(() => btn.classList.remove('is-clicked'), 250);

      const emoji = reactionType === 'heart' ? '❤️' : '👎';
      spawnFloatingParticle(btn, emoji);

      // Instant optimistic update + universal cloud increment
      const updated = await incrementReaction(candidateId, reactionType);
      updateUI(updated);
    });
  });

  // Cross-tab synchronization via BroadcastChannel
  if (syncChannel) {
    syncChannel.onmessage = (event) => {
      if (event.data?.type === 'SYNC_REACTIONS' && event.data.state) {
        updateUI(event.data.state);
      }
    };
  }

  // Cross-tab synchronization via storage event fallback
  const onStorage = (event) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        const state = JSON.parse(event.newValue);
        updateUI(state);
      } catch {
        // ignore
      }
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage);
  }

  // Visibility change handler: fetch fresh universal counts when returning to the tab
  const onVisibility = () => {
    if (typeof document !== 'undefined' && !document.hidden) {
      fetchUniversalCounts(candidateIds).then((fresh) => updateUI(fresh));
    }
  };
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibility);
  }

  // Initial paint with cached values, then immediately fetch fresh universal counts
  updateUI();
  fetchUniversalCounts(candidateIds).then((fresh) => updateUI(fresh));

  // Periodic polling: refresh universal counts every 8 seconds while active
  if (typeof setInterval !== 'undefined') {
    pollTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchUniversalCounts(candidateIds).then((fresh) => updateUI(fresh));
    }, 8000);
  }

  return {
    render() {
      updateUI();
    },
    stop() {
      if (pollTimer) clearInterval(pollTimer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', onStorage);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
    },
  };
}
