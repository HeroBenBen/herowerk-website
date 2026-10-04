'use strict';
/* global dataLayer, document, KV_STATE, localStorage, sessionStorage */

const fs = require('fs');
const path = require('path');
const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('@playwright/test');
const engine = require('../apps-script/rechner-backend/kv_engine.gs');

const HINWEIS =
  'Wir verarbeiten deine Angaben, um deine Bewerbung zu bearbeiten. Mehr dazu in unserer Datenschutzerklärung.';
const KONTAKT_TEXT =
  'Ich stimme der Verarbeitung meiner Daten gemäß der Datenschutzerklärung zu und erteile meine Einwilligung zur Kontaktaufnahme. Die Einwilligung ist jederzeit widerrufbar.';
const ALTE_BREITE = { bewerbung: 320, stelle: 320, kontakt: 320 };
const VALID_LEAD = {
  v: 1,
  quelle: 'kostenvergleich-waermepumpe',
  zeitpunkt: '2026-07-16T00:00:00.000Z',
  heizungsart: 'gas',
  verbrauch: { kwh: 20000, eingabeWert: 2000, einheit: 'm3', herkunft: 'market' },
  gebaeude: { geb: 'efh', bj: '1978-1994', san: 'teilweise', flaeche: 140 },
  kessel: { rohr: 'kunststoff', kbj: '1990-2010', altgas: 'ja' },
  zeitraum: 'h2-2026',
  ergebnis: { eigenanteil: 17120, zuschuss: 12880, quote: 46 },
};

function sichtbar(text) {
  return String(text || '')
    .replace(/\u00ad/g, '')
    .replace(/[\s\u00a0]+/g, ' ')
    .trim();
}

async function fremdeDiensteAbklemmen(page) {
  await page.route('https://cdn.consentmanager.net/**', (route) => route.abort());
  await page.route('**/consentmanager.net/**', (route) => route.abort());
  await page.route('**://*.consentmanager.net/**', (route) => route.abort());
}

async function rechnerApiAbfangen(page) {
  await page.route('**/api/rechner**', async (route) => {
    const url = new URL(route.request().url());
    const action = url.searchParams.get('action');
    let payload;
    let status = 200;
    if (action === 'kv_bootstrap') {
      payload = engine.kvBootstrapPayload(engine.KV_PARAMS_SEED);
      payload.aktivePeriode = 'alt';
    } else if (action === 'kostenvergleich') {
      const inputs = { ...engine.KV_DEFAULTS };
      for (const key of Object.keys(inputs)) {
        if (key === 'proklimaTog' || !url.searchParams.has(key)) continue;
        const value = url.searchParams.get(key);
        if (typeof inputs[key] === 'boolean') inputs[key] = ['1', 'true', 'ja'].includes(value);
        else if (typeof inputs[key] === 'number') inputs[key] = Number(value);
        else inputs[key] = value;
      }
      inputs.proklimaTog = false;
      payload = engine.kvCalculate(inputs, engine.KV_PARAMS_SEED);
    } else if (action === 'preise') {
      payload = { wolf: [], vaillant: [] };
    } else {
      status = 400;
      payload = { error: true, message: 'unknown_action' };
    }
    await route.fulfill({
      status,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify(payload),
    });
  });
}

async function bewerbungBisKontakt(page, seite, newsletter = false) {
  await fremdeDiensteAbklemmen(page);
  await page.goto(`/${seite}.html?role=anlagenmechaniker`, { waitUntil: 'domcontentloaded' });
  if (seite === 'bewerbung') {
    await page.locator('#bwRolle').selectOption('anlagenmechaniker');
    await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  }
  for (const [name, value] of [
    ['arbeitserlaubnis', 'ja_uneingeschraenkt'],
    ['berufsabschluss', 'meister_techniker'],
    ['berufserfahrung', '1_bis_3'],
    ['fuehrerschein', 'b'],
    ['deutsch', 'gut_arbeitsalltag'],
    ['plz', '30159'],
    ['start', 'sofort'],
  ]) {
    const input = page.locator(
      `[name="bewerber_${name}"]${name === 'plz' ? '' : `[value="${value}"]`}`
    );
    if (name === 'plz') await input.fill(value);
    else await input.check();
    await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  }
  await page.locator('[name=firstname]').fill('Synthetisch');
  await page.locator('[name=lastname]').fill('Prüfung');
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await page.locator('[name=email]').fill('synthetisch@example.invalid');
  await page.locator('[name=phone]').fill('000000');
  if (newsletter) await page.locator('[name=newslettereinwilligung]').check();
}

