'use strict';
/* global dataLayer, document, getComputedStyle, KV_STATE, localStorage, sessionStorage */

const fs = require('fs');
const path = require('path');
const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('@playwright/test');
const engine = require('../apps-script/rechner-backend/kv_engine.gs');

const HINWEIS =
  'Wir nutzen deine Angaben für deine Bewerbung. Mehr dazu in unserer Datenschutzerklärung.';
const KONTAKT_TEXT =
  'Ich stimme der Verarbeitung meiner Daten gemäß der Datenschutzerklärung zu und erteile meine Einwilligung zur Kontaktaufnahme. Die Einwilligung ist jederzeit widerrufbar.';
const ALTE_BREITE = { bewerbung: 320, stelle: 320, kontakt: 320 };
const SCHRITTE = {
  bewerbung: ['rolle', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'name', 'kontakt'],
  stelle: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'name', 'kontakt'],
};
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

async function aktuellenSchrittGueltigFuellen(page, schritt) {
  const werte = {
    a1: ['bewerber_arbeitserlaubnis', 'ja_uneingeschraenkt'],
    a2: ['bewerber_berufsabschluss', 'ausland'],
    a3: ['bewerber_anerkennung', 'voll'],
    a4: ['bewerber_berufserfahrung', '1_bis_3'],
    a5: ['bewerber_fuehrerschein', 'b'],
    a6: ['bewerber_deutsch', 'gut_arbeitsalltag'],
    a8: ['bewerber_start', 'sofort'],
  };
  if (schritt === 'rolle') {
    await page.locator('[name=beworbene_rolle]').selectOption('anlagenmechaniker');
  } else if (werte[schritt]) {
    const [name, value] = werte[schritt];
    await page.locator(`[name="${name}"][value="${value}"]`).check();
  } else if (schritt === 'a7') {
    await page.locator('[name=bewerber_plz]').fill('30159');
  } else if (schritt === 'name') {
    await page.locator('[name=firstname]').fill('Synthetisch');
    await page.locator('[name=lastname]').fill('Prüfung');
  } else if (schritt === 'kontakt') {
    await page.locator('[name=email]').fill('synthetisch@example.invalid');
    await page.locator('[name=phone]').fill('000000');
  }
}

async function jedenBewerbungsschritt(page, { seite, breite, theme }, pruefen) {
  await page.setViewportSize({ width: breite, height: 1000 });
  await fremdeDiensteAbklemmen(page);
  const parameter = seite === 'stelle' ? `role=anlagenmechaniker&theme=${theme}` : `theme=${theme}`;
  await page.goto(`/${seite}.html?${parameter}`, { waitUntil: 'domcontentloaded' });
  const gesehen = [];
  for (let index = 0; index < 15; index += 1) {
    const aktuell = page.locator('.kb-step:not([hidden])');
    await expect(aktuell).toHaveCount(1);
    const schritt = await aktuell.getAttribute('data-schritt');
    gesehen.push(schritt);
    await aktuellenSchrittGueltigFuellen(page, schritt);
    await pruefen(schritt);
    if (schritt === 'kontakt') break;
    await page.getByRole('button', { name: 'Weiter', exact: true }).click();
    await page.waitForFunction(
      (vorher) =>
        document.querySelector('.kb-step:not([hidden])')?.getAttribute('data-schritt') !== vorher,
      schritt
    );
  }
  expect(gesehen).toEqual(SCHRITTE[seite]);
}

