/**
 * WE-STAFFEL-BEWEIS, Fassung T1170 (09.10.2026): Höchstbetrag des Gebäudes zu gleichen Teilen.
 *
 * Start:  node apps-script/rechner-backend/tests/we_staffel/run_tests.js
 * Kein Framework, kein npm-Dependency, kein Netz, kein Sheet.
 *
 * Bis zum 08.10.2026 bewies dieser Ordner den GF-Entscheid E1=A vom 23.07.2026 (jede Wohneinheit
 * einzeln gedeckelt, die hoechste Grenze bei der selbstgenutzten). E1 vom 23.07.2026 abgelöst durch
 * Entscheid 30.09.2026 (T1170): es gilt die Foerderrichtlinie BEG EM vom 17.08.2026 (BAnz AT
 * 27.08.2026 B1) mit dem KfW-Merkblatt 458 (Stand 09/2026):
 *   - Nr. 8.3 und 8.3.1 Buchst. a: die Staffel 28.000 / je 15.000 / je 8.000 ist der Hoechstbetrag
 *     des GEBAEUDES; er verteilt sich zu gleichen Teilen auf alle Wohneinheiten (Merkblatt S. 4).
 *   - Nr. 8.3.1 Abs. 2: betrifft die Massnahme nicht alle Wohneinheiten, zaehlen nur die betroffenen
 *     (anteiliger Hoechstbetrag = Hoechstbetrag geteilt durch alle mal betroffene Wohneinheiten).
 *   - Nr. 8.4.4: Klimabonus nur fuer die selbstgenutzte Wohneinheit, bei mehreren "nur anteilig".
 *   - Nr. 8.4.1: Obergrenze 80 Prozent nur bei anrechenbarem Einkommen bis 30.000 Euro, sonst 70.
 *   - Rundung je Topf auf Cent wie die KfW-Beispiele (Merkblatt 458; Produktseite 458: 2 WE,
 *     41.000 Euro, 15.580 Euro).
 *
 * Soll-Werte aus DOPPELTER unabhaengiger Herleitung:
 *   HAND  = Handrechnung nach Richtlinie, als Literal im Vektor, Rechenweg im Kommentar.
 *   BLATT = unabhaengige Blatt-Vorausberechnung: je Wohneinheit eine Zeile (Grenze, Topf) wie im
 *           Kalkulationsblatt; ein generischer Summierer wertet sie aus (Hoechstbetrag = Summe der
 *           Grenzen, anteilig nach betroffenen Zeilen; Bemessung = MIN(Preis; anteiliger
 *           Hoechstbetrag); je Topf Zeilen mal Bemessung je Wohneinheit mal Satz, auf Cent).
 * PASS nur, wenn HAND == BLATT == Kern (foerderCalc_), Feld fuer Feld, Delta exakt 0.
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
const cent = (x) => Math.round(x * 100) / 100;

/**
 * BLATT-Vorausberechnung nach Richtlinie: Hoechstbetrag des Gebaeudes = Summe der Grenzen aller
 * Zeilen; anteilig nach den betroffenen Zeilen (Topf 'keine' = nicht betroffen); Bemessung =
 * MIN(Preis; anteiliger Hoechstbetrag); je betroffener Zeile Bemessung geteilt durch betroffene
 * Zeilen; Zuschuss je Topf = Zeilen x Basis je WE x Satz, auf Cent.
 * Bewusst OHNE Rueckgriff auf Kern-Funktionen oder Kern-Parameter.
 */
function blatt(vec) {
  const hoechstbetrag = vec.blatt.reduce((s, z) => s + z.grenze, 0);
  const betroffen = vec.blatt.filter((z) => z.topf !== 'keine');
  const anteilig = cent((hoechstbetrag / vec.blatt.length) * betroffen.length);
  const bemessung = Math.min(vec.preis, anteilig);
  const jeWE = bemessung / betroffen.length;
  const selbst = betroffen.filter((z) => z.topf === 'selbst').length;
  const vermietet = betroffen.length - selbst;
  const zuschussSelbst = selbst > 0 ? cent((jeWE * selbst * vec.satzSelbst) / 100) : 0;
  const zuschussVermietet = vermietet > 0 ? cent((jeWE * vermietet * vec.satzVermietet) / 100) : 0;
  const zuschuss = cent(zuschussSelbst + zuschussVermietet);
  return {
    zuschussGesamt: zuschuss,
    bemessungsBasis: bemessung,
    grenze: anteilig,
    eigenanteil: cent(Math.max(0, vec.preis - zuschuss)),
  };
}

