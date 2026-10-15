'use strict';
/* global paLoadData, HTMLImageElement, window */
const { test, expect } = require('@playwright/test');
const { gotoWithConsentRejected } = require('./helpers/consent');
const {
  raw,
  clone,
  keys,
  marked,
  selected,
  forbidden,
  model,
  label,
} = require('./helpers/t1087-geraetetyp.cjs');
const { internal } = require('./helpers/t1087-datenblatt.cjs');

async function expectManufacturerTabs(page, minimum) {
  await expect(page.locator('#manufacturerVaillant .manufacturer-name')).toHaveText(
    'Vaillant aroTHERM'
  );
  await expect(page.locator('#manufacturerWolf .manufacturer-name')).toHaveText('Wolf CHA');
  await expect(page.locator('#vaillantMinEigen')).toHaveText(minimum);
}
const minimumLabel = (rows) =>
  'ab ' + Math.min(...rows.map((r) => r.eigen)).toLocaleString('de-DE') + ' € Eigenanteil*';

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

  test('@smoke Tafel mit Herstellerdaten und gebundener Identität: ' + mode, async ({ page }) => {
    let response = mode === 'marker' ? marked : mode === 'altvertrag' ? raw : null;
    await page.route(/[?&]action=preise/, (route) =>
      response
        ? route.fulfill({ json: response })
        : route.fulfill({ status: 503, body: 'Testausfall' })
    );
    await gotoWithConsentRejected(page, '/preise.html');
    await page.waitForLoadState('networkidle');
    const minimum = response
      ? minimumLabel(
          mode === 'marker'
            ? selected.vaillant
            : keys.map((key) => raw.vaillant.filter((r) => r.klasse === key).at(-1))
        )
      : 'ab … dein Anteil*';
    await expectManufacturerTabs(page, minimum);
    for (const brand of ['vaillant', 'wolf']) {
      await page.locator(brand === 'wolf' ? '#manufacturerWolf' : '#manufacturerVaillant').click();
      await expectManufacturerTabs(page, minimum);
      const cards = page.locator('#paCards .pa-card');
      await expect(cards).toHaveCount(keys.length);
      for (const [index, key] of keys.entries()) {
        const row = response
          ? response[brand]
              .filter((r) => r.klasse === key && (mode !== 'marker' || r.tafel === 'ja'))
              .at(-1)
          : selected[brand][index];
        await expect(cards.nth(index).locator('.pa-modell')).toHaveText(model(row));
        expect(await cards.nth(index).innerText()).not.toMatch(internal);
        if (response) {
          await expect(cards.nth(index)).toContainText(row.brutto.toLocaleString('de-DE') + ' €');
          await expect(cards.nth(index)).toContainText(row.eigen.toLocaleString('de-DE') + ' €');
        } else await expect(cards.nth(index)).toContainText('Auf Anfrage');
        // Die erste Karte öffnet beim Markenwechsel automatisch.
        if (index) await cards.nth(index).click();
        const kw = await cards.nth(index).locator('.pa-kw').innerText();
        await expect(page.locator('#paSpecsSub')).toHaveText(model(row) + ' · ' + kw);
        expect(await page.locator('#paSpecsTable').innerText()).not.toMatch(internal);
        if (row.modell.includes('/7.1')) {
          await expect(page.locator('#paSpecsTable tbody tr')).toHaveCount(11);
          await expect(page.locator('#paSpecsTable')).toContainText('SCOP');
          await expect(page.locator('#paSpecsTable')).not.toContainText('JAZ');
          await expect(page.locator('#paJazFootnote')).toBeHidden();
          await expect(page.locator('#paScopFootnote')).toBeVisible();
          await expect(page.locator('#paImg')).toHaveAttribute(
            'src',
            index < 2 ? 'vwl-pro-s-m.jpg' : 'vwl-pro-l.jpg'
          );
        } else {
          await expect(page.locator('#paSpecsTable')).toContainText('JAZ');
          await expect(page.locator('#paJazFootnote')).toBeVisible();
          if (brand === 'vaillant')
            await expect(page.locator('#paImg')).toHaveAttribute('src', 'vwl-plus-l-xl.jpg');
        }
      }
      await expect(page.locator('.pa-kw')).toHaveCount(5);
    }
    // Der bekannte Bestandsbefund bei Folgeabruffehlern wird hier nicht korrigiert.
    response = null;
    await page.evaluate(async () => {
      await paLoadData();
    });
    await page.locator('#manufacturerVaillant').click();
    await expectManufacturerTabs(page, minimum);
    await expect(page.locator('#paCards')).toContainText('Auf Anfrage');
    response = marked;
    await page.evaluate(async () => {
      await paLoadData();
    });
    await page.locator('#manufacturerVaillant').click();
    await expectManufacturerTabs(page, minimumLabel(selected.vaillant));
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
    await page.goto('/preise.html');
    await expectManufacturerTabs(page, 'ab … dein Anteil*');
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

for (const width of [375, 1440]) {
  test('@smoke Tafel Sichtbelege und Bildzuordnung bei ' + width, async ({ page }, testInfo) => {
    const fs = require('node:fs');
    const path = require('node:path');
    await page.setViewportSize({ width, height: 1000 });
    await page.route(/[?&]action=preise/, (route) => route.fulfill({ json: marked }));
    await gotoWithConsentRejected(page, '/preise.html');
    await page.waitForLoadState('networkidle');
    const files = {
      wolf: [
        'cha-sanierung.jpg',
        'cha-neubau-dunkel.jpg',
        'cha-komfort-neubau.jpg',
        'cha-mfh-saniert.jpg',
        'cha-kaskade-mfh.jpg',
      ],
      vaillant: [
        'vwl-pro-s-m.jpg',
        'vwl-pro-s-m.jpg',
        'vwl-pro-l.jpg',
        'vwl-plus-l-xl.jpg',
        'vwl-plus-l-xl.jpg',
      ],
    };
    const out = path.join('artifacts', 'tafel-sicht', String(width));
    fs.mkdirSync(out, { recursive: true });
    for (const brand of ['wolf', 'vaillant']) {
      await page.locator(brand === 'wolf' ? '#manufacturerWolf' : '#manufacturerVaillant').click();
      for (const [i, key] of keys.entries()) {
        if (i) await page.locator('#paCards .pa-card').nth(i).click();
        const img = page.locator('#paImg');
        await expect(img).toHaveAttribute('src', files[brand][i]);
        await expect
          .poll(() =>
            img.evaluate(
              (el) => el instanceof HTMLImageElement && el.complete && el.naturalWidth > 0
            )
          )
          .toBe(true);
        if (brand === 'vaillant') {
          expect(
            await img.evaluate((el) =>
              el instanceof HTMLImageElement ? [el.naturalWidth, el.naturalHeight] : []
            )
          ).toEqual([1280, 853]);
        }
        await expect(page.locator('#paDetail')).toHaveClass(/open/);
        const overflow = await page.locator('#paSpecsTable').evaluate((el) => {
          const bounds = el.getBoundingClientRect();
          return bounds.right > window.innerWidth + 1 || bounds.left < -1;
        });
        expect(overflow).toBe(false);
        const file = path.join(out, brand + '-' + key + '.png');
        await page.locator('#paDetail').screenshot({
          path: file,
          animations: 'disabled',
          // Feste Seitennavigation soll im Detailbeleg keine Tabellenzeile verdecken.
          // Playwright entfernt diesen Stil unmittelbar nach der Aufnahme wieder.
          style:
            'nav[aria-label="Hauptnavigation"], .mobile-bottom-bar { visibility: hidden !important; }',
        });
        await testInfo.attach(brand + '-' + key, { path: file, contentType: 'image/png' });
        if (brand === 'vaillant' && (key === 's' || key === 'xl')) {
          await expectManufacturerTabs(page, minimumLabel(selected.vaillant));
          await page.evaluate(() => window.scrollTo(0, 0));
          await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
          const full = path.join(out, 'seite-' + brand + '-' + key + '.png');
          // Vollständige Seite einschließlich Reitern, Karten, Detail und realer Navigation.
          await page.screenshot({ path: full, fullPage: true, animations: 'disabled' });
          await testInfo.attach('seite-' + brand + '-' + key, {
            path: full,
            contentType: 'image/png',
          });
        }
      }
    }
  });
}