async function anfrageBisAbschluss(page) {
  for (let versuch = 0; versuch < 15; versuch += 1) {
    const schritt = await page.locator('.step.active').getAttribute('data-step');
    if (schritt === '10') return;
    if (schritt === '0') {
      await page.locator('.step[data-step="0"] .answer-card[data-value="Wärmepumpe"]').click();
      await page.locator('#interesseNextBtn').click();
    } else if (schritt === '9') {
      await page.locator('#plzInput').fill('30159');
      await page.locator('#plzNextBtn').click();
    } else if (schritt === '3') {
      await page.locator('#alterSelectUngefaehr').selectOption('20 Jahre oder älter');
      await page.locator('#alterNextBtn').click();
    } else {
      await page.locator(`.step[data-step="${schritt}"] .answer-card`).first().click();
    }
    await page.waitForFunction(
      (vorher) => document.querySelector('.step.active')?.getAttribute('data-step') !== vorher,
      schritt
    );
  }
  throw new Error('Anfrage erreichte den Abschluss nicht.');
}

async function anfrageAbsenden(page) {
  await anfrageBisAbschluss(page);
  await page.locator('#vorname').fill('Synthetisch');
  await page.locator('#nachname').fill('Prüfung');
  await page.locator('#telefon').fill('+49 511 0000000');
  await page.locator('#email').fill('synthetisch@example.invalid');
  await page.locator('#dsgvo').check();
  await page.locator('.btn-submit-final').click();
  await expect(page.locator('#successStep')).toBeVisible();
}

function ereignisse(events, name) {
  return events.filter((entry) => entry && entry[0] === 'event' && entry[1] === name);
}

