/**
 * vectors.js — Testvektoren fuer das Aequivalenz-Gate (B5).
 *
 * Aufbau:
 *  A) Achsen-Vollpermutation: jede diskrete Achse EINZELN vollstaendig
 *     durchpermutiert (gegen den Default-Vektor), plus die Kreuzprodukte der
 *     Achsen, die sich im Orakel gegenseitig bedingen (Periode x EU x Klima x
 *     Alt20 x Kind, Toggle-Kombinationen, Brennstoff x neuFossil).
 *  B) 200 Zufallskombinationen mit festem Seed 42, deterministischer Generator
 *     (mulberry32) — NICHT Math.random.
 */
'use strict';

/** Orakel-HTML-Startwerte = Default-Vektor. */
const DEFAULT_VEC = {
  heizart: 'gas', bedarf: 20000, eta: 85, invWP: 30000, jaz: 3.8, laufzeit: 20,
  neuFossilTog: true, vglBrennstoff: 'gas', gasInvest: 12000, oelInvest: 16000,
  gaspreis: 12, gasStg: 2.5, oelpreis: 11, oelStg: 2.5,
  strompreis: 32, stromEntw: 1.5, co2preis: 55, co2Pfad: 250,
  bioTog: true, bioAufpreis: 2.5,
  fHalbjahr: 'h2-2026', fGrund: true, fEU: true, fKlima: true, fAlt20: true,
  fEinkSlider: 60000, fKind: false, proklimaTog: false,
  finanzTog: false, kredLZ: 10, kredZins: 0.7,
  immoTog: false, hausW: 350000, immoP: 7,
  dynTarifTog: false, dynAnteil: 40, dynSpread: 10
};

/** Diskrete Achsen mit ihrem VOLLSTAENDIGEN Wertebereich (aus dem Orakel-HTML). */
const ACHSEN = {
  fHalbjahr: ['h2-2026', 'h1-2027', 'h2-2027', 'h1-2028', 'h2-2028', 'h1-2029'],
  // eta-Defaults der Kesselklassen-Matrix (wzEtaDefault, Orakel Z.896 bis 907)
  // plus die Regler-Grenzen 65/98.
  eta: [65, 70, 80, 85, 86, 90, 93, 98],
  fKlima: [true, false],
  fAlt20: [true, false],
  fEU: [true, false],
  fKind: [true, false],
  fGrund: [true, false],
  proklimaTog: [true, false],
  finanzTog: [true, false],
  neuFossilTog: [true, false],
  bioTog: [true, false],
  dynTarifTog: [true, false],
  immoTog: [true, false],
  vglBrennstoff: ['gas', 'oel'],
  heizart: ['gas', 'oel'],
  bioAufpreis: [2.0, 2.5, 3.0],
  gasStg: [1.5, 2.5, 4.0],
  oelStg: [1.5, 2.5, 4.0],
  stromEntw: [-0.5, 1.5, 3.0],
  co2Pfad: [150, 250, 300],
  // Einkommensstufen: Grenzen der Staffel exakt getroffen (30k/40k/50k) plus Regler-Enden
  fEinkSlider: [15000, 25000, 30000, 30001, 39000, 40000, 40001, 49000, 50000, 50001, 60000, 120000],
  laufzeit: [5, 10, 13, 20, 25],
  bedarf: [5000, 20000, 47500, 80000],
  invWP: [8000, 20000, 28000, 30000, 65000],
  jaz: [2.5, 3.8, 5.0],
  kredLZ: [5, 10, 20],
  kredZins: [0.5, 0.7, 3.5, 6.0],
  gasInvest: [6000, 12000, 20000],
  oelInvest: [9000, 16000, 28000],
  gaspreis: [6, 12, 20],
  oelpreis: [6, 11, 20],
  strompreis: [20, 32, 45],
  co2preis: [25, 55, 80],
  dynAnteil: [20, 40, 60],
  dynSpread: [5, 10, 20],
  hausW: [100000, 350000, 800000],
  immoP: [3, 7, 15]
};

