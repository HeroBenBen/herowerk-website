// @a11y — Pipeline Abschnitt G Job 4: axe-core, Schwelle 0 Errors
// auf allen Hauptseiten in beiden Themes.
'use strict';
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const PAGES = [
  '/',
  '/preise.html',
  '/dimensionierung.html',
  '/foerderung.html',
  '/prozess.html',
  '/ratgeber.html',
  '/kontakt.html',
  '/anfrage.html',
];
const THEMES = ['dark', 'light'];

for (const path of PAGES) {
  for (const theme of THEMES) {
    test(`@a11y axe-core 0 Violations auf ${path}?theme=${theme}`, async ({ page }) => {
      await page.goto(`${path}?theme=${theme}`, { waitUntil: 'networkidle' });
      await page.evaluate('document.fonts.ready');
      await page.waitForTimeout(250);
      const results = await new AxeBuilder({ page }).analyze();
      const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length}x`);
      expect(summary, summary.join('\n')).toEqual([]);
    });
  }
}
