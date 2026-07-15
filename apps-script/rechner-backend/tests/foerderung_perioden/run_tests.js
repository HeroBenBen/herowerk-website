/**
 * LANE-C Testlauf: Perioden-Automatik des Förderrechners (foerderCalc_).
 *
 * Start:  node apps-script/rechner-backend/tests/foerderung_perioden/run_tests.js
 * Kein Framework, kein npm-Dependency, kein Netz, kein Sheet.
 *
 * Methode:
 *  - Code.gs wird als TEXT geladen und in einem vm-Sandbox-Kontext evaluiert (nichts läuft beim Laden an).
 *  - Die Sheet-Helfer sind so gestubbt, dass JEDER Zugriff wirft. Damit ist jeder grüne Testfall
 *    zugleich der Beweis, dass foerderCalc_ ein reiner Kern ist (kein Sheet, kein Cache).
 *  - `heute` geht als Date in den Kern; der Kern ruft selbst nie new Date().
 *
 * Belege: Kanon 2026-07-15_Foerder-Regelwerk-Kanon_BEG-Reform_HERO.md (Abschnitt 1 Reform, 2 Alt,
 * 3.1 Degressionstabelle, 5 Eigenanteile) + Orakel WP_Rechner_HeroWerk.html (Script-SHA 55344fe56a7043ff…).
 * Jede Erwartung ist im Fall-Kommentar von Hand vorgerechnet. Delta muss exakt 0 sein.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const CODE_PATH = path.join(__dirname, '..', '..', 'Code.gs');
const src = fs.readFileSync(CODE_PATH, 'utf8');

// --- Sandbox: alles, was den reinen Kern verunreinigen würde, wirft.
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
vm.runInContext(src, sandbox, { filename: 'Code.gs' });

const { foerderCalc_, periodeFuer_, einkommenNorm_, foerderFaehigeKostenGesamt_, FOERDER_ROWS_, getNum_, int_ } = sandbox;

// --- Förder-Parameter exakt so, wie setupSheets sie ins Sheet schreibt (Schlüssel -> Wert).
const F = {};
FOERDER_ROWS_().forEach((r) => {
  F[r[0]] = r[1];
});

const d = (s) => {
  const [y, m, day] = s.split('-').map(Number);
  return new Date(y, m - 1, day);
};

/**
 * VERBATIM-Kopie der Förder-Rechnung von origin/main 95c0e91 (Code.gs Z.157-196), nur der
 * Preis-Lookup ist durch den Parameter `preis` ersetzt. Referenz für die Regressionsfälle:
 * beweist, dass die Alt-Periode Feld für Feld die HEUTIGE Logik reproduziert.
 */
function altReferenz_(p, f, preis) {
  const we = int_(p.we, 1);
  const selbstWE = int_(p.selbstWE, 1);
  const heizung = String(p.heizung || 'gas');
  const einkommen = String(p.einkommen || 'ueber40');
  const gemeinde = String(p.gemeinde || '').toLowerCase();
  let satzSelbst = getNum_(f, 'grundfoerderung_pct', 30);
  let klimaBonus = false;
  if (heizung === 'oel' || heizung === 'nachtspeicher' || heizung === 'gas-etage') klimaBonus = true;
  else if (heizung === 'gas') klimaBonus = int_(p.heizungsalter, 20) >= getNum_(f, 'gas_klimabonus_min_alter', 20);
  if (selbstWE > 0 && klimaBonus) satzSelbst += getNum_(f, 'klimabonus_pct', 20);
  if (selbstWE > 0 && einkommen === 'unter40') satzSelbst += getNum_(f, 'einkommensbonus_pct', 30);
  satzSelbst += getNum_(f, 'effizienzbonus_pct', 5);
  satzSelbst = Math.min(satzSelbst, getNum_(f, 'deckel_selbst_pct', 70));
  const satzVermietet = Math.min(getNum_(f, 'deckel_vermietet_pct', 35), getNum_(f, 'grundfoerderung_pct', 30) + getNum_(f, 'effizienzbonus_pct', 5));
  const foerderFaehigGesamt = foerderFaehigeKostenGesamt_(we, f);
  const foerderProWE = foerderFaehigGesamt / we;
  const kostenProWE = Math.min(foerderProWE, preis / we);
  const vermieteteWE = we - selbstWE;
  const zuschussSelbst = selbstWE > 0 ? Math.round(kostenProWE * (satzSelbst / 100)) : 0;
  const zuschussVermietet = vermieteteWE > 0 ? Math.round(kostenProWE * (satzVermietet / 100) * vermieteteWE) : 0;
  const zuschussGesamt = zuschussSelbst + zuschussVermietet;
  const proGemeinden = String(f.proklima_gemeinden || '').split(',').map((x) => x.trim());
  const proklimaZuschuss =
    proGemeinden.indexOf(gemeinde) >= 0 && String(p.proklimaOptin) === 'ja'
      ? Math.min(Math.round((foerderFaehigGesamt * getNum_(f, 'proklima_pct', 5)) / 100), getNum_(f, 'proklima_max_eur', 1500))
      : 0;
  const eigenanteil = Math.max(0, preis - zuschussGesamt - proklimaZuschuss);
  const kfwSatz = selbstWE > 0 ? satzSelbst : satzVermietet;
  const effektivSatz = preis > 0 ? Math.round(((zuschussGesamt + proklimaZuschuss) / preis) * 100) : 0;
  const bausteine = ['Grundförderung 30%', 'Effizienzbonus (R290) +5%'];
  if (selbstWE > 0 && klimaBonus) bausteine.splice(1, 0, 'Klimageschwindigkeitsbonus +20%');
  if (selbstWE > 0 && einkommen === 'unter40') bausteine.splice(1, 0, 'Einkommensbonus +30%');
  if (proklimaZuschuss > 0) bausteine.push('proKlima Zuschuss ' + proklimaZuschuss + ' €');
  return { kfwSatz, zuschussGesamt, proklimaZuschuss, eigenanteil, effektivSatz, preis, klimaBonus, bausteine };
}

