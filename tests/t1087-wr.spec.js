'use strict';
/* global document, window, getComputedStyle */
const { test, expect, chromium, webkit } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { base, root, responses, serve } = require('./t1087-wr.cjs');
const {
  browser: priceBrowser,
  load: loadPrices,
  render: renderPrices,
} = require('./helpers/t1087-datenblatt.cjs');
const { expectedJaz, expectedFootnote, plain } = require('./helpers/t1087-jaz.cjs');

// GF-Freigabe T1245, Anpassung 8: nur benannte JAZ-Texte der Preistafel.
// Alttexte aus der eingefrorenen Basis, neue Erwartung aus der BWP-Quelldatei;
// kein Wort der gebauten Seite fließt in diese Erwartung ein.
async function t1245PriceReplacements() {
  const before = priceBrowser(base);
  await loadPrices(before, responses().preise);
  const replacements = {};
  for (const brand of ['wolf', 'vaillant']) {
    renderPrices(before, brand).details.forEach((detail, i) => {
      const model = detail.card.modell;
      const jaz = expectedJaz(model);
      if (!jaz) return;
      replacements['preise-' + brand + '-' + i] = [
        ...jaz.map(([label, value]) => ({
          name: 'JAZ-Beschriftung ' + model + ': ' + label,
          before: label + ' ' + detail.card.specs.find(([name]) => name === label)[1],
          after: label + ' ' + value,
        })),
        {
          name: 'JAZ-Fußnote ' + model,
          before: plain(detail.jazFootnote),
          after: expectedFootnote(model) + ' ' + plain(before.nodes.paScopFootnote.innerHTML),
        },
      ];
    });
  }
  return replacements;
}
function t1245PriceWords(value, replacements) {
  for (const replacement of replacements) {
    expect(value.split(replacement.before).length, replacement.name + ': genau ein Alttext').toBe(
      2
    );
    value = value.replace(replacement.before, replacement.after);
  }
  return value;
}

