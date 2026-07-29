'use strict';

const { errors } = require('@playwright/test');

const consentHandledPages = new WeakSet();

/**
 * Schließt den consentmanager-Banner kontrolliert über „Alles ablehnen“.
 * Falls der Anbieter keinen Banner ausliefert, bleibt der Seitentest lauffähig;
 * ein eigener Smoke-Test prüft die Banner-Ladekette separat und strikt.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ timeout?: number }} [options]
 * @returns {Promise<boolean>}
 */
async function rejectConsentIfVisible(page, options = {}) {
  if (consentHandledPages.has(page)) return false;

  const timeout = options.timeout ?? 10000;
  const banner = page.locator('#cmpbox');

  try {
    await banner.waitFor({ state: 'visible', timeout });
  } catch (error) {
    if (!(error instanceof errors.TimeoutError)) throw error;
    // Kein Dialog vorhanden. Das wird fuer DIESE Seite gemerkt, nicht nur der Fall
    // "Dialog war da und wurde weggeklickt".
    // GEMESSENER GRUND (29.07.2026): der Mandant 173772 liefert derzeit ueberhaupt
    // keinen Dialog aus, weder live noch in der Vorschau. Ohne dieses Merken wartet
    // der Helfer bei JEDER Navigation erneut die vollen 10 s. Der Navigationstest
    // ruft sechs Ziele auf, macht 6 x 10 s = 60 s und reisst damit die Zeitgrenze von
    // 60 s pro Testfall. Der Test war dadurch auch nach der Korrektur der Menuepunkte
    // noch rot, aus einem voellig anderen Grund als vorher.
    // Die Annahme dahinter: der Einwilligungszustand gilt pro Browser-Kontext. Wenn
    // beim ersten Laden kein Dialog kommt, kommt er auch beim zweiten nicht.
    consentHandledPages.add(page);
    return false;
  }

  const rejectButton = banner.locator('.cmpboxbtnno').first();
  await rejectButton.waitFor({ state: 'visible', timeout });
  await rejectButton.click();
  await banner.waitFor({ state: 'hidden', timeout });
  consentHandledPages.add(page);
  return true;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} url
 * @param {Parameters<import('@playwright/test').Page['goto']>[1]} [options]
 */
async function gotoWithConsentRejected(page, url, options) {
  const response = await page.goto(url, options);
  await rejectConsentIfVisible(page);
  return response;
}

module.exports = { gotoWithConsentRejected, rejectConsentIfVisible };
