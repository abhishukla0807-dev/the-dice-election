import { cardLeadText, cardStatus } from '../../shared/presenters.js';
import { pulse, select, setAttr, setText } from '../dom.js';

/** @returns {import('../types.js').StateView} */
export function createCandidateCardView(root, id) {
  const card = select(root, `[data-card="${id}"]`);
  const status = select(card, '[data-card-status]');
  const score = select(card, '[data-card-score]');
  const lead = select(card, '[data-card-lead]');
  const turnBanner = select(card, '[data-card-turn-banner]');

  return {
    render(state, meta) {
      const isNext = state.nextId === id && !state.winnerId;
      const { label, tone } = cardStatus(state, id);
      setText(status, label);
      setAttr(status, 'data-tone', tone);
      setText(score, String(state.scores[id]));
      if (meta?.roll?.id === id) {
        pulse(score);
      }
      setText(lead, cardLeadText(state, id));
      setAttr(card, 'data-next', String(isNext));
      setAttr(card, 'data-winner', String(state.winnerId === id));
      if (turnBanner) {
        setAttr(turnBanner, 'aria-hidden', String(!isNext));
      }
    },
  };
}