// --- Mini-Harness
let pass = 0;
const fails = [];
const zeilen = [];

function pruefe(id, beschreibung, ist, soll) {
  const felder = Object.keys(soll);
  const abweichungen = [];
  felder.forEach((k) => {
    const a = JSON.stringify(ist[k]);
    const b = JSON.stringify(soll[k]);
    if (a !== b) abweichungen.push(`${k}: ist=${a} soll=${b}`);
  });
  if (abweichungen.length === 0) {
    pass++;
    zeilen.push([id, beschreibung, 'PASS', '0'].join(' | '));
  } else {
    fails.push(`${id} (${beschreibung})\n    ` + abweichungen.join('\n    '));
    zeilen.push([id, beschreibung, 'FAIL', abweichungen.length + ' Feld(er)'].join(' | '));
  }
}

const BASIS = { we: '1', selbstWE: '1', heizung: 'gas', heizungsalter: '20', gemeinde: 'wedemark', proklimaOptin: 'nein' };
const p = (o) => Object.assign({}, BASIS, o);

// =====================================================================================
// ALT-PERIODE (Kanon 2), Anträge bis 20.07.2026
// =====================================================================================

// C-01 | Alt, Selbstnutzer, Gas 20 J. (Klimabonus), Einkommen bis 40k, ohne proKlima, Wolf M 34.510 €.
// Rechenweg: 30 Grund + 20 Klima + 30 Einkommen + 5 Effizienz = 85 -> Deckel 70.
// ffk = 30.000 (1 WE). Basis = min(30.000; 34.510) = 30.000. Zuschuss = round(30.000 × 0,70) = 21.000.
// Eigenanteil = 34.510 - 21.000 = 13.510 (= Kanon E-12 Alt-Eigenanteil "Standard" 13.510 ✓).
// effektiv = round(21.000 / 34.510 × 100) = round(60,85) = 61.
pruefe('C-01', 'Alt | 70 % Maximalfall | ohne proKlima', foerderCalc_(p({ einkommen: 'bis40', preis: 34510 }), F, d('2026-07-15')), {
  periode: 'alt',
  periodeLabel: 'Anträge bis 20.07.2026',
  kfwSatz: 70,
  zuschussGesamt: 21000,
  proklimaZuschuss: 0,
  eigenanteil: 13510,
  effektivSatz: 61,
  grenze: 30000,
  einkommensbonusPct: 30,
  proklimaGekappt: false,
  hinweis: '',
  bausteine: ['Grundförderung 30%', 'Einkommensbonus +30%', 'Klimageschwindigkeitsbonus +20%', 'Effizienzbonus (R290) +5%'],
});

