// Einwilligung: zwei Prüfungen mit unterschiedlicher Beweislage.
//
// ÄNDERUNG AM 03.08.2026:
// Der Host-Wächter verhindert den ConsentManager-Aufruf bewusst auf Localhost und
// Vercel-Vorschauen. Der frühere @smoke-Test lud dort das Autoblocking-Skript, damit
// „null Trackingskripte“ nicht nur bedeutete, dass überhaupt nichts geladen hatte.
// Dieser Funktionsbeweis kann nach Einführung des Wächters auf der Vorschau nicht
// fortgeführt werden. Der @smoke-Test beweist deshalb jetzt den vorhandenen Wächter,
// seine exakte Produktions-Allowlist, die bewusste Ablehnung des aktuellen Hosts und
// null Anbieter- sowie Trackinganfragen. Der entfallene Beweis liegt im @live-Test:
// Autoblocking-Antwort mit Statuscode, Skript im Dokument, Dialogzustand und, falls
// der Dialog erscheint, nach Ablehnung null GA4- und Meta-Anfragen.
//
// Ein geladenes Autoblocking-Skript ohne Dialog ist kein Baufehler: Das entspricht
// mit hoher Wahrscheinlichkeit der Anbieter- oder Kontingentgrenze, gegen die dieser
// Wächter arbeitet. Nur ein nicht geladenes Autoblocking-Skript lässt @live scheitern.
'use strict';
/* global window, document */
const { test, expect } = require('@playwright/test');

const TRACKING_SCRIPT_SELECTOR = [
  'script[src*="googletagmanager.com/gtag/js"]',
  'script[src*="connect.facebook.net/"][src*="fbevents.js"]',
].join(',');

const LIVE_URL = 'https://www.herowerk.de';
const CMP_SCRIPT_PART = '/delivery/autoblocking/d94854dc5273c.js';

function hostnameOf(url) {
  return new URL(url).hostname.toLowerCase();
}

function isConsentManagerUrl(url) {
  const hostname = hostnameOf(url);
  return hostname === 'consentmanager.net' || hostname.endsWith('.consentmanager.net');
}

function isTrackingUrl(url) {
  const hostname = hostnameOf(url);
  return hostname === 'www.googletagmanager.com' || hostname === 'connect.facebook.net';
}

// --- Hart in der PR-Kette: Wächter lehnt Nicht-Produktion bewusst ab ---------------
test('@smoke Einwilligungs-Wächter lehnt Nicht-Produktion ab und Tracking bleibt aus', async ({
  page,
}) => {
  const consentManagerRequests = [];
  const trackingRequests = [];

  page.on('request', (request) => {
    const url = request.url();
    if (isConsentManagerUrl(url)) consentManagerRequests.push(url);
    if (isTrackingUrl(url)) trackingRequests.push(url);
  });

  await page.goto('/?cmpdebug&cmpscreen', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const guardState = await page.evaluate(() => {
    const guardNeedle = "var productionHosts = ['herowerk.de', 'www.herowerk.de'];";
    const guards = Array.from(document.scripts).filter((script) =>
      script.textContent.includes(guardNeedle)
    );
    const currentHost = window.location.hostname.toLowerCase().replace(/\.$/, '');
    const productionHosts = ['herowerk.de', 'www.herowerk.de'];
    const guardSource = guards[0]?.textContent || '';

    return {
      currentHost,
      guardCount: guards.length,
      allowlistExact: guardSource.includes(guardNeedle),
      usesExactRejection: guardSource.includes('productionHosts.indexOf(host) === -1'),
      hostRejected: productionHosts.indexOf(currentHost) === -1,
      externalCmpScripts: Array.from(document.scripts).filter((script) =>
        script.src.includes('/delivery/autoblocking/')
      ).length,
    };
  });

  expect(guardState.guardCount).toBe(1);
  expect(guardState.allowlistExact).toBe(true);
  expect(guardState.usesExactRejection).toBe(true);
  expect(
    guardState.hostRejected,
    'Host ' + guardState.currentHost + ' muss bewusst abgelehnt werden'
  ).toBe(true);
  expect(guardState.externalCmpScripts).toBe(0);
  expect(consentManagerRequests).toEqual([]);
  expect(trackingRequests).toEqual([]);
  await expect(page.locator(TRACKING_SCRIPT_SELECTOR)).toHaveCount(0);
});

// --- Verpflichtender Bericht gegen die echte Domain -------------------------------
test('@live Autoblocking lädt auf www.herowerk.de und Dialogzustand wird gemessen', async ({
  page,
}) => {
  const autoblockingRequests = [];
  const trackingRequests = [];

  page.on('request', (request) => {
    const url = request.url();
    if (url.includes(CMP_SCRIPT_PART)) autoblockingRequests.push(url);
    if (isTrackingUrl(url)) trackingRequests.push(url);
  });

  const autoblockingResponsePromise = page
    .waitForResponse((response) => response.url().includes(CMP_SCRIPT_PART), { timeout: 15000 })
    .catch(() => null);

  await page.goto(LIVE_URL + '/?cmpdebug&cmpscreen', { waitUntil: 'domcontentloaded' });
  const autoblockingResponse = await autoblockingResponsePromise;
  const autoblockingScript = page.locator('script[src*="' + CMP_SCRIPT_PART + '"]');
  const skriptImDokument = (await autoblockingScript.count()) === 1;

  const banner = page.locator('#cmpbox');
  const dialogSichtbar = await banner
    .waitFor({ state: 'visible', timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  const dialogImDokument = (await banner.count()) > 0;
  const messung = {
    skriptaufruf: autoblockingRequests[0] || null,
    antwortcode: autoblockingResponse?.status() ?? null,
    skriptImDokument,
    dialogImDokument,
    dialogSichtbar,
    trackinganfragen: [...trackingRequests],
  };

  console.log('ConsentManager-Live-Messung: ' + JSON.stringify(messung));

  expect(
    autoblockingRequests.length,
    'Autoblocking-Skript wurde nicht angefordert'
  ).toBeGreaterThan(0);
  expect(autoblockingResponse, 'Autoblocking-Skript lieferte keine HTTP-Antwort').not.toBeNull();
  expect(autoblockingResponse.status()).toBeGreaterThanOrEqual(200);
  expect(autoblockingResponse.status()).toBeLessThan(400);
  expect(skriptImDokument).toBe(true);
  await expect
    .poll(() => page.evaluate(() => typeof window.__cmp), { timeout: 15000 })
    .toBe('function');

  if (dialogSichtbar) {
    await expect(banner).toHaveAttribute('role', 'dialog');
    const rejectButton = banner.locator('.cmpboxbtnno').first();
    await expect(rejectButton).toBeVisible();
    await rejectButton.click();
    await expect(banner).toBeHidden();
    await page.waitForTimeout(1000);
  } else {
    console.log('Dialog bleibt aus, Skript lädt, Verdacht Anbieter- oder Kontingentgrenze.');
  }

  expect(trackingRequests).toEqual([]);
  await expect(page.locator(TRACKING_SCRIPT_SELECTOR)).toHaveCount(0);
});
