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
  const state = { data: responses(), priceFailure: '', rawDimension: '' };
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== '127.0.0.1') return route.abort();
    if (url.pathname.startsWith('/api/rechner')) {
      const action = url.searchParams.get('action');
      if (action === 'dimensionierung' && state.rawDimension)
        return route.fulfill({ contentType: 'application/json', body: state.rawDimension });
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
  // Full-page evidence must include the selected device image even below the viewport.
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images).map((img) => {
        img.loading = 'eager';
        return img.decode().catch(() => {});
      })
    );
    // Wizard-Schritte scrollen weich; feste Navigation und Seitenleiste brauchen
    // für vergleichbare Gesamtaufnahmen dieselbe, abgeschlossene Scrollposition.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  });
  await page.waitForFunction(() => window.scrollY === 0);
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
            ctx.font = style.fontWeight + ' ' + style.fontSize + ' ' + style.fontFamily;
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
          if (width === 375)
            expect
              .soft(
                await page.evaluate(() => document.documentElement.scrollWidth),
                'P1 kein neuer Seitenüberlauf'
              )
              .toBeLessThanOrEqual(width);
          if (field.overlay) expect.soft(field.overlay.replace(/\s+/g, ' ')).toBe(field.text);
          if (klasse === 's' || klasse === 'xxl')
            await screenshot(page, label + '-foerder-' + klasse, testInfo);
        }
        await page.locator('#foerderWpTyp').selectOption('vaillant:s');
        const optionText = await page
          .locator('#foerderWpTyp')
          .evaluate((el) => el.selectedOptions[0].textContent);
        expect(await page.locator('.foerder-package-label').textContent()).toBe(optionText);
        await page.evaluate('paLoadData()');
        expect(await page.locator('.foerder-package-label').textContent()).toBe(optionText);
        await page.locator('#foerderWpTyp').focus();
        await expect(page.locator('#foerderWpTyp')).toBeFocused();
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
              const links = Array.from(panel.querySelectorAll('a.pa-bottom-cta')).map((el) => {
                const b = el.getBoundingClientRect();
                return {
                  text: el.textContent.trim(),
                  inside: b.bottom <= r.bottom + 1 && b.right <= r.right + 1,
                };
              });
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
        expect
          .soft(await page.locator('[data-wr-injected]').count(), 'Kein injiziertes Attribut')
          .toBe(0);
        expect(errors).toEqual([]);
      } finally {
        await browser.close();
      }
    });
    test('@smoke WR 7 Antworttexte ' + label, async ({}, testInfo) => {
      test.setTimeout(120000);
      const { browser, page, state, errors } = await setup(type, width);
      try {
        for (const payload of [...payloads, 'A" data-wr-injected="yes\'&<span>WR</span>']) {
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
            c.system.laufzeit = payload;
            c.ergebnis.breakEven = payload;
            c.foerder.quote = payload;
            c.foerder.grundPct = payload;
            c.co2.fluege = payload;
            c.co2.baeume = payload;
            c.annahmen.wartungWp = payload;
            c.annahmen.wartungFossil = payload;
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
        expect
          .soft(await page.locator('[data-wr-injected]').count(), 'Kein injiziertes Attribut')
          .toBe(0);
        // Unveränderter tatsächlicher Antwortkörper aus A11 Runde 5, Schema 3.
        state.rawDimension = fs.readFileSync(
          path.join(__dirname, 'fixtures/t1087-wr-runde5.json'),
          'utf8'
        );
        const rawModel = JSON.parse(state.rawDimension).marken.vaillant.modell.replace(
          /^Vaillant /,
          ''
        );
        const oldServer = await serve(base);
        try {
          for (const [version, url] of [
            ['basis', oldServer.url],
            ['bau', server.url],
          ]) {
            await page.goto(url + '/dimensionierung.html');
            await page.evaluate(
              'document.querySelector(\'.wizard-step[data-step="8"] .wizard-options .wizard-option\').classList.add("selected");wizData.verbrauchKnown=false;wizCalculate()'
            );
            await page.waitForFunction('document.querySelector(".wiz-variant-device")');
            expect(await page.locator('.wiz-variant-device').nth(1).textContent()).toBe(
              version === 'bau' ? rawModel : rawModel.replace('A<span>&minus;</span>11', 'A−11')
            );
            expect(await page.locator('.wiz-variant-device').nth(1).locator('span').count()).toBe(
              version === 'bau' ? 0 : 1
            );
            await screenshot(page, label + '-' + version + '-runde5-original', testInfo);
          }
        } finally {
          await oldServer.close();
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
            // WebKit zählt native Optionslisten bei begrenztem Überlauf anders in innerText.
            // Deshalb Pakettexte vollständig separat vergleichen, Seitenworte ohne Doppelung.
            result[key + '-paketauswahl'] = await page.evaluate(() => {
              const select = document.getElementById('foerderWpTyp');
              return JSON.stringify(
                select instanceof window.HTMLSelectElement
                  ? {
                      value: select.value,
                      options: Array.from(select.options, (option) => ({
                        value: option.value,
                        text: option.textContent,
                      })),
                    }
                  : null
              );
            });
            result[key] = await page.evaluate(() => {
              const overlay = document.querySelector('.foerder-package-label');
              const old = overlay?.getAttribute('style');
              const select = document.getElementById('foerderWpTyp');
              const oldSelect = select?.getAttribute('style');
              if (overlay) overlay.setAttribute('style', 'display:none');
              if (select) select.setAttribute('style', 'display:none');
              const text = document.body.innerText.replace(/\s+/g, ' ').trim();
              if (overlay) {
                if (old === null) overlay.removeAttribute('style');
                else overlay.setAttribute('style', old);
              }
              if (select) {
                if (oldSelect === null) select.removeAttribute('style');
                else select.setAttribute('style', oldSelect);
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
              if (version === 'basis' && brand === 'vaillant' && i === 0 && width === 375) {
                const lines = await page
                  .locator('#paSpecsTable td')
                  .first()
                  .evaluate((cell) => {
                    const node = cell.firstChild,
                      start = node.textContent.indexOf('A-7/W35'),
                      range = document.createRange();
                    range.setStart(node, start);
                    range.setEnd(node, start + 7);
                    return new Set(Array.from(range.getClientRects()).map((r) => r.top)).size;
                  });
                expect(lines, 'P2 Basis Kennwert bricht').toBeGreaterThan(1);
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
            if (version === 'basis' && width === 375) {
              const clipping = await page.locator('#foerderWpTyp').evaluate((select) => {
                const style = getComputedStyle(select),
                  context = document.createElement('canvas').getContext('2d');
                context.font = style.fontWeight + ' ' + style.fontSize + ' ' + style.fontFamily;
                return {
                  needed: context.measureText(select.selectedOptions[0].textContent).width,
                  available:
                    select.clientWidth -
                    parseFloat(style.paddingLeft) -
                    parseFloat(style.paddingRight) -
                    20,
                };
              });
              expect(clipping.needed, 'P1 Basis Preis abgeschnitten ' + k).toBeGreaterThan(
                clipping.available
              );
              await testInfo.attach('P1-Basis-' + k, {
                body: JSON.stringify(clipping),
                contentType: 'application/json',
              });
            }
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
            if (file.startsWith('docs/')) {
              for (const tab of ['system', 'energie', 'foerderung', 'finanzierung', 'extras']) {
                await page.evaluate(
                  (t) => window.eval('switchTab(' + JSON.stringify(t) + ')'),
                  tab
                );
                await words(file + '-reiter-' + tab);
                await screenshot(page, label + '-' + version + '-berater-' + tab, testInfo);
              }
            } else {
              await page.locator('[data-wz-heizart="gas"]').click({ timeout: 10000 });
              await page
                .locator('[data-wz-grp="vmode"][data-wz-val="known"]')
                .click({ timeout: 10000 });
              await page
                .locator('[data-wz-grp="altgas"][data-wz-val="ja"]')
                .click({ timeout: 10000 });
              for (let step = 1; step <= 5; step++) {
                await page.evaluate('calculate({showResults:false,scroll:false})');
                await words(file + '-schritt-' + step);
                await screenshot(
                  page,
                  label + '-' + version + '-' + path.basename(file) + '-schritt-' + step,
                  testInfo
                );
                if (step < 5) await page.locator('#wzNext').click({ timeout: 10000 });
              }
            }

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
          expect
            .soft(await page.locator('[data-wr-injected]').count(), 'Kein injiziertes Attribut')
            .toBe(0);
          expect(errors).toEqual([]);
        } finally {
          await browser.close();
          await baselineServer.close();
        }
      }
    );
  }
