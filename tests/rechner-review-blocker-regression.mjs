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
    spez_bedarf_nach2010: 60
  } }; };
  getKlimaPlz_ = function () { return { '30159': { nat: -10, volllast: 1800 } }; };
  getCatalog_ = function () { return []; };
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
    ],
    'Klima_PLZ' => [
        ['plz', 'ort', 'nat', 'volllast', 'jahresmittel', 'quelle'],
        ['30159', 'Hannover', -10, 1800, 10.9, 'Regressionstest'],
    ],
    'Geräte_Katalog' => [array_fill(0, 15, '')],
    'Preise_Wolf' => [[]],
    'Preise_Vaillant' => [[]],
];
echo json_encode(hw_dimensionierung($query, $sheets), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
`;

function phpDimensionierung(query) {
  const result = spawnSync('php', ['-r', phpRunner], {
    input: JSON.stringify(query),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

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
const acceptanceCases = [
  [
    'A1',
    8.6,
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
    10.1,
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
    6.8,
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
    6.5,
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
    8.2,
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
    9.3,
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

console.log(
  'PASS Review-Blocker: A1-A6, N1-N3, 0-Werte, 2,61/3,44 kW, 30 Parameter und Förderannahme'
);
