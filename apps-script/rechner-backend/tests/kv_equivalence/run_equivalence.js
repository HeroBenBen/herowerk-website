/**
 * run_equivalence.js — AEQUIVALENZ-GATE (B5).
 *
 * Beweis-Aufbau:
 *   Orakel-Seite: der UNVERAENDERTE Script-Block laeuft in Node auf einem
 *     DOM-Stub, calculate() + updateFoerderung() schreiben in die Stub-Elemente.
 *     Aus jeder Ausgabeflaeche werden ALLE Zahlen in Anzeige-Reihenfolge geerntet.
 *   Port-Seite: kvCalculate() liefert Zahlen, view_adapter.js rendert daraus die
 *     Anzeige-Texte; daraus werden die Zahlen mit DERSELBEN Funktion geerntet.
 *   Vergleich: Delta muss EXAKT 0 sein (Zahl fuer Zahl, Reihenfolge inklusive).
 *
 * Die Chart-2-Serien sind im Orakel UNGERUNDET → dort wird auf volle
 * Float-Bit-Gleichheit verglichen (schaerfster Test).
 *
 * Bei Abweichung: der PORT wird gefixt, NIEMALS das Orakel (Briefing Abschnitt 1).
 *
 * Aufruf: node run_equivalence.js [--verbose] [--max N]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { runOracle, extractScript, numbersOf, SHA_SOLL } = require('./oracle_runner');
const V = require('./view_adapter');
const { buildVectors } = require('./vectors');

// kv_engine.gs als Modul laden (.gs ist gueltiges JS, Node braucht nur den Hinweis)
function loadEngine() {
  const p = path.join(__dirname, '..', '..', 'kv_engine.gs');
  const src = fs.readFileSync(p, 'utf8');
  const m = { exports: {} };
  new Function('module', 'exports', src)(m, m.exports);
  return m.exports;
}
const ENG = loadEngine();

/* ---------- Port-Seite: Zahlen je Ausgabeflaeche ---------- */

function portHarvest(inputs) {
  const p = ENG.kvCalculate(normalize(inputs), ENG.KV_PARAMS_SEED);
  const kpis = V.kpiCards(p);
  const dw = V.dreiWege(p);
  const cf = V.cashflow(p);
  const im = V.immoBox(p);
  return {
    payload: p,
    foerderBox: V.foerderBox(p),
    foerderTreppe: p.foerder.treppe.map(t => t.quote),
    pathSummary: numbersOf(V.pathSummary(p)),
    kpiGrid: numbersOf(kpis.map(k => k.l + ' ' + k.v + ' ' + k.s).join(' | ')),
    kpiLabels: kpis.map(k => k.l),
    dreiWegeBox: { display: p.dreiWege.aktiv ? 'block' : 'none', zahlen: dw ? numbersOf(dw) : [] },
    cashflowBox: { display: p.finanzierung.aktiv ? 'block' : 'none', zahlen: cf ? numbersOf(cf) : [] },
    co2Box: numbersOf(V.co2Box(p)),
    sensiBox: numbersOf(V.sensiBox(p)),
    immoBox: { display: p.immo.aktiv ? 'block' : 'none', zahlen: im ? numbersOf(im) : [] },
    detTbl: numbersOf(V.detTbl(p)),
    assBox: numbersOf(V.assBox(p)),
    charts: {
      cMain0: p.charts.vermoegen,
      cMain1: p.charts.nullLinie,
      cMainLabels: p.charts.labels,
      cBreakData: (function () {
        // Orakel Z.467 bis 482: Reihenfolge und Splices exakt spiegeln
        const arr = [p.charts.sparEnergieCo2, p.charts.sparDyn, p.charts.bioAufschlag, p.charts.wartungDelta];
        if (!p.system.bioOn) arr.splice(2, 1);
        if (!p.dynTarif.aktiv) arr.splice(1, 1);
        return arr;
      })(),
      cHeat0: p.charts.heizFossil,
      cHeat1: p.charts.heizWp,
      cHeat2: p.charts.heizDiff
    }
  };
}

