// Additive smoke/a11y checks for T1-11 website build.
'use strict';
/* global dataLayer, sessionStorage */
const { test, expect } = require('@playwright/test');
const { gotoWithConsentRejected } = require('./helpers/consent');
const { axeBefunde, pruefeGegenBekannte } = require('./helpers/axe');

// O21: Auf einer Vercel-Preview laeuft kein PHP, deshalb liefert /api/rechner
// (Proxy api/rechner.php) fuer action=preise und action=foerderung 404. Ohne Live-Preise
// bleibt #wolfMinEigen auf dem Platzhalter und der Foerderrechner rechnet nicht. Die zwei
// @smoke-Tests mocken genau diese zwei Routen mit kanonischen Werten (Wolf-Eigenanteile aus
// produkte_HERO.json, Vaillant-VWL-75-Paket 32.755 brutto). Produktion laeuft auf IONOS,
// dort antwortet der Proxy real; der Mock prueft die Client-Render-Kette, nicht die Preise.
const KV_PREISE_FIXTURE = {
  wolf: [
    { klasse: 's', brutto: 29750, eigen: 7350 },
    { klasse: 'm', brutto: 34510, eigen: 12110 },
    { klasse: 'l', brutto: 45220, eigen: 22820 },
    { klasse: 'xl', brutto: 57120, eigen: 34720 },
    { klasse: 'xxl', brutto: 82223, eigen: null },
  ],
  vaillant: [
    { klasse: 's', brutto: 28963, eigen: 7350 },
    { klasse: 'm', brutto: 32755, eigen: 11755 },
    { klasse: 'l', brutto: 40276, eigen: 22820 },
    { klasse: 'xl', brutto: 46159, eigen: 34720 },
    { klasse: 'xxl', brutto: 79060, eigen: null },
  ],
};

const KV_FOERDER_FIXTURE = {
  preis: 32755,
  eigenanteil: 11755,
  zuschussGesamt: 21000,
  kfwSatz: 64,
  effektivSatz: 64,
  periodeLabel: '21.07.2026 bis 31.01.2027',
  hinweis: '',
};

async function kvFulfillJson(route, payload) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  });
}

// Der Umschalter sitzt je nach Breite an einer ANDEREN Stelle. Gemessen 29.07.2026
// auf der Vercel-Vorschau, je Breite genau ein sichtbares Exemplar von dreien:
//   375 px  -> nur im Telefon-Menue, also erst NACH Klick auf #hamburger sichtbar
//   768 px  -> .nav-theme-standalone in der Kopfzeile
//   1280 px -> der Umschalter in der Hauptnavigation
// Der Test lief bis hierher blind gegen 375 px OHNE das Menue zu oeffnen und wartete
// darum 60 s auf ein Element, das an dieser Breite gar nicht sichtbar sein SOLL. Das
// war kein Seitenfehler, sondern ein veralteter Test: die Kopfzeile wurde am 25.07.
// per GF-Entscheid von 9 auf 6 Punkte verschlankt (a2c4c1b), der Umschalter wanderte
// dabei ins Menue. Die Pruefung deckt jetzt alle drei Breiten ab und wuerde damit
// auffallen, wenn der Umschalter auf einer davon verschwindet.
const UMSCHALTER_BREITEN = [
  { breite: 375, menueOeffnen: true },
  { breite: 768, menueOeffnen: false },
  { breite: 1280, menueOeffnen: false },
];

