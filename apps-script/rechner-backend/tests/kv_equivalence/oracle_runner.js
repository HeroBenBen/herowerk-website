/**
 * oracle_runner.js — fuehrt den UNVERAENDERTEN Orakel-Script-Block in Node aus
 * und erntet alle ausgegebenen Zahlen ein.
 *
 * Kanonische Extraktion (Briefing Abschnitt 1, einzige gueltige Methode):
 *   s[s.rfind("<script>"):s.rfind("</script>")]  auf utf-8-Inhalt
 * SHA256 dieses Extrakts MUSS 55344fe5...b9f3 sein, sonst Abbruch.
 */
'use strict';

const fs = require('fs');
const vm = require('vm');
const crypto = require('crypto');
const path = require('path');
const { buildDom, stripTags } = require('./dom_stub');

const ORAKEL = '/Users/benjaminbendler/Library/CloudStorage/GoogleDrive-b.bendler@herowerk.de/Meine Ablage/HeroPlan/04_Marketing_Vertrieb/Website/WP_Rechner_HeroWerk.html';
const SHA_SOLL = '55344fe56a7043ffed5eec352eeeee0717d34ddebd34d57ecef0e7c88f61b9f3';

function extractScript() {
  const s = fs.readFileSync(ORAKEL, 'utf8');
  const a = s.lastIndexOf('<script>');
  const b = s.lastIndexOf('</script>');
  const blk = s.slice(a, b);
  const sha = crypto.createHash('sha256').update(blk, 'utf8').digest('hex');
  if (sha !== SHA_SOLL) {
    throw new Error('ORAKEL-SHA MISMATCH.\n  IST:  ' + sha + '\n  SOLL: ' + SHA_SOLL + '\n  STOPP, nichts bauen (Briefing Abschnitt 1).');
  }
  return { blk, sha, laenge: blk.length };
}

/** Erzeugt eine frische Orakel-Instanz (eigener DOM, eigener VM-Context). */
function newOracle() {
  const { blk } = extractScript();
  // Der Extrakt beginnt mit "<script>" und endet vor "</script>" — Tag entfernen,
  // der Rest bleibt Zeichen fuer Zeichen unveraendert.
  const code = blk.replace(/^<script>/, '');

  const dom = buildDom(ORAKEL, '?modus=berater');
  const sandbox = {
    document: dom.document,
    window: dom.window,
    Event: dom.Event,
    Chart: dom.Chart,
    localStorage: dom.localStorage,
    URL: URL,
    URLSearchParams: URLSearchParams,
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    setTimeout: (fn) => { if (typeof fn === 'function') fn(); },
    console
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: 'orakel_script.js' });
  return { sandbox, dom };
}

/* ---------- Eingaben setzen ---------- */

const CHECKBOXES = ['bioTog', 'neuFossilTog', 'dynTarifTog', 'finanzTog', 'immoTog',
  'fGrund', 'fEU', 'fKlima', 'fAlt20', 'fKind', 'proklimaTog'];

function setInputs(dom, inputs) {
  Object.keys(inputs).forEach(id => {
    const el = dom.document.getElementById(id);
    if (!el) return;
    if (CHECKBOXES.indexOf(id) >= 0) el.checked = !!inputs[id];
    else el.value = String(inputs[id]);
  });
}

/* ---------- Ausgaben ernten ---------- */

/** Alle Zahlen eines Textes in Reihenfolge, de-DE-Notation aufgeloest. */
function numbersOf(text) {
  const t = stripTags(String(text));
  const out = [];
  // de-DE: 1.234.567,89 | 1234 | 12,5 ; Vorzeichen '-' oder '−' (U+2212)
  const re = /[-−]?\d{1,3}(?:\.\d{3})+(?:,\d+)?|[-−]?\d+(?:,\d+)?/g;
  let m;
  while ((m = re.exec(t)) !== null) {
    const raw = m[0].replace(/−/g, '-');
    const v = parseFloat(raw.replace(/\./g, '').replace(',', '.'));
    if (!isNaN(v)) out.push(v);
  }
  return out;
}

