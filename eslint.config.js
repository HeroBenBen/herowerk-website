// T1-6b Harness-Lint (Pipeline Abschnitt G, Job 1).
// Scope: NUR Harness-Code (scripts/, tests/, Configs). Canonical HTML-Files
// (index.html = v4, anfrage.html) bleiben unangetastet — Content-Fidelity-Gate.
'use strict';

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'baseline/**',
      'playwright-report/**',
      'test-results/**',
      '**/*.html',
    ],
  },
  {
    files: ['scripts/**/*.js', 'tests/**/*.js', 'eslint.config.js', 'playwright.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'writable',
        process: 'readonly',
        console: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'error',
      'no-undef': 'error',
      eqeqeq: 'error',
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
];
