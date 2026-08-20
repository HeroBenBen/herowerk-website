// Sonde fuer den Hinweis an der Verbrauchseingabe (Vorgang T575).
// Faehrt den Rechner-Assistenten wie ein Kunde durch, einmal mit bestehender Waermepumpe und
// einmal mit Gas als Gegenprobe, und liest ab, ob der Hinweis erscheint.
//
// Aufruf aus dem Bestandsverzeichnis:
//   node tests/sonden/hinweis-verbrauchseingabe-sonde.mjs "$PWD" /pfad/fuer/bildschirmfotos
//
// NICHT in der npm-Pruefkette: sie braucht einen Browser und laeuft von Hand. Wer den Hinweis
// aendert, faehrt sie erneut. Fallstrick, der beim Bau eine Stunde gekostet hat: manche Schritte
// springen nach der Auswahl von ALLEIN weiter (Auto-Advance, 250 ms). Wer danach zusaetzlich auf
// Weiter klickt, ueberspringt einen Schritt und misst einen anderen Kundenfall als gemeint.
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const wurzel = process.argv[2];
const TYPEN = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
};
const server = createServer(async (req, res) => {
  const roh = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let datei = path.join(wurzel, roh);
  if (!datei.startsWith(wurzel)) return res.writeHead(403).end();
  if (!existsSync(datei) && existsSync(datei + '.html')) datei += '.html';
  if (!existsSync(datei) || datei.endsWith('/')) return res.writeHead(404).end();
  res.writeHead(200, { 'Content-Type': TYPEN[path.extname(datei)] || 'application/octet-stream' });
  res.end(await readFile(datei));
});
await new Promise((f) => server.listen(0, '127.0.0.1', f));
const basis = 'http://127.0.0.1:' + server.address().port;

async function lauf(heizungWert, andereWert) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  await page.route('**/api/rechner.php*', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  );
  await page.goto(basis + '/dimensionierung.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  const besuchte = [];
  for (let i = 0; i < 40; i++) {
    const schritt = await page.evaluate(() => {
      const s = document.querySelector('.wizard-step.active');
      return s ? parseInt(s.dataset.step) : null;
    });
    if (schritt === null) break;
    besuchte.push(schritt);
    let wahl = null;
    if (schritt === 15) break;
    const gewaehlt = await page.evaluate(
      ({ heizungWert, andereWert }) => {
        const s = document.querySelector('.wizard-step.active');
        const opts = [...s.querySelectorAll('.wizard-option')];
        if (!opts.length) return 'keine-optionen';
        const wunsch =
          opts.find((o) => o.dataset.value === heizungWert) ||
          (andereWert ? opts.find((o) => o.dataset.value === andereWert) : null);
        const ziel = wunsch || opts[0];
        ziel.click();
        const sel = [...s.querySelectorAll('.selected')].map((e) => e.dataset.value);
        return (
          ziel.dataset.value + (wunsch ? ' [gewollt]' : '') + ' selected=' + JSON.stringify(sel)
        );
      },
      { heizungWert, andereWert }
    );
    await page.evaluate(() => {
      const f = document.querySelector(
        '.wizard-step.active input[type="text"], .wizard-step.active input[type="tel"], .wizard-step.active input[inputmode="numeric"]'
      );
      if (f && !f.value) {
        f.value = '30159';
        f.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    wahl = gewaehlt;
    besuchte[besuchte.length - 1] = schritt + ':' + wahl;
    // Manche Schritte springen nach der Auswahl von allein weiter (Auto-Advance, 250 ms).
    // Erst abwarten, dann pruefen, ob der Schritt schon gewechselt hat; sonst schoebe ein
    // zusaetzlicher Klick auf Weiter den Assistenten um zwei Schritte vor.
    await page.waitForTimeout(450);
    const schrittJetzt = await page.evaluate(() => {
      const s = document.querySelector('.wizard-step.active');
      return s ? parseInt(s.dataset.step) : null;
    });
    if (schrittJetzt !== schritt) continue;
    const ok = await page.evaluate(() => {
      const b = document.querySelector('.wizard-step.active .wizard-btn-next');
      if (!b) return false;
      b.click();
      return true;
    });
    if (!ok) break;
    await page.waitForTimeout(400);
  }
  const ergebnis = await page.evaluate(() => ({
    schritt: parseInt(document.querySelector('.wizard-step.active')?.dataset.step),
    einheit: document.getElementById('wzUnitKwh')?.textContent,
    hinweis: document.getElementById('wzVerbrauchHinweis')?.textContent,
    sichtbar: (() => {
      const e = document.getElementById('wzVerbrauchHinweis');
      if (!e) return false;
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    })(),
  }));
  await page.screenshot({
    path: process.argv[3] + '/schritt15_' + (andereWert || heizungWert) + '.png',
    fullPage: false,
  });
  await browser.close();
  return { besuchte, ...ergebnis };
}

console.log(
  'MIT bestehender Waermepumpe:',
  JSON.stringify(await lauf('sonst', 'waermepumpe'), null, 1)
);
console.log('MIT Gas (Gegenprobe):', JSON.stringify(await lauf('gas', null), null, 1));
server.close();