// C-02 | Alt, Einkommen über 50k -> kein Einkommensbonus.
// Rechenweg: 30 + 20 + 0 + 5 = 55 (unter Deckel 70). Zuschuss = round(30.000 × 0,55) = 16.500.
// Eigenanteil = 34.510 - 16.500 = 18.010. effektiv = round(16.500/34.510×100) = round(47,81) = 48.
pruefe('C-02', 'Alt | ohne Einkommensbonus', foerderCalc_(p({ einkommen: 'ueber50', preis: 34510 }), F, d('2026-07-15')), {
  periode: 'alt',
  kfwSatz: 55,
  zuschussGesamt: 16500,
  eigenanteil: 18010,
  effektivSatz: 48,
  einkommensbonusPct: 0,
  bausteine: ['Grundförderung 30%', 'Klimageschwindigkeitsbonus +20%', 'Effizienzbonus (R290) +5%'],
});

// C-03 | Alt, kein Klimabonus (Heizung "sonstige"), Einkommen bis 40k.
// Rechenweg: 30 + 0 + 30 + 5 = 65 (unter Deckel 70). Zuschuss = round(30.000 × 0,65) = 19.500.
// Eigenanteil = 34.510 - 19.500 = 15.010. effektiv = round(19.500/34.510×100) = round(56,51) = 57.
pruefe('C-03', 'Alt | ohne Klimabonus', foerderCalc_(p({ heizung: 'sonstige', einkommen: 'bis40', preis: 34510 }), F, d('2026-07-15')), {
  periode: 'alt',
  kfwSatz: 65,
  zuschussGesamt: 19500,
  eigenanteil: 15010,
  effektivSatz: 57,
  klimaBonus: false,
  bausteine: ['Grundförderung 30%', 'Einkommensbonus +30%', 'Effizienzbonus (R290) +5%'],
});

// C-04 | Alt, Stichtags-Grenze: 20.07.2026 ist noch ALT (letzter Alt-Tag laut Briefing §5).
pruefe('C-04', 'Alt | Stichtag 20.07.2026 = letzter Alt-Tag', foerderCalc_(p({ einkommen: 'bis40', preis: 34510 }), F, d('2026-07-20')), {
  periode: 'alt',
  kfwSatz: 70,
  zuschussGesamt: 21000,
});

// =====================================================================================
// REFORM (Kanon 1), Anträge ab 21.07.2026
// =====================================================================================

// C-05 | Reform h2-2026, Stichtag 21.07.2026 = erster Reform-Tag. Maximalfall.
// Rechenweg: Grund 30 + Klima 16 + Einkommen 40 (bis30, ohne Kind: anr = 30.000 -> 40 %) = 86 -> Deckel 80.
// Grenze 28.000. Basis = min(28.000; 34.510) = 28.000. Zuschuss = round(28.000 × 0,80) = 22.400
// (= Kanon 1.2 "Maximalzuschuss h2-2026 = 22.400" ✓ und Kanon 3.1 Zeile 1 ✓).
// Eigenanteil = 34.510 - 22.400 = 12.110 (= Kanon 5 "Standard, Eigenanteil neu 12.110" ✓).
// effektiv = round(22.400/34.510×100) = round(64,91) = 65.
pruefe('C-05', 'Reform h2-2026 | 80 % Maximalfall | Stichtag 21.07.', foerderCalc_(p({ einkommen: 'bis30', preis: 34510 }), F, d('2026-07-21')), {
  periode: 'h2-2026',
  periodeLabel: '21.07.2026 bis 31.01.2027',
  kfwSatz: 80,
  zuschussGesamt: 22400,
  proklimaZuschuss: 0,
  eigenanteil: 12110,
  effektivSatz: 65,
  grenze: 28000,
  einkommensbonusPct: 40,
  hinweis: '',
  bausteine: ['Grundförderung 30%', 'Einkommensbonus +40%', 'Klimageschwindigkeitsbonus +16%'],
});

// C-06 | Reform h2-2026, Kinder-Abzug hebt eine Klasse: Einkommen bis 40k + mind. ein minderjähriges Kind.
// Rechenweg: anrechenbar = 40.000 - 10.000 = 30.000 -> 40 % (statt 30 % ohne Kind).
// 30 + 16 + 40 = 86 -> 80. Zuschuss = round(28.000 × 0,80) = 22.400. Eigenanteil = 12.110.
pruefe('C-06', 'Reform h2-2026 | Kinderabzug 10k hebt Bonus 30->40', foerderCalc_(p({ einkommen: 'bis40', kind: 'ja', preis: 34510 }), F, d('2026-09-01')), {
  periode: 'h2-2026',
  kfwSatz: 80,
  zuschussGesamt: 22400,
  eigenanteil: 12110,
  einkommensbonusPct: 40,
});

