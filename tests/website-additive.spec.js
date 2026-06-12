// Additive smoke/a11y checks for T1-11 website build.
'use strict';
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test('@smoke Theme-Toggle setzt Light- und Dark-Mode per URL/LocalStorage', async ({ page }) => {
  await page.goto('/?theme=light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.locator('[data-theme-toggle]').filter({ visible: true }).first().click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('@smoke Hersteller-Vorauswahl zeigt Wolf-Minimum und Vaillant-Panel', async ({ page }) => {
  await page.goto('/preise.html?theme=dark');
  await expect(page.locator('#wolfMinEigen')).toContainText('8.925');
  await page.locator('#manufacturerVaillant').click();
  await expect(page.locator('#vaillantPricePanel')).toBeVisible();
  await expect(page.locator('#vaillantPricePanel')).toContainText('Preise auf Anfrage');
  await page.locator('#manufacturerWolf').click();
  await expect(page.locator('#paCards .pa-card')).toHaveCount(5);
});

test('@smoke Funnel sendet HubSpot-Form-Payload mit UTM-Feldern (Mock)', async ({ page }) => {
  /** @type {{ fields: Array<{ name: string, value: string }> } | undefined} */
  let submitted;
  await page.route(
    'https://api.hsforms.com/submissions/v3/integration/submit/**',
    async (route) => {
      submitted = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
  );
  await page.goto('/anfrage.html?utm_source=playwright&utm_medium=smoke&utm_campaign=t1-11');
  await page.locator('.step[data-step="1"] .answer-card').first().click();
  await page.locator('.step[data-step="2"] .answer-card').first().click();
  await page.locator('#alterSelectUngefaehr').selectOption('20 Jahre oder älter');
  await page.locator('#alterNextBtn').click();
  for (let step = 4; step <= 8; step += 1)
    await page.locator(`.step[data-step="${step}"] .answer-card`).first().click();
  await page.locator('#plzInput').fill('30159');
  await page.locator('#plzNextBtn').click();
  await page.locator('#vorname').fill('Test');
  await page.locator('#nachname').fill('Lead');
  await page.locator('#telefon').fill('+49 511 0000000');
  await page.locator('#email').fill('test@example.com');
  await page.locator('#dsgvo').check();
  await page.locator('.btn-submit-final').click();
  await expect(page.locator('#successStep')).toBeVisible();
  if (!submitted) throw new Error('HubSpot mock submit was not captured');
  const fields = Object.fromEntries(submitted.fields.map((field) => [field.name, field.value]));
  expect(fields.vorname).toBe('Test');
  expect(fields.plz).toBe('30159');
  expect(fields.utm_source).toBe('playwright');
  expect(fields.utm_medium).toBe('smoke');
  expect(fields.utm_campaign).toBe('t1-11');
});

for (const path of [
  '/?theme=dark',
  '/?theme=light',
  '/preise.html?theme=dark',
  '/dimensionierung.html?theme=light',
  '/foerderung.html?theme=dark',
  '/prozess.html?theme=light',
  '/ratgeber.html?theme=dark',
  '/kontakt.html?theme=light',
  '/impressum.html?theme=light',
  '/datenschutz.html?theme=dark',
  '/hinweise.html?theme=light',
]) {
  test(`@a11y axe-core 0 Violations auf ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'networkidle' });
    await page.evaluate('document.fonts.ready');
    await page.waitForTimeout(250);
    const results = await new AxeBuilder({ page }).analyze();
    const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length}x`);
    expect(summary, summary.join('\n')).toEqual([]);
  });
}
