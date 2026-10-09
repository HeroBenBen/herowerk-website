/**
 * Doppellauf der Foerderrechnung nach T1170 (Richtlinie BEG EM vom 17.08.2026, BAnz AT 27.08.2026 B1).
 *
 * WOZU. Der Foerderkern lebt dreimal: PHP-Engine (api/rechner-engine.php, hw_foerder_calc), Apps-Script-
 * Rueckfall dieses Verzeichnisses (apps-script/rechner-backend/Code.gs, foerderCalc_) und der Konfigurator
 * des Aussendienstes (herowerk-konfigurator/Code.js, derselbe Kern mit zusaetzlichen Ausgabefeldern).
 * Der Doppellauf gegen die Google-Auslieferung (scripts/compare-rechner-php.mjs) kann eine Aenderung erst
 * nach dem Deploy pruefen. Dieser Test prueft sie VORHER, ohne Netz: dieselben Blattzeilen aus der Saat,
 * dieselben Anfragen, zeichengleiche Antworten.
 *
 * WAS. (1) Solltabelle S1 bis S12 der Steuerung (Bauauftrag T1170 Abschnitt 4) gegen die PHP-Engine.
 *      (2) PHP gegen Apps-Script-Rueckfall: JSON-Text der Foerderroute zeichengleich, 167 Faelle des
 *          Doppellaufs plus Faelle mit betroffenen Wohneinheiten und Funktionstuechtigkeit.
 *      (3) PHP gegen den Konfigurator-Kern (--konfigurator <Code.js>): dieselben Faelle, verglichen auf den
 *          Feldern der Website-Antwort; die Zusatzfelder des Konfigurators bleiben aussen vor.
 *
 * ROT-NACHWEIS. Mit --rot-nachweis rechnet der Apps-Script-Rueckfall den Hoechstbetrag wieder fuer das ganze
 * Gebaeude statt anteilig. Der Lauf MUSS dann rot werden.
 *
 * Start:  node tests/t1170-foerderrechnung-doppellauf.mjs [--konfigurator <pfad zu Code.js>] [--rot-nachweis]
 * Kein Netz, kein Sheet, kein Framework.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROT = process.argv.includes('--rot-nachweis');
const kIndex = process.argv.indexOf('--konfigurator');
const KONF_PFAD =
  kIndex >= 0
    ? process.argv[kIndex + 1]
    : path.resolve('..', 'herowerk-konfigurator-t1170-foerderrechnung', 'Code.js');
const GS_PFAD = 'apps-script/rechner-backend/Code.gs';
const ENGINE_PFAD = 'apps-script/rechner-backend/kv_engine.gs';

const werfe = (was) => () => {
  throw new Error('Unerwarteter Zugriff auf ' + was);
};

// --- 1. Saat lesen, Blaetter bauen (wie tests/rueckfall-antragsdatum-gleichlauf.mjs).
const saat = {
  console,
  SpreadsheetApp: { openById: werfe('SpreadsheetApp') },
  CacheService: { getScriptCache: werfe('CacheService') },
  ContentService: { createTextOutput: werfe('ContentService'), MimeType: { JSON: 'JSON' } },
  Utilities: { sleep: werfe('Utilities') },
};
vm.createContext(saat);
vm.runInContext(fs.readFileSync(ENGINE_PFAD, 'utf8'), saat);
vm.runInContext(fs.readFileSync(GS_PFAD, 'utf8'), saat);
const PERIODEN_KOPF = [
  'key',
  'von',
  'bis',
  'label',
  'klima',
  'grenze',
  'eu',
  'cap',
  'effizienz',
  'kindFreibetrag',
  'einkStufen',
  'proKlima',
  'quelle',
];
const PREISE = [
  [
    'Klasse',
    'Modell',
    'Hausgroesse',
    'kW',
    'Endpreis_brutto',
    'Eigenanteil',
    'proKlima_Eigenanteil',
  ],
  ['s', 'CHA-07', 'klein', 7, 30026, 0, 0],
  ['m', 'CHA-10', 'mittel', 10, 35349, 0, 0],
  ['l', 'CHA-16', 'gross', 16, 41718, 0, 0],
  ['xl', 'CHA-20', 'sehr gross', 20, 48815, 0, 0],
  ['xxl', '2x CHA-16', 'kaskade', 32, 89419, 0, 0],
];
const BLAETTER = {
  Förder_Parameter: [['schluessel', 'wert'], ...saat.FOERDER_ROWS_()],
  Dimensionierung: [['schluessel', 'wert'], ...saat.DIMENSION_ROWS_()],
  KV_Parameter: [['schluessel', 'wert'], ...saat.KV_PARAMETER_ROWS_()],
  KV_FoerderPerioden: [PERIODEN_KOPF, ...saat.KV_PERIODEN_ROWS_()],
  Preise_Wolf: PREISE,
  Preise_Vaillant: PREISE,
};
assert.equal(
  saat.FOERDER_ROWS_().find((z) => z[0] === 'reform_deckel_pct_standard')?.[1],
  70,
  'Saat traegt den Treiber reform_deckel_pct_standard = 70 (RL 17.08.2026 Nr. 8.4.1)'
);

// --- 2. Anfragen.
const cycle = (values, index, divisor = 1) => values[Math.floor(index / divisor) % values.length];
function doppellaufFall(index) {
  const we = cycle([1, 2, 3, 6, 7, 10], index, 3);
  const selbst = Math.min(we, cycle([0, 1, 2, 4], index, 5));
  const out = {
    action: 'foerderung',
    we,
    selbstWE: selbst,
    heizung: cycle(['gas', 'oel', 'kohle', 'nachtspeicher', 'gas-etage', 'biomasse'], index, 2),
    einkommen: cycle(['bis30', 'bis40', 'bis50', 'ueber50', 'unter40', 'keine'], index, 4),
    gemeinde: cycle(['hannover', 'seelze', 'langenhagen', 'celle', ''], index, 7),
    marke: cycle(['wolf', 'vaillant'], index, 3),
    wpTyp: cycle(['s', 'm', 'l', 'xl', 'xxl'], index, 2),
    heizungsalter: cycle([5, 19, 20, 35], index, 5),
    kind: cycle(['ja', 'nein'], index, 11),
    eu: cycle(['ja', 'nein'], index, 13),
    proklimaOptin: cycle(['ja', 'nein'], index, 17),
  };
  if (index % 9 === 0) out.preisManuell = cycle([12000, 23999, 35349, 88000], index, 2);
  return out;
}
const basis = (extra) => ({
  action: 'foerderung',
  we: '1',
  selbstWE: '1',
  heizung: 'oel',
  heizungsalter: '25',
  einkommen: 'ueber90',
  kind: 'nein',
  marke: 'wolf',
  wpTyp: 'm',
  fHalbjahr: 'h2-2026',
  ...extra,
});
// Solltabelle der Steuerung (Bauauftrag T1170 Abschnitt 4), Zuschuss in Euro auf Cent, Grenze = anteiliger Hoechstbetrag.
const SOLL = [
  [
    'S1',
    basis({ einkommen: 'bis40', preisManuell: '40000' }),
    { zuschussGesamt: 19600, grenze: 28000, kfwSatz: 70 },
  ],
  [
    'S2',
    basis({ einkommen: 'bis30', preisManuell: '30000' }),
    { zuschussGesamt: 22400, grenze: 28000, kfwSatz: 80 },
  ],
  [
    'S3',
    basis({ we: '2', preisManuell: '41000' }),
    {
      zuschussGesamt: 15580,
      grenze: 43000,
      bemessungsBasis: 41000,
      hinweis:
        'Bei Gebäuden mit mehreren Wohneinheiten wird der Höchstbetrag der förderfähigen Gebäudekosten zu gleichen Teilen auf die Wohneinheiten verteilt. Für selbstgenutzte Wohneinheiten werden zusätzlich die jeweils verfügbaren persönlichen Förderboni berücksichtigt. Bei Wohnungseigentümergemeinschaften (WEG) erfolgt die Antragstellung für eine gemeinsame Heizungsanlage über einen gemeinschaftlichen Basisantrag. Selbstnutzende Eigentümer beantragen einen möglichen Klimageschwindigkeitsbonus und/oder Einkommensbonus jeweils über einen persönlichen Zusatzantrag.',
    },
  ],
  [
    'S4',
    basis({ we: '2', einkommen: 'bis30', preisManuell: '56000' }),
    { zuschussGesamt: 23650, grenze: 43000, bemessungsBasis: 43000 },
  ],
  ['S5', basis({ we: '3', preisManuell: '70000' }), { zuschussGesamt: 20493.33, grenze: 58000 }],
  ['S6a', basis({ we: '2', preisManuell: '50000' }), { zuschussGesamt: 16340, grenze: 43000 }],
  ['S6b', basis({ we: '2', preisManuell: '49000' }), { zuschussGesamt: 16340, grenze: 43000 }],
  ['S6c', basis({ we: '2', preisManuell: '47500' }), { zuschussGesamt: 16340, grenze: 43000 }],
  [
    'S7',
    basis({ we: '3', weBetroffen: '1', preisManuell: '30000' }),
    { zuschussGesamt: 8893.33, grenze: 19333.33, bemessungsBasis: 19333.33 },
  ],
  [
    'S8',
    basis({
      heizung: 'gas',
      heizungsalter: '25',
      funktionstuechtig: 'nein',
      preisManuell: '35000',
    }),
    { zuschussGesamt: 8400, grenze: 28000, klimaBonus: false },
  ],
  [
    'S9',
    basis({ heizung: 'gas-etage', heizungsalter: '14', preisManuell: '35000' }),
    { zuschussGesamt: 12880, klimaBonus: true },
  ],
  [
    'S10',
    basis({ heizung: 'gas', heizungsalter: '19', preisManuell: '35000' }),
    { zuschussGesamt: 8400, klimaBonus: false },
  ],
  [
    'S11',
    basis({ heizung: 'gas', heizungsalter: '20', fHalbjahr: 'h2-2027', preisManuell: '35000' }),
    { zuschussGesamt: 10070, grenze: 26500, kfwSatz: 38 },
  ],
  [
    'S12',
    basis({ we: '2', selbstWE: '0', preisManuell: '41000' }),
    { zuschussGesamt: 12300, grenze: 43000 },
  ],
];
// Alle Werte als Text, wie sie aus der Adresszeile kommen: die Apps-Script-Fassung liest Zahlen mit int_(), und
// int_() kippt eine echte Zahl 0 auf den Ersatzwert (Lehre 20.07.2026); die PHP-Fassung liest '0' als 0.
const alsText = (a) => Object.fromEntries(Object.entries(a).map(([k, v]) => [k, String(v)]));
const ANFRAGEN = [];
SOLL.forEach(([name, anfrage]) => ANFRAGEN.push({ name, anfrage: alsText(anfrage) }));
for (let i = 0; i < 167; i++)
  ANFRAGEN.push({ name: 'Doppellauf ' + i, anfrage: alsText(doppellaufFall(i)) });
for (let i = 0; i < 167; i++) {
  const a = doppellaufFall(i);
  a.weBetroffen = cycle([1, 2, 3, 5, 12], i, 2);
  a.funktionstuechtig = cycle(['ja', 'nein', ''], i, 3);
  a.fHalbjahr = cycle(['', 'h2-2026', 'h1-2027', 'h2-2027', 'h1-2028', 'h2-2028', 'h1-2029'], i, 4);
  ANFRAGEN.push({ name: 'Doppellauf betroffen/funktionstuechtig ' + i, anfrage: alsText(a) });
}

// --- 3. PHP, ein Aufruf fuer alle Faelle.
const phpRunner = String.raw`
require 'api/rechner-engine.php';
$in = json_decode(stream_get_contents(STDIN), true);
$out = [];
foreach ($in['anfragen'] as $q) {
    $action = $q['action'];
    unset($q['action']);
    $out[] = json_encode(hw_rechner_route($action, $q, $in['sheets']), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
`;
const roh = spawnSync('php', ['-r', phpRunner], {
  input: JSON.stringify({ sheets: BLAETTER, anfragen: ANFRAGEN.map((a) => a.anfrage) }),
  encoding: 'utf8',
  maxBuffer: 64e6,
});
assert.equal(roh.status, 0, roh.stderr);
const phpTexte = JSON.parse(roh.stdout);

// --- 4. Apps-Script-Fassungen in einer Sandbox mit denselben Blaettern.
const blattAttrappe = (zeilen) => ({
  getDataRange: () => ({ getValues: () => zeilen.map((z) => z.slice()) }),
  getLastRow: () => zeilen.length,
  getRange: (zeile, spalte, anzahl, breite) => ({
    getValues: () =>
      zeilen.slice(zeile - 1, zeile - 1 + anzahl).map((z) => {
        const teil = z.slice(spalte - 1, spalte - 1 + breite);
        while (teil.length < breite) teil.push('');
        return teil;
      }),
  }),
});
const heuteBerlin = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Berlin',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());
function sandbox(enginePfad, codePfad, sabotage) {
  const cache = {};
  const ctx = {
    console: { log: () => {}, warn: () => {}, error: () => {} },
    Date,
    Intl,
    JSON,
    Math,
    Number,
    String,
    Object,
    Array,
    SpreadsheetApp: {
      openById: () => ({
        getSheetByName: (name) =>
          Object.prototype.hasOwnProperty.call(BLAETTER, name)
            ? blattAttrappe(BLAETTER[name])
            : null,
        insertSheet: werfe('insertSheet'),
      }),
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => (Object.prototype.hasOwnProperty.call(cache, k) ? cache[k] : null),
        put: (k, v) => {
          cache[k] = v;
        },
      }),
    },
    ContentService: { createTextOutput: werfe('ContentService'), MimeType: { JSON: 'JSON' } },
    Utilities: {
      sleep: () => {},
      formatDate: (datum, zone, muster) => {
        if (zone !== 'Europe/Berlin' || muster !== 'yyyy-MM-dd')
          throw new Error('Unerwartetes Datumsformat: ' + zone + ' / ' + muster);
        return heuteBerlin;
      },
    },
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(enginePfad, 'utf8'), ctx, { filename: 'kv_engine' });
  let quelle = fs.readFileSync(codePfad, 'utf8');
  if (sabotage) {
    const alt =
      'foerderFaehigGesamt = Math.round(hoechstbetragGebaeude / we * weBetroffen * 100) / 100;';
    assert.ok(
      quelle.includes(alt),
      'Sabotage-Stelle nicht gefunden, der Rot-Nachweis waere wertlos'
    );
    quelle = quelle.replace(alt, 'foerderFaehigGesamt = hoechstbetragGebaeude;');
  }
  vm.runInContext(quelle, ctx, { filename: path.basename(codePfad) });
  // Der Konfigurator liest Foerder_Parameter ueber getAllParameters_ (Blatt B); hier dieselbe Saat.
  if (typeof ctx.getAllParameters_ === 'function') {
    const f = {};
    BLAETTER['Förder_Parameter'].slice(1).forEach((z) => {
      f[z[0]] = z[1];
    });
    ctx.getAllParameters_ = () => ({ foerder: f });
  }
  return ctx;
}
const gs = sandbox(ENGINE_PFAD, GS_PFAD, ROT);
const konf = fs.existsSync(KONF_PFAD)
  ? sandbox(path.join(path.dirname(KONF_PFAD), 'kv_engine.js'), KONF_PFAD, false)
  : null;

const route = (ctx, anfrage) => {
  const p = { ...anfrage };
  delete p.action;
  return ctx.foerderung_(p);
};
const nurFelder = (obj, felder) => {
  const o = {};
  felder.forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(obj, k)) o[k] = obj[k];
  });
  return o;
};

// --- 5. Vergleich.
const zeilen = [];
let fehler = 0;
const melde = (ok, text) => {
  if (!ok) fehler++;
  zeilen.push((ok ? 'PASS' : 'FAIL') + ' | ' + text);
};

SOLL.forEach(([name, , soll], i) => {
  const php = JSON.parse(phpTexte[i]);
  const abw = Object.keys(soll)
    .filter((k) => php[k] !== soll[k])
    .map((k) => k + ' ist ' + JSON.stringify(php[k]) + ' soll ' + JSON.stringify(soll[k]));
  melde(
    abw.length === 0,
    'Solltabelle ' +
      name +
      ' (PHP): ' +
      (abw.length ? abw.join('; ') : 'Zuschuss ' + php.zuschussGesamt + ', Grenze ' + php.grenze)
  );
});

let gsGleich = 0,
  konfGleich = 0,
  ersteAbweichungGs = '',
  ersteAbweichungKonf = '';
ANFRAGEN.forEach(({ name, anfrage }, i) => {
  const phpText = phpTexte[i];
  const gsText = JSON.stringify(route(gs, anfrage));
  if (phpText === gsText) gsGleich++;
  else if (!ersteAbweichungGs)
    ersteAbweichungGs = name + ': PHP ' + phpText.slice(0, 300) + ' | GS ' + gsText.slice(0, 300);
  if (konf) {
    const php = JSON.parse(phpText);
    const felder = Object.keys(php);
    const konfText = JSON.stringify(nurFelder(route(konf, anfrage), felder));
    const phpText2 = JSON.stringify(php);
    if (phpText2 === konfText) konfGleich++;
    else if (!ersteAbweichungKonf)
      ersteAbweichungKonf =
        name + ': PHP ' + phpText2.slice(0, 300) + ' | Konfigurator ' + konfText.slice(0, 300);
  }
});
melde(
  gsGleich === ANFRAGEN.length,
  'PHP gegen Apps-Script-Rueckfall zeichengleich: ' +
    gsGleich +
    ' von ' +
    ANFRAGEN.length +
    (ersteAbweichungGs ? ' | erste Abweichung ' + ersteAbweichungGs : '')
);
if (konf)
  melde(
    konfGleich === ANFRAGEN.length,
    'PHP gegen Konfigurator-Kern (' +
      KONF_PFAD +
      ') auf den Website-Feldern zeichengleich: ' +
      konfGleich +
      ' von ' +
      ANFRAGEN.length +
      (ersteAbweichungKonf ? ' | erste Abweichung ' + ersteAbweichungKonf : '')
  );
else
  zeilen.push(
    'INFO | Konfigurator-Kern nicht gefunden unter ' +
      KONF_PFAD +
      ', dritter Vergleich uebersprungen'
  );

// Geldwerte auf Cent, nirgends NaN: jede PHP-Antwort.
let krumm = 0;
phpTexte.forEach((t) => {
  const r = JSON.parse(t);
  ['zuschussGesamt', 'eigenanteil', 'grenze', 'bemessungsBasis', 'proklimaZuschuss'].forEach(
    (k) => {
      if (typeof r[k] !== 'number' || !isFinite(r[k]) || r[k] !== Math.round(r[k] * 100) / 100)
        krumm++;
    }
  );
});
melde(
  krumm === 0,
  'Geldwerte auf Cent und endlich in allen ' +
    phpTexte.length +
    ' PHP-Antworten (krumm: ' +
    krumm +
    ')'
);

console.log(
  '\nT1170 Doppellauf Foerderrechnung (' +
    (ROT ? 'ROT-NACHWEIS' : 'Normallauf') +
    '), heute ' +
    heuteBerlin +
    ', ' +
    ANFRAGEN.length +
    ' Anfragen'
);
zeilen.forEach((z) => console.log(z));
console.log(
  fehler ? '\n' + fehler + ' Pruefung(en) ROT.' : '\nAlle ' + zeilen.length + ' Pruefungen gruen.'
);
if (ROT) {
  assert.ok(fehler > 0, 'Rot-Nachweis: die Sabotage MUSS rot werden');
  console.log('Rot-Nachweis bestanden: die Sabotage wurde erkannt.');
  process.exit(0);
}
process.exit(fehler ? 1 : 0);