// C-06b | Gegenprobe ohne Kind: gleiche Eingabe, Bonus bleibt 30.
// Rechenweg: anr = 40.000 -> 30 %. 30 + 16 + 30 = 76 (unter Deckel 80).
// Zuschuss = round(28.000 × 0,76) = 21.280. Eigenanteil = 34.510 - 21.280 = 13.230.
// effektiv = round(21.280/34.510×100) = round(61,66) = 62.
pruefe('C-06b', 'Reform h2-2026 | Gegenprobe ohne Kind', foerderCalc_(p({ einkommen: 'bis40', preis: 34510 }), F, d('2026-09-01')), {
  kfwSatz: 76,
  zuschussGesamt: 21280,
  eigenanteil: 13230,
  effektivSatz: 62,
  einkommensbonusPct: 30,
});

// C-07 | Reform h2-2026, Einkommen bis 50k -> 10 %.
// Rechenweg: 30 + 16 + 10 = 56. Zuschuss = round(28.000 × 0,56) = 15.680.
// Eigenanteil = 34.510 - 15.680 = 18.830. effektiv = round(15.680/34.510×100) = round(45,44) = 45.
pruefe('C-07', 'Reform h2-2026 | Einkommensstufe bis 50k = 10 %', foerderCalc_(p({ einkommen: 'bis50', preis: 34510 }), F, d('2026-08-01')), {
  kfwSatz: 56,
  zuschussGesamt: 15680,
  eigenanteil: 18830,
  effektivSatz: 45,
  einkommensbonusPct: 10,
});

// C-08 | Reform h2-2026, Einkommen über 50k -> 0 %.
// Rechenweg: 30 + 16 + 0 = 46. Zuschuss = round(28.000 × 0,46) = 12.880.
// Eigenanteil = 34.510 - 12.880 = 21.630. effektiv = round(12.880/34.510×100) = round(37,32) = 37.
pruefe('C-08', 'Reform h2-2026 | Einkommen über 50k = kein Bonus', foerderCalc_(p({ einkommen: 'ueber50', preis: 34510 }), F, d('2026-08-01')), {
  kfwSatz: 46,
  zuschussGesamt: 12880,
  eigenanteil: 21630,
  effektivSatz: 37,
  einkommensbonusPct: 0,
  bausteine: ['Grundförderung 30%', 'Klimageschwindigkeitsbonus +16%'],
});

// C-09 | Reform h2-2026, kein Klimabonus (Heizung "sonstige"), Einkommen bis 30k.
// Rechenweg: 30 + 0 + 40 = 70. Zuschuss = round(28.000 × 0,70) = 19.600.
// Eigenanteil = 34.510 - 19.600 = 14.910. effektiv = round(19.600/34.510×100) = round(56,79) = 57.
pruefe('C-09', 'Reform h2-2026 | ohne Klimabonus', foerderCalc_(p({ heizung: 'sonstige', einkommen: 'bis30', preis: 34510 }), F, d('2026-08-01')), {
  kfwSatz: 70,
  zuschussGesamt: 19600,
  eigenanteil: 14910,
  effektivSatz: 57,
  klimaBonus: false,
  bausteine: ['Grundförderung 30%', 'Einkommensbonus +40%'],
});

// C-10 | Reform h1-2027 MIT EU-Gerät (Stichtag 01.02.2027), Einkommen bis 40k, proKlima-Frist abgelaufen.
// Rechenweg: eu:true + euOk -> Grund 30. Klima 12. Einkommen 30. Summe 72 (unter Deckel 80).
// Grenze 27.250. Zuschuss = round(27.250 × 0,72) = 19.620. Eigenanteil = 34.510 - 19.620 = 14.890.
// effektiv = round(19.620/34.510×100) = round(56,85) = 57.
// proKlima: 01.02.2027 > 31.10.2026 -> 0 + Frist-Hinweis (Kanon 1.3 / E-11).
pruefe(
  'C-10',
  'Reform h1-2027 | EU-Gerät | proKlima-Frist abgelaufen',
  foerderCalc_(p({ einkommen: 'bis40', gemeinde: 'hannover', proklimaOptin: 'ja', preis: 34510 }), F, d('2027-02-01')),
  {
    periode: 'h1-2027',
    periodeLabel: '01.02. bis 31.07.2027',
    kfwSatz: 72,
    zuschussGesamt: 19620,
    proklimaZuschuss: 0,
    eigenanteil: 14890,
    effektivSatz: 57,
    grenze: 27250,
    proklimaGekappt: false,
    hinweis: 'Die proKlima-Förderung gilt nur für Anträge bis zum 31.10.2026 und ist deshalb nicht eingerechnet.',
  }
);

