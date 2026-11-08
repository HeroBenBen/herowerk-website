'use strict';
/* global window */
// Befund 08.11.2026 (T1087): Wer während des Preisladens Vaillant wählt, sah nach dem
// Ladeende die Wolf-Geräte, weil das Laden am Ende fest auf Wolf zurückschaltete.
// Dieser Test hält die Antwort des Preisdienstes an, bis der Klick auf Vaillant erfolgt ist.
// Damit ist die Reihenfolge Klick vor Ladeende erzwungen und nicht vom Zufall abhängig.
const { test, expect } = require('@playwright/test');
const { gotoWithConsentRejected } = require('./helpers/consent');
const { keys, marked, selected, model } = require('./helpers/t1087-geraetetyp.cjs');

const zeile = (brand, index) =>
  marked[brand].filter((r) => r.klasse === keys[index] && r.tafel === 'ja').at(-1);

async function expectMarke(page, brand, mode) {
  const other = brand === 'vaillant' ? 'wolf' : 'vaillant';
  const tabId = (b) => (b === 'vaillant' ? '#manufacturerVaillant' : '#manufacturerWolf');
  await expect(page.locator(tabId(brand))).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator(tabId(other))).toHaveAttribute('aria-selected', 'false');
  const cards = page.locator('#paCards .pa-card');
  await expect(cards).toHaveCount(keys.length);
  for (const index of keys.keys()) {
    const row = mode === 'erfolg' ? zeile(brand, index) : selected[brand][index];
    await expect(cards.nth(index).locator('.pa-modell')).toHaveText(model(row));
    if (mode === 'erfolg') {
      await expect(cards.nth(index)).toContainText(row.brutto.toLocaleString('de-DE') + ' €');
    } else {
      await expect(cards.nth(index)).toContainText('Auf Anfrage');
    }
  }
  // Die offene Standardkarte gehört zur gewählten Marke, nicht zur anderen.
  await expect(page.locator('#paSpecsSub')).toContainText(
    brand === 'vaillant' ? 'Vaillant' : 'Wolf'
  );
}

for (const mode of ['erfolg', 'ausfall']) {
  test('@smoke Markenwahl während des Preisladens bleibt erhalten: ' + mode, async ({ page }) => {
    let freigeben;
    const freigabe = new Promise((resolve) => {
      freigeben = resolve;
    });
    let abrufe = 0;
    await page.route(/[?&]action=preise/, async (route) => {
      abrufe += 1;
      await freigabe;
      return mode === 'erfolg'
        ? route.fulfill({ json: marked })
        : route.fulfill({ status: 503, body: 'Testausfall' });
    });
    const ladeende =
      mode === 'ausfall'
        ? page.waitForEvent('console', {
            predicate: (msg) => msg.text().includes('Live-Preise nicht verfügbar'),
            timeout: 30000,
          })
        : null;

    await gotoWithConsentRejected(page, '/preise.html');
    // Der Preisabruf läuft und hängt: erst jetzt wählt der Besucher Vaillant.
    await expect.poll(() => abrufe).toBeGreaterThan(0);
    await page.locator('#manufacturerVaillant').click();
    await expectMarke(page, 'vaillant', 'ausfall');

    freigeben();
    if (mode === 'erfolg') {
      await page.waitForFunction(
        () => window.HW_PREISE_BRUTTO && Object.keys(window.HW_PREISE_BRUTTO).length > 0
      );
    } else {
      await ladeende;
      // Alle drei Versuche (0, 1, 3 s) sind gelaufen, erst dann gilt der Ausfall.
      expect(abrufe).toBe(3);
    }
    // Eine volle Ereignisrunde abwarten, damit auch die Nacharbeit nach dem Laden gelaufen ist.
    await page.evaluate(() => new Promise((resolve) => window.setTimeout(resolve, 50)));

    await expectMarke(page, 'vaillant', mode);

    // Gegenprobe: der Wechsel zurück zu Wolf funktioniert nach dem Laden weiter.
    await page.locator('#manufacturerWolf').click();
    await expectMarke(page, 'wolf', mode);
  });
}
