'use strict';
/* global KV_STATE, Chart, Crypto, Storage, calculate, dataLayer, document, gtag, location, sessionStorage, window */

const { test, expect } = require('@playwright/test');
const http = require('http');
const fs = require('fs');
const path = require('path');
const engine = require('../apps-script/rechner-backend/kv_engine.gs');

test.describe.configure({ mode: 'serial' });

let server;
let baseURL;
let failCalculations = false;
const LANE_A_ROOT = process.env.LANE_A_ROOT || path.resolve(__dirname, '..', '..', 'wp-lane-a');

function bool(value, fallback) {
  if (value === null) return fallback;
  return ['1', 'true', 'ja'].includes(String(value).toLowerCase());
}

function mapInputs(query) {
  const out = { ...engine.KV_DEFAULTS };
  Object.keys(out).forEach((key) => {
    if (key === 'proklimaTog' || !query.has(key)) return;
    const current = out[key];
    if (typeof current === 'boolean') out[key] = bool(query.get(key), current);
    else if (typeof current === 'number') out[key] = Number(query.get(key));
    else out[key] = query.get(key);
  });
  out.proklimaTog = false;
  if (!engine.KV_PARAMS_SEED.perioden[out.fHalbjahr]) out.fHalbjahr = 'h2-2026';
  if (query.get('bedarfModus') === 'schaetzung') {
    out.bedarf = engine.kvSchaetzeBedarf(
      query.get('geb'),
      query.get('bj'),
      query.get('san'),
      Number(query.get('flaeche')),
      engine.KV_PARAMS_SEED
    );
  }
  return out;
}

function sendJson(response, value, status = 200) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(value));
}

test.beforeAll(async () => {
  server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (url.pathname === '/__fail-on') {
      failCalculations = true;
      return sendJson(response, { ok: true });
    }
    if (url.pathname === '/__fail-off') {
      failCalculations = false;
      return sendJson(response, { ok: true });
    }
    if (url.pathname === '/api/rechner') {
      const action = url.searchParams.get('action');
      if (action === 'kv_bootstrap') {
        const payload = engine.kvBootstrapPayload(engine.KV_PARAMS_SEED);
        payload.aktivePeriode = 'alt';
        return sendJson(response, payload);
      }
      if (action === 'kostenvergleich') {
        if (failCalculations) {
          return sendJson(response, { error: true, message: 'test_failure' }, 503);
        }
        const result = engine.kvCalculate(mapInputs(url.searchParams), engine.KV_PARAMS_SEED);
        result.periodeAutomatik = !url.searchParams.has('fHalbjahr');
        return sendJson(response, result);
      }
      if (action === 'preise') return sendJson(response, { wolf: [], vaillant: [] });
      return sendJson(response, { error: true, message: 'unknown_action' }, 400);
    }
    const relative =
      url.pathname === '/'
        ? 'kostenvergleich-waermepumpe.html'
        : decodeURIComponent(url.pathname.slice(1));
    const selectedRoot =
      relative === 'anfrage.html' && fs.existsSync(path.join(LANE_A_ROOT, 'anfrage.html'))
        ? LANE_A_ROOT
        : path.resolve(__dirname, '..');
    const file = path.resolve(selectedRoot, relative);
    const root = path.resolve(selectedRoot) + path.sep;
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      response.writeHead(404);
      return response.end('not found');
    }
    const type = file.endsWith('.html')
      ? 'text/html; charset=utf-8'
      : file.endsWith('.css')
        ? 'text/css'
        : file.endsWith('.js')
          ? 'text/javascript'
          : 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    if (relative === 'kostenvergleich-waermepumpe.html') {
      const html = fs
        .readFileSync(file, 'utf8')
        .replaceAll('https://www.herowerk.de/anfrage.html', '/anfrage.html');
      response.end(html);
      return;
    }
    fs.createReadStream(file).pipe(response);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseURL = `http://127.0.0.1:${/** @type {import('net').AddressInfo} */ (server.address()).port}`;
});