// C-11 | Reform h1-2027 OHNE EU-Wertschöpfung -> Grundförderung 15 % (Kanon E-13 / Orakel Z.106).
// Rechenweg: 15 + 12 + 40 = 67. Zuschuss = round(27.250 × 0,67) = round(18.257,5) = 18.258.
// Eigenanteil = 34.510 - 18.258 = 16.252. effektiv = round(18.258/34.510×100) = round(52,91) = 53.
pruefe('C-11', 'Reform h1-2027 | Nicht-EU-Gerät = Grund 15 %', foerderCalc_(p({ einkommen: 'bis30', eu: 'nein', preis: 34510 }), F, d('2027-03-15')), {
  periode: 'h1-2027',
  kfwSatz: 67,
  zuschussGesamt: 18258,
  eigenanteil: 16252,
  effektivSatz: 53,
  bausteine: ['Grundförderung 15%', 'Einkommensbonus +40%', 'Klimageschwindigkeitsbonus +12%'],
});

// C-12 | Reform h2-2028: Klimabonus entfällt (0 %), Grenze 25.000 (Kanon 3.1 Zeile 5).
// Rechenweg: 30 + 0 + 40 = 70. Zuschuss = round(25.000 × 0,70) = 17.500 (= Kanon 3.1 "17.500" ✓).
// Eigenanteil = 34.510 - 17.500 = 17.010. effektiv = round(17.500/34.510×100) = round(50,71) = 51.
// Klimabonus-Voraussetzung ist erfüllt (Gas 20 J.), der Prozentsatz ist aber 0 -> kein Baustein.
pruefe('C-12', 'Reform h2-2028 | Klimabonus entfallen | Grenze 25.000', foerderCalc_(p({ einkommen: 'bis30', preis: 34510 }), F, d('2028-08-01')), {
  periode: 'h2-2028',
  periodeLabel: '01.08.2028 bis 31.01.2029',
  kfwSatz: 70,
  zuschussGesamt: 17500,
  eigenanteil: 17010,
  effektivSatz: 51,
  grenze: 25000,
  klimaBonus: true,
  bausteine: ['Grundförderung 30%', 'Einkommensbonus +40%'],
});

// C-13 | Reform h2-2026 + proKlima, Kumulierung GREIFT NICHT (Komfort-Paket 45.220 €).
// Rechenweg: Zuschuss = round(min(28.000; 45.220) × 0,80) = 22.400.
// proKlima = min(round(0,05 × 45.220); 1.500) = min(2.261; 1.500) = 1.500.
// Kumulierungsdeckel = 0,60 × 45.220 = 27.132. 22.400 + 1.500 = 23.900 <= 27.132 -> voll wirksam.
// Eigenanteil = 45.220 - 22.400 - 1.500 = 21.320 (= Kanon 5 "Komfort, proKlima-Eigenanteil 21.320" ✓).
// effektiv = round(23.900/45.220×100) = round(52,85) = 53.
pruefe(
  'C-13',
  'Reform h2-2026 | proKlima voll wirksam (Komfort 45.220)',
  foerderCalc_(p({ einkommen: 'bis30', gemeinde: 'hannover', proklimaOptin: 'ja', preis: 45220 }), F, d('2026-08-15')),
  {
    zuschussGesamt: 22400,
    proklimaZuschuss: 1500,
    proklimaGekappt: false,
    eigenanteil: 21320,
    effektivSatz: 53,
    hinweis: '',
    bausteine: ['Grundförderung 30%', 'Einkommensbonus +40%', 'Klimageschwindigkeitsbonus +16%', 'proKlima Zuschuss 1500 €'],
  }
);

// C-14 | Reform h2-2026 + proKlima, Kumulierung KAPPT (Standard-Paket 34.510 €).
// Rechenweg: Zuschuss = 22.400. proKlima roh = min(round(0,05 × 34.510) = 1.726; 1.500) = 1.500.
// Deckel = 0,60 × 34.510 = 20.706. totalFoerd = max(22.400; min(23.900; 20.706)) = max(22.400; 20.706) = 22.400.
// -> proKlima real = 22.400 - 22.400 = 0, gekappt = true (Kanon 1.3 + Kanon 5 "proKlima bringt im
// Maximalfall nichts zusätzlich"). Eigenanteil = 34.510 - 22.400 = 12.110 (= Kanon 5 ✓, identisch zur
// Variante ohne proKlima). effektiv = round(22.400/34.510×100) = 65.
pruefe(
  'C-14',
  'Reform h2-2026 | proKlima am 60-%-Deckel gekappt',
  foerderCalc_(p({ einkommen: 'bis30', gemeinde: 'hannover', proklimaOptin: 'ja', preis: 34510 }), F, d('2026-08-15')),
  {
    zuschussGesamt: 22400,
    proklimaZuschuss: 0,
    proklimaGekappt: true,
    eigenanteil: 12110,
    effektivSatz: 65,
    hinweis: 'KfW-Zuschuss und proKlima zusammen sind auf 60 Prozent derselben Kosten begrenzt. Der KfW-Zuschuss allein darf darüber liegen.',
  }
);

