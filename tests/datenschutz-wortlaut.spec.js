'use strict';
const { test, expect } = require('@playwright/test');

const UEBERSCHRIFTEN = [
  '1. Verantwortlicher',
  '2. Datenschutzbeauftragter',
  '3. Ihre Rechte',
  '4. Beschwerderecht',
  '5. Hosting',
  '6. Server-Logfiles',
  '7. Schriftarten',
  '8. Anfrage und Kontaktformular',
  '8a. Bewerbung',
  '9. Wärmepumpen-Rechner',
  '10. Einwilligung und Cookie-Banner',
  '11. Webanalyse (Google Analytics)',
  '12. Marketing (Meta-Pixel)',
  '13. Kontaktaufnahme per E-Mail und Telefon',
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
  'ausschließlich auf Servern in Deutschland',
  'Mit IONOS besteht',
  'Barlow',
  'Anfrage-Funnel',
  'Funnel-Angaben',
  'Pflicht-Häkchen',
  'EU-Region',
  'hilfsweise per E-Mail',
  'wie in Abschnitt 8 beschrieben',
  'entscheidet ein Mensch',
  'serverseitig',
  'Dabei wird Ihre IP-Adresse an Google übertragen',
  'US-Transfer',
  'DPF',
  'SCC',
  'AV-Vertrag',
  'Consent-Layer',
  'Consent Mode',
  'Autoblocking',
  'So funktioniert es technisch',
  'Nach Widerruf werden die betroffenen Dienste nicht mehr geladen',
  'Google-Signale',
  'IP-Anonymisierung',
  'Nutzer-/Ereignisdaten',
  'Remarketing',
  'US-Behörden',
  'kann für die Erhebung',
  'Unsere E-Mail-Postfächer',
  'siehe Abschnitte 11 und 12',
];

