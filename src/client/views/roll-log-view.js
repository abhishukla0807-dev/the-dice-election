import { select } from '../dom.js';

/**
 * Rebuilds the list of recent rolls. The same markup is rendered on the server
 * by `RollLog.astro`; keep the two in sync (class names + data attributes).
 * @returns {import('../types.js').StateView}
 */
export function createRollLogView(root, { nameOf, sideOf }) {
  const list = select(root, '[data-roll-log]');

  return {
    render(state) {
      if (!list) return;
      const fragment = document.createDocumentFragment();
      for (const entry of state.history) {
        const row = document.createElement('li');
        row.className = 'roll-log__row';
        row.dataset.side = sideOf(entry.id);
        const name = document.createElement('span');
        name.textContent = nameOf(entry.id);
        const value = document.createElement('span');
        value.className = 'roll-log__value';
        value.textContent = `+${entry.value}`;
        row.append(name, value);
        fragment.append(row);
      }
      list.replaceChildren(fragment);
    },
  };
}
