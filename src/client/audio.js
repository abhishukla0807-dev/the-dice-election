/**
 * Audio manager for dice roll sound effects.
 * Supports HTML5 Audio with Web Audio API synthesis fallback.
 */

let isMuted = false;
let audioCtx = null;
let soundBuffer = null;
let isInitialized = false;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctx();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function initAudio() {
  if (isInitialized || typeof window === 'undefined') return;
  isInitialized = true;

  // Unlock and prepare audio context on first user interaction
  const unlock = () => {
    getAudioContext();

    if (!soundBuffer) {
      fetch('/sounds/dice-roll.wav')
        .then((res) => (res.ok ? res.arrayBuffer() : null))
        .then((arrayBuf) => {
          if (!arrayBuf) return;
          const ctx = getAudioContext();
          if (ctx) {
            ctx.decodeAudioData(
              arrayBuf,
              (decoded) => {
                soundBuffer = decoded;
              },
              () => {},
            );
          }
        })
        .catch(() => {});
    }

    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };

  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });

  // Idle prefetch without blocking critical path
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(
      () => {
        fetch('/sounds/dice-roll.wav').catch(() => {});
      },
      { timeout: 3000 },
    );
  }
}

/**
 * Synthesizes a realistic procedural dice roll sound using Web Audio API
 * in case pre-recorded buffer is not yet decoded or unavailable.
 */
function synthesizeDiceRoll(ctx) {
  const now = ctx.currentTime;
  const impacts = [
    { t: 0.0, amp: 0.7, freq: 1700, decay: 0.035 },
    { t: 0.09, amp: 0.65, freq: 1950, decay: 0.03 },
    { t: 0.19, amp: 0.6, freq: 1450, decay: 0.038 },
    { t: 0.31, amp: 0.55, freq: 1800, decay: 0.032 },
    { t: 0.44, amp: 0.5, freq: 1350, decay: 0.035 },
    { t: 0.57, amp: 0.45, freq: 1600, decay: 0.03 },
    { t: 0.69, amp: 0.4, freq: 1300, decay: 0.038 },
    { t: 0.79, amp: 0.35, freq: 1500, decay: 0.032 },
    { t: 0.88, amp: 0.95, freq: 850, decay: 0.08, thud: true },
  ];

  impacts.forEach(({ t, amp, freq, decay, thud }) => {
    const time = now + t;

    // Resonant wooden/plastic tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(Math.max(60, freq * 0.4), time + decay);

    gain.gain.setValueAtTime(amp * 0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + decay);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + decay);

    // Click noise burst
    const noiseLen = Math.floor(ctx.sampleRate * decay);
    const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const output = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp((-i / noiseLen) * 3);
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq, time);
    filter.Q.setValueAtTime(3.5, time);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(amp * 0.5, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + decay);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseSource.start(time);
    noiseSource.stop(time + decay);

    // Deep table thump for final settlement
    if (thud) {
      const thudOsc = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thudOsc.type = 'sine';
      thudOsc.frequency.setValueAtTime(180, time);
      thudOsc.frequency.exponentialRampToValueAtTime(55, time + 0.09);

      thudGain.gain.setValueAtTime(amp * 0.8, time);
      thudGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.09);

      thudOsc.connect(thudGain);
      thudGain.connect(ctx.destination);
      thudOsc.start(time);
      thudOsc.stop(time + 0.09);
    }
  });
}

/**
 * Play the dice roll sound.
 */
export function playDiceSound() {
  if (isMuted || typeof window === 'undefined') return;

  const ctx = getAudioContext();
  if (ctx && ctx.state === 'running') {
    if (soundBuffer) {
      const source = ctx.createBufferSource();
      source.buffer = soundBuffer;
      const gain = ctx.createGain();
      gain.gain.value = 0.85;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      return;
    }
    // Fallback to procedural synthesis if buffer not ready
    synthesizeDiceRoll(ctx);
    return;
  }

  // Fallback to HTML5 audio element
  try {
    const audio = new Audio('/sounds/dice-roll.wav');
    audio.volume = 0.8;
    audio.play().catch(() => {});
  } catch {
    // Ignore audio autoplay restrictions
  }
}

export function toggleMute() {
  isMuted = !isMuted;
  return isMuted;
}

export function getMuted() {
  return isMuted;
}