/** Einheiten-Varianten: der Client rechnet m3/Liter x10 in kWh um (Orakel WZ_UNIT_F=10). */
const EINHEITEN_VEC = [
  { unit: 'kwh', roh: 20000, bedarf: 20000 },
  { unit: 'm3', roh: 2000, bedarf: 20000 },
  { unit: 'liter', roh: 3000, bedarf: 30000 },
  { unit: 'm3', roh: 500, bedarf: 5000 },
  { unit: 'liter', roh: 8000, bedarf: 80000 }
];

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildVectors() {
  const list = [];
  const push = (name, ov) => list.push({ name, inputs: Object.assign({}, DEFAULT_VEC, ov) });

  // Default
  push('default', {});

  // A) Jede Achse einzeln vollstaendig
  const achsStat = {};
  Object.keys(ACHSEN).forEach(key => {
    ACHSEN[key].forEach(v => {
      const ov = {};
      ov[key] = v;
      // Achsen, die im Orakel nur bei aktivem Toggle wirken, mit Toggle testen
      if (key === 'kredLZ' || key === 'kredZins') ov.finanzTog = true;
      if (key === 'dynAnteil' || key === 'dynSpread') ov.dynTarifTog = true;
      if (key === 'hausW' || key === 'immoP') ov.immoTog = true;
      if (key === 'bioAufpreis') ov.bioTog = true;
      push('achse:' + key + '=' + v, ov);
    });
    achsStat[key] = ACHSEN[key].length;
  });

  // A2) Kreuzprodukt Foerder-Logik: Periode x EU x Klima x Alt20 x Kind x Einkommen(Stufen)
  const einkStufen = [25000, 35000, 45000, 60000];
  ACHSEN.fHalbjahr.forEach(hj => {
    [true, false].forEach(eu => {
      [true, false].forEach(kl => {
        [true, false].forEach(a20 => {
          [true, false].forEach(kind => {
            einkStufen.forEach(eink => {
              push('foerder:' + hj + '/eu' + eu + '/kl' + kl + '/a20' + a20 + '/kind' + kind + '/e' + eink,
                { fHalbjahr: hj, fEU: eu, fKlima: kl, fAlt20: a20, fKind: kind, fEinkSlider: eink });
            });
          });
        });
      });
    });
  });

  // A3) Kreuzprodukt Toggles: neuFossil x vglBrennstoff x bio x finanz x dyn x immo x proklima
  [true, false].forEach(nf => {
    ['gas', 'oel'].forEach(vf => {
      [true, false].forEach(bio => {
        [true, false].forEach(fin => {
          push('togg:nf' + nf + '/vf' + vf + '/bio' + bio + '/fin' + fin,
            { neuFossilTog: nf, vglBrennstoff: vf, bioTog: bio, finanzTog: fin });
        });
      });
    });
  });
  [true, false].forEach(dyn => {
    [true, false].forEach(immo => {
      [true, false].forEach(pk => {
        ['gas', 'oel'].forEach(hz => {
          push('togg2:dyn' + dyn + '/immo' + immo + '/pk' + pk + '/hz' + hz,
            { dynTarifTog: dyn, immoTog: immo, proklimaTog: pk, heizart: hz });
        });
      });
    });
  });

  // A4) proKlima x Periode x invWP (60-Prozent-Kumulierungsdeckel + 1.500-Kappung)
  ACHSEN.fHalbjahr.forEach(hj => {
    [8000, 20000, 30000, 65000].forEach(inv => {
      push('proklima:' + hj + '/inv' + inv, { proklimaTog: true, fHalbjahr: hj, invWP: inv });
    });
  });

  // A4b) 60-Prozent-Kumulierungsdeckel GEZIELT umzingelt (Fix X-2, Abnahme-Befund M9).
  //
  // Anlass: die Mutation kumCapPct 0.6 → 0.65 wurde von nur 2 von 776 Vektoren
  // gefangen. Die Regel mit dem groessten Geld-Hebel haing an zwei Faellen.
  //
  // Wo genau liegt die Kante? totalFoerd = max(fBetrag, min(fBetrag+pkWP, 0,6*inv)),
  // der Deckel beisst also, sobald fBetrag + pkWP > 0,6*inv (Orakel Z.224 bis 226).
  //  - Fuer inv <= 28.000 (Bemessungsgrenze h2-2026) ist pkWP = round(0,05*inv) und
  //    fBetrag = inv*q/100. Die Bedingung kuerzt sich zu q/100 + 0,05 > 0,6, also
  //    q > 55: die Kante liegt im QUOTEN-Raum bei 55 Prozent, unabhaengig von inv.
  //    Quote 55 selbst ist mit dem ganzzahligen Bonus-Raster der Reform-Perioden
  //    NICHT erreichbar (moegliche Quoten h2-2026: 0/10/16/26/30/40/46/56/60/70/76/80),
  //    darum wird sie beidseitig eingeklemmt: 46 darunter, 56 knapp darueber.
  //  - Fuer inv >= 30.000 ist pkWP auf 1.500 gekappt. Dann liegt die Kante im
  //    INVEST-Raum: 280*q + 1.500 = 0,6*inv. Bei q=60 ergibt das inv = 30.500 exakt.
  //    Das ist der Fall EXAKT AUF der Kappungsgrenze (fBetrag+pkWP = 0,6*inv = 18.300).
  ACHSEN.fHalbjahr.forEach(hj => {
    [true, false].forEach(pk => {
      // Paket-Bruttos aus Kanon Abschnitt 5. Bei den ersten beiden liegt der
      // KfW-Zuschuss allein ueber dem Deckel (proKlima bringt 0), bei den letzten
      // beiden wirkt proKlima voll additiv. Beide Seiten der Regel, je Periode.
      [29750, 34510, 45220, 57120].forEach(brutto => {
        push('deckel:paket' + brutto + '/' + hj + '/pk' + pk,
          { proklimaTog: pk, fHalbjahr: hj, invWP: brutto, fEinkSlider: 25000 });
      });
    });
  });
  // Quoten-Raum um die Kante q=55 (nur h2-2026: nur dort ist proKlima erlaubt,
  // nur dort kann der Deckel ueberhaupt greifen). Je Quote mit proKlima an UND aus.
  const DECKEL_QUOTEN = [
    { q: 30, ov: { fKlima: false, fEinkSlider: 60000 } },  // 30 + 0 + 0
    { q: 46, ov: { fKlima: true, fEinkSlider: 60000 } },   // 30 + 16 + 0
    { q: 56, ov: { fKlima: true, fEinkSlider: 45000 } },   // 30 + 16 + 10, knapp ueber der Kante
    { q: 60, ov: { fKlima: false, fEinkSlider: 35000 } },  // 30 + 0 + 30
    { q: 70, ov: { fKlima: false, fEinkSlider: 25000 } },  // 30 + 0 + 40
    { q: 76, ov: { fKlima: true, fEinkSlider: 35000 } },   // 30 + 16 + 30
    { q: 80, ov: { fKlima: true, fEinkSlider: 25000 } }    // 30 + 16 + 40 = 86, gekappt auf 80
  ];
  DECKEL_QUOTEN.forEach(d => {
    [true, false].forEach(pk => {
      [20000, 28000].forEach(inv => {
        push('deckel:q' + d.q + '/inv' + inv + '/pk' + pk,
          Object.assign({ proklimaTog: pk, fHalbjahr: 'h2-2026', invWP: inv }, d.ov));
      });
    });
  });
  // Kante im Invest-Raum bei q=60: 30.500 liegt EXAKT auf 0,6*inv, 30.400 knapp
  // darueber (Deckel beisst), 30.600 knapp darunter (proKlima voll).
  [30400, 30500, 30600].forEach(inv => {
    [true, false].forEach(pk => {
      push('deckel:kante-inv' + inv + '/pk' + pk,
        { proklimaTog: pk, fHalbjahr: 'h2-2026', invWP: inv, fKlima: false, fEinkSlider: 35000 });
    });
  });

  // A5) Einheiten-Varianten (Client-Umrechnung, Server sieht nur kWh)
  EINHEITEN_VEC.forEach(e => {
    push('einheit:' + e.unit + '/' + e.roh, { bedarf: e.bedarf });
  });

  // A6) modus: reines Echo, Rechenkern identisch
  ['kunde', 'berater'].forEach(m => push('modus:' + m, {}));

  // A7) Kanten: Break-even sofort / nie, Mehrinvest negativ, Worst-Case negativ
  push('kante:sofort', { invWP: 8000, gasInvest: 20000, neuFossilTog: true });
  push('kante:nie', { invWP: 65000, bedarf: 5000, laufzeit: 5, fGrund: false, fKlima: false });
  push('kante:quote-gekappt', { fEinkSlider: 15000, fKind: true, fHalbjahr: 'h2-2026' });
  push('kante:kredLZ>laufzeit', { finanzTog: true, kredLZ: 20, laufzeit: 10 });
  push('kante:kredZins-min', { finanzTog: true, kredZins: 0.5 });
  push('kante:strom-sinkend', { stromEntw: -0.5 });
  push('kante:mehrinvest-null', { invWP: 8000, gasInvest: 8000 });

  // B) 200 Zufallskombinationen, Seed 42, deterministisch
  const rnd = mulberry32(42);
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  for (let i = 0; i < 200; i++) {
    const ov = {};
    Object.keys(ACHSEN).forEach(key => { ov[key] = pick(ACHSEN[key]); });
    push('rand#' + i, ov);
  }

  return { list, achsStat, DEFAULT_VEC, ACHSEN };
}

module.exports = { buildVectors, DEFAULT_VEC, ACHSEN, mulberry32, EINHEITEN_VEC };