// C-15 | Reform h2-2026, vermietete Wohneinheit -> NUR Grundförderung (Kanon A1, E-09).
// Rechenweg: selbstWE = 0 -> satzVermietet = Grund 30 (kein Klima-, kein Einkommensbonus, kein 35er-Deckel).
// Zuschuss = round(28.000 × 0,30 × 1) = 8.400. Eigenanteil = 34.510 - 8.400 = 26.110.
// effektiv = round(8.400/34.510×100) = round(24,34) = 24.
pruefe('C-15', 'Reform h2-2026 | vermietet = nur Grundförderung 30 %', foerderCalc_(p({ selbstWE: '0', einkommen: 'bis30', preis: 34510 }), F, d('2026-08-01')), {
  kfwSatz: 30,
  zuschussGesamt: 8400,
  eigenanteil: 26110,
  effektivSatz: 24,
  einkommensbonusPct: 0,
  bausteine: ['Grundförderung 30%'],
});

// C-16 | Reform h2-2026, 2 WE (1 selbst + 1 vermietet): Grenze der ERSTEN WE, keine erfundene Staffel (Kanon A2).
// Rechenweg: ffk gesamt = 28.000 (Grenze 1. WE). ffk/WE = 14.000. Basis/WE = min(14.000; 34.510/2 = 17.255) = 14.000.
// selbst: 30 + 16 + 40 = 86 -> 80 -> round(14.000 × 0,80) = 11.200.
// vermietet: 30 -> round(14.000 × 0,30 × 1) = 4.200. Summe = 15.400.
// Eigenanteil = 34.510 - 15.400 = 19.110. effektiv = round(15.400/34.510×100) = round(44,62) = 45.
// Pflicht: Hinweis auf die projektgenaue Rechnung (E-08).
pruefe('C-16', 'Reform h2-2026 | 2 WE | Grenze 1. WE + Mehr-WE-Hinweis', foerderCalc_(p({ we: '2', selbstWE: '1', einkommen: 'bis30', preis: 34510 }), F, d('2026-08-01')), {
  kfwSatz: 80,
  zuschussGesamt: 15400,
  eigenanteil: 19110,
  effektivSatz: 45,
  grenze: 28000,
  hinweis: 'Bei mehreren Wohneinheiten gelten gestaffelte Grenzen je Wohneinheit. Wir rechnen dein Projekt genau durch.',
});

// C-17 | Horizont: Antrag nach dem 31.07.2029. Kanon A3 verbietet die Fortschreibung der Degression ->
// Kern klemmt auf die letzte belegte Periode h1-2029 (Klima 0, Grenze 24.250) und setzt den Hinweis.
// Rechenweg: 30 + 0 + 40 = 70. Zuschuss = round(24.250 × 0,70) = 16.975 (= Kanon 3.1 letzte Zeile ✓).
// Eigenanteil = 34.510 - 16.975 = 17.535.
pruefe('C-17', 'Horizont > h1-2029 | klemmt auf h1-2029 + Hinweis', foerderCalc_(p({ einkommen: 'bis30', preis: 34510 }), F, d('2029-08-01')), {
  periode: 'h1-2029',
  grenze: 24250,
  zuschussGesamt: 16975,
  eigenanteil: 17535,
  hinweis: 'Für Anträge nach dem 31.07.2029 stehen die Fördersätze noch nicht fest. Wir rechnen dein Projekt genau durch.',
});

// =====================================================================================
// REGRESSION gegen die HEUTIGE Logik (origin/main 95c0e91), Alt-Periode
// =====================================================================================

// C-R1 | Alt + Alt-Request-Wert 'unter40' == verbatim-Referenz der heutigen Logik.
// Beweist zugleich das Enum-Mapping unter40 -> bis40 (Auftrag C1.3).
{
  const req = p({ einkommen: 'unter40', preis: 34510 });
  const ist = foerderCalc_(req, F, d('2026-07-15'));
  const soll = altReferenz_(req, F, 34510);
  pruefe('C-R1', 'Regression Alt | einkommen=unter40 == heutige Logik', ist, soll);
}

