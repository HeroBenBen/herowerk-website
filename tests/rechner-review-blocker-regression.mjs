import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import vm from 'node:vm';

const codeGs = fs.readFileSync('apps-script/rechner-backend/Code.gs', 'utf8');
const phpEngine = fs.readFileSync('api/rechner-engine.php', 'utf8');
const phpEndpoint = fs.readFileSync('api/rechner.php', 'utf8');
const siteJs = fs.readFileSync('js/site.js', 'utf8');
const dimensionierungHtml = fs.readFileSync('dimensionierung.html', 'utf8');
const foerderungHtml = fs.readFileSync('foerderung.html', 'utf8');
const anfrageHtml = fs.readFileSync('anfrage.html', 'utf8');
const gitignore = fs.readFileSync('.gitignore', 'utf8');
const bundleScript = fs.readFileSync('scripts/make-ionos-bundle.sh', 'utf8');

const appsScript = {
  console,
  Math,
  JSON,
  Date,
  String,
  Number,
  Array,
  Object,
  RegExp,
  parseFloat,
  parseInt,
  isNaN,
};
vm.createContext(appsScript);
vm.runInContext(codeGs, appsScript);
vm.runInContext(
  `
  getAllParameters_ = function () { return { dimensionierung: {
    spez_bedarf_vor1978: 180,
    spez_bedarf_1978_1994: 140,
    spez_bedarf_1995_2010: 100,
    spez_bedarf_nach2010: 60,
    sollband_oben: 0.8,
    kaskaden_toleranz_kw: 0.5
  } }; };
  getKlimaPlz_ = function () { return {
    '30159': { nat: -10, volllast: 1800 },
    '30900': { nat: -11.1, volllast: 1800 },
    '30539': { nat: -11.3, volllast: 1800 },
    '31099': { nat: -12.3, volllast: 1800 },
    '*': { nat: -11, volllast: 1800 }
  }; };
  getCatalog_ = function () { return []; };
  getKennlinien_ = function () { return {}; };
  getCatalogParameters_ = function () { return { heizstab_wolf: 9, heizstab_vaillant: 8.54 }; };
  getPriceTableCached_ = function () { return []; };
  `,
  appsScript
);

const phpRunner = String.raw`
require 'api/rechner-engine.php';
$query = json_decode(stream_get_contents(STDIN), true);
$sheets = [
    'Dimensionierung' => [
        ['schluessel', 'wert'],
        ['spez_bedarf_vor1978', 180],
        ['spez_bedarf_1978_1994', 140],
        ['spez_bedarf_1995_2010', 100],
        ['spez_bedarf_nach2010', 60],
        ['sollband_oben', 0.8],
        ['kaskaden_toleranz_kw', 0.5],
    ],
    'Klima_PLZ' => [
        ['plz', 'ort', 'nat', 'volllast', 'jahresmittel', 'quelle'],
        ['30159', 'Hannover', -10, 1800, 10.9, 'Regressionstest'],
        ['30900', 'Wedemark', -11.1, 1800, 10.1, 'Regressionstest'],
        ['30539', 'Hannover', -11.3, 1800, 9.9, 'Regressionstest'],
        ['31099', 'Woltershausen', -12.3, 1800, 9.2, 'Regressionstest'],
        ['*', 'Rückfall', -11, 1800, 10.4, 'Regressionstest'],
    ],
    'Geräte_Katalog' => [
        array_fill(0, 20, ''), array_fill(0, 20, ''), array_fill(0, 20, ''), array_fill(0, 20, ''),
        ['heizstab_wolf', 9], ['heizstab_vaillant', 8.54], array_fill(0, 20, ''),
        ['Marke','Modell','Kaskade','WP NAT W35','WP NAT W55','','','Auslegungsgrenze W35 (WP÷0,80)','Auslegungsgrenze W55 (WP÷0,80)','','Brutto €','Stand','','Auslegungsgrenze W35 @A-10','Auslegungsgrenze W55 @A-10','','WP NAT W35 @A-10','WP NAT W55 @A-10','Baureihe','Mindest-Leistungsanteil'],
    ],
    'Preise_Wolf' => [[]],
    'Preise_Vaillant' => [[]],
];
$action = $query['_action'] ?? 'dimensionierung';
unset($query['_action']);
echo json_encode(hw_rechner_route($action, $query, $sheets), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
`;

