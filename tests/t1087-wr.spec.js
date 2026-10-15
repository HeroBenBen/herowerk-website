'use strict';
/* global document, window, getComputedStyle */
const { test, expect, chromium, webkit } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { base, root, responses, serve } = require('./t1087-wr.cjs');
const payloads = [
  'A&#45;11',
  'A<span>-</span>11',
  'Heizleistung <12 kW bei A<span>&minus;</span>11/W55',
];
let server;
test.beforeAll(async () => {
  server = await serve(process.env.WR_REF || '');
});
test.afterAll(async () => {
  await server.close();
});
async function setup(browserType, width) {
  const browser = await browserType.launch();
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const state = { data: responses(), priceFailure: '' };
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== '127.0.0.1') return route.abort();
    if (url.pathname.startsWith('/api/rechner')) {
      const action = url.searchParams.get('action');
      if (action === 'preise' && state.priceFailure) {
        if (state.priceFailure === 'network') return route.abort();
        if (state.priceFailure === 'http')
          return route.fulfill({ status: 503, json: { error: true } });
        if (state.priceFailure === 'invalid') return route.fulfill({ json: { wolf: [] } });
        if (state.priceFailure === 'empty')
          return route.fulfill({ json: { wolf: [], vaillant: [] } });
      }
      return route.fulfill({ json: state.data[action] || {} });
    }
    return route.continue();
  });
  return { browser, page, state, errors };
}
async function screenshot(page, name, testInfo) {
  const folder = path.join(root, 'artifacts/tafel-sicht/wr', process.env.WR_REF ? 'rot' : 'gruen');
  fs.mkdirSync(folder, { recursive: true });
  const file = path.join(folder, name + '.png');
  await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
  await testInfo.attach(name, { path: file, contentType: 'image/png' });
}
for (const [name, type] of Object.entries({ chromium, webkit }))
  for (const width of [375, 1440]) {
    const label = name + '-' + width;
    test('@smoke WR 1–6 ' + label, async ({}, testInfo) => {
      test.setTimeout(120000);
      const { browser, page, state, errors } = await setup(type, width);
      try {
        await page.goto(server.url + '/foerderung.html');
        await page.evaluate('paLoadData()');
        for (const klasse of ['s', 'm', 'l', 'xl', 'xxl']) {
          await page.evaluate(
            (k) => window.eval('foerderSelectPackage("vaillant",' + JSON.stringify(k) + ')'),
            klasse
          );
          const field = await page.locator('#foerderWpTyp').evaluate((select) => {
            const style = getComputedStyle(select),
              rect = select.getBoundingClientRect();
            const overlay = document.querySelector('.foerder-package-label');
            const visibleOverlay = overlay && getComputedStyle(overlay).display !== 'none';
            const canvas = document.createElement('canvas'),
              ctx = canvas.getContext('2d');
            ctx.font = style.font;
            return {
              value: select.value,
              text: select.selectedOptions[0].textContent,
              overlay: visibleOverlay ? overlay.textContent : null,
              fits: visibleOverlay
                ? overlay.scrollWidth <= overlay.clientWidth &&
                  overlay.getBoundingClientRect().height <= rect.height
                : ctx.measureText(select.selectedOptions[0].textContent).width <=
                  rect.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 20,
            };
          });
          if (width === 375)
            expect.soft(field.fits, 'P1 ' + klasse + ': ' + JSON.stringify(field)).toBe(true);
          if (field.overlay) expect.soft(field.overlay.replace(/\s+/g, ' ')).toBe(field.text);
          if (klasse === 's' || klasse === 'xxl')
            await screenshot(page, label + '-foerder-' + klasse, testInfo);
        }
        await page.evaluate('foerderSelectPackage("wolf","m")');
        await screenshot(page, label + '-foerder-wolf', testInfo);
        await page.goto(server.url + '/preise.html');
        await page.evaluate('paLoadData()');
        const metrics = [];
        for (const brand of ['wolf', 'vaillant', 'wolf']) {
          await page.evaluate(
            (b) => window.eval('paSelectManufacturer(' + JSON.stringify(b) + ')'),
            brand
          );
          expect
            .soft(await page.locator('#wolfPricePanel').getAttribute('aria-labelledby'), 'P4')
            .toBe(brand === 'wolf' ? 'manufacturerWolf' : 'manufacturerVaillant');
          for (let i = 0; i < 5; i++) {
            await page.evaluate((i) => window.eval('paOpenIdx=-1;paZoom(' + i + ')'), i);
            await page.waitForTimeout(500);
            const m = await page.evaluate(() => {
              const panel = document.getElementById('paDetail'),
                r = panel.getBoundingClientRect();
              const arrow = document.getElementById('paDetailArrow'),
                saved = arrow.style.display;
              const overflow = panel.scrollWidth;
              arrow.style.display = 'none';
              const withoutArrow = panel.scrollWidth;
              arrow.style.display = saved;
              const links = Array.from(panel.querySelectorAll('a.btn-primary,a.btn-ghost')).map(
                (el) => {
                  const b = el.getBoundingClientRect();
                  return {
                    text: el.textContent.trim(),
                    inside: b.bottom <= r.bottom + 1 && b.right <= r.right + 1,
                  };
                }
              );
              const tokens = [];
              for (const node of [
                document.getElementById('paSpecsSub'),
                document.querySelector('#paSpecsTable td'),
              ]) {
                const walk = document.createTreeWalker(node, 4);
                let t;
                while ((t = walk.nextNode())) {
                  const n = t.textContent.indexOf('A-7/W35');
                  if (n >= 0) {
                    const range = document.createRange();
                    range.setStart(t, n);
                    range.setEnd(t, n + 7);
                    tokens.push({
                      text: range.toString(),
                      lines: new Set(Array.from(range.getClientRects()).map((r) => r.top)).size,
                    });
                  }
                }
              }
              return {
                width: panel.clientWidth,
                overflow,
                withoutArrow,
                height: r.height,
                scrollHeight: panel.scrollHeight,
                links,
                tokens,
                pageOverflow: document.documentElement.scrollWidth > window.innerWidth,
              };
            });
            metrics.push({ brand, i, ...m });
            if (width === 375) {
              expect.soft(m.overflow, 'P3 ' + brand + i).toBeLessThanOrEqual(m.width);
              expect.soft(m.pageOverflow, 'P3 Seite').toBe(false);
              expect
                .soft(
                  m.links.every((l) => l.inside) && m.links.length === 2,
                  'P3 Links ' + brand + i
                )
                .toBe(true);
            }
            if (brand === 'vaillant') {
              expect.soft(m.tokens.length, 'P2 Tokenorte').toBe(2);
              for (const token of m.tokens) expect.soft(token.lines, 'P2 ' + i).toBe(1);
              expect
                .soft(await page.locator('#paSpecsTable').innerText(), 'P6')
                .not.toContain('Vaillant Deutschland');
            }
            if (brand !== 'wolf' || i === 4)
              await screenshot(page, label + '-' + brand + '-' + i, testInfo);
          }
        }
        // Auch die nicht als Tafel vorausgewählten 8.1-Vorlagen müssen Herstellerdaten zeigen.
        for (const model of [
          'Vaillant VWL 55/8.1 A',
          'Vaillant VWL 75/8.1 A',
          'Vaillant VWL 105/8.1 A',
          'Vaillant VWL 125/8.1 A',
          '2× Vaillant VWL 125/8.1 A',
        ]) {
          const specs = await page.evaluate(
            (m) => window.eval('paDeviceIdentity({modell:' + JSON.stringify(m) + '}).specs'),
            model
          );
          expect
            .soft(specs.find((s) => s[0] === 'Hersteller')?.[1], 'P6 ' + model)
            .toBe('Vaillant GmbH');
        }
        for (const failure of ['network', 'http', 'invalid', 'empty']) {
          state.priceFailure = '';
          await page.evaluate('paLoadData()');
          expect.soft(await page.locator('#wolfMinEigen').innerText()).toContain('7.626');
          state.priceFailure = failure;
          await page.evaluate('paLoadData()');
          expect
            .soft(await page.locator('#wolfMinEigen').innerText(), 'P5 ' + failure)
            .toBe('ab … dein Anteil*');
          expect
            .soft(await page.locator('#vaillantMinEigen').innerText(), 'P5 ' + failure)
            .toBe('ab … dein Anteil*');
        }
        state.priceFailure = '';
        await page.evaluate('paLoadData()');
        expect.soft(await page.locator('#vaillantMinEigen').innerText()).toContain('7.544');
        await testInfo.attach('messungen', {
          body: JSON.stringify(metrics, null, 2),
          contentType: 'application/json',
        });
        fs.writeFileSync(
          path.join(
            root,
            'artifacts/tafel-sicht/wr',
            process.env.WR_REF ? 'rot' : 'gruen',
            label + '-messungen.json'
          ),
          JSON.stringify(metrics, null, 2)
        );
        expect(errors).toEqual([]);
      } finally {
        await browser.close();
      }
    });
    test('@smoke WR 7 Antworttexte ' + label, async ({}, testInfo) => {
      test.setTimeout(120000);
      const { browser, page, state, errors } = await setup(type, width);
      try {
        for (const payload of payloads) {
          state.data = responses();
          state.data.dimensionierung.strom_hinweis = payload;
          for (const b of Object.values(state.data.dimensionierung.marken)) {
            b.modell = payload;
            b.baureihe = payload;
            for (const v of b.varianten || []) {
              v.modell = payload;
              v.baureihe = payload;
            }
          }
          await page.goto(server.url + '/dimensionierung.html');
          await page.evaluate(
            'document.querySelector(\'.wizard-step[data-step="8"] .wizard-options .wizard-option\').classList.add("selected");wizData.verbrauchKnown=false;wizCalculate()'
          );
          await page.waitForFunction('document.querySelector(".wiz-variant-device")');
          const actual = await page.locator('.wiz-variant-device').allTextContents();
          expect.soft(actual, 'P7 Modell ' + payload).toEqual([payload, payload]);
          expect
            .soft(await page.locator('.wiz-variant-series').allTextContents(), 'P7 Baureihe')
            .toEqual([payload, payload]);
          expect
            .soft(await page.locator('#wizResultCards').innerText(), 'P7 Hinweis')
            .toContain(payload);
          expect
            .soft(await page.locator('.wiz-variant-device span').count(), 'P7 keine HTML-Knoten')
            .toBe(0);
          await screenshot(page, label + '-literal-' + payloads.indexOf(payload), testInfo);
          state.data.foerderung.bausteine = [payload];
          state.data.foerderung.treppe[0].label = payload;
          state.data.foerderung.perioden[0].label = payload;
          await page.goto(server.url + '/foerderung.html');
          await page.evaluate('calculateFoerder()');
          expect
            .soft(await page.locator('#foerderBreakdown').innerText(), 'P7 Baustein')
            .toContain(payload);
          expect.soft(await page.locator('#hwTreppe').innerText(), 'P7 Treppe').toContain(payload);
          expect
            .soft(
              await page.locator('#foerderAntragZeitraum option').first().textContent(),
              'P7 Option'
            )
            .toBe(payload);
          for (const file of [
            'kostenvergleich-waermepumpe.html',
            'docs/intern/kostenvergleich-berater.html',
          ]) {
            state.data.kostenvergleich = responses().kostenvergleich;
            const c = state.data.kostenvergleich;
            c.system.heizLabel = payload;
            c.system.heizLabelBestand = payload;
            c.foerder.label = payload;
            c.charts.labels[0] = payload;
            c.jahre[0].cY = payload;
            c.foerder.treppe[0].label = payload;
            state.data.kv_bootstrap.perioden[0].label = payload;
            await page.goto(server.url + '/' + file);
            await page.waitForFunction('typeof KV_STATE!=="undefined"&&KV_STATE.last');
            await page.evaluate('calculate({showResults:true,scroll:false})');
            expect
              .soft(await page.locator('#assBox').textContent(), 'P7 Annahmen ' + file)
              .toContain(payload);
            expect
              .soft(await page.locator('#detTbl').textContent(), 'P7 Jahre ' + file)
              .toContain(payload);
            expect
              .soft(await page.locator('#cMainDaten').textContent(), 'P7 Charttext ' + file)
              .toContain(payload);
            expect
              .soft(
                await page.locator('#wzFoerderTreppe .tr-col').first().getAttribute('title'),
                'P7 Attribute ' + file
              )
              .toBe(payload);
          }
        }
        expect(errors).toEqual([]);
      } finally {
        await browser.close();
      }
    });
  }

