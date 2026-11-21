import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
export async function browserCheck(base, out, diagnostic = false, signal) {
  fs.mkdirSync(out, { recursive: true });
  const evidence = {
    mode: diagnostic
      ? 'Sondermodus --single-process --no-zygote'
      : 'normales Chromium, mehrere Prozesse',
    base,
    matrix: [],
    failures: [],
  };
  try {
    for (const width of [390, 1024, 1440])
      for (const theme of ['dark', 'light']) {
        if (signal?.aborted) throw new Error('Browserlauf angehalten');
        const browser = await chromium.launch({
          headless: true,
          ...(diagnostic ? { args: ['--single-process', '--no-zygote'] } : {}),
        });
        const abort = () => {
          void browser.close();
        };
        signal?.addEventListener('abort', abort, { once: true });
        if (signal?.aborted) abort();
        try {
          evidence.browser = browser.version();
          const context = await browser.newContext({ viewport: { width, height: 950 } });
          // Instrumentierung zeichnet Handshake und tatsächliche Zustandsmeldungen auf.
          await context.addInitScript(() => {
            window.__t1308 = { init: null };
            window.addEventListener('message', (event) => {
              if (event.data?.type === 't1300-init') window.__t1308.init = event.data;
            });
          });
          const requests = [],
            errors = [],
            forbidden = [];
          context.on('request', (request) => {
            requests.push({ method: request.method(), url: request.url() });
          });
          await context.route('**/*', (route) => {
            const url = new URL(route.request().url());
            if (url.origin !== new URL(base).origin || url.pathname.startsWith('/api/')) {
              forbidden.push(url.href);
              return route.abort();
            }
            return route.continue();
          });
          const page = await context.newPage();
          page.on('pageerror', (error) => errors.push(error.message));
          page.on('console', (message) => {
            if (message.type() === 'error') errors.push(message.text());
          });
          page.on('response', (response) => {
            if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
          });
          for (const portal of ['kunden', 'bewerber']) {
            const row = { width, theme, portal, stations: [] };
            evidence.matrix.push(row);
            await page.goto(`${base}/${portal}portal?theme=${theme}`);
            await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
            await expect(page.locator('.pv-station').last().locator('iframe')).toHaveCount(0);
            const logo = await page.locator('.nav-logo:visible').boundingBox();
            if (width === 1024) assert(Math.abs(logo.width - 79.25) <= 0.5, `Logo ${logo.width}`);
            if (width > 960) {
              const open = page.locator('#navPortalBtn');
              await open.focus();
              await page.keyboard.press('Enter');
              await expect(open).toHaveAttribute('aria-expanded', 'true');
              for (const href of ['https://portal.herowerk.de/', 'https://bewerbung.herowerk.de/'])
                await expect(page.locator(`#navPortalPanel a[href="${href}"]`)).toBeVisible();
              if (width === 1440)
                await page.screenshot({
                  path: path.join(out, `menue-${width}-${theme}-${portal}.png`),
                });
              await page.locator('#navPortalPanel a').first().focus();
              await page.keyboard.press('Escape');
              await expect(open).toBeFocused();
              await expect(open).toHaveAttribute('aria-expanded', 'false');
            } else {
              await page.locator('#hamburger').focus();
              await page.keyboard.press('Enter');
              await expect(page.locator('#mobileMenu')).toHaveClass(/open/);
              await expect(page.locator('[data-motion-switch]')).toHaveAttribute('role', 'switch');
              await expect(page.locator('[data-motion-switch]')).toHaveAttribute(
                'aria-label',
                'Bewegung: Aus oder An'
              );
              await expect(page.locator('[data-motion-switch]')).toHaveText('AusAn');
              for (const link of await page.locator('.mm-portal a').all()) {
                const box = await link.boundingBox();
                assert(box.width >= 44 && box.height >= 44, 'Trefferfläche');
              }
              await page.screenshot({
                path: path.join(out, `menue-${width}-${theme}-${portal}.png`),
              });
              await page.keyboard.press('Escape');
              await expect(page.locator('#hamburger')).toHaveAttribute('aria-expanded', 'false');
            }
            const stages = page.locator('.pv-buehne');
            for (let i = 0; i < (await stages.count()); i++) {
              const stage = stages.nth(i);
              await stage.scrollIntoViewIfNeeded();
              await expect(stage).toHaveAttribute('data-status', 'started', { timeout: 20000 });
              await expect(stage.locator('.pv-toast')).toBeHidden();
              const frameElement = stage.locator('iframe');
              await expect(frameElement).toHaveAttribute('sandbox', 'allow-scripts');
              const frame = await (await frameElement.elementHandle()).contentFrame();
              if ((await stage.getAttribute('data-view')) === 'dashboard')
                await expect(frame.locator('#portalContent')).toBeVisible();
              else await expect(frame.locator('body')).toBeVisible();
              const result = await frame.evaluate(() => {
                const denied = (read) => {
                  try {
                    read();
                    return false;
                  } catch {
                    return true;
                  }
                };
                return {
                  origin,
                  theme: document.documentElement.dataset.theme,
                  text: document.body.innerText.slice(0, 1000),
                  init: window.__t1308.init,
                  storageDenied: denied(() => window.localStorage),
                  parentDenied: denied(() => parent.document),
                  fonts: [...document.fonts].map((font) => font.status),
                };
              });
              assert.equal(result.origin, 'null');
              assert.equal(result.theme, theme);
              assert(result.storageDenied && result.parentDenied);
              assert.equal(result.init.scenario, Number(await stage.getAttribute('data-scenario')));
              assert(!/Ã.|Bitte öffne die Demo/.test(result.text));
              const buttons = stage.locator('xpath=..').locator('[data-ansicht]');
              await buttons.nth(1).click();
              await expect(stage).toHaveClass(/handy/);
              await buttons.nth(0).click();
              await expect(stage).not.toHaveClass(/handy/);
              const control = frame.locator('button, a, input').first();
              if (await control.count()) {
                await control.click();
                await expect(stage.locator('.pv-toast')).toBeVisible();
                await expect(stage.locator('.pv-toast')).toContainText(
                  'Das ist eine Vorschau, hier wird nichts gesendet'
                );
              }
              row.stations.push(result);
              if (i === 2)
                await page.screenshot({
                  path: path.join(out, `${portal}-station-${width}-${theme}.png`),
                });
            }
            row.overflow = await page.evaluate(
              () => document.documentElement.scrollWidth - innerWidth
            );
            assert.equal(row.overflow, 0);
            // Nur eigenes Markup prüfen, opake Dokumente separat über Inhalts- und Bedienproben.
            const axe = await new AxeBuilder({ page }).exclude('iframe').analyze();
            row.axe = axe.violations.map((v) => ({
              id: v.id,
              nodes: v.nodes.map((n) => n.target),
            }));
            assert.deepEqual(row.axe, [], 'A11y der Erklärseite');
          }
          // Auch die nicht im Storyboard verwendete Bewerber-Anmeldung und Mail
          // unter echten Dokument-Headern in einer opaken Sandbox initialisieren.
          if (width === 1440 && theme === 'dark') {
            await page.goto(`${base}/bewerberportal?theme=dark`);
            for (const portal of ['kunden', 'bewerber'])
              for (const view of ['login', 'mail', 'dashboard']) {
                const probe = await page.evaluate(
                  ({ portal, view }) =>
                    new Promise((resolve, reject) => {
                      const frame = document.createElement('iframe');
                      frame.dataset.t1308Probe = '1';
                      frame.title = 'Isolierter Export-Prüffall';
                      frame.setAttribute('sandbox', 'allow-scripts');
                      frame.src = `/vorschau/${portal}-${view}.html`;
                      let port;
                      const timeout = setTimeout(() => {
                        cleanup();
                        reject(new Error('Export startet nicht'));
                      }, 15000);
                      const cleanup = () => {
                        clearTimeout(timeout);
                        window.removeEventListener('message', ready);
                        port?.close();
                      };
                      const ready = (event) => {
                        if (
                          event.source !== frame.contentWindow ||
                          event.data?.type !== 't1300-ready'
                        )
                          return;
                        const channel = new MessageChannel();
                        port = channel.port1;
                        const run = crypto.randomUUID();
                        port.onmessage = ({ data }) => {
                          if (data.run !== run) return;
                          if (data.type === 'started') {
                            cleanup();
                            resolve({ portal, view, started: true });
                          }
                          if (data.type === 'blocked') {
                            cleanup();
                            reject(new Error('Export blockiert'));
                          }
                        };
                        frame.contentWindow.postMessage(
                          {
                            type: 't1300-init',
                            version: 1,
                            run,
                            scenario: 0,
                            state: null,
                            session: view === 'dashboard',
                            address:
                              view === 'dashboard'
                                ? 'dashboard.html?token=T1300-musterlink&email=demo%40example.com'
                                : 'index.html',
                            theme: 'dark',
                          },
                          '*',
                          [channel.port2]
                        );
                      };
                      window.addEventListener('message', ready);
                      document.body.append(frame);
                    }),
                  { portal, view }
                );
                const frame = await (
                  await page.locator('[data-t1308-probe]').elementHandle()
                ).contentFrame();
                await expect(
                  frame.locator(
                    view === 'dashboard'
                      ? '#portalContent'
                      : view === 'login'
                        ? '#loginForm'
                        : 'main'
                  )
                ).toBeVisible();
                evidence.exports ||= [];
                evidence.exports.push(probe);
                await page.locator('[data-t1308-probe]').evaluate((frame) => frame.remove());
              }
          }
          // Alle sechs Dokumente: direkter Aufruf muss allein den Rahmenhinweis zeigen.
          if (width === 1440 && theme === 'dark')
            for (const portal of ['kunden', 'bewerber'])
              for (const view of ['login', 'mail', 'dashboard']) {
                await page.goto(`${base}/vorschau/${portal}-${view}.html`);
                await expect(page.locator('body')).toContainText('Bitte öffne die Demo');
              }
          assert.deepEqual(forbidden, [], 'Fremd-/API-Requests');
          assert.deepEqual(errors, [], 'Konsole');
          evidence.matrix.at(-1).requests = requests;
          evidence.matrix.at(-1).errors = errors;
          assert.equal((await context.cookies()).length, 0, 'Cookies');
        } finally {
          signal?.removeEventListener('abort', abort);
          await browser.close();
        }
      }
    console.log(
      `T1308 Browser: ${evidence.matrix.length} Konfigurationen, 48 Stationen, Netz und Bedienung grün (${evidence.mode}).`
    );
  } catch (error) {
    evidence.failures.push(error.stack);
    throw error;
  } finally {
    fs.writeFileSync(path.join(out, 'browser.json'), JSON.stringify(evidence, null, 2) + '\n');
  }
}
if (process.argv[1]?.endsWith('/t1308-browser.mjs'))
  await browserCheck(
    process.argv[2],
    process.argv[3],
    process.argv.includes('--diagnose-single-process')
  );
