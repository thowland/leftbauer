// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettier from 'eslint-config-prettier';

/**
 * Layer boundaries — Technical Spec §3.1.
 *
 * Each layer lists the layers it may import. Everything else under
 * `src/` is forbidden. `pure` layers additionally may not import React
 * or touch window / document / localStorage.
 */
const LAYERS = {
  util: { allows: [], pure: true },
  engine: { allows: ['util'], pure: true },
  bots: { allows: ['engine', 'util'], pure: true },
  coach: { allows: ['bots', 'engine', 'util'], pure: true },
  session: { allows: ['engine', 'bots', 'util'], pure: true },
  state: { allows: ['engine', 'bots', 'session', 'util'], pure: true },
  audio: { allows: ['engine', 'assets', 'util'], pure: false },
  assets: { allows: ['engine'], pure: true },
  themes: { allows: [], pure: true },
  workers: { allows: ['bots', 'engine', 'util'], pure: true },
};
const ALL_LAYERS = [...Object.keys(LAYERS), 'ui'];

const reactPatterns = [
  {
    group: ['react', 'react-dom', 'react/*', 'react-dom/*'],
    message: 'Pure layers must not import React.',
  },
];

const layerConfigs = Object.entries(LAYERS).map(([layer, { allows, pure }]) => {
  const forbidden = ALL_LAYERS.filter((l) => l !== layer && !allows.includes(l));
  const patterns = [
    {
      // Cross-layer imports climb out of the layer first (`../engine/cards`),
      // so same-named files inside a layer (engine/state.ts) don't match.
      regex: `^(\\.\\./)+(${forbidden.join('|')})(/|$)`,
      message: `src/${layer}/ may only import from: ${allows.join(', ') || 'nothing internal'}.`,
    },
    ...(pure ? reactPatterns : []),
  ];
  const rules = { 'no-restricted-imports': ['error', { patterns }] };
  if (pure) {
    rules['no-restricted-globals'] = [
      'error',
      { name: 'window', message: 'Pure layers must not access window.' },
      { name: 'document', message: 'Pure layers must not access document.' },
      { name: 'localStorage', message: 'Pure layers must not access localStorage.' },
    ];
  }
  return { files: [`src/${layer}/**/*.{ts,tsx}`], rules };
});

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },
    settings: {
      react: { version: '19.0' },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  ...layerConfigs,
  {
    files: ['tests/**/*.{ts,tsx}', 'vitest.setup.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ['*.config.{ts,js,mjs}', 'scripts/**/*.{js,mjs}'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  prettier
);
