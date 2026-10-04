// @smoke/@a11y: Kampagnen-Zielseite /stelle je Rolle (T1157).
//
// Was hier hart geprueft wird:
//   1. Auf dem Telefon (390 x 844) stehen Rolle, Gehalt, Ort und Bewerbungsknopf
//      ohne Scrollen im Bild, fuer alle sieben Kampagnenrollen.
//   2. Das Gehalt steht als ab-Wert (beim Aussendienst als festes Fixum), nie als
//      Spanne. Grund: _Entscheidungen/2026-07-29_Karriere-Verguetungstexte-final-
//      freigegeben_HERO.md im Vault, der interne Deckel wird nie oeffentlich.
//   3. Das Formular sendet NUR Felder, die am HubSpot-Formular c6a199f5 registriert
//      sind. HubSpot verwirft andere Felder still, deshalb ist das eine harte Liste.
//   4. Die Ereignisse bewerbung_klick und bewerbung_abgeschickt feuern getrennt,
//      nur mit geladenem Messwerkzeug (also nach Einwilligung), ohne Personendaten,
//      und "abgeschickt" erst nach Antwort 200.
// Die Formular-Schnittstelle wird in jedem Testfall abgefangen. Kein Testfall
// erreicht HubSpot.
'use strict';
/* global window, document, dataLayer */
const { test, expect } = require('@playwright/test');
const { gotoWithConsentRejected } = require('./helpers/consent');
const { axeBefunde, pruefeGegenBekannte } = require('./helpers/axe');

// Sollwerte, live gelesen am 24.09.2026 aus https://www.herowerk.de/api/jobs
// (Feld verguetung) und https://www.herowerk.de/karriere.
const SOLL = {
  anlagenmechaniker: {
    titel: 'Anlagenmechaniker:in SHK',
    gehalt: 'ab 20,00 € brutto pro Stunde',
    neben: '3.467',
  },
  quereinsteiger: {
    titel: 'Quereinsteiger:in Montage',
    gehalt: 'ab 15,00 € brutto pro Stunde',
    neben: '2.600',
  },
  elektriker: { titel: 'Elektriker:in', gehalt: 'ab 21,00 € brutto pro Stunde', neben: '3.640' },
  gala: {
    titel: 'Fundament- & Außenanlagen / GaLa',
    gehalt: 'ab 17,00 € brutto pro Stunde',
    neben: '2.947',
  },
  'shk-meister-montage': {
    titel: 'SHK-Meister:in',
    gehalt: 'ab 4.500 € brutto im Monat',
    neben: 'je nach Erfahrung und Qualifikation',
  },
  elektromeister: {
    titel: 'Elektromeister:in',
    gehalt: 'ab 4.500 € brutto im Monat',
    neben: 'Zulage bei Übernahme der Konzession',
  },
  vad: {
    titel: 'Vertriebsberater:in Außendienst',
    gehalt: '3.000 € brutto im Monat Fixum',
    neben: 'Provision auf deinen Umsatz, ohne Deckel',
  },
};

// Zielvertrag T1161; acht neue Felder vor Auslieferung am Formular registrieren. Altstand vom 24.09.2026:
// https://forms-eu1.hsforms.com/embed/v3/form/148110267/c6a199f5-bab6-499e-a3ee-3d9605120877/json
const REGISTRIERT = [
  'beworbene_rolle',
  'firstname',
  'lastname',
  'phone',
  'fruhester_eintritt',
  'message',
  'datenschutzeinwilligung_bewerbung',
  'email',
  'newslettereinwilligung',
  ...[
    'arbeitserlaubnis',
    'berufsabschluss',
    'anerkennung',
    'berufserfahrung',
    'fuehrerschein',
    'deutsch',
    'plz',
    'start',
  ].map((n) => 'bewerber_' + n),
];

