#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOCAL_BASE = process.env.LOCAL_BASE || 'http://127.0.0.1:8088';
const TEST_ENDPOINT = process.env.TEST_ENDPOINT || 'https://www.herowerk.de/api/rechner-test.php';
const REFERER = 'https://www.herowerk.de/foerderung';
const OUTPUT_DIR = path.join(ROOT, 'reports', '2026-08-03_Rechenkern-PHP_Bilder');
const responseCache = new Map();
const responseHashes = new Map();

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

let pendingHold = null;

function holdNext(action) {
  let startedResolve;
  const started = new Promise((resolve) => {
    startedResolve = resolve;
  });
  pendingHold = { action, startedResolve, deadline: 0 };
  return started;
}

async function liveResponse(search) {
  if (responseCache.has(search)) return responseCache.get(search);
  const response = await fetch(`${TEST_ENDPOINT}?${search}`, {
    headers: { Referer: REFERER, Accept: 'application/json' },
    cache: 'no-store',
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Testpfad HTTP ${response.status}: ${body.slice(0, 180)}`);
  JSON.parse(body);
  const entry = {
    status: response.status,
    contentType: response.headers.get('content-type') || 'application/json; charset=utf-8',
    body,
  };
  responseCache.set(search, entry);
  responseHashes.set(search, crypto.createHash('sha256').update(body).digest('hex'));
  return entry;
}

async function installApiRoute(context) {
  await context.route('**/api/rechner*', async (route) => {
    const incoming = new URL(route.request().url());
    const action = incoming.searchParams.get('action') || 'health';
    const currentHold = pendingHold;
    if (currentHold && currentHold.action === action) {
      if (currentHold.deadline === 0) {
        currentHold.deadline = Date.now() + 3200;
        currentHold.startedResolve();
      }
      await new Promise((resolve) =>
        setTimeout(resolve, Math.max(0, currentHold.deadline - Date.now()))
      );
      if (pendingHold === currentHold) pendingHold = null;
    }
    const response = await liveResponse(incoming.searchParams.toString());
    await route.fulfill({
      status: response.status,
      contentType: response.contentType,
      headers: { 'Cache-Control': 'no-store' },
      body: response.body,
    });
  });
}

async function captureFoerderung(browser, theme, viewportName, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await installApiRoute(context);
  const page = await context.newPage();
  await page.goto(`${LOCAL_BASE}/foerderung.html?theme=${theme}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('#frPreis')?.textContent.includes('€'));
  await page.waitForTimeout(1200);

  const started = holdNext('foerderung');
  await page.evaluate(() => {
    void window.calculateFoerder();
  });
  await started;
  await page.waitForTimeout(2150);
  await page.locator('#foerderLangsamHinweis').waitFor({ state: 'visible' });
  await page.locator('#foerder .section-inner').screenshot({
    path: path.join(OUTPUT_DIR, `foerderung-${viewportName}-${theme}.png`),
    animations: 'allow',
  });
  await page.waitForFunction(
    () => document.querySelector('#foerderLangsamHinweis')?.hidden === true
  );
  await context.close();
}

async function captureKostenvergleich(browser, theme, viewportName, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await installApiRoute(context);
  const page = await context.newPage();
  await page.goto(`${LOCAL_BASE}/kostenvergleich-waermepumpe.html?theme=${theme}`, {
    waitUntil: 'networkidle',
  });
  await page.waitForFunction(
    () => typeof KV_STATE !== 'undefined' && KV_STATE.last?.service === 'kostenvergleich'
  );

  const started = holdNext('kostenvergleich');
  await page.evaluate(() => {
    void window.calculate({ showResults: true, scroll: false });
  });
  await started;
  await page.locator('#kvStatus').waitFor({ state: 'visible' });
  await page.locator('#kvStatus').scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -120));
  await page.screenshot({
    path: path.join(OUTPUT_DIR, `kostenvergleich-${viewportName}-${theme}.png`),
    animations: 'allow',
  });
  await page.waitForFunction(() => !document.body.classList.contains('kv-busy'));
  await context.close();
}

const browser = await chromium.launch();
try {
  const viewports = [
    ['schmal', { width: 390, height: 844 }],
    ['breit', { width: 1440, height: 1050 }],
  ];
  for (const [viewportName, viewport] of viewports) {
    for (const theme of ['hell', 'dunkel']) {
      const themeValue = theme === 'hell' ? 'light' : 'dark';
      await captureFoerderung(browser, themeValue, viewportName, viewport);
      await captureKostenvergleich(browser, themeValue, viewportName, viewport);
    }
  }
} finally {
  await browser.close();
}

const images = fs
  .readdirSync(OUTPUT_DIR)
  .filter((name) => name.endsWith('.png'))
  .sort()
  .map((name) => ({
    file: name,
    sha256: crypto
      .createHash('sha256')
      .update(fs.readFileSync(path.join(OUTPUT_DIR, name)))
      .digest('hex'),
  }));

fs.writeFileSync(
  path.join(OUTPUT_DIR, 'manifest.json'),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      localFrontend: LOCAL_BASE,
      apiUnderTest: TEST_ENDPOINT,
      validReferer: REFERER,
      frozenResponses: Object.fromEntries(responseHashes),
      images,
    },
    null,
    2
  )}\n`
);

console.log(`Bilder: ${images.length}`);
for (const image of images) console.log(`${image.file} ${image.sha256}`);
