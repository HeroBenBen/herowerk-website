// Echte Seiten im lokalen WebKit. Keine externen Anfragen und keine Tabellenwrites.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { webkit } from 'playwright';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prices = JSON.parse(await fs.readFile(path.join(root, 'tests/fixtures/t1087-preise.json')));
const selected = {
  wolf: prices.wolf.map((r) => ({ ...r, tafel: 'ja' })),
  vaillant: prices.vaillant
    .slice(3, 5)
    .concat(
      prices.vaillant.slice(5).map((r, i) => ({
        ...r,
        brutto: prices.vaillant[i].brutto,
        eigen: prices.vaillant[i].eigen,
      }))
    )
    .map((r) => ({ ...r, tafel: 'ja' })),
};
const browser = await webkit.launch({ headless: true });
let passed = 0;
try {
  for (const scenario of ['erfolg', 'ausfall', 'markerfehler']) {
    for (const name of ['preise', 'foerderung']) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        if (url.origin !== 'http://t1087.local') return route.abort();
        if (url.pathname.startsWith('/api/rechner')) {
          if (url.searchParams.get('action') !== 'preise') return route.fulfill({ json: {} });
          if (scenario === 'ausfall')
            return route.fulfill({ status: 503, json: { error: 'Testausfall' } });
          const data = structuredClone(selected);
          if (scenario === 'markerfehler') data.vaillant[2].tafel = '';
          return route.fulfill({ json: data });
        }
        let relative = decodeURIComponent(url.pathname).replace(/^\//, '');
        if (!path.extname(relative)) relative += '.html';
        const file = path.resolve(root, relative);
        if (!file.startsWith(root + path.sep)) return route.abort();
        try {
          const types = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
          };
          return await route.fulfill({
            body: await fs.readFile(file),
            contentType: types[path.extname(file)],
          });
        } catch {
          return route.fulfill({ status: 404, body: '' });
        }
      });
      await page.goto('http://t1087.local/' + name, { waitUntil: 'load' });
      // Die Initialisierung rendert erst nach Abschluss des Preisabrufs.
      if (name === 'preise') {
        await page.locator('.pa-card').first().waitFor();
        await page.locator('#manufacturerVaillant').click();
        for (let i = 0; i < 3; i++) {
          const card = page.locator('.pa-card').nth(i);
          const text = await card.innerText();
          assert.match(text, /aroTHERM pro VWL/);
          assert.doesNotMatch(text, /kW|W35|W55|A-7|A-11/);
          assert.doesNotMatch(text, /8\.1|A-7\/W35/);
          if (scenario === 'erfolg') {
            assert.ok(text.includes(prices.vaillant[i].brutto.toLocaleString('de-DE')));
            assert.ok(text.includes(prices.vaillant[i].eigen.toLocaleString('de-DE')));
          } else assert.match(text, /Auf Anfrage/);
        }
        await page.waitForFunction(() =>
          document.querySelector('#paSpecsSub')?.textContent.includes('7.1')
        );
        const specs = await page.locator('#paSpecsTable').innerText();
        assert.equal(specs.trim(), '');
        assert.doesNotMatch(specs, /SCOP|JAZ|A-7\/W35/);
      } else {
        // Den echten Abrufpfad einschließlich Retry vollständig abwarten.
        await page.evaluate(async () => {
          await paLoadData();
        });
        for (let i = 0; i < 3; i++) {
          const option = page.locator(
            '#foerderWpTyp option[value="vaillant:' + ['s', 'm', 'l'][i] + '"]'
          );
          assert.equal(await option.getAttribute('data-price'), String(prices.vaillant[i].brutto));
          assert.match(await option.textContent(), /aroTHERM pro VWL/);
          assert.doesNotMatch(await option.textContent(), /8\.1|A-7\/W35/);
        }
      }
      assert.deepEqual(errors, [], name + ': JavaScript-Laufzeitfehler');
      console.log('PASS WebKit ' + name + ': ' + scenario);
      passed++;
      await page.close();
    }
  }
} finally {
  await browser.close();
}
console.log(passed + '/6 grün: echte Seiten, Erfolg, Abrufausfall und Markerfehler');
