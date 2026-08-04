'use strict';
/* global document, KV_STATE, window */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const http = require('http');
const path = require('path');
const engine = require('../apps-script/rechner-backend/kv_engine.gs');

let server;
let baseURL;
const root = path.resolve(__dirname, '..');

function sendJson(response, value) {
  response.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(value));
}

function calculationInputs(query) {
  const inputs = { ...engine.KV_DEFAULTS };
  Object.keys(inputs).forEach((key) => {
    if (!query.has(key) || key === 'proklimaTog') return;
    if (typeof inputs[key] === 'boolean') inputs[key] = query.get(key) === '1';
    else if (typeof inputs[key] === 'number') inputs[key] = Number(query.get(key));
    else inputs[key] = query.get(key);
  });
  inputs.proklimaTog = false;
  return inputs;
}

test.beforeAll(async () => {
  server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (url.pathname === '/api/rechner') {
      const action = url.searchParams.get('action');
      if (action === 'kv_bootstrap')
        return sendJson(response, engine.kvBootstrapPayload(engine.KV_PARAMS_SEED));
      if (action === 'kostenvergleich') {
        return sendJson(
          response,
          engine.kvCalculate(calculationInputs(url.searchParams), engine.KV_PARAMS_SEED)
        );
      }
      if (action === 'preise') return sendJson(response, { wolf: [], vaillant: [] });
    }
    let relative = decodeURIComponent(url.pathname.slice(1));
    if (!relative) relative = 'index.html';
    if (!path.extname(relative)) relative += '.html';
    const file = path.resolve(root, relative);
    if (
      !file.startsWith(root + path.sep) ||
      !fs.existsSync(file) ||
      fs.statSync(file).isDirectory()
    ) {
      response.writeHead(404);
      return response.end('not found');
    }
    const type = file.endsWith('.html')
      ? 'text/html; charset=utf-8'
      : file.endsWith('.css')
        ? 'text/css'
        : file.endsWith('.js')
          ? 'text/javascript; charset=utf-8'
          : file.endsWith('.png')
            ? 'image/png'
            : 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(response);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = /** @type {import('node:net').AddressInfo} */ (server.address());
  baseURL = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test.beforeEach(async ({ page }) => {
  await page.route(/https:\/\/.*consentmanager\.net\//, (route) =>
    route.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: '' })
  );
});

test('Zins-Bootstrap und Finanzierungsvertrag', () => {
  const bootstrap = engine.kvBootstrapPayload(engine.KV_PARAMS_SEED);
  expect(bootstrap.kredit).toEqual({
    zins358Eff: 0.98,
    zins359Eff: 4.1,
    zveGrenze: 90000,
    bereitstellungProv: 0.15,
    stand: '2026-07-24',
    quelle: 'KfW-Ergänzungskredit 358/359',
  });
  expect(bootstrap.defaults.kredZins).toBe(bootstrap.kredit.zins358Eff);

  const aus = engine.kvCalculate(
    { ...engine.KV_DEFAULTS, finanzTog: false },
    engine.KV_PARAMS_SEED
  ).finanzierung;
  const nullFelder = [
    'kredZinsProzent',
    'kredN',
    'kreditBetrag',
    'monRate',
    'monRateFossil',
    'monGesWP',
    'monDiff',
    'wpMon',
    'fossMon',
    'monVorteil',
    'gesamtkostenKredit',
  ];
  expect(Object.fromEntries(nullFelder.map((feld) => [feld, aus[feld]]))).toEqual(
    Object.fromEntries(nullFelder.map((feld) => [feld, null]))
  );
  expect(aus).toMatchObject({
    aktiv: false,
    kredLZ: 10,
    zinsKosten: 0,
    zinsFossil: 0,
    zinsDelta: 0,
  });
  for (const feld of ['monWPStrom', 'monFossil', 'endJahrIndex', 'endWpMon', 'endFossilMon']) {
    expect(aus[feld]).not.toBeNull();
  }

  const rate07 = engine.kvCalculate(
    { ...engine.KV_DEFAULTS, finanzTog: true, kredZins: 0.7 },
    engine.KV_PARAMS_SEED
  ).finanzierung.monRate;
  const rate35 = engine.kvCalculate(
    { ...engine.KV_DEFAULTS, finanzTog: true, kredZins: 3.5 },
    engine.KV_PARAMS_SEED
  ).finanzierung.monRate;
  expect(rate07).toBeCloseTo(147.75984088488815, 10);
  expect(rate35).toBeCloseTo(169.29260509477797, 10);
});

