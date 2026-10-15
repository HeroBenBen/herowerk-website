'use strict';
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
function project(value, prices = false) {
  const program = `require $argv[1]; eval($argv[2]); $value=json_decode(stream_get_contents(STDIN),true); try { ${prices ? '$value=hw_oeffentliche_preistexte($value);' : ''} echo json_encode(['status'=>200,'value'=>rechner_innenfelder_entfernen($value)],JSON_THROW_ON_ERROR); } catch (RechnerOeffentlicheAntwortException $e) { echo json_encode(['status'=>503,'value'=>['error'=>true,'message'=>'calculator_temporarily_unavailable']]); }`;
  return JSON.parse(
    execFileSync('php', ['-r', program, path.join(repo, 'api/rechner-engine.php'), filter], {
      input: JSON.stringify(value),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
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
