/** Small DOM helpers. Views use these so DOM writes stay minimal and uniform. */

/** @param {ParentNode} root @param {string} selector */
export const select = (root, selector) => root.querySelector(selector);

/** @param {Element | null} el @param {string} text */
export function setText(el, text) {
  if (el && el.textContent !== text) el.textContent = text;
}

/** @param {Element | null} el @param {string} name @param {string | number} value */
export function setAttr(el, name, value) {
  const next = String(value);
  if (el && el.getAttribute(name) !== next) el.setAttribute(name, next);
}

export const prefersReducedMotion = () =>
  globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Brief scale pulse that draws the eye to a value that just changed. */
export function pulse(/** @type {Element | null} */ el) {
  if (!el || prefersReducedMotion() || typeof el.animate !== 'function') return;
  el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], {
    duration: 450,
    easing: 'ease-out',
  });
}
