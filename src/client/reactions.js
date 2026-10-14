/**
 * Thread-safe Candidate Reactions System (Hearts ❤️ & Likes 👍)
 *
 * Concurrency & Thread-Safety Guarantees:
 * 1. Web Locks API (navigator.locks): W3C standard mutual exclusion across all
 *    concurrent browser tabs and workers during read-modify-write operations.
 * 2. In-memory promise queue fallback: Serializes rapid successive clicks within the same tab.
 * 3. BroadcastChannel: Real-time, instant synchronization across all concurrent tabs.
 * 4. Storage event listener fallback: Keeps state in sync when BroadcastChannel is unsupported.
 * 5. Persistent storage: Maintained in localStorage under 'election_dice_reactions_v1'.
 */

const STORAGE_KEY = 'election_dice_reactions_v1';
const LOCK_NAME = 'election_dice_reactions_mutex';
const CHANNEL_NAME = 'election_dice_reactions_sync';

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
 * Reads raw reactions safely.
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
 * Writes reactions safely.
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
 * Broadcasts updated state to all open tabs.
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
 * Computes who has the most hearts and most likes in a given matchup.
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
 * Thread-safe atomic increment of a reaction for a candidate.
 */
export async function incrementReaction(candidateId, reactionType) {
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

  // 1. Web Locks API for true cross-tab mutual exclusion
  if (typeof navigator !== 'undefined' && navigator.locks && navigator.locks.request) {
    try {
      return await navigator.locks.request(LOCK_NAME, async () => {
        return performUpdate();
      });
    } catch {
      // Fallback if locks request errors
      return performUpdate();
    }
  }

  // 2. In-memory sequential queue fallback
  const next = memoryQueue.then(performUpdate).catch(performUpdate);
  memoryQueue = next;
  return await next;
}

/**
 * Mounts the reactions view into the DOM with real-time syncing.
 */
export function createReactionsView(root, { candidateIds = [], nameOf = (id) => id } = {}) {
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

    // 2. Calculate who leads in hearts and likes
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

      // Thread-safe update
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

  // Initial paint
  updateUI();

  return {
    render() {
      // Hook into render loop if needed
    },
    stop() {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', onStorage);
      }
    },
  };
}
