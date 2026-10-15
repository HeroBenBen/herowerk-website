'use strict';
/* global sessionStorage */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures/a11-oeffentliche-antworten.json'), 'utf8')
);
const repo = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(repo, 'api/rechner.php'), 'utf8');
const filter = source.slice(
  source.indexOf('const RECHNER_INNENFELDER_SPERREN'),
  source.indexOf('$rawQuery =')
);
function project(value, prices = false, selectedFilter = filter) {
  const program = `require $argv[1]; eval($argv[2]); $value=json_decode(stream_get_contents(STDIN),true); try { ${prices ? '$value=hw_oeffentliche_preistexte($value);' : ''} echo json_encode(['status'=>200,'value'=>rechner_innenfelder_entfernen($value)],JSON_THROW_ON_ERROR); } catch (RechnerOeffentlicheAntwortException $e) { echo json_encode(['status'=>503,'value'=>['error'=>true,'message'=>'calculator_temporarily_unavailable']]); }`;
  return JSON.parse(
    execFileSync(
      'php',
      ['-r', program, path.join(repo, 'api/rechner-engine.php'), selectedFilter],
      {
        input: JSON.stringify(value),
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    )
  );
}
test.beforeEach(async ({ page }) => {
  // Keine externen Analyse-, Formular- oder Einwilligungsdienste in dieser Vertragsprobe.
  await page.route('**/*', (route) => {
    const host = new URL(route.request().url()).hostname;
    return ['127.0.0.1', 'localhost'].includes(host) ? route.continue() : route.abort();
  });
});
for (const unknown of [false, true]) {
  test(
    '@smoke A11 Tafel und Förderauswahl bleiben gleich: ' +
      (unknown ? 'unbekannt ohne kw' : 'Herstellerwerte'),
    async ({ page }) => {
      const before = JSON.parse(JSON.stringify(fixture.preise));
      if (unknown) before.vaillant[2].modell = 'Vaillant unbekanntes Modell';
      const after = project(before, true);
      expect(after.status).toBe(200);
      if (unknown) expect(after.value.vaillant[2]).not.toHaveProperty('kw');
      let response = before;
      await page.route(/[?&]action=preise/, (route) => route.fulfill({ json: response }));
      async function view() {
        await page.goto('/preise.html');
        await page.evaluate('paLoadData()');
        const captured = {};
        for (const brand of ['Wolf', 'Vaillant']) {
          await page.locator('#manufacturer' + brand).click();
          await expect(page.locator('#paCards .pa-card')).toHaveCount(5);
          const detail = [];
          for (let i = 0; i < 5; i++) {
            await page.locator('#paCards .pa-card').nth(i).click();
            detail.push(await page.locator('#paSpecsSub').textContent());
            detail.push(await page.locator('#paSpecsTable').innerHTML());
            detail.push(await page.locator('#paDetailCta').innerHTML());
          }
          captured[brand] = { cards: await page.locator('#paCards').innerText(), detail };
        }
        await page.goto('/foerderung.html');
        await page.evaluate('paLoadData()');
        captured.options = await page.locator('#foerderWpTyp option').allTextContents();
        return captured;
      }
      const a = await view();
      response = after.value;
      const b = await view();
      expect(b).toEqual(a);
      if (unknown) {
        expect(b.Vaillant.cards).toContain('Vaillant unbekanntes Modell');
        expect(b.Vaillant.cards).toContain('7.544 €');
        expect(b.options).toContain('Vaillant unbekanntes Modell · 29.944 €');
      }
    }
  );
}
test('@smoke A11 tragender Modelltext verwendet vorhandenen Preisfehler', async ({ page }) => {
  const input = JSON.parse(JSON.stringify(fixture.preise));
  input.vaillant[2].modell = 'Vaillant unbekannt A-11/W55';
  const response = project(input, true);
  expect(response.status).toBe(503);
  await page.route(/[?&]action=preise/, (route) =>
    route.fulfill({ status: response.status, json: response.value })
  );
  await page.goto('/preise.html');
  await page.evaluate('paLoadData()');
  await page.locator('#manufacturerVaillant').click();
  await expect(page.locator('#paCards')).toContainText('Auf Anfrage');
  await expect(page.locator('#paCards')).not.toContainText('A-11');
  await page.locator('#paCards .pa-card').nth(1).click();
  await expect(page.locator('#paDetailCta')).toContainText('Individuelles Angebot');
});
test('@smoke A11 Dimensionierung: Leistung fehlt, Hinweis entfällt einzeln, tragender Fehler neutral', async ({
  page,
}) => {
  let response = { status: 200, value: fixture.dimensionierung };
  await page.route(/[?&]action=dimensionierung/, (route) =>
    route.fulfill({ status: response.status, json: response.value })
  );
  await page.goto('/dimensionierung.html');
  async function calculate() {
    await page.evaluate(
      `document.querySelector('.wizard-step[data-step="8"] .wizard-options .wizard-option').classList.add('selected'); wizData.verbrauchKnown=false; wizCalculate()`
    );
    return page.locator('#wizResultCards').innerHTML();
  }
  const before = await calculate();
  response = project(fixture.dimensionierung);
  const after = await calculate();
  expect(after).toBe(before);
  const hint = JSON.parse(JSON.stringify(fixture.dimensionierung));
  hint.strom_hinweis = '18,9 kW (A-11/W55)';
  response = project(hint);
  expect(response.status).toBe(200);
  expect(response.value).not.toHaveProperty('strom_hinweis');
  await calculate();
  await expect(page.locator('#wizResultCards')).toContainText(
    'Warmwasser braucht eine höhere Temperatur'
  );
  await expect(page.locator('#wizResultCards')).toContainText('48.815');
  hint.marken.wolf.modell = 'Wolf A-11/W35';
  response = project(hint);
  expect(response.status).toBe(503);
  await calculate();
  await expect(page.locator('#wizResultTitle')).toHaveText('Berechnung gerade nicht verfügbar');
  await expect(page.locator('#wizResultCards')).toContainText(
    'Bitte Beratung anfragen. Wir melden uns mit einer individuellen Einschätzung.'
  );
  await expect(page.locator('#wizResultCards')).not.toContainText('A-11');
});

for (const width of [375, 1280]) {
  test(`@smoke A11 Nachauftrag: vier Seiten ohne Puffer wortgleich, ${width}px`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width, height: 900 });
    const reference = 'e359ec7d28d462cd97ae6af78c4e262a40182d4d';
    const oldFixture = JSON.parse(
      execFileSync('git', ['show', reference + ':tests/fixtures/a11-oeffentliche-antworten.json'], {
        cwd: repo,
        encoding: 'utf8',
      })
    );
    const oldSource = execFileSync('git', ['show', reference + ':api/rechner.php'], {
      cwd: repo,
      encoding: 'utf8',
    });
    const oldFilter = oldSource.slice(
      oldSource.indexOf('const RECHNER_INNENFELDER_SPERREN'),
      oldSource.indexOf('$rawQuery =')
    );
    const engine = require('../apps-script/rechner-backend/kv_engine.gs');
    const values = {
      preise: oldFixture.preise,
      dimensionierung: oldFixture.dimensionierung,
      kv_bootstrap: engine.kvBootstrapPayload(engine.KV_PARAMS_SEED),
      kostenvergleich: engine.kvCalculate({ ...engine.KV_DEFAULTS }, engine.KV_PARAMS_SEED),
    };
    const before = {},
      after = {};
    for (const [action, input] of Object.entries(values)) {
      const program = `require $argv[1]; eval($argv[2]); $v=json_decode(stream_get_contents(STDIN),true); ${action === 'preise' ? '$v=hw_oeffentliche_preistexte($v);' : ''} echo json_encode(rechner_innenfelder_entfernen($v), JSON_THROW_ON_ERROR);`;
      before[action] = JSON.parse(
        execFileSync('php', ['-r', program, path.join(repo, 'api/rechner-engine.php'), oldFilter], {
          input: JSON.stringify(input),
          encoding: 'utf8',
        })
      );
      const result = project(before[action]);
      expect(result.status).toBe(200);
      after[action] = result.value;
    }
    expect(before.dimensionierung.marken.vaillant.puffer.liter).toBeGreaterThan(0);
    expect(after.dimensionierung.marken.vaillant).not.toHaveProperty('puffer');
    let responses = before;
    await page.route(/\/api\/rechner(?:\.php)?\??/, (route) => {
      const action = new URL(route.request().url()).searchParams.get('action');
      return responses[action]
        ? route.fulfill({ json: responses[action] })
        : route.fulfill({ json: {} });
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    async function capture() {
      const result = {};
      await page.goto('/dimensionierung.html');
      await page.evaluate(
        `document.querySelector('.wizard-step[data-step="8"] .wizard-options .wizard-option').classList.add('selected'); wizData.verbrauchKnown=false; wizCalculate()`
      );
      await expect(page.locator('#wizResultCards')).toContainText('48.815');
      result.dimensionierung = await page.locator('body').innerText();
      await page.evaluate('wizToFoerder()');
      await page.waitForURL(/foerderung/);
      await page.evaluate('paLoadData()');
      await page.evaluate('calculateFoerder()');
      result.vorbefuellung = await page.evaluate(() => sessionStorage.getItem('hwFoerderPrefill'));
      result.foerderung = await page.locator('body').innerText();
      await page.goto('/kostenvergleich-waermepumpe.html');
      await page.waitForFunction('typeof KV_STATE !== "undefined" && KV_STATE.last');
      await page.evaluate('calculate({showResults:true,scroll:false})');
      await expect(page.locator('#results')).toBeVisible();
      result.kostenvergleich = await page.locator('body').innerText();
      result.ratgeber = await page.locator('#wzPufferCard').innerText();
      await page.goto('/preise.html');
      await page.evaluate('paLoadData()');
      result.preise = {};
      for (const brand of ['Wolf', 'Vaillant']) {
        await page.locator('#manufacturer' + brand).click();
        await expect(page.locator('#paCards .pa-card')).toHaveCount(5);
        const details = [];
        for (let i = 0; i < 5; i++) {
          await page.locator('#paCards .pa-card').nth(i).click();
          details.push(
            await page.locator('#paSpecsTable').innerText(),
            await page.locator('#paDetailCta').innerText()
          );
        }
        result.preise[brand] = { text: await page.locator('body').innerText(), details };
      }
      return result;
    }
    const a = await capture();
    responses = after;
    const b = await capture();
    await testInfo.attach('Wortlaut vorher und nachher', {
      body: JSON.stringify({ vorher: a, nachher: b }, null, 2),
      contentType: 'application/json',
    });
    if (process.env.A11_BROWSER_EVIDENCE_DIR)
      fs.writeFileSync(
        path.join(process.env.A11_BROWSER_EVIDENCE_DIR, `wortlaut-${width}.json`),
        JSON.stringify({ vorher: a, nachher: b }, null, 2)
      );
    expect(b).toEqual(a);
    expect(errors).toEqual([]);
  });
}

