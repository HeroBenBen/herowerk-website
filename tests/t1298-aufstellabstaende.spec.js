'use strict';
/* global document, window */

const { test, expect } = require('@playwright/test');
const { gotoWithConsentRejected } = require('./helpers/consent');
const { axeBefunde } = require('./helpers/axe');

const ROUTE = '/waermepumpe-abstand';
const BESTAETIGUNG =
  'Schutzbereich steht. Prüfe die Tabelle zu deinem Wunschplatz und bestätige sie.';
const URTEILE = [
  'Passt voraussichtlich',
  BESTAETIGUNG,
  'Prüfen wir vor Ort',
  'Voraussichtlich zulässig mit verringertem Abstand',
];

async function waehle(page, art, key, wert) {
  const knopf = page.locator(`[data-${art}="${key}"][data-v="${wert}"]`);
  await knopf.click();
  await expect(knopf).toHaveAttribute('aria-pressed', 'true');
}

async function fall(page, nummer) {
  if (nummer === 4) {
    for (const [key, wert] of [
      ['art', 'frei2'],
      ['abst', '1'],
      ['anders', 'nein'],
      ['bebaut', 'nein'],
      ['blas', 'weg'],
    ]) {
      await waehle(page, 'gz', key, wert);
    }
    return page.locator('#gz-ergebnis h3').innerText();
  }
  await waehle(page, 'sz', 'geraet', nummer === 1 ? 'perform' : nummer === 2 ? 'pro' : 'wolf');
  await waehle(page, 'sz', 'montage', nummer === 3 ? 'sockel' : 'boden');
  await waehle(page, 'sz', 'aufst', nummer === 1 ? 'ecke' : 'wand');
  if (nummer !== 3) {
    await waehle(page, 'sz', 'fs', 'nein');
    await waehle(page, 'sz', 'abd', nummer === 1 ? 'ja' : 'nein');
    await expect(page.locator('.sz-matrix')).toBeVisible();
    await expect(page.locator('.sz-matrix tbody tr')).not.toHaveCount(0);
    if (nummer === 1) {
      // Die Tabelle wird durch echte Klicks bestätigt, die Voreinstellung ist weiter weg.
      await expect(page.locator('.sz-matrix [data-v="weit"][aria-pressed="true"]')).toHaveCount(
        await page.locator('.sz-matrix tbody tr').count()
      );
      await waehle(page, 'sz', 'ok', '1');
    }
  }
  if (nummer === 2) {
    await expect(page.locator('#sz-ergebnis h3')).toHaveCount(0);
    return page.locator('#sz-ergebnis').innerText();
  }
  return page.locator('#sz-ergebnis h3').innerText();
}

async function keinUeberstand(page) {
  const ueberstand = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(ueberstand).toBeLessThanOrEqual(0.5);
}

async function haupttext(page) {
  // innerText liest gerenderten Text. Nur Leerraum wird normalisiert.
  return (await page.locator('main').innerText()).replace(/\s+/gu, ' ').trim();
}