/** Request-Strings/Defaults → typisierte Engine-Inputs (Spiegel des Lane-C-Wirings). */
function normalize(v) {
  const d = ENG.KV_DEFAULTS;
  const num = (x, f) => (x === undefined || x === null || x === '' ? f : Number(x));
  const bool = (x, f) => (x === undefined || x === null ? f : (x === true || x === 1 || x === '1' || x === 'true' || x === 'ja'));
  return {
    modus: v.modus || d.modus,
    heizart: v.heizart || d.heizart,
    bedarf: num(v.bedarf, d.bedarf),
    eta: num(v.eta, d.eta),
    invWP: num(v.invWP, d.invWP),
    jaz: num(v.jaz, d.jaz),
    laufzeit: parseInt(num(v.laufzeit, d.laufzeit), 10),
    neuFossilTog: bool(v.neuFossilTog, d.neuFossilTog),
    vglBrennstoff: v.vglBrennstoff || d.vglBrennstoff,
    gasInvest: num(v.gasInvest, d.gasInvest),
    oelInvest: num(v.oelInvest, d.oelInvest),
    gaspreis: num(v.gaspreis, d.gaspreis),
    gasStg: num(v.gasStg, d.gasStg),
    oelpreis: num(v.oelpreis, d.oelpreis),
    oelStg: num(v.oelStg, d.oelStg),
    strompreis: num(v.strompreis, d.strompreis),
    stromEntw: num(v.stromEntw, d.stromEntw),
    co2preis: num(v.co2preis, d.co2preis),
    co2Pfad: num(v.co2Pfad, d.co2Pfad),
    bioTog: bool(v.bioTog, d.bioTog),
    bioAufpreis: num(v.bioAufpreis, d.bioAufpreis),
    fHalbjahr: v.fHalbjahr || d.fHalbjahr,
    fGrund: bool(v.fGrund, d.fGrund),
    fEU: bool(v.fEU, d.fEU),
    fKlima: bool(v.fKlima, d.fKlima),
    fAlt20: bool(v.fAlt20, d.fAlt20),
    fEinkSlider: num(v.fEinkSlider, d.fEinkSlider),
    fKind: bool(v.fKind, d.fKind),
    proklimaTog: bool(v.proklimaTog, d.proklimaTog),
    fEffizienz: bool(v.fEffizienz, d.fEffizienz),
    finanzTog: bool(v.finanzTog, d.finanzTog),
    kredLZ: parseInt(num(v.kredLZ, d.kredLZ), 10),
    kredZins: num(v.kredZins, d.kredZins),
    immoTog: bool(v.immoTog, d.immoTog),
    hausW: num(v.hausW, d.hausW),
    immoP: num(v.immoP, d.immoP),
    dynTarifTog: bool(v.dynTarifTog, d.dynTarifTog),
    dynAnteil: num(v.dynAnteil, d.dynAnteil),
    dynSpread: num(v.dynSpread, d.dynSpread)
  };
}

/* ---------- Vergleich ---------- */

function cmpNumArr(a, b, pfad, out) {
  if (!a && !b) return;
  if (!a || !b) { out.push(pfad + ': eine Seite null (orakel=' + !!a + ', port=' + !!b + ')'); return; }
  if (a.length !== b.length) {
    out.push(pfad + ': Laenge ' + a.length + ' (Orakel) vs ' + b.length + ' (Port) | O=[' + a.slice(0, 12) + '] P=[' + b.slice(0, 12) + ']');
    return;
  }
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i]) && !(a[i] === b[i])) {
      out.push(pfad + '[' + i + ']: Orakel=' + a[i] + ' Port=' + b[i] + ' Delta=' + (b[i] - a[i]));
    }
  }
}

