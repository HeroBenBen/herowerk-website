import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const hier = path.dirname(fileURLToPath(import.meta.url));
export const wurzel = path.resolve(process.env.MOBILE_ROOT || path.join(hier, '..', '..'));
const require = createRequire(import.meta.url);
export const engine = require(path.join(wurzel, 'apps-script/rechner-backend/kv_engine.gs'));

export function bool(wert, ersatz) {
  if (wert === null) return ersatz;
  return ['1', 'true', 'ja'].includes(String(wert).toLowerCase());
}

export function mapRechnerInputs(query) {
  const out = { ...engine.KV_DEFAULTS };
  Object.keys(out).forEach((key) => {
    if (key === 'proklimaTog' || !query.has(key)) return;
    const current = out[key];
    if (typeof current === 'boolean') out[key] = bool(query.get(key), current);
    else if (typeof current === 'number') out[key] = Number(query.get(key));
    else out[key] = query.get(key);
  });
  out.proklimaTog = false;
  if (!engine.KV_PARAMS_SEED.perioden[out.fHalbjahr]) out.fHalbjahr = 'h2-2026';
  if (query.get('bedarfModus') === 'schaetzung') {
    out.bedarf = engine.kvSchaetzeBedarf(
      query.get('geb'),
      query.get('bj'),
      query.get('san'),
      Number(query.get('flaeche')),
      engine.KV_PARAMS_SEED
    );
  }
  return out;
}

export async function klemmeEinwilligungAb(page) {
  const anbieterAbweisen = (route) => route.abort();
  await page.route('https://cdn.consentmanager.net/**', anbieterAbweisen);
  await page.route('**/consentmanager.net/**', anbieterAbweisen);
  await page.route('**://*.consentmanager.net/**', anbieterAbweisen);
}

const ADAPTER = path.join(wurzel, 'api/rechner-kv-adapter.php');
function adapterPhp(funktion, argument) {
  const code =
    '$a = json_decode(stream_get_contents(STDIN), true, 512, JSON_THROW_ON_ERROR);' +
    'require $argv[1]; $f = $argv[2];' +
    'echo json_encode($a === null ? $f() : $f($a), JSON_THROW_ON_ERROR | JSON_PRESERVE_ZERO_FRACTION);';
  const lauf = spawnSync('php', ['-r', code, '--', ADAPTER, funktion], {
    input: JSON.stringify(argument ?? null),
    encoding: 'utf8',
    maxBuffer: 15e6,
  });
  if (lauf.status !== 0) throw new Error('Adapter-Attrappe ' + funktion + ': ' + lauf.stderr);
  return JSON.parse(lauf.stdout);
}