for (const breite of [390, 768, 1440]) {
  for (const theme of ['light', 'dark']) {
    test(`T1298 vier Klickfälle, Bedienung und Layout ${breite} ${theme}`, async ({ page }) => {
      test.setTimeout(120000);
      await page.setViewportSize({ width: breite, height: 900 });
      const fehler = [];
      const fremdeDienste = [];
      page.on('pageerror', (error) => fehler.push(error.message));
      page.on('console', (meldung) => {
        if (meldung.type() === 'error') fehler.push(meldung.text());
      });
      page.on('requestfailed', (request) => fehler.push(request.url()));
      page.on('response', (response) => {
        if (response.status() >= 400) fehler.push(`${response.status()} ${response.url()}`);
      });
      page.on('request', (request) => {
        if (
          /google-analytics|googletagmanager|connect\.facebook|facebook\.com\/tr|consentmanager|hubspot/i.test(
            request.url()
          )
        ) {
          fremdeDienste.push(request.url());
        }
      });
      const url = `${ROUTE}?theme=${theme}`;
      await gotoWithConsentRejected(page, url);
      await page.evaluate('document.fonts.ready');
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expect(page.locator('main')).toHaveCount(1);
      await keinUeberstand(page);
      await page.screenshot({ path: test.info().outputPath('seite.png'), fullPage: true });

      const ziele = await page.locator('main a[href^="#"]').evaluateAll((links) =>
        links.map((link) => ({
          href: link.getAttribute('href'),
          vorhanden: !!document.getElementById(link.hash.slice(1)),
        }))
      );
      expect(ziele.filter((ziel) => !ziel.vorhanden)).toEqual([]);
      for (const ziel of [
        '/anfrage',
        '/dimensionierung',
        '/foerderung',
        '/kostenvergleich-waermepumpe',
      ]) {
        await expect(page.locator(`main a[href="${ziel}"]`).first()).toBeAttached();
        expect((await page.request.get(ziel)).status()).toBeLessThan(400);
      }
      await page.locator('main a[href="#schutzbereich"]').first().click();
      await expect(page).toHaveURL(/#schutzbereich$/);

      if (breite === 390) {
        await page.locator('.aa-zoom').click();
        await expect(page.locator('#aa-plan')).toHaveClass(/gross/);
        await keinUeberstand(page);
        await page.screenshot({ path: test.info().outputPath('skizze.png'), fullPage: true });
        await page.locator('.aa-zoom').click();
      }

      await page.evaluate(() => window.scrollTo(0, 0));
      // Auf schmalen Breiten liegt der Umschalter im Klappmenue, wie in website-additive.spec.js.
      const menueNoetig = (await page.locator('[data-theme-toggle]:visible').count()) === 0;
      if (menueNoetig) await page.locator('#hamburger').click();
      const umschalter = page.locator('[data-theme-toggle]:visible').first();
      // Zwei-Feld-Schalter: ein Tipp auf das aktive Feld bleibt mit Absicht folgenlos
      // (js/theme.js), deshalb immer das inaktive Feld waehlen.
      const inaktiv = umschalter.locator('.tt-feld[data-aktiv="false"]');
      await inaktiv.click();
      await expect(page.locator('html')).toHaveAttribute(
        'data-theme',
        theme === 'light' ? 'dark' : 'light'
      );
      await inaktiv.click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      if (menueNoetig) await page.locator('#hamburger').click();
      if (breite <= 768) {
        await page.locator('#hamburger').click();
        await expect(page.locator('#mobileMenu')).toHaveClass(/open/);
        await page.locator('#hamburger').click();
      }

      for (let nummer = 1; nummer <= 4; nummer++) {
        await page.goto(url);
        const ergebnis = await fall(page, nummer);
        expect(ergebnis).toBe(URTEILE[nummer - 1]);
        await keinUeberstand(page);
        await test
          .info()
          .attach(`fall-${nummer}.txt`, { body: ergebnis, contentType: 'text/plain' });
        await page.screenshot({
          path: test.info().outputPath(`fall-${nummer}.png`),
          fullPage: true,
        });
        expect(await axeBefunde(page)).toEqual([]);
      }

      // Die dritte Klick-Prüfung ist die Schalltabelle, einschließlich Zurücksetzen.
      await page.locator('[data-key="aufstellung"][data-v="0"]').click();
      await page.locator('[data-key="sicht"][data-v="5"]').click();
      await page.locator('[data-key="marke"] [data-v="WOLF"]').click();
      await page.locator('[data-key="gebiet"] [data-v="35"]').click();
      await page.locator('[data-key="betrieb"] [data-v="1"]').click();
      await expect(page.locator('#aa-kopf th')).toHaveCount(2);
      await expect(page.locator('#aa-kopf')).toContainText('Mindestabstand');
      await expect(page.locator('#aa-schall')).not.toContainText('Vaillant');
      await expect(page.locator('#aa-schall')).toContainText('WOLF');
      await keinUeberstand(page);
      await page.locator('#aa-alle').click();
      await expect(page.locator('#aa-kopf th')).toHaveCount(4);

      // Ein Auswahlknopf muss auch per Tastatur reagieren.
      await page.goto(url);
      const geraet = page.locator('[data-sz="geraet"][data-v="perform"]');
      await geraet.focus();
      await page.keyboard.press('Enter');
      await expect(geraet).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('[data-sz="montage"]').first()).toBeVisible();
      expect(fehler).toEqual([]);
      expect(fremdeDienste).toEqual([]);
    });
  }
}

for (const theme of ['light', 'dark']) {
  test(`T1298 Ratgeberkarte sichtbar ${theme}`, async ({ page }) => {
    await gotoWithConsentRejected(page, `/ratgeber?theme=${theme}`);
    const karte = page.locator('#ratgeber-technik .blog-card').filter({
      has: page.locator('[href="/waermepumpe-abstand"]'),
    });
    await expect(karte).toHaveCount(1);
    await karte.scrollIntoViewIfNeeded();
    await expect(karte.locator('img')).toBeVisible();
    await karte.screenshot({ path: test.info().outputPath('ratgeberkarte.png') });
    await karte.locator('.blog-link').click();
    await expect(page.locator('main h1')).toHaveText('Wo darf die Wärmepumpe stehen?');
  });
}

test('T1298 sichtbarer Haupttext und vier Urteile entsprechen dem Originalentwurf', async ({
  page,
  context,
}) => {
  test.skip(
    !process.env.T1298_ORIGINAL_URL,
    'T1298_ORIGINAL_URL muss auf den lokal bereitgestellten Originalentwurf zeigen.'
  );
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const original = await context.newPage();
  await original.setViewportSize({ width: 1440, height: 900 });
  const originalUrl = process.env.T1298_ORIGINAL_URL;
  await gotoWithConsentRejected(page, `${ROUTE}?theme=dark`);
  await original.goto(`${originalUrl}?theme=dark`);
  const neuText = await haupttext(page);
  const originalText = await haupttext(original);
  await test.info().attach('neue-seite.txt', { body: neuText, contentType: 'text/plain' });
  await test
    .info()
    .attach('originalentwurf.txt', { body: originalText, contentType: 'text/plain' });
  expect(neuText).toBe(originalText);
  for (let nummer = 1; nummer <= 4; nummer++) {
    await page.goto(`${ROUTE}?theme=dark`);
    await original.goto(`${originalUrl}?theme=dark`);
    expect(await fall(page, nummer)).toBe(await fall(original, nummer));
    expect(await haupttext(page)).toBe(await haupttext(original));
  }
  await original.close();
});