const SOLLSTELLEN = [
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
  'Diese Website wird von einem Hosting-Dienstleister als Auftragsverarbeiter nach Art. 28 DSGVO bereitgestellt',
  'Zur Speicherdauer der Protokolle siehe Ziffer 6',
  'Sicherheitsrelevante Logs werden i. d. R. nach maximal 30 Tagen gelöscht',
  'Schriftarten liefern wir von unserem eigenen Server aus',
  'Wir führen die Daten in unserem Kundensystem, das ein Dienstleister als Auftragsverarbeiter nach Art. 28 DSGVO für uns betreibt',
  'Die Muttergesellschaft in den USA ist unter dem EU-US Data Privacy Framework zertifiziert',
  'Für Empfänger und Drittland gilt Ziffer 8',
  'Dafür speichern wir Ihre Kontaktdaten bis zu Ihrem Widerruf',
  'auf dem Server unserer Website (Ziffer 5)',
  'Über die Protokolle des Servers hinaus (Ziffer 6) speichern wir Ihre Eingaben nicht',
  'übernehmen wir Ihre Eingaben und die Ergebnisse der Berechnung in diese Anfrage; dafür gilt Ziffer 8',
  'Dafür setzen wir einen Dienstleister mit Sitz in der Europäischen Union ein',
  'Das Protokoll Ihrer Einwilligung wird nach 13 Monaten gelöscht',
  'Vor Ihrer Zustimmung findet keine Analyse- oder Marketing-Verarbeitung statt',
  'über den Knopf „Cookie-Einstellungen“ am Fuß jeder Seite oder durch eine Nachricht an uns',
  '§ 25 Abs. 2 Nr. 2 TDDDG',
  'einen Webanalysedienst der Google Ireland Limited',
  'Die Daten werden spätestens 14 Monate nach Ihrem letzten Besuch gelöscht',
  'setzen wir den Meta-Pixel der Meta Platforms Ireland Limited ein',
  'sind wir und die Meta Platforms Ireland Limited gemeinsam verantwortlich (Art. 26 DSGVO)',
  'https://www.facebook.com/about/privacy',
  'Meta speichert die übermittelten Ereignisdaten höchstens zwei Jahre',
  'Für E-Mail, Kalender und Dateiablage setzen wir einen Dienstleister als Auftragsverarbeiter nach Art. 28 DSGVO ein',
  'Wir speichern die Daten, bis Ihr Anliegen erledigt ist',
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
  'IONOS',
  'HubSpot',
  'consentmanager',
  'Google Apps Script',
  'Apps Script',
  'app-eu1',
  'Workspace',
  'Montabaur',
  'Elgendorfer',
  'Postbahnhof',
  'Helsingborg',
  'Järnvägsgatan',
  'Barrow Street',
  'Grand Canal',
  'Dublin',
  'Google Ireland Ltd',
  'Meta Platforms Ireland Ltd',
  'GA4',
  'CMP',
  'localStorage',
  'sessionStorage',
  'hero-theme',
  'hwLeadPrefill',
  'hwFoerderPrefill',
  '/anfrage',
  '/kontakt',
  '/bewerbung',
  '/stelle',
  'denied',
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

test('@smoke Datenschutz 5: sichtbarer Text ist frei von Gedankenstrichen', async ({ page }) => {
  const text = await ladeText(page);
  expect(text).not.toContain('—');
  expect(text).not.toContain('–');
});

test('@smoke Datenschutz 6: freigegebene Mehrfachstellen haben die exakte Anzahl', async ({
  page,
}) => {
  const text = await ladeText(page);
  expect(text.split('Eine Kopie der Garantien erhalten Sie auf Anfrage bei uns').length - 1).toBe(
    6
  );
  expect(
    text.split('Ihre Einwilligung können Sie jederzeit widerrufen (Ziffer 10)').length - 1
  ).toBe(2);
});

test('@smoke Datenschutz 7: Ziffern 5 bis 13 haben den freigegebenen Aufbau', async ({ page }) => {
  await page.goto('/datenschutz.html');
  const aufbau = await page.locator('main').evaluate((main) => {
    const headings = [...main.querySelectorAll('h2')];
    const erwartet = new Map([
      ['5.', 1],
      ['6.', 1],
      ['7.', 1],
      ['8.', 3],
      ['8a.', 2],
      ['9.', 1],
      ['10.', 4],
      ['11.', 2],
      ['12.', 3],
      ['13.', 3],
    ]);
    const absatzAnzahlen = {};
    for (const heading of headings) {
      const nummer = heading.textContent.trim().split(/\s+/, 1)[0];
      if (!erwartet.has(nummer)) continue;
      let element = heading.nextElementSibling;
      let anzahl = 0;
      while (element && element.tagName !== 'H2') {
        if (element.tagName === 'P') anzahl += 1;
        element = element.nextElementSibling;
      }
      absatzAnzahlen[nummer] = anzahl;
    }

    const start = headings.find((heading) => heading.textContent.trim().startsWith('5.'));
    const ende = headings.find((heading) => heading.textContent.trim().startsWith('14.'));
    const elemente = [];
    /** @type {Element | null | undefined} */
    let element = start;
    while (element && element !== ende) {
      elemente.push(element);
      element = element.nextElementSibling;
    }
    const verboten = elemente.flatMap((knoten) => [
      ...(knoten.matches('ul,ol,strong,em,code') ? [knoten] : []),
      ...knoten.querySelectorAll('ul,ol,strong,em,code'),
    ]).length;
    const links = elemente.flatMap((knoten) => [
      ...(knoten.matches('a') ? [knoten] : []),
      ...knoten.querySelectorAll('a'),
    ]);
    return {
      absatzAnzahlen,
      erwartet: Object.fromEntries(erwartet),
      verboten,
      links: links.map((link) => ({
        href: link.getAttribute('href'),
        target: link.getAttribute('target'),
        rel: link.getAttribute('rel'),
      })),
    };
  });

  expect(aufbau.absatzAnzahlen).toEqual(aufbau.erwartet);
  expect(aufbau.verboten).toBe(0);
  expect(aufbau.links).toEqual([
    {
      href: 'https://www.facebook.com/about/privacy',
      target: '_blank',
      rel: 'noopener',
    },
  ]);
});
