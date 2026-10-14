/**
 * Daily Winner Manager (Indian Standard Time: UTC+5:30)
 *
 * Tracks countdown to end of the day (23:59:59.999 IST),
 * declares the winner for the specific matchup at midnight IST,
 * and maintains the winner in persistent storage.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Returns current Date in Indian Standard Time (UTC+5:30)
 */
export function getISTDate(now = new Date()) {
  return new Date(now.getTime() + IST_OFFSET_MS);
}

/**
 * Returns YYYY-MM-DD string in IST
 */
export function getISTDateString(date = getISTDate()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns milliseconds remaining until 23:59:59.999 IST of the current day
 */
export function getMsUntilMidnightIST(now = new Date()) {
  const ist = getISTDate(now);
  const midnight = new Date(ist);
  midnight.setUTCHours(23, 59, 59, 999);
  return Math.max(0, midnight.getTime() - ist.getTime());
}

/**
 * Formats milliseconds into HHh MMm SSs
 */
export function formatCountdownIST(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${h}h ${m}m ${s}s`;
}

/**
 * Evaluates the winner strictly among the candidates of the current matchup.
 */
export function pickMatchupWinner(scores = {}, candidateIds = [], nameOf = (id) => id) {
  let bestId = null;
  let highestScore = -1;

  for (const id of candidateIds) {
    const score = scores[id] ?? 0;
    if (score > highestScore) {
      highestScore = score;
      bestId = id;
    }
  }

  if (!bestId) return null;
  return {
    id: bestId,
    name: nameOf(bestId),
    score: highestScore,
  };
}

/**
 * Creates and mounts the daily winner manager into the DOM.
 */
export function createDailyWinnerView(
  root,
  { nameOf = (id) => id, candidateIds = [], matchupSlug = 'default' } = {},
) {
  const countdownEl = root.querySelector('[data-ist-timer]');
  const bannerEl = root.querySelector('[data-daily-winner-banner]');
  const winnerNameEl = root.querySelector('[data-winner-name]');
  const winnerScoreEl = root.querySelector('[data-winner-score]');
  const testBtn = root.querySelector('[data-test-midnight-btn]');
  const dismissBtn = root.querySelector('[data-winner-dismiss]');

  const istDateKey = getISTDateString();
  const storageKey = `election_dice_winner_${matchupSlug}_${istDateKey}`;
  const dismissKey = `election_dice_dismissed_${matchupSlug}_${istDateKey}`;

  // Clear legacy global key from earlier test runs if present
  try {
    localStorage.removeItem(`election_dice_winner_${istDateKey}`);
  } catch {
    // no-op
  }

  let latestState = null;
  let intervalId = null;
  let isDeclared = false;

  function loadSavedWinner() {
    try {
      const data = localStorage.getItem(storageKey);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  function saveWinner(winner) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(winner));
    } catch {
      // Storage quota or private mode fallback
    }
  }

  function isDismissed() {
    try {
      return sessionStorage.getItem(dismissKey) === 'true';
    } catch {
      return false;
    }
  }

  function markDismissed() {
    try {
      sessionStorage.setItem(dismissKey, 'true');
    } catch {
      // no-op
    }
  }

  function clearDismissed() {
    try {
      sessionStorage.removeItem(dismissKey);
    } catch {
      // no-op
    }
  }

  function announceWinner(winner, { celebrate = true, forceShow = false } = {}) {
    isDeclared = true;

    // Only candidates in this matchup are valid
    if (!candidateIds.includes(winner.id)) {
      return;
    }

    if (bannerEl) {
      if (forceShow || !isDismissed()) {
        bannerEl.style.display = 'flex';
      } else {
        bannerEl.style.display = 'none';
      }
    }
    if (winnerNameEl) winnerNameEl.textContent = winner.name;
    if (winnerScoreEl) winnerScoreEl.textContent = `${winner.score} pts`;

    // Clear previous daily-winner markings for this matchup's candidates
    candidateIds.forEach((cId) => {
      const cCard = root.querySelector(`[data-card="${cId}"]`);
      if (cCard) cCard.removeAttribute('data-daily-winner');
    });

    // Highlight winning candidate card
    const winningCard = root.querySelector(`[data-card="${winner.id}"]`);
    if (winningCard) {
      winningCard.setAttribute('data-daily-winner', 'true');
    }

    if (celebrate && (forceShow || !isDismissed())) {
      triggerConfetti(root);
    }
  }

  function evaluateWinner(state, { forceShow = false } = {}) {
    if (!state) return;

    const winnerResult = pickMatchupWinner(state.scores, candidateIds, nameOf);
    if (winnerResult) {
      const winner = {
        ...winnerResult,
        matchup: matchupSlug,
        date: istDateKey,
        announcedAt: new Date().toISOString(),
      };
      saveWinner(winner);
      announceWinner(winner, { celebrate: true, forceShow });
    }
  }

  // Dismiss button handler
  dismissBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (bannerEl) {
      bannerEl.style.display = 'none';
    }
    markDismissed();
  });

  // On page load: only if midnight has already occurred today do we announce maintained winner
  const msRemaining = getMsUntilMidnightIST();
  const saved = loadSavedWinner();

  if (msRemaining <= 1000 && saved && candidateIds.includes(saved.id)) {
    // If the cutoff already occurred today, sync state without forcing banner open
    announceWinner(saved, { celebrate: false, forceShow: false });
  }

  // Live timer tick
  function tick() {
    const msLeft = getMsUntilMidnightIST();

    if (countdownEl) {
      countdownEl.textContent = formatCountdownIST(msLeft);
    }

    // When midnight IST arrives, trigger automatic evaluation and announcement
    if (msLeft <= 1000 && !isDeclared && latestState) {
      clearDismissed();
      evaluateWinner(latestState, { forceShow: true });
    }
  }

  tick();
  intervalId = setInterval(tick, 1000);

  // Test / Simulation button to test announcing midnight IST winner immediately
  testBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (latestState) {
      clearDismissed();
      evaluateWinner(latestState, { forceShow: true });
    }
  });

  return {
    render(state) {
      latestState = state;
      // If winner was declared, ensure updated score matches state
      if (isDeclared) {
        const currentSaved = loadSavedWinner();
        if (currentSaved && candidateIds.includes(currentSaved.id) && winnerScoreEl) {
          const liveScore = state.scores[currentSaved.id] ?? currentSaved.score;
          winnerScoreEl.textContent = `${liveScore} pts`;
        }
      }
    },
    stop() {
      if (intervalId) clearInterval(intervalId);
    },
  };
}

/**
 * Lightweight celebratory particle confetti burst
 */
function triggerConfetti(root) {
  const container = root.querySelector('[data-confetti-container]');
  if (!container) return;

  container.innerHTML = '';
  const colors = ['#f59e0b', '#22c55e', '#3b82f6', '#ec4899', '#ef4444', '#8b5cf6'];

  for (let i = 0; i < 35; i++) {
    const particle = document.createElement('div');
    particle.className = 'confetti-particle';
    particle.style.setProperty('--color', colors[i % colors.length]);
    particle.style.setProperty('--x', `${(Math.random() - 0.5) * 360}px`);
    particle.style.setProperty('--y', `${(Math.random() - 0.5) * 180 - 40}px`);
    particle.style.setProperty('--rot', `${Math.random() * 720}deg`);
    particle.style.setProperty('--delay', `${Math.random() * 0.25}s`);
    container.appendChild(particle);
  }

  setTimeout(() => {
    container.innerHTML = '';
  }, 3000);
}
