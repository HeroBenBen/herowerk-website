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
