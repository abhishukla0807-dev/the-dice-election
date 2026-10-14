import { createCountdown } from '../core/countdown.js';
import { createMatch } from '../core/match.js';
import { createSession } from '../core/session.js';
import { createTicker } from '../core/ticker.js';
import { computeSynchronizedMatchState, getDeterministicRoll } from '../core/time-sync.js';
import { roundRobin } from '../core/turn-policies.js';
import { createDailyWinnerView } from './daily-winner.js';
import { createReactionsView } from './reactions.js';
import { createCandidateCardView } from './views/candidate-card-view.js';
import { createCountdownView } from './views/countdown-view.js';
import { createDiceView } from './views/dice-view.js';
import { createRollLogView } from './views/roll-log-view.js';
import { createScoreboardView } from './views/scoreboard-view.js';
import { pauseWhenHidden } from './visibility.js';

/**
 * Composition root: wires the synchronized game engine, state views, and timers.
 * Every user across the globe computes and tracks identical deterministic turns in IST.
 * @param {HTMLElement} root An element carrying `data-config` JSON.
 */
export function createApp(root) {
  const config = JSON.parse(root.dataset.config ?? '{}');
  const candidateIds = config.candidates.map((c) => c.id);
  const byId = new Map(config.candidates.map((c) => [c.id, c]));
  const matchupSlug = config.slug || candidateIds.join('-vs-');
  const rollIntervalSeconds = config.rollIntervalSeconds ?? 7;
  const sides = config.sides ?? 6;
  const historyLimit = config.historyLimit ?? 4;

  const ctx = {
    candidateIds,
    matchupSlug,
    nameOf: (id) => byId.get(id)?.name ?? id,
    sideOf: (id) => byId.get(id)?.side ?? 'left',
  };

  // Compute live synchronized state based on current Indian Standard Time (IST)
  const synced = computeSynchronizedMatchState({
    candidateIds,
    slug: matchupSlug,
    rollIntervalSeconds,
    sides,
    historyLimit,
    now: new Date(),
  });

  let currentSeed = synced.seed;
  let currentDateStr = synced.timeInfo.dateStr;

  const match = createMatch({
    candidateIds,
    target: config.target ?? Infinity,
    historyLimit,
    turnPolicy: roundRobin(candidateIds),
    initial: {
      scores: synced.scores,
      rollCount: synced.rollCount,
      history: synced.history,
    },
  });

  const dice = {
    sides,
    roll: () => getDeterministicRoll(currentSeed, match.state.rollCount, sides),
  };

  const session = createSession({
    match,
    dice,
  });

  const countdownView = createCountdownView(root, rollIntervalSeconds);
  const countdown = createCountdown({
    seconds: rollIntervalSeconds,
    initialRemaining: synced.timeInfo.remainingSeconds,
    onTick: (rem) => countdownView.render(rem),
    onElapsed: () => session.step(),
  });

  // Render initial countdown position immediately
  countdownView.render(synced.timeInfo.remainingSeconds);

  const dailyWinnerView = createDailyWinnerView(root, ctx);
  const reactionsView = createReactionsView(root, ctx);

  /** @type {import('./types.js').StateView[]} */
  const views = [
    createScoreboardView(root, ctx),
    ...candidateIds.map((id) => createCandidateCardView(root, id)),
    createDiceView(root, ctx),
    createRollLogView(root, ctx),
    dailyWinnerView,
    reactionsView,
  ];
  session.subscribe((state, meta) => views.forEach((view) => view.render(state, meta)));

  // Populate views immediately with initial synchronized score & state
  views.forEach((view) => view.render(session.state, { type: 'reset' }));

  // Re-synchronization guard: checks for day turnover or tab wake-up
  function reSync() {
    const fresh = computeSynchronizedMatchState({
      candidateIds,
      slug: matchupSlug,
      rollIntervalSeconds,
      sides,
      historyLimit,
      now: new Date(),
    });

    if (fresh.timeInfo.dateStr !== currentDateStr) {
      currentDateStr = fresh.timeInfo.dateStr;
      currentSeed = fresh.seed;
    }

    const drift = Math.abs(fresh.rollCount - match.state.rollCount);
    if (drift >= 2 || fresh.timeInfo.dateStr !== currentDateStr) {
      match.syncState({
        scores: fresh.scores,
        rollCount: fresh.rollCount,
        history: fresh.history,
      });
      countdown.reset(fresh.timeInfo.remainingSeconds);
      views.forEach((view) => view.render(session.state, { type: 'reset' }));
    }
  }

  let tickCount = 0;
  const ticker = createTicker({
    intervalMs: 1000,
    onTick: () => {
      countdown.tick();
      tickCount += 1;
      // Re-verify synchronization every 15 seconds to prevent browser timer drift
      if (tickCount % 15 === 0) {
        reSync();
      }
    },
  });

  let cleanupVisibility = null;

  return {
    session,
    start: () => {
      cleanupVisibility = pauseWhenHidden(ticker, () => reSync());
    },
    stop: () => {
      ticker.stop();
      cleanupVisibility?.();
      dailyWinnerView.stop();
      reactionsView.stop();
    },
  };
}
