import { leadChipText, rollLabel } from '../../shared/presenters.js';
import { pulse, select, setText } from '../dom.js';

/** @returns {import('../types.js').StateView} */
export function createScoreboardView(root, { candidateIds, nameOf }) {
  const scoreEls = new Map(candidateIds.map((id) => [id, select(root, `[data-sb-score="${id}"]`)]));
  const sideEls = new Map(candidateIds.map((id) => [id, select(root, `[data-sb-side="${id}"]`)]));
  const chip = select(root, '[data-sb-chip]');
  const roll = select(root, '[data-sb-roll]');

  return {
    render(state, meta) {
      for (const id of candidateIds) {
        const el = scoreEls.get(id) ?? null;
        setText(el, String(state.scores[id]));
        if (meta.roll?.id === id) pulse(el);

        const side = sideEls.get(id);
        if (side) {
          side.setAttribute('data-next', String(state.nextId === id && !state.winnerId));
        }
      }
      setText(roll, rollLabel(state));
      setText(chip, leadChipText(state, nameOf));
    },
  };
}
