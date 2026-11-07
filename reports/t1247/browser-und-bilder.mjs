// T1247, gezielter Browserlauf ohne Server: node reports/t1247/browser-und-bilder.mjs
// Alle Seiten/Assets kommen aus dem Arbeitsbaum, API-Antworten aus dem echten PHP-Adapter.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import { sheets } from '../../tests/t1247-kv-fixture.mjs';
const root = process.cwd(),
  origin = 'http://t1247.local';
const out = 'reports/t1247/bilder',
  rows = [],
  images = [];
await fs.mkdir(out, { recursive: true });
const nurMehrpreis = process.argv.includes('--mehrpreis');
let browser;
function php(job) {
  const p = spawnSync('php', ['tests/t1247-kv-runner.php'], {
    input: JSON.stringify([{ sheets, ...job }]),
    encoding: 'utf8',
    maxBuffer: 15e6,
  });
  assert.equal(p.status, 0, p.stderr);
  const r = JSON.parse(p.stdout)[0].value;
  if (r.error && /missing_tab|not found|undefined function/i.test(r.message))
    throw new Error('Prüfaufbau fehlerhaft: ' + r.message);
  return r;
}
const api = (query) => php({ action: query.action, query });
const defer = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
async function setup({ width = 375, theme = 'light', holdBootstrap = false, marktListe } = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height: 920 },
    locale: 'de-DE',
    colorScheme: theme,
    serviceWorkers: 'block',
  });
  const page = await ctx.newPage(),
    errors = [],
    requests = [],
    gate = defer();
  page.setDefaultTimeout(10000);
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript((theme) => localStorage.setItem('hero-theme', theme), theme);
  let pendingCost;
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (/\/api\/rechner(?:\.php)?$/.test(url.pathname)) {
      const q = Object.fromEntries(url.searchParams);
      requests.push(q);
      if (q.action === 'kv_bootstrap' && holdBootstrap) await gate.promise;
      if (['kv_bootstrap', 'kostenvergleich'].includes(q.action)) {
        const result = api(q);
        if (q.action === 'kv_bootstrap' && marktListe !== undefined)
          result.marktwerte = php({ mode: 'markt', liste: marktListe });
        if (q.action === 'kostenvergleich' && pendingCost) {
          const hold = pendingCost;
          pendingCost = null;
          hold.requested.resolve();
          await hold.release.promise;
        }
        return route.fulfill({ json: result });
      }
      return route.fulfill({ json: { service: q.action, ready: true, freiePlaetze: 0 } });
    }
    if (url.origin !== origin) return route.abort();
    // Kein HTTP-Server und keine Netzverbindung, auch nicht bei vorhandener T1247_URL.
    const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(root + path.sep)) return route.abort();
    try {
      return await route.fulfill({ path: file });
    } catch {
      return route.fulfill({ status: 404, body: '' });
    }
  });
  const state = {
    page,
    ctx,
    errors,
    requests,
    release: gate.resolve,
    blockNextCalculation() {
      pendingCost = { requested: defer(), release: defer() };
      return pendingCost;
    },
    async close() {
      gate.resolve();
      pendingCost?.release.resolve();
      await ctx.close();
    },
  };
  try {
    await page.goto(origin + '/kostenvergleich-waermepumpe.html?theme=' + theme);
    return state;
  } catch (e) {
    await state.close();
    throw e;
  }
}
async function check(name, fn, options) {
  if (nurMehrpreis && !name.startsWith('11 Mehrpreis ')) return;
  let state;
  try {
    state = await setup(options);
    await fn(state);
    assert.deepEqual(state.errors, []);
    rows.push({ name, status: 'grün' });
    console.log('GRÜN ' + name);
  } catch (e) {
    rows.push({ name, status: 'rot', fehler: e.stack || String(e) });
    console.error('ROT ' + name + ': ' + e.message);
  } finally {
    if (state) {
      try {
        await state.close();
      } catch (e) {
        rows.push({ name: name + ' (Aufräumen)', status: 'rot', fehler: e.message });
      }
    }
  }
}
const settled = (page) =>
  page.waitForFunction(
    () =>
      typeof KV_STATE !== 'undefined' &&
      KV_STATE.last &&
      !KV_STATE.timer &&
      document.querySelector('#results').getAttribute('aria-busy') !== 'true'
  );
