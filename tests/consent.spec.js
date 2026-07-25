// @smoke — Cookie-Banner sichtbar; Tracking bleibt vor Zustimmung physisch gesperrt.
'use strict';
const { test, expect } = require('@playwright/test');

const TRACKING_SCRIPT_SELECTOR = [
  'script[src*="googletagmanager.com/gtag/js"]',
  'script[src*="connect.facebook.net/"][src*="fbevents.js"]',
].join(',');

test('@smoke Cookie-Banner lädt und Ablehnung hält GA4/Meta gesperrt', async ({ page }) => {
  await page.goto('/?cmpdebug&cmpscreen', { waitUntil: 'networkidle' });

  const banner = page.locator('#cmpbox');
  await expect(banner).toBeVisible({ timeout: 15000 });
  await expect(banner).toHaveAttribute('role', 'dialog');
  await expect(banner.locator('.cmpboxbtnno').first()).toBeVisible();
  await expect(page.locator('script[src*="/delivery/customdata/"]')).toBeAttached({
    timeout: 15000,
  });
  await expect(page.locator(TRACKING_SCRIPT_SELECTOR)).toHaveCount(0);

  await banner.locator('.cmpboxbtnno').first().click();
  await expect(banner).toBeHidden();
  await page.waitForTimeout(1000);
  await expect(page.locator(TRACKING_SCRIPT_SELECTOR)).toHaveCount(0);
});
