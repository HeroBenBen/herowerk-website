'use strict';
const { test, expect } = require('@playwright/test');

const UEBERSCHRIFTEN = [
  '1. Verantwortlicher',
  '2. Datenschutzbeauftragter',
  '3. Ihre Rechte',
  '4. Beschwerderecht',
  '5. Hosting (IONOS)',
  '6. Server-Logfiles',
  '7. Schriftarten',
  '8. Anfrage-Funnel und Kontaktformular (HubSpot)',
  '8a. Bewerbung (HubSpot)',
  '9. Wärmepumpen-Rechner (Google Apps Script)',
  '10. Einwilligung und Cookie-Banner (consentmanager)',
  '11. Webanalyse: Google Analytics 4 (GA4)',
  '12. Marketing: Meta-Pixel (Facebook/Instagram)',
  '13. Kontaktaufnahme per E-Mail/Telefon',
  '14. KI-Telefonassistent bei Anrufen',
  '15. Kundenportal und Bewerberportal',
  '16. Automatisierte Abläufe (Zapier)',
  '17. Anfragen über Vermittlungsportale (Information nach Art. 14 DSGVO)',
  '18. Projektplanung, Angebot und Herstellervalidierung (autarc, Wolf, Vaillant)',
  '19. Empfänger',
  '20. Datensicherheit',
  '21. Aktualität',
];

const ALTSTELLEN = [
  'HubSpot Ireland',
  'autarc Energy GmbH',
  'Art. 13 DSGVO über die Verarbeitung',
  'nur an die genannten Dienstleister',
];

const SOLLSTELLEN = [
  'HubSpot Germany GmbH, Am Postbahnhof 17, 10243 Berlin',
  'Scavix Software GmbH & Co. KG, Dörmter Straße 6, 29588 Oetzen',
  'Zapier, Inc., 548 Market St. #62411',
  'WattFox GmbH, Engelbergerstr. 21, 79106 Freiburg',
  'eine Übermittlung in Drittländer erfolgt nur unter Beachtung der Art. 44 ff. DSGVO',
  'ElevenLabs, Inc.',
];

function normalisiere(text) {
  return text
    .replace(/\u00ad/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function ladeText(page) {
  await page.goto('/datenschutz.html');
  return normalisiere(await page.locator('body').innerText());
}

test('@smoke Datenschutz 1: Überschriftenfolge ist vollständig und exakt', async ({ page }) => {
  await page.goto('/datenschutz.html');
  const ueberschriften = await page.locator('main h2').allInnerTexts();
  expect(ueberschriften.map(normalisiere)).toEqual(UEBERSCHRIFTEN);
});

test('@smoke Datenschutz 2: alte Formulierungen fehlen', async ({ page }) => {
  const text = await ladeText(page);
  for (const altstelle of ALTSTELLEN) expect(text).not.toContain(altstelle);
});

test('@smoke Datenschutz 3: neue Schlüsselstellen stehen je genau einmal', async ({ page }) => {
  const text = await ladeText(page);
  for (const sollstelle of SOLLSTELLEN) {
    expect(text.split(sollstelle).length - 1, sollstelle).toBe(1);
  }
});

test('@smoke Datenschutz 4: Singapur und Supabase fehlen', async ({ page }) => {
  const text = await ladeText(page);
  expect(text).not.toContain('Singapur');
  expect(text).not.toContain('Supabase');
});

test('@smoke Datenschutz 5: nur der bestehende Geviertstrich ist vorhanden', async ({ page }) => {
  const text = await ladeText(page);
  expect(text.split('—').length - 1).toBe(1);
  expect(text).not.toContain('–');
});