for (const { breite, menueOeffnen } of UMSCHALTER_BREITEN) {
  test(`@smoke Theme-Umschalter erreichbar und wirksam bei ${breite} px`, async ({ page }) => {
    await page.setViewportSize({ width: breite, height: 900 });
    await gotoWithConsentRejected(page, '/?theme=light');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    if (menueOeffnen) await page.locator('#hamburger').click();
    const sichtbare = page.locator('[data-theme-toggle]').filter({ visible: true });
    // Genau EIN sichtbarer Umschalter je Breite. Der GF-Entscheid vom 27.07. lautet
    // "exakt ein Bauteil, keine zweite Variante" (be424ca); zwei gleichzeitig
    // sichtbare Umschalter waeren ein Rueckschritt und muessen auffallen.
    await expect(sichtbare).toHaveCount(1);
    await sichtbare.first().click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
}

test('@smoke Hersteller-Vorauswahl zeigt Wolf- und Vaillant-Karten im gemeinsamen Panel', async ({
  page,
}) => {
  await page.route(/[?&]action=preise/, (route) => kvFulfillJson(route, KV_PREISE_FIXTURE));
  await gotoWithConsentRejected(page, '/preise.html?theme=dark');
  // Drift-fest: prueft, dass die Live-Preis-Verdrahtung (action=preise, Single Source)
  // einen echten Eigenanteil rendert, nicht den "ab … Eigenanteil*"-Platzhalter. Kein
  // hartkodierter Sheet-Preis (der bei jeder Preisaenderung driftet).
  await expect(page.locator('#wolfMinEigen')).toContainText(/ab [\d.]+ € Eigenanteil/);
  await page.locator('#manufacturerVaillant').click();
  await expect(page.locator('#paCards .pa-card')).toHaveCount(5);
  await expect(page.locator('#paCards')).toContainText('Vaillant aroTHERM plus');
  await page.locator('#manufacturerWolf').click();
  await expect(page.locator('#paCards .pa-card')).toHaveCount(5);
});

test('@smoke Förderrechner-Paketliste nutzt Wolf und Vaillant aus der Preisliste', async ({
  page,
}) => {
  await page.route(/[?&]action=foerderung/, (route) => kvFulfillJson(route, KV_FOERDER_FIXTURE));
  await gotoWithConsentRejected(page, '/foerderung.html?theme=dark');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#foerderWpTyp optgroup')).toHaveCount(2);
  await expect(page.locator('#foerderWpTyp option')).toHaveCount(10);
  await expect(page.locator('#foerderWpTyp')).toContainText('Vaillant VWL 75/8.1 A');
  await page.selectOption('#foerderWpTyp', 'vaillant:m');
  await expect(page.locator('#frPreis')).toHaveText(/32\.755/);
  await expect(page.locator('#frEigen')).toHaveText(/11\.755/);
  await page.locator('#kostenToggle button').filter({ hasText: 'Eigener Betrag' }).click();
  await expect(page.locator('#wpKostenInput')).toHaveValue('32.755 €');
});

test('@smoke Funnel sendet HubSpot-Form-Payload (Standard-Properties, Mock)', async ({ page }) => {
  /** @type {{ fields: Array<{ name: string, value: string }> } | undefined} */
  let submitted;
  await page.route(
    'https://api.hsforms.com/submissions/v3/integration/submit/**',
    async (route) => {
      submitted = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
  );
  await page.addInitScript(() => sessionStorage.setItem('hero_kv_sitzung', 'test-sitzung'));
  await gotoWithConsentRejected(
    page,
    '/anfrage.html?utm_source=playwright&utm_medium=smoke&utm_campaign=t1-11'
  );
  // Neuer erster Schritt: Interesse-Tor. Waermepumpe waehlen + weiter (volle WP-Strecke).
  await page.locator('.step[data-step="0"] .answer-card[data-value="Wärmepumpe"]').click();
  await page.locator('#interesseNextBtn').click();
  await page.locator('#plzInput').fill('30159');
  await page.locator('#plzNextBtn').click();
  await page.locator('.step[data-step="1"] .answer-card').first().click();
  await page.locator('.step[data-step="2"] .answer-card').first().click();
  await page.locator('#alterSelectUngefaehr').selectOption('20 Jahre oder älter');
  await page.locator('#alterNextBtn').click();
  for (let step = 4; step <= 8; step += 1)
    await page.locator(`.step[data-step="${step}"] .answer-card`).first().click();
  await page.locator('#vorname').fill('Test');
  await page.locator('#nachname').fill('Lead');
  await page.locator('#telefon').fill('+49 511 0000000');
  await page.locator('#email').fill('test@example.com');
  await page.locator('#dsgvo').check();
  await page.locator('.btn-submit-final').click();
  await expect(page.locator('#successStep')).toBeVisible();
  expect(
    await page.evaluate(() =>
      dataLayer.some(
        (entry) =>
          entry &&
          entry[0] === 'event' &&
          entry[1] === 'lead_abgeschickt' &&
          entry[2].sitzung === 'test-sitzung'
      )
    )
  ).toBe(true);
  expect(await page.evaluate(() => sessionStorage.getItem('hero_kv_sitzung'))).toBeNull();
  if (!submitted) throw new Error('HubSpot mock submit was not captured');
  const fields = Object.fromEntries(submitted.fields.map((field) => [field.name, field.value]));
  // Ist-Mapping (C24-Lead-Fix): der Funnel sendet HubSpot-Standard-Properties
  // firstname/zip (nicht die alten Formularnamen vorname/plz).
  expect(fields.firstname).toBe('Test');
  expect(fields.zip).toBe('30159');
  expect(fields.interesse).toBe('Wärmepumpe');
  // UTM-Lead-Attribution bewusst ZURÜCKGESTELLT (Benjamin-Entscheid 2026-06-21, Option A):
  // Das HubSpot-Funnel-Formular 023b1ead… hat keine utm_*-Properties, daher sendet
  // buildHubSpotPayload() KEINE UTM-Felder (Tracking-Strang nicht live; vgl. URL-Query oben,
  // die bewusst NICHT in den Payload durchgereicht wird). Attribution kommt später nativ mit
  // Sales Hub Pro. Backlog: utm_*-Property-Setup im Formular + Payload, DANN Asserts wieder
  // aufnehmen. Bis dahin KEINE utm_*-Asserts (sonst CI-Drift wie vor C26).
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
  test(`@a11y axe-core ohne neue Befunde auf ${path}`, async ({ page }) => {
    await gotoWithConsentRejected(page, path, { waitUntil: 'networkidle' });
    await page.evaluate('document.fonts.ready');
    await page.waitForTimeout(250);
    const [seite, theme] = path.split('?theme=');
    const gemessen = await axeBefunde(page);
    const beanstandungen = pruefeGegenBekannte(gemessen, seite, theme);
    expect(beanstandungen, beanstandungen.join('\n')).toEqual([]);
  });
}