for (const width of [375, 1280]) {
  test(`@smoke A11 Nachauftrag 2: interne A-11-Texte lassen Geräte sichtbar, ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const oldSource = execFileSync(
      'git',
      ['show', '2abe040f235b4fe50212518f599e0946b46da364:api/rechner.php'],
      { cwd: repo, encoding: 'utf8' }
    );
    const oldFilter = oldSource.slice(
      oldSource.indexOf('const RECHNER_INNENFELDER_SPERREN'),
      oldSource.indexOf('$rawQuery =')
    );
    const normal = project(fixture.dimensionierung, false, oldFilter);
    const contaminated = JSON.parse(JSON.stringify(fixture.dimensionierung));
    for (const brand of Object.values(contaminated.marken)) {
      for (const device of [brand, ...brand.varianten]) {
        device.puffer = {
          bezeichnung: 'Speicher für A-11/W55',
          liter: '303 l bei A−11/W35',
          groessere_variante: 'Typ_A-11/W55',
        };
        device.leistung_kw = 'A‑11/W35';
      }
    }
    const oldFailure = project(contaminated, false, oldFilter);
    const repaired = project(contaminated);
    expect(normal.status).toBe(200);
    expect(oldFailure).toEqual({
      status: 503,
      value: { error: true, message: 'calculator_temporarily_unavailable' },
    });
    expect(repaired).toEqual(normal);
    let response = normal;
    await page.route(/[?&]action=dimensionierung/, (route) =>
      route.fulfill({ status: response.status, json: response.value })
    );
    await page.goto('/dimensionierung.html');
    async function calculate() {
      await page.evaluate(
        `document.querySelector('.wizard-step[data-step="8"] .wizard-options .wizard-option').classList.add('selected'); wizData.verbrauchKnown=false; wizCalculate()`
      );
      return {
        title: await page.locator('#wizResultTitle').innerText(),
        cards: await page.locator('#wizResultCards').innerText(),
      };
    }
    const before = await calculate();
    expect(before.cards).toContain('48.815');
    expect(before.cards).toContain('Vaillant');
    response = oldFailure;
    const broken = await calculate();
    expect(broken.title).toBe('Berechnung gerade nicht verfügbar');
    response = repaired;
    const after = await calculate();
    expect(after).toEqual(before);
    expect(after.cards).not.toContain('A-11');
    const evidence = JSON.stringify(
      { unbelastet: before, alterFehler: broken, korrigiert: after },
      null,
      2
    );
    await testInfo.attach('A11 innerhalb von Innenfeldern', {
      body: evidence,
      contentType: 'application/json',
    });
    if (process.env.A11_BROWSER_EVIDENCE_DIR)
      fs.writeFileSync(
        path.join(process.env.A11_BROWSER_EVIDENCE_DIR, `na2-innenfelder-${width}.json`),
        evidence
      );
  });
}
