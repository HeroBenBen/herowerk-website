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
  parameterRows[7] = [
    'Marke',
    'Modell',
    'Kaskade',
    'WP NAT W35',
    'WP NAT W55',
    '',
    '',
    'Auslegungsgrenze W35 (WP÷0,80)',
    'Auslegungsgrenze W55 (WP÷0,80)',
    '',
    'Brutto €',
    'Stand',
    '',
    'Auslegungsgrenze W35 @A-10',
    'Auslegungsgrenze W55 @A-10',
    '',
    'WP NAT W35 @A-10',
    'WP NAT W55 @A-10',
    'Baureihe',
    'Mindest-Leistungsanteil',
  ];
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
assert(cache.has('catalog:v3'), 'Apps Script schreibt catalog:v3');
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
$sheets['Geräte_Katalog'][7] = ['Marke','Modell','Kaskade','WP NAT W35','WP NAT W55','','','Auslegungsgrenze W35 (WP÷0,80)','Auslegungsgrenze W55 (WP÷0,80)','','Brutto €','Stand','','Auslegungsgrenze W35 @A-10','Auslegungsgrenze W55 @A-10','','WP NAT W35 @A-10','WP NAT W55 @A-10','Baureihe','Mindest-Leistungsanteil'];
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
$varianten = hw_match_catalog_varianten($sheets, 'vaillant', 9, 'heizkoerper', -11, $input['heizstaebe']['vaillant'], $input['kaskadenToleranz']);
$punkte = [
    ['temperatur' => -10, 'volllast' => 6, 'mindest' => 3],
    ['temperatur' => 0, 'volllast' => 6, 'mindest' => 3],
    ['temperatur' => 10, 'volllast' => 6, 'mindest' => 3],
];
$context = ['kennlinien' => ['test' => ['55' => $punkte]], 'nat' => -10, 'heizgrenze' => 10, 'heizsystem' => 'heizkoerper'];
$single = ['modell' => 'Vaillant Test', 'kaskade' => false];
$cascade = ['modell' => '2× Vaillant Test (Kaskade)', 'kaskade' => true];
$dimensionSheets = $sheets + [
    'Dimensionierung' => [['schluessel','wert'],['volllaststunden',1800],['taktpunkt_grenze_c',2],['sollband_oben',0.8],['kaskaden_toleranz_kw',0.5]],
    'Klima_PLZ' => [['PLZ','Ort','NAT_C','Volllaststunden'],['30159','Hannover',-11,1800]],
    'Preise_Wolf' => [['Klasse','Modell','Endpreis_brutto']],
    'Preise_Vaillant' => [['Klasse','Modell','Endpreis_brutto']],
];
$driverQuery = ['verbrauchKnown'=>'known','verbrauch'=>20000,'einheit'=>'kwh','warmwasser'=>'nein','heizsystem'=>'heizkoerper','plz'=>'30159','heizung'=>'gas','abgasrohr'=>'unklar'];
$driver2 = hw_dimensionierung($driverQuery, $dimensionSheets);
$dimensionSheets['Dimensionierung'][2][1] = 9;
$driver9 = hw_dimensionierung($driverQuery, $dimensionSheets);
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
    'varianten' => array_map(static fn (array $item): array => ['baureihe' => $item['baureihe'], 'leistung' => round($item['leistungAuslegung'], 4)], $varianten),
    'kennlinien' => [
        'einzelTakt' => hw_taktpunkt($single, $context, 20),
        'einzelBivalenz' => hw_bivalenzpunkt($single, $context, 20),
        'kaskadeTakt' => hw_taktpunkt($cascade, $context, 20),
        'kaskadeBivalenz' => hw_bivalenzpunkt($cascade, $context, 20),
    ],
    'driver' => ['zwei' => $driver2, 'neun' => $driver9],
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
const appsVarianten = JSON.parse(
  JSON.stringify(
    appsScript
      .matchCatalogVarianten_('vaillant', 9, 'heizkoerper', -11, 8.54, kaskadenToleranz)
      .map((item) => ({
        baureihe: item.baureihe,
        leistung: Math.round(item.leistungAuslegung * 10000) / 10000,
      }))
  )
);
assert.deepEqual(
  phpResults.varianten,
  appsVarianten,
  'Varianten je Baureihe sind in beiden Kernen gleich'
);
assert(
  appsVarianten.length >= 2,
  'Mehr als eine Vaillant-Baureihe wird ohne obere Filtergrenze geliefert'
);
assert.equal(
  new Set(appsVarianten.map((item) => item.baureihe)).size,
  appsVarianten.length,
  'Jede Baureihe erscheint genau einmal'
);
for (let index = 1; index < appsVarianten.length; index += 1) {
  assert(
    appsVarianten[index - 1].leistung <= appsVarianten[index].leistung,
    'Varianten sind nach Leistung sortiert'
  );
}
function variante(load, baureihe, brand = 'vaillant') {
  return appsScript
    .matchCatalogVarianten_(brand, load, 'heizkoerper', -11, heizstaebe[brand], kaskadenToleranz)
    .find((item) => item.baureihe === baureihe);
}
assert.equal(
  variante(13, 'aroTHERM plus 8.1').modell,
  'Vaillant VWL 105/8.1 A',
  'P1: plus bei 13 kW'
);
assert.equal(
  variante(13, 'aroTHERM pro 7.1').modell,
  'Vaillant VWL 115/7.1 A',
  'P1: pro bei 13 kW'
);
assert.equal(
  variante(9, 'aroTHERM perform 8.1').modell,
  'Vaillant VWL 205/8.1 A S2 Q',
  'P2: perform bleibt bei 209,1 Prozent in der Liste'
);
assert.equal(
  variante(17, 'aroTHERM plus 8.1').modell,
  '2× Vaillant VWL 75/8.1 A (Kaskade)',
  'P3: Kaskaden-Heizstab wirkt bei 17 kW'
);
assert.equal(
  variante(25, 'aroTHERM plus 8.1').modell,
  '2× Vaillant VWL 105/8.1 A (Kaskade)',
  'P4: zwei Außengeräte bei 25 kW'
);
assert.equal(
  variante(28, 'Wolf CHA', 'wolf').modell,
  '2× Wolf CHA-16/20 (Kaskade)',
  'P6: Wolf bleibt bei 28 kW monovalent'
);
const testPunkte = [
  { temperatur: -10, volllast: 6, mindest: 3 },
  { temperatur: 0, volllast: 6, mindest: 3 },
  { temperatur: 10, volllast: 6, mindest: 3 },
];
const testContext = {
  kennlinien: { test: { 55: testPunkte } },
  nat: -10,
  heizgrenze: 10,
  heizsystem: 'heizkoerper',
};
const appsKennlinien = {
  einzelTakt: appsScript.taktpunkt_({ modell: 'Vaillant Test', kaskade: false }, testContext, 20),
  einzelBivalenz: appsScript.bivalenzpunkt_(
    { modell: 'Vaillant Test', kaskade: false },
    testContext,
    20
  ),
  kaskadeTakt: appsScript.taktpunkt_(
    { modell: '2× Vaillant Test (Kaskade)', kaskade: true },
    testContext,
    20
  ),
  kaskadeBivalenz: appsScript.bivalenzpunkt_(
    { modell: '2× Vaillant Test (Kaskade)', kaskade: true },
    testContext,
    20
  ),
};
assert.deepEqual(
  phpResults.kennlinien,
  appsKennlinien,
  'Takt- und Bivalenzpunkte sind in beiden Kernen gleich'
);
assert.equal(
  appsKennlinien.einzelTakt,
  7,
  'Einzelgerät nutzt ausschließlich die echte Mindestleistungskurve'
);
assert.equal(
  appsScript.taktpunkt_(
    { modell: 'Vaillant Test', kaskade: false },
    {
      ...testContext,
      kennlinien: { test: { 55: testPunkte.map((punkt) => ({ ...punkt, mindest: null })) } },
    },
    20
  ),
  null,
  'Einzelgerät ohne echte Mindestleistungsdaten erhält keinen Taktpunkt'
);
assert.equal(appsKennlinien.kaskadeTakt, null, 'Kaskaden-Taktpunkt bleibt bis T505 leer');
assert.equal(appsKennlinien.einzelBivalenz, 4, 'Einzelgerät nutzt eine Volllastkurve');
assert.equal(
  appsKennlinien.kaskadeBivalenz,
  -2,
  'Kaskaden-Volllast wird mit der Gerätezahl skaliert'
);
assert.equal(
  phpResults.driver.zwei.taktpunkt_grenze_c,
  2,
  'PHP liest den wirkungslosen Treiber mit 2 °C'
);
assert.equal(
  phpResults.driver.neun.taktpunkt_grenze_c,
  9,
  'PHP liest den wirkungslosen Treiber mit 9 °C'
);
assert.equal(
  phpResults.driver.zwei.taktpunkt_grenze_wirksam,
  false,
  'PHP kennzeichnet den Treiber als wirkungslos'
);
assert.deepEqual(
  phpResults.driver.zwei.marken,
  phpResults.driver.neun.marken,
  'PHP-Auswahlliste bleibt bei 2 und 9 °C zeichengleich'
);
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
  assert.equal(bandFalse.brutto, null, `${engine}: Fehlender Preis bleibt null`);
  assert.equal(
    bandFalse.preis_hinterlegt,
    false,
    `${engine}: Fehlender Preis ist ausdrücklich gekennzeichnet`
  );
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

