'use strict';
/* global document, window */

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
  baseURL = `http://127.0.0.1:${server.address().port}`;
});

test.afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test.beforeEach(async ({ page }) => {
  await page.route(/https:\/\/.*consentmanager\.net\//, (route) =>
    route.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: '' })
  );
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
        'über einen Zeitraum, den du selbst wählst, bis zu 25 Jahre'
      );
      await expect(page.locator('.page-head .lead')).not.toContainText('über 20 Jahre');
      const deliveredScripts = (await page.locator('script').allTextContents()).join('\n');
      expect(deliveredScripts).toContain("kredZins:'Rechenannahme'");
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