async function kurzfragen(page) {
  for (const [n, v] of [
    ['arbeitserlaubnis', 'ja_uneingeschraenkt'],
    ['berufsabschluss', 'geselle_facharbeiter'],
    ['berufserfahrung', '1_bis_3'],
    ['fuehrerschein', 'b'],
    ['deutsch', 'gut_arbeitsalltag'],
    ['plz', '30159'],
    ['start', '2_bis_3_monate'],
  ]) {
    if (n === 'plz') await page.locator('[name=bewerber_plz]').fill(v);
    else await page.locator(`[name=bewerber_${n}][value="${v}"]`).check();
    if (n === 'start') await page.locator('#stEintritt').fill('2026-11-01');
    await page.locator('#stWeiter').click();
  }
}

const TELEFON = { width: 390, height: 844 };

/**
 * Faengt die Formular-Schnittstelle ab und merkt sich jede Einsendung.
 * @param {import('@playwright/test').Page} page
 * @param {number} status
 */
async function schnittstelleAbfangen(page, status) {
  /** @type {any[]} */
  const einsendungen = [];
  await page.route('https://api.hsforms.com/**', async (route) => {
    einsendungen.push(JSON.parse(route.request().postData() || '{}'));
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(status === 200 ? { inlineMessage: 'ok' } : { status: 'error' }),
    });
  });
  return einsendungen;
}

/**
 * Stellt den Zustand NACH einer Einwilligung nach: ein gtag.js-Eintrag wie ihn
 * js/consent.js setzt (als text/plain, damit nichts geladen wird) und ein
 * fbq-Mitschreiber anstelle des Meta-Pixels.
 * @param {import('@playwright/test').Page} page
 */
async function einwilligungNachstellen(page) {
  await page.addInitScript(() => {
    /** @type {any} */ (window).__fbq = [];
    /** @type {any} */ (window).fbq = function () {
      /** @type {any} */ (window).__fbq.push(Array.prototype.slice.call(arguments));
    };
    document.addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('script');
      s.type = 'text/plain';
      s.src = 'https://www.googletagmanager.com/gtag/js?id=G-TEST';
      document.head.appendChild(s);
    });
  });
}

/** @param {import('@playwright/test').Page} page */
async function ereignisse(page) {
  return page.evaluate(() => {
    const ga = /** @type {any[]} */ (dataLayer)
      .filter((e) => e && e[0] === 'event')
      .map((e) => ({ name: e[1], parameter: e[2] }));
    const meta = /** @type {any} */ (window).__fbq || [];
    return { ga, meta };
  });
}

for (const [slug, soll] of Object.entries(SOLL)) {
  test(`@smoke /stelle ${slug}: Rolle, Gehalt, Ort und Knopf ohne Scrollen`, async ({ page }) => {
    await page.setViewportSize(TELEFON);
    const resp = await gotoWithConsentRejected(
      page,
      `/stelle.html?role=${slug}&utm_source=meta&utm_medium=paid_social&utm_campaign=t1157&fbclid=abc`
    );
    expect(resp.status()).toBeLessThan(400);
    await page.evaluate('document.fonts.ready');
    await expect(page.locator('#stTitel')).toContainText(soll.titel);
    await expect(page.locator('#stGehalt')).toHaveText(soll.gehalt);
    await expect(page.locator('#stGehaltNeben')).toContainText(soll.neben);
    const gehaltstext = await page.locator('#stGehaltFakt').innerText();
    expect(gehaltstext, 'Gehalt nie als Spanne').not.toMatch(/\bbis\b|–|\d\s*-\s*\d/);
    if (slug !== 'vad') expect(gehaltstext).toContain('je nach Erfahrung und Qualifikation');
    await expect(page.locator('.st-fakt', { hasText: 'Region Hannover' })).toBeVisible();

    for (const sel of [
      '#stTitel',
      '#stGehaltFakt',
      '.st-fakt:has-text("Region Hannover")',
      '[data-bewerben="oben"]',
    ]) {
      const box = await page.locator(sel).first().boundingBox();
      expect(box, sel).not.toBeNull();
      expect(box.y + box.height, `${sel} muss ohne Scrollen sichtbar sein`).toBeLessThanOrEqual(
        TELEFON.height
      );
    }
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    if (slug === 'quereinsteiger') {
      await expect(page.locator('#stFreuen')).not.toContainText('Kälteschein');
      await expect(page.locator('#stFreuen')).toContainText(
        'Wer sich bewährt, für den ist mehr drin, bei der Vergütung wie bei der Verantwortung.'
      );
    }
    await expect(page.locator('#stSchrittText')).toHaveText('Schritt 1 von 9');
  });
}