function harvest(sandbox, dom) {
  const $ = id => dom.document.getElementById(id);
  const cs = dom.chartStore;
  const ds = (canvas, i) => (cs[canvas] && cs[canvas].data.datasets[i] ? cs[canvas].data.datasets[i].data : null);

  return {
    // Foerderbox (updateFoerderung, Anzeige-Pfad)
    foerderBox: {
      vFEink: $('vFEink').textContent,
      fEinkAnr: $('fEinkAnr').textContent,
      fEinkBonusLbl: $('fEinkBonusLbl').textContent,
      fGrundPct: $('fGrundPct').textContent,
      fKlimaPct: $('fKlimaPct').textContent,
      fQuote: $('fQuote').textContent,
      fGrenzeLbl: $('fGrenzeLbl').textContent,
      fBasis: $('fBasis').textContent,
      fBetrag: $('fBetrag').textContent,
      fNetto: $('fNetto').textContent
    },
    // Degressions-Treppe (renderFoerderTreppe, Orakel Z.62 bis 78).
    // Laeuft im Orakel auf Top-Level (Z.1217) und bei jeder Foerder-Eingabe neu.
    // Geerntet werden die Quoten-Prozente je Reform-Periode aus den aria-labels.
    foerderTreppe: (function () {
      const h = $('wzFoerderTreppe').innerHTML;
      const re = /aria-label="Zeitraum [^"]*?: (\d+) Prozent"/g;
      const o = []; let m;
      while ((m = re.exec(h)) !== null) o.push(Number(m[1]));
      return o;
    })(),
    // Alle Zahlen je Ausgabeflaeche, in Anzeige-Reihenfolge
    pathSummary: numbersOf($('pathSummary').innerHTML),
    kpiGrid: numbersOf($('kpiGrid').innerHTML),
    kpiLabels: (function () {
      const h = $('kpiGrid').innerHTML;
      const re = /<div class="ml">([\s\S]*?)<\/div>/g;
      const o = []; let m;
      while ((m = re.exec(h)) !== null) o.push(stripTags(m[1]).trim());
      return o;
    })(),
    dreiWegeBox: { display: $('dreiWegeBox').style.display, zahlen: numbersOf($('dreiWegeBox').innerHTML) },
    cashflowBox: { display: $('cashflowBox').style.display, zahlen: numbersOf($('cashflowBox').innerHTML) },
    co2Box: numbersOf($('co2Box').innerHTML),
    sensiBox: numbersOf($('sensiBox').innerHTML),
    immoBox: { display: $('immoBox').style.display, zahlen: numbersOf($('immoBox').innerHTML) },
    detTbl: numbersOf($('detTbl').innerHTML),
    assBox: numbersOf($('assBox').innerHTML),
    // Chart-Serien (Chart 2 ist ungerundet → schaerfster Vergleich)
    charts: {
      cMain0: ds('cMain', 0),
      cMain1: ds('cMain', 1),
      cMainLabels: cs['cMain'] ? cs['cMain'].data.labels : null,
      cBreakLabels: cs['cBreak'] ? cs['cBreak'].data.datasets.map(d => d.label) : null,
      cBreakData: cs['cBreak'] ? cs['cBreak'].data.datasets.map(d => d.data) : null,
      cHeat0: ds('cHeat', 0),
      cHeat1: ds('cHeat', 1),
      cHeat2: ds('cHeat', 2)
    }
  };
}

/** Ein Testvektor durch das Orakel jagen. */
function runOracle(inputs) {
  const { sandbox, dom } = newOracle();
  setInputs(dom, inputs);
  // Die drei Orakel-Funktionen werden UNVERAENDERT aufgerufen, genau wie es der
  // Browser tut: updateFoerderung + renderFoerderTreppe haengen dort an den
  // input/change-Events der Foerder-Felder (Orakel Z.1216), calculate am
  // Rechnen-Button. Der Stub setzt die Werte direkt, darum hier explizit.
  sandbox.updateFoerderung();
  sandbox.renderFoerderTreppe();
  sandbox.calculate();
  return harvest(sandbox, dom);
}

module.exports = { extractScript, newOracle, setInputs, harvest, runOracle, numbersOf, SHA_SOLL, ORAKEL };

if (require.main === module) {
  const e = extractScript();
  console.log('Orakel-Extrakt: ' + e.laenge + ' Zeichen');
  console.log('sha256: ' + e.sha);
  console.log('SHA-Gate: ' + (e.sha === SHA_SOLL ? 'PASS' : 'FAIL'));
  const r = runOracle({});
  console.log('Smoke-Run Orakel OK. fBetrag=' + r.foerderBox.fBetrag + ' pathSummary-Zahlen=' + r.pathSummary.length);
}
