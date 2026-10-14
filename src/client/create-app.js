import { createCountdown } from '../core/countdown.js';
import { createDice } from '../core/dice.js';
import { createMatch } from '../core/match.js';
import { createSecureRng } from '../core/rng.js';
import { createSession } from '../core/session.js';
import { createTicker } from '../core/ticker.js';
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
 * Composition root: the only place that knows which concrete pieces exist and
 * wires them together. Everything else depends on small abstractions.
 * @param {HTMLElement} root An element carrying `data-config` JSON.
 */
export function createApp(root) {
  const config = JSON.parse(root.dataset.config ?? '{}');
  const candidateIds = config.candidates.map((c) => c.id);
  const byId = new Map(config.candidates.map((c) => [c.id, c]));
  const ctx = {
    candidateIds,
    matchupSlug: config.slug || candidateIds.join('-vs-'),
    nameOf: (id) => byId.get(id)?.name ?? id,
    sideOf: (id) => byId.get(id)?.side ?? 'left',
  };

  const match = createMatch({
    candidateIds,
    target: config.target ?? Infinity,
    historyLimit: config.historyLimit,
    turnPolicy: roundRobin(candidateIds),
    initial: config.initial,
  });
  const session = createSession({
    match,
    dice: createDice({ sides: config.sides, rng: createSecureRng() }),
  });

  const countdownView = createCountdownView(root, config.rollIntervalSeconds);
  const countdown = createCountdown({
    seconds: config.rollIntervalSeconds,
    onTick: countdownView.render,
    onElapsed: session.step,
  });

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

  const ticker = createTicker({ intervalMs: 1000, onTick: countdown.tick });

  return {
    session,
    start: () => pauseWhenHidden(ticker),
    stop: () => {
      ticker.stop();
      dailyWinnerView.stop();
      reactionsView.stop();
    },
  };
}
