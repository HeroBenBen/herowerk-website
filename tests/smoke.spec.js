// @smoke: Pipeline Abschnitt G Job 3: Seiten laden, Kern-Elemente sichtbar.
'use strict';
const { test, expect } = require('@playwright/test');
const { gotoWithConsentRejected } = require('./helpers/consent');

// Sollstand des Telefon-Menues, gemessen 29.07.2026 auf der Vercel-Vorschau.
// Der Eintrag /prozess stand hier bis heute drin, ist aber seit dem GF-Entscheid vom
// 25.07.2026 "Kopfzeile von 9 auf 6 Punkte" (a2c4c1b) NICHT mehr im Menue. Der Test
// hat also 20 CI-Laeufe lang eine Seite eingefordert, die bewusst entfernt wurde, und
// war damit dauerhaft rot, ohne je einen echten Fehler zu zeigen. Die Seite
// /prozess.html gibt es weiterhin, sie wird von a11y.spec.js und vom
// Content-Fidelity-Gate weiter geprueft, sie haengt nur nicht mehr im Menue.
/** @type {Array<[string, RegExp]>} */
const NAV_TARGETS = [
  ['/preise', /Kosten|Preise/i],
  ['/rechner', /Rechner|Wärmepumpe|Förderung/i],
  ['/foerderung', /Förderung|KfW/i],
  ['/ratgeber', /Ratgeber|FAQ/i],
  ['/kontakt', /Kontakt|Termin/i],
  ['/karriere', /Jobs|Karriere/i],
];

// Vollstaendiges Inventar des offenen Menues, Reihenfolge inbegriffen. Ohne diese
// Pruefung faellt ein STILL VERSCHWUNDENER Menuepunkt niemandem auf: die Schleife
// ueber NAV_TARGETS wuerde nur meckern, wenn ein dort genannter Punkt fehlt, aber nie,
// wenn ein zusaetzlicher Punkt auftaucht oder die Reihenfolge kippt.
const MENUE_SOLL = [
  '/preise',
  '/rechner',
  '/foerderung',
  '/ratgeber',
  '/kontakt',
  '/karriere',
  '/anfrage',
];

test('@smoke Startseite lädt mit Hero und Navigation', async ({ page }) => {
  const resp = await gotoWithConsentRejected(page, '/');
  expect(resp.status()).toBeLessThan(400);
  await expect(page).toHaveTitle(/HeroWerk/i);
  await expect(page.locator('section.hero')).toBeVisible();
});

test('@smoke FAQ-Sektion auf Ratgeber vorhanden (7 Fragen)', async ({ page }) => {
  await gotoWithConsentRejected(page, '/ratgeber.html');
  await expect(page.locator('#faq .faq-item')).toHaveCount(7);
});

test('@smoke Funnel anfrage.html lädt, Schritt 1 aktiv', async ({ page }) => {
  const resp = await gotoWithConsentRejected(page, '/anfrage.html');
  expect(resp.status()).toBeLessThan(400);
  await expect(page.locator('.step.active')).toHaveCount(1);
  await expect(page.locator('#progressFill')).toBeAttached();
});

test('@smoke Telefon-Menue enthält genau die freigegebenen Punkte', async ({ page }) => {
  await gotoWithConsentRejected(page, '/');
  await page.locator('#hamburger').click();
  const hrefs = await page
    .locator('.mobile-menu.open a')
    .evaluateAll((els) => els.map((el) => el.getAttribute('href')));
  expect(hrefs).toEqual(MENUE_SOLL);
});

test('@smoke Navigation von Startseite auf Unterseiten und zurück', async ({ page }) => {
  for (const [href, title] of NAV_TARGETS) {
    await gotoWithConsentRejected(page, '/');
    await page.locator('#hamburger').click();
    await page.locator(`.mobile-menu.open a[href="${href}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`${href.replace('/', '\\/')}/?$`));
    await expect(page).toHaveTitle(title);
    await page.locator('a:has(.nav-logo)').first().click();
    await expect(page).toHaveURL(/\/$/);
  }
});

test('@smoke Funnel Redirect nur auf Vercel Preview', async ({ page }) => {
  const previewUrl = process.env.PREVIEW_URL || '';
  test.skip(
    !/^https:\/\/.*\.vercel\.app\/?$/.test(previewUrl),
    'vercel.json redirects run only on Vercel preview URLs'
  );
  const resp = await gotoWithConsentRejected(page, '/funnel');
  expect(resp.status()).toBeLessThan(400);
  await expect(page).toHaveURL(/\/anfrage\/?$/);
});