test('@smoke A1 Kostenvergleich schreibt ohne Einwilligung keine Messkennung', async ({ page }) => {
  await fremdeDiensteAbklemmen(page);
  await rechnerApiAbfangen(page);
  await page.goto('/kostenvergleich-waermepumpe.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof KV_STATE !== 'undefined' && KV_STATE.last);
  await page.locator('[data-wz-heizart="gas"]').click();
  await page.locator('[data-wz-grp="vmode"][data-wz-val="known"]').click();
  await page.waitForFunction(() => KV_STATE.last && KV_STATE.last.system.heizart === 'gas');
  const speicher = await page.evaluate(() => ({
    session: Object.keys(sessionStorage),
    local: Object.keys(localStorage),
    cookie: document.cookie,
  }));
  expect(
    speicher.session.every((key) =>
      ['hero_kv_lead', 'hwLeadPrefill', 'hwFoerderPrefill'].includes(key)
    )
  ).toBe(true);
  expect(speicher.local.every((key) => ['hero-theme', 'hero-motion'].includes(key))).toBe(true);
  expect(speicher.cookie).toBe('');
});

test('@smoke A2 Quelltext enthält die gestrichene Messkennung nicht', async () => {
  const wurzel = path.resolve(__dirname, '..');
  const dateien = fs
    .readdirSync(wurzel)
    .filter((name) => name.endsWith('.html'))
    .map((name) => path.join(wurzel, name));
  for (const ordner of ['docs/intern', 'js', 'scripts']) {
    const start = path.join(wurzel, ordner);
    const stapel = [start];
    while (stapel.length) {
      const aktuell = stapel.pop();
      for (const eintrag of fs.readdirSync(aktuell, { withFileTypes: true })) {
        const fund = path.join(aktuell, eintrag.name);
        if (eintrag.isDirectory()) stapel.push(fund);
        else dateien.push(fund);
      }
    }
  }
  const treffer = dateien.filter((datei) =>
    fs.readFileSync(datei, 'utf8').includes('hero_kv_sitzung')
  );
  expect(treffer.map((datei) => path.relative(wurzel, datei))).toEqual([]);
});

test('@smoke A3 Anfrage nach Übernahme misst beide Ereignisse ohne Sitzungsparameter', async ({
  page,
}) => {
  const gesendet = [];
  await fremdeDiensteAbklemmen(page);
  await page.route('https://api.hsforms.com/**', async (route) => {
    gesendet.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.addInitScript(
    (lead) => sessionStorage.setItem('hero_kv_lead', JSON.stringify(lead)),
    VALID_LEAD
  );
  await page.goto('/anfrage.html', { waitUntil: 'domcontentloaded' });
  let events = await page.evaluate(() => dataLayer);
  let gemessen = ereignisse(events, 'lead_handoff_erkannt');
  expect(gemessen).toHaveLength(1);
  expect(Object.keys(gemessen[0]).sort()).toEqual(['0', '1']);
  expect(await page.evaluate(() => sessionStorage.getItem('hero_kv_sitzung'))).toBeNull();
  await anfrageAbsenden(page);
  expect(gesendet).toHaveLength(1);
  events = await page.evaluate(() => dataLayer);
  gemessen = ereignisse(events, 'lead_abgeschickt');
  expect(gemessen).toHaveLength(1);
  expect(Object.keys(gemessen[0]).sort()).toEqual(['0', '1']);
  expect(await page.evaluate(() => sessionStorage.getItem('hero_kv_sitzung'))).toBeNull();
});

test('@smoke A4 Anfrage ohne Übernahme misst keines der beiden Ereignisse', async ({ page }) => {
  await fremdeDiensteAbklemmen(page);
  await page.route('https://api.hsforms.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  );
  await page.goto('/anfrage.html', { waitUntil: 'domcontentloaded' });
  await anfrageAbsenden(page);
  const events = await page.evaluate(() => dataLayer);
  expect(ereignisse(events, 'lead_handoff_erkannt')).toEqual([]);
  expect(ereignisse(events, 'lead_abgeschickt')).toEqual([]);
});

test('@smoke B1 Bewerbungsseiten zeigen nur im letzten Schritt den festen Hinweis', async ({
  page,
}) => {
  for (const seite of ['bewerbung', 'stelle']) {
    await fremdeDiensteAbklemmen(page);
    await page.goto(`/${seite}.html?role=anlagenmechaniker`, { waitUntil: 'domcontentloaded' });
    const hinweis = page.locator(seite === 'bewerbung' ? '.bewerbung-hinweis' : '.st-hinweis');
    await expect(page.locator('[name=datenschutzeinwilligung_bewerbung]')).toHaveCount(0);
    await expect(hinweis).toBeHidden();
    await bewerbungBisKontakt(page, seite);
    await expect(hinweis).toBeVisible();
    expect(sichtbar(await hinweis.innerText())).toBe(HINWEIS);
    await expect(hinweis.locator('a')).toHaveCount(1);
    await expect(hinweis.locator('a')).toHaveAttribute('href', '/datenschutz');
    await expect(page.locator('[name=newslettereinwilligung]')).not.toBeChecked();
    expect(
      await hinweis.evaluate(
        (node) =>
          node.previousElementSibling?.querySelector('[name=newslettereinwilligung]') !== null
      )
    ).toBe(true);
  }
});

test('@smoke B2 Bewerbung sendet ohne Pflichtfeld und Newsletter nur nach Auswahl', async ({
  page,
}) => {
  for (const seite of ['bewerbung', 'stelle']) {
    for (const newsletter of [false, true]) {
      const gesendet = [];
      await page.unrouteAll({ behavior: 'wait' });
      await page.route('https://api.hsforms.com/**', async (route) => {
        gesendet.push(route.request().postDataJSON());
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      });
      await bewerbungBisKontakt(page, seite, newsletter);
      await page.getByRole('button', { name: 'Bewerbung absenden', exact: true }).click();
      await expect.poll(() => gesendet.length).toBe(1);
      const payload = gesendet[0];
      const felder = Object.fromEntries(payload.fields.map((feld) => [feld.name, feld.value]));
      expect(felder.datenschutzeinwilligung_bewerbung).toBeUndefined();
      expect(felder.newslettereinwilligung).toBe(newsletter ? 'true' : undefined);
      expect(payload.legalConsentOptions).toBeUndefined();
    }
  }
});

test('@smoke B3 letzter Bewerbungsschritt und Kontaktlabel bleiben lesbar', async ({ page }) => {
  const fehlendeHinweise = [];
  for (const seite of ['bewerbung', 'stelle']) {
    for (const theme of ['light', 'dark']) {
      await page.setViewportSize({ width: 320, height: 900 });
      await bewerbungBisKontakt(page, seite);
      await page.evaluate(
        (modus) => document.documentElement.setAttribute('data-theme', modus),
        theme
      );
      const auswahl = seite === 'bewerbung' ? '.bewerbung-hinweis' : '.st-hinweis';
      const breite = await page.evaluate(() => document.documentElement.scrollWidth);
      console.log(`Breite ${seite} ${theme}: ${breite}px`);
      if (!(await page.locator(auswahl).isVisible())) {
        fehlendeHinweise.push(`${seite}:${theme}`);
        continue;
      }
      const ergebnis = await new AxeBuilder({ page }).include(auswahl).analyze();
      expect(ergebnis.violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        ALTE_BREITE[seite]
      );
    }
  }
  for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width: 320, height: 900 });
    await fremdeDiensteAbklemmen(page);
    await page.goto(`/kontakt.html?theme=${theme}`, { waitUntil: 'domcontentloaded' });
    const label = 'label[for="kontaktDsgvo"]';
    const breite = await page.evaluate(() => document.documentElement.scrollWidth);
    console.log(`Breite kontakt ${theme}: ${breite}px`);
    await expect(page.locator(label)).toBeVisible();
    const ergebnis = await new AxeBuilder({ page }).include(label).analyze();
    expect(ergebnis.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      ALTE_BREITE.kontakt
    );
  }
  expect(fehlendeHinweise, 'Hinweis muss vor der Axe-Prüfung sichtbar sein').toEqual([]);
});

test('@smoke C1 Kontakt zeigt und sendet denselben festen Einwilligungstext', async ({ page }) => {
  const gesendet = [];
  await fremdeDiensteAbklemmen(page);
  await page.route('https://api.hsforms.com/**', async (route) => {
    gesendet.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.goto('/kontakt.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#kontaktName').fill('Synthetisch Prüfung');
  await page.locator('#kontaktEmail').fill('synthetisch@example.invalid');
  await page.locator('#kontaktNachricht').fill('Prüfung');
  await page.getByRole('button', { name: 'Nachricht senden' }).click();
  expect(gesendet).toHaveLength(0);
  await page.locator('#kontaktDsgvo').check();
  await page.getByRole('button', { name: 'Nachricht senden' }).click();
  await expect.poll(() => gesendet.length).toBe(1);
  const label = page.locator('label[for="kontaktDsgvo"]');
  expect(sichtbar(await label.innerText())).toBe(KONTAKT_TEXT);
  expect(gesendet[0].legalConsentOptions.consent.text).toBe(KONTAKT_TEXT);
  await expect(label.locator('a')).toHaveCount(1);
  await expect(label.locator('a')).toHaveAttribute('href', '/datenschutz');
});

test('@smoke C2 Anfrage zeigt und sendet denselben Einwilligungstext', async ({ page }) => {
  const gesendet = [];
  await fremdeDiensteAbklemmen(page);
  await page.route('https://api.hsforms.com/**', async (route) => {
    gesendet.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.goto('/anfrage.html', { waitUntil: 'domcontentloaded' });
  await anfrageAbsenden(page);
  expect(gesendet).toHaveLength(1);
  expect(sichtbar(await page.locator('label[for="dsgvo"]').innerText())).toBe(
    gesendet[0].legalConsentOptions.consent.text
  );
});
