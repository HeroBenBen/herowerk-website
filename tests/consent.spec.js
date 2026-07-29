// Einwilligung: zwei Pruefungen mit UNTERSCHIEDLICHER Beweislage.
//
// GEMESSEN AM 29.07.2026, gegen die Vercel-Vorschau UND gegen www.herowerk.de:
//
// 1. Die Auslieferkette des Anbieters funktioniert auf BEIDEN Zielen. Auf der
//    vercel.app-Adresse antworten autoblocking-Skript, cmp_final.min.js,
//    cmp.php?id=173772&h=<vercel-Host> und das customdata-Skript alle mit 200,
//    window.__cmp ist eine Funktion. Die Vermutung, der Dialog sei an die Domain
//    herowerk.de gebunden und koenne auf einer Vorschau-Adresse gar nicht ausliefern,
//    ist damit WIDERLEGT. Sie war die naheliegende Erklaerung, aber nicht die richtige.
//
// 2. Trotzdem entsteht auf KEINEM der beiden Ziele ein #cmpbox. __cmp('getCMPData')
//    meldet auf www.herowerk.de consentExists=true bei null gesetzten Cookies und
//    vendorsCount=0. Der Mandant 173772 liefert derzeit also ueberhaupt keinen Dialog
//    aus, weder live noch in der Vorschau; sichtbar ist nur die Wieder-Oeffnen-
//    Schaltflaeche .cmpboxrecall. Zusaetzlich blockt die CSP beider Ziele
//    (style-src 'self' 'unsafe-inline', identisch in .htaccess und vercel.json) das
//    Stylesheet cdn.consentmanager.net/delivery/css/cmp.min.css.
//
// Folge fuer die Pruefkette: Punkt 1 ist auf der Vorschau ehrlich pruefbar und bleibt
// hart in der PR-Kette. Punkt 2 kann auf KEINEM Ziel bestehen, solange Mandanten-
// Konfiguration und CSP unveraendert sind. Beides liegt ausserhalb dieses Repos bzw.
// in Dateien, die der Auftrag zur Gate-Reparatur nicht anfassen darf. Der Dialog-Test
// laeuft deshalb als @live-Pruefung gegen www.herowerk.de und ist im Workflow als
// Bericht gefuehrt, nicht als Hard-Gate. Er wird wieder scharf, sobald getCMPData
// einen Dialog meldet und die CSP den Anbieter unter style-src erlaubt.
'use strict';
/* global window */
const { test, expect } = require('@playwright/test');

const TRACKING_SCRIPT_SELECTOR = [
  'script[src*="googletagmanager.com/gtag/js"]',
  'script[src*="connect.facebook.net/"][src*="fbevents.js"]',
].join(',');

const LIVE_URL = 'https://www.herowerk.de';

// --- Hart in der PR-Kette: was auf der Vorschau beweisbar ist ----------------------
test('@smoke Einwilligungs-Kette lädt und GA4/Meta bleiben ohne Zustimmung gesperrt', async ({
  page,
}) => {
  await page.goto('/?cmpdebug&cmpscreen', { waitUntil: 'networkidle' });

  // Das Autoblocking-Skript des Anbieters muss geladen sein, sonst waere die Sperre
  // der Trackingskripte reiner Zufall und der Test wuerde nichts messen.
  await expect(page.locator('script[src*="/delivery/autoblocking/"]')).toBeAttached({
    timeout: 15000,
  });
  await expect(page.locator('script[src*="/delivery/customdata/"]')).toBeAttached({
    timeout: 15000,
  });
  // Voraussetzung der Messung selbst: die Anbieter-API muss da sein. Ohne sie sagt ein
  // "0 Trackingskripte" nur aus, dass ueberhaupt nichts geladen hat.
  await expect
    .poll(() => page.evaluate(() => typeof window.__cmp), { timeout: 15000 })
    .toBe('function');

  await expect(page.locator(TRACKING_SCRIPT_SELECTOR)).toHaveCount(0);
  await page.waitForTimeout(1000);
  await expect(page.locator(TRACKING_SCRIPT_SELECTOR)).toHaveCount(0);
});

// --- Bericht gegen die echte Domain: der Dialog selbst -----------------------------
test('@live Einwilligungsdialog erscheint auf www.herowerk.de', async ({ page }) => {
  await page.goto(`${LIVE_URL}/?cmpdebug&cmpscreen`, { waitUntil: 'networkidle' });

  const banner = page.locator('#cmpbox');
  await expect(banner).toBeVisible({ timeout: 15000 });
  await expect(banner).toHaveAttribute('role', 'dialog');
  await expect(banner.locator('.cmpboxbtnno').first()).toBeVisible();
  await banner.locator('.cmpboxbtnno').first().click();
  await expect(banner).toBeHidden();
  await page.waitForTimeout(1000);
  await expect(page.locator(TRACKING_SCRIPT_SELECTOR)).toHaveCount(0);
});