export async function installRechnerApi(page) {
  await page.route('**/api/rechner**', async (route) => {
    const url = new URL(route.request().url());
    const action = url.searchParams.get('action');
    let payload;
    let status = 200;
    if (action === 'kv_bootstrap') {
      payload = engine.kvBootstrapPayload(engine.KV_PARAMS_SEED);
      payload.aktivePeriode = 'alt';
    } else if (action === 'kostenvergleich') {
      payload = engine.kvCalculate(mapRechnerInputs(url.searchParams), engine.KV_PARAMS_SEED);
    }
    // T1247: Die ausgelieferte Schnittstelle ergaenzt fuer kvAnsicht=nutzen Felder aus
    // api/rechner-kv-adapter.php (hw_kv_adapter_route). Die Attrappe ruft dieselben
    // PHP-Funktionen auf, statt sie nachzubauen; fehlt der Adapter, bleibt sie beim alten Stand.
    if (url.searchParams.get('kvAnsicht') === 'nutzen' && status === 200 && existsSync(ADAPTER)) {
      if (action === 'kv_bootstrap') payload.marktwerte = adapterPhp('hw_kv_marktwerte');
      if (action === 'kostenvergleich')
        payload.nutzenKosten = adapterPhp('hw_kv_nutzen_projektion', payload);
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

// Erste Ergebniszahl der Ergebnisanzeige. Seit T1247 (Angleich an das Angebotsblatt
// "Ihr Nutzen") traegt die Anzeige keine .wz-big mehr, sondern drei Karten im
// .kv-nutzen-grid; die erste Zahl in Dokumentreihenfolge ist der erste .vv- oder .mv-Wert.
export const ERSTE_ERGEBNISZAHL_WAHL = '#wzHero .kv-nutzen-grid .vv, #wzHero .kv-nutzen-grid .mv';

export const BROWSER_MESSUNG = String.raw`(() => {
  const ERSTE_ERGEBNISZAHL = ${JSON.stringify(ERSTE_ERGEBNISZAHL_WAHL)};
  const TOLERANZ = 1;
  const beschreibeElement = (element) => {
    const box = element.getBoundingClientRect();
    return {
      wahl:
        element.tagName.toLowerCase() +
        (element.id ? '#' + element.id : '') +
        (typeof element.className === 'string' && element.className.trim()
          ? '.' + element.className.trim().split(/\s+/).slice(0, 3).join('.')
          : ''),
      links: +box.left.toFixed(2),
      rechts: +box.right.toFixed(2),
      breite: +box.width.toFixed(2),
    };
  };

  const sichtbarStreng = (element) => {
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const flaechenlos =
      /inset\(\s*50%/.test(style.clipPath || '') ||
      /^rect\(0(px)?,?\s*0(px)?,?\s*0(px)?,?\s*0(px)?\)$/.test(
        (style.clip || '').replace(/\s+/g, ' ')
      );
    return (
      box.width > 0 &&
      box.height > 0 &&
      style.visibility !== 'hidden' &&
      style.display !== 'none' &&
      !element.hasAttribute('hidden') &&
      !flaechenlos
    );
  };

  const sichtbarSchlank = (element) => {
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return (
      box.width > 0 &&
      box.height > 0 &&
      style.visibility !== 'hidden' &&
      style.display !== 'none'
    );
  };

  const istSichtbarKundennah = (element) => {
    if (!sichtbarStreng(element)) return false;
    const geschlosseneKlappe = element.closest('details:not([open])');
    if (!geschlosseneKlappe || geschlosseneKlappe === element) return true;
    const summary = [...geschlosseneKlappe.children].find(
      (kind) => kind.tagName.toLowerCase() === 'summary'
    );
    return Boolean(summary && summary.contains(element));
  };
  // Chrome hält Inhalte zugeklappter Klappen unsichtbar im Speicher
  // („hidden until found“). Boxmaße und display melden sie dann fälschlich
  // als sichtbar; am 31.07.2026 führte das zu vier Fehlmessungen in Folge.

  const elementUeberlaufSeite = () =>
    [...document.querySelectorAll('body *')]
      .filter(sichtbarStreng)
      .map(beschreibeElement)
      .filter((element) => {
        // Gemessene Ausnahme: Die Sprungmarke ist unsichtbar, 1 x 1 px
        // gross und liegt bauartbedingt bei left -1 px.
        if (
          element.wahl.startsWith('a.skip-link') &&
          element.links >= -1.1 &&
          element.links < 0 &&
          element.breite <= 1.1
        )
          return false;
        return (
          element.rechts > window.innerWidth + TOLERANZ ||
          element.links < -TOLERANZ
        );
      });

  const elementUeberlaufErgebnis = () =>
    [...document.querySelectorAll('#results *')]
      .filter(sichtbarSchlank)
      .map(beschreibeElement)
      .filter((element) => element.links < -1 || element.rechts > window.innerWidth + 1);

  const messeRechnerSchritt = (nummer) => {
    const bottomCta = document.querySelector('#wzBottomCta');
    const ctaBox =
      bottomCta && sichtbarStreng(bottomCta) ? bottomCta.getBoundingClientRect() : null;
    const sichtUnterkante = ctaBox
      ? Math.min(window.innerHeight, ctaBox.top)
      : window.innerHeight;
    const ziel =
      nummer === 5
        ? document.querySelector(ERSTE_ERGEBNISZAHL)
        : [
            ...document.querySelectorAll(
              '#wzStepBody button.wz-choice,#wzStepBody .wz-optcard,#wzStepBody label.tog,#wzStepBody input:not([type=hidden]),#wzStepBody select,#wzStepBody textarea'
            ),
          ].find(sichtbarStreng);
    const weiter = document.querySelector('#wzNext');
    const zielBox = ziel ? ziel.getBoundingClientRect() : null;
    const weiterBox =
      weiter && sichtbarStreng(weiter) ? weiter.getBoundingClientRect() : null;
    const sichtbareElemente = [...document.querySelectorAll('body *')].filter(
      sichtbarStreng
    ).length;
    const elementUeberlauf = elementUeberlaufSeite();
    const details = [...document.querySelectorAll('#wzStepBody details')];
    const detailsZustand = details.map((element) => element.open);
    details.forEach((element) => {
      element.open = true;
    });
    const langeTextbloecke = [
      ...document.querySelectorAll(
        '#wzStepBody .ib,#wzStepBody .wz-opt-sub,#wzStepBody .wz-herocalc,#wzStepBody .tl small,#wzStepBody p'
      ),
    ].filter((element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const lineHeight =
        parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.4;
      return (
        box.width > 0 &&
        box.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        box.height / lineHeight > 3.05
      );
    });
    const textbloecke = {
      gesamt: langeTextbloecke.length,
      zuklappbar: langeTextbloecke.filter((element) => element.closest('details')).length,
    };
    details.forEach((element, index) => {
      element.open = detailsZustand[index];
    });
    return {
      schritt: nummer,
      ziel: nummer === 5 ? 'erste Ergebniszahl' : 'erste Bedienstelle',
      top: zielBox ? Math.round(zielBox.top + window.scrollY) : null,
      sichtUnterkante: Math.round(sichtUnterkante),
      sichtbar: zielBox
        ? zielBox.bottom <= sichtUnterkante && zielBox.right <= window.innerWidth
        : false,
      weiterSichtbar: weiterBox
        ? weiterBox.bottom <= sichtUnterkante && weiterBox.right <= window.innerWidth
        : nummer === 5,
      sichtbareElemente,
      elementUeberlauf,
      textbloecke,
    };
  };

  const messeRechnerJahrestabellen = () => {
    const ids = ['cMainDaten', 'cBreakDaten', 'cHeatDaten'];
    document.querySelectorAll('#results details').forEach((element) => {
      element.open = true;
    });
    return {
      chartDetails: ids.map(
        (id) => document.querySelectorAll('#' + id + ' details').length
      ),
      chartMobileDetails: ids.map(
        (id) =>
          document.querySelectorAll('#' + id + ' details.mobile-year-details').length
      ),
      detailDecks: document.querySelectorAll('details.mobile-year-details').length,
      mobileContainer: document.querySelectorAll('div.mobile-year-details').length,
      mainRows: document.querySelectorAll('#cMainDaten .year-bar-row').length,
      mainCards: document.querySelectorAll('#cMainDaten .mobile-year-card').length,
      breakCards: document.querySelectorAll('#cBreakDaten .mobile-year-card').length,
      heatCards: document.querySelectorAll('#cHeatDaten .mobile-year-card').length,
      summaryTexte: ids.map((id) => {
        const summary = document.querySelector(
          '#' + id + ' .chart-daten-details summary'
        );
        const mobile = summary && summary.querySelector('.chart-summary-mobile');
        return mobile ? mobile.textContent.trim() : '';
      }),
      dokumentUeberlauf:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      elementUeberlauf: elementUeberlaufErgebnis(),
    };
  };

  window.__heroMess = {
    sichtbarStreng,
    sichtbarSchlank,
    istSichtbarKundennah,
    elementUeberlaufSeite,
    elementUeberlaufErgebnis,
    messeRechnerSchritt,
    messeRechnerJahrestabellen,
  };
})();`;

export async function installiereMessung(page) {
  await page.addInitScript({ content: BROWSER_MESSUNG });
  await page.evaluate(BROWSER_MESSUNG);
}

export async function bedieneRechner(page, { bisSchritt = 5, beiSchritt } = {}) {
  const erreicht = async (schritt) => {
    if (beiSchritt) await beiSchritt(schritt);
  };
  await page.waitForFunction(() => typeof KV_STATE !== 'undefined' && KV_STATE.last, null, {
    timeout: 10000,
  });
  await page.locator('[data-wz-heizart="gas"]').click();
  await page.locator('[data-wz-grp="vmode"][data-wz-val="known"]').click();
  await page.locator('[data-wz-grp="altgas"][data-wz-val="ja"]').click();
  await page.locator('[data-wz-grp="rohr"][data-wz-val="metall"]').click();
  await page.locator('[data-wz-grp="kbj"][data-wz-val="1990-2010"]').click();
  await erreicht(1);
  if (bisSchritt <= 1) return;
  await page.locator('#wzNext').click();
  await erreicht(2);
  if (bisSchritt <= 2) return;
  await page.locator('#wzNext').click();
  await erreicht(3);
  if (bisSchritt <= 3) return;
  await page.locator('#wzNext').click();
  await page.evaluate(() => {
    const finanzierung = document.querySelector('#finanzTog');
    finanzierung.checked = true;
    finanzierung.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(150);
  await erreicht(4);
  if (bisSchritt <= 4) return;
  await page.locator('#wzNext').click();
  await page.waitForFunction((wahl) => document.querySelector(wahl), ERSTE_ERGEBNISZAHL_WAHL);
  await erreicht(5);
}

export async function messeRechnerSchritte(page) {
  await installiereMessung(page);
  const schritte = [];
  await bedieneRechner(page, {
    beiSchritt: async (schritt) => {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(120);
      schritte.push(
        await page.evaluate((nummer) => window.__heroMess.messeRechnerSchritt(nummer), schritt)
      );
    },
  });
  return { schritte };
}

export async function pruefeRechnerJahrestabellen(page) {
  await installiereMessung(page);
  await page.waitForFunction(
    () =>
      document.querySelector('#cMainDaten details.chart-daten-details') &&
      document.querySelector('#detMobile details.mobile-year-details'),
    null,
    { timeout: 10000 }
  );
  return page.evaluate(() => window.__heroMess.messeRechnerJahrestabellen());
}