/**
 * Vektoren. HAND-Literale je Kommentar von Hand vorgerechnet (Richtlinie 17.08.2026).
 * Saetze h2-2026: Grund 30, Klimabonus 16 (gas >= 20 J.), Einkommensbonus bis30 = 40,
 * Obergrenze 80 nur bis30 (sonst 70); vermietet = nur Grundfoerderung 30 (Kanon A1).
 * Bis 08.10.2026 (E1=A) erwartete Werte stehen je Vektor als "vorher".
 */
const VEKTOREN = [
  {
    id: 'W-01',
    name: 'Live-Beweisfall 23.07. | we=2, Preis 35.349, ohne Einkommensbonus (46/30)',
    // HAND: Hoechstbetrag 28.000 + 15.000 = 43.000. Bemessung min(35.349; 43.000) = 35.349, je WE 17.674,50.
    // selbst 17.674,50 x 0,46 = 8.130,27; vermietet 17.674,50 x 0,30 = 5.302,35. Summe 13.432,62.
    // vorher (E1=A): 12.630.
    req: { we: '2', selbstWE: '1', einkommen: 'ueber50', preis: '35349' },
    datum: '2026-08-01',
    satzSelbst: 46,
    satzVermietet: 30,
    preis: 35349,
    blatt: [
      { grenze: 28000, topf: 'selbst' },
      { grenze: 15000, topf: 'vermietet' },
    ],
    hand: { kfwSatz: 46, zuschussGesamt: 13432.62, eigenanteil: 21916.38, effektivSatz: 38, grenze: 43000, bemessungsBasis: 35349 },
  },
  {
    id: 'W-02',
    name: 'Kontrollwert-Anker U2-Pruefer | Vaillant XL 46.159, we=2, Bestfall 80/30',
    // HAND: Hoechstbetrag 43.000. Bemessung min(46.159; 43.000) = 43.000, je WE 21.500.
    // selbst 21.500 x 0,80 = 17.200; vermietet 21.500 x 0,30 = 6.450. Summe 23.650 (= Vorbereitungsbericht
    // T1170 Fall S4 mit 56.000 Euro, dieselbe Bemessung). vorher (E1=A): 22.964.
    req: { we: '2', selbstWE: '1', einkommen: 'bis30', preis: '46159' },
    datum: '2026-08-01',
    satzSelbst: 80,
    satzVermietet: 30,
    preis: 46159,
    blatt: [
      { grenze: 28000, topf: 'selbst' },
      { grenze: 15000, topf: 'vermietet' },
    ],
    hand: { kfwSatz: 80, zuschussGesamt: 23650, eigenanteil: 22509, effektivSatz: 51, grenze: 43000, bemessungsBasis: 43000 },
  },
  {
    id: 'W-03',
    name: 'we=3 | Grenzen binden (Preis 90.000)',
    // HAND: Hoechstbetrag 58.000, Bemessung 58.000, je WE 19.333,33.. selbst x 0,80 = 15.466,67;
    // vermietet 2 x 19.333,33.. x 0,30 = 11.600. Summe 27.066,67. vorher (E1=A): 31.400.
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
    hand: { kfwSatz: 80, zuschussGesamt: 27066.67, eigenanteil: 62933.33, effektivSatz: 30, grenze: 58000, bemessungsBasis: 58000 },
  },
  {
    id: 'W-04',
    name: 'we=6 | letzte 15.000er-WE (Preis 240.000; Grenze 103.000 = XXL-Tafelwert)',
    // HAND: Hoechstbetrag 28.000 + 5 x 15.000 = 103.000, je WE 17.166,66.. selbst x 0,80 = 13.733,33;
    // vermietet 5 x 17.166,66.. x 0,30 = 25.750. Summe 39.483,33. vorher (E1=A): 44.900.
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
    hand: { kfwSatz: 80, zuschussGesamt: 39483.33, eigenanteil: 200516.67, effektivSatz: 16, grenze: 103000, bemessungsBasis: 103000 },
  },
  {
    id: 'W-05',
    name: 'we=7 | 8.000er-Grenze greift erstmals (Preis 280.000)',
    // HAND: Hoechstbetrag 103.000 + 8.000 = 111.000, je WE 15.857,14.. selbst x 0,80 = 12.685,71;
    // vermietet 6 x 15.857,14.. x 0,30 = 28.542,86. Summe 41.228,57. vorher (E1=A): 47.300.
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
    hand: { kfwSatz: 80, zuschussGesamt: 41228.57, eigenanteil: 238771.43, effektivSatz: 15, grenze: 111000, bemessungsBasis: 111000 },
  },
  {
    id: 'W-06',
    name: 'we=10 | Kosten unter dem Hoechstbetrag (Preis 100.000, Hoechstbetrag 135.000)',
    // HAND: Hoechstbetrag 28.000 + 75.000 + 4 x 8.000 = 135.000. Bemessung min(100.000; 135.000) = 100.000,
    // je WE 10.000. selbst 8.000; vermietet 9 x 10.000 x 0,30 = 27.000. Summe 35.000. vorher (E1=A): 32.600
    // (dort kappte die 8.000er-Grenze die Wohneinheiten 7 bis 10 einzeln; nach der Richtlinie zaehlt nur der
    // Hoechstbetrag des Gebaeudes).
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
    hand: { kfwSatz: 80, zuschussGesamt: 35000, eigenanteil: 65000, effektivSatz: 35, grenze: 135000, bemessungsBasis: 100000 },
  },
  {
    id: 'W-07',
    name: 'selbstWE=0 | nur vermietet, keine Boni (Preis 46.159, we=2)',
    // HAND: satz = Grundfoerderung 30 (Boni sind Selbstnutzer-gebunden). Bemessung 43.000 x 0,30 = 12.900. kfwSatz = 30.
    // vorher (E1=A): 11.424.
    req: { we: '2', selbstWE: '0', einkommen: 'bis30', preis: '46159' },
    datum: '2026-08-01',
    satzSelbst: 30,
    satzVermietet: 30,
    preis: 46159,
    blatt: [
      { grenze: 28000, topf: 'vermietet' },
      { grenze: 15000, topf: 'vermietet' },
    ],
    hand: { kfwSatz: 30, zuschussGesamt: 12900, eigenanteil: 33259, effektivSatz: 28, grenze: 43000, bemessungsBasis: 43000 },
  },
  {
    id: 'W-08',
    name: 'selbstWE=2 | zwei selbstgenutzte Wohneinheiten tragen je ihren Satz (we=3, Preis 60.000)',
    // HAND: Hoechstbetrag 58.000, Bemessung 58.000, je WE 19.333,33.. selbst 2 x 19.333,33.. x 0,80 = 30.933,33;
    // vermietet 19.333,33.. x 0,30 = 5.800. Summe 36.733,33. vorher (E1=A): 32.500.
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
    hand: { kfwSatz: 80, zuschussGesamt: 36733.33, eigenanteil: 23266.67, effektivSatz: 61, grenze: 58000, bemessungsBasis: 58000 },
  },
  {
    id: 'W-09',
    name: 'Preis klein | Kosten unter dem Hoechstbetrag (Preis 20.000, we=2)',
    // HAND: Bemessung 20.000, je WE 10.000. selbst 8.000; vermietet 3.000. Summe 11.000 (unveraendert zu E1=A:
    // unter dem Hoechstbetrag rechnen beide Wege gleich).
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
    // Der Alt-Zweig rechnet UNVERAENDERT (Regressions-Konserve, seit 21.07.2026 nicht mehr beantragbar),
    // deshalb hier ganze Euro und die historische Mittelung; die BLATT-Probe gilt fuer diesen Vektor nicht.
    req: { we: '2', selbstWE: '1', einkommen: 'unter40', preis: '29750' },
    datum: '2026-07-15',
    alt: true,
    hand: { kfwSatz: 70, zuschussGesamt: 15619, eigenanteil: 14131, effektivSatz: 53, grenze: 45000, bemessungsBasis: 29750 },
  },
  {
    id: 'W-11',
    name: 'NaN-Fall | nicht-numerischer Preis faellt deterministisch auf den Ersatzwert 34.510',
    // HAND: int_('abc') = NaN -> Fallback 34.510. Bemessung 34.510, je WE 17.255. selbst 13.804; vermietet
    // 17.255 x 0,30 = 5.176,50. Summe 18.980,50. KEIN NaN in irgendeinem Ausgabefeld. vorher (E1=A): 18.304.
    req: { we: '2', selbstWE: '1', einkommen: 'bis30', preis: 'abc' },
    datum: '2026-08-01',
    satzSelbst: 80,
    satzVermietet: 30,
    preis: 34510,
    blatt: [
      { grenze: 28000, topf: 'selbst' },
      { grenze: 15000, topf: 'vermietet' },
    ],
    hand: { kfwSatz: 80, zuschussGesamt: 18980.5, eigenanteil: 15529.5, effektivSatz: 55, grenze: 43000, bemessungsBasis: 34510 },
  },
  {
    id: 'W-12',
    name: 'KfW-Beispiel Produktseite 458 | we=2, 41.000, 46/30 -> 15.580',
    // HAND (KfW): Bemessung 41.000, je WE 20.500. selbst 20.500 x 0,46 = 9.430; vermietet 20.500 x 0,30 = 6.150.
    // Summe 15.580 (Produktseite 458, Vorbereitungsbericht T1170 Fall S3). vorher (E1=A): 13.930.
    req: { we: '2', selbstWE: '1', einkommen: 'ueber90', preis: '41000' },
    datum: '2026-10-09',
    satzSelbst: 46,
    satzVermietet: 30,
    preis: 41000,
    blatt: [
      { grenze: 28000, topf: 'selbst' },
      { grenze: 15000, topf: 'vermietet' },
    ],
    hand: { kfwSatz: 46, zuschussGesamt: 15580, eigenanteil: 25420, effektivSatz: 38, grenze: 43000, bemessungsBasis: 41000 },
  },
  {
    id: 'W-13',
    name: 'Betroffene Wohneinheiten (RL 8.3.1 Abs. 2) | we=3, weBetroffen=1, 30.000, 46 Prozent',
    // HAND: Hoechstbetrag 58.000, anteilig 58.000 / 3 x 1 = 19.333,33. Bemessung min(30.000; 19.333,33) = 19.333,33.
    // selbst 19.333,33 x 0,46 = 8.893,33 (Vorbereitungsbericht T1170 Fall S7). vorher (q23 ungenutzt): 10.600.
    req: { we: '3', weBetroffen: '1', selbstWE: '1', einkommen: 'ueber90', preis: '30000' },
    datum: '2026-10-09',
    satzSelbst: 46,
    satzVermietet: 30,
    preis: 30000,
    blatt: [
      { grenze: 28000, topf: 'selbst' },
      { grenze: 15000, topf: 'keine' },
      { grenze: 15000, topf: 'keine' },
    ],
    hand: { kfwSatz: 46, zuschussGesamt: 8893.33, eigenanteil: 21106.67, effektivSatz: 30, grenze: 19333.33, bemessungsBasis: 19333.33 },
  },
  {
    id: 'W-14',
    name: 'Obergrenze 70 (RL 8.4.1) | we=1, bis40 ohne Kind, 40.000 -> 19.600 statt 76 Prozent',
    // HAND: 30 + 16 + 30 = 76 -> Obergrenze 70 (anrechenbar 40.000 ueber 30.000). 28.000 x 0,70 = 19.600.
    // vorher: 76 Prozent, 21.280 (Vorbereitungsbericht T1170 Fall S1).
    req: { we: '1', selbstWE: '1', einkommen: 'bis40', preis: '40000' },
    datum: '2026-10-09',
    satzSelbst: 70,
    satzVermietet: 30,
    preis: 40000,
    blatt: [{ grenze: 28000, topf: 'selbst' }],
    hand: { kfwSatz: 70, zuschussGesamt: 19600, eigenanteil: 20400, effektivSatz: 49, grenze: 28000, bemessungsBasis: 28000 },
  },
  {
    id: 'W-15',
    name: 'Funktionstuechtigkeit (RL 8.4.4) | Gas 25 Jahre, funktionstuechtig=nein, 35.000 -> 8.400',
    // HAND: kein Klimabonus, 30 Prozent von 28.000 = 8.400 (Vorbereitungsbericht T1170 Fall S8). vorher: 12.880.
    req: { we: '1', selbstWE: '1', einkommen: 'ueber90', funktionstuechtig: 'nein', preis: '35000' },
    datum: '2026-10-09',
    satzSelbst: 30,
    satzVermietet: 30,
    preis: 35000,
    blatt: [{ grenze: 28000, topf: 'selbst' }],
    hand: { kfwSatz: 30, klimaBonus: false, zuschussGesamt: 8400, eigenanteil: 26600, effektivSatz: 24, grenze: 28000, bemessungsBasis: 28000 },
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
  if (!vec.alt) {
    const b = blatt(vec);
    // (1) Doppelte Herleitung in sich konsistent: BLATT reproduziert die HAND-Literale.
    pruefe(vec.id + 'a', vec.name + ' | BLATT == HAND', b, {
      zuschussGesamt: vec.hand.zuschussGesamt,
      bemessungsBasis: vec.hand.bemessungsBasis,
      grenze: vec.hand.grenze,
      eigenanteil: vec.hand.eigenanteil,
    });
  }
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
  // (5) Jeder Geldwert hat hoechstens zwei Nachkommastellen (Cent).
  const krumm = ['zuschussGesamt', 'eigenanteil', 'grenze', 'bemessungsBasis'].filter((k) => ist[k] !== cent(ist[k]));
  pruefe(vec.id + 'e', vec.name + ' | Geldwerte auf Cent', { krumm: krumm }, { krumm: [] });
});