async function randmessung(page, { karte, formular, innenabstand, formOptik }) {
  return page.evaluate(
    ({ karte, formular, innenabstand, formOptik }) => {
      const nummer = (wert) => Number.parseFloat(wert) || 0;
      const card = document.querySelector(karte);
      const form = document.querySelector(formular);
      const cardStyle = getComputedStyle(card);
      const formStyle = getComputedStyle(form);
      const cardRect = card.getBoundingClientRect();
      const formRect = form.getBoundingClientRect();
      const border = {
        top: nummer(cardStyle.borderTopWidth),
        right: nummer(cardStyle.borderRightWidth),
        bottom: nummer(cardStyle.borderBottomWidth),
        left: nummer(cardStyle.borderLeftWidth),
      };
      const padding = {
        top: nummer(cardStyle.paddingTop),
        right: nummer(cardStyle.paddingRight),
        bottom: nummer(cardStyle.paddingBottom),
        left: nummer(cardStyle.paddingLeft),
      };
      const grenzen = {
        left: cardRect.left + border.left + innenabstand,
        right: cardRect.right - border.right - innenabstand,
        top: cardRect.top + border.top + innenabstand,
        bottom: cardRect.bottom - border.bottom - innenabstand,
      };
      const unsichtbar = (element) => {
        if (['SCRIPT', 'STYLE', 'OPTION'].includes(element.tagName)) return true;
        if (element.matches('input[type="hidden"]')) return true;
        const rect = element.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return true;
        for (let node = element; node; node = node.parentElement) {
          const style = getComputedStyle(node);
          if (
            node.hasAttribute('hidden') ||
            style.display === 'none' ||
            style.visibility === 'hidden'
          )
            return true;
        }
        const style = getComputedStyle(element);
        if (
          style.clip === 'rect(0px, 0px, 0px, 0px)' &&
          style.clipPath === 'inset(50%)' &&
          style.overflow === 'hidden'
        )
          return true;
        return (
          element.matches('input') &&
          style.position === 'absolute' &&
          Number.parseFloat(style.opacity) === 0
        );
      };
      const fehler = [];
      for (const [seite, wert] of Object.entries(padding)) {
        if (Math.abs(wert - innenabstand) > 0.5)
          fehler.push(`Karten-Padding ${seite}: ${wert} statt ${innenabstand}`);
      }
      const inhaltBreite =
        cardRect.width - border.left - border.right - padding.left - padding.right;
      if (Math.abs(formRect.width - inhaltBreite) > 0.5)
        fehler.push(`Formularbreite ${formRect.width} statt ${inhaltBreite}`);
      if (formOptik) {
        for (const seite of ['Top', 'Right', 'Bottom', 'Left']) {
          const wert = nummer(formStyle[`border${seite}Width`]);
          if (wert > 0.5) fehler.push(`Formularrahmen ${seite}: ${wert}`);
          const pad = nummer(formStyle[`padding${seite}`]);
          if (pad > 0.5) fehler.push(`Formular-Padding ${seite}: ${pad}`);
        }
        if (formStyle.boxShadow !== 'none') fehler.push(`Formularschatten: ${formStyle.boxShadow}`);
        if (!['rgba(0, 0, 0, 0)', 'transparent'].includes(formStyle.backgroundColor))
          fehler.push(`Formularhintergrund: ${formStyle.backgroundColor}`);
      }
      const elemente = [...card.querySelectorAll('*')].filter((element) => !unsichtbar(element));
      for (const element of elemente) {
        const rect = element.getBoundingClientRect();
        const name = `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${
          element.classList.length ? `.${[...element.classList].join('.')}` : ''
        }`;
        if (rect.left < grenzen.left - 0.5)
          fehler.push(`${name} links ${rect.left} < ${grenzen.left}`);
        if (rect.right > grenzen.right + 0.5)
          fehler.push(`${name} rechts ${rect.right} > ${grenzen.right}`);
        if (rect.top < grenzen.top - 0.5) fehler.push(`${name} oben ${rect.top} < ${grenzen.top}`);
        if (rect.bottom > grenzen.bottom + 0.5)
          fehler.push(`${name} unten ${rect.bottom} > ${grenzen.bottom}`);
      }
      return { fehler, padding, formWidth: formRect.width, contentWidth: inhaltBreite };
    },
    { karte, formular, innenabstand, formOptik }
  );
}

async function ueberlaufmessung(page) {
  return page.evaluate(() => {
    const unsichtbar = (element) => {
      if (['SCRIPT', 'STYLE', 'OPTION'].includes(element.tagName)) return true;
      if (element.matches('input[type="hidden"]')) return true;
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return true;
      for (let node = element; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (
          node.hasAttribute('hidden') ||
          style.display === 'none' ||
          style.visibility === 'hidden'
        )
          return true;
      }
      const style = getComputedStyle(element);
      if (
        style.clip === 'rect(0px, 0px, 0px, 0px)' &&
        style.clipPath === 'inset(50%)' &&
        style.overflow === 'hidden'
      )
        return true;
      return (
        element.matches('input') &&
        style.position === 'absolute' &&
        Number.parseFloat(style.opacity) === 0
      );
    };
    const breite = document.documentElement.clientWidth;
    return [...document.body.querySelectorAll('*')]
      .filter((element) => !unsichtbar(element))
      .flatMap((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.left >= -0.5 && rect.right <= breite + 0.5) return [];
        return [
          `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}: ${rect.left} bis ${rect.right} bei ${breite}`,
        ];
      });
  });
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

test('@smoke D1 Bewerbung hat genau einen Rahmen und den festen Innenabstand', async ({ page }) => {
  for (const breite of [1440, 768, 767, 390, 320]) {
    for (const theme of ['light', 'dark']) {
      const innenabstand = breite >= 768 ? 40 : 20;
      await jedenBewerbungsschritt(page, { seite: 'bewerbung', breite, theme }, async (schritt) => {
        const messung = await randmessung(page, {
          karte: '#bewerbungCard',
          formular: '#bewerbungForm',
          innenabstand,
          formOptik: true,
        });
        expect(messung.fehler, `${breite}px ${theme} Schritt ${schritt}`).toEqual([]);
      });
    }
  }
});