// Regelfall: derselbe Browser rendert beide Git-Stände mit identischen Antwortbytes.
for (const [name, type] of Object.entries({ chromium, webkit }))
  for (const width of [375, 1440]) {
    test(
      '@smoke WR Regelfall und rote Browserbasis ' + name + '-' + width,
      async ({}, testInfo) => {
        test.setTimeout(240000);
        const baselineServer = await serve(base);
        const { browser, page, state, errors } = await setup(type, width);
        const label = name + '-' + width;
        async function capture(url, version) {
          const result = {};
          async function words(key) {
            result[key] = await page.evaluate(() => {
              const overlay = document.querySelector('.foerder-package-label');
              const old = overlay?.getAttribute('style');
              if (overlay) overlay.setAttribute('style', 'display:none');
              const text = document.body.innerText.replace(/\s+/g, ' ').trim();
              if (overlay) {
                if (old === null) overlay.removeAttribute('style');
                else overlay.setAttribute('style', old);
              }
              return text;
            });
          }
          await page.goto(url + '/preise.html');
          await page.evaluate('paLoadData()');
          result.details = [];
          for (const brand of ['wolf', 'vaillant']) {
            await page.evaluate(
              (b) => window.eval('paSelectManufacturer(' + JSON.stringify(b) + ')'),
              brand
            );
            for (let i = 0; i < 5; i++) {
              await page.evaluate((i) => window.eval('paOpenIdx=-1;paZoom(' + i + ')'), i);
              await page.waitForTimeout(450);
              await words('preise-' + brand + '-' + i);
              if (version === 'basis' && width === 375 && i === 4) {
                const geometry = await page.locator('#paDetail').evaluate((el) => {
                  const arrow = document.getElementById('paDetailArrow'),
                    before = el.scrollWidth;
                  const old = arrow.style.display;
                  arrow.style.display = 'none';
                  const without = el.scrollWidth;
                  arrow.style.display = old;
                  return { before, without, width: el.clientWidth };
                });
                expect(geometry.before, 'P3 Basis Überlauf').toBeGreaterThan(geometry.width);
                expect(geometry.without, 'P3 isolierte Pfeil-Gegenprobe').toBe(geometry.width);
                await testInfo.attach('P3-' + brand, {
                  body: JSON.stringify(geometry),
                  contentType: 'application/json',
                });
              }
              if (version === 'basis' && brand === 'vaillant' && i === 3) {
                expect(
                  await page.locator('#wolfPricePanel').getAttribute('aria-labelledby'),
                  'P4 Basis falsch'
                ).toBe('manufacturerWolf');
                expect(
                  await page.locator('#paSpecsTable').innerText(),
                  'P6 Basis Lieferant'
                ).toContain('Vaillant Deutschland GmbH & Co. KG');
              }
              if (i === 4 || brand === 'vaillant')
                await screenshot(page, label + '-' + version + '-' + brand + '-' + i, testInfo);
            }
          }
          await page.goto(url + '/foerderung.html');
          await page.evaluate('paLoadData()');
          await page.evaluate('calculateFoerder()');
          await words('foerder-wolf');
          for (const k of ['s', 'm', 'l', 'xl', 'xxl']) {
            await page.evaluate(
              (k) => window.eval('foerderSelectPackage("vaillant",' + JSON.stringify(k) + ')'),
              k
            );
            await words('foerder-vaillant-' + k);
          }
          await page.goto(url + '/dimensionierung.html');
          await page.evaluate(
            'document.querySelector(\'.wizard-step[data-step="8"] .wizard-options .wizard-option\').classList.add("selected");wizData.verbrauchKnown=false;wizCalculate()'
          );
          await page.waitForFunction('document.querySelector(".wiz-variant-device")');
          await words('dimensionierung');
          await screenshot(page, label + '-' + version + '-dimensionierung', testInfo);
          for (const file of [
            'kostenvergleich-waermepumpe.html',
            'docs/intern/kostenvergleich-berater.html',
          ]) {
            await page.goto(url + '/' + file);
            await page.waitForFunction('typeof KV_STATE!=="undefined"&&KV_STATE.last');
            await words(file + '-start');
            // Bestehender Wizard-Ereignispfad; beide Fassungen erhalten dieselben Eingaben.
            await page.evaluate('calculate({showResults:true,scroll:false})');
            await page.evaluate(() =>
              document
                .querySelectorAll('#results details')
                .forEach((el) => el.setAttribute('open', ''))
            );
            result[file + '-results'] = await page.locator('#results').textContent();
            await screenshot(page, label + '-' + version + '-' + path.basename(file), testInfo);
          }
          return result;
        }
        try {
          const before = await capture(baselineServer.url, 'basis');
          const after = await capture(server.url, 'bau');
          // Einzige freigegebene Wortlautdifferenz im Regelfall: Hersteller statt Lieferant.
          for (const [key, value] of Object.entries(before)) {
            if (typeof value === 'string')
              expect(after[key], key).toBe(
                value.replaceAll('Vaillant Deutschland GmbH & Co. KG', 'Vaillant GmbH')
              );
          }
          await page.goto(baselineServer.url + '/preise.html');
          await page.evaluate('paLoadData()');
          state.priceFailure = 'http';
          await page.evaluate('paLoadData()');
          expect(await page.locator('#wolfMinEigen').innerText(), 'P5 Basis veraltet').toContain(
            '7.626'
          );
          state.priceFailure = '';
          for (const [i, payload] of payloads.entries()) {
            const data = responses().dimensionierung;
            for (const b of Object.values(data.marken)) {
              b.modell = payload;
              b.baureihe = payload;
              for (const v of b.varianten || []) {
                v.modell = payload;
                v.baureihe = payload;
              }
            }
            state.data.dimensionierung = data;
            await page.goto(baselineServer.url + '/dimensionierung.html');
            await page.evaluate(
              'document.querySelector(\'.wizard-step[data-step="8"] .wizard-options .wizard-option\').classList.add("selected");wizData.verbrauchKnown=false;wizCalculate()'
            );
            await page.waitForFunction('document.querySelector(".wiz-variant-device")');
            expect(
              await page.locator('.wiz-variant-device').first().textContent(),
              'P7 Basis dekodiert'
            ).toBe(i === 2 ? 'Heizleistung <12 kW bei A−11/W55' : 'A-11');
            await screenshot(page, label + '-basis-literal-' + i, testInfo);
          }
          expect(errors).toEqual([]);
        } finally {
          await browser.close();
          await baselineServer.close();
        }
      }
    );
  }
