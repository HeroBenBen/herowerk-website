// @a11y: Pipeline Abschnitt G Job 4: axe-core auf allen Hauptseiten in beiden Modi.
// Schwelle: 0 Befunde im eigenen Markup, gemessen ohne die Wurzeln des
// Einwilligungsanbieters und abgeglichen gegen tests/axe-bekannte-befunde.json.
// Begruendung beider Trennungen: tests/helpers/axe.js, Kopfkommentar.
'use strict';
const { test, expect } = require('@playwright/test');
const { gotoWithConsentRejected } = require('./helpers/consent');
const { axeBefunde, pruefeGegenBekannte } = require('./helpers/axe');

const PAGES = [
  '/',
  '/preise.html',
  '/rechner.html',
  '/dimensionierung.html',
  '/foerderung.html',
  '/prozess.html',
  '/ratgeber.html',
  '/kontakt.html',
  '/anfrage.html',
  '/karriere.html',
];
const THEMES = ['dark', 'light'];

for (const path of PAGES) {
  for (const theme of THEMES) {
    test(`@a11y axe-core ohne neue Befunde auf ${path}?theme=${theme}`, async ({ page }) => {
      await gotoWithConsentRejected(page, `${path}?theme=${theme}`, { waitUntil: 'networkidle' });
      await page.evaluate('document.fonts.ready');
      await page.waitForTimeout(250);
      const gemessen = await axeBefunde(page);
      const beanstandungen = pruefeGegenBekannte(gemessen, path, theme);
      expect(beanstandungen, beanstandungen.join('\n')).toEqual([]);
    });
  }
}
