/**
 * WE-STAFFEL-BEWEIS (G1, Master-Fixplan 23.07.2026; GF-Entscheid E1=A).
 *
 * Start:  node apps-script/rechner-backend/tests/we_staffel/run_tests.js
 * Kein Framework, kein npm-Dependency, kein Netz, kein Sheet.
 *
 * Zweck: Additiver Zusatz-Beweis fuer we > 1. Das eingefrorene Orakel kann kein we > 1
 * (Werkzeug-Grenze, Kanon 1.4 "Verhaeltnis zur Engine") — die Soll-Werte stammen deshalb
 * NICHT aus dem Orakel, sondern aus DOPPELTER unabhaengiger Herleitung:
 *   HAND  = Handrechnung nach Kanon 1.4 (Staffel 28.000 / 15.000 / 8.000, Kostenaufteilung
 *           preis/we, Rundung EINMAL je Topf), als Literal im Vektor, Rechenweg im Kommentar.
 *   BLATT = unabhaengige Blatt-Vorausberechnung: je WE eine Zeile (Grenze, Topf) wie im
 *           Kalkulationsblatt; ein generischer Summierer wertet die Zeilen aus (min(Grenze;
 *           Kosten je WE), Topf-Summen, Satz) — bewusst ANDERE Struktur als der Kern-Loop.
 * PASS nur, wenn HAND == BLATT == Kern (foerderCalc_), Feld fuer Feld, Delta exakt 0.
 *
 * Der 858-Vektoren-Aequivalenz-Bestand (kv_equivalence) und tests/foerderung_perioden
 * bleiben unangetastet; dieser Ordner ist eine reine ERWEITERUNG (Fixplan G1).
 *
 * Belege: Kanon 2026-07-15_Foerder-Regelwerk-Kanon_BEG-Reform_HERO.md Abschnitt 1.4 + 9.1
 * (K-1.1) + 10.6; G1-Fix-Spec 2026-07-23 (Kontrollwert-Anker 22.964); Live-Bug-Beweis
 * 23.07.2026 (we=2 ergab 10.640, we=1 ergab 12.880 bei identischem Preis 35.349).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const CODE_PATH = path.join(__dirname, '..', '..', 'Code.gs');
const ENGINE_PATH = path.join(__dirname, '..', '..', 'kv_engine.gs');

// --- Sandbox wie tests/foerderung_perioden: jeder Sheet-/Cache-Zugriff wirft (Purity-Beweis).
const verboten = (was) => () => {
  throw new Error('PURITY-VERSTOSS: foerderCalc_ hat ' + was + ' angefasst');
};
const sandbox = {
  console,
  SpreadsheetApp: { openById: verboten('SpreadsheetApp') },
  CacheService: { getScriptCache: verboten('CacheService') },
  ContentService: { createTextOutput: verboten('ContentService'), MimeType: { JSON: 'JSON' } },
  Utilities: { sleep: verboten('Utilities') },
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(ENGINE_PATH, 'utf8'), sandbox, { filename: 'kv_engine.gs' });
vm.runInContext(fs.readFileSync(CODE_PATH, 'utf8'), sandbox, { filename: 'Code.gs' });

const { foerderCalc_, FOERDER_ROWS_ } = sandbox;

const F = {};
FOERDER_ROWS_().forEach((r) => {
  F[r[0]] = r[1];
});

const d = (s) => {
  const [y, m, day] = s.split('-').map(Number);
  return new Date(y, m - 1, day);
};

// Basis-Request: Zahlen als TEXT (Lehre 20.07.: int_() frisst Dezimalpunkte und echte Nullen).
const BASIS = { heizung: 'gas', heizungsalter: '25', gemeinde: 'wedemark', proklimaOptin: 'nein' };
const p = (o) => Object.assign({}, BASIS, o);

/**
 * BLATT-Vorausberechnung: wertet die Literal-Zeilen des Vektors aus wie das Kalkulationsblatt
 * (je WE: Basis = MIN(Grenze; Preis/WE-Anzahl); Topf-Summen; Zuschuss = ROUND(Topf x Satz)).
 * Bewusst OHNE Rueckgriff auf Kern-Funktionen oder Kern-Parameter.
 */
