import { nextRollText, rollResultText } from '../../shared/presenters.js';
import { initAudio, playDiceSound, toggleMute } from '../audio.js';
import { pulse, select, setText } from '../dom.js';

/** @returns {import('../types.js').StateView} */
export function createDiceView(root, { nameOf }) {
  const result = select(root, '[data-dice-result]');
  const next = select(root, '[data-dice-next]');
  const stage = select(root, '[data-dice-stage]');
  const valBadge = select(root, '[data-dice-val-badge]');
  const soundBtn = select(root, '[data-sound-toggle]');
  const soundIcon = select(root, '[data-sound-icon]');
  const soundLabel = select(root, '[data-sound-label]');

  initAudio();

  let isRolling = false;

  function rollTo(value) {
    if (isRolling) return;
    isRolling = true;

    // Trigger realistic dice clatter sound
    playDiceSound();

    if (valBadge) {
      valBadge.textContent = String(value);
      pulse(valBadge);
    }

    if (stage) {
      stage.classList.remove('is-rolling');
      void stage.offsetWidth;
      stage.classList.add('is-rolling');
    }

    setTimeout(() => {
      stage?.classList.remove('is-rolling');
      isRolling = false;
    }, 850);
  }

  // Sound button handler
  soundBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const muted = toggleMute();
    if (soundIcon) soundIcon.textContent = muted ? '🔇' : '🔊';
    if (soundLabel) soundLabel.textContent = muted ? 'Muted' : 'Sound On';
  });

  return {
    render(state, meta) {
      setText(result, rollResultText(state, nameOf));
      setText(next, nextRollText(state, nameOf));

      if (meta?.type === 'roll' && meta.roll?.value) {
        rollTo(meta.roll.value);
        pulse(result);
      } else if (meta?.type === 'win' && meta.roll?.value) {
        rollTo(meta.roll.value);
        pulse(result);
      } else if (meta?.type === 'reset') {
        if (valBadge) valBadge.textContent = '4';
      }
    },
  };
}