// --- R-WE1 | Geschlossene Formel des we=1-Pfads: zuschuss = min(Grenze; Preis) x Satz auf Cent
//     (T1170; bis 08.10.2026 ganze Euro). Sweep ueber Preise beidseits der Grenze und alle Einkommensklassen.
{
  const abw = [];
  let n = 0;
  ['bis30', 'bis40', 'bis50', 'ueber50'].forEach((einkommen) => {
    ['20', '5'].forEach((alter) => {
      for (let preis = 5000; preis <= 90000; preis += 1234) {
        const ist = foerderCalc_(p({ we: '1', selbstWE: '1', einkommen: einkommen, heizungsalter: alter, preis: String(preis) }), F, d('2026-08-01'));
        const soll = cent(Math.min(28000, preis) * (ist.kfwSatz / 100));
        n++;
        if (ist.zuschussGesamt !== soll || ist.eigenanteil !== cent(preis - soll) || ist.grenze !== 28000 || ist.bemessungsBasis !== Math.min(28000, preis)) {
          abw.push(`${einkommen}/alter${alter}/${preis}: zuschuss=${ist.zuschussGesamt} soll=${soll}`);
        }
      }
    });
  });
  pruefe('R-WE1', `we=1 gleich der geschlossenen Formel auf Cent (${n} Faelle)`, { abweichungen: abw.length, faelle: n }, { abweichungen: 0, faelle: n });
}

// --- R-WE2 | Bemessung haengt nur vom Hoechstbetrag des Gebaeudes ab, nicht von einzelnen Grenzen:
//     bis zum Hoechstbetrag waechst der Zuschuss mit dem Preis, darueber bleibt er konstant (Vorbereitungsbericht
//     T1170 Fall S6: 50.000 mit Skonto 0 / 2 / 5 Prozent ergibt dreimal 16.340).
{
  const z = (preis) => foerderCalc_(p({ we: '2', selbstWE: '1', einkommen: 'ueber90', preis: String(preis) }), F, d('2026-10-09')).zuschussGesamt;
  pruefe('R-WE2', 'ueber dem Hoechstbetrag aendert ein Nachlass den Zuschuss nicht (50.000 / 49.000 / 47.500 -> 16.340)', { a: z(50000), b: z(49000), c: z(47500), d: z(43000), e: z(42000) }, { a: 16340, b: 16340, c: 16340, d: 16340, e: 15960 });
}

// --- Ausgabe
console.log('\nWE-STAFFEL | Hoechstbetrag des Gebaeudes zu gleichen Teilen (T1170, RL 17.08.2026) | Testlauf');
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
