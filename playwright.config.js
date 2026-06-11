// T1-6b Test-Harness (Pipeline Abschnitt G, Jobs 3/4/9).
// PREVIEW_URL kommt aus CI (resolve-preview-Job) oder lokal via env.
'use strict';
const { defineConfig } = require('@playwright/test');

const baseURL = process.env.PREVIEW_URL || 'http://127.0.0.1:8080';

module.exports = defineConfig({
  testDir: 'tests',
  timeout: 60000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  // Visual-Baselines: baseline/visual/ — leer bis erster ratifizierter Run
  // (Benjamin-GO via /baseline-update-Label, Pipeline T1-6b).
  snapshotPathTemplate: 'baseline/visual/{arg}{ext}',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.05 } },
  use: {
    baseURL,
    viewport: { width: 375, height: 812 },
    trace: 'retain-on-failure',
  },
});