test.afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function installLocalConsent(page) {
  await page.route('https://cdn.consentmanager.net/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/javascript; charset=utf-8',
      body: `document.addEventListener('DOMContentLoaded',function(){
        var box=document.createElement('div');box.id='cmpbox';box.setAttribute('role','dialog');box.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center';
        var card=document.createElement('div');card.style.cssText='background:#fff;color:#1C2B36;padding:24px;border-radius:12px;max-width:320px';card.innerHTML='<p>Lokaler Test-Consent</p><button type="button" id="cmpwelcomebtnyes">Alle akzeptieren</button>';box.appendChild(card);document.body.appendChild(box);
        document.getElementById('cmpwelcomebtnyes').addEventListener('click',function(){box.remove();});
      });`,
    });
  });
}

function collectErrors(page) {
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  return { consoleErrors, pageErrors };
}

async function acceptConsent(page) {
  const box = page.locator('#cmpbox');
  await expect(box).toBeVisible();
  await page.getByRole('button', { name: 'Alle akzeptieren' }).click();
  await expect(box).toHaveCount(0);
}

async function clickTab(page, name) {
  const tab = page.locator('.tab-btn', { hasText: name });
  await tab.scrollIntoViewIfNeeded();
  await tab.click();
}

async function clickToggle(page, id, checked) {
  const input = page.locator(`#${id}`);
  const slider = page.locator(`#${id} + .sl`);
  await slider.scrollIntoViewIfNeeded();
  await slider.click();
  if (checked) await expect(input).toBeChecked();
  else await expect(input).not.toBeChecked();
}

async function rangeToEnd(page, id) {
  const control = page.locator(`#${id}`);
  await control.scrollIntoViewIfNeeded();
  await control.click();
  await control.press('End');
}

async function rangeFromStart(page, id, steps) {
  const control = page.locator(`#${id}`);
  await control.scrollIntoViewIfNeeded();
  await control.click();
  await control.press('Home');
  for (let index = 0; index < steps; index += 1) await control.press('ArrowRight');
}

async function nextWizardStep(page) {
  const next = page.locator('#wzNext');
  await next.scrollIntoViewIfNeeded();
  await next.click();
}

async function chart2Labels(page) {
  return page.evaluate(() =>
    Chart.getChart('cBreak').data.datasets.map((dataset) => dataset.label)
  );
}

test('O3 Contract: Source, Bootstrap und serverseitige Periodeneigenschaft', async () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '..', 'kostenvergleich-waermepumpe.html'),
    'utf8'
  );
  for (const forbidden of [
    'FOERDER_HJ',
    'WZ_SPEZ',
    'WZ_STUFEN',
    'WZ_GEBF',
    'ETA_NEU',
    'findPathValue',
    'findKpiValue',
    'findDreiWegeTotal',
  ]) {
    expect(source).not.toContain(forbidden);
  }
  expect((source.match(/80 %|80 Prozent/g) || []).length).toBe(7); // fünf Förderung + zwei Wirkungsgrad
  expect((source.match(/href="#foerder-80-hinweis"/g) || []).length).toBe(5);
  expect(source).not.toContain("inputsEcho.fHalbjahr!=='h2-2026'");

  const bootstrap = await fetch(`${baseURL}/api/rechner?action=kv_bootstrap`);
  const bootstrapText = await bootstrap.text();
  expect(bootstrapText).not.toMatch(/proklima/i);
  const alt = engine.kvCalculate(
    { ...engine.KV_DEFAULTS, fHalbjahr: 'alt', proklimaTog: false },
    engine.KV_PARAMS_SEED
  );
  const h22026 = engine.kvCalculate(
    { ...engine.KV_DEFAULTS, fHalbjahr: 'h2-2026', proklimaTog: false },
    engine.KV_PARAMS_SEED
  );
  const h12027 = engine.kvCalculate(
    { ...engine.KV_DEFAULTS, fHalbjahr: 'h1-2027', proklimaTog: false },
    engine.KV_PARAMS_SEED
  );
  expect(alt.foerder.euDifferenzierung).toBe(false);
  expect(h22026.foerder.euDifferenzierung).toBe(false);
  expect(h12027.foerder.euDifferenzierung).toBe(true);

  const estimated = await fetch(
    `${baseURL}/api/rechner?action=kostenvergleich&bedarfModus=schaetzung&geb=efh&bj=1978-1994&san=teilweise&flaeche=140&fHalbjahr=h2-2026`
  );
  const estimatedJson = await estimated.json();
  expect(estimatedJson.inputsEcho.bedarf).toBe(
    engine.kvSchaetzeBedarf('efh', '1978-1994', 'teilweise', 140, engine.KV_PARAMS_SEED)
  );
});

