'use strict';
/* global buildHubSpotPayload, document, localStorage, sessionStorage */

const { test, expect } = require('@playwright/test');
const http = require('http');
const fs = require('fs');
const path = require('path');

let server;
let baseURL;

const VALID_LEAD = {
  v: 1,
  quelle: 'kostenvergleich-waermepumpe',
  zeitpunkt: '2026-07-16T00:00:00.000Z',
  heizungsart: 'gas',
  verbrauch: { kwh: 20000, eingabeWert: 2000, einheit: 'm3', herkunft: 'market' },
  gebaeude: { geb: 'efh', bj: '1978-1994', san: 'teilweise', flaeche: 140 },
  kessel: { rohr: 'kunststoff', kbj: '1990-2010', altgas: 'ja' },
  zeitraum: 'h2-2026',
  ergebnis: { eigenanteil: 17120, zuschuss: 12880, quote: 46 },
};

test.beforeAll(async () => {
  const root = path.resolve(__dirname, '..');
  server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    const relative =
      url.pathname === '/' ? 'anfrage.html' : decodeURIComponent(url.pathname.slice(1));
    const file = path.resolve(root, relative);
    if (
      !file.startsWith(root + path.sep) ||
      !fs.existsSync(file) ||
      fs.statSync(file).isDirectory()
    ) {
      response.writeHead(404);
      response.end('not found');
      return;
    }
    const type = file.endsWith('.html')
      ? 'text/html; charset=utf-8'
      : file.endsWith('.css')
        ? 'text/css'
        : file.endsWith('.js')
          ? 'text/javascript; charset=utf-8'
          : 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(response);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseURL = `http://127.0.0.1:${server.address().port}`;
});

test.afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

function collectErrors(page) {
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  return { consoleErrors, pageErrors };
}

async function setLead(page, value) {
  await page.addInitScript((lead) => {
    if (sessionStorage.getItem('__kv_lead_test_installed') === '1') return;
    sessionStorage.setItem('__kv_lead_test_installed', '1');
    sessionStorage.setItem('hero_kv_lead', JSON.stringify(lead));
  }, value);
}

test('O4 Reader: gültiger v1-Key übernimmt technische Angaben und löscht den Key', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await setLead(page, VALID_LEAD);
  await page.goto(`${baseURL}/anfrage.html`, { waitUntil: 'domcontentloaded' });

  await expect(page.locator('#leadHandoffBanner')).toContainText(
    'Quelle: Kostenvergleich Wärmepumpe.'
  );
  await expect(page.locator('#leadHandoffBanner')).toContainText(
    'ohne deine Einkommensangabe gerechnet'
  );
  await expect(page.locator('#leadHandoffBanner')).toContainText('12.880 €');
  await expect(page.locator('#leadHandoffBanner')).toContainText('17.120 €');
  await expect(page.locator('#leadHandoffBanner')).toContainText('Einfamilienhaus');
  await expect(page.locator('#leadHandoffBanner')).toContainText('Gasheizung');
  await expect(page.locator('#leadHandoffBanner')).toContainText('20 Jahre oder älter');
  await expect(page.locator('#leadHandoffBanner')).toContainText('1978–1994');
  await expect(page.locator('#leadHandoffBanner')).toContainText('100–150 m²');
  await expect(page.locator('.step.active')).toHaveAttribute('data-step', '9');
  const mapped = await page.evaluate(() =>
    Object.fromEntries(buildHubSpotPayload({}).fields.map((field) => [field.name, field.value]))
  );
  expect(mapped.gebaeudetyp).toBe('Einfamilienhaus');
  expect(mapped.heizung_aktuell).toBe('Gasheizung');
  expect(mapped.heizungsalter).toBe('20 Jahre oder älter');
  expect(mapped.baujahr).toBe('1978–1994');
  expect(mapped.wohnflaeche).toBe('100–150 m²');
  expect(mapped.energiebedarf_kwh).toBe('20000');
  expect(mapped.foerderquote_pct).toBe('46');
  expect(mapped.foerderbetrag_eur).toBe('12880');
  expect(await page.evaluate(() => sessionStorage.getItem('hero_kv_lead'))).toBeNull();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    )
  ).toBe(0);
  expect(errors.consoleErrors).toEqual([]);
  expect(errors.pageErrors).toEqual([]);
});

test('O4 Reader: Angaben ändern verwirft den Handoff und stellt den vollständigen Funnel her', async ({
  page,
}) => {
  await setLead(page, VALID_LEAD);
  await page.goto(`${baseURL}/anfrage.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('#leadHandoffEdit').click();
  await expect(page.locator('#leadHandoffBanner')).toHaveCount(0);
  await expect(page.locator('.step.active')).toHaveAttribute('data-step', '0');
  await expect(page.locator('#stepCounter')).toHaveText('Schritt 1 von 11');
  expect(await page.evaluate(() => sessionStorage.getItem('hero_kv_lead'))).toBeNull();
});

test('O4 Reader: ungültiger oder unbekannter Key wird nicht übernommen', async ({ page }) => {
  await setLead(page, { ...VALID_LEAD, v: 2, email: 'verboten@example.invalid' });
  await page.goto(`${baseURL}/anfrage.html`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#leadHandoffBanner')).toHaveCount(0);
  await expect(page.locator('.step.active')).toHaveAttribute('data-step', '0');
  expect(await page.evaluate(() => sessionStorage.getItem('hero_kv_lead'))).toBeNull();
});

test('O4 Reader: ohne Key bleibt der bestehende Light-Funnel unverändert', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => localStorage.setItem('hero-theme', 'light'));
  await page.goto(`${baseURL}/anfrage.html`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#leadHandoffBanner')).toHaveCount(0);
  await expect(page.locator('.step.active')).toHaveAttribute('data-step', '0');
  await expect(page.locator('#stepCounter')).toHaveText('Schritt 1 von 11');
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe(
    'light'
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    )
  ).toBe(0);
  expect(errors.consoleErrors).toEqual([]);
  expect(errors.pageErrors).toEqual([]);
});
