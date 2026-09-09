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
    spez_bedarf_nach2010: 60,
    sollband_oben: 0.8,
    kaskaden_toleranz_kw: 0.5
  } }; };
  getKlimaPlz_ = function () { return { '30159': { nat: -10, volllast: 1800, jahresmittel: 10.9 } }; };
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
    ],
    'Geräte_Katalog' => [
        array_fill(0, 20, ''), array_fill(0, 20, ''), array_fill(0, 20, ''), array_fill(0, 20, ''),
        ['heizstab_wolf', 9], ['heizstab_vaillant', 8.54], array_fill(0, 20, ''),
        ['Marke','Modell','Kaskade','WP NAT W35','WP NAT W55','','','Auslegungsgrenze W35 (WP÷0,80)','Auslegungsgrenze W55 (WP÷0,80)','','Brutto €','Stand','','Auslegungsgrenze W35 @A-10','Auslegungsgrenze W55 @A-10','','WP NAT W35 @A-10','WP NAT W55 @A-10','Baureihe','Mindest-Leistungsanteil'],
    ],
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
  // Seit dem GF-Entscheid vom 09.09.2026 folgen auch die Klassen nach 1994 dem Bundesverband.
  // Die Annahme, seine Tabelle ende bei 1994, ist am selben Tag Jahr fuer Jahr am Werkzeug
  // widerlegt worden: sie hat die Schnitte 2001, 2009 und 2015. Belege in
  // 11_Produkt/reference_bwp_bauteilweise_basiswerte_HERO.md.
  [1995, '1995-2001'],
  [2001, '1995-2001'],
  [2002, '2002-2009'],
  [2009, '2002-2009'],
  [2010, '2010-2015'],
  [2015, '2010-2015'],
  [2016, 'ab2016'],
  [2026, 'ab2016'],
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
  'PHP: Grenzen der elf Baujahresklassen'
);

// Kernparität allein beweist keine fachliche Richtigkeit: erst jeden Kern gegen
// feste Wahrheitswerte prüfen, danach zusätzlich beide Implementierungen abgleichen.
//
// DIE WAHRHEITSWERTE SIND AM 09.09.2026 NEU HERGELEITET, nicht vom geänderten Kern abgelesen.
// Bis dahin trug der Flächenweg 15,0 / 11,7 / 8,3 kW aus Jahresbedarf geteilt durch 1.800
// Vollbenutzungsstunden; dieser Weg ist aufgehoben (Entscheid 13.08.2026, seine Kennwerte sind
// Endenergie nach VDI 3807). Seit dem Bau vom 09.09.2026 rechnet der Flächenweg bauteilweise
// nach dem Bundesverband (Entscheid 12.08.2026), und die vier Bauteilangaben treiben ihn,
// nicht mehr die verdichtete Sanierungsstufe.
//
// Herleitung je Fall, gemessen am Werkzeug des Verbands bei minus 11,1 Grad, also 31,1 Kelvin,
// und hier auf die 30 Kelvin des Prüfstands umgerechnet (Rückfall-Normaußentemperatur minus 10):
//   unsaniert            136 W/m² × 30/31,1 × 150 m² / 1000 = 19,68  ->  19,7 kW
//   Dach+Fenster üblich  109 W/m² × 30/31,1 × 150 m² / 1000 = 15,77  ->  15,8 kW
//   alle vier tiefgreif.  39 W/m² × 30/31,1 × 150 m² / 1000 =  5,64  ->   5,6 kW
// Die Einzelwerte stehen in 11_Produkt/reference_bwp_bauteilweise_basiswerte_HERO.md.
const truthAnchors = [
  ['nein', { dach: 1, fenster: 1, wand: 1, boden: 1 }, 19.7],
  ['teilweise', { dach: 2, fenster: 2, wand: 1, boden: 1 }, 15.8],
  ['umfassend', { dach: 3, fenster: 3, wand: 3, boden: 3 }, 5.6],
];

for (const [sanierung, bauteile, expected] of truthAnchors) {
  const query = { ...base, sanierung, ...bauteile };
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

// Ein frei eingegebenes Baujahr muss denselben Wert liefern wie seine Klasse: 1960 liegt in
// 1958-1968, also dieselben 15,8 kW wie der zweite Wahrheitswert oben.
const numericYearQuery = {
  ...base,
  baujahr: '1960',
  sanierung: 'teilweise',
  dach: 2,
  fenster: 2,
  wand: 1,
  boden: 1,
};
const googleNumericYear = JSON.parse(JSON.stringify(appsScript.dimensionierung_(numericYearQuery)));
const phpNumericYear = spawnSync('php', ['-r', phpRunner], {
  input: JSON.stringify(numericYearQuery),
  encoding: 'utf8',
});
assert.equal(phpNumericYear.status, 0, phpNumericYear.stderr);
assert.equal(JSON.parse(phpNumericYear.stdout).bedarf, 15.8, 'PHP: exaktes Baujahr 1960');
assert.equal(googleNumericYear.bedarf, 15.8, 'Apps Script: exaktes Baujahr 1960');

console.log(
  'PASS Baujahr 1800-2026 und bauteilweiser Flächenweg 1960: unsaniert 19,7 kW, Dach und Fenster üblich 15,8 kW, alles tiefgreifend 5,6 kW'
);
