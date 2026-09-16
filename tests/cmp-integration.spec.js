'use strict';
/* global document, window */

const { test, expect } = require('@playwright/test');

// Vertragsprüfung der Website-Integration mit einem kleinen CMP-Doppel. Der
// echte Dienst bleibt Eigentümer von Markup und Zustimmungslogik; geprüft wird
// nur unsere dokumentierte __cmp-Schnittstelle und der offene ShadowRoot.
test('@a11y @cmp CMP-Dialog führt Fokus, Tab-Zyklus und Anbieterlink', async ({ page }) => {
  await page.addInitScript(() => {
    const listeners = {};
    document.addEventListener('DOMContentLoaded', () => {
      const wrapper = document.createElement('div');
      wrapper.id = 'cmpwrapper';
      const shadow = wrapper.attachShadow({ mode: 'open' });
      shadow.innerHTML = `
      <button class="cmpboxrecalllink" type="button">Datenschutz-Einstellungen</button>
      <div id="cmpbox" role="dialog" aria-modal="true" style="display:none">
        <h1>Cookie-Einstellungen</h1>
        <p>Mehr Informationen über <a class="cmplink cmplinkvendors" href="#">Dritte</a>.</p>
        <button type="button" id="cmp-first">Alles ablehnen</button>
        <button type="button" id="cmp-last">Speichern</button>
        <button type="button" id="cmp-after">Sprache</button>
      </div>`;
      document.documentElement.appendChild(wrapper);
      window.__cmp = (command, parameter, callback) => {
        if (command === 'getCMPData') {
          callback({ purposeConsents: {}, vendorConsents: {} });
        } else if (command === 'addEventListener') {
          listeners[parameter[0]] = parameter[1];
        } else if (command === 'showScreenAdvanced') {
          /** @type {HTMLElement} */ (shadow.querySelector('#cmpbox')).style.display = 'block';
          listeners.consentscreen?.();
        } else if (command === 'close') {
          /** @type {HTMLElement} */ (shadow.querySelector('#cmpbox')).style.display = 'none';
          listeners.consentscreenoff?.();
        }
      };
      shadow.querySelector('.cmpboxrecalllink').addEventListener('click', () => {
        /** @type {HTMLElement} */ (shadow.querySelector('#cmpbox')).style.display = 'block';
        listeners.consentscreen?.();
      });
      shadow
        .querySelector('#cmpbox')
        .addEventListener('keydown', (/** @type {KeyboardEvent} */ event) => {
          if (event.key === 'Escape') {
            /** @type {HTMLElement} */ (shadow.querySelector('#cmpbox')).style.display = 'none';
            listeners.consentscreenoff?.();
          }
        });
    });
  });

  await page.goto('/?cmp-integration-test', { waitUntil: 'domcontentloaded' });
  const footer = page.locator('.cookie-settings-button').first();
  await expect(footer).toBeVisible();

  await footer.click();
  const cmp = page.locator('#cmpwrapper');
  await expect
    .poll(() =>
      cmp.evaluate((host) => {
        const active = host.shadowRoot.activeElement;
        const dialog = host.shadowRoot.querySelector('[role="dialog"]');
        return Boolean(active && dialog.contains(active));
      })
    )
    .toBe(true);

  const vendor = cmp.locator('a.cmplinkvendors');
  await expect(vendor).toHaveCSS('text-decoration-line', 'underline');
  await expect(vendor).toHaveCSS('color', 'rgb(79, 96, 0)');

  await cmp.locator('#cmp-last').focus();
  await page.keyboard.press('Tab');
  await expect
    .poll(() => cmp.evaluate((host) => host.shadowRoot.activeElement?.id))
    .toBe('cmp-after');
  await page.keyboard.press('Tab');
  await expect
    .poll(() => cmp.evaluate((host) => host.shadowRoot.activeElement?.className))
    .toBe('cmplink cmplinkvendors');
  await page.keyboard.press('Shift+Tab');
  await expect
    .poll(() => cmp.evaluate((host) => host.shadowRoot.activeElement?.id))
    .toBe('cmp-after');

  await page.keyboard.press('Escape');
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.className))
    .toBe('cookie-settings-button');

  const recall = cmp.locator('.cmpboxrecalllink');
  await recall.focus();
  await page.keyboard.press('Enter');
  await expect
    .poll(() =>
      cmp.evaluate((host) => {
        const active = host.shadowRoot.activeElement;
        return Boolean(active && host.shadowRoot.querySelector('[role="dialog"]').contains(active));
      })
    )
    .toBe(true);
  await page.keyboard.press('Escape');
  await expect
    .poll(() => cmp.evaluate((host) => host.shadowRoot.activeElement?.className))
    .toBe('cmpboxrecalllink');
});