test('O3 Berater Dark 375: Render-Contract, Schalterpfade, Vorzeichen und Retry', async ({
  page,
}) => {
  await installLocalConsent(page);
  const dark = collectErrors(page);

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${baseURL}/kostenvergleich-waermepumpe.html?modus=berater&theme=dark`, {
    waitUntil: 'domcontentloaded',
  });
  await acceptConsent(page);
  await page.waitForFunction(
    () =>
      typeof KV_STATE !== 'undefined' &&
      KV_STATE.last &&
      KV_STATE.last.service === 'kostenvergleich'
  );
  expect(await page.locator('#fHalbjahr').inputValue()).toBe('alt');
  expect(await page.evaluate(() => KV_STATE.last.foerder.periode)).toBe('alt');
  await clickTab(page, 'Förderung');
  await page.locator('#fHalbjahr').selectOption('h2-2026');
  await page.waitForFunction(() => KV_STATE.last && KV_STATE.last.foerder.periode === 'h2-2026');
  await page.locator('.btn-calc').click();
  await expect(page.locator('#results')).toHaveClass(/visible/);
  await expect(page.locator('#pathSummary')).toContainText('17.120 €');
  await expect(page.locator('#pathSummary')).toContainText('5.120 €');
  await expect(page.locator('#kpiGrid')).toContainText('Jahr 6');
  await expect(page.locator('#pathSummary')).toContainText('45.389 €');
  await expect(page.locator('#dreiWegeBox')).toContainText('45.389 €');
  await expect(
    page.getByRole('region', { name: 'Drei-Wege-Kostenvergleich, horizontal scrollbar' })
  ).toBeVisible();
  await expect(page.locator('#sensiBox')).toContainText('45.389 €');
  expect(await page.evaluate(() => Math.round(KV_STATE.last.ergebnis.wpNG))).toBe(45389);
  expect(await page.locator('#kpiGrid .ml').allTextContents()).toEqual([
    'Anschaffung nach Förderung',
    'Mehrpreis gegenüber neuer Gasheizung',
    'Ausgeglichen ab',
    'Einsparung 20 J.',
    'CO₂ eingespart',
  ]);
  await expect(page.locator('#cashflowBox')).toBeHidden();
  await expect(page.locator('#immoBox')).toBeHidden();
  expect(await chart2Labels(page)).toEqual([
    'Energie und CO₂',
    'Bio-Aufschlag',
    'Wartungsdifferenz',
  ]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    )
  ).toBe(0);
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe(
    'dark'
  );

  await clickTab(page, 'Energie');
  await clickToggle(page, 'bioTog', false);
  await page.waitForFunction(() => KV_STATE.last && KV_STATE.last.system.bioOn === false);
  expect(await chart2Labels(page)).toEqual(['Energie und CO₂', 'Wartungsdifferenz']);
  await clickTab(page, 'Extras');
  await clickToggle(page, 'dynTarifTog', true);
  await page.waitForFunction(() => KV_STATE.last && KV_STATE.last.dynTarif.aktiv === true);
  expect(await chart2Labels(page)).toEqual([
    'Energie und CO₂',
    'Dynamischer Tarif',
    'Wartungsdifferenz',
  ]);
  await expect(page.locator('#kpiGrid .ml', { hasText: 'Dyn. Tarif Ersparnis/J.' })).toHaveCount(1);
  await clickTab(page, 'Energie');
  await clickToggle(page, 'bioTog', true);
  await page.waitForFunction(() => KV_STATE.last && KV_STATE.last.system.bioOn === true);
  expect(await chart2Labels(page)).toEqual([
    'Energie und CO₂',
    'Dynamischer Tarif',
    'Bio-Aufschlag',
    'Wartungsdifferenz',
  ]);
  await clickTab(page, 'Extras');
  await clickToggle(page, 'dynTarifTog', false);
  await page.waitForFunction(() => KV_STATE.last && KV_STATE.last.dynTarif.aktiv === false);
  expect(await chart2Labels(page)).toEqual([
    'Energie und CO₂',
    'Bio-Aufschlag',
    'Wartungsdifferenz',
  ]);

  await clickToggle(page, 'immoTog', true);
  await page.waitForFunction(() => KV_STATE.last && KV_STATE.last.immo.aktiv === true);
  await expect(page.locator('#immoBox')).toBeVisible();
  await expect(page.locator('#kpiGrid .ml', { hasText: 'Immobilien-Wertzuwachs' })).toHaveCount(1);

  await clickTab(page, 'Finanzierung');
  await clickToggle(page, 'finanzTog', true);
  await page.waitForFunction(() => KV_STATE.last && KV_STATE.last.finanzierung.aktiv === true);
  await expect(page.locator('#cashflowBox')).toBeVisible();
  await expect(
    page.locator('#kpiGrid .ml', { hasText: 'Monatl. Vorteil (finanziert)' })
  ).toHaveCount(1);
  await rangeFromStart(page, 'kredZins', 0);
  await page.waitForFunction(() => KV_STATE.last && KV_STATE.last.inputsEcho.kredZins === 0);
  await expect(page.locator('#vKredZins')).toHaveText('0,00 %');
  const monRateNull = await page.evaluate(() => KV_STATE.last.finanzierung.monRate);
  await expect(page.locator('#cashflowBox')).toContainText(
    `${Math.round(monRateNull).toLocaleString('de-DE')} € Rate`
  );
  await rangeToEnd(page, 'kredZins');
  await page.waitForFunction(() => KV_STATE.last && KV_STATE.last.inputsEcho.kredZins === 9);
  await expect(page.locator('#vKredZins')).toHaveText('9,00 %');
  const monRateNeun = await page.evaluate(() => KV_STATE.last.finanzierung.monRate);
  await expect(page.locator('#cashflowBox')).toContainText(
    `${Math.round(monRateNeun).toLocaleString('de-DE')} € Rate`
  );
  expect(monRateNeun).toBeGreaterThan(monRateNull);
  console.log(
    `Monatsrate am Zinsregler: 0,0 % = ${monRateNull.toFixed(2)} €, 9,0 % = ${monRateNeun.toFixed(2)} €`
  );
  await page.locator('#kredZins').evaluate((element) => {
    /** @type {HTMLInputElement} */ (element).value = '0.7';
    element.dispatchEvent(new window.Event('input', { bubbles: true }));
    element.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
  await page.waitForFunction(() => KV_STATE.last && KV_STATE.last.inputsEcho.kredZins === 0.7);

  await clickTab(page, 'Ihre Situation');
  await rangeToEnd(page, 'invWP');
  await page.waitForFunction(() => KV_STATE.last && KV_STATE.last.inputsEcho.invWP === 65000);
  await expect(
    page
      .locator('#kpiGrid .ml', { hasText: 'Monatl. Vorteil (finanziert)' })
      .locator('..')
      .locator('.mv')
  ).toHaveText('−295 €/Mo.');
  await rangeFromStart(page, 'invWP', 8);
  await page.waitForFunction(() => KV_STATE.last && KV_STATE.last.inputsEcho.invWP === 12000);
  await expect(
    page
      .locator('#kpiGrid .ml', { hasText: 'Mehrpreis gegenüber neuer Gasheizung' })
      .locator('..')
      .locator('.mv')
  ).toHaveText('−5.520 €');

  await rangeToEnd(page, 'invWP');
  await page.waitForFunction(() => KV_STATE.last && KV_STATE.last.inputsEcho.invWP === 65000);
  await clickToggle(page, 'neuFossilTog', false);
  await page.waitForFunction(() => KV_STATE.last && KV_STATE.last.dreiWege.aktiv === false);
  await expect(page.locator('#dreiWegeBox')).toBeHidden();
  await expect(page.locator('#pathSummary')).toContainText('Ihr Vorteil (Barzahlung)');
  await expect(page.locator('#pathSummary')).not.toContainText('Anschaffung Neue Gasheizung');
  await expect(page.locator('#pathSummary')).not.toContainText('Echter Mehrpreis');
  await expect(page.locator('#kpiGrid .ml', { hasText: 'Mehrpreis gegenüber' })).toHaveCount(0);
  await expect(
    page
      .locator('#kpiGrid .ml', { hasText: 'Monatl. Cashflow (1. J.)' })
      .locator('..')
      .locator('.mv')
  ).toHaveText('−377 €/Mo.');

  await clickTab(page, 'Finanzierung');
  await clickToggle(page, 'finanzTog', false);
  await page.waitForFunction(() => KV_STATE.last && KV_STATE.last.finanzierung.aktiv === false);
  await expect(page.locator('#cashflowBox')).toBeHidden();
  await expect(page.locator('#kpiGrid .ml', { hasText: /Monatl\./ })).toHaveCount(0);

  await fetch(`${baseURL}/__fail-on`);
  await clickTab(page, 'Ihre Situation');
  await page.locator('.btn-calc').click();
  await expect(page.locator('#kvRetry')).toBeVisible();
  await fetch(`${baseURL}/__fail-off`);
  await page.locator('#kvRetry').click();
  await expect(page.locator('#kvRetry')).toHaveCount(0);
  expect(dark.pageErrors).toEqual([]);
  expect(
    dark.consoleErrors.filter((message) => !/503|Failed to load resource/i.test(message))
  ).toEqual([]);
});

test('O3 Kunde Light 375: lokaler Consent, Alt-/EU-Text, fünf Förderanker und Vollflow', async ({
  page,
}) => {
  await installLocalConsent(page);
  await page.addInitScript(() => {
    Object.defineProperty(Crypto.prototype, 'randomUUID', {
      configurable: true,
      value() {
        throw new Error('uuid_test_failure');
      },
    });
  });
  const light = collectErrors(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${baseURL}/kostenvergleich-waermepumpe.html?theme=light`, {
    waitUntil: 'domcontentloaded',
  });
  await acceptConsent(page);
  await page.evaluate(() => gtag('consent', 'update', { analytics_storage: 'granted' }));
  await page.waitForFunction(() => typeof KV_STATE !== 'undefined' && KV_STATE.last);
  expect(await page.evaluate(() => sessionStorage.getItem('hero_kv_sitzung'))).toMatch(
    /^[a-z0-9]+-[a-z0-9]+$/
  );
  await expect(page.locator('body')).toHaveClass(/wz-customer/);
  await page.locator('[data-wz-heizart="gas"]').click();
  await page.locator('[data-wz-grp="vmode"][data-wz-val="known"]').click();
  await page.locator('[data-wz-grp="altgas"][data-wz-val="ja"]').click();
  await nextWizardStep(page);
  await nextWizardStep(page);
  await expect(page.locator('#wzFoerderAufbau')).toContainText(
    'Grundförderung: bekommt jeder Heizungstausch'
  );
  await expect(page.locator('#wzFoerderAufbau')).not.toContainText('EU-Gerät');
  await page.locator('#fHalbjahr').selectOption('h1-2027');
  await page.waitForFunction(
    () =>
      KV_STATE.last &&
      KV_STATE.last.foerder.periode === 'h1-2027' &&
      KV_STATE.last.foerder.euDifferenzierung === true
  );
  await expect(page.locator('#wzFoerderAufbau')).toContainText('Ihr EU-Gerät bekommt 15 % zurück');
  await page.locator('#fHalbjahr').selectOption('h2-2026');
  await page.waitForFunction(() => KV_STATE.last && KV_STATE.last.foerder.periode === 'h2-2026');
  await expect(page.locator('#wzFoerderAufbau')).toContainText(
    'Grundförderung: bekommt jeder Heizungstausch'
  );
  await expect(page.locator('#wzFoerderAufbau')).not.toContainText('EU-Gerät');
  await rangeFromStart(page, 'fEinkSlider', 10);
  await page.waitForFunction(() => KV_STATE.last && KV_STATE.last.foerder.quote === 80);
  await expect(page.locator('#fQuote a[href="#foerder-80-hinweis"]')).toHaveCount(1);
  await expect(page.locator('#wzLiveFoerder a[href="#foerder-80-hinweis"]')).toHaveCount(1);
  await expect(page.locator('a[href="#foerder-80-hinweis"]')).toHaveCount(5);

  await nextWizardStep(page);
  await nextWizardStep(page);
  await expect(page.locator('#wzHero')).toBeVisible();
  await expect(page.locator('#results')).toHaveClass(/visible/);
  const directEvents = await page.evaluate(() =>
    dataLayer
      .filter((entry) => entry && entry[0] === 'event')
      .map((entry) => ({ name: entry[1], parameters: entry[2] || {} }))
  );
  expect(directEvents.map((event) => event.name)).toEqual(
    expect.arrayContaining([
      'rechner_start',
      'wz_step_view',
      'wz_step_complete',
      'wz_zeitraum_gewechselt',
      'wz_ergebnis_erreicht',
    ])
  );
  const directResult = directEvents.find((event) => event.name === 'wz_ergebnis_erreicht');
  expect(directResult.parameters.verbrauch_herkunft).toBe('eingabe');
  expect(Object.keys(directResult.parameters).sort()).toEqual([
    'eigenanteil_ohne_einkommen',
    'quote_ohne_einkommen',
    'verbrauch_herkunft',
  ]);
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe(
    'light'
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    )
  ).toBe(0);
  expect(light.consoleErrors).toEqual([]);
  expect(light.pageErrors).toEqual([]);
});

