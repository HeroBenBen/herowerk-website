import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import vm from 'node:vm';

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
vm.runInContext(fs.readFileSync('apps-script/rechner-backend/Code.gs', 'utf8'), appsScript);
vm.runInContext(
  `
  getAllParameters_ = function () { return { dimensionierung: {
    spez_bedarf_vor1978: 180,
    spez_bedarf_1978_1994: 140,
    spez_bedarf_1995_2010: 100,
    spez_bedarf_nach2010: 60
  } }; };
  getKlimaPlz_ = function () { return { '30159': { nat: -10, volllast: 1800, jahresmittel: 10.9 } }; };
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

const base = {
  flaeche: 150,
  baujahr: '1958-1968',
  gebaeude: 'efh',
  verbrauchKnown: 'unknown',
  warmwasser: 'nein',
  personen: 2,
  heizsystem: 'heizkoerper',
  plz: '30159',
};

const classificationAnchors = [
  [1800, 'bis1918'],
  [1918, 'bis1918'],
  [1919, '1919-1948'],
  [1948, '1919-1948'],
  [1949, '1949-1957'],
  [1957, '1949-1957'],
  [1958, '1958-1968'],
  [1968, '1958-1968'],
  [1969, '1969-1978'],
  [1978, '1969-1978'],
  [1979, '1979-1983'],
  [1983, '1979-1983'],
  [1984, '1984-1994'],
  [1994, '1984-1994'],
  [1995, '1995-2010'],
  [2010, '1995-2010'],
  [2011, 'nach2010'],
  [2026, 'nach2010'],
];

for (const [year, expected] of classificationAnchors) {
  assert.equal(appsScript.baujahrKlasse_(year), expected, `Apps Script: Baujahr ${year}`);
}
const phpClassification = spawnSync(
  'php',
  [
    '-r',
    `require 'api/rechner-engine.php'; $values=json_decode(stream_get_contents(STDIN),true); echo json_encode(array_map('hw_baujahr_klasse',$values));`,
  ],
  { input: JSON.stringify(classificationAnchors.map(([year]) => year)), encoding: 'utf8' }
);
assert.equal(phpClassification.status, 0, phpClassification.stderr);
assert.deepEqual(
  JSON.parse(phpClassification.stdout),
  classificationAnchors.map(([, expected]) => expected),
  'PHP: Grenzen der neun Baujahresklassen'
);

// Kernparität allein beweist keine fachliche Richtigkeit: erst jeden Kern gegen
// feste Wahrheitswerte prüfen, danach zusätzlich beide Implementierungen abgleichen.
const truthAnchors = [
  ['nein', 15.0],
  ['teilweise', 11.7],
  ['umfassend', 8.3],
];

for (const [sanierung, expected] of truthAnchors) {
  const query = { ...base, sanierung };
  const googleResult = JSON.parse(JSON.stringify(appsScript.dimensionierung_(query)));
  const php = spawnSync('php', ['-r', phpRunner], {
    input: JSON.stringify(query),
    encoding: 'utf8',
  });
  assert.equal(php.status, 0, php.stderr);
  const phpResult = JSON.parse(php.stdout);

  assert.equal(phpResult.bedarf, expected, `PHP: Sanierung ${sanierung}`);
  assert.equal(googleResult.bedarf, expected, `Apps Script: Sanierung ${sanierung}`);
  assert.deepEqual(googleResult, phpResult, `Kernparität: Sanierung ${sanierung}`);
}

const numericYearQuery = { ...base, baujahr: '1960', sanierung: 'teilweise' };
const googleNumericYear = JSON.parse(JSON.stringify(appsScript.dimensionierung_(numericYearQuery)));
const phpNumericYear = spawnSync('php', ['-r', phpRunner], {
  input: JSON.stringify(numericYearQuery),
  encoding: 'utf8',
});
assert.equal(phpNumericYear.status, 0, phpNumericYear.stderr);
assert.equal(JSON.parse(phpNumericYear.stdout).bedarf, 11.7, 'PHP: exaktes Baujahr 1960');
assert.equal(googleNumericYear.bedarf, 11.7, 'Apps Script: exaktes Baujahr 1960');

console.log(
  'PASS Baujahr 1800-2026 und Flächenweg 1960: unsaniert 15,0 kW, teilweise 11,7 kW, umfassend 8,3 kW'
);
