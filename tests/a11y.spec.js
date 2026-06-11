// @a11y — Pipeline Abschnitt G Job 4: axe-core, Schwelle 0 Errors
// auf allen Hauptseiten.
'use strict';
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const PAGES = ['/', '/anfrage.html'];

for (const path of PAGES) {
  test(`@a11y axe-core 0 Violations auf ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length}x`);
    expect(summary, summary.join('\n')).toEqual([]);
  });
}