test('O8 Bootstrap markiert eta nicht als Nutzerangabe und die Kesselmatrix greift', async ({
  page,
}) => {
  await installLocalConsent(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${baseURL}/kostenvergleich-waermepumpe.html?theme=dark`, {
    waitUntil: 'domcontentloaded',
  });
  await acceptConsent(page);
  await page.waitForFunction(() => typeof KV_STATE !== 'undefined' && KV_STATE.last);
  await expect(page.locator('#wzChip_eta')).not.toHaveText('Ihre Angabe');

  const select = async (group, value) =>
    page.locator(`[data-wz-grp="${group}"][data-wz-val="${value}"]`).click();
  const expectEta = async (value) => {
    await expect.poll(async () => Number(await page.locator('#eta').inputValue())).toBe(value);
  };
  await page.locator('[data-wz-heizart="gas"]').click();
  await select('vmode', 'known');
  await select('altgas', 'ja');

  const cases = [
    ['metall', 'vor1990', 70, 70],
    ['metall', '1990-2010', 80, 80],
    ['kunststoff', '1990-2010', 86, 90],
    ['kunststoff', 'nach2010', 93, 93],
    ['unklar', null, 85, 85],
  ];
  for (const [rohr, baujahr, gas, oel] of cases) {
    await select('rohr', rohr);
    if (baujahr) await select('kbj', baujahr);
    await expectEta(gas);
    await expect(page.locator('#wzChip_eta')).not.toHaveText('Ihre Angabe');
    await expect(page.locator('#etaHerkunft')).toContainText('Stand 15.07.2026');
    await expect(page.locator('#etaHerkunft')).toContainText('Verbraucherzentrale NRW 2020');
    await page.locator('[data-wz-heizart="oel"]').click();
    await expectEta(oel);
    await expect(page.locator('#etaHerkunft')).toContainText('Stand 15.07.2026');
    await expect(page.locator('#etaHerkunft')).toContainText('Verbraucherzentrale NRW 2020');
    await page.locator('[data-wz-heizart="gas"]').click();
    await expectEta(gas);
  }

  await page.locator('#eta').evaluate((element) => {
    /** @type {HTMLInputElement} */ (element).value = '77';
    element.dispatchEvent(new window.Event('input', { bubbles: true }));
    element.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
  await expect(page.locator('#wzChip_eta')).toHaveText('Ihre Angabe');
  await select('rohr', 'metall');
  await select('kbj', 'vor1990');
  await expectEta(77);
  await expect(page.locator('#etaHerkunft')).toContainText('selbst eingestellt');
});

function recursiveKeys(value, found = []) {
  if (!value || typeof value !== 'object') return found;
  Object.entries(value).forEach(([key, nested]) => {
    found.push(key);
    recursiveKeys(nested, found);
  });
  return found;
}

test('O4 Writer: jeder Anfrage-CTA schreibt ausschließlich das v1-Contract-Schema', async ({
  page,
}) => {
  await installLocalConsent(page);
  await page.goto(`${baseURL}/kostenvergleich-waermepumpe.html?theme=dark`, {
    waitUntil: 'domcontentloaded',
  });
  await acceptConsent(page);
  await page.waitForFunction(() => typeof KV_STATE !== 'undefined' && KV_STATE.last);
  await page.locator('[data-wz-heizart="gas"]').click();
  await page.locator('[data-wz-grp="vmode"][data-wz-val="unknown"]').click();
  await page.locator('[data-wz-grp="geb"][data-wz-val="efh"]').click();
  await page.locator('[data-wz-grp="bj"][data-wz-val="1978-1994"]').click();
  await page.locator('[data-wz-grp="san"][data-wz-val="teilweise"]').click();
  await page.waitForFunction(
    () => window.WZ_BRIDGE && KV_STATE.last && KV_STATE.last.inputsEcho.bedarf
  );
  await page.locator('[data-wz-grp="altgas"][data-wz-val="ja"]').click();
  await page.locator('[data-wz-grp="rohr"][data-wz-val="kunststoff"]').click();
  await page.locator('[data-wz-grp="kbj"][data-wz-val="1990-2010"]').click();

  await page.evaluate(() =>
    document.addEventListener('click', (event) => {
      const el = /** @type {Element} */ (event.target);
      const link = el.closest && el.closest('a[href]');
      if (
        link &&
        new URL(/** @type {HTMLAnchorElement} */ (link).href, location.href).pathname.replace(
          /\.html$/,
          ''
        ) === '/anfrage'
      )
        event.preventDefault();
    })
  );
  async function expectWriterPayload(cta) {
    await page.evaluate(() => sessionStorage.removeItem('hero_kv_lead'));
    await cta.click({ force: true });
    const payload = await page.evaluate(() => JSON.parse(sessionStorage.getItem('hero_kv_lead')));
    expect(Object.keys(payload).sort()).toEqual([
      'ergebnis',
      'gebaeude',
      'heizungsart',
      'kessel',
      'quelle',
      'v',
      'verbrauch',
      'zeitpunkt',
      'zeitraum',
    ]);
    expect(Object.keys(payload.verbrauch).sort()).toEqual([
      'eingabeWert',
      'einheit',
      'herkunft',
      'kwh',
    ]);
    expect(Object.keys(payload.gebaeude).sort()).toEqual(['bj', 'flaeche', 'geb', 'san']);
    expect(Object.keys(payload.kessel).sort()).toEqual(['altgas', 'kbj', 'rohr']);
    expect(Object.keys(payload.ergebnis).sort()).toEqual(['eigenanteil', 'quote', 'zuschuss']);
    const response = await page.evaluate(() => KV_STATE.last);
    expect(payload.ergebnis).toEqual({
      eigenanteil: response.foerder.eigenanteilOhneEinkommen,
      zuschuss: response.foerder.zuschussOhneEinkommen,
      quote: response.foerder.quoteOhneEinkommen,
    });
    expect(payload.verbrauch.herkunft).toBe('market');
    expect(payload.gebaeude).toEqual({
      geb: 'efh',
      bj: '1978-1994',
      san: 'teilweise',
      flaeche: 140,
    });
    const forbidden = /eink|kind|proklima|zve|name|adresse|mail|telefon|phone|ip|plz/i;
    expect(recursiveKeys(payload).filter((key) => forbidden.test(key))).toEqual([]);
    expect(JSON.stringify(payload)).not.toMatch(/example@|\+49|30159/);
    expect(new URL(page.url()).searchParams.has('hero_kv_lead')).toBe(false);
    expect(new URL(page.url()).hash).toBe('');
  }
  await page.setViewportSize({ width: 1200, height: 812 });
  await page.evaluate(() => {
    window.__kvLastForO4Test = KV_STATE.last;
    KV_STATE.last = null;
    sessionStorage.setItem('hero_kv_lead', '{"stale":true}');
  });
  await page.locator('nav a.nav-cta[href="/anfrage"]').first().click();
  expect(await page.evaluate(() => sessionStorage.getItem('hero_kv_lead'))).toBeNull();
  await page.evaluate(() => {
    KV_STATE.last = window.__kvLastForO4Test;
  });
  await expectWriterPayload(page.locator('nav a.nav-cta[href="/anfrage"]').first());
  await expectWriterPayload(page.locator('#wzStickyCta a[href="/anfrage.html"]'));
  await page.setViewportSize({ width: 375, height: 812 });
  await nextWizardStep(page);
  await expectWriterPayload(page.locator('#wzBottomCta a[href="/anfrage.html"]'));

  await nextWizardStep(page);
  await expectWriterPayload(page.locator('#wzIncomeDiscreet a[href="/anfrage.html"]'));

  await nextWizardStep(page);
  await nextWizardStep(page);
  await page.waitForFunction(() => document.querySelector('#wzResultCta a[href="/anfrage.html"]'));
  const estimatedResult = await page.evaluate(() =>
    dataLayer
      .filter((entry) => entry && entry[0] === 'event' && entry[1] === 'wz_ergebnis_erreicht')
      .at(-1)
  );
  expect(estimatedResult[2].verbrauch_herkunft).toBe('schaetzung');
  await expectWriterPayload(page.locator('#wzResultCta a[href="/anfrage.html"]'));

  await fetch(`${baseURL}/__fail-on`);
  await page.evaluate(() => calculate({ showResults: true, scroll: false }));
  await expect(page.locator('#kvStatus a[href="/anfrage.html"]')).toHaveCount(1);
  await expectWriterPayload(page.locator('#kvStatus a[href="/anfrage.html"]'));
  await fetch(`${baseURL}/__fail-off`);
});

test('O4 Writer fail-safe: setItem-Fehler löscht gültigen stale Key vor der Navigation', async ({
  page,
}) => {
  test.skip(
    !fs.existsSync(path.join(LANE_A_ROOT, 'anfrage.html')),
    'Lane-A-Worktree für Cross-E2E fehlt'
  );
  await installLocalConsent(page);
  await page.setViewportSize({ width: 1200, height: 812 });
  await page.goto(`${baseURL}/kostenvergleich-waermepumpe.html?theme=dark`, {
    waitUntil: 'domcontentloaded',
  });
  await acceptConsent(page);
  await page.waitForFunction(
    () =>
      typeof KV_STATE !== 'undefined' &&
      KV_STATE.last &&
      typeof KV_STATE.last.foerder.quoteOhneEinkommen === 'number'
  );
  await page.evaluate(() => {
    const stale = {
      v: 1,
      quelle: 'kostenvergleich-waermepumpe',
      zeitpunkt: '2026-07-15T20:00:00.000Z',
      heizungsart: 'oel',
      verbrauch: { kwh: 30000, eingabeWert: 3000, einheit: 'liter', herkunft: 'own' },
      gebaeude: null,
      kessel: { rohr: 'metall', kbj: 'vor1990', altgas: null },
      zeitraum: 'h2-2026',
      ergebnis: { eigenanteil: 17120, zuschuss: 12880, quote: 46 },
    };
    sessionStorage.setItem('hero_kv_lead', JSON.stringify(stale));
    const nativeSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (this === sessionStorage && key === 'hero_kv_lead')
        throw new Error('test_setitem_blocked');
      return nativeSetItem.call(this, key, value);
    };
  });
  await expect(page.locator('#wzStickyCta a[href="/anfrage.html"]')).toBeVisible();
  await Promise.all([
    page.waitForURL(`${baseURL}/anfrage.html`, { waitUntil: 'domcontentloaded' }),
    page.locator('#wzStickyCta a[href="/anfrage.html"]').click(),
  ]);
  await expect(page.locator('#leadHandoffBanner')).toHaveCount(0);
  await expect(page.locator('.step.active')).toHaveAttribute('data-step', '0');
  expect(await page.evaluate(() => sessionStorage.getItem('hero_kv_lead'))).toBeNull();
});

test('O4 Cross-Worktree E2E: echter CTA-Klick mit Key und direkter Aufruf ohne Key', async ({
  page,
}) => {
  test.skip(
    !fs.existsSync(path.join(LANE_A_ROOT, 'anfrage.html')),
    'Lane-A-Worktree für Cross-E2E fehlt'
  );
  await installLocalConsent(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${baseURL}/kostenvergleich-waermepumpe.html?theme=dark`, {
    waitUntil: 'domcontentloaded',
  });
  await acceptConsent(page);
  await page.waitForFunction(() => typeof KV_STATE !== 'undefined' && KV_STATE.last);
  await page.setViewportSize({ width: 1200, height: 812 });
  await Promise.all([
    page.waitForURL(`${baseURL}/anfrage.html`, { waitUntil: 'domcontentloaded' }),
    page.locator('#wzStickyCta a[href="/anfrage.html"]').click(),
  ]);
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.locator('#leadHandoffBanner')).toContainText(
    'ohne deine Einkommensangabe gerechnet'
  );
  await expect(page.locator('#leadHandoffBanner')).toContainText(
    'Quelle: Kostenvergleich Wärmepumpe.'
  );
  expect(await page.evaluate(() => sessionStorage.getItem('hero_kv_lead'))).toBeNull();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    )
  ).toBe(0);

  await page.goto(`${baseURL}/anfrage.html`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#leadHandoffBanner')).toHaveCount(0);
  await expect(page.locator('.step.active')).toHaveAttribute('data-step', '0');
});