function blatt(vec) {
  const kostenJeWE = vec.preis / vec.blatt.length;
  let selbst = 0;
  let vermietet = 0;
  vec.blatt.forEach((zeile) => {
    const basis = Math.min(zeile.grenze, kostenJeWE);
    if (zeile.topf === 'selbst') selbst += basis;
    else vermietet += basis;
  });
  const zuschussSelbst = selbst > 0 ? Math.round((selbst * vec.satzSelbst) / 100) : 0;
  const zuschussVermietet = vermietet > 0 ? Math.round((vermietet * vec.satzVermietet) / 100) : 0;
  return {
    zuschussGesamt: zuschussSelbst + zuschussVermietet,
    bemessungsBasis: selbst + vermietet,
    grenze: vec.blatt.reduce((s, z) => s + z.grenze, 0),
    eigenanteil: Math.max(0, vec.preis - zuschussSelbst - zuschussVermietet),
  };
}

/**
 * Vektoren. HAND-Literale je Kommentar von Hand vorgerechnet (Kanon 1.4).
 * Saetze h2-2026: Grund 30, Klimabonus 16 (gas >= 20 J.), Einkommensbonus bis30 = 40,
 * Deckel selbst 80; vermietet = nur Grundfoerderung 30 (Kanon A1).
 */
