// @smoke — Pipeline Abschnitt G Job 3. T1-6b-Minimal-Smoke:
// Seiten laden, Kern-Elemente sichtbar. Voller Funnel-Smoke (10 Schritte +
// HubSpot-Submit) kommt mit dem T2-Webhook-Anschluss.
'use strict';
const { test, expect } = require('@playwright/test');

test('@smoke Startseite lädt mit Hero und Navigation', async ({ page }) => {
  const resp = await page.goto('/');
  expect(resp.status()).toBeLessThan(400);
  await expect(page).toHaveTitle(/HeroWerk/i);
  await expect(page.locator('section.hero')).toBeVisible();
});

test('@smoke FAQ-Sektion vorhanden (8 Fragen)', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#faq .faq-item')).toHaveCount(8);
});

test('@smoke Funnel anfrage.html lädt, Schritt 1 aktiv', async ({ page }) => {
  const resp = await page.goto('/anfrage.html');
  expect(resp.status()).toBeLessThan(400);
  await expect(page.locator('.step.active')).toHaveCount(1);
  await expect(page.locator('#progressFill')).toBeAttached();
});