// C-R2 | Alt + Alt-Request-Wert 'ueber40' == verbatim-Referenz der heutigen Logik.
// Beweist das Mapping ueber40 -> ueber50.
{
  const req = p({ einkommen: 'ueber40', preis: 34510 });
  const ist = foerderCalc_(req, F, d('2026-07-15'));
  const soll = altReferenz_(req, F, 34510);
  pruefe('C-R2', 'Regression Alt | einkommen=ueber40 == heutige Logik', ist, soll);
}

// C-R3 | Regression über die volle Alt-Matrix (Heizungen × Einkommen × WE × Selbstnutzung),
// proKlima-frei: dort MUSS die Alt-Periode Feld für Feld die heutige Logik reproduzieren.
{
  let n = 0;
  const abw = [];
  ['gas', 'oel', 'nachtspeicher', 'gas-etage', 'sonstige'].forEach((heizung) => {
    ['unter40', 'ueber40', 'keine'].forEach((einkommen) => {
      ['1', '2', '6', '7', '10'].forEach((we) => {
        ['0', '1'].forEach((selbstWE) => {
          [29750, 34510, 45220, 82223].forEach((preis) => {
            const req = p({ heizung, einkommen, we, selbstWE, preis });
            const ist = foerderCalc_(req, F, d('2026-07-15'));
            const soll = altReferenz_(req, F, preis);
            n++;
            Object.keys(soll).forEach((k) => {
              if (JSON.stringify(ist[k]) !== JSON.stringify(soll[k])) {
                abw.push(`${heizung}/${einkommen}/we${we}/selbst${selbstWE}/${preis} ${k}: ist=${JSON.stringify(ist[k])} soll=${JSON.stringify(soll[k])}`);
              }
            });
          });
        });
      });
    });
  });
  pruefe('C-R3', `Regression Alt | volle Matrix (${n} Kombinationen, proKlima-frei)`, { abweichungen: abw.length, faelle: n }, { abweichungen: 0, faelle: n });
}

// C-R4 | BEWUSSTE ABWEICHUNG (BLOCKED-2, Protokoll LANE-C.md): Alt + proKlima.
// Die 60-%-Kumulierungsregel (BEG-EM Nr. 8.6, BAnz AT 29.12.2023 B1 -> galt bereits VOR der Reform)
// fehlt in der heutigen Logik. Heute: 21.000 + 1.500 = 22.500, Eigenanteil 12.010 (= Kanon E-12 Alt-Wert).
// Neu: Deckel 0,60 × 34.510 = 20.706 < 21.000 -> proKlima 0, Eigenanteil 13.510.
// Dieser Test hält die Abweichung fest, damit sie nicht unbemerkt bleibt. Controller-Entscheid.
{
  const req = p({ einkommen: 'unter40', gemeinde: 'hannover', proklimaOptin: 'ja', preis: 34510 });
  const ist = foerderCalc_(req, F, d('2026-07-15'));
  const heute = altReferenz_(req, F, 34510);
  pruefe('C-R4', 'Alt + proKlima | dokumentierte Abweichung zur heutigen Logik', {
    neu_proklima: ist.proklimaZuschuss,
    neu_eigenanteil: ist.eigenanteil,
    neu_gekappt: ist.proklimaGekappt,
    heute_proklima: heute.proklimaZuschuss,
    heute_eigenanteil: heute.eigenanteil,
    delta_eigenanteil: ist.eigenanteil - heute.eigenanteil,
  }, {
    neu_proklima: 0,
    neu_eigenanteil: 13510,
    neu_gekappt: true,
    heute_proklima: 1500,
    heute_eigenanteil: 12010,
    delta_eigenanteil: 1500,
  });
}

// =====================================================================================
// STRUKTUR-/VERTRAGS-TESTS
// =====================================================================================

// C-18 | Code-Defaults == Sheet-Werte: der Kern rechnet auch ohne die neuen Sheet-Zeilen korrekt
// (Auftrag C1.2). Vergleich: leeres Parameter-Objekt (nur Gemeinden-CSV) gegen die vollen FOERDER_ROWS_.
{
  const nurGemeinden = { proklima_gemeinden: F.proklima_gemeinden };
  const abw = [];
  [d('2026-07-15'), d('2026-08-01'), d('2027-02-01'), d('2028-08-01')].forEach((tag) => {
    ['bis30', 'bis40', 'bis50', 'ueber50'].forEach((einkommen) => {
      const req = p({ einkommen, gemeinde: 'hannover', proklimaOptin: 'ja', preis: 34510 });
      const a = JSON.stringify(foerderCalc_(req, nurGemeinden, tag));
      const b = JSON.stringify(foerderCalc_(req, F, tag));
      if (a !== b) abw.push(`${tag.toISOString().slice(0, 10)}/${einkommen}`);
    });
  });
  pruefe('C-18', 'Code-Defaults == Förder_Parameter-Zeilen (Kanon-Werte)', { abweichungen: abw }, { abweichungen: [] });
}