const VEKTOREN = [
  {
    id: 'W-01',
    name: 'Live-Beweisfall 23.07. | we=2, Preis 35.349, ohne Einkommensbonus (46/30)',
    // HAND: Kosten je WE 17.674,50. WE1 selbst: min(28.000; 17.674,50) = 17.674,50 ->
    // round(17.674,50 x 0,46) = round(8.130,27) = 8.130. WE2 vermietet: min(15.000; 17.674,50)
    // = 15.000 -> round(4.500) = 4.500. Summe 12.630 (HEUTE live falsch: 10.640 per Mittelung;
    // we=1 zum Vergleich: 12.880 — bei diesem Preis deckelt der Kosten-Split die erste WE,
    // deshalb liegt we=2 korrekt UNTER we=1; der Anker-Fall W-02 liegt korrekt DARUEBER).
    req: { we: '2', selbstWE: '1', einkommen: 'ueber50', preis: '35349' },
    datum: '2026-08-01',
    satzSelbst: 46,
    satzVermietet: 30,
    preis: 35349,
    blatt: [
      { grenze: 28000, topf: 'selbst' },
      { grenze: 15000, topf: 'vermietet' },
    ],
    hand: { kfwSatz: 46, zuschussGesamt: 12630, eigenanteil: 22719, effektivSatz: 36, grenze: 43000, bemessungsBasis: 32674.5 },
  },
  {
    id: 'W-02',
    name: 'Kontrollwert-Anker U2-Pruefer | Vaillant XL 46.159, we=2, Bestfall 80/30 -> 22.964',
    // HAND: Kosten je WE 23.079,50. WE1 selbst: min(28.000; 23.079,50) = 23.079,50 ->
    // round(23.079,50 x 0,80) = round(18.463,60) = 18.464. WE2 vermietet: 15.000 -> 4.500.
    // Summe 22.964 (Anker aus G1-Fix-Spec; Blatt heute falsch: 23.650 = +686 Ueberzeichnung).
    // we=1 zum Vergleich: round(28.000 x 0,80) = 22.400 -> we=2 liegt korrekt DARUEBER.
    req: { we: '2', selbstWE: '1', einkommen: 'bis30', preis: '46159' },
    datum: '2026-08-01',
    satzSelbst: 80,
    satzVermietet: 30,
    preis: 46159,
    blatt: [
      { grenze: 28000, topf: 'selbst' },
      { grenze: 15000, topf: 'vermietet' },
    ],
    hand: { kfwSatz: 80, zuschussGesamt: 22964, eigenanteil: 23195, effektivSatz: 50, grenze: 43000, bemessungsBasis: 38079.5 },
  },
  {
    id: 'W-03',
    name: 'we=3 | Grenzen binden (Preis 90.000)',
    // HAND: Kosten je WE 30.000. WE1: min(28.000; 30.000) = 28.000 -> 22.400. WE2+WE3 vermietet:
    // je 15.000 -> Topf 30.000 -> 9.000. Summe 31.400. Grenze 28.000 + 2x15.000 = 58.000.
    req: { we: '3', selbstWE: '1', einkommen: 'bis30', preis: '90000' },
    datum: '2026-08-01',
    satzSelbst: 80,
    satzVermietet: 30,
    preis: 90000,
    blatt: [
      { grenze: 28000, topf: 'selbst' },
      { grenze: 15000, topf: 'vermietet' },
      { grenze: 15000, topf: 'vermietet' },
    ],
    hand: { kfwSatz: 80, zuschussGesamt: 31400, eigenanteil: 58600, effektivSatz: 35, grenze: 58000, bemessungsBasis: 58000 },
  },
  {
    id: 'W-04',
    name: 'we=6 | letzte 15.000er-WE (Preis 240.000; Grenze 103.000 = XXL-Tafelwert)',
    // HAND: Kosten je WE 40.000. WE1: 28.000 -> 22.400. WE2-6: 5x15.000 = 75.000 -> 22.500.
    // Summe 44.900. Grenze 28.000 + 75.000 = 103.000 (== Preistafel-Staffelgrenze XXL).
    req: { we: '6', selbstWE: '1', einkommen: 'bis30', preis: '240000' },
    datum: '2026-08-01',
    satzSelbst: 80,
    satzVermietet: 30,
    preis: 240000,
    blatt: [
      { grenze: 28000, topf: 'selbst' },
      { grenze: 15000, topf: 'vermietet' },
      { grenze: 15000, topf: 'vermietet' },
      { grenze: 15000, topf: 'vermietet' },
      { grenze: 15000, topf: 'vermietet' },
      { grenze: 15000, topf: 'vermietet' },
    ],
    hand: { kfwSatz: 80, zuschussGesamt: 44900, eigenanteil: 195100, effektivSatz: 19, grenze: 103000, bemessungsBasis: 103000 },
  },
  {
    id: 'W-05',
    name: 'we=7 | 8.000er-Grenze greift erstmals (Preis 280.000)',
    // HAND: Kosten je WE 40.000. WE1: 28.000 -> 22.400. WE2-6: 75.000; WE7: 8.000 ->
    // Topf vermietet 83.000 -> 24.900. Summe 47.300. Grenze 111.000.
    req: { we: '7', selbstWE: '1', einkommen: 'bis30', preis: '280000' },
    datum: '2026-08-01',
    satzSelbst: 80,
    satzVermietet: 30,
    preis: 280000,
    blatt: [
      { grenze: 28000, topf: 'selbst' },
      { grenze: 15000, topf: 'vermietet' },
      { grenze: 15000, topf: 'vermietet' },
      { grenze: 15000, topf: 'vermietet' },
      { grenze: 15000, topf: 'vermietet' },
      { grenze: 15000, topf: 'vermietet' },
      { grenze: 8000, topf: 'vermietet' },
    ],
    hand: { kfwSatz: 80, zuschussGesamt: 47300, eigenanteil: 232700, effektivSatz: 17, grenze: 111000, bemessungsBasis: 111000 },
  },
  {
    id: 'W-06',
    name: 'we=10 | Kostendeckel je WE unter allen Grenzen (Preis 100.000)',
    // HAND: Kosten je WE 10.000 < jede Grenze. WE1: 10.000 -> 8.000. WE2-10 vermietet:
    // 9x10.000 = 90.000... ACHTUNG: Basis je WE = min(Grenze; 10.000) = 10.000 fuer WE2-6,
    // aber WE7-10 = min(8.000; 10.000) = 8.000. Topf vermietet = 5x10.000 + 4x8.000 = 82.000
    // -> 24.600. Summe 32.600. Grenze 28.000 + 75.000 + 4x8.000 = 135.000.
    req: { we: '10', selbstWE: '1', einkommen: 'bis30', preis: '100000' },
    datum: '2026-08-01',
    satzSelbst: 80,
    satzVermietet: 30,
    preis: 100000,
    blatt: [
      { grenze: 28000, topf: 'selbst' },
      { grenze: 15000, topf: 'vermietet' },
      { grenze: 15000, topf: 'vermietet' },
      { grenze: 15000, topf: 'vermietet' },
      { grenze: 15000, topf: 'vermietet' },
      { grenze: 15000, topf: 'vermietet' },
      { grenze: 8000, topf: 'vermietet' },
      { grenze: 8000, topf: 'vermietet' },
      { grenze: 8000, topf: 'vermietet' },
      { grenze: 8000, topf: 'vermietet' },
    ],
    hand: { kfwSatz: 80, zuschussGesamt: 32600, eigenanteil: 67400, effektivSatz: 33, grenze: 135000, bemessungsBasis: 92000 },
  },
  {
    id: 'W-07',
    name: 'selbstWE=0 | nur vermietet, keine Boni (Preis 46.159, we=2)',
    // HAND: satz = Grundfoerderung 30 (Boni sind Selbstnutzer-gebunden). Topf vermietet =
    // 23.079,50 + 15.000 = 38.079,50 -> round(11.423,85) = 11.424. kfwSatz = 30.
    req: { we: '2', selbstWE: '0', einkommen: 'bis30', preis: '46159' },
    datum: '2026-08-01',
    satzSelbst: 30,
    satzVermietet: 30,
    preis: 46159,
    blatt: [
      { grenze: 28000, topf: 'vermietet' },
      { grenze: 15000, topf: 'vermietet' },
    ],
    hand: { kfwSatz: 30, zuschussGesamt: 11424, eigenanteil: 34735, effektivSatz: 25, grenze: 43000, bemessungsBasis: 38079.5 },
  },
  {
    id: 'W-08',
    name: 'selbstWE=2 | zweite selbstgenutzte WE erhaelt Selbstnutzer-Satz auf ihre 15.000er-Grenze (we=3, Preis 60.000)',
    // HAND: Kosten je WE 20.000. WE1 selbst: min(28.000; 20.000) = 20.000; WE2 selbst:
    // min(15.000; 20.000) = 15.000 -> Topf selbst 35.000 -> 28.000. WE3 vermietet: 15.000 ->
    // 4.500. Summe 32.500. (Der Alt-Code haette die zweite Selbstnutzer-WE verloren.)
    req: { we: '3', selbstWE: '2', einkommen: 'bis30', preis: '60000' },
    datum: '2026-08-01',
    satzSelbst: 80,
    satzVermietet: 30,
    preis: 60000,
    blatt: [
      { grenze: 28000, topf: 'selbst' },
      { grenze: 15000, topf: 'selbst' },
      { grenze: 15000, topf: 'vermietet' },
    ],
    hand: { kfwSatz: 80, zuschussGesamt: 32500, eigenanteil: 27500, effektivSatz: 54, grenze: 58000, bemessungsBasis: 50000 },
  },
  {
    id: 'W-09',
    name: 'Preis klein | Kostendeckelung je WE greift beidseits der Grenze (Preis 20.000, we=2)',
    // HAND: Kosten je WE 10.000 < 28.000 und < 15.000. WE1: 10.000 -> 8.000; WE2: 10.000 ->
    // 3.000. Summe 11.000. (Lehre 20.07.: Testfaelle bewusst beidseits jeder Deckelung.)
    req: { we: '2', selbstWE: '1', einkommen: 'bis30', preis: '20000' },
    datum: '2026-08-01',
    satzSelbst: 80,
    satzVermietet: 30,
    preis: 20000,
    blatt: [
      { grenze: 28000, topf: 'selbst' },
      { grenze: 15000, topf: 'vermietet' },
    ],
    hand: { kfwSatz: 80, zuschussGesamt: 11000, eigenanteil: 9000, effektivSatz: 55, grenze: 43000, bemessungsBasis: 20000 },
  },
  {
    id: 'W-10',
    name: 'Alt-Periode we=2 | Alt-Zweig wortgleich konserviert (Preis 29.750, 15.07.2026)',
    // HAND (Alt-Rechenweg, historische Mittelung, wortgleich konserviert): ffG = 30.000 +
    // 15.000 = 45.000. foerderProWE = 22.500. kostenProWE = min(22.500; 14.875) = 14.875.
    // satzSelbst = 30+20+30+5 = 85 -> Deckel 70; satzVermietet = min(35; 35) = 35.
    // selbst round(14.875 x 0,70) = 10.413; vermietet round(14.875 x 0,35) = 5.206. Summe 15.619.
    // HINWEIS: Bei diesem Preis (Kosten je WE 14.875 < jede Grenze) liefern Mittelung und
    // echte Staffel dasselbe Ergebnis — der Vektor dokumentiert, dass der Alt-Zweig
    // UNVERAENDERT rechnet (Regressions-Konserve, seit 21.07.2026 nicht mehr beantragbar).
    req: { we: '2', selbstWE: '1', einkommen: 'unter40', preis: '29750' },
    datum: '2026-07-15',
    satzSelbst: 70,
    satzVermietet: 35,
    preis: 29750,
    blatt: [
      { grenze: 30000, topf: 'selbst' },
      { grenze: 15000, topf: 'vermietet' },
    ],
    hand: { kfwSatz: 70, zuschussGesamt: 15619, eigenanteil: 14131, effektivSatz: 53, grenze: 45000, bemessungsBasis: 29750 },
  },
  {
    id: 'W-11',
    name: 'NaN-Fall | nicht-numerischer Preis faellt deterministisch auf den Ersatzwert 34.510',
    // HAND: int_('abc') = NaN -> Fallback 34.510. Kosten je WE 17.255. WE1: 17.255 -> 13.804;
    // WE2: 15.000 -> 4.500. Summe 18.304. KEIN NaN in irgendeinem Ausgabefeld.
    req: { we: '2', selbstWE: '1', einkommen: 'bis30', preis: 'abc' },
    datum: '2026-08-01',
    satzSelbst: 80,
    satzVermietet: 30,
    preis: 34510,
    blatt: [
      { grenze: 28000, topf: 'selbst' },
      { grenze: 15000, topf: 'vermietet' },
    ],
    hand: { kfwSatz: 80, zuschussGesamt: 18304, eigenanteil: 16206, effektivSatz: 53, grenze: 43000, bemessungsBasis: 32255 },
  },
];

