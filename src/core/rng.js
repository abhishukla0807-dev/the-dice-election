/** @typedef {() => number} Rng A source of floats in [0, 1). */

/**
 * Creates a random source backed by the Web Crypto API when available.
 * @param {Crypto | undefined} [cryptoApi]
 * @returns {Rng}
 */
export function createSecureRng(cryptoApi = globalThis.crypto) {
  if (!cryptoApi?.getRandomValues) return Math.random;
  const buffer = new Uint32Array(1);
  return () => {
    cryptoApi.getRandomValues(buffer);
    return buffer[0] / 0x100000000;
  };
}
