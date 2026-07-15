/**
 * run_livebox_gate.js: LIVE-FOERDERBOX-GATE (Fix X-3, Abnahme-Befund B-2).
 *
 * Gegenstand: die Zahlen der Wizard-Live-Foerderbox (Orakel renderLiveFoerder,
 * Z.1006 bis 1035), im Port kv_engine.gs Z.455 bis 460:
 *   liveZuschuss, liveEigenanteil, proKlimaEffektiv.
 * Sie waren bisher von KEINEM Gate beruehrt (Abnahme B-2), obwohl sie eigene
 * Arithmetik tragen und dem Kunden angezeigt werden.
 *
 * WAS DIESES GATE IST, und was nicht (bitte nicht ueberlesen):
 * Es ist KEIN Orakel-Aequivalenz-Vergleich. Ein solcher ist fuer diese Flaeche
 * mit dem heutigen Harness nicht moeglich, eigene Messung:
 *   - renderLiveFoerder liegt in der Wizard-IIFE (Orakel Z.676 bis 1180) und ist
 *     von aussen nicht aufrufbar (weder als Funktion noch ueber WZ/step1Valid).
 *   - Das Ziel-Element #wzLiveFoerder existiert im HTML gar nicht, init() erzeugt
 *     es erst im Kunden-Modus (Orakel Z.723).
 *   - Im Kunden-Modus liefert renderLiveFoerder leeren Text, solange step1Valid()
 *     falsch ist (Z.1008). WZ.step1 fuellt nur echte Wizard-Interaktion.
 *   Ein Vergleich braucht also einen wizard-faehigen DOM. Das ist ein eigenes
 *   Arbeitspaket (BLOCKED-1 in LANE-B2.md), keine Zeile im Testskript. Das Orakel
 *   dafuer anzufassen ist verboten (Briefing Abschnitt 1).
 *
 * Was es stattdessen tut: es nagelt die Live-Box-Zahlen an eine UNABHAENGIGE,
 * RATIFIZIERTE Quelle: die Eigenanteils-Tabelle aus Kanon Abschnitt 5 (Gate G1
 * ratifiziert). Deren Werte sind nicht aus diesem Port abgeleitet, sondern aus dem
 * Orakel-Regelwerk hergeleitet und von Benjamin abgenommen. Dazu kommen die drei
 * Kappungs-Kanten aus X-2. Das faengt jede spaetere Verfaelschung dieser Zahlen,
 * beweist aber NICHT die Erst-Transkription aus dem Orakel.
 *
 * Aufruf: node run_livebox_gate.js   (laeuft als Gate 3 in run_equivalence.js mit)
 */
'use strict';

const fs = require('fs');
const path = require('path');

function loadEngine() {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'kv_engine.gs'), 'utf8');
  const m = { exports: {} };
  new Function('module', 'exports', src)(m, m.exports);
  return m.exports;
}

const BASIS = {
  heizart: 'gas', bedarf: 20000, eta: 85, invWP: 30000, jaz: 3.8, laufzeit: 20,
  neuFossilTog: true, vglBrennstoff: 'gas', gasInvest: 12000, oelInvest: 16000,
  gaspreis: 12, gasStg: 2.5, oelpreis: 11, oelStg: 2.5, strompreis: 32, stromEntw: 1.5,
  co2preis: 55, co2Pfad: 250, bioTog: true, bioAufpreis: 2.5,
  fHalbjahr: 'h2-2026', fGrund: true, fEU: true, fKlima: true, fAlt20: true,
  fEinkSlider: 25000, fKind: false, proklimaTog: false, fEffizienz: false,
  finanzTog: false, kredLZ: 10, kredZins: 0.7, immoTog: false, hausW: 350000, immoP: 7,
  dynTarifTog: false, dynAnteil: 40, dynSpread: 10, modus: 'kunde'
};

/**
 * Faelle. Spalte "quelle" nennt fuer JEDEN Sollwert seinen Beleg.
 * Maximalfall = Quote 80 (fEinkSlider 25.000 → Einkommensbonus 40).
 */
