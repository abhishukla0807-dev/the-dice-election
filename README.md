# Election Dice

A playful dice-roll election game built with **Astro** (static output) and **vanilla JavaScript**.
Two candidates, one dice. The dice rolls on a timer, scores go up one candidate at a time, and the
first to the target score wins. After a win the game starts over, so it runs indefinitely.

> A game concept for fun. Scores come from random dice rolls and do not predict or reflect any real election.

## Quick start

```bash
nvm use            # Node 20+
npm install
npm run dev        # http://localhost:4321
```

| Script                  | What it does                                  |
| ----------------------- | --------------------------------------------- |
| `npm run dev`           | Dev server                                    |
| `npm run build`         | Static build to `dist/`                       |
| `npm run preview`       | Serve the production build                    |
| `npm test`              | Unit tests (Vitest)                           |
| `npm run lint`          | ESLint (JS + Astro)                           |
| `npm run format`        | Prettier                                      |
| `npx @lhci/cli autorun` | Lighthouse CI against `dist/` (after a build) |

## Repo structure

```
.
├─ .github/workflows/ci.yml     Format, lint, test, build, Lighthouse budget
├─ lighthouserc.json            Budget: performance, a11y, best practices, SEO >= 0.95
├─ public/                      favicon, robots.txt
├─ src/
│  ├─ assets/images/            candidates/, symbols/, ui/  (optimised by astro:assets)
│  ├─ config/site.js            Site text + default rules (target, dice sides, interval)
│  ├─ data/matchups.js          CONTENT: candidates, parties, symbols, themes, sample state
│  ├─ core/                     DOMAIN: pure JS, no DOM, fully unit-tested
│  │  ├─ rng.js                 Random source (crypto-backed)
│  │  ├─ dice.js                createDice({ sides, rng })
│  │  ├─ turn-policies.js       Who rolls next (roundRobin)
│  │  ├─ match.js               Score / winner state machine
│  │  ├─ session.js             One step of play: roll -> apply -> notify
│  │  ├─ countdown.js           Seconds countdown
│  │  ├─ ticker.js              Interval with injectable timers
│  │  └─ events.js              Tiny pub/sub
│  ├─ shared/presenters.js      Pure state -> text helpers, used by server AND browser
│  ├─ client/                   BROWSER adapters (the only code that touches the DOM)
│  │  ├─ views/                 scoreboard, candidate card, dice, countdown, roll log
│  │  ├─ create-app.js          Composition root: wires core + views
│  │  ├─ main.js                Entry: boots every [data-election-app]
│  │  ├─ dom.js, visibility.js, types.js
│  ├─ components/               Astro UI: layout/, scoreboard/, candidate/, dice/, log/, ui/
│  ├─ layouts/BaseLayout.astro  <head>, font preload, header/footer slots
│  ├─ pages/                    index.astro, [slug].astro, 404.astro (thin)
│  ├─ styles/                   tokens.css (design tokens), base.css (reset + utilities)
│  └─ utils/routes.js
└─ tests/                       core/ and shared/ unit tests
```

## How it works

1. **Build time.** `Matchup.astro` creates a `Match` from the matchup's sample state and renders
   complete HTML (scores, photos, progress, log). The page is fully readable with JavaScript off.
2. **Run time.** A ~2.6 kB (gzipped) module reads `data-config` from the page, builds the same
   `Match`, and starts a 1-second ticker. A `Countdown` fires `session.step()` every N seconds;
   the session rolls the dice, updates the match and notifies the views, which patch the DOM.
3. **After a win** the next step resets the match, so the loop never ends.
4. The ticker pauses while the tab is hidden.

## SOLID, concretely

| Principle                 | Where                                                                                                                                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S**ingle responsibility | `Match` only holds score rules. `Dice` only rolls. `Ticker` only repeats. `Countdown` only counts. Each view updates exactly one region of the page. Content (`data/`) is separate from markup (`components/`). |
| **O**pen/closed           | New turn rules = a new function in `turn-policies.js`. New UI region = a new `StateView` added to the list in `create-app.js`. New matchup = a new entry in `data/matchups.js`. No existing module changes.     |
| **L**iskov substitution   | Any `Rng` works for `createDice`; any `TurnPolicy` works for `createMatch`; any object with `render(state, meta)` works as a view. Tests use fakes in their place.                                              |
| **I**nterface segregation | Views implement one method, `render`. `createTicker` needs only `setInterval`/`clearInterval`. The session only needs `{ roll() }` from a dice.                                                                 |
| **D**ependency inversion  | `core/` imports nothing from the browser or Astro. Dependencies (rng, timers, dice, match) are injected, and `client/create-app.js` is the single composition root.                                             |

## Performance notes (target: PageSpeed 95+)

Measured from the production build:

- Static HTML, about 26 kB (about 6 kB gzipped), **no render-blocking requests**: CSS is inlined
  (`build.inlineStylesheets: 'always'`).
- **One** small module script (about 2.6 kB gzipped), loaded as a deferred module. No framework runtime.
- Every image is converted to WebP with fixed `width`/`height` and 1x/2x `srcset` by `astro:assets`
  (a 130 kB photo becomes 1 to 4 kB). That prevents layout shift and keeps bytes tiny.
- Self-hosted variable font (Manrope), `font-display: swap`, with the Latin file preloaded.
- Animations use only `transform`; progress bars use `scaleX`, so nothing triggers layout.
- The decorative backdrop is about 7 kB, lazy and `fetchpriority="low"`. Set it aside by removing the
  `<Backdrop>` lines in `src/pages/` if you want the leanest possible LCP.

I could not run PageSpeed Insights from this environment, so the 95+ target is not measured here.
`lighthouserc.json` plus the CI workflow turn it into a failing check on every push, so a regression
cannot slip in. Run it locally with `npm run build && npx @lhci/cli autorun`.

## Extending

**Add a matchup:** copy an entry in `src/data/matchups.js`, add the photos and symbols under
`src/assets/images/`. A page and a nav link are generated automatically.

**Change the rules:** edit `gameDefaults` in `src/config/site.js`, or set `rules` on one matchup,
for example `rules: { target: 30, rollIntervalSeconds: 4 }`.

**New turn logic** (for example "winner of the last roll goes again"):

```js
// src/core/turn-policies.js
export const alwaysFirst = (ids) => () => ids[0];
```

Pass it as `turnPolicy` in `Matchup.astro` and `client/create-app.js`.

**New view:** create `src/client/views/my-view.js` exporting `{ render(state, meta) }` and add it to
the `views` array in `create-app.js`.

## Notes

- Photos and party symbols are the images supplied for this project. Check you have the right to
  publish them before deploying.
- `RollLog.astro` and `roll-log-view.js` render the same markup (server and browser). If you change
  one, change the other.
- `site` in `astro.config.mjs` is a placeholder. Set it to your real URL for correct canonical links.