// C-19 | Perioden-Grenzen exakt (Kanon 1.1 / Orakel FOERDER_HJ Z.95-102).
{
  const ist = {
    '2026-07-20': periodeFuer_(d('2026-07-20')).id,
    '2026-07-21': periodeFuer_(d('2026-07-21')).id,
    '2027-01-31': periodeFuer_(d('2027-01-31')).id,
    '2027-02-01': periodeFuer_(d('2027-02-01')).id,
    '2027-07-31': periodeFuer_(d('2027-07-31')).id,
    '2027-08-01': periodeFuer_(d('2027-08-01')).id,
    '2028-01-31': periodeFuer_(d('2028-01-31')).id,
    '2028-02-01': periodeFuer_(d('2028-02-01')).id,
    '2028-07-31': periodeFuer_(d('2028-07-31')).id,
    '2028-08-01': periodeFuer_(d('2028-08-01')).id,
    '2029-01-31': periodeFuer_(d('2029-01-31')).id,
    '2029-02-01': periodeFuer_(d('2029-02-01')).id,
    '2029-07-31': periodeFuer_(d('2029-07-31')).id,
    '2029-08-01': periodeFuer_(d('2029-08-01')).id + (periodeFuer_(d('2029-08-01')).ueberHorizont ? '+horizont' : ''),
  };
  pruefe('C-19', 'Perioden-Stichtage 1:1 aus FOERDER_HJ', ist, {
    '2026-07-20': 'alt',
    '2026-07-21': 'h2-2026',
    '2027-01-31': 'h2-2026',
    '2027-02-01': 'h1-2027',
    '2027-07-31': 'h1-2027',
    '2027-08-01': 'h2-2027',
    '2028-01-31': 'h2-2027',
    '2028-02-01': 'h1-2028',
    '2028-07-31': 'h1-2028',
    '2028-08-01': 'h2-2028',
    '2029-01-31': 'h2-2028',
    '2029-02-01': 'h1-2029',
    '2029-07-31': 'h1-2029',
    '2029-08-01': 'h1-2029+horizont',
  });
}

// C-20 | Rückwärtskompatibilität des Enum-Mappings (Auftrag C1.3).
pruefe(
  'C-20',
  'Enum-Mapping unter40->bis40, ueber40->ueber50',
  {
    unter40: einkommenNorm_('unter40'),
    ueber40: einkommenNorm_('ueber40'),
    bis30: einkommenNorm_('bis30'),
    bis40: einkommenNorm_('bis40'),
    bis50: einkommenNorm_('bis50'),
    ueber50: einkommenNorm_('ueber50'),
    keine: einkommenNorm_('keine'),
    leer: einkommenNorm_(''),
  },
  { unter40: 'bis40', ueber40: 'ueber50', bis30: 'bis30', bis40: 'bis40', bis50: 'bis50', ueber50: 'ueber50', keine: 'unbekannt', leer: 'unbekannt' }
);

// C-21 | Response-Vertrag: Bestandsfelder vorhanden, neue Felder additiv, KEINE unerwarteten Felder.
{
  const out = foerderCalc_(p({ einkommen: 'bis30', preis: 34510 }), F, d('2026-08-01'));
  const bestand = ['kfwSatz', 'zuschussGesamt', 'proklimaZuschuss', 'eigenanteil', 'effektivSatz', 'preis', 'klimaBonus', 'bausteine'];
  const neu = ['periode', 'periodeLabel', 'grenze', 'einkommensbonusPct', 'hinweis', 'proklimaGekappt'];
  const keys = Object.keys(out).sort();
  pruefe('C-21', 'Response-Vertrag: Bestand + additive Felder, nichts sonst', {
    fehlendeBestandsfelder: bestand.filter((k) => !(k in out)),
    fehlendeNeuFelder: neu.filter((k) => !(k in out)),
    unerwartet: keys.filter((k) => bestand.indexOf(k) < 0 && neu.indexOf(k) < 0),
  }, { fehlendeBestandsfelder: [], fehlendeNeuFelder: [], unerwartet: [] });
}

// --- Ausgabe
console.log('\nLANE-C | Förderung Perioden-Automatik | Testlauf');
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
console.log(`\nERGEBNIS: ${pass}/${pass} PASS, Delta exakt 0.`);
