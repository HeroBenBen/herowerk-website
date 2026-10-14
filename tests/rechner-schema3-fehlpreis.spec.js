'use strict';
/* global document, window */
const { test, expect } = require('@playwright/test');
const { gotoWithConsentRejected } = require('./helpers/consent');
// Die Python-HTTP-Kette prüft diese Antworten gegen den tatsächlichen PHP-Endpunkt.
const fs = require('node:fs');
const path = require('node:path');
const antwort = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures/rechner-schema3-fehlpreis-antwort.json'), 'utf8')
);

test('@smoke Schema-3-Leerpreise zeigen auf Anfrage', async ({ page }) => {
  await page.route(/[?&]action=preise/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(antwort.preise),
    })
  );
  await gotoWithConsentRejected(page, '/preise.html?theme=dark');
  await expect(page.locator('#paCards')).toContainText('Auf Anfrage');
  await page.evaluate((geraet) => {
    const probe = document.createElement('div');
    probe.id = 'fehlpreis-probe';
    const render = window['renderBrandCard'];
    if (typeof render !== 'function') throw new Error('Geräteanzeige nicht geladen');
    probe.innerHTML = render('wolf', 'Wolf', geraet, 8.1);
    document.body.appendChild(probe);
  }, antwort.geraet);
  await expect(page.locator('#fehlpreis-probe .wiz-variant-price')).toHaveText('Preis auf Anfrage');
});
