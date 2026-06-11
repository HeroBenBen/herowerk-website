// @visual — gemeinsame Logik für beide Theme-Läufe (Job 9).
// WICHTIG zur Dateibenennung der Spec-Files ("--theme=dark.spec.js"):
// ci.yml ruft `npx playwright test --grep "@visual" -- --theme=<x>` auf.
// Nach `--` interpretiert Playwright `--theme=<x>` als Datei-Filter-Regex.
// Damit der Lauf nicht mit "no tests found" rot wird, MUSS ein Spec-Pfad
// auf diese Regex matchen — daher tragen die Spec-Files das Muster im Namen.
// Empfehlung an Controller: in einer späteren Pipeline-Iteration auf
// `--project=<theme>` oder THEME-Env umstellen (Workflow-Änderung nötig).
'use strict';
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

function hasRatifiedBaselines() {
  const dir = path.join(__dirname, '..', '..', 'baseline', 'visual');
  if (!fs.existsSync(dir)) return false;
  return fs.readdirSync(dir).some((f) => f.endsWith('.png'));
}

function defineVisualTests(theme) {
  test(`@visual Startseite ${theme}`, async ({ page }) => {
    test.skip(
      !hasRatifiedBaselines(),
      'baseline/visual/ ist leer — Befüllung erst im ersten Visual-Run mit Benjamin-Ratifikation via /baseline-update-Label (Pipeline T1-6b).'
    );
    await page.goto(`/?theme=${theme}`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot(`home-${theme}`, { fullPage: true });
  });
}

module.exports = { defineVisualTests };