function compare(o, p) {
  const d = [];
  Object.keys(o.foerderBox).forEach(k => {
    if (o.foerderBox[k] !== p.foerderBox[k]) d.push('foerderBox.' + k + ': Orakel="' + o.foerderBox[k] + '" Port="' + p.foerderBox[k] + '"');
  });
  cmpNumArr(o.foerderTreppe, p.foerderTreppe, 'foerderTreppe', d);
  cmpNumArr(o.pathSummary, p.pathSummary, 'pathSummary', d);
  cmpNumArr(o.kpiGrid, p.kpiGrid, 'kpiGrid', d);
  if (o.kpiLabels.join('|') !== p.kpiLabels.join('|')) d.push('kpiLabels: Orakel=[' + o.kpiLabels + '] Port=[' + p.kpiLabels + ']');
  if (o.dreiWegeBox.display !== p.dreiWegeBox.display) d.push('dreiWegeBox.display: ' + o.dreiWegeBox.display + ' vs ' + p.dreiWegeBox.display);
  cmpNumArr(o.dreiWegeBox.zahlen, p.dreiWegeBox.zahlen, 'dreiWegeBox', d);
  if (o.cashflowBox.display !== p.cashflowBox.display) d.push('cashflowBox.display: ' + o.cashflowBox.display + ' vs ' + p.cashflowBox.display);
  cmpNumArr(o.cashflowBox.zahlen, p.cashflowBox.zahlen, 'cashflowBox', d);
  cmpNumArr(o.co2Box, p.co2Box, 'co2Box', d);
  cmpNumArr(o.sensiBox, p.sensiBox, 'sensiBox', d);
  if (o.immoBox.display !== p.immoBox.display) d.push('immoBox.display: ' + o.immoBox.display + ' vs ' + p.immoBox.display);
  cmpNumArr(o.immoBox.zahlen, p.immoBox.zahlen, 'immoBox', d);
  cmpNumArr(o.detTbl, p.detTbl, 'detTbl', d);
  cmpNumArr(o.assBox, p.assBox, 'assBox', d);
  cmpNumArr(o.charts.cMain0, p.charts.cMain0, 'chart.vermoegen', d);
  cmpNumArr(o.charts.cMain1, p.charts.cMain1, 'chart.nullLinie', d);
  if ((o.charts.cMainLabels || []).join(',') !== (p.charts.cMainLabels || []).join(',')) d.push('chart.labels abweichend');
  const ob = o.charts.cBreakData || [], pb = p.charts.cBreakData || [];
  if (ob.length !== pb.length) d.push('chart.cBreak Serienzahl: ' + ob.length + ' vs ' + pb.length);
  else ob.forEach((s, i) => cmpNumArr(s, pb[i], 'chart.cBreak[' + i + ']', d));
  cmpNumArr(o.charts.cHeat0, p.charts.cHeat0, 'chart.heizFossil', d);
  cmpNumArr(o.charts.cHeat1, p.charts.cHeat1, 'chart.heizWp', d);
  cmpNumArr(o.charts.cHeat2, p.charts.cHeat2, 'chart.heizDiff', d);
  return d;
}

/* ---------- Lauf ---------- */

function main() {
  const verbose = process.argv.includes('--verbose');
  const maxIdx = process.argv.indexOf('--max');
  const e = extractScript();
  console.log('== SHA-GATE ==');
  console.log('Orakel-Extrakt: ' + e.laenge + ' Zeichen (UTF-16-Einheiten in Node)');
  console.log('sha256 IST:  ' + e.sha);
  console.log('sha256 SOLL: ' + SHA_SOLL);
  console.log('Ergebnis: ' + (e.sha === SHA_SOLL ? 'PASS' : 'FAIL'));
  if (e.sha !== SHA_SOLL) process.exit(2);

  const { list, achsStat } = buildVectors();
  const vecs = maxIdx > 0 ? list.slice(0, Number(process.argv[maxIdx + 1])) : list;
  console.log('\n== VEKTOREN ==');
  console.log('Gesamt: ' + vecs.length);

  let ok = 0;
  const fails = [];
  vecs.forEach((v, i) => {
    let o, p;
    try { o = runOracle(v.inputs); } catch (err) { fails.push({ name: v.name, deltas: ['ORAKEL-LAUF FEHLER: ' + err.message] }); return; }
    try { p = portHarvest(v.inputs); } catch (err) { fails.push({ name: v.name, deltas: ['PORT-LAUF FEHLER: ' + err.message + '\n' + err.stack] }); return; }
    const d = compare(o, p);
    if (d.length === 0) ok++;
    else fails.push({ name: v.name, deltas: d, inputs: v.inputs });
    if (verbose && (i % 100 === 0)) console.log('  ... ' + i + '/' + vecs.length);
  });

  console.log('\n== ERGEBNIS ==');
  console.log('Delta EXAKT 0: ' + ok + ' / ' + vecs.length);
  console.log('Abweichend:    ' + fails.length);
  console.log('\n-- Vektoren je Achse (Vollpermutation) --');
  Object.keys(achsStat).forEach(k => console.log('  ' + k + ': ' + achsStat[k]));

  if (fails.length) {
    console.log('\n== ABWEICHUNGEN (erste 12) ==');
    fails.slice(0, 12).forEach(f => {
      console.log('\n[' + f.name + ']');
      f.deltas.slice(0, 8).forEach(x => console.log('   ' + x));
    });
    process.exit(1);
  }
  console.log('\nGATE: PASS. Port ist orakel-aequivalent auf jeder ausgegebenen Zahl.');
}

if (require.main === module) main();
module.exports = { portHarvest, normalize, compare, loadEngine };