test('@smoke /stelle ohne Rolle: Rolle ist der erste Schritt, Fragenfolge folgt der Rollenwahl', async ({
  page,
}) => {
  await gotoWithConsentRejected(page, '/stelle.html?role=gibtsnicht');
  await expect(page.locator('#stTitel')).toContainText('Region Hannover');
  await expect(page.locator('#stSchrittText')).toHaveText('Schritt 1 von 9');
  await expect(page.locator('[data-schritt="rolle"] input[type="radio"]')).toHaveCount(7);
  await page.locator('#stWeiter').click();
  await expect(page.locator('#stSchrittText'), 'ohne Rolle geht es nicht weiter').toHaveText(
    'Schritt 1 von 9'
  );
  await page.locator('label.kb-choice', { hasText: 'Quereinsteiger:in Montage' }).click();
  await page.locator('#stWeiter').click();
  await expect(page.locator('#stSchrittText')).toHaveText('Schritt 2 von 10');
  await expect(page.locator('[data-schritt=a1] legend')).toHaveText(
    'Darfst du in Deutschland arbeiten?'
  );
  await expect(page.locator('#stFeldRolle')).toHaveValue('quereinsteiger');
});

test('@smoke /stelle Einsendung: nur registrierte Felder, Ereignisse getrennt und ohne Personendaten', async ({
  page,
}) => {
  await einwilligungNachstellen(page);
  const einsendungen = await schnittstelleAbfangen(page, 200);
  await gotoWithConsentRejected(page, '/stelle.html?role=elektriker&utm_source=meta');

  await page.locator('[data-bewerben="oben"]').click();
  let e = await ereignisse(page);
  expect(e.ga.map((x) => x.name)).toEqual(['bewerbung_klick']);
  expect(e.ga[0].parameter).toEqual({ rolle: 'elektriker', position: 'oben' });
  expect(e.meta).toEqual([
    ['trackCustom', 'BewerbungKlick', { rolle: 'elektriker', position: 'oben' }],
  ]);

  await kurzfragen(page);
  await page.locator('#stWeiter').click();
  await expect(page.locator('[data-schritt=name]')).toBeVisible();
  await page.locator('#stVorname').fill('Test');
  await page.locator('#stNachname').fill('Kampagne');
  await page.locator('#stWeiter').click();
  await expect(page.locator('#stWeiter')).toHaveText('Bewerbung absenden');
  await page.locator('#stTelefon').fill('0511 000000');
  await page.locator('#stEmail').fill('pruefung@herowerk.de');
  await page.locator('#stWeiter').click();

  await expect(page.locator('#stErfolg')).toBeVisible();
  expect(einsendungen).toHaveLength(1);
  const felder = einsendungen[0].fields;
  for (const f of felder)
    expect(REGISTRIERT, `Feld ${f.name} ist am Formular nicht registriert`).toContain(f.name);
  const wert = (/** @type {string} */ n) =>
    (felder.find((/** @type {any} */ f) => f.name === n) || {}).value;
  expect(wert('beworbene_rolle')).toBe('elektriker');
  expect(wert('fruhester_eintritt')).toBe(String(Date.parse('2026-11-01T00:00:00Z')));
  expect(wert('datenschutzeinwilligung_bewerbung')).toBeUndefined();
  expect(wert('newslettereinwilligung')).toBeUndefined();
  expect(wert('message')).toBeUndefined();
  expect(wert('bewerber_arbeitserlaubnis')).toBe('ja_uneingeschraenkt');
  expect(einsendungen[0].context.pageUri).toContain('utm_source=meta');
  expect(einsendungen[0].legalConsentOptions).toBeUndefined();

  e = await ereignisse(page);
  expect(e.ga.map((x) => x.name)).toEqual(['bewerbung_klick', 'bewerbung_abgeschickt']);
  expect(e.ga[1].parameter).toEqual({ rolle: 'elektriker' });
  expect(e.meta[1]).toEqual(['track', 'SubmitApplication', { rolle: 'elektriker' }]);
  const alles = JSON.stringify(e);
  for (const pii of ['Test', 'Kampagne', 'pruefung@herowerk.de', '0511']) {
    expect(alles, `Ereignis traegt Personendaten (${pii})`).not.toContain(pii);
  }
});

