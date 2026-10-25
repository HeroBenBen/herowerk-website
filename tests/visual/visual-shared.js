// @visual — gemeinsame Logik für beide Theme-Läufe (Job 9).
// WICHTIG zur Dateibenennung der Spec-Files ("--theme=dark.spec.js"):
// ci.yml ruft `npx playwright test --grep "@visual" -- --theme=<x>` auf.
// Nach `--` interpretiert Playwright `--theme=<x>` als Datei-Filter-Regex.
// Damit der Lauf nicht mit "no tests found" rot wird, MUSS ein Spec-Pfad
// auf diese Regex matchen — daher tragen die Spec-Files das Muster im Namen.
'use strict';
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

const BASELINE_UPDATE = process.env.BASELINE_UPDATE === '1';

const PAGES = [
  ['home', '/'],
  ['preise', '/preise.html'],
  ['dimensionierung', '/dimensionierung.html'],
  ['foerderung', '/foerderung.html'],
  ['prozess', '/prozess.html'],
  ['ratgeber', '/ratgeber.html'],
  ['kontakt', '/kontakt.html'],
  ['anfrage', '/anfrage.html'],
];

function hasRatifiedBaselines() {
  const dir = path.join(__dirname, '..', '..', 'baseline', 'visual');
  if (!fs.existsSync(dir)) return false;
  return fs.readdirSync(dir).some((f) => f.endsWith('.png'));
}

function assertBaselineGateReady() {
  if (BASELINE_UPDATE || hasRatifiedBaselines()) return;
  throw new Error(
    'baseline/visual/ enthält keine PNG. Der Lauf darf nicht grün sein, solange die Bildprüfung nichts misst. Erstbefüllung nur mit BASELINE_UPDATE=1 im /baseline-update-Job.'
  );
}

async function loadFullPageBeforeScreenshot(page) {
  await page.evaluate(async () => {
    const browserWindow = globalThis;
    const browserDocument = globalThis.document;
    const wait = (ms) => new Promise((resolve) => browserWindow.setTimeout(resolve, ms));
    browserWindow.scrollTo(0, browserDocument.body.scrollHeight);
    await wait(250);
    const images = Array.from(browserDocument.images);
    await Promise.all(
      images.map((image) => {
        if (image.complete) return Promise.resolve();
        return new Promise((resolve) => {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', resolve, { once: true });
        });
      })
    );
    await Promise.all(
      images.map((image) => (image.decode ? image.decode().catch(() => {}) : Promise.resolve()))
    );
    browserWindow.scrollTo(0, 0);
    await wait(250);
  });
}

function defineVisualTests(theme) {
  // 2026-07-30: Das Startseitenvideo und CSS-Daueranimationen müssen im Bildtest stillstehen.
  // Nur der Visual-Lauf emuliert reduced motion, die anderen Pflichtjobs messen weiter das echte Verhalten.
  // 2026-07-30: BASELINE_UPDATE ist der einzige Umgehungsweg für den Wachtposten.
  // Ohne diesen Schalter verhindert ein leerer PNG-Ordner einen still grünen Lauf.
  test.beforeAll(() => {
    assertBaselineGateReady();
  });
  for (const [name, url] of PAGES) {
    test(`@visual ${name} ${theme}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`${url}?theme=${theme}`);
      await page.waitForLoadState('networkidle');
      await loadFullPageBeforeScreenshot(page);
      // 2026-07-30: Ohne Endung schreibt Playwright Dateien ohne .png, dadurch bleibt der PNG-Wachtposten dauerhaft aus.
      await expect(page).toHaveScreenshot(`${name}-${theme}.png`, { fullPage: true });
    });
  }
}

module.exports = { defineVisualTests };
