import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import vm from 'node:vm';

import { geraeteKatalogZeilen, sollbandUnten } from './fixtures/geraete-katalog-2026-08-14.mjs';

const codeGs = fs.readFileSync('apps-script/rechner-backend/Code.gs', 'utf8');

function buildAppsScript(rows, lastRow = rows.length + 8) {
  const cache = new Map();
  const parameterRows = Array.from({ length: 8 }, () => Array(20).fill(''));
  parameterRows[4][0] = 'heizstab_wolf';
  parameterRows[4][1] = 9;
  parameterRows[5][0] = 'heizstab_vaillant';
  parameterRows[5][1] = 8.54;
  const sheet = {
    getLastRow() {
      return lastRow;
    },
    getRange(row, column, rowCount, columnCount) {
      assert.deepEqual(
        [row, column, rowCount, columnCount],
        [9, 1, Math.max(0, lastRow - 8), 20],
        'Apps Script liest Geräte_Katalog ab Zeile 9 bis Spalte T'
      );
      return {
        getValues() {
          return rows.slice(0, rowCount).map((values) => values.slice(0, columnCount));
        },
      };
    },
    getDataRange() {
      return {
        getValues() {
          return [...parameterRows, ...rows];
        },
      };
    },
  };
  const sandbox = {
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
    CacheService: {
      getScriptCache() {
        return {
          get(key) {
            return cache.get(key) ?? null;
          },
          put(key, value) {
            cache.set(key, value);
          },
          remove(key) {
            cache.delete(key);
          },
        };
      },
    },
    SpreadsheetApp: {
      openById() {
        return {
          getSheetByName(name) {
            assert.equal(name, 'Geräte_Katalog');
            return sheet;
          },
        };
      },
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(codeGs, sandbox, { filename: 'Code.gs' });
  return { sandbox, cache };
}

assert.equal(geraeteKatalogZeilen.length, 22, 'eingefrorener Katalog enthält 22 Gerätezeilen');
assert.equal(sollbandUnten, 0.7, 'eingefrorenes Sollband ist 0,70');
for (const [index, row] of geraeteKatalogZeilen.entries()) {
  assert.equal(row.length, 20, `Katalogzeile ${index + 9} enthält A bis T`);
  assert.notEqual(row[18], '', `Katalogzeile ${index + 9}: Baureihe belegt`);
  assert.notEqual(row[19], '', `Katalogzeile ${index + 9}: Mindestanteil belegt`);
}

const { sandbox: appsScript, cache } = buildAppsScript(geraeteKatalogZeilen);
const appsCatalog = appsScript.getCatalog_();
assert.equal(appsCatalog.length, 22, 'Apps Script verarbeitet alle 22 Katalogzeilen');
assert(cache.has('catalog:v2'), 'Apps Script schreibt catalog:v2');
assert.equal(cache.has('catalog:v1'), false, 'Apps Script verwendet catalog:v1 nicht mehr');
assert.deepEqual(
  JSON.parse(JSON.stringify(appsScript.getCatalogParameters_())),
  { heizstab_wolf: 9, heizstab_vaillant: 8.54 },
  'Apps Script liest Heizstäbe über die Schlüsselnamen im Geräte-Katalog'
);
assert(cache.has('catalog-params:v2'), 'Apps Script schreibt catalog-params:v2');

const emptyApps = buildAppsScript([], 8).sandbox;
assert.deepEqual(
  JSON.parse(JSON.stringify(emptyApps.getCatalog_())),
  [],
  'Apps Script erlaubt einen leeren Katalog'
);

const sollfaelle = [
  ['V01', 'vaillant', 4, 'heizkoerper', 'Vaillant VWL 35/8.1 A', 107.5],
  ['V02', 'vaillant', 9, 'heizkoerper', 'Vaillant VWL 75/8.1 A', 74.1],
  ['V03', 'vaillant', 9, 'fussboden', 'Vaillant VWL 75/7.1 A', 72.9],
  ['V04', 'vaillant', 13, 'heizkoerper', 'Vaillant VWL 115/7.1 A', 72.8],
  ['V05', 'vaillant', 14, 'heizkoerper', 'Vaillant VWL 105/8.1 A', 71.4],
  ['V06', 'vaillant', 16.3, 'heizkoerper', '2× Vaillant VWL 75/7.1 A (Kaskade)', 71.0],
  ['V07', 'vaillant', 17, 'heizkoerper', '2× Vaillant VWL 75/8.1 A (Kaskade)', 78.5],
  ['V08', 'vaillant', 17, 'fussboden', '2× Vaillant VWL 75/7.1 A (Kaskade)', 77.2],
  ['V09', 'vaillant', 20, 'heizkoerper', 'Vaillant VWL 205/8.1 A S2 Q', 94.1],
  ['V10', 'vaillant', 28, 'heizkoerper', '2× Vaillant VWL 105/8.1 A (Kaskade)', 71.4],
  ['V11', 'vaillant', 28, 'fussboden', '2× Vaillant VWL 105/8.1 A (Kaskade)', 73.3],
  ['V12', 'vaillant', 30, 'heizkoerper', '2× Vaillant VWL 125/8.1 A (Kaskade)', 74.1],
  ['W01', 'wolf', 6, 'heizkoerper', 'Wolf CHA-07', 99.2],
  ['W02', 'wolf', 9, 'heizkoerper', 'Wolf CHA-10', 86.4],
  ['W03', 'wolf', 16, 'heizkoerper', 'Wolf CHA-16/20', 88.4],
  ['W04', 'wolf', 20, 'heizkoerper', 'Wolf CHA-16/20', 70.8],
  ['W05', 'wolf', 24, 'heizkoerper', 'Wolf CHA-20/24', 74.6],
  ['W06', 'wolf', 28, 'heizkoerper', '2× Wolf CHA-16/20 (Kaskade)', 101.1],
  ['W07', 'wolf', 29, 'heizkoerper', null, null],
];

const heizstaebe = { wolf: 9, vaillant: 8.54 };
const kaskadenToleranz = 0.5;

function appsSelection(brand, load, heizsystem) {
  const match = appsScript.matchCatalog_(
    brand,
    load,
    heizsystem,
    -11,
    heizstaebe[brand],
    kaskadenToleranz
  );
  return {
    modell: match ? match.modell : null,
    anteil: match ? Math.round((match.leistungAuslegung / load) * 1000) / 10 : null,
  };
}

const parityCases = [];
for (let step = 0; step <= 260; step++) {
  const load = Math.round((4 + step / 10) * 10) / 10;
  for (const heizsystem of ['heizkoerper', 'fussboden']) {
    for (const brand of ['wolf', 'vaillant']) parityCases.push({ brand, load, heizsystem });
  }
}
assert.equal(parityCases.length, 1044, 'Paritätsmatrix enthält 1.044 Vergleiche');

const phpRunner = String.raw`
require 'api/rechner-engine.php';
$input = json_decode(stream_get_contents(STDIN), true);
$blank = array_fill(0, 20, '');
$sheets = ['Geräte_Katalog' => array_merge(array_fill(0, 8, $blank), $input['rows'])];
$sheets['Geräte_Katalog'][4] = ['heizstab_wolf', 9];
$sheets['Geräte_Katalog'][5] = ['heizstab_vaillant', 8.54];
$select = static function (array $case) use ($sheets, $input): array {
    $brand = $case['brand'];
    $load = $case['load'];
    $match = hw_match_catalog(
        $sheets,
        $brand,
        $load,
        $case['heizsystem'],
        -11,
        $input['heizstaebe'][$brand],
        $input['kaskadenToleranz']
    );
    return [
        'modell' => $match['modell'] ?? null,
        'anteil' => $match !== null ? round($match['leistungAuslegung'] / $load * 100, 1) : null,
    ];
};
$fixed = array_map($select, $input['fixed']);
$parity = array_map($select, $input['parity']);
$picked = hw_match_catalog(
    $sheets,
    'vaillant',
    9,
    'heizkoerper',
    -11,
    $input['heizstaebe']['vaillant'],
    $input['kaskadenToleranz']
);
$picked['brutto'] = 0;
$priceRows = [['brutto' => 0, 'eigen' => 12345, 'proklima' => 12000]];
$bandFalse = hw_catalog_result($picked, $priceRows, 9, 0.8);
$bandTrue = hw_catalog_result($picked, $priceRows, 9, 0.7);
$reorderedDimension = [
    ['schluessel', 'wert'],
    ['sollband_oben', 0.81],
    ['beliebiger_neuer_eintrag', 99],
    ['kaskaden_toleranz_kw', 0.37],
];
$dimension = hw_read_kv(['Dimensionierung' => $reorderedDimension], 'Dimensionierung');
echo json_encode([
    'fixed' => $fixed,
    'parity' => $parity,
    'bandFalse' => $bandFalse,
    'bandTrue' => $bandTrue,
    'keyedTolerance' => hw_get_num($dimension, 'kaskaden_toleranz_kw', 0.5),
    'fallbackTolerance' => hw_get_num([], 'kaskaden_toleranz_kw', 0.5),
    'fallbackUpperBand' => hw_get_num([], 'sollband_oben', 0.8),
    'catalogParameters' => hw_read_kv($sheets, 'Geräte_Katalog'),
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
`;

const php = spawnSync('php', ['-r', phpRunner], {
  input: JSON.stringify({
    rows: geraeteKatalogZeilen,
    heizstaebe,
    kaskadenToleranz,
    fixed: sollfaelle.map(([, brand, load, heizsystem]) => ({ brand, load, heizsystem })),
    parity: parityCases,
  }),
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024,
});
assert.equal(php.status, 0, php.stderr);
const phpResults = JSON.parse(php.stdout);
assert.equal(
  phpResults.catalogParameters.heizstab_wolf,
  9,
  'PHP liest den Wolf-Heizstab über den Schlüsselnamen im Geräte-Katalog'
);
assert.equal(
  phpResults.catalogParameters.heizstab_vaillant,
  8.54,
  'PHP liest den Vaillant-Heizstab über den Schlüsselnamen im Geräte-Katalog'
);

for (const [
  index,
  [id, brand, load, heizsystem, expectedModel, expectedShare],
] of sollfaelle.entries()) {
  const apps = appsSelection(brand, load, heizsystem);
  const phpResult = phpResults.fixed[index];
  assert.deepEqual(apps, { modell: expectedModel, anteil: expectedShare }, `Apps Script ${id}`);
  assert.deepEqual(phpResult, { modell: expectedModel, anteil: expectedShare }, `PHP ${id}`);
}

for (const [index, testCase] of parityCases.entries()) {
  const apps = appsSelection(testCase.brand, testCase.load, testCase.heizsystem);
  assert.deepEqual(phpResults.parity[index], apps, `Kernparität ${JSON.stringify(testCase)}`);
}

console.log('PHP-Kern, fünf Kontrollwerte bei minus 11,0 Grad:');
for (const index of [1, 5, 6, 8, 9]) {
  const [, , load, heizsystem] = sollfaelle[index];
  const result = phpResults.fixed[index];
  console.log(
    `${load.toFixed(1)} kW, ${heizsystem}: ${result.modell}, ${result.anteil.toFixed(1)} Prozent`
  );
}

const priceLess = {
  ...appsScript.matchCatalog_('vaillant', 9, 'heizkoerper', -11, 8.54, kaskadenToleranz),
  brutto: 0,
};
const priceRows = [{ brutto: 0, eigen: 12345, proklima: 12000 }];
const appsBandFalse = appsScript.catalogResult_(priceLess, priceRows, 9, 0.8);
const appsBandTrue = appsScript.catalogResult_(priceLess, priceRows, 9, 0.7);
for (const [engine, bandFalse, bandTrue] of [
  ['Apps Script', appsBandFalse, appsBandTrue],
  ['PHP', phpResults.bandFalse, phpResults.bandTrue],
]) {
  assert.equal(bandFalse.eigenanteil, null, `${engine}: Nullpreis wird nicht gematcht`);
  assert.equal(
    bandFalse.ueberSollband,
    false,
    `${engine}: 74,1 Prozent liegt nicht über 80 Prozent`
  );
  assert.equal(bandTrue.ueberSollband, true, `${engine}: 74,1 Prozent liegt über 70 Prozent`);
}

assert.doesNotMatch(codeGs, /KASKADEN_TOLERANZ_KW/);
const phpEngine = fs.readFileSync('api/rechner-engine.php', 'utf8');
assert.doesNotMatch(phpEngine, /\+\s*0\.5\s*>=\s*\$auslegung/);
assert.doesNotMatch(codeGs, /Dimensionierung[^\n]*75|B75/);
assert.doesNotMatch(phpEngine, /Dimensionierung[^\n]*75|B75/);
assert.match(codeGs, /getNum_\(d, 'kaskaden_toleranz_kw', 0\.5\)/);
assert.match(phpEngine, /hw_get_num\(\$d, 'kaskaden_toleranz_kw', 0\.5\)/);

const originalGetCatalog = appsScript.getCatalog_;
function withCatalog(items, callback) {
  appsScript.getCatalog_ = function () {
    return items;
  };
  try {
    callback();
  } finally {
    appsScript.getCatalog_ = originalGetCatalog;
  }
}

const syntheticSingle = {
  marke: 'vaillant',
  modell: 'Einzel zuerst',
  kaskade: false,
  leistungW35: 7,
  leistungW55: 7,
  leistungW35a10: 7,
  leistungW55a10: 7,
  grenzeW35: 10,
  grenzeW55: 10,
  grenzeW35a10: 10,
  grenzeW55a10: 10,
  baureihe: 'Testreihe',
  mindestAnteil: 0.7,
};
const syntheticCascade = {
  ...syntheticSingle,
  modell: 'Kaskade',
  kaskade: true,
  leistungW35: 8,
  leistungW55: 8,
  leistungW35a10: 8,
  leistungW55a10: 8,
};
withCatalog([syntheticSingle, syntheticCascade], () => {
  assert.equal(
    appsScript.matchCatalog_('vaillant', 10.5, 'heizkoerper', -11, 8.54, 0.5),
    null,
    'Kaskade bleibt bis einschließlich Einzelgrenze plus Toleranz gesperrt'
  );
  assert.equal(
    appsScript.matchCatalog_('vaillant', 10.6, 'heizkoerper', -11, 8.54, 0.5).modell,
    'Kaskade',
    'Kaskade öffnet erst oberhalb der Einzelgrenze plus Toleranz'
  );
});
withCatalog([syntheticCascade], () => {
  assert.equal(
    appsScript.matchCatalog_('vaillant', 12, 'heizkoerper', -11, 8.54, 0.5),
    null,
    'Kaskade ohne Einzelmaschine derselben Baureihe bleibt gesperrt'
  );
});
withCatalog(
  [
    { ...syntheticSingle, modell: 'Erste Blattzeile', leistungW55: 8 },
    { ...syntheticSingle, modell: 'Zweite Blattzeile', leistungW55: 8 },
  ],
  () => {
    assert.equal(
      appsScript.matchCatalog_('vaillant', 9, 'heizkoerper', -11, 8.54, 0.5).modell,
      'Erste Blattzeile',
      'Bei gleicher Leistung gewinnt die frühere Blattzeile'
    );
  }
);

const rowWithoutMinimum = geraeteKatalogZeilen[0].slice();
rowWithoutMinimum[19] = '';
assert.equal(
  buildAppsScript([rowWithoutMinimum]).sandbox.getCatalog_()[0].mindestAnteil,
  0.7,
  'Leere Spalte T fällt auf 0,7 zurück'
);

const reorderedDimensionRows = [
  ['schluessel', 'wert'],
  ['sollband_oben', 0.81],
  ['beliebiger_neuer_eintrag', 99],
  ['kaskaden_toleranz_kw', 0.37],
];
const dimensionSpreadsheet = {
  getSheetByName(name) {
    assert.equal(name, 'Dimensionierung');
    return { getDataRange: () => ({ getValues: () => reorderedDimensionRows }) };
  },
};
const reorderedParameters = appsScript.readKv_(dimensionSpreadsheet, 'Dimensionierung');
assert.equal(
  appsScript.getNum_(reorderedParameters, 'kaskaden_toleranz_kw', 0.5),
  0.37,
  'Apps Script: Toleranz folgt dem Schlüsselnamen trotz verschobener Zeile'
);
assert.equal(
  phpResults.keyedTolerance,
  0.37,
  'PHP: Toleranz folgt dem Schlüsselnamen trotz verschobener Zeile'
);
assert.equal(
  appsScript.getNum_({}, 'kaskaden_toleranz_kw', 0.5),
  0.5,
  'Apps Script: Fehlende Toleranz fällt auf 0,5 zurück'
);
assert.equal(phpResults.fallbackTolerance, 0.5, 'PHP: Fehlende Toleranz fällt auf 0,5 zurück');
assert.equal(
  appsScript.getNum_({}, 'sollband_oben', 0.8),
  0.8,
  'Apps Script: Fehlende Sollband-Obergrenze fällt auf 0,8 zurück'
);
assert.equal(phpResults.fallbackUpperBand, 0.8, 'PHP: Sollband-Obergrenze fällt auf 0,8 zurück');

console.log(
  'PASS Geräteauswahl: 19 Sollfälle je Kern, 1.044 Paritätsvergleiche, Sollband und Nullpreis.'
);