test('@smoke /stelle ohne Einwilligung: kein Ereignis, Bewerbung geht trotzdem', async ({
  page,
}) => {
  const einsendungen = await schnittstelleAbfangen(page, 200);
  await gotoWithConsentRejected(page, '/stelle.html?role=gala');
  await page.locator('[data-bewerben="oben"]').click();
  await kurzfragen(page);
  await page.locator('#stVorname').fill('Test');
  await page.locator('#stNachname').fill('Kampagne');
  await page.locator('#stWeiter').click();
  await page.locator('#stTelefon').fill('0511 000000');
  await page.locator('#stEmail').fill('pruefung@herowerk.de');
  await page.locator('#stWeiter').click();
  await expect(page.locator('#stErfolg')).toBeVisible();
  expect(einsendungen).toHaveLength(1);
  expect(einsendungen[0].fields.map((/** @type {any} */ f) => f.name)).not.toContain('message');
  const e = await ereignisse(page);
  expect(e.ga).toEqual([]);
  expect(e.meta).toEqual([]);
});

test('@smoke /stelle Fehler der Schnittstelle: kein Abgeschickt-Ereignis, Hinweis mit E-Mail-Weg', async ({
  page,
}) => {
  await einwilligungNachstellen(page);
  await schnittstelleAbfangen(page, 500);
  await gotoWithConsentRejected(page, '/stelle.html?role=vad');
  await kurzfragen(page);
  await page.locator('#stVorname').fill('Test');
  await page.locator('#stNachname').fill('Kampagne');
  await page.locator('#stWeiter').click();
  await page.locator('#stTelefon').fill('0511 000000');
  await page.locator('#stEmail').fill('pruefung@herowerk.de');
  await page.locator('#stWeiter').click();
  await expect(page.locator('#stFehler')).toBeVisible();
  await expect(page.locator('#stFehler a[href^="mailto:bewerbung@herowerk.de"]')).toBeVisible();
  await expect(page.locator('#stErfolg')).toBeHidden();
  const e = await ereignisse(page);
  expect(e.ga.map((x) => x.name)).not.toContain('bewerbung_abgeschickt');
  expect(e.meta.map((/** @type {any[]} */ m) => m[1])).not.toContain('SubmitApplication');
});

for (const theme of ['dark', 'light']) {
  test(`@a11y axe-core ohne neue Befunde auf /stelle.html?role=anlagenmechaniker&theme=${theme}`, async ({
    page,
  }) => {
    await gotoWithConsentRejected(page, `/stelle.html?role=anlagenmechaniker&theme=${theme}`, {
      waitUntil: 'networkidle',
    });
    await page.evaluate('document.fonts.ready');
    await page.waitForTimeout(250);
    const gemessen = await axeBefunde(page);
    const beanstandungen = pruefeGegenBekannte(gemessen, '/stelle.html', theme);
    expect(beanstandungen, beanstandungen.join('\n')).toEqual([]);
  });
}
