'use strict';
/* global paLoadData */
const { test, expect } = require('@playwright/test');
const { gotoWithConsentRejected } = require('./helpers/consent');
const {
  raw,
  clone,
  keys,
  marked,
  selected,
  forbidden,
  conditioned,
  model,
  label,
} = require('./helpers/t1087-geraetetyp.cjs');

for (const mode of ['marker', 'altvertrag', 'ausfall']) {
  test('@smoke Förderoptionen nur Gerätetyp und Preis: ' + mode, async ({ page }) => {
    let response = mode === 'marker' ? marked : mode === 'altvertrag' ? raw : null;
    await page.route(/[?&]action=preise/, (route) =>
      response
        ? route.fulfill({ json: response })
        : route.fulfill({ status: 503, body: 'Testausfall' })
    );
    await gotoWithConsentRejected(page, '/foerderung.html');
    // Auch die Initialisierung und erneute Aktualisierung benutzen den echten Abrufpfad.
    for (const data of [response, null, marked]) {
      response = data;
      await page.evaluate(async () => {
        await paLoadData();
      });
      const expected =
        data === raw ? { wolf: raw.wolf, vaillant: raw.vaillant.slice(0, 5) } : selected;
      const options = page.locator('#foerderWpTyp option');
      await expect(options).toHaveText(Object.values(expected).flat().map(label));
      for (const text of await options.allTextContents()) expect(text).not.toMatch(forbidden);
    }
  });

  test('@smoke Tafel ohne Betriebspunkte mit gebundener Identität: ' + mode, async ({ page }) => {
    const response = mode === 'marker' ? marked : mode === 'altvertrag' ? raw : null;
    await page.route(/[?&]action=preise/, (route) =>
      response
        ? route.fulfill({ json: response })
        : route.fulfill({ status: 503, body: 'Testausfall' })
    );
    await gotoWithConsentRejected(page, '/preise.html');
    await page.waitForLoadState('networkidle');
    for (const brand of ['vaillant', 'wolf']) {
      await page.locator(brand === 'wolf' ? '#manufacturerWolf' : '#manufacturerVaillant').click();
      const cards = page.locator('#paCards .pa-card');
      await expect(cards).toHaveCount(keys.length);
      for (const [index, key] of keys.entries()) {
        const row = response
          ? response[brand]
              .filter((r) => r.klasse === key && (mode !== 'marker' || r.tafel === 'ja'))
              .at(-1)
          : selected[brand][index];
        await expect(cards.nth(index).locator('.pa-modell')).toHaveText(model(row));
        expect(await cards.nth(index).innerText()).not.toMatch(forbidden);
        if (response) {
          await expect(cards.nth(index)).toContainText(row.brutto.toLocaleString('de-DE') + ' €');
          await expect(cards.nth(index)).toContainText(row.eigen.toLocaleString('de-DE') + ' €');
        } else await expect(cards.nth(index)).toContainText('Auf Anfrage');
        // Die erste Karte öffnet beim Markenwechsel automatisch.
        if (index) await cards.nth(index).click();
        await expect(page.locator('#paSpecsSub')).toHaveText(model(row));
        expect(await page.locator('#paSpecsTable').innerText()).not.toMatch(conditioned);
        if (row.modell.includes('/7.1'))
          await expect(page.locator('#paSpecsTable tbody')).toBeEmpty();
      }
      await expect(page.locator('.pa-kw')).toHaveCount(0);
    }
  });
}

test('@smoke Statische Förderoptionen ohne JavaScript nur Gerätetyp und Preis', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    await page.goto('/foerderung.html');
    const texts = await page.locator('#foerderWpTyp option').allTextContents();
    expect(texts).toEqual(Object.values(selected).flat().map(label));
    texts.forEach((text) => expect(text).not.toMatch(forbidden));
  } finally {
    await context.close();
  }
});

test('@smoke Ungültiger Marker nutzt dieselbe leistungsfreie Rückfallauswahl', async ({ page }) => {
  const invalid = clone(marked);
  invalid.vaillant.forEach((row) => {
    row.tafel = '';
  });
  await page.route(/[?&]action=preise/, (route) => route.fulfill({ json: invalid }));
  await gotoWithConsentRejected(page, '/foerderung.html');
  await page.evaluate(async () => {
    await paLoadData();
  });
  await expect(page.locator('#foerderWpTyp option')).toHaveText(
    Object.values(selected).flat().map(label)
  );
});