test('Zinsvorgabe, Touch-Sperre und Bootstrap-Kommunikation', async ({ page }) => {
  await page.goto(`${baseURL}/kostenvergleich-waermepumpe`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForFunction(() => KV_STATE.bootstrap && KV_STATE.last);

  const zins = page.locator('#kredZins');
  await expect(zins).toHaveAttribute('min', '0.0');
  await expect(zins).toHaveAttribute('max', '9.0');
  await expect(zins).toHaveAttribute('step', '0.01');
  await expect(zins).toHaveValue('0.98');
  await expect(page.locator('#vKredZins')).toHaveText('0,98 %');
  await expect(page.locator('#kredZinsTooltip')).toHaveAttribute(
    'data-tooltip',
    /Rechenannahme 0,98 Prozent effektiv.*Stand 24\.07\.2026.*Kein Kreditangebot/
  );
  await expect(page.locator('#kredZinsInfo')).toContainText(
    'Programm 358 Plus und 0,98 Prozent effektiv'
  );
  await expect(page.locator('#kredZinsInfo')).toContainText(
    'Programm 359 und 4,10 Prozent effektiv'
  );
  await expect(page.locator('#wzChip_kredZins')).toHaveText(
    'Rechenannahme KfW-Ergänzungskredit 358/359, Stand 24.07.2026'
  );

  await page.locator('#fEinkSlider').evaluate((element) => {
    /** @type {HTMLInputElement} */ (element).value = '100000';
    element.dispatchEvent(new window.Event('input', { bubbles: true }));
    element.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
  await expect(zins).toHaveValue('4.1');
  await expect(page.locator('#vKredZins')).toHaveText('4,10 %');

  await zins.evaluate((element) => {
    /** @type {HTMLInputElement} */ (element).value = '5.25';
    element.dispatchEvent(new window.Event('input', { bubbles: true }));
    element.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
  await expect(page.locator('#wzChip_kredZins')).toHaveText('Ihre Angabe');
  await page.locator('#fEinkSlider').evaluate((element) => {
    /** @type {HTMLInputElement} */ (element).value = '60000';
    element.dispatchEvent(new window.Event('input', { bubbles: true }));
    element.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
  await expect(zins).toHaveValue('5.25');
  await expect(page.locator('#vKredZins')).toHaveText('5,25 %');
});

test('Beratermodus überschreibt den Zins nicht bei Einkommensänderung', async ({ page }) => {
  await page.goto(`${baseURL}/kostenvergleich-waermepumpe?modus=berater`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForFunction(() => KV_STATE.bootstrap && KV_STATE.last);
  const zins = page.locator('#kredZins');
  await expect(zins).toHaveValue('0.98');
  await page.locator('#fEinkSlider').evaluate((element) => {
    /** @type {HTMLInputElement} */ (element).value = '100000';
    element.dispatchEvent(new window.Event('input', { bubbles: true }));
    element.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
  await expect(zins).toHaveValue('0.98');
});

test('Stand-Datum wird ausschließlich aus dem Bootstrap formatiert', async ({ page }) => {
  await page.route('**/api/rechner?action=kv_bootstrap**', (route) => {
    const payload = engine.kvBootstrapPayload(engine.KV_PARAMS_SEED);
    payload.kredit.stand = '2026-08-01';
    return route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify(payload),
    });
  });
  await page.goto(`${baseURL}/kostenvergleich-waermepumpe`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForFunction(() => KV_STATE.bootstrap && KV_STATE.last);
  await expect(page.locator('#kredZinsTooltip')).toHaveAttribute('data-tooltip', /01\.08\.2026/);
  await expect(page.locator('#kredZinsInfo')).toContainText('Stand 01.08.2026');
  await expect(page.locator('#wzChip_kredZins')).toContainText('Stand 01.08.2026');
});

test('Zinswerte und alte Zinsbegriffe stehen nicht im ausgelieferten Client', () => {
  const source = fs.readFileSync(path.join(root, 'kostenvergleich-waermepumpe.html'), 'utf8');
  expect(source).not.toMatch(/0\.98|4\.10|4,10|0,98|90000|24\.07\.2026|2026-07-24/);
  expect(source).not.toMatch(/kondition[a-zäöüß]*|nominal|sollzins/i);
  expect((source.match(/Rechenannahme/g) || []).length).toBeGreaterThanOrEqual(3);
});

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobil', width: 375, height: 812 },
]) {
  for (const theme of ['dark', 'light']) {
    test(`Welle 1 Rechner ${viewport.name} ${theme}`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      await page.setViewportSize(viewport);
      await page.goto(`${baseURL}/kostenvergleich-waermepumpe?theme=${theme}`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForFunction(() => document.body.classList.contains('wz-customer'));
      await expect(
        page.getByRole('heading', { name: 'Was dieser Rechner für dich macht' })
      ).toBeVisible();
      await expect(page.locator('.page-head .lead')).toContainText(
        'über 20 Jahre, den Zeitraum kannst du selbst anpassen'
      );
      await expect(page.locator('.page-head .lead')).not.toContainText('bis zu 25 Jahre');
      const deliveredScripts = (await page.locator('script').allTextContents()).join('\n');
      expect(deliveredScripts).toContain(
        "WZ_MARKET_LABELS.kredZins='Rechenannahme '+kredit.quelle"
      );
      expect(deliveredScripts).not.toContain("kredZins:'KfW-Kondition'");
      await expect(page.locator('#wzShell')).toBeVisible();
      await expect(page.locator('.nav-inner')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe(
        theme
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth
        )
      ).toBe(0);
      if (viewport.name === 'desktop') {
        await expect(page.locator('.nav-links')).toBeVisible();
        await expect(page.locator('.nav-links > a')).toHaveCount(8);
        const toggle = page.locator('.nav-links [data-theme-toggle]');
        await toggle.locator('.tt-feld', { hasText: theme === 'dark' ? 'Hell' : 'Dunkel' }).click();
        await expect(page.locator('html')).toHaveAttribute(
          'data-theme',
          theme === 'dark' ? 'light' : 'dark'
        );
        await toggle.locator('.tt-feld', { hasText: theme === 'dark' ? 'Dunkel' : 'Hell' }).click();
      } else {
        await expect(page.locator('#hamburger')).toBeVisible();
        await page.locator('#hamburger').click();
        await expect(page.locator('#mobileMenu')).toHaveClass(/open/);
        await expect(page.locator('#mobileMenu .mm-nav > a')).toHaveCount(6);
        const toggle = page.locator('#mobileMenu [data-theme-toggle]');
        await toggle.locator('.tt-feld', { hasText: theme === 'dark' ? 'Hell' : 'Dunkel' }).click();
        await expect(page.locator('html')).toHaveAttribute(
          'data-theme',
          theme === 'dark' ? 'light' : 'dark'
        );
        await toggle.locator('.tt-feld', { hasText: theme === 'dark' ? 'Dunkel' : 'Hell' }).click();
        await page.locator('#hamburger').click();
        const wizardTop = await page
          .locator('#wzShell')
          .evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
        const heights = await page.evaluate(() =>
          Object.fromEntries(
            ['nav', '.page-head', 'section[aria-labelledby="rechner-einleitung"]'].map(
              (selector) => [
                selector,
                Math.round(document.querySelector(selector).getBoundingClientRect().height),
              ]
            )
          )
        );
        console.log(`Wizardstart ${theme}: ${Math.round(wizardTop)} px`, heights);
        expect(wizardTop).toBeLessThan(900);
      }
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      expect(errors).toEqual([]);
      await page.screenshot({
        path: path.join(
          root,
          'reports',
          'wp-rechner-welle-1',
          `rechner-${viewport.name}-${theme}.png`
        ),
        fullPage: false,
      });
    });

    test(`Welle 1 Artikel ${viewport.name} ${theme}`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      await page.setViewportSize(viewport);
      await page.goto(`${baseURL}/amortisation-waermepumpe?theme=${theme}`, {
        waitUntil: 'domcontentloaded',
      });
      await expect(
        page.getByRole('heading', { name: 'Wann rechnet sich eine Wärmepumpe?', exact: true })
      ).toBeVisible();
      await expect(page.locator('a[href="/kostenvergleich-waermepumpe"]')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe(
        theme
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth
        )
      ).toBe(0);
      expect(errors).toEqual([]);
      await page.screenshot({
        path: path.join(
          root,
          'reports',
          'wp-rechner-welle-1',
          `artikel-${viewport.name}-${theme}.png`
        ),
        fullPage: false,
      });
    });
  }
}