function phpDimensionierung(query) {
  const result = spawnSync('php', ['-r', phpRunner], {
    input: JSON.stringify(query),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

function phpKlima(plz) {
  return phpDimensionierung({ _action: 'klima', plz });
}

const klimaSollfaelle = [
  ['30159', { gefunden: true, nat: -10 }],
  ['30900', { gefunden: true, nat: -11.1 }],
  ['30539', { gefunden: true, nat: -11.3 }],
  ['31099', { gefunden: true, nat: -12.3 }],
  ['99999', { gefunden: false }],
];
for (const [plz, erwartet] of klimaSollfaelle) {
  assert.deepEqual(
    JSON.parse(JSON.stringify(appsScript.klima_({ plz }))),
    erwartet,
    `Apps Script: Klima ${plz}`
  );
  assert.deepEqual(phpKlima(plz), erwartet, `PHP: Klima ${plz}`);
}
assert.notEqual(phpKlima('30159').nat, phpKlima('30539').nat, 'Hannover wird PLZ-scharf gelesen');
assert.match(siteJs, /Number\(variante\.brutto\) > 0/);
const renderBrandSource = siteJs.slice(
  siteJs.indexOf('function renderBrandCard'),
  siteJs.indexOf('function wizSelectMarke')
);
assert.match(renderBrandSource, /variante\.baureihe/);
assert.match(renderBrandSource, /variante\.anzahl/);
assert.match(renderBrandSource, /ab ca\./);
assert.match(renderBrandSource, /Brutto-Richtpreis vor Förderung/);
assert.match(renderBrandSource, /variante\.empfohlen === true/);
assert.match(renderBrandSource, /wiz-variant-recommendation-badge/);
assert.match(renderBrandSource, /empfehlungGezeigt/);
for (const vertriebsfeld of [
  'leistungsanteil',
  'taktpunkt',
  'bivalenzpunkt',
  'puffer',
  'eigenanteil',
]) {
  assert.doesNotMatch(renderBrandSource.toLowerCase(), new RegExp(vertriebsfeld));
}
assert.match(siteJs, /kälteste Auslegungstemperatur an deinem Ort/);
assert.match(siteJs, /minimumFractionDigits: 1, maximumFractionDigits: 1/);
assert.match(dimensionierungHtml, /<span style="color:var\(--green\);">gleichzeitig<\/span>/);
assert.match(
  dimensionierungHtml,
  /nicht wie viele Bäder ihr habt, sondern wie viele Zapfstellen im selben Moment laufen sollen\./
);

const zeroSafeFields = [
  'baujahr',
  'gebaeude',
  'sanierung',
  'warmwasser',
  'heizsystem',
  'verbrauchKnown',
  'einheit',
  'plz',
  'heizung',
  'andere_heizung',
  'abgasrohr',
  'heizungsalter',
  'duschgroesse',
  'wannengroesse',
  'kind',
  'eu',
  'gemeinde',
  'marke',
  'wpTyp',
  'fHalbjahr',
  'bedarfModus',
];
for (const key of zeroSafeFields) {
  assert.equal(
    appsScript.paramString_({ [key]: '0' }, key, 'fallback'),
    '0',
    `Apps Script: ${key}=0`
  );
}
const phpZero = spawnSync(
  'php',
  [
    '-r',
    `require 'api/rechner-engine.php'; $fields=json_decode(stream_get_contents(STDIN),true); $q=array_fill_keys($fields,'0'); echo json_encode(array_map(fn($key)=>hw_query_string($q,$key,'fallback'),$fields));`,
  ],
  { input: JSON.stringify(zeroSafeFields), encoding: 'utf8' }
);
assert.equal(phpZero.status, 0, phpZero.stderr);
assert.deepEqual(
  JSON.parse(phpZero.stdout),
  zeroSafeFields.map(() => '0'),
  'PHP: Auswahlwerte 0'
);

const warmwasserBase = {
  flaeche: 0,
  baujahr: '1958-1968',
  gebaeude: 'efh',
  sanierung: 'nein',
  verbrauchKnown: 'unknown',
  warmwasser: 'ja',
  personen: 2,
  duschen: 1,
  wannen: 1,
  heizsystem: 'heizkoerper',
  plz: '30159',
};
const sparsamKlein = { ...warmwasserBase, duschgroesse: '0', wannengroesse: '0' };
const normalNormal = { ...warmwasserBase, duschgroesse: '1', wannengroesse: '1' };
const appsSparsam = JSON.parse(JSON.stringify(appsScript.dimensionierung_(sparsamKlein)));
const appsNormal = JSON.parse(JSON.stringify(appsScript.dimensionierung_(normalNormal)));
const phpSparsam = phpDimensionierung(sparsamKlein);
const phpNormal = phpDimensionierung(normalNormal);

assert.equal(Number(appsScript.warmwasserLeistung_({}, 2, 1, 1, '0', '0').toFixed(2)), 2.61);
assert.equal(Number(appsScript.warmwasserLeistung_({}, 2, 1, 1, '1', '1').toFixed(2)), 3.44);
const phpWarmwasser = spawnSync(
  'php',
  [
    '-r',
    `require 'api/rechner-engine.php'; echo json_encode([round(hw_warmwasser_leistung([],2,1,1,'0','0'),2),round(hw_warmwasser_leistung([],2,1,1,'1','1'),2)]);`,
  ],
  { encoding: 'utf8' }
);
assert.equal(phpWarmwasser.status, 0, phpWarmwasser.stderr);
assert.deepEqual(JSON.parse(phpWarmwasser.stdout), [2.61, 3.44]);
assert.equal(
  appsSparsam.bedarf,
  2.6,
  'Apps Script: Anzeige rundet 2,61 kW auf eine Nachkommastelle'
);
assert.equal(phpSparsam.bedarf, 2.6, 'PHP: Anzeige rundet 2,61 kW auf eine Nachkommastelle');
assert.equal(
  appsNormal.bedarf,
  3.4,
  'Apps Script: Anzeige rundet 3,44 kW auf eine Nachkommastelle'
);
assert.equal(phpNormal.bedarf, 3.4, 'PHP: Anzeige rundet 3,44 kW auf eine Nachkommastelle');

const knownBase = {
  flaeche: 0,
  baujahr: '1958-1968',
  gebaeude: 'efh',
  sanierung: 'nein',
  verbrauchKnown: 'known',
  warmwasser: 'ja',
  heizsystem: 'heizkoerper',
  plz: '30159',
};
// SOLLWERTE AM 19.08.2026 NACHGEZOGEN, Vorgang T555: der Verbrauchspfad ist an Vaillant
// angeglichen (GF-Entscheid 19.08.2026, 11:54 Uhr). Wo die Warmwasser-Zapflast fuehrt, aendert sich
// nichts (A2 und A6). Wo die Heizung fuehrt, steigt die Zahl auf den rohen Verbrauch geteilt durch
// die Volllaststunden: A1 8,6 auf 12,2 · A3 10,1 auf 16,7 · A4 6,8 auf 7,8 · A5 6,5 auf 6,7 ·
// N2 9,3 auf 11,1. N1 steigt von 8,2 auf 9,7, weil dort eine bestehende Waermepumpe zaehlt und ihre
// Jahresarbeitszahl als Umrechnung von Strom auf Waerme erhalten bleibt.
// Jeder Wert ist unabhaengig nachgerechnet als Maximum aus roher Verbrauch geteilt durch 1800 und
// der Warmwasser-Zapflast, nicht aus dem Kern uebernommen.
const acceptanceCases = [
  [
    'A1',
    12.2,
    {
      ...knownBase,
      heizung: 'gas',
      verbrauch: 22000,
      einheit: 'kwh',
      abgasrohr: 'kunststoff',
      heizungsalter: '1990-2010',
      personen: 5,
      duschen: 2,
      wannen: 1,
      duschgroesse: '1',
      wannengroesse: '1',
    },
  ],
  [
    'A2',
    10.4,
    {
      ...knownBase,
      heizung: 'gas',
      verbrauch: 9000,
      einheit: 'kwh',
      abgasrohr: 'kunststoff',
      heizungsalter: '1990-2010',
      personen: 6,
      duschen: 3,
      wannen: 1,
      duschgroesse: '1',
      wannengroesse: '1',
    },
  ],
  [
    'A3',
    16.7,
    {
      ...knownBase,
      heizung: 'oel',
      verbrauch: 3000,
      einheit: 'liter',
      abgasrohr: 'metall',
      heizungsalter: 'vor1990',
      personen: 4,
      duschen: 1,
      wannen: 1,
      duschgroesse: '1',
      wannengroesse: '2',
    },
  ],
  [
    'A4',
    7.8,
    {
      ...knownBase,
      heizung: 'gas',
      verbrauch: 14000,
      einheit: 'kwh',
      abgasrohr: 'kunststoff',
      heizungsalter: 'nach2010',
      personen: 2,
      duschen: 1,
      wannen: 1,
      duschgroesse: '3',
      wannengroesse: '3',
    },
  ],
  [
    'A5',
    6.7,
    {
      ...knownBase,
      heizung: 'nacht',
      verbrauch: 12000,
      einheit: 'kwh',
      warmwasser: 'nein',
      personen: 3,
      duschen: 0,
      wannen: 0,
      duschgroesse: '0',
      wannengroesse: '0',
    },
  ],
  [
    'A6',
    21.5,
    {
      ...knownBase,
      heizung: 'gas',
      verbrauch: 28000,
      einheit: 'kwh',
      abgasrohr: 'kunststoff',
      heizungsalter: '1990-2010',
      personen: 6,
      duschen: 3,
      wannen: 1,
      duschgroesse: '3',
      wannengroesse: '3',
    },
  ],
  [
    'N1',
    9.7,
    {
      ...knownBase,
      heizung: 'sonst',
      andere_heizung: 'waermepumpe',
      verbrauch: 5000,
      einheit: 'kwh',
      personen: 4,
      duschen: 2,
      wannen: 1,
      duschgroesse: '1',
      wannengroesse: '1',
    },
  ],
  [
    'N2',
    11.1,
    {
      ...knownBase,
      heizung: 'sonst',
      andere_heizung: 'fernwaerme',
      verbrauch: 20000,
      einheit: 'kwh',
      personen: 4,
      duschen: 2,
      wannen: 1,
      duschgroesse: '1',
      wannengroesse: '1',
    },
  ],
];
for (const [id, expected, query] of acceptanceCases) {
  const googleResult = JSON.parse(JSON.stringify(appsScript.dimensionierung_(query)));
  const phpResult = phpDimensionierung(query);
  assert.equal(googleResult.bedarf, expected, `Apps Script ${id}`);
  assert.equal(phpResult.bedarf, expected, `PHP ${id}`);
  assert.deepEqual(googleResult, phpResult, `Kernparität ${id}`);
}
const n3Google = JSON.parse(JSON.stringify(appsScript.dimensionierung_(acceptanceCases[1][2])));
const n3Php = phpDimensionierung(acceptanceCases[1][2]);
assert.equal(n3Google.stromverbrauch_kwh, 2487, 'Apps Script N3');
assert.equal(n3Php.stromverbrauch_kwh, 2487, 'PHP N3');

const unklarerBestand = {
  ...warmwasserBase,
  verbrauchKnown: 'known',
  verbrauch: 20000,
  einheit: 'kwh',
  heizung: 'sonst',
  andere_heizung: 'unklar',
};
const appsUnklar = JSON.parse(JSON.stringify(appsScript.dimensionierung_(unklarerBestand)));
const phpUnklar = phpDimensionierung(unklarerBestand);
assert.equal(
  appsUnklar.stromverbrauch_kwh,
  4624,
  'Apps Script: unbekannter Bestand zählt Warmwasser einmal'
);
assert.equal(
  phpUnklar.stromverbrauch_kwh,
  4624,
  'PHP: unbekannter Bestand zählt Warmwasser einmal'
);

for (const result of [appsSparsam, appsNormal, appsUnklar, phpSparsam, phpNormal, phpUnklar]) {
  assert.equal('klima_extrapoliert' in result, false, 'totes Feld klima_extrapoliert entfernt');
  assert.doesNotMatch(result.strom_hinweis, /Jahresarbeitszahl|\b3[.,]8\b|\b2[.,]7\b/);
  assert.match(result.strom_hinweis, /^Geschätzt aus deinem Wärmebedarf\./);
}
assert.doesNotMatch(phpEngine, /'jahresmittel'\s*=>\s*hw_num/);
assert.doesNotMatch(codeGs, /jahresmittel:\s*num_/);

class FakeRange {
  constructor(sheet, row, column) {
    this.sheet = sheet;
    this.row = row;
    this.column = column;
  }
  setValues(values) {
    values.forEach((rowValues, rowOffset) => {
      rowValues.forEach((value, columnOffset) => {
        this.sheet.cells[`${this.row + rowOffset}:${this.column + columnOffset}`] = value;
      });
    });
    return this;
  }
  setNumberFormat() {
    return this;
  }
}
class FakeSheet {
  constructor() {
    this.cells = {};
  }
  clear() {
    this.cells = {};
  }
  getRange(row, column) {
    return new FakeRange(this, row, column);
  }
  setFrozenRows() {}
}
const fakeSheets = {};
const fakeSpreadsheet = {
  getSheetByName(name) {
    return fakeSheets[name] || null;
  },
  insertSheet(name) {
    fakeSheets[name] = new FakeSheet();
    return fakeSheets[name];
  },
};
appsScript.SpreadsheetApp = { openById: () => fakeSpreadsheet };
appsScript.CacheService = { getScriptCache: () => ({ remove() {} }) };
vm.runInContext(
  `
  writeKalkulationWolf_ = function () {};
  writeKalkulationVaillant_ = function () {};
  writePreiseFromKalkulation_ = function () {};
  writeStatus_ = function () {};
  setupSheets();
  `,
  appsScript
);
const dimensionRows = Object.entries(fakeSheets.Dimensionierung.cells)
  .filter(([cell]) => cell.endsWith(':1') && cell !== '1:1')
  .sort((a, b) => Number(a[0].split(':')[0]) - Number(b[0].split(':')[0]))
  .map(([, key]) => String(key));
const activeDimensionKeys = [
  'volllaststunden',
  'oel_faktor',
  'gas_faktor',
  'jaz_heizung',
  'jaz_warmwasser',
  'ww_abzug_kwh_pro_person',
  'ww_temperatur_grad',
  'ww_sockel_kw',
  'ww_f_1_2',
  'ww_f_3_5',
  'ww_f_6plus',
  'ww_dusche_sparsam',
  'ww_dusche_normal',
  'ww_dusche_massage',
  'ww_dusche_regen',
  'ww_wanne_klein',
  'ww_wanne_normal',
  'ww_wanne_gross',
  'ww_wanne_sehrgross',
  'eta_unklar',
  'eta_metall_vor1990',
  'eta_metall_sonst',
  'eta_kunststoff_nach2010',
  'eta_kunststoff_gas',
  'eta_kunststoff_oel',
  'eta_nachtspeicher',
  'eta_fernwaerme',
  'eta_pellet',
  'eta_andere_unklar',
  'jaz_bestand_waermepumpe',
];
assert.equal(activeDimensionKeys.length, 30);
for (const key of activeDimensionKeys)
  assert.ok(dimensionRows.includes(key), `setupSheets verliert ${key}`);
for (const key of activeDimensionKeys) {
  const row = Object.entries(fakeSheets.Dimensionierung.cells)
    .find(([, value]) => value === key)?.[0]
    .split(':')[0];
  for (const column of [2, 3, 4, 5]) {
    assert.notEqual(
      fakeSheets.Dimensionierung.cells[`${row}:${column}`],
      '',
      `${key}: Spalte ${column} leer`
    );
    assert.notEqual(
      fakeSheets.Dimensionierung.cells[`${row}:${column}`],
      undefined,
      `${key}: Spalte ${column} fehlt`
    );
  }
}

assert.match(
  siteJs,
  /vor1990:\s*'30'[\s\S]*?'1990-2010':\s*'20'[\s\S]*?nach2010:\s*'5'[\s\S]*?unklar:\s*'20'/
);
assert.match(siteJs, /foerderAlterAnnahme\s*=\s*klasse\s*===\s*'unklar'/);
assert.match(
  foerderungHtml,
  /id="foerderAlterAnnahme"[\s\S]*?Wir nehmen hier an, dass deine Heizung mindestens 20 Jahre alt ist\./
);
assert.equal(
  (dimensionierungHtml.match(/class="wizard-progress-bar(?: active)?"/g) || []).length,
  15
);
assert.match(siteJs, /stepNum === 13 && wizData\.duschen === 0/);
assert.doesNotMatch(anfrageHtml, /1995-2009/);
assert.match(anfrageHtml, /1995-2010/);
assert.match(phpEndpoint, /rechner_fail\(500, 'calculator_temporarily_unavailable'\);/);
assert.doesNotMatch(phpEndpoint, /rechner_fail\(500, \$error->getMessage\(\)\)/);
assert.match(gitignore, /^artifacts\/$/m);
assert.match(gitignore, /^design-qa\.md$/m);
assert.match(bundleScript, /--exclude 'artifacts\/'/);
assert.match(bundleScript, /--exclude 'design-qa\.md'/);

// --- Nachtrag 14.08.2026: Gebaeudefaktor Reihenmittelhaus und Grenzwerte des Verbrauchspfads ---

const basis = {
  action: 'dimensionierung',
  plz: '30159',
  baujahr: '1984-1994',
  sanierung: 'nein',
  warmwasser: 'ja',
  heizsystem: 'heizkoerper',
  einheit: 'kwh',
  personen: '2',
  heizung: 'gas',
  andere_heizung: 'fernwaerme',
  abgasrohr: 'unklar',
  heizungsalter: 'unklar',
  duschen: '1',
  wannen: '1',
  duschgroesse: '1',
  wannengroesse: '1',
  flaeche: '140',
  gebaeude: 'efh',
  verbrauchKnown: 'unknown',
  verbrauch: '20000',
};

// Das Reihenmittelhaus hatte keinen eigenen Faktor und fiel still auf 1,0 zurueck, also auf den
// Wert des freistehenden Einfamilienhauses. Es traegt jetzt den Wert der Reihenhaus-Familie.
const efh = phpDimensionierung({ ...basis, gebaeude: 'efh' }).bedarf;
const rhMitte = phpDimensionierung({ ...basis, gebaeude: 'rh-mitte' }).bedarf;
const rhEnd = phpDimensionierung({ ...basis, gebaeude: 'rh-end' }).bedarf;
assert.equal(rhMitte, rhEnd, 'Reihenmittelhaus rechnet wie das Reihenendhaus');
assert.ok(rhMitte < efh, 'Reihenmittelhaus liegt unter dem freistehenden Einfamilienhaus');
assert.equal(appsScript.gebaeudeFaktor_({}, 'rh-mitte'), 0.85);
assert.match(codeGs, /'gebaeudef_rh_mitte',0\.85/);

// Der Kern nimmt jeden Aufrufwert an; die Bedienoberflaeche laesst 5.000 bis 120.000 Kilowattstunden
// zu (500 bis 12.000 Liter oder Kubikmeter). Realistische Eingaben duerfen sich NICHT aendern.
const bekannt = (v, einheit) =>
  phpDimensionierung({ ...basis, verbrauchKnown: 'known', verbrauch: String(v), einheit }).bedarf;
assert.equal(bekannt(20000, 'kwh'), bekannt(2000, 'liter'), '20.000 kWh entsprechen 2.000 Litern');
assert.equal(bekannt(200000, 'kwh'), bekannt(120000, 'kwh'), 'oberhalb 120.000 kWh wird geklemmt');
assert.equal(
  bekannt(20000, 'liter'),
  bekannt(12000, 'liter'),
  'oberhalb 12.000 Litern wird geklemmt'
);
assert.equal(bekannt(300, 'kwh'), bekannt(5000, 'kwh'), 'unterhalb 5.000 kWh wird angehoben');
// Die beiden Grenzen sind am 19.08.2026 nachgezogen, Vorgang T555: seit der Angleichung an
// Vaillant rechnet der Verbrauchspfad mit dem rohen Verbrauch. Die Klemme bei 12.000 Litern
// entspricht 120.000 Kilowattstunden und damit 66,7 kW; der Schutz vor der Fehleingabe ist die
// Klemme selbst, nicht die Zahl dahinter. Die realistische Eingabe von 20.000 Kilowattstunden
// ergibt 20.000 geteilt durch 1.800 gleich 11,1 kW, unabhaengig nachgerechnet.
assert.ok(bekannt(20000, 'liter') < 70, 'kein absurder Auslegungswert mehr aus einer Fehleingabe');
assert.equal(bekannt(20000, 'kwh'), 11.1, 'realistische Eingabe folgt dem rohen Verbrauch');

// Auch die Flaeche folgt den Grenzen des Schiebereglers (60 bis 800 Quadratmeter).
const flaeche = (v) => phpDimensionierung({ ...basis, flaeche: String(v) }).bedarf;
assert.equal(flaeche(20), flaeche(60), 'unterhalb 60 Quadratmetern wird angehoben');
assert.equal(flaeche(2000), flaeche(800), 'oberhalb 800 Quadratmetern wird geklemmt');

console.log(
  'PASS Review-Blocker: A1-A6, N1-N3, 0-Werte, 2,61/3,44 kW, 30 Parameter, Förderannahme, Reihenmittelhaus und Grenzwerte'
);
