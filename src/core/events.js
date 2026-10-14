/**
 * Minimal publish/subscribe channel.
 * @template T
 * @returns {{ on: (listener: (payload: T) => void) => () => void, emit: (payload: T) => void }}
 */
export function createEmitter() {
  /** @type {Set<(payload: T) => void>} */
  const listeners = new Set();
  return {
    on(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emit(payload) {
      for (const listener of [...listeners]) listener(payload);
    },
  };
}