async function bill(page, fuel = 'gas') {
  await page.locator('[data-wz-heizart="' + fuel + '"]').click();
  await page.locator('[data-wz-grp="vmode"][data-wz-val="bill"]').click();
  await page.locator('#wzJahreskosten').fill(fuel === 'gas' ? '2650.38' : '2200');
  await page.waitForFunction(() => KV_STATE.last?.verbrauchAbleitung?.bedarfKwh === 20000);
}
async function known(page, fuel = 'gas') {
  await page.locator('[data-wz-heizart="' + fuel + '"]').click();
  await page.locator('[data-wz-grp="vmode"][data-wz-val="known"]').click();
  await settled(page);
}
async function result(page) {
  for (let i = 0; i < 4; i++) await page.locator('#wzNext').click();
  await page.locator('#wzHero').waitFor({ state: 'visible' });
  await settled(page);
}
async function toggle(page, id, on) {
  const input = page.locator('#' + id);
  if ((await input.isChecked()) !== on) {
    await input.focus();
    await page.keyboard.press('Space');
  }
  assert.equal(await input.isChecked(), on);
}
// Zielwerte aus den tatsächlichen DOM-Grenzen ableiten, keine festen Tastenzahlen.
function rangeSteps({ min, max, step }, value) {
  const steps = (value - min) / step;
  assert.ok(
    [min, max, step, value].every(Number.isFinite) &&
      step > 0 &&
      value >= min &&
      value <= max &&
      Number.isInteger(steps),
    'Reglerziel nicht erreichbar: ' + JSON.stringify({ min, max, step, value })
  );
  return steps;
}
async function rangeValue(page, id, value) {
  const input = page.locator('#' + id);
  const bounds = await input.evaluate((el) => ({
    min: Number(el.min),
    max: Number(el.max),
    step: Number(el.step),
  }));
  const steps = rangeSteps(bounds, value);
  await input.focus();
  await page.keyboard.press('Home');
  for (let i = 0; i < steps; i++) await page.keyboard.press('ArrowRight');
  assert.equal(Number(await input.inputValue()), value, id + ': tatsächlicher Reglerwert');
}
const unerlaubterMehrpreis =
  /Mehrpreis[^.]*[-−]\s*\d|[-−]0 €|(?<![\d.])\b0 € günstiger|schon in der Anschaffung günstiger/;
