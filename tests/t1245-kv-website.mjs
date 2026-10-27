// Lokale Browserprobe: keine externen Anfragen, ausschließlich synthetische API-Eingaben.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { k, plain, base } from './t1245-kv-nutzen.mjs';
const root = process.cwd(),
  browser = await chromium.launch({ headless: true });
let blocked = 0,
  errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== 'http://t1245.local') {
      blocked++;
      return route.abort();
    }
    if (url.pathname.startsWith('/api/rechner')) {
      const q = Object.fromEntries(url.searchParams),
        action = q.action;
      if (action === 'kv_bootstrap') {
        const boot = plain(k.kvBootstrapPayload(k.KV_PARAMS_SEED));
        boot.defaults.startJahr = 2026;
        boot.aktivePeriode = 'h2-2026';
        return route.fulfill({ json: boot });
      }
      if (action === 'kostenvergleich') {
        const i = { ...plain(k.KV_DEFAULTS), startJahr: 2026 };
        for (const [key, v] of Object.entries(q)) {
          if (typeof i[key] === 'number') i[key] = Number(v);
          else if (typeof i[key] === 'boolean') i[key] = v === '1' || v === 'true';
          else i[key] = v;
        }
        try {
          return route.fulfill({ json: plain(k.kvCalculate(i, k.KV_PARAMS_SEED)) });
        } catch (e) {
          return route.fulfill({ json: { error: true, message: e.message } });
        }
      }
      return route.fulfill({ json: { service: action, freiePlaetze: 0, ready: true } });
    }
    let rel = decodeURIComponent(url.pathname).slice(1);
    if (!path.extname(rel)) rel += '.html';
    const file = path.resolve(root, rel);
    if (!file.startsWith(root + path.sep)) return route.abort();
    try {
      return route.fulfill({
        body: await fs.readFile(file),
        contentType:
          {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.svg': 'image/svg+xml',
            '.woff2': 'font/woff2',
          }[path.extname(file)] || 'application/octet-stream',
      });
    } catch {
      return route.fulfill({ status: 404, body: '' });
    }
  });
  await page.goto(
    'http://t1245.local/kostenvergleich-waermepumpe.html?geraet=5078&heizsystem=heizkoerper'
  );
  await page.waitForFunction(
    () =>
      window.KV_STATE?.last?.system?.jaz === 3.9 ||
      (typeof KV_STATE !== 'undefined' && KV_STATE.last?.system.jaz === 3.9)
  );
  assert.equal(await page.locator('#jaz').count(), 0);
  assert.equal(await page.locator('#heizsystem').inputValue(), 'heizkoerper');
  assert.equal(await page.locator('#geraet').inputValue(), '5078');
  assert.match(await page.locator('#jazGrundlagen').textContent(), /55\/45.*18.*50.*7 kW/);
  await page.evaluate(() => {
    document.querySelector('#heizsystem').value = 'fbh';
    document.querySelector('#heizsystem').dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForFunction(() => KV_STATE.last?.system.jaz === 4.51);
  await page.evaluate(() => {
    document.querySelector('#pvTog').checked = true;
    document.querySelector('#pvTog').dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForFunction(() => KV_STATE.last?.posten.pvSav > 0);
  assert.match(
    await page.locator('#pathSummary').textContent(),
    /Gas-Grundpreis.*Schornsteinfeger.*Gas-Netzentgeltpfad.*Modul-1-Vorteil.*Photovoltaik.*Bio-Mehrkosten/s
  );
  await page.evaluate(() => {
    document.querySelector('#netzentgeltTog').checked = true;
    document.querySelector('#netzentgeltTog').dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForFunction(() => document.body.textContent.includes('keine belegte Jahresreihe'));
  assert.equal(await page.evaluate(() => KV_STATE.last), null);
  assert.equal(await page.locator('#results.visible').count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    'GRÜN Browser T1245: Geräteübernahme, Heizsystem, unveränderliche JAZ, PV-Einzelposten und sichtbare Netzentgelt-Sperre; externe Anfragen abgefangen ' +
      blocked
  );
} finally {
  await browser.close();
}
