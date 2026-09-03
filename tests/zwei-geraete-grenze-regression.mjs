/**
 * T901 (03.09.2026), Entscheid 01.09.2026: hoechstens zwei Aussengeraete, alles darueber ist Sonderplanung.
 * Mechanik: Kennzeichnung im Blatt Geraete_Katalog (optionale Spalte 'Sonderplanung', Wert 'ja'). Beide Kerne
 * lesen sie und lassen gekennzeichnete Zeilen aus der Wahl; fehlt die Spalte, warnen sie (sonderplanung_kennzeichnung
 * 'fehlt' plus Hinweis) und filtern NICHT. Rot-Nachweis: Sabotage je Kern, Lauf mit --rot.
 * Aufruf: node tests/zwei-geraete-grenze-regression.mjs [--rot]
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';

import { geraeteKatalogZeilen } from './fixtures/geraete-katalog-2026-08-14.mjs';

const codeGs = fs.readFileSync('apps-script/rechner-backend/Code.gs', 'utf8');
const enginePhp = fs.readFileSync('api/rechner-engine.php', 'utf8');
const SONDERPLANUNG_KOPF = 'Sonderplanung (mehr als zwei Aussengeraete, GF 01.09.2026)';
const dreier = /^[34]×/;

function kopfzeile(mitSpalte) {
  const kopf = [
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
  if (mitSpalte) {
    while (kopf.length < 26) kopf.push('');
    kopf.push(SONDERPLANUNG_KOPF);
  }
  return kopf;
}
// Vorlage der Kennzeichnung (Spalte AA): 'ja' in den Zeilen 3x VWL 105/8.1, 3x VWL 115/7.1, 4x VWL 115/7.1, sonst leer
function blatt(mitSpalte) {
  const breite = mitSpalte ? 27 : 20;
  const leer = () => Array(breite).fill('');
  const rows = Array.from({ length: 7 }, leer);
  rows[4] = ['heizstab_wolf', 9];
  rows[5] = ['heizstab_vaillant', 8.54];
  rows.push(kopfzeile(mitSpalte));
  for (const zeile of geraeteKatalogZeilen) {
    const r = zeile.slice();
    if (mitSpalte) {
      while (r.length < 26) r.push('');
      r.push(dreier.test(String(r[1])) ? 'ja' : '');
    }
    rows.push(r);
  }
  return rows;
}
function appsScript(code, rows) {
  const sheet = {
    getLastRow: () => rows.length,
    getDataRange: () => ({ getValues: () => rows.map((r) => r.slice()) }),
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
    isFinite,
    CacheService: { getScriptCache: () => ({ get: () => null, put: () => {}, remove: () => {} }) },
    SpreadsheetApp: {
      openById: () => ({
        getSheetByName: (name) => {
          assert.equal(name, 'Geräte_Katalog');
          return sheet;
        },
      }),
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: 'Code.gs' });
  return sandbox;
}
function php(code, rows) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hw-t901-'));
  const datei = path.join(dir, 'rechner-engine.php');
  fs.writeFileSync(datei, code);
  const runner = String.raw`
require ${JSON.stringify(datei)};
$input = json_decode(stream_get_contents(STDIN), true);
$sheets = ['Geräte_Katalog' => $input['rows'],
  'Dimensionierung' => [['schluessel','wert'],['volllaststunden',1800],['sollband_oben',0.8],['kaskaden_toleranz_kw',0.5]],
  'Klima_PLZ' => [['PLZ','Ort','NAT_C','Volllaststunden'],['30159','Hannover',-11,1800]],
  'Preise_Wolf' => [['Klasse','Modell','Endpreis_brutto']], 'Preise_Vaillant' => [['Klasse','Modell','Endpreis_brutto']]];
$grid = [];
for ($z = 40; $z <= 400; $z++) { $m = hw_match_catalog($sheets, 'vaillant', $z / 10, 'heizkoerper', -11, 8.54, 0.5); $grid[] = $m['modell'] ?? null; }
$dim = hw_dimensionierung(['verbrauchKnown'=>'known','verbrauch'=>59400,'einheit'=>'kwh','warmwasser'=>'nein','heizsystem'=>'heizkoerper','plz'=>'30159','heizung'=>'gas','abgasrohr'=>'unklar'], $sheets);
echo json_encode(['gekennzeichnet' => hw_sonderplanung_gekennzeichnet($sheets), 'grid' => $grid,
  'dim' => ['bedarf' => $dim['bedarf'], 'kennzeichnung' => $dim['sonderplanung_kennzeichnung'], 'hinweise' => $dim['hinweise'], 'vaillant' => $dim['marken']['vaillant']['modell'] ?? null]], JSON_UNESCAPED_UNICODE);
`;
  const r = spawnSync('php', ['-r', runner], {
    input: JSON.stringify({ rows }),
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  fs.rmSync(dir, { recursive: true, force: true });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
}
function messen(gs, engine) {
  const out = {};
  for (const mitSpalte of [false, true]) {
    const rows = blatt(mitSpalte);
    const app = appsScript(gs, rows);
    const grid = [];
    for (let z = 40; z <= 400; z++) {
      const m = app.matchCatalog_('vaillant', z / 10, 'heizkoerper', -11, 8.54, 0.5);
      grid.push(m ? m.modell : null);
    }
    const p = php(engine, rows);
    out[mitSpalte ? 'mit' : 'ohne'] = {
      appsGekennzeichnet: app.sonderplanungGekennzeichnet_(),
      appsHinweise: app.sonderplanungHinweise_(app.sonderplanungGekennzeichnet_()),
      apps33: grid[290],
      appsDreier: grid.filter((m) => m && dreier.test(m)).length,
      appsGrid: grid,
      php: p,
    };
  }
  return out;
}
function pruefen(m) {
  const befunde = [];
  const ok = (id, b, t) => befunde.push({ id, ok: !!b, text: t });
  ok(
    'Z01',
    m.ohne.appsGekennzeichnet === false &&
      m.ohne.php.gekennzeichnet === false &&
      m.mit.appsGekennzeichnet === true &&
      m.mit.php.gekennzeichnet === true,
    'Kennzeichnung erkannt: ohne ' +
      m.ohne.appsGekennzeichnet +
      '/' +
      m.ohne.php.gekennzeichnet +
      ', mit ' +
      m.mit.appsGekennzeichnet +
      '/' +
      m.mit.php.gekennzeichnet
  );
  ok(
    'Z02',
    m.ohne.apps33 === '3× Vaillant VWL 115/7.1 A (Kaskade)' &&
      m.ohne.php.grid[290] === m.ohne.apps33 &&
      m.ohne.appsDreier > 0,
    'ohne Spalte, 33 kW: ' +
      m.ohne.apps33 +
      ' (PHP ' +
      m.ohne.php.grid[290] +
      '), Dreier/Vierer im Gitter: ' +
      m.ohne.appsDreier
  );
  ok(
    'Z03',
    m.ohne.appsHinweise.length === 1 &&
      m.ohne.php.dim.kennzeichnung === 'fehlt' &&
      m.ohne.php.dim.hinweise.length === 1 &&
      m.ohne.php.dim.hinweise[0].indexOf('Kennzeichnung Sonderplanung fehlt') === 0,
    'ohne Spalte warnt: Apps ' +
      m.ohne.appsHinweise.length +
      ' Hinweis, PHP ' +
      m.ohne.php.dim.kennzeichnung +
      ', ' +
      m.ohne.php.dim.hinweise.length +
      ' Hinweis'
  );
  ok(
    'Z04',
    m.mit.apps33 === null &&
      m.mit.php.grid[290] === null &&
      m.mit.appsDreier === 0 &&
      m.mit.php.grid.filter((x) => x && dreier.test(x)).length === 0,
    'mit Spalte, 33 kW: ' +
      (m.mit.apps33 || 'keine Loesung') +
      ' (PHP ' +
      (m.mit.php.grid[290] || 'keine Loesung') +
      '), Dreier/Vierer: ' +
      m.mit.appsDreier
  );
  ok(
    'Z05',
    m.mit.appsHinweise.length === 0 &&
      m.mit.php.dim.kennzeichnung === 'vorhanden' &&
      m.mit.php.dim.hinweise.length === 0,
    'mit Spalte kein Hinweis: PHP ' + m.mit.php.dim.kennzeichnung
  );
  const gleichOhne = m.ohne.appsGrid.filter((x, i) => x === m.ohne.php.grid[i]).length,
    gleichMit = m.mit.appsGrid.filter((x, i) => x === m.mit.php.grid[i]).length;
  ok(
    'Z06',
    gleichOhne === 361 && gleichMit === 361,
    'Gleichstand beider Kerne: ohne ' + gleichOhne + ' von 361, mit ' + gleichMit + ' von 361'
  );
  ok(
    'Z07',
    m.ohne.php.dim.bedarf === 33 &&
      m.ohne.php.dim.vaillant === '3× Vaillant VWL 115/7.1 A (Kaskade)' &&
      m.mit.php.dim.vaillant === null,
    'hw_dimensionierung 33 kW: ohne ' +
      m.ohne.php.dim.vaillant +
      ', mit ' +
      (m.mit.php.dim.vaillant || 'keine Loesung')
  );
  return befunde;
}
const SABOTAGEN = [
  {
    id: 'S01',
    kern: 'gs',
    rot: ['Z04', 'Z06'],
    was: 'Apps Script liest die Kennzeichnung, wendet sie aber nicht an',
    von: 'if (item.sonderplanung === true) return; // T901',
    nach: 'if (false) return; // T901',
  },
  {
    id: 'S02',
    kern: 'php',
    rot: ['Z04', 'Z06', 'Z07'],
    was: 'PHP liest die Kennzeichnung, wendet sie aber nicht an',
    von: "if ($item['sonderplanung'] === true) {",
    nach: 'if (false) {',
  },
  {
    id: 'S03',
    kern: 'gs',
    rot: ['Z01', 'Z03'],
    was: 'Apps Script meldet die fehlende Kennzeichnung nicht',
    von: 'return katalog.length > 0 && katalog[0].sonderplanung !== null;',
    nach: 'return true;',
  },
  {
    id: 'S04',
    kern: 'php',
    rot: ['Z01', 'Z03'],
    was: 'PHP meldet die fehlende Kennzeichnung nicht',
    von: "return $katalog !== [] && $katalog[0]['sonderplanung'] !== null;",
    nach: 'return true;',
  },
  {
    id: 'S05',
    kern: 'gs',
    rot: ['Z04', 'Z06'],
    was: 'Apps Script liest die Spalte gar nicht',
    von: "sonderplanung: kopfIndex_(table, 'Sonderplanung', true)",
    nach: 'sonderplanung: -1',
  },
];
const rot = process.argv.includes('--rot');
let fehler = 0;
const g = pruefen(messen(codeGs, enginePhp));
console.log('GRUENER LAUF');
for (const b of g) {
  if (!b.ok) fehler++;
  console.log('  ' + (b.ok ? 'GRUEN' : 'ROT  ') + ' ' + b.id + '  ' + b.text);
}
if (rot) {
  console.log('\nROT-NACHWEIS');
  for (const s of SABOTAGEN) {
    const quelle = s.kern === 'gs' ? codeGs : enginePhp;
    if (!quelle.includes(s.von)) {
      fehler++;
      console.log('  FEHLER ' + s.id + ' Sabotagestelle nicht gefunden');
      continue;
    }
    let erg;
    try {
      erg = pruefen(
        messen(
          s.kern === 'gs' ? codeGs.replace(s.von, s.nach) : codeGs,
          s.kern === 'php' ? enginePhp.replace(s.von, s.nach) : enginePhp
        )
      );
    } catch (e) {
      erg = null;
    }
    const rote = erg ? erg.filter((b) => !b.ok).map((b) => b.id) : ['<Ausnahme>'];
    const passt = erg ? s.rot.every((id) => rote.includes(id)) : true;
    if (!passt) fehler++;
    console.log(
      '  ' +
        (passt ? 'OK   ' : 'FEHLT') +
        ' ' +
        s.id +
        ' ' +
        s.was +
        ' -> rot: ' +
        rote.join(',') +
        ' (erwartet: ' +
        s.rot.join(',') +
        ')'
    );
  }
}
console.log(
  '\n' +
    (fehler
      ? 'ERGEBNIS: ' + fehler + ' Fehler'
      : 'ERGEBNIS: alles gruen' + (rot ? ', Rot-Nachweis vollstaendig' : ''))
);
process.exit(fehler ? 1 : 0);
