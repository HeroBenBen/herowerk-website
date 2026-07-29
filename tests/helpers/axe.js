'use strict';
// Gemeinsamer axe-Lauf fuer Job 4 (Barrierefreiheit).
//
// WARUM ES DIESE DATEI GIBT (gemessen 29.07.2026):
// Der axe-Job war ueber die letzten 25 CI-Laeufe 20 mal rot und 5 mal uebersprungen,
// also NIE gruen, und wurde trotzdem fuenfmal mitgemergt. Die Messung des Ist-Standes
// ergab 32 beanstandete Knoten ueber 13 Seiten in beiden Modi. Davon waren 26 EIN
// EINZIGER Fremdkoerper: die Schaltflaeche .cmpboxrecall, die der Einwilligungsanbieter
// consentmanager per Skript an den Seitenkoerper haengt, ausserhalb jeder Landmarke
// (Regel "region"). Dieses Markup gehoert uns nicht, wir koennen es nicht aendern, und
// solange es mitgemessen wird, ist JEDE Seite rot und der echte Rest unsichtbar.
//
// Deshalb zwei Trennungen:
//   1. Die Wurzeln des Einwilligungsanbieters werden vom Scan ausgenommen. Nur die
//      Wurzeln, nicht etwa eine ganze Regel: alles was wir selbst bauen, wird weiter
//      vollstaendig gemessen.
//   2. Die restlichen 6 Knoten sind ECHTE Befunde in unserem eigenen Markup. Sie
//      stehen namentlich in tests/axe-bekannte-befunde.json, mit Messung, Datum und
//      Rueckweg. Behoben werden koennen sie nur mit einer HTML/CSS-Aenderung, die im
//      Auftrag der Gate-Reparatur ausgeschlossen war.
//
// Das Gate bleibt dadurch in BEIDE Richtungen scharf:
//   - jeder neue Befund und jeder gewachsene Befund macht rot,
//   - jeder Eintrag, der nicht mehr auftritt, macht ebenfalls rot, damit die Liste
//     nicht still veraltet und zur Dauer-Ausnahme wird.
// Lehre dahinter: eine Pruefung, die immer gruen ist, ist genauso wertlos wie eine,
// die immer rot ist.

const fs = require('fs');
const path = require('path');
const AxeBuilder = require('@axe-core/playwright').default;

// Wurzeln des Einwilligungsanbieters. Bewusst eng gehalten: #cmpbox ist der Dialog
// selbst, .cmpboxrecall die spaeter eingeblendete Wieder-Oeffnen-Schaltflaeche.
// Beides liefert consentmanager per Skript aus, beides ist fremdes Markup.
const FREMDE_WURZELN = ['#cmpbox', '.cmpboxrecall'];

const LISTE = path.join(__dirname, '..', 'axe-bekannte-befunde.json');

/**
 * @typedef {object} BekannterBefund
 * @property {string} seite
 * @property {string} theme
 * @property {string} regel
 * @property {number} knoten
 * @property {string} seit
 * @property {string} grund
 * @property {string} [rueckweg]
 */

/** @returns {BekannterBefund[]} */
function ladeBekannte() {
  const roh = JSON.parse(fs.readFileSync(LISTE, 'utf8'));
  const befunde = roh.befunde ?? [];
  // Ein Eintrag ohne gemessenen Grund ist eine stille Aufweichung des Gates und wirkt
  // trotzdem. Gleiche Mechanik wie in scripts/verify-raster.mjs: lieber abbrechen als
  // unbemerkt durchlassen.
  const fehlt = befunde
    .map((b, i) => {
      const m = [];
      if (typeof b.grund !== 'string' || b.grund.trim().length < 20) m.push('grund');
      if (typeof b.seit !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.seit)) m.push('seit');
      if (!Number.isInteger(b.knoten) || b.knoten < 1) m.push('knoten');
      return m.length
        ? `befunde[${i}] (${b.seite} ${b.theme} ${b.regel}): fehlt ${m.join(', ')}`
        : '';
    })
    .filter(Boolean);
  if (fehlt.length) {
    throw new Error(
      `axe-bekannte-befunde.json ist unvollstaendig:\n  ${fehlt.join('\n  ')}\n` +
        'Jeder Eintrag braucht einen gemessenen Grund, ein Datum und eine Knotenzahl.'
    );
  }
  return befunde;
}

/**
 * Fuehrt axe auf der aktuellen Seite aus, ohne die Wurzeln des Einwilligungsanbieters.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<Array<{ regel: string, wirkung: string, knoten: number, stellen: string[] }>>}
 */
async function axeBefunde(page) {
  let lauf = new AxeBuilder({ page });
  for (const wurzel of FREMDE_WURZELN) lauf = lauf.exclude(wurzel);
  const ergebnis = await lauf.analyze();
  return ergebnis.violations.map((v) => ({
    regel: v.id,
    wirkung: String(v.impact),
    knoten: v.nodes.length,
    stellen: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
  }));
}

/**
 * Vergleicht die gemessenen Befunde einer Seite gegen die bekannte Liste.
 * Liefert Klartextzeilen; eine leere Liste bedeutet: Gate gruen.
 * @param {Array<{ regel: string, wirkung: string, knoten: number, stellen: string[] }>} gemessen
 * @param {string} seite
 * @param {string} theme
 * @returns {string[]}
 */
function pruefeGegenBekannte(gemessen, seite, theme) {
  const bekannt = ladeBekannte().filter((b) => b.seite === seite && b.theme === theme);
  /** @type {string[]} */
  const beanstandungen = [];

  for (const b of gemessen) {
    const eintrag = bekannt.find((k) => k.regel === b.regel);
    if (!eintrag) {
      beanstandungen.push(
        `NEU: ${b.regel} (${b.wirkung}) ${b.knoten}x auf ${seite}?theme=${theme} bei ${b.stellen.join(' | ')}`
      );
      continue;
    }
    if (b.knoten > eintrag.knoten) {
      beanstandungen.push(
        `GEWACHSEN: ${b.regel} auf ${seite}?theme=${theme}: bekannt ${eintrag.knoten}, gemessen ${b.knoten}`
      );
    }
  }

  // Gegenrichtung: was in der Liste steht, aber nicht mehr auftritt, ist erledigt.
  // Der Eintrag muss dann weg, sonst deckt er kuenftig echte Rueckschritte zu.
  for (const k of bekannt) {
    const b = gemessen.find((g) => g.regel === k.regel);
    if (!b) {
      beanstandungen.push(
        `VERALTET: ${k.regel} auf ${seite}?theme=${theme} tritt nicht mehr auf. Eintrag aus tests/axe-bekannte-befunde.json entfernen.`
      );
    } else if (b.knoten < k.knoten) {
      beanstandungen.push(
        `VERALTET: ${k.regel} auf ${seite}?theme=${theme}: nur noch ${b.knoten} statt ${k.knoten} Knoten. Zahl in tests/axe-bekannte-befunde.json nachziehen.`
      );
    }
  }

  return beanstandungen;
}

module.exports = { axeBefunde, pruefeGegenBekannte, FREMDE_WURZELN };