// --- Mini-Harness
let pass = 0;
const fails = [];
const zeilen = [];

function pruefe(id, beschreibung, ist, soll) {
  const abweichungen = [];
  Object.keys(soll).forEach((k) => {
    if (JSON.stringify(ist[k]) !== JSON.stringify(soll[k])) {
      abweichungen.push(`${k}: ist=${JSON.stringify(ist[k])} soll=${JSON.stringify(soll[k])}`);
    }
  });
  if (abweichungen.length === 0) {
    pass++;
    zeilen.push([id, beschreibung, 'PASS', '0'].join(' | '));
  } else {
    fails.push(`${id} (${beschreibung})\n    ` + abweichungen.join('\n    '));
    zeilen.push([id, beschreibung, 'FAIL', abweichungen.length + ' Feld(er)'].join(' | '));
  }
}

// --- Hauptlauf: HAND == BLATT == Kern, je Vektor.
VEKTOREN.forEach((vec) => {
  const b = blatt(vec);
  // (1) Doppelte Herleitung in sich konsistent: BLATT reproduziert die HAND-Literale.
  pruefe(vec.id + 'a', vec.name + ' | BLATT == HAND', b, {
    zuschussGesamt: vec.hand.zuschussGesamt,
    bemessungsBasis: vec.hand.bemessungsBasis,
    grenze: vec.hand.grenze,
    eigenanteil: vec.hand.eigenanteil,
  });
  // (2) Kern reproduziert die HAND-Literale (alle publizierten Felder).
  const ist = foerderCalc_(p(vec.req), F, d(vec.datum));
  pruefe(vec.id + 'b', vec.name + ' | Kern == HAND', ist, vec.hand);
  // (3) Kanon-Deckel 10.6: kein Vektor ueber 80 % der tatsaechlich angesetzten Basis
  //     (+1 EUR Toleranz fuer die Topf-Rundung).
  const deckelOk = ist.zuschussGesamt <= 0.8 * ist.bemessungsBasis + 1;
  pruefe(vec.id + 'c', vec.name + ' | Deckel <= 80 % der Bemessungsbasis', { deckelOk: deckelOk }, { deckelOk: true });
  // (4) Kein NaN/Infinity in numerischen Ausgabefeldern.
  const numerisch = ['kfwSatz', 'zuschussGesamt', 'proklimaZuschuss', 'eigenanteil', 'effektivSatz', 'preis', 'grenze', 'bemessungsBasis'];
  const kaputt = numerisch.filter((k) => !isFinite(ist[k]));
  pruefe(vec.id + 'd', vec.name + ' | alle Zahlenfelder endlich', { kaputt: kaputt }, { kaputt: [] });
});

