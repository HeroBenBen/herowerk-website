/**
 * Verbrauchspfad an Vaillant angeglichen, GF-Entscheid vom 19.08.2026, 11:54 Uhr
 * (_Entscheidungen/2026-08-19_Heizlast-an-Vaillant-angleichen_HERO.md, Vorgang T555).
 *
 * WAS DIESER TEST PRUEFT, in drei Stufen:
 *   1. Kennt der Kunde seinen Jahresverbrauch, ist die Heizlast der ROHE Verbrauch geteilt durch
 *      die Volllaststunden. Kein Kesselwirkungsgrad, kein Warmwasser-Abzug.
 *   2. Die zwoelf Szenarien des Doppellaufs vom 18.08.2026 treffen jetzt die Vaillant-Zahl.
 *      Vorher lagen wir 16,9 bis 24,4 Prozent darunter.
 *   3. DER FLAECHENPFAD BLEIBT UNVERAENDERT. Er ist ausdruecklich NICHT mitentschieden
 *      (Vorgang T320 steht auf on_hold).
 *
 * Herkunft der Sollwerte: _Agent-Work/2026-08-18_Doppellauf-drei-Strecken/
 * B_heizlast_verbrauchswertverfahren.csv, Spalte vaillant_heizlast_kW, am Vaillant-Werkzeug
 * gemessen. Die Spalte rest_kW derselben Messung weist einen unerklaerten Rest von hoechstens
 * 0,11 kW aus; die Toleranz dieses Tests ist genau dieser Rest.
 *
 * Warmwasser steht in allen zwoelf Faellen auf nein, damit die Rueckgabe bedarf die reine Heizlast
 * traegt und nicht die Warmwasser-Zapflast. Genau so lief auch der Vaillant-Lauf, seine Abfrage
 * trug dhw_generation=separate und dhw_power_requirement=0.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import vm from 'node:vm';

const codeGs = fs.readFileSync('apps-script/rechner-backend/Code.gs', 'utf8');

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
    spez_bedarf_vor1978: 180, spez_bedarf_1978_1994: 140,
    spez_bedarf_1995_2010: 100, spez_bedarf_nach2010: 60,
    sollband_oben: 0.8, kaskaden_toleranz_kw: 0.5
  } }; };
  getKlimaPlz_ = function () { return { '*': { nat: -11, volllast: 1800 } }; };
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
echo json_encode(hw_rechner_route('dimensionierung', $query, $sheets), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
`;

function php(query) {
  const r = spawnSync('php', ['-r', phpRunner], { input: JSON.stringify(query), encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
}
const gs = (query) => JSON.parse(JSON.stringify(appsScript.dimensionierung_(query)));

const basis = {
  flaeche: 0,
  gebaeude: 'efh',
  sanierung: 'nein',
  verbrauchKnown: 'known',
  einheit: 'm3',
  heizung: 'gas',
  abgasrohr: 'kunststoff',
  heizungsalter: '1990-2010',
  warmwasser: 'nein',
  heizsystem: 'heizkoerper',
  personen: 4,
  plz: '99999',
};

// nummer, Jahresverbrauch in m3 Gas, gemessene Vaillant-Heizlast in kW
const szenarien = [
  ['S1', 3200, 17.8],
  ['S2', 2400, 13.4],
  ['S3', 4600, 25.6],
  ['S4', 3400, 18.9],
  ['S5', 2200, 12.3],
  ['S6', 2600, 14.5],
  ['S7', 2100, 11.7],
  ['S8', 1400, 7.8],
  ['S9', 2600, 14.5],
  ['S10', 2100, 11.7],
  ['S11', 5200, 29.0],
  ['S12', 4800, 26.7],
];
const TOLERANZ = 0.11; // groesster Rest der Messung vom 18.08.2026, Spalte rest_kW

let groessteAbweichung = 0;
for (const [nummer, m3, vaillant] of szenarien) {
  const q = { ...basis, verbrauch: m3, baujahr: '1958-1968' };
  const p = php(q).bedarf;
  const g = gs(q).bedarf;
  assert.equal(p, g, `${nummer}: PHP und Apps Script muessen dieselbe Zahl liefern`);
  const soll = Math.round(((m3 * 10) / 1800) * 10) / 10;
  assert.equal(p, soll, `${nummer}: Heizlast muss roher Verbrauch durch Volllaststunden sein`);
  const abweichung = Math.abs(p - vaillant);
  groessteAbweichung = Math.max(groessteAbweichung, abweichung);
  assert.ok(
    abweichung <= TOLERANZ + 1e-9,
    `${nummer}: ${p} kW gegen Vaillant ${vaillant} kW, Abweichung ${abweichung.toFixed(2)} kW`
  );
}

// Der Verbrauchspfad darf nicht mehr am Kesselwirkungsgrad und nicht mehr an der Personenzahl haengen.
const referenz = php({ ...basis, verbrauch: 3200, baujahr: '1958-1968' }).bedarf;
for (const abwandlung of [
  { abgasrohr: 'metall', heizungsalter: 'vor1990' }, // Wirkungsgrad 0,70 statt 0,86
  { heizung: 'oel', abgasrohr: 'kunststoff' }, // Wirkungsgrad 0,90
  { personen: 1 },
  { personen: 8 },
]) {
  const q = { ...basis, verbrauch: 3200, baujahr: '1958-1968', ...abwandlung };
  assert.equal(
    php(q).bedarf,
    referenz,
    `Verbrauchspfad haengt noch an ${JSON.stringify(abwandlung)}`
  );
  assert.equal(
    gs(q).bedarf,
    referenz,
    `Apps Script: Verbrauchspfad haengt noch an ${JSON.stringify(abwandlung)}`
  );
}

// AUSNAHME BESTEHENDE WAERMEPUMPE: dort ist der abgelesene Wert Strom und der Faktor eine
// Jahresarbeitszahl ueber 1 (jaz_bestand_waermepumpe = 2,8, GF-Entscheid 19.08.2026). Sie bleibt erhalten, sonst wuerde
// Strom als Waerme gerechnet und das Haus um den Faktor 2,8 zu klein ausgelegt.
const bestandsWp = {
  ...basis,
  einheit: 'kwh',
  heizung: 'sonst',
  andere_heizung: 'waermepumpe',
  verbrauch: 5000,
  baujahr: '1958-1968',
};
assert.equal(
  php(bestandsWp).bedarf,
  7.8,
  'bestehende Waermepumpe: 5.000 kWh mal 2,8 durch 1.800 gleich 7,8 kW'
);
assert.equal(gs(bestandsWp).bedarf, 7.8, 'Apps Script: bestehende Waermepumpe');
assert.notEqual(
  php(bestandsWp).bedarf,
  2.8,
  'der rohe Stromwert waere 2,8 kW und damit grob unterdimensioniert'
);

// FLAECHENPFAD UNVERAENDERT: die drei Sollwerte des Baujahres 1960 aus der bestehenden
// Sanierungs-Regression, 140 Quadratmeter Einfamilienhaus, Warmwasser nein.
const flaeche = {
  ...basis,
  verbrauchKnown: 'unknown',
  verbrauch: 0,
  flaeche: 150,
  personen: 2,
  baujahr: '1958-1968',
};
for (const [sanierung, soll] of [
  ['nein', 15.0],
  ['teilweise', 11.7],
  ['umfassend', 8.3],
]) {
  const q = { ...flaeche, sanierung };
  assert.equal(php(q).bedarf, soll, `Flaechenpfad 1960 ${sanierung} muss ${soll} kW bleiben`);
  assert.equal(
    gs(q).bedarf,
    soll,
    `Apps Script: Flaechenpfad 1960 ${sanierung} muss ${soll} kW bleiben`
  );
}

console.log(
  `PASS Verbrauchspfad an Vaillant angeglichen: 12 Szenarien, groesste Abweichung ` +
    `${groessteAbweichung.toFixed(2)} kW; 4 Gegenproben ohne Wirkungsgrad- und Personenabhaengigkeit; ` +
    `Flaechenpfad 1960 unveraendert bei 15,0 / 11,7 / 8,3 kW.`
);
