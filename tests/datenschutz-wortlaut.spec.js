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
  '16. Automatisierte Abläufe',
  '17. Anfragen über Vermittlungsportale (Information nach Art. 14 DSGVO)',
  '18. Projektplanung und Angebot',
  '19. Empfänger',
  '20. Datensicherheit',
  '21. Aktualität',
];

const ALTSTELLEN = [
  'HubSpot Ireland',
  'autarc Energy GmbH',
  'Art. 13 DSGVO über die Verarbeitung',
  'nur an die genannten Dienstleister',
  'bei Nutzung unserer Formulare und Portale',
  'CRM-System',
  'Herstellervalidierung',
  'Im Regelfall berechnen wir',
  'Kennung der Anfrage',
  'Fassung des angezeigten Angebots',
  'Annahmeprotokoll',
  'nicht standardmäßig für jede Anfrage',
  'Gesprächsinhalte überträgt',
  'Die Portale laufen bei',
];

const SOLLSTELLEN = [
  'HubSpot Germany GmbH, Am Postbahnhof 17, 10243 Berlin',
  'eine Übermittlung in Drittländer erfolgt nur unter Beachtung der Art. 44 ff. DSGVO. Wir speichern die Daten für die Dauer der Geschäftsbeziehung',
  'Art. 13 und Art. 14 DSGVO über die Verarbeitung Ihrer personenbezogenen Daten durch uns',
  'WattFox GmbH, Freiburg',
  'Die Namen der eingesetzten Dienstleister nennen wir Ihnen auf Anfrage',
  'Der Dienstleister setzt Unterauftragsverarbeiter in den USA ein',
  'ein Dienstleister mit Sitz in Deutschland als Auftragsverarbeiter nach Art. 28 DSGVO',
  'in unserem Kundensystem (siehe Ziffer 8) vermerkt',
  'Die Protokolle der Abläufe werden nach spätestens 69 Tagen gelöscht',
  'einen Automatisierungsdienst als Auftragsverarbeiter nach Art. 28 DSGVO',
  'eine Planungssoftware als Auftragsverarbeiter nach Art. 28 DSGVO',
  'Rufnummer, Zeitpunkt und Dauer Ihres Anrufs verarbeiten wir',
  'stellen wir Online-Portale bereit',
  'für den Nachweis des Vertragsschlusses Art. 6 Abs. 1 lit. f DSGVO',
  'Soweit es für die Abrechnung erforderlich ist',
  'Bei den in den Ziffern 8 und 16 genannten Dienstleistern',
  'geben wir die für die Auslegung nötigen Daten an den Hersteller der geplanten Wärmepumpe weiter',
];

const VERBOTENE_INTERNA = [
  'Zapier',
  'autarc',
  'Placetel',
  'PhoneMondo',
  'Scavix',
  'ElevenLabs',
  'Twilio',
  'OpenAI',
  'WOLF',
  'Wolf',
  'Vaillant',
  'ohne Passwort',
  '30 Minuten',
  'portal.herowerk.de',
  'bewerbung.herowerk.de',
  'Angebotsvergleich.de',
  'Engelbergerstr',
  'Invalidenstr',
  'Market St',
  'Sitzungskennung',
  'Anmeldezeitpunkte',
  'Anmeldelink',
  'Google Drive',
  'Singapur',
  'Supabase',
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

test('@smoke Datenschutz 4: Anbieternamen und Interna fehlen', async ({ page }) => {
  const text = await ladeText(page);
  for (const internum of VERBOTENE_INTERNA) expect(text).not.toContain(internum);
});

test('@smoke Datenschutz 5: nur der bestehende Geviertstrich ist vorhanden', async ({ page }) => {
  const text = await ladeText(page);
  expect(text.split('—').length - 1).toBe(1);
  expect(text).not.toContain('–');
});