async function within(promise, ms = 10000) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Erwartete Anfrage fehlt')), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
async function details(page) {
  await page.locator('#wzDetails > summary').click();
}
async function noOverflow(page) {
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    'Horizontaler Überlauf'
  );
}
async function focusLayoutElements(button) {
  return button.evaluateHandle((button) => {
    const rect = button.getBoundingClientRect();
    const above = [...document.body.querySelectorAll('*')].flatMap((el, index) => {
      const box = el.getBoundingClientRect();
      if (!el.getClientRects().length || box.top >= rect.top || button.contains(el)) return [];
      // Auch umschließende Container und einzelne Kinder prüfen, damit sich
      // gegenläufige Höhenänderungen nicht gegenseitig verdecken können.
      return [{ element: el.id || `${el.tagName}[${index}]`, el }];
    });
    return { button, above };
  });
}
async function focusLayout(elements) {
  return elements.evaluate(({ button, above }) => {
    // Position und Scrollstand atomar lesen; dieselben Elemente nachmessen,
    // damit Scrollen auch bei fixen/sticky Elementen die Auswahl nicht ändert.
    const rect = button.getBoundingClientRect();
    return {
      y: rect.y + window.scrollY,
      height: rect.height,
      above: above.map(({ element, el }) => ({
        element,
        connected: el.isConnected,
        height: el.getBoundingClientRect().height,
      })),
    };
  });
}
function assertFocusLayout(before, after) {
  assert.equal(after.y, before.y, 'Knopf im Dokument verschoben');
  assert.equal(after.height, before.height, 'Knopfhöhe beim Fokuswechsel verändert');
  assert.deepEqual(after.above, before.above, 'Elementhöhen oberhalb des Knopfs verändert');
}
// Sichtbare Blattwerte werden gegen die echte Serverantwort geprüft, keine Renderer-Aufrufe aus dem Test.
async function numericLabels(page) {
  const bad = await page.locator('body').evaluate((body) => {
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT),
      bad = [];
    while (walker.nextNode()) {
      const n = walker.currentNode,
        el = n.parentElement;
      if (
        !el ||
        el.closest('script,style,option') ||
        !el.checkVisibility() ||
        !el.getClientRects().length
      )
        continue;
      const text = n.textContent.trim();
      if (/(?<![\d.,])\d{4,}(?:,\d+)?\s*(?:€|Euro|kWh|Liter|m³|m²|ct\/kWh)/u.test(text))
        bad.push(text);
      if (/\d+\.\d{1,2}(?!\d)\s*(?:€|Euro|kWh|Liter|ct\/kWh)/u.test(text)) bad.push(text);
    }
    return bad;
  });
  assert.deepEqual(bad, [], 'Unformatierte sichtbare Geldbeträge/Mengen');
}
try {
  browser = await chromium.launch({ headless: true });
  await check(
    '1a Rechnung zu Verbrauch: Brücke null und neue Tastatureingabe führt',
    async ({ page, requests }) => {
      await settled(page);
      await bill(page);
      await page.locator('#gaspreis').fill('15');
      await page.waitForFunction(() => KV_STATE.last?.inputsEcho.bedarf === 16000);
      await page.locator('#wzEuroZuVerbrauch').click();
      await settled(page);
      assert.equal(await page.evaluate(() => window.WZ_BRIDGE), null);
      assert.equal(await page.locator('#wzVKnown').isVisible(), true);
      const slider = page.locator('#wzVerbSlider');
      await slider.focus();
      await page.keyboard.press('ArrowRight');
      await settled(page);
      const kwh = await page.evaluate(() => Number(document.querySelector('#bedarf').value));
      assert.equal(await page.evaluate(() => KV_STATE.last.inputsEcho.bedarf), kwh);
      assert.equal(await page.evaluate(() => KV_STATE.last.verbrauchAbleitung ?? null), null);
      assert.equal(
        requests.filter((q) => q.action === 'kostenvergleich').at(-1).bedarfModus,
        undefined
      );
      await page.locator('[data-wz-grp="vmode"][data-wz-val="unknown"]').click();
      for (const [grp, val] of [
        ['geb', 'efh'],
        ['bj', '1978-1994'],
        ['san', 'teilweise'],
      ])
        await page.locator(`[data-wz-grp="${grp}"][data-wz-val="${val}"]`).click();
      await page.waitForFunction(
        () => KV_STATE.last && window.WZ_BRIDGE?.bedarfModus === 'schaetzung'
      );
      await page.locator('[data-wz-grp="vmode"][data-wz-val="bill"]').click();
      await settled(page);
      assert.equal(await page.evaluate(() => window.WZ_BRIDGE.bedarfModus), 'jahreskosten');
    }
  );
  await check('1b Späte Euro-Antwort reaktiviert den Rechnungsmodus nicht', async (state) => {
    const { page } = state;
    await settled(page);
    await bill(page);
    const hold = state.blockNextCalculation();
    try {
      await page.locator('#gaspreis').fill('15');
      await within(hold.requested.promise);
      await page.locator('#wzEuroZuVerbrauch').click();
      hold.release.resolve();
      await settled(page);
      assert.equal(await page.evaluate(() => window.WZ_BRIDGE), null);
      assert.equal(await page.evaluate(() => KV_STATE.last.verbrauchAbleitung ?? null), null);
      assert.equal(
        await page.evaluate(() => KV_STATE.last.inputsEcho.bedarf),
        Number(await page.locator('#bedarf').inputValue())
      );
    } finally {
      hold.release.resolve();
    }
  });
  await check(
    '1c Fokuswechsel nach fertiger Euro-Rechnung lässt Herleitung und Knopf stabil',
    async ({ page, requests }) => {
      await settled(page);
      await bill(page);
      await page.locator('#gaspreis').fill('15');
      await page.waitForFunction(() => KV_STATE.last?.inputsEcho.bedarf === 16000);
      const hint = await page.locator('#wzEuroHinweis').textContent();
      const button = page.locator('#wzEuroZuVerbrauch');
      await button.scrollIntoViewIfNeeded();
      const elements = await focusLayoutElements(button);
      const before = await focusLayout(elements);
      const count = requests.filter((q) => q.action === 'kostenvergleich').length;
      await button.focus(); // Echter change/focusout, keine programmatisch ausgelösten Ereignisse.
      assert.equal(await page.locator('#wzEuroHinweis').textContent(), hint);
      assert.equal(await page.evaluate(() => KV_STATE.timer), null);
      assert.equal(await page.evaluate(() => KV_STATE.last?.inputsEcho.bedarf), 16000);
      assertFocusLayout(before, await focusLayout(elements)); // Exakt, auch 1 px bleibt rot.
      await elements.dispose();
      assert.equal(requests.filter((q) => q.action === 'kostenvergleich').length, count);
      await page.keyboard.press('Enter');
      await settled(page);
      assert.equal(await page.evaluate(() => window.WZ_BRIDGE), null);
    }
  );
  await check(
    'Z5 Nutzen-Karten trennen Bezeichnung, Betrag und Spanne im Textinhalt',
    async ({ page }) => {
      await settled(page);
      await known(page);
      await result(page);
      const cards = await page.locator('#wzHero .kv-nutzen-grid > .rc').allTextContents();
      assert.equal(cards.length, 3);
      for (const text of cards) assert.doesNotMatch(text, /[A-Za-zÄÖÜäöüß)]\d/);
      assert.match(cards[1], /Bezahlt gemacht nach\s+\S/);
      assert.match(cards[2], /Vorteil nach 20 Jahren\s+[−\d].*€\s+Spanne:/s);
    }
  );
  await check(
    '9a Dezimalfelder nach Laden und Marktwertklick deutsch, Komma und Punkt rechnen gleich',
    async ({ page, requests }) => {
      await settled(page);
      await known(page, 'oel');
      for (const [id, value] of [
        ['gaspreis', '12,00'],
        ['n01_preis_oel', '1,10'],
        ['strompreis', '32,00'],
        ['grundpreisGas', '250,38'],
      ]) {
        assert.equal(await page.locator('#' + id).inputValue(), value);
      }
      for (const id of ['wpArbeitspreis', 'wpGrundpreis'])
        assert.equal(await page.locator('#' + id).inputValue(), '');
      await toggle(page, 'wpZaehler', true);
      for (const id of ['n01_preis_oel', 'strompreis', 'wpArbeitspreis', 'wpGrundpreis']) {
        assert.equal(await page.locator('#' + id).getAttribute('inputmode'), 'decimal');
        await page.locator(`[data-markt="${id}"]`).click();
        assert.match(await page.locator('#' + id).inputValue(), /^\d+,\d{2}$/);
      }
      await settled(page);
      assert.equal(await page.locator('#wpArbeitspreis').inputValue(), '24,23');
      assert.equal(await page.locator('#wpGrundpreis').inputValue(), '70,27');
      await page.locator('[data-wz-grp="vmode"][data-wz-val="bill"]').click();
      assert.equal(await page.locator('#wzJahreskosten').getAttribute('inputmode'), 'decimal');
      await page.locator('#wzJahreskosten').fill('3000,00');
      await page.locator('#n01_preis_oel').fill('1,5');
      await page.waitForFunction(() => KV_STATE.last?.verbrauchAbleitung?.bedarfKwh === 20000);
      assert.equal(
        requests.filter((q) => q.action === 'kostenvergleich').at(-1).n01_preis_oel,
        '1.5'
      );
      assert.equal(
        requests.filter((q) => q.action === 'kostenvergleich').at(-1).jahreskosten,
        '3000'
      );
      await page.locator('#n01_preis_oel').fill('1.5');
      await settled(page);
      assert.equal(await page.evaluate(() => KV_STATE.last.verbrauchAbleitung.bedarfKwh), 20000);
      await page.locator('#wzJahreskosten').focus();
      assert.equal(await page.locator('#n01_preis_oel').inputValue(), '1,50');
      await page.locator('#wzEuroZuVerbrauch').focus();
      assert.equal(await page.locator('#wzJahreskosten').inputValue(), '3.000,00');
      await page.locator('[data-wz-heizart="gas"]').click();
      await settled(page);
      for (const id of ['gaspreis', 'grundpreisGas']) {
        await page.locator(`[data-markt="${id}"]`).click();
        await settled(page);
        assert.match(await page.locator('#' + id).inputValue(), /^\d+,\d{2}$/);
      }
    }
  );
  await check(
    '9a Jahreskosten: vier gültige Eingaben, Tausenderpunkt und eindeutige API-Zahl',
    async ({ page, requests }) => {
      await settled(page);
      await bill(page);
      const field = page.locator('#wzJahreskosten');
      for (const [input, amount, display] of [
        ['2.650,38', 2650.38, '2.650,38'],
        ['2650,38', 2650.38, '2.650,38'],
        ['2650.38', 2650.38, '2.650,38'],
        ['2650', 2650, '2.650,00'],
        ['2.650', 2650, '2.650,00'],
      ]) {
        await field.fill(input);
        await page.waitForFunction(
          (amount) => KV_STATE.last?.verbrauchAbleitung?.betrag === amount,
          amount
        );
        assert.equal(
          requests.filter((q) => q.action === 'kostenvergleich').at(-1).jahreskosten,
          String(amount)
        );
        await page.locator('#wzEuroZuVerbrauch').focus();
        assert.equal(await field.inputValue(), display);
        assert.equal(await page.locator('#wzNext').isEnabled(), true);
      }
    }
  );
  await check(
    '9a Jahreskosten: unklare Schreibweisen sperren mit Klartext und bleiben bearbeitbar',
    async ({ page }) => {
      await settled(page);
      await bill(page);
      const field = page.locator('#wzJahreskosten');
      for (const input of ['2.65,38', '2,650.38', '2.650.38', '2650.3', '2e3', '']) {
        await field.fill(input);
        await page.waitForFunction(
          () =>
            KV_STATE.last === null &&
            /Jahreskosten.*2\.650,38.*2650\.38/.test(
              document.querySelector('#wzEuroHinweis').textContent
            )
        );
        assert.equal(await page.locator('#wzNext').isEnabled(), false);
        await page.locator('#wzEuroZuVerbrauch').focus();
        assert.equal(await field.inputValue(), input);
      }
      await field.fill('2.650,38');
      await settled(page);
      assert.equal(await page.evaluate(() => KV_STATE.last.inputsEcho.bedarf), 20000);
      assert.equal(await page.locator('#wzNext').isEnabled(), true);
    }
  );
  await check(
    'Ergebnis Öl: nach Förderung 380 € günstiger, kein negativer Mehrpreis',
    async ({ page }) => {
      await settled(page);
      await bill(page, 'oel');
      await result(page);
      assert.equal(await page.evaluate(() => KV_STATE.last.invest.investDelta), -380);
      const text = await page.locator('#wzHero').innerText();
      assert.match(text, /Bezahlt gemacht: sofort/);
      assert.match(
        text,
        /Die Wärmepumpe ist nach Förderung 380 € günstiger als die neue Ölheizung\./
      );
      assert.doesNotMatch(text, /Mehrpreis[^\n]*[-−]/);
    }
  );
  for (const width of [375, 1280])
    for (const fuel of ['gas', 'oel'])
      for (const delta of [5120, -380, 0]) {
        await check(
          '11 Mehrpreis ' +
            fuel +
            ' / ' +
            delta +
            ' € / ' +
            width +
            ' px, Hauptkarte und offene Details',
          async ({ page }) => {
            await settled(page);
            await known(page, fuel);
            // Gleiche Fördervoraussetzung wie Öl: Gasheizung mindestens 20 Jahre alt.
            // Ohne diese Angabe setzt der Wizard fAlt20=false, netto dann 21.600 statt 17.120 €.
            if (fuel === 'gas')
              await page.locator('[data-wz-grp="altgas"][data-wz-val="ja"]').click();
            await page.locator('#wzNext').click();
            await rangeValue(page, 'invWP', delta === 0 ? 25000 : 30000);
            const fossil = delta === 0 ? 13500 : delta < 0 ? 17500 : 12000;
            await rangeValue(page, fuel === 'gas' ? 'gasInvest' : 'oelInvest', fossil);
            await settled(page);
            const actual = await page.evaluate(() => ({
              brutto: KV_STATE.last.invest.brutto,
              fossil: KV_STATE.last.invest.fossilInvest,
              delta: KV_STATE.last.invest.mehrInvest,
              alt20: document.querySelector('#fAlt20').checked,
            }));
            assert.deepEqual(actual, {
              brutto: delta === 0 ? 25000 : 30000,
              fossil,
              delta,
              alt20: true,
            });
            for (let i = 0; i < 3; i++) await page.locator('#wzNext').click();
            await settled(page);
            assert.equal(await page.evaluate(() => KV_STATE.last.invest.mehrInvest), delta);
            const name = fuel === 'gas' ? 'Gasheizung' : 'Ölheizung';
            const expected =
              delta > 0
                ? 'Mehrpreis gegenüber der neuen ' + name + ': 5.120 €.'
                : delta < 0
                  ? 'Die Wärmepumpe ist nach Förderung 380 € günstiger als die neue ' + name + '.'
                  : 'Wärmepumpe und neue ' + name + ' kosten nach Förderung gleich viel.';
            assert.ok((await page.locator('#wzHero').innerText()).includes(expected));
            await details(page);
            for (const id of ['pathSummary', 'kpiGrid', 'dreiWegeBox']) {
              assert.equal(await page.locator('#' + id).isVisible(), true);
              const text = await page.locator('#' + id).innerText();
              assert.ok(text.includes(expected), id + ': ' + text);
              assert.doesNotMatch(text, unerlaubterMehrpreis);
            }
            await noOverflow(page);
          },
          { width }
        );
      }
  for (const fuel of ['gas', 'oel'])
    await check(
      '9b Herleitung ohne erzwungene Mengennachkommastellen: ' + fuel,
      async ({ page }) => {
        await settled(page);
        await bill(page, fuel);
        const text = await page.locator('#wzEuroHinweis').textContent();
        assert.match(text, /20\.000 kWh/);
        assert.doesNotMatch(text, /,0+ (?:kWh|Litern)/);
        if (fuel === 'oel') {
          assert.match(text, /2\.000 Litern bei 10 kWh je Liter/);
          assert.match(text, /2\.200,00 Euro.*1,10 Euro\/Liter/);
        } else assert.match(text, /2\.650,38 Euro.*12,00 ct\/kWh/);
      }
    );
  await check('2 Handy-Klapptexte ohne doppeltes Alle', async ({ page }) => {
    await settled(page);
    await known(page);
    await result(page);
    await details(page);
    assert.deepEqual(await page.locator('.chart-summary-mobile').allTextContents(), [
      'Jahr 0 bis 20 im Detail',
      'Alle 20 Jahre im Detail',
      'Alle 20 Jahre im Detail',
    ]);
    for (const loc of await page.locator('.chart-summary-mobile').all())
      assert.equal(await loc.isVisible(), true);
    assert.doesNotMatch(await page.locator('body').innerText(), /Alle (?:Alle|Jahr)/);
  });
  await check(
    '3a Ölpreis leeren, Gas wählen: verborgener Ölpreis sperrt nicht',
    async ({ page, requests }) => {
      await settled(page);
      await known(page, 'oel');
      await page.locator('#n01_preis_oel').fill('');
      await page.locator('[data-wz-heizart="gas"]').click();
      await settled(page);
      assert.equal(await page.locator('#n01_preis_oel').isVisible(), false);
      assert.equal(await page.locator('#wzNext').isEnabled(), true);
      assert.equal(
        requests.filter((q) => q.action === 'kostenvergleich').at(-1).n01_preis_oel,
        undefined
      );
      await page.locator('[data-wz-grp="vmode"][data-wz-val="bill"]').click();
      await page.locator('#wzJahreskosten').fill('2650.38');
      await page.waitForFunction(() => KV_STATE.last?.inputsEcho.bedarf === 20000);
      assert.equal(await page.locator('#wzNext').isEnabled(), true);
    }
  );
  await check(
    '3b Gaspreis/Grundpreis leeren, Öl wählen: verborgene Gasfelder sperren nicht',
    async ({ page, requests }) => {
      await settled(page);
      await known(page);
      await page.locator('#gaspreis').fill('');
      await page.locator('#grundpreisGas').fill('');
      await page.locator('[data-wz-heizart="oel"]').click();
      await settled(page);
      assert.equal(await page.locator('#wzNext').isEnabled(), true);
      const q = requests.filter((q) => q.action === 'kostenvergleich').at(-1);
      assert.equal(q.gaspreis, undefined);
      assert.equal(q.grundpreisGas, undefined);
    }
  );
  await check(
    '3c Abweichende Vergleichsheizung: verwendeter Ölpreis sichtbar und Pflicht',
    async ({ page }) => {
      await settled(page);
      await known(page);
      await page.locator('#wzNext').click();
      await page.locator('[data-vgl-fuel="oel"]').click();
      await settled(page);
      assert.equal(await page.locator('#n01_preis_oel').isVisible(), true);
      await page.locator('#n01_preis_oel').fill('');
      await page.waitForFunction(
        () =>
          KV_STATE.last === null && /Ölpreis/.test(document.querySelector('#kvStatus').textContent)
      );
      await page.locator('#n01_preis_oel').fill('1.1');
      await settled(page);
      assert.equal(await page.evaluate(() => KV_STATE.last.system.heizLabel), 'Öl');
    }
  );
  for (const neu of [true, false])
    await check(
      '4 Geld und Mengen deutsch, Finanzierung ' + (neu ? 'Neuanlage' : 'Bestand'),
      async ({ page }) => {
        await settled(page);
        await known(page);
        await page.locator('#wzNext').click();
        if (!neu) {
          await toggle(page, 'neuFossilTog', false);
          await settled(page);
        }
        // 65.000 Euro Investition, 5 Jahre Kredit und 9 Prozent Zins erzwingen eine vierstellige Rate.
        await page.locator('#invWP').focus();
        await page.keyboard.press('End');
        await page.locator('#wzNext').click();
        await page.locator('#wzNext').click();
        await toggle(page, 'finanzTog', true);
        await page.locator('#kredLZ').focus();
        await page.keyboard.press('Home');
        await page.locator('#kredZins').focus();
        await page.keyboard.press('End');
        await settled(page);
        await page.locator('#wzNext').click();
        await settled(page);
        await details(page);
        const rate = await page.evaluate(() => KV_STATE.last.finanzierung.monRate);
        assert.ok(rate >= 1000, 'Prüffall benötigt vierstellige Rate');
        assert.match(
          await page.locator('#cashflowBox').innerText(),
          new RegExp(Math.round(rate).toLocaleString('de-DE').replaceAll('.', '\\.') + ' € Rate')
        );
        await numericLabels(page);
      }
    );
  await check(
    '5 Euro-Seitenleiste nutzt inputsEcho.bedarf: 15 ct ergeben 16.000 kWh',
    async ({ page }) => {
      await settled(page);
      await bill(page);
      await page.locator('#gaspreis').fill('15');
      await page.waitForFunction(() => KV_STATE.last?.inputsEcho.bedarf === 16000);
      await page.locator('#wzNext').click();
      await settled(page);
      assert.equal(await page.locator('#wzLiveFoerder').isVisible(), true);
      assert.match(await page.locator('#wzLiveFoerder').innerText(), /Gas, 16\.000 kWh/);
      assert.doesNotMatch(await page.locator('#wzLiveFoerder').innerText(), /20\.000 kWh/);
    },
    { width: 1280 }
  );
  for (const neu of [true, false])
    await check(
      '6 Negatives Ergebnis ohne Spar-/Amortisationsbehauptung, ' + (neu ? 'Neuanlage' : 'Bestand'),
      async ({ page }) => {
        await settled(page);
        await known(page);
        await page.locator('#strompreis').fill('100');
        await settled(page);
        await page.locator('#wzNext').click();
        if (!neu) {
          await toggle(page, 'neuFossilTog', false);
          await settled(page);
        }
        await page.locator('#wzNext').click();
        await page.locator('#wzNext').click();
        await toggle(page, 'finanzTog', true);
        await settled(page);
        await page.locator('#wzNext').click();
        await settled(page);
        await details(page);
        const r = await page.evaluate(() => ({
          sav: KV_STATE.last.jahre[0].jSav,
          be: KV_STATE.last.ergebnis.breakEven,
          mon: KV_STATE.last.finanzierung[
            KV_STATE.last.system.neuFossilOn ? 'monVorteil' : 'monDiff'
          ],
        }));
        assert.ok(r.sav < 0 && r.mon < 0);
        assert.equal(r.be, null);
        assert.match(await page.locator('#wzHero').innerText(), /Du zahlst rund/);
        assert.doesNotMatch(
          await page.locator('#wzHero').innerText(),
          /Du sparst|Die Einsparungen/
        );
        assert.match(
          await page.locator('#cashflowBox').innerText(),
          /monatlich teurer.*Bei Barzahlung nicht in 20 Jahren ausgeglichen/s
        );
        assert.doesNotMatch(
          await page.locator('body').innerText(),
          /Jeder Balken zeigt, wie viel du.*sparst|Amortisiert sich über die Jahre/
        );
        assert.match(
          await page.locator('#pathSummary').innerText(),
          /Zusätzliche Betriebs- und CO₂-Kosten/
        );
        assert.match(
          await page.locator('#cBreakDaten .chart-summary-desktop').textContent(),
          /Jährlicher Kostenunterschied/
        );
      }
    );
  const probe = {
    wert: 9.87,
    einheit: 'ct/kWh',
    quelle: 'T1247 Prüf-Eintrag Gas',
    stand: '07.11.2026',
  };
  for (const missing of [null, ...Object.keys(probe)]) {
    const entry = { ...probe };
    if (missing) delete entry[missing];
    await check(
      '7 Prüf-Eintrag: ' +
        (missing ? missing + ' fehlt, kein Knopf' : 'vollständig, sichtbarer bedienbarer Knopf'),
      async ({ page }) => {
        await settled(page);
        await known(page);
        const button = page.locator('[data-markt="gaspreis"]');
        if (missing) {
          assert.equal(await button.count(), 0);
          assert.match(
            await page.locator('#wzMarkt_gaspreis').innerText(),
            /Kein belegter Marktwert/
          );
        } else {
          assert.equal(await button.isVisible(), true);
          await button.click();
          assert.equal(await page.locator('#gaspreis').inputValue(), '9,87');
          assert.match(await page.locator('#wzChip_gaspreis').innerText(), /Marktwert übernommen/);
        }
      },
      { marktListe: { gaspreis: entry } }
    );
  }
  await check(
    '7 Spätes Bootstrap nach echter Tastatureingabe erhält Preise und Herkunft',
    async ({ page, release }) => {
      await page.locator('[data-wz-heizart="gas"]').click();
      const gas = page.locator('#gaspreis');
      await gas.focus();
      await gas.press('ControlOrMeta+A');
      await page.keyboard.type('19.7');
      await page.locator('[data-wz-heizart="oel"]').click();
      const oil = page.locator('#n01_preis_oel');
      await oil.focus();
      await oil.press('ControlOrMeta+A');
      await page.keyboard.type('1.87');
      release();
      await page.waitForFunction(() => KV_STATE.bootstrap);
      await settled(page);
      assert.equal(await gas.inputValue(), '19,70');
      assert.equal(await oil.inputValue(), '1.87');
      for (const id of ['gaspreis', 'n01_preis_oel']) {
        assert.match(await page.locator('#wzChip_' + id).textContent(), /Deine Angabe/);
        assert.match(await page.locator('#wzChip_' + id).getAttribute('class'), /own/);
      }
      await page.locator('[data-markt="n01_preis_oel"]').focus();
      await page.keyboard.press('Enter');
      assert.equal(await oil.inputValue(), '1,72');
      await oil.fill('1.1');
      assert.match(await page.locator('#wzChip_n01_preis_oel').textContent(), /Deine Angabe/);
    },
    { holdBootstrap: true }
  );
  await check('Ungültige Euro-Preise sperren Ergebnis und Weiter', async ({ page }) => {
    await settled(page);
    await bill(page);
    await page.locator('#gaspreis').fill('0');
    await page.waitForFunction(() =>
      /größer als 0/.test(document.querySelector('#wzEuroHinweis').textContent)
    );
    assert.equal(await page.locator('#wzNext').isDisabled(), true);
    assert.equal(await page.evaluate(() => KV_STATE.last), null);
  });
  await check(
    'A9 Preisherkunft Gas: je Preis benannt, Marktquelle und Stand nach Übernahme',
    async ({ page }) => {
      await settled(page);
      await bill(page);
      const hint = page.locator('#wzEuroHinweis');
      assert.match(
        await hint.innerText(),
        /Preisherkunft: Arbeitspreis HeroWerk-Annahme, Grundpreis HeroWerk-Annahme\./
      );
      for (const [field, label] of [
        ['gaspreis', 'Arbeitspreis'],
        ['grundpreisGas', 'Grundpreis'],
      ]) {
        await page.locator(`[data-markt="${field}"]`).click();
        await settled(page);
        const ref = await page.evaluate(
          (field) => KV_STATE.last.verbrauchAbleitung.preise[field].referenz,
          field
        );
        assert.ok(ref, field + ': Marktwert nicht übernommen');
        assert.ok(
          (await hint.innerText()).includes(
            label + ' Marktwert ' + ref.quelle + ', Stand ' + ref.stand
          )
        );
      }
      await page.locator('#gaspreis').fill('15');
      await settled(page);
      assert.match(
        await hint.innerText(),
        /Preisherkunft: Arbeitspreis eigene Angabe, Grundpreis Marktwert enercity BasisGas, Stand 01\.01\.2026\./
      );
    }
  );
  for (const width of [375, 1280])
    for (const theme of ['light', 'dark']) {
      await check(
        `A9 Diagrammbeschriftung im Diagramm: Jahr 0, 7 und Laufzeitende, ${width} px ${theme}`,
        async ({ page }) => {
          await settled(page);
          await known(page);
          await page.locator('#wzNext').click();
          await page.locator('#laufzeit').focus();
          await page.keyboard.press('End');
          await settled(page);
          assert.equal(await page.evaluate(() => KV_STATE.last.system.laufzeit), 25);
          for (let step = 0; step < 3; step++) await page.locator('#wzNext').click();
          await page.locator('#wzHero').waitFor({ state: 'visible' });
          await settled(page);
          await page.locator('#cMain').scrollIntoViewIfNeeded();
          await page.evaluate(() => document.fonts.ready);
          // Reine Zeichenprüfung mit echten Canvas-Metriken und dem registrierten Plugin.
          // Nur den Amortisationszeitpunkt variieren; die Serverrechnung anschließend wiederherstellen.
          const measurements = await page.evaluate(() => {
            const chart = Chart.getChart('cMain'),
              ctx = chart.ctx;
            chart.stop();
            chart.update('none');
            const originalResult = KV_STATE.last.ergebnis,
              fillText = ctx.fillText;
            const measurements = [];
            ctx.fillText = function (text, x, y, ...rest) {
              if (/^Bezahlt(?: gemacht)?:/.test(String(text))) {
                const m = this.measureText(text);
                measurements.push({
                  year: KV_STATE.last.ergebnis.breakEven,
                  text,
                  left: x - m.actualBoundingBoxLeft,
                  right: x + m.actualBoundingBoxRight,
                  top: y - m.actualBoundingBoxAscent,
                  bottom: y + m.actualBoundingBoxDescent,
                  area: { ...chart.chartArea },
                });
              }
              return fillText.call(this, text, x, y, ...rest);
            };
            try {
              for (const year of [0, 7, KV_STATE.last.system.laufzeit]) {
                KV_STATE.last.ergebnis = {
                  ...originalResult,
                  breakEven: year,
                  breakEvenSofort: year === 0,
                };
                chart.draw();
              }
            } finally {
              ctx.fillText = fillText;
              KV_STATE.last.ergebnis = originalResult;
              chart.draw();
            }
            return measurements;
          });
          assert.equal(measurements.length, 3, 'Amortisationsbeschriftung fehlt');
          for (const m of measurements) {
            assert.ok(
              m.left >= m.area.left &&
                m.right <= m.area.right &&
                m.top >= m.area.top &&
                m.bottom <= m.area.bottom,
              JSON.stringify(m)
            );
            assert.ok(m.text.includes(m.year === 0 ? 'sofort' : String(m.year)), m.text);
          }
        },
        { width, theme }
      );
    }
  // Bilder sind eigenständige Fälle: Ein roter Fachfall verhindert kein folgendes Bild.
  for (const fuel of ['gas', 'oel'])
    for (const [width, theme] of [
      [375, 'light'],
      [1280, 'light'],
      [375, 'dark'],
    ]) {
      const options = { width, theme },
        suffix = `${fuel}-${theme}-${width}`;
      await check(
        'Bild Verbrauch ' + suffix,
        async ({ page }) => {
          await settled(page);
          await bill(page, fuel);
          const tariffHidden = !(await page.locator('#wpArbeitspreis').isVisible());
          await page.locator('#wpZaehler').focus();
          await page.keyboard.press('Space');
          await page.locator('[data-markt="wpArbeitspreis"]').focus();
          await page.keyboard.press('Enter');
          await page.locator('[data-markt="wpGrundpreis"]').click();
          await settled(page);
          const file = `${out}/${fuel}-verbrauch-${theme}-${width}.png`;
          await page.locator('#wzStepBody').screenshot({ path: file });
          images.push(file);
          assert.equal(tariffHidden, true);
          assert.equal(await page.locator('#wpArbeitspreis').inputValue(), '24,23');
          assert.equal(await page.locator('#wpGrundpreis').inputValue(), '70,27');
          await noOverflow(page);
          await page.locator('#wpZaehler').focus();
          await page.keyboard.press('Space');
          assert.equal(await page.locator('[data-markt="wpGrundpreis"]').isVisible(), false);
        },
        options
      );
      await check(
        'Bild Ergebnis und Vertragskontrollen ' + suffix,
        async ({ page }) => {
          await settled(page);
          await bill(page, fuel);
          await result(page);
          const file = `${out}/${fuel}-ergebnis-${theme}-${width}.png`;
          await page.locator('#results').screenshot({ path: file });
          images.push(file);
          assert.match(
            await page.locator('#wzHero').innerText(),
            /Heizkosten im ersten Jahr[\s\S]*Bezahlt gemacht[\s\S]*Vorteil nach 20 Jahren/
          );
          const chart = await page.evaluate(() => ({
            labels: Chart.getChart('cMain').data.labels,
            count: Chart.getChart('cMain').data.datasets.length,
          }));
          assert.equal(chart.labels[0], 0);
          assert.equal(chart.count, 2);
          assert.equal(await page.locator('#cMainDaten tbody tr').count(), 21);
          await noOverflow(page);
          await numericLabels(page);
          await page.evaluate(() =>
            document.addEventListener('click', (e) => {
              if (e.target.closest('a[href*="anfrage"]')) e.preventDefault();
            })
          );
          await page.locator('#wzResultCta a').click();
          const handoff = await page.evaluate(() =>
            JSON.parse(sessionStorage.getItem('hero_kv_lead'))
          );
          assert.equal(handoff.v, 1);
          assert.deepEqual(handoff.verbrauch, {
            kwh: 20000,
            eingabeWert: 20000,
            einheit: 'kwh',
            herkunft: 'own',
          });
          // Jahr 0 aus echter Serverrechnung über die Tastatur, keine manipulierte Ergebnis-Payload.
          await page.locator('#wzEditInputs').click();
          await page.locator('#wzNext').click();
          await page.locator('#invWP').focus();
          await page.keyboard.press('Home');
          await page.locator(fuel === 'gas' ? '#gasInvest' : '#oelInvest').focus();
          await page.keyboard.press('End');
          await settled(page);
          await page.locator('#wzNext').click();
          await page.locator('#wzNext').click();
          await page.locator('#wzNext').click();
          await settled(page);
          assert.equal(await page.evaluate(() => KV_STATE.last.ergebnis.breakEvenSofort), true);
          assert.match(await page.locator('#wzHero').innerText(), /Bezahlt gemacht: sofort/);
        },
        options
      );
    }
} catch (e) {
  rows.push({ name: 'Browser-Prüfaufbau', status: 'rot', fehler: e.stack || String(e) });
  console.error(e);
} finally {
  const green = rows.filter((r) => r.status === 'grün').length,
    red = rows.filter((r) => r.status === 'rot').length;
  const sourceHashes = {};
  for (const file of [
    'kostenvergleich-waermepumpe.html',
    'api/rechner-kv-adapter.php',
    'reports/t1247/browser-und-bilder.mjs',
  ])
    sourceHashes[file] = createHash('sha256')
      .update(await fs.readFile(file))
      .digest('hex');
  const resultFile = 'reports/t1247/browser-ergebnisse.json';
  const previous = await fs
    .readFile(resultFile, 'utf8')
    .then(JSON.parse)
    .catch(() => null);
  const history = previous
    ? [
        ...(previous.history || []),
        Object.fromEntries(Object.entries(previous).filter(([key]) => key !== 'history')),
      ]
    : [];
  await fs.writeFile(
    resultFile,
    JSON.stringify(
      {
        stand: 'T1247 Auftrag 12',
        auswahl: nurMehrpreis ? '12 Mehrpreisfälle' : 'alle T1247-Fälle',
        zeit: new Date().toISOString(),
        green,
        red,
        images,
        sourceHashes,
        rows,
        history,
      },
      null,
      2
    ) + '\n'
  );
  console.log(`T1247 BROWSER: ${green} grün / ${red} rot, ${images.length} Bildschirmfotos`);
  process.exitCode = red ? 1 : 0;
  if (browser) await browser.close();
}