test('@smoke D2 Stelle hat in jedem Schritt den festen Innenabstand', async ({ page }) => {
  for (const breite of [1440, 768, 767, 390, 320]) {
    for (const theme of ['light', 'dark']) {
      const innenabstand = breite >= 768 ? 40 : 20;
      await jedenBewerbungsschritt(page, { seite: 'stelle', breite, theme }, async (schritt) => {
        const messung = await randmessung(page, {
          karte: '.st-formkarte',
          formular: '#stForm',
          innenabstand,
          formOptik: true,
        });
        expect(messung.fehler, `${breite}px ${theme} Schritt ${schritt}`).toEqual([]);
      });
    }
  }
});

test('@smoke D3 Bewerbungsseiten laufen in keinem Schritt seitlich über', async ({ page }) => {
  for (const seite of ['bewerbung', 'stelle']) {
    for (const theme of ['light', 'dark']) {
      await jedenBewerbungsschritt(page, { seite, breite: 320, theme }, async (schritt) => {
        expect(await ueberlaufmessung(page), `${seite} ${theme} Schritt ${schritt}`).toEqual([]);
      });
    }
  }
});

test('@smoke D4 Bewerbungsseite trägt ausschließlich den freigegebenen Wortlaut', async ({
  page,
}) => {
  await fremdeDiensteAbklemmen(page);
  await page.goto('/bewerbung.html', { waitUntil: 'domcontentloaded' });
  const labelBewerbung = sichtbar(await page.locator('label[for="bwNewsletter"]').innerText());
  await fremdeDiensteAbklemmen(page);
  await page.goto('/stelle.html?role=anlagenmechaniker', { waitUntil: 'domcontentloaded' });
  const labelStelle = sichtbar(await page.locator('label[for="stNewsletter"]').innerText());
  expect(labelBewerbung).toBe(labelStelle);
  expect(labelBewerbung).not.toMatch(/[\u2013\u2014]/u);
  expect(sichtbar(await page.locator('.st-hinweis').textContent())).toBe(HINWEIS);

  await fremdeDiensteAbklemmen(page);
  await page.goto('/bewerbung.html', { waitUntil: 'domcontentloaded' });
  expect(sichtbar(await page.locator('.bewerbung-hinweis').textContent())).toBe(HINWEIS);
  const sectionText = sichtbar(await page.locator('section#bewerbung').textContent());
  expect(sectionText).not.toMatch(/[\u2013\u2014]/u);
  const beschreibungen = await page
    .locator('head')
    .evaluate(() => [
      document.querySelector('meta[name="description"]')?.getAttribute('content'),
      document.querySelector('meta[property="og:description"]')?.getAttribute('content'),
      document.querySelector('meta[name="twitter:description"]')?.getAttribute('content'),
    ]);
  expect(beschreibungen.join(' ')).not.toMatch(/[\u2013\u2014]/u);
  expect(beschreibungen).toEqual([
    'Bewirb dich in zwei Minuten bei HeroWerk, Meisterbetrieb für Wärmepumpen in der Region Hannover. Rolle wählen, Kontakt angeben, fertig.',
    'Bewirb dich in zwei Minuten bei HeroWerk, Meisterbetrieb für Wärmepumpen in der Region Hannover.',
    'Bewirb dich in zwei Minuten bei HeroWerk, Meisterbetrieb für Wärmepumpen in der Region Hannover.',
  ]);
  await expect(page.locator('.section-lead')).toHaveText(
    'Zwei Minuten, ein kurzes Formular. Den Rest besprechen wir persönlich.'
  );
  expect(sichtbar(await page.locator('#bewerbungRoleHint').textContent())).toBe(
    'Schön, dass du da bist. Wähle deine Rolle, trag deine Kontaktdaten ein. Wir melden uns zeitnah. Lebenslauf & Zeugnisse brauchst du jetzt noch nicht: die lädst du anschließend bequem in deinem persönlichen Bewerber-Portal hoch.'
  );
  expect(sichtbar(await page.locator('#bewerbungSuccess p').textContent())).toBe(
    'Deine Bewerbung ist bei uns eingegangen. Du bekommst gleich eine E-Mail mit dem Link zu deinem persönlichen Bewerber-Portal. Dort kannst du jederzeit Lebenslauf, Zeugnisse und Zertifikate hochladen und sehen, wie es weitergeht.'
  );
});
