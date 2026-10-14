/** Site-wide, presentation-level constants. */
export const site = Object.freeze({
  name: 'The Dice Election',
  locale: 'en',
  themeColor: '#0f1115',
  description:
    'A playful dice-roll election game: two candidates, one dice, first to the target score wins.',
  disclaimer:
    'A game concept for fun. Scores come from random dice rolls and do not predict or reflect any real election.',
});

/** Default rules. Any matchup may override them through its own `rules`. */
export const gameDefaults = Object.freeze({
  target: Infinity,
  sides: 6,
  rollIntervalSeconds: 7,
  historyLimit: 4,
});
