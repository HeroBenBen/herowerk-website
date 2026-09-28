/* global window, document */
const { test, expect } = require('@playwright/test');
const { gotoWithConsentRejected } = require('./helpers/consent');
test.describe.configure({ mode: 'parallel' });
/** @type {string} */
const pageName = 'stelle';
const roles =
  pageName === 'stelle' ? ['anlagenmechaniker', 'vad'] : ['anlagenmechaniker', 'vad', 'hr'];
async function fill(page, role, ausland = false) {
  if (pageName === 'bewerbung') {
    await page.locator('#bwRolle').selectOption(role);
    await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  }
  for (const [name, value] of [
    ['arbeitserlaubnis', 'ja_uneingeschraenkt'],
    ['berufsabschluss', ausland ? 'ausland' : 'meister_techniker'],
    ...(ausland ? [['anerkennung', 'voll']] : []),
    ['berufserfahrung', '1_bis_3'],
    ...(role === 'hr' ? [] : [['fuehrerschein', 'b']]),
    ['deutsch', 'gut_arbeitsalltag'],
    ['plz', '30159'],
    ['start', 'sofort'],
  ]) {
    const input = page.locator(
      '[name="bewerber_' + name + '"]' + (name === 'plz' ? '' : '[value="' + value + '"]')
    );
    if (name === 'plz') await input.fill(value);
    else await input.check();
    await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  }
  await page.locator('[name=firstname]').fill('Synthetisch');
  await page.locator('[name=lastname]').fill('Test');
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await page.locator('[name=email]').fill('test@example.invalid');
  await page.locator('[name=phone]').fill('000000');
  await page.locator('[name=datenschutzeinwilligung_bewerbung]').check();
}
for (const role of roles)
  for (const ausland of [false, true])
    test(`@smoke T1161 Nutzlast ${role} Ausland=${ausland}`, async ({ page }) => {
      const sent = [];
      await page.route('https://api.hsforms.com/**', (r) => {
        sent.push(r.request().postDataJSON());
        return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      });
      await gotoWithConsentRejected(page, `/${pageName}.html?role=${role}`);
      await fill(page, role, ausland);
      const consent = await page
        .locator('[name=datenschutzeinwilligung_bewerbung]')
        .evaluate((el) =>
          /** @type {HTMLInputElement} */ (el).labels[0].textContent.replace(/\s+/g, ' ').trim()
        );
      await page.getByRole('button', { name: 'Bewerbung absenden', exact: true }).click();
      await expect.poll(() => sent.length).toBe(1);
      expect(sent[0].legalConsentOptions.consent.text).toBe(consent);
      const vals = Object.fromEntries(sent[0].fields.map((f) => [f.name, f.value]));
      expect(vals.beworbene_rolle).toBe(role);
      expect(vals.bewerber_plz).toBe('30159');
      expect(vals.bewerber_anerkennung).toBe(ausland ? 'voll' : undefined);
      expect(vals.bewerber_fuehrerschein).toBe(role === 'hr' ? undefined : 'b');
      expect(vals.message || '').not.toMatch(/Arbeitserlaubnis|Berufserfahrung|Führerschein/);
      expect(Object.keys(vals).filter((k) => k.startsWith('bewerber_')).length).toBe(
        7 + (ausland ? 1 : 0) - (role === 'hr' ? 1 : 0)
      );
    });
test('@smoke T1161 Pflicht und PLZ', async ({ page }) => {
  await gotoWithConsentRejected(page, `/${pageName}.html?role=anlagenmechaniker`);
  if (pageName === 'bewerbung')
    await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await expect(page.locator('[data-schritt=a1]')).toBeVisible();
  for (const [n, v] of [
    ['arbeitserlaubnis', 'nein'],
    ['berufsabschluss', 'keiner'],
    ['berufserfahrung', 'keine'],
    ['fuehrerschein', 'keiner'],
    ['deutsch', 'kaum'],
  ]) {
    await page.locator(`[name=bewerber_${n}][value=${v}]`).check();
    await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  }
  await page.locator('[name=bewerber_plz]').fill('3015');
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await expect(page.locator('[data-schritt=a7]')).toBeVisible();
});
test('@smoke T1161 Familie und keine Auswahlentscheidung', async ({ page }) => {
  await gotoWithConsentRejected(page, `/${pageName}.html`);
  const map = await page.evaluate(() => /** @type {any} */ (window).HeroKurzbewerbung.families);
  expect(Object.keys(map)).toHaveLength(20);
  expect(map.vad).toBe('F4');
  expect(map.hr).toBe('F5');
});