// --- R-WE1 | Ziffer-Identitaet des we=1-Pfads: fuer we=1 gilt geschlossen
//     zuschuss = round(min(Grenze; Preis) x Satz) — exakt die historische Formel.
//     Sweep ueber Preise beidseits der Grenze und alle Einkommensklassen.
{
  const abw = [];
  let n = 0;
  ['bis30', 'bis40', 'bis50', 'ueber50'].forEach((einkommen) => {
    ['20', '5'].forEach((alter) => {
      for (let preis = 5000; preis <= 90000; preis += 1234) {
        const ist = foerderCalc_(p({ we: '1', selbstWE: '1', einkommen: einkommen, heizungsalter: alter, preis: String(preis) }), F, d('2026-08-01'));
        const soll = Math.round(Math.min(28000, preis) * (ist.kfwSatz / 100));
        n++;
        if (ist.zuschussGesamt !== soll || ist.eigenanteil !== preis - soll || ist.grenze !== 28000 || ist.bemessungsBasis !== Math.min(28000, preis)) {
          abw.push(`${einkommen}/alter${alter}/${preis}: zuschuss=${ist.zuschussGesamt} soll=${soll}`);
        }
      }
    });
  });
  pruefe('R-WE1', `we=1 ziffer-identisch zur historischen Formel (${n} Faelle)`, { abweichungen: abw.length, faelle: n }, { abweichungen: 0, faelle: n });
}

// --- Ausgabe
console.log('\nWE-STAFFEL | Zusatz-Beweis we>1 (G1, E1=A) | Testlauf');
console.log('Code.gs: ' + CODE_PATH);
console.log('\nID | Fall | Status | Delta');
console.log('---|------|--------|------');
zeilen.forEach((z) => console.log(z));

if (fails.length) {
  console.log('\nFEHLER:\n');
  fails.forEach((f) => console.log('  ' + f + '\n'));
  console.log(`ERGEBNIS: ${pass} PASS, ${fails.length} FAIL`);
  process.exit(1);
}
console.log(`\nERGEBNIS: ${pass}/${pass} PASS, Delta exakt 0 (HAND == BLATT == Kern).`);