// T1245: ausschließlich diese neuen Klappen, über Inhalt und Elternknoten
// zugeordnet. Drei verschiedene JAZ-/Netzabsätze teilen denselben Kartentitel.
const T1245_COST_SUMMARIES = {
  einzelposten: 'Einzelposten der Hochrechnung',
  jaz: 'Hintergrund zu Neue Wärmepumpe',
  jazwert: 'Hintergrund zu Neue Wärmepumpe',
  netzentgelt: 'Hintergrund zu Neue Wärmepumpe',
  strom: 'Stromzähler und Photovoltaik',
};
function t1245CostSections(key, width) {
  if (key.startsWith('docs/')) return [];
  return width <= 760 && !/-(?:start|schritt-1)-klappzustaende$/.test(key)
    ? ['einzelposten', 'jaz', 'jazwert', 'netzentgelt', 'strom']
    : ['einzelposten', 'strom'];
}
async function t1245CostCapture(page, details, options) {
  const payload = responses();
  const response = payload.kostenvergleich;
  const captured = await page.evaluate(
    (options) => {
      function section(el) {
        if (el.parentElement.id === 'pathSummary') return 'einzelposten';
        if (el.parentElement.id !== 'wzWpCard') return '';
        if (el.querySelector(':scope > .inhalt > #jazGrundlagen')) return 'jaz';
        if (el.querySelector(':scope > .inhalt > #jazWert')) return 'jazwert';
        if (el.querySelector(':scope > .inhalt > #netzentgeltHinweis')) return 'netzentgelt';
        if (el.querySelector('#wpZaehler') && el.querySelector('#pvTog')) return 'strom';
        return '';
      }
      const nodes = Array.from(document.querySelectorAll('details'));
      const additions = nodes.flatMap((el, index) => {
        const name = section(el);
        return name
          ? [
              {
                index,
                section: name,
                summary: el.querySelector(':scope > summary').textContent,
                open: el.open,
              },
            ]
          : [];
      });
      const root = /** @type {HTMLElement} */ (document.querySelector(options.root));
      if (options.textContent) {
        // textContent umfasst auch geschlossene Inhalte. Nur genau die neuen
        // Elemente aus einer Kopie entfernen; das Original bleibt unangetastet.
        const clone = /** @type {HTMLElement} */ (root.cloneNode(true));
        clone.querySelectorAll('details').forEach((el) => {
          if (section(el)) el.remove();
        });
        return { additions, text: clone.textContent, inputs: [] };
      }
      /** @type {Set<HTMLElement>} */
      const hidden = new Set(additions.map(({ index }) => nodes[index]));
      const inputs = [];
      let legacyJaz = null;
      if (options.newInputs) {
        // Die beauftragten neuen Eingaben werden separat exakt zugesichert.
        // Für den alten Ganzseitenvergleich ersetzen sie nur den entfernten
        // JAZ-Regler; Investition, Laufzeit und alle anderen alten Texte bleiben.
        for (const [id, selector] of [
          ['heizsystem', '.selg'],
          ['grundpreisGas', '.sg'],
          ['startJahr', '.sg'],
          ['netzentgeltTog', '.tg'],
        ]) {
          const el = document.getElementById(id).closest(selector);
          inputs.push({ id, text: el.textContent.replace(/\s+/g, ' ').trim() });
          hidden.add(/** @type {HTMLElement} */ (el));
        }
        inputs.push({ id: 'jazWert', text: document.getElementById('jazWert').textContent });
        for (const id of ['jazWert', 'jazGrundlagen', 'netzentgeltHinweis'])
          hidden.add(document.getElementById(id));
        legacyJaz = document.createElement('div');
        legacyJaz.className = 'sg';
        // Historischer Regler einschließlich seines damals erzeugten Chips.
        // Gleiche Label-/Span-Struktur erhält auch die innerText-Trennstellen.
        legacyJaz.innerHTML =
          '<label>Jahresarbeitszahl (JAZ) <span class="v">' +
          options.legacyJaz +
          '</span><span class="wz-chip market">Marktannahme</span></label>';
        const heating = document.getElementById('heizsystem').closest('.selg');
        heating.before(legacyJaz);
      }
      if (options.packages) {
        for (const selector of ['.foerder-package-label', '#foerderWpTyp']) {
          const el = document.querySelector(selector);
          if (el) hidden.add(/** @type {HTMLElement} */ (el));
        }
      }
      const styles = Array.from(hidden, (el) => ({ el, style: el.getAttribute('style') }));
      try {
        for (const { el } of styles) el.setAttribute('style', 'display:none!important');
        let text = root.innerText;
        if (options.normalize) text = text.replace(/\s+/g, ' ').trim();
        return { additions, text, inputs };
      } finally {
        legacyJaz?.remove();
        for (const { el, style } of styles) {
          if (style === null) el.removeAttribute('style');
          else el.setAttribute('style', style);
        }
      }
    },
    {
      ...options,
      legacyJaz: payload.kv_bootstrap.defaults.jaz.toFixed(1).replace('.', ','),
    }
  );
  if (options.newInputs) {
    const ji = response.system.jazInfo;
    expect(captured.inputs, 'Neue Heizsystem-/Fixkosteneingaben und JAZ-Annahme exakt').toEqual([
      {
        id: 'heizsystem',
        text: 'Heizkörper oder Fußbodenheizung?Annahme: Heizkörper Bitte wählenHeizkörper oder gemischte AnlageNur Fußbodenheizung',
      },
      { id: 'grundpreisGas', text: 'Gas-Grundpreis in Euro pro Jahr' },
      { id: 'startJahr', text: 'Startjahr der Hochrechnung' },
      { id: 'netzentgeltTog', text: 'Zusätzlichen Gas-Netzentgeltpfad berücksichtigen' },
      {
        id: 'jazWert',
        text:
          'Aus 1 kWh Strom macht sie ' +
          response.system.jaz.toFixed(2).replace('.', ',') +
          ' kWh Wärme. ' +
          ji.annahme +
          (ji.heizsystemAnnahme ? ' Heizkörper als Annahme, bitte Heizsystem wählen.' : ''),
      },
    ]);
  }
  return { details, ...captured };
}
function t1245CostWords(before) {
  // Genau der beschlossene Gesetzeshinweis im sichtbaren Neuanlagenvergleich.
  return before.replace(
    'Hinweis: In Kommunen mit beschlossener Wärmeplanung (Großstädte wie Hannover) ist der Einbau einer neuen reinen Gas-/Ölheizung nach GEG §71 nur noch eingeschränkt bzw. mit steigendem EE-Anteil zulässig. Der Rechner rechnet zugunsten der fossilen Variante nur mit der Biotreppe.',
    'Für den Neuanlagenvergleich berücksichtigt der Rechner die Bio-Beimischpflicht nach GModG § 43 Abs. 1. Die Rechnung ist eine Prognose auf Basis der ausgewiesenen Annahmen.'
  );
}
// T1245, Anpassung 11: genau eine zusätzliche Heizsystem-Annahme.
// Eigene Angaben und jeder andere Textbestandteil bleiben exakt gleich.
function t1245OneMoreMarketAssumption(before, after) {
  const sentence = /\b(0|[1-9]\d*) eigene Angaben, (0|[1-9]\d*) marktübliche Annahmen\./g;
  const oldMatches = [...before.matchAll(sentence)];
  const newMatches = [...after.matchAll(sentence)];
  if (oldMatches.length !== 1 || newMatches.length !== 1) return before;
  const old = oldMatches[0],
    next = newMatches[0];
  const n = Number(old[2]),
    m = Number(next[2]);
  if (old[1] !== next[1] || !Number.isSafeInteger(n) || !Number.isSafeInteger(m) || m !== n + 1)
    return before;
  return before.replace(old[0], old[1] + ' eigene Angaben, ' + (n + 1) + ' marktübliche Annahmen.');
}
// T1245, Anpassung 12: nur der neue Bestandteile-Block im Regelfall.
function t1245WithoutBreakdown(text) {
  const start = 'Jährliche Ersparnis nach Bestandteilen als Tabelle anzeigen';
  const end = 'Was kostet Heizen pro Jahr?';
  expect(text.split(start).length, 'Genau ein Anfang des Bestandteile-Blocks').toBe(2);
  expect(text.split(end).length, 'Genau ein nachfolgender Heizkosten-Block').toBe(2);
  const begin = text.indexOf(start),
    next = text.indexOf(end);
  expect(next, 'Bestandteile-Block steht vor den Heizkosten').toBeGreaterThan(begin);
  return text.slice(0, begin) + text.slice(next);
}
async function t1245BreakdownCapture(page) {
  return page.locator('#cBreakDaten').evaluateAll((blocks) =>
    blocks.map((block) => ({
      tables: block.querySelectorAll('table').length,
      captions: Array.from(block.querySelectorAll('table caption'), (el) => el.textContent),
      headers: Array.from(block.querySelectorAll('table thead th'), (el) => el.textContent),
      rows: Array.from(block.querySelectorAll('table tbody tr'), (row) =>
        Array.from(row.children, (cell) => cell.textContent)
      ),
      total: Array.from(
        block.querySelectorAll(':scope > .mobile-year-answer > span'),
        (el) => el.textContent
      ),
    }))
  );
}
function expectT1245Breakdown(before, after) {
  expect(before, 'Basis: genau ein Bestandteile-Block').toHaveLength(1);
  expect(after, 'Bau: genau ein Bestandteile-Block').toHaveLength(1);
  expect(before[0].tables, 'Basis: genau eine Tabelle').toBe(1);
  expect(after[0].tables, 'Bau: genau eine Tabelle').toBe(1);
  expect(after[0].captions).toEqual([
    'Jährliche Ersparnis nach Bestandteilen, Werte je Jahr in Euro',
  ]);
  // Zehn Bestandteile-Spalten zusätzlich zur separat bezeichneten Jahres-Spalte.
  expect(after[0].headers).toEqual([
    'Jahr',
    'Energie und CO₂',
    'Bio-Aufschlag',
    'Wartungsdifferenz',
    'Gas-Grundpreis',
    'Schornsteinfeger',
    'Gas-Netzentgeltpfad',
    'Modul-1-Vorteil',
    'WP-Grundpreis',
    'Photovoltaik',
    'Warmwasserstrom',
  ]);
  expect(after[0].rows, 'Genau 20 Jahreszeilen').toHaveLength(20);
  expect(after[0].rows.map((row) => row[0])).toEqual(
    Array.from({ length: 20 }, (_, i) => String(2026 + i))
  );
  for (const row of after[0].rows)
    expect(row, 'Jahr plus zehn Bestandteile je Zeile').toHaveLength(11);
  expect(before[0].total, 'Basis: genau eine Gesamtersparnis-Zeile').toHaveLength(1);
  expect(after[0].total, 'Gesamtersparnis-Zeile unverändert').toEqual(before[0].total);
}
function expectT1245Cost(before, after, sections, legalHint = false) {
  expect(before.additions, 'Basis enthält keine T1245-Klappen').toEqual([]);
  expect(
    after.additions
      .map(({ section, summary, open }) => ({ section, summary, open }))
      .sort((a, b) => a.section.localeCompare(b.section)),
    'Genau die benannten neuen Klappen, jeweils geschlossen und eindeutig zugeordnet'
  ).toEqual(
    sections.map((section) => ({ section, summary: T1245_COST_SUMMARIES[section], open: false }))
  );
  const indexes = new Set(after.additions.map(({ index }) => index));
  expect(
    after.details.filter((_, index) => !indexes.has(index)),
    'Alle alten Klappen: Reihenfolge, Text und Zustand unverändert'
  ).toEqual(before.details);
  const expectedText = legalHint ? t1245CostWords(before.text) : before.text;
  expect(after.text, 'Übriger Seiten-/Ergebnistext exakt gleich').toBe(
    sections.includes('strom')
      ? t1245OneMoreMarketAssumption(expectedText, after.text)
      : expectedText
  );
}
async function t1245StepFiveCapture(page, details, build) {
  return t1245CostCapture(page, details, { root: 'body', newInputs: build });
}
function expectT1245StepFive(before, after) {
  expectT1245Cost(before, after, ['einzelposten', 'jaz', 'jazwert', 'netzentgelt', 'strom']);
}
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
    // Nur die Aufnahme stabilisieren; die fachlichen Prüfungen laufen zuvor regulär.
    // Ein exaktes scrollY-Polling kann mit laufendem Wizard-Scrollen hängen bleiben.
    document.documentElement.style.setProperty('scroll-behavior', 'auto', 'important');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
  });
  const folder = path.join(root, 'artifacts/tafel-sicht/wr', process.env.WR_REF ? 'rot' : 'gruen');
  fs.mkdirSync(folder, { recursive: true });
  const file = path.join(folder, name + '.png');
  await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
  await testInfo.attach(name, { path: file, contentType: 'image/png' });
}
// Die Basis kann Pfeil/Transition außerhalb des sichtbaren Bereichs verzögert malen.
// Auf den fertigen Renderzustand warten, niemals auf den erwarteten Überlaufwert.
async function settlePriceDetail(page, index) {
  const panel = page.locator('#paDetail');
  await expect(panel).toBeVisible();
  await expect(page.locator('.pa-card.zoomed')).toHaveAttribute('data-idx', String(index));
  await panel.scrollIntoViewIfNeeded();
  await page.evaluate(async () => {
    await document.fonts.ready;
    const img = document.getElementById('paImg');
    if (img instanceof window.HTMLImageElement) {
      img.loading = 'eager';
      await img.decode().catch(() => {});
    }
  });
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const panel = document.getElementById('paDetail');
          const cards = document.getElementById('paCards');
          const arrow = document.getElementById('paDetailArrow');
          const sample = () => {
            const style = getComputedStyle(arrow);
            const rect = panel.getBoundingClientRect();
            return {
              geometry: JSON.stringify([
                rect.toJSON(),
                arrow.getBoundingClientRect().toJSON(),
                cards.scrollLeft,
                arrow.style.left,
                style.left,
              ]),
              visible:
                rect.bottom > 0 &&
                rect.top < window.innerHeight &&
                getComputedStyle(panel).opacity === '1',
              positioned:
                arrow.style.left !== '' &&
                Math.abs(parseFloat(style.left) - parseFloat(arrow.style.left)) < 0.05,
              animations: [panel, cards].flatMap((el) =>
                el
                  .getAnimations({ subtree: true })
                  // Dauerhafte CTA-Leuchteffekte haben keinen Endzustand und ändern
                  // die gemessene Panel-/Pfeilgeometrie nicht.
                  .filter((animation) => animation.effect?.getComputedTiming().endTime !== Infinity)
                  .filter((animation) => animation.pending || animation.playState === 'running')
                  .map((animation) => ({
                    state: animation.playState,
                    pending: animation.pending,
                    time: animation.currentTime,
                    timing: animation.effect?.getTiming(),
                  }))
              ),
            };
          };
          const before = sample();
          await new Promise((resolve) => window.requestAnimationFrame(resolve));
          await new Promise((resolve) => window.requestAnimationFrame(resolve));
          const after = sample();
          return {
            visible: after.visible,
            positioned: after.positioned,
            animations: after.animations,
            stable: before.geometry === after.geometry,
          };
        }),
      {
        timeout: 15000,
        message: 'Detail sichtbar, Pfeil positioniert, Animationen/Geometrie fertig',
      }
    )
    .toEqual({ visible: true, positioned: true, animations: [], stable: true });
}
// calculate/goStep planen die mobile Aufbereitung im nächsten Renderframe ein.
// Erst diesen Arbeitsgang abschließen, dann dessen Initialisierungszustand prüfen.
async function settleCostComparison(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
  });
  await page.waitForFunction(() => {
    const mobile = window.matchMedia('(max-width:760px)').matches;
    return Array.from(document.querySelectorAll('details'))
      .filter((el) => el.hasAttribute('data-mobile-collapsed'))
      .every((el) => (mobile ? el.dataset.mobileInitialized === '1' : el.open));
  });
  return page.locator('details').evaluateAll((nodes) =>
    nodes.map((el) => ({
      id: el.id,
      summary: el.querySelector(':scope > summary')?.textContent,
      open: el.open,
    }))
  );
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
            await settlePriceDetail(page, i);
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
        const jazReplacements = await t1245PriceReplacements();
        async function capture(url, version) {
          const result = {};
          async function words(key) {
            if (key.includes('kostenvergleich')) {
              const snapshot = await t1245CostCapture(page, await settleCostComparison(page), {
                root: 'body',
                normalize: true,
                packages: true,
                newInputs: version === 'bau' && !key.startsWith('docs/'),
              });
              result[key + '-klappzustaende'] = snapshot;
              result[key] = snapshot.text;
            }
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
            if (!key.includes('kostenvergleich'))
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
              await settlePriceDetail(page, i);
              await words('preise-' + brand + '-' + i);
              if (width === 375 && i === 4) {
                const geometry = await page.locator('#paDetail').evaluate((el) => {
                  const arrow = document.getElementById('paDetailArrow'),
                    before = el.scrollWidth;
                  const old = arrow.style.display;
                  arrow.style.display = 'none';
                  const without = el.scrollWidth;
                  arrow.style.display = old;
                  return { before, without, width: el.clientWidth };
                });
                if (version === 'basis')
                  expect(geometry.before, 'P3 Basis Überlauf').toBeGreaterThan(geometry.width);
                else expect(geometry.before, 'P3 Kopf ohne Überlauf').toBe(geometry.width);
                expect(geometry.without, 'P3 isolierte Pfeil-Gegenprobe').toBe(geometry.width);
                console.log(
                  'WR P3',
                  JSON.stringify({
                    browser: name,
                    viewport: width,
                    version,
                    brand,
                    repetition: testInfo.repeatEachIndex + 1,
                    ...geometry,
                  })
                );
                await testInfo.attach('P3-' + version + '-' + brand, {
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
            await settleCostComparison(page);
            await page.evaluate(() =>
              document.querySelectorAll('#results details').forEach((el) => {
                if (el.parentElement.id !== 'pathSummary') el.setAttribute('open', '');
              })
            );
            await page.waitForFunction(() =>
              Array.from(document.getElementById('results').querySelectorAll('details')).every(
                (el) => (el.parentElement.id === 'pathSummary' ? !el.open : el.open)
              )
            );
            const snapshot = await t1245CostCapture(page, await settleCostComparison(page), {
              root: '#results',
              textContent: true,
            });
            if (!file.startsWith('docs/')) {
              result[file + '-bestandteile'] = await t1245BreakdownCapture(page);
              snapshot.text = t1245WithoutBreakdown(snapshot.text);
            }
            result[file + '-results-klappzustaende'] = snapshot;
            result[file + '-results'] = snapshot.text;
            await screenshot(page, label + '-' + version + '-' + path.basename(file), testInfo);
          }
          return result;
        }
        try {
          const before = await capture(baselineServer.url, 'basis');
          const after = await capture(server.url, 'bau');
          // Freigegeben: Herstellername sowie die benannten JAZ-Fußnoten und -Beschriftungen.
          for (const [key, value] of Object.entries(before)) {
            if (key.endsWith('-klappzustaende')) {
              expectT1245Cost(
                value,
                after[key],
                t1245CostSections(key, width),
                !key.startsWith('docs/')
              );
            } else if (key.endsWith('-bestandteile')) {
              expectT1245Breakdown(value, after[key]);
            } else if (typeof value === 'string')
              expect(after[key], key).toBe(
                t1245PriceWords(
                  key.startsWith('kostenvergleich-waermepumpe.html')
                    ? t1245OneMoreMarketAssumption(t1245CostWords(value), after[key])
                    : value,
                  jazReplacements[key] || []
                ).replaceAll('Vaillant Deutschland GmbH & Co. KG', 'Vaillant GmbH')
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

const nachauftragBase = '0ea2c8f0f970c11e8fd163e54c47af64ff4538c6';
for (const [name, type] of Object.entries({ chromium, webkit })) {
  test('@smoke WR Nachauftrag 1 Themen ' + name, async ({}, testInfo) => {
    test.setTimeout(120000);
    const beforeServer = await serve(nachauftragBase);
    const { browser, page, errors } = await setup(type, 375);
    const captures = {};
    const folder = path.join(root, 'artifacts/tafel-sicht/wr/nachauftrag1');
    fs.mkdirSync(folder, { recursive: true });
    try {
      for (const [version, url] of Object.entries({
        vorher: beforeServer.url,
        nachher: server.url,
      })) {
        captures[version] = {};
        for (const width of [375, 1440]) {
          await page.setViewportSize({ width, height: 900 });
          for (const initial of ['dark', 'light']) {
            await page.goto(url + '/foerderung.html?theme=' + initial);
            await page.evaluate('paLoadData()');
            for (let change = 0; change < 3; change++) {
              if (change)
                await page
                  .locator('[data-theme-toggle]')
                  .first()
                  .evaluate((el) => el.click());
              const theme = await page.locator('html').getAttribute('data-theme');
              for (const brand of ['wolf', 'vaillant']) {
                await page.evaluate(
                  (brand) => window.eval('foerderSelectPackage(' + JSON.stringify(brand) + ',"s")'),
                  brand
                );
                const select = page.locator('#foerderWpTyp');
                await page.keyboard.press('Tab');
                await select.focus();
                await expect(select).toBeFocused();
                await page.evaluate(async () => {
                  await document.fonts.ready;
                  await new Promise((resolve) => window.requestAnimationFrame(resolve));
                });
                const measurement = await select.evaluate((el) => {
                  const native = getComputedStyle(el);
                  const overlay = document.querySelector('.foerder-package-label');
                  const label = getComputedStyle(overlay);
                  const options = Array.from(el.querySelectorAll('option,optgroup'), (opt) => ({
                    color: getComputedStyle(opt).color,
                    background: getComputedStyle(opt).backgroundColor,
                    text: opt.textContent,
                  }));
                  return {
                    color: native.color,
                    labelColor: label.color,
                    labelDisplay: label.display,
                    // Bei outline-style:none ist currentColor keine gezeichnete Fokusfarbe.
                    outline: [
                      native.outlineStyle === 'none' ? null : native.outlineColor,
                      native.outlineStyle,
                      native.outlineWidth,
                    ],
                    focusVisible: el.matches(':focus-visible'),
                    boxShadow: native.boxShadow,
                    border: [native.borderColor, native.borderStyle, native.borderWidth],
                    options,
                    text: el.selectedOptions[0].textContent,
                    labelText: overlay.textContent,
                    width: el.getBoundingClientRect().width,
                    height: el.getBoundingClientRect().height,
                  };
                });
                const key = [width, initial, change, theme, brand].join('-');
                captures[version][key] = measurement;
                const mobileVaillant = width === 375 && brand === 'vaillant';
                if (mobileVaillant) {
                  expect(measurement.labelDisplay).toBe('block');
                  expect(measurement.labelColor).not.toBe('rgba(0, 0, 0, 0)');
                  expect(measurement.labelText.replace(/\s+/g, ' ')).toBe(measurement.text);
                  const transparent = version === 'nachher' || theme === 'dark';
                  expect(measurement.color === 'rgba(0, 0, 0, 0)', version + '-' + key).toBe(
                    transparent
                  );
                  for (const option of measurement.options) {
                    expect(option.color).not.toBe('rgba(0, 0, 0, 0)');
                    expect(option.color).not.toBe(option.background);
                  }
                  const file = path.join(folder, name + '-' + version + '-' + key + '.png');
                  await page.locator('.foerder-package-field').screenshot({ path: file });
                  await testInfo.attach(path.basename(file), {
                    path: file,
                    contentType: 'image/png',
                  });
                } else {
                  expect(measurement.labelDisplay).toBe('none');
                  expect(measurement.color).not.toBe('rgba(0, 0, 0, 0)');
                }
                // Nativer Auswahlwechsel, einschließlich unveränderter Optionsliste.
                await select.selectOption(brand + ':m');
                await expect(select).toHaveValue(brand + ':m');
                if (mobileVaillant)
                  expect(await page.locator('.foerder-package-label').textContent()).toBe(
                    await select.evaluate((el) => el.selectedOptions[0].textContent)
                  );
                if (version === 'nachher') {
                  const expected = { ...captures.vorher[key] };
                  if (mobileVaillant) expected.color = 'rgba(0, 0, 0, 0)';
                  expect(measurement, 'Nur native mobile Vaillant-Farbe: ' + key).toEqual(expected);
                }
              }
            }
          }
        }
      }
      expect(errors).toEqual([]);
    } finally {
      const file = path.join(folder, name + '-farben.json');
      fs.writeFileSync(file, JSON.stringify(captures, null, 2));
      await testInfo.attach(name + '-farben', { path: file, contentType: 'application/json' });
      await browser.close();
      await beforeServer.close();
    }
  });
}
for (let repetition = 1; repetition <= 10; repetition++) {
  test('@smoke WR Nachauftrag 1 WebKit 375 Schritt 5 Wiederholung ' + repetition, async () => {
    test.setTimeout(90000);
    const beforeServer = await serve(nachauftragBase);
    const { browser, page, errors } = await setup(webkit, 375);
    const captures = [];
    try {
      for (const url of [beforeServer.url, server.url]) {
        await page.goto(url + '/kostenvergleich-waermepumpe.html');
        await page.waitForFunction('typeof KV_STATE!=="undefined"&&KV_STATE.last');
        await page.locator('[data-wz-heizart="gas"]').click();
        await page.locator('[data-wz-grp="vmode"][data-wz-val="known"]').click();
        await page.locator('[data-wz-grp="altgas"][data-wz-val="ja"]').click();
        for (let step = 1; step <= 5; step++) {
          await page.evaluate('calculate({showResults:false,scroll:false})');
          const details = await settleCostComparison(page);
          if (step === 5) {
            await expect(page.locator('.wz-herocalc')).toHaveCount(1);
            await expect(page.locator('.wz-herocalc')).toBeHidden();
            await expect(
              page.locator('summary').filter({ hasText: 'So entsteht dein Ergebnis' })
            ).toBeVisible();
            captures.push(await t1245StepFiveCapture(page, details, url === server.url));
          } else await page.locator('#wzNext').click();
        }
      }
      expectT1245StepFive(captures[0], captures[1]);
      expect(errors).toEqual([]);
    } finally {
      await browser.close();
      await beforeServer.close();
    }
  });
}