function appsDimensionierungMitTreiber(value) {
  appsScript.getAllParameters_ = () => ({
    dimensionierung: {
      volllaststunden: 1800,
      taktpunkt_grenze_c: value,
      sollband_oben: 0.8,
      kaskaden_toleranz_kw: 0.5,
    },
  });
  appsScript.getKlimaPlz_ = () => ({ 30159: { nat: -11, volllast: 1800 } });
  appsScript.getPriceTableCached_ = () => [];
  appsScript.getKennlinien_ = () => ({});
  return JSON.parse(
    JSON.stringify(
      appsScript.dimensionierung_({
        verbrauchKnown: 'known',
        verbrauch: 20000,
        einheit: 'kwh',
        warmwasser: 'nein',
        heizsystem: 'heizkoerper',
        plz: '30159',
        heizung: 'gas',
        abgasrohr: 'unklar',
      })
    )
  );
}
const appsDriver2 = appsDimensionierungMitTreiber(2);
const appsDriver9 = appsDimensionierungMitTreiber(9);
assert.equal(
  appsDriver2.taktpunkt_grenze_c,
  2,
  'Apps Script liest den wirkungslosen Treiber mit 2 °C'
);
assert.equal(
  appsDriver9.taktpunkt_grenze_c,
  9,
  'Apps Script liest den wirkungslosen Treiber mit 9 °C'
);
assert.equal(
  appsDriver2.taktpunkt_grenze_wirksam,
  false,
  'Apps Script kennzeichnet den Treiber als wirkungslos'
);
assert.deepEqual(
  appsDriver2.marken,
  appsDriver9.marken,
  'Apps-Script-Auswahlliste bleibt bei 2 und 9 °C zeichengleich'
);
assert.deepEqual(
  appsDriver2,
  phpResults.driver.zwei,
  'PHP- und Apps-Script-Rückgabe sind zeichengleich'
);

console.log(
  'PASS Geräteauswahl: 19 Sollfälle je Kern, 1.044 Paritätsvergleiche, Sollband und Nullpreis.'
);
