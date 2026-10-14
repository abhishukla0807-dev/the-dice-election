import { createApp } from './create-app.js';

function boot() {
  document.querySelectorAll('[data-election-app]').forEach((root) => {
    createApp(/** @type {HTMLElement} */ (root)).start();
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        requestAnimationFrame(() => setTimeout(boot, 0));
      },
      { once: true },
    );
  } else {
    requestAnimationFrame(() => setTimeout(boot, 0));
  }
}
