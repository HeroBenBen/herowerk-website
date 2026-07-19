/**
 * run_perioden_automatik.js: PERIODEN-GATE (Fix X-1, Abnahme-Befund B-1).
 *
 * Warum es dieses Gate gibt: die Perioden-Auswahl lebte ausschliesslich als
 * Code-Block in kv_routes_wiring_spec.md und wurde von keinem Test beruehrt.
 * Sie entschied ueber gueltigAb/gueltigBis, die im Seed gar nicht existierten:
 * auf dem Seed-Fallback-Pfad (kv_sheet_spec.md 4) lieferte sie deshalb fuer JEDES
 * Datum 'alt', auch 2030. Die Logik liegt jetzt als reine Funktion
 * kvPeriodeFuerDatum in kv_engine.gs und wird hier gegen die Stichtage des Kanons
 * geprueft. Der Wrapper in der Spec liest nur noch die Uhr.
 *
 * Geprueft wird der REINE SEED-PFAD (KV_PARAMS_SEED, ohne Sheet). Genau dort sass
 * der Defekt.
 *
 * Aufruf: node run_perioden_automatik.js
 * Laeuft ausserdem als Gate 2 in run_equivalence.js mit.
 */
'use strict';

const fs = require('fs');
const path = require('path');

function loadEngine() {
  const p = path.join(__dirname, '..', '..', 'kv_engine.gs');
  const src = fs.readFileSync(p, 'utf8');
  const m = { exports: {} };
  new Function('module', 'exports', src)(m, m.exports);
  return m.exports;
}

/**
 * Stichtags-Faelle. Quelle: Kanon Abschnitt 1.1 (Reform-Perioden) und Abschnitt 2
 * (Alt bis 20.07.2026), gespiegelt in kv_sheet_spec.md 2 Z.104 bis 111.
 * Jede Periode wird an BEIDEN Kanten geprueft (erster und letzter gueltiger Tag)
 * plus die vom Auftrag geforderten Datumspunkte.
 */
const FAELLE = [
  // Alt-Regelwerk
  { heute: '2026-01-01', soll: 'alt', warum: 'lange vor dem Stichtag' },
  { heute: '2026-07-15', soll: 'alt', warum: 'Auftrags-Pflichtfall: heute' },
  { heute: '2026-07-20', soll: 'alt', warum: 'letzter Alt-Tag (Kanon 2)' },
  // Reform-Perioden, je erster und letzter Tag
  { heute: '2026-07-21', soll: 'h2-2026', warum: 'Auftrags-Pflichtfall: Reform-Start' },
  { heute: '2027-01-31', soll: 'h2-2026', warum: 'letzter Tag h2-2026' },
  { heute: '2027-02-01', soll: 'h1-2027', warum: 'erster Tag h1-2027 (Auftrags-Pflichtfall)' },
  { heute: '2027-03-01', soll: 'h1-2027', warum: 'Mitte h1-2027' },
  { heute: '2027-07-31', soll: 'h1-2027', warum: 'letzter Tag h1-2027' },
  { heute: '2027-08-01', soll: 'h2-2027', warum: 'erster Tag h2-2027' },
  { heute: '2028-01-31', soll: 'h2-2027', warum: 'letzter Tag h2-2027' },
  { heute: '2028-02-01', soll: 'h1-2028', warum: 'erster Tag h1-2028' },
  { heute: '2028-07-31', soll: 'h1-2028', warum: 'letzter Tag h1-2028' },
  { heute: '2028-08-01', soll: 'h2-2028', warum: 'Auftrags-Pflichtfall: 01.08.2028' },
  { heute: '2029-01-31', soll: 'h2-2028', warum: 'letzter Tag h2-2028' },
  { heute: '2029-02-01', soll: 'h1-2029', warum: 'erster Tag h1-2029' },
  { heute: '2029-07-31', soll: 'h1-2029', warum: 'letzter Tag h1-2029' },
  // Nach dem Orakel-Horizont: letzte definierte Periode, NIE zurueck auf 'alt'
  { heute: '2029-08-01', soll: 'h1-2029', warum: 'nach der letzten Periode: letzte bleibt' },
  { heute: '2030-01-01', soll: 'h1-2029', warum: 'Auftrags-Pflichtfall: NICHT alt' }
];

function runPeriodenGate(log) {
  const ENG = loadEngine();
  const rows = [];
  let ok = 0;
  FAELLE.forEach(f => {
    const ist = ENG.kvPeriodeFuerDatum(f.heute, ENG.KV_PARAMS_SEED);
    const pass = ist === f.soll;
    if (pass) ok++;
    rows.push({ heute: f.heute, soll: f.soll, ist: ist, pass: pass, warum: f.warum });
  });

  // Zusatz-Invariante: KEIN Datum ab dem Reform-Start darf 'alt' liefern.
  // Das ist der Kern von Befund B-1, darum als eigene Schranke ueber ein
  // volles Jahresraster, nicht nur ueber die Stichtage.
  const altTreffer = [];
  for (let y = 2026; y <= 2031; y++) {
    for (let m = 1; m <= 12; m++) {
      const d = y + '-' + String(m).padStart(2, '0') + '-15';
      if (d < '2026-07-21') continue;
      if (ENG.kvPeriodeFuerDatum(d, ENG.KV_PARAMS_SEED) === 'alt') altTreffer.push(d);
    }
  }

  const gesamt = FAELLE.length;
  const pass = ok === gesamt && altTreffer.length === 0;

  if (log) {
    console.log('== PERIODEN-GATE (Seed-Pfad, ohne Sheet) ==');
    console.log('heute        | soll     | ist      | Ergebnis | Begruendung');
    rows.forEach(r => {
      console.log('  ' + r.heute + ' | ' + r.soll.padEnd(8) + ' | ' + String(r.ist).padEnd(8) +
        ' | ' + (r.pass ? 'PASS' : 'FAIL') + '     | ' + r.warum);
    });
    console.log('Stichtags-Faelle: ' + ok + ' / ' + gesamt);
    console.log("Invariante 'ab 2026-07-21 nie alt' (72 Monatsraster-Daten): " +
      (altTreffer.length === 0 ? 'PASS' : 'FAIL, Treffer: ' + altTreffer.join(', ')));
    console.log('PERIODEN-GATE: ' + (pass ? 'PASS' : 'FAIL'));
  }
  return { pass, ok, gesamt, rows, altTreffer };
}

module.exports = { runPeriodenGate, FAELLE };

if (require.main === module) {
  const r = runPeriodenGate(true);
  if (!r.pass) process.exit(1);
}
