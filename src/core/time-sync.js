/**
 * Global Time-Synchronized Match Engine (IST - Indian Standard Time: UTC+5:30)
 *
 * Ensures that EVERY visitor across the globe sees the exact same dice rolls,
 * exact same live scores, exact same countdown timer, and exact same daily winners
 * at any given second, with zero central database requirements.
 */

export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * 32-bit FNV-1a hash function for strings.
 * @param {string} str
 * @returns {number} 32-bit unsigned integer
 */
export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

/**
 * High-quality MurmurHash3-inspired 32-bit integer mixer PRNG.
 * Generates an integer in [1, sides] deterministically in O(1) time.
 *
 * @param {number} seed 32-bit seed
 * @param {number} turnIndex 0-based turn sequence
 * @param {number} [sides=6] Number of dice sides
 * @returns {number} Value in [1, sides]
 */
export function getDeterministicRoll(seed, turnIndex, sides = 6) {
  let k = (turnIndex + 1) ^ seed;
  k = Math.imul(k ^ (k >>> 16), 0x85ebca6b);
  k = Math.imul(k ^ (k >>> 13), 0xc2b2ae35);
  k = (k ^ (k >>> 16)) >>> 0;
  return (k % sides) + 1;
}

/**
 * Computes time breakdown in Indian Standard Time (UTC+5:30).
 *
 * @param {Date | number} [now=new Date()]
 * @param {number} [rollIntervalSeconds=7]
 */
export function getISTTimeInfo(now = new Date(), rollIntervalSeconds = 7) {
  const nowMs = typeof now === 'number' ? now : now.getTime();
  const istMs = nowMs + IST_OFFSET_MS;
  const istDate = new Date(istMs);

  const y = istDate.getUTCFullYear();
  const m = String(istDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(istDate.getUTCDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;

  const midnightIst = new Date(istMs);
  midnightIst.setUTCHours(0, 0, 0, 0);
  const midnightUtcMs = midnightIst.getTime() - IST_OFFSET_MS;

  const elapsedMs = Math.max(0, nowMs - midnightUtcMs);
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const turnIndex = Math.floor(elapsedSeconds / rollIntervalSeconds);
  const secondsIntoTurn = elapsedSeconds % rollIntervalSeconds;
  const remainingSeconds = rollIntervalSeconds - secondsIntoTurn;

  return {
    dateStr,
    elapsedMs,
    elapsedSeconds,
    turnIndex,
    secondsIntoTurn,
    remainingSeconds,
    midnightUtcMs,
  };
}

/**
 * Computes the synchronized match state at any exact instant in time.
 * Runs in < 1ms even after thousands of turns.
 *
 * @param {{
 *   candidateIds: readonly string[],
 *   slug?: string,
 *   rollIntervalSeconds?: number,
 *   sides?: number,
 *   historyLimit?: number,
 *   now?: Date | number,
 * }} options
 */
export function computeSynchronizedMatchState({
  candidateIds,
  slug = 'match',
  rollIntervalSeconds = 7,
  sides = 6,
  historyLimit = 4,
  now = new Date(),
}) {
  const timeInfo = getISTTimeInfo(now, rollIntervalSeconds);
  const seed = hashString(`${timeInfo.dateStr}:${slug}`);

  /** @type {Record<string, number>} */
  const scores = Object.fromEntries(candidateIds.map((id) => [id, 0]));
  /** @type {Array<{ id: string, value: number, roll: number }>} */
  const recentHistory = [];

  const turnCount = timeInfo.turnIndex;
  for (let t = 0; t < turnCount; t++) {
    const candidateId = candidateIds[t % candidateIds.length];
    const roll = getDeterministicRoll(seed, t, sides);
    scores[candidateId] += roll;

    if (t >= turnCount - historyLimit) {
      recentHistory.unshift({ id: candidateId, value: roll, roll: t + 1 });
    }
  }

  return {
    scores,
    rollCount: turnCount,
    history: recentHistory.slice(0, historyLimit),
    timeInfo,
    seed,
  };
}