const FAELLE = [
  // Kanon Abschnitt 5, Paket-Tabelle. Spalten "Eigenanteil neu" / "proKlima-Eigenanteil neu".
  { n: 'Kompakt 29.750 ohne proKlima', ov: { invWP: 29750, proklimaTog: false }, zuschuss: 22400, eigen: 7350, pkEff: 0, quelle: 'Kanon 5, Zeile Kompakt' },
  { n: 'Kompakt 29.750 mit proKlima', ov: { invWP: 29750, proklimaTog: true }, zuschuss: 22400, eigen: 7350, pkEff: 0, quelle: 'Kanon 5: KfW 22.400 ueber Deckel 17.850, proKlima bringt 0' },
  { n: 'Standard 34.510 ohne proKlima', ov: { invWP: 34510, proklimaTog: false }, zuschuss: 22400, eigen: 12110, pkEff: 0, quelle: 'Kanon 5, Zeile Standard' },
  { n: 'Standard 34.510 mit proKlima', ov: { invWP: 34510, proklimaTog: true }, zuschuss: 22400, eigen: 12110, pkEff: 0, quelle: 'Kanon 5: Deckel 20.706 unter KfW 22.400, proKlima wirkungslos' },
  { n: 'Komfort 45.220 ohne proKlima', ov: { invWP: 45220, proklimaTog: false }, zuschuss: 22400, eigen: 22820, pkEff: 0, quelle: 'Kanon 5, Zeile Komfort' },
  { n: 'Komfort 45.220 mit proKlima', ov: { invWP: 45220, proklimaTog: true }, zuschuss: 23900, eigen: 21320, pkEff: 1500, quelle: 'Kanon 5: proKlima 1.500 voll wirksam (23.900 unter Deckel 27.132)' },
  { n: 'Premium 57.120 ohne proKlima', ov: { invWP: 57120, proklimaTog: false }, zuschuss: 22400, eigen: 34720, pkEff: 0, quelle: 'Kanon 5, Zeile Premium' },
  { n: 'Premium 57.120 mit proKlima', ov: { invWP: 57120, proklimaTog: true }, zuschuss: 23900, eigen: 33220, pkEff: 1500, quelle: 'Kanon 5: proKlima 1.500 voll wirksam' },
  // Kappungs-Kanten (X-2). Quote 60 = Grund 30 + Einkommen 30, Klima aus.
  // Kante: anzeigeBetrag + pkWP gegen round(0,6 x inv), also 16.800 + 1.500 = 18.300.
  { n: 'Kante q60 inv 30.400 (Deckel beisst)', ov: { invWP: 30400, proklimaTog: true, fKlima: false, fEinkSlider: 35000 }, zuschuss: 18240, eigen: 12160, pkEff: 1440, quelle: 'eigene Rechnung: round(0,6 x 30.400) = 18.240 < 18.300' },
  { n: 'Kante q60 inv 30.500 (exakt auf dem Deckel)', ov: { invWP: 30500, proklimaTog: true, fKlima: false, fEinkSlider: 35000 }, zuschuss: 18300, eigen: 12200, pkEff: 1500, quelle: 'eigene Rechnung: 16.800 + 1.500 = 18.300 = round(0,6 x 30.500)' },
  { n: 'Kante q60 inv 30.600 (Deckel beisst nicht)', ov: { invWP: 30600, proklimaTog: true, fKlima: false, fEinkSlider: 35000 }, zuschuss: 18300, eigen: 12300, pkEff: 1500, quelle: 'eigene Rechnung: round(0,6 x 30.600) = 18.360 > 18.300' },
  // proKlima ausserhalb des Antragszeitraums: Opt-in an, Periode erlaubt es nicht.
  { n: 'proKlima an, aber Periode h1-2027 (Frist 31.10.2026)', ov: { invWP: 45220, proklimaTog: true, fHalbjahr: 'h1-2027' }, zuschuss: 21800, eigen: 23420, pkEff: 0, quelle: 'Kanon 1.3: proKlima nur h2-2026; Grenze h1-2027 = 27.250, round(0,8 x 27.250) = 21.800' }
];

function runLiveboxGate(log) {
  const ENG = loadEngine();
  const rows = [];
  let ok = 0;
  FAELLE.forEach(f => {
    const inputs = Object.assign({}, BASIS, f.ov);
    const p = ENG.kvCalculate(inputs, ENG.KV_PARAMS_SEED);
    const fo = p.foerder;
    const pass = fo.liveZuschuss === f.zuschuss && fo.liveEigenanteil === f.eigen && fo.proKlimaEffektiv === f.pkEff;
    if (pass) ok++;
    rows.push({
      n: f.n, pass,
      soll: f.zuschuss + '/' + f.eigen + '/' + f.pkEff,
      ist: fo.liveZuschuss + '/' + fo.liveEigenanteil + '/' + fo.proKlimaEffektiv,
      quelle: f.quelle
    });
  });
  const pass = ok === FAELLE.length;
  if (log) {
    console.log('== LIVE-FOERDERBOX-GATE (Zuschuss/Eigenanteil/proKlima-effektiv) ==');
    console.log('Autoritaet: Kanon Abschnitt 5 (ratifiziert) + Kappungs-Kanten. KEIN Orakel-Lauf, siehe Kopfkommentar.');
    rows.forEach(r => {
      console.log('  ' + (r.pass ? 'PASS' : 'FAIL') + '  ' + r.n.padEnd(44) +
        ' soll=' + r.soll.padEnd(20) + (r.pass ? '' : ' IST=' + r.ist));
      if (!r.pass) console.log('        Beleg: ' + r.quelle);
    });
    console.log('Faelle: ' + ok + ' / ' + FAELLE.length);
    console.log('LIVE-FOERDERBOX-GATE: ' + (pass ? 'PASS' : 'FAIL'));
  }
  return { pass, ok, gesamt: FAELLE.length, rows };
}

module.exports = { runLiveboxGate, FAELLE };

if (require.main === module) {
  const r = runLiveboxGate(true);
  if (!r.pass) process.exit(1);
}