for (const defect of ['fehlt', 'leer']) {
  test(`@smoke T1161 Einwilligungslabel ${defect}: sichtbarer Fehler ohne Request`, async ({
    page,
  }) => {
    let requests = 0;
    await page.route('https://api.hsforms.com/**', (route) => {
      requests++;
      return route.abort();
    });
    await gotoWithConsentRejected(page, `/${pageName}?role=anlagenmechaniker`);
    // Aktive Messung rein lokal nachstellen; kein Analytics-Script laden.
    await page.evaluate(() => {
      const script = document.createElement('script');
      script.type = 'text/plain';
      script.src = 'https://www.googletagmanager.com/gtag/js?id=G-TEST';
      document.head.appendChild(script);
      const w = /** @type {any} */ (window);
      w.__labelEvents = [];
      w.gtag = (...args) => w.__labelEvents.push(args);
      w.fbq = (...args) => w.__labelEvents.push(args);
    });
    await fill(page, 'anlagenmechaniker');
    await page.locator('[name=datenschutzeinwilligung_bewerbung]').evaluate((el, defect) => {
      const label = /** @type {HTMLInputElement} */ (el).labels[0];
      if (defect === 'fehlt') label.remove();
      else label.textContent = '   ';
    }, defect);
    await page.getByRole('button', { name: 'Bewerbung absenden', exact: true }).click();
    const error = page.locator(pageName === 'stelle' ? '#stFehler' : '#kbFehler');
    await expect(error).toBeVisible();
    await expect(error).toContainText('Das Senden hat gerade nicht geklappt.');
    await expect(error.locator('a')).toHaveAttribute(
      'href',
      'mailto:bewerbung@herowerk.de?subject=Bewerbung%20bei%20HeroWerk'
    );
    expect(requests, 'Labeldefekt muss vor jedem Forms-Request stoppen').toBe(0);
    await expect(
      page.getByRole('button', { name: 'Bewerbung absenden', exact: true })
    ).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Zurück', exact: true })).toBeEnabled();
    await expect(page.locator(pageName === 'stelle' ? '#stForm' : '#bewerbungForm')).toBeVisible();
    const events = await page.evaluate(() =>
      JSON.stringify(/** @type {any} */ (window).dataLayer || [])
    );
    expect(events).not.toContain('bewerbung_abgeschickt');
    await expect(
      page.locator(pageName === 'stelle' ? '#stErfolg' : '#bewerbungSuccess')
    ).toBeHidden();
    expect(await page.evaluate(() => /** @type {any} */ (window).__labelEvents)).toEqual([]);
  });
}

test('@smoke T1161 Anerkennung Pflicht und Werterhalt beim Zurückgehen', async ({ page }) => {
  await page.route('https://api.hsforms.com/**', (route) => route.abort());
  await gotoWithConsentRejected(page, `/${pageName}?role=anlagenmechaniker`);
  if (pageName === 'bewerbung') {
    await page.locator('#bwRolle').selectOption('anlagenmechaniker');
    await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  }
  await page.locator('[name=bewerber_arbeitserlaubnis][value=ja_uneingeschraenkt]').check();
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await page.locator('[name=bewerber_berufsabschluss][value=ausland]').check();
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await expect(page.locator('[data-schritt=a3]')).toBeVisible();
  await page.locator('[name=bewerber_anerkennung][value=voll]').check();
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await expect(page.locator('[data-schritt=a4]')).toBeVisible();
  await page.getByRole('button', { name: 'Zurück', exact: true }).click();
  await expect(page.locator('[name=bewerber_anerkennung][value=voll]')).toBeChecked();
  await page.getByRole('button', { name: 'Zurück', exact: true }).click();
  await expect(page.locator('[name=bewerber_berufsabschluss][value=ausland]')).toBeChecked();
  await page.locator('[name=bewerber_berufsabschluss][value=geselle_facharbeiter]').check();
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await expect(page.locator('[data-schritt=a3]')).toBeHidden();
  await expect(page.locator('[data-schritt=a4]')).toBeVisible();
});
