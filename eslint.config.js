import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import globals from 'globals';

export default [
  { ignores: ['dist/', '.astro/', 'node_modules/'] },
  js.configs.recommended,
  ...astro.configs.recommended,
  {
    files: ['src/client/**/*.js', 'src/**/*.astro'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['src/core/**/*.js', 'src/shared/**/*.js', 'src/data/**/*.js'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    files: ['astro.config.mjs', 'eslint.config.js', 'tests/**/*.js'],
    languageOptions: { globals: { ...globals.node } },
  },
];
