/**
 * Abnahme des bauteilweisen Flaechenwegs, beide Rechenkerne gegen dieselbe Messung.
 *
 * Gemessen am 09.09.2026 am Heizlastrechner des Bundesverbands Waermepumpe, bauteilweises
 * Verfahren, durch systematisches Rechnenlassen ueber dessen eigene Schnittstelle. Messreihe,
 * Gegenprobe und die vier Maengel der Quelle in
 * 11_Produkt/reference_bwp_bauteilweise_basiswerte_HERO.md des Vaults.
 *
 * Der Sollwert ist die auf ganze Watt je Quadratmeter GERUNDETE Anzeige des Verbands; unsere
 * Rechnung ist die ungerundete. Die Toleranz ist deshalb relativ und betraegt ein Prozent,
 * nicht ein fester Kilowatt-Betrag. Ueber die acht vermessenen Orte lag die Rundungsspreizung
 * bei 0,6 Prozent.
 *
 * Aufruf:   node tests/flaechenweg/abnahme_flaechenweg.js
 * Einzeln:  node tests/flaechenweg/abnahme_flaechenweg.js --sabotage=<name>
 *
 * Der Rot-Nachweis laeuft in BEIDE Richtungen: ohne Sabotage muss jeder Fall gruen sein, und
 * jede Sabotage muss mindestens einen Fall rot faerben. Eine Sabotage, die gruen bleibt, belegt
 * eine Luecke in der Pruefstrecke und laesst den Lauf scheitern.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const WURZEL = path.resolve(__dirname, '..', '..');
const GS = path.join(WURZEL, 'apps-script', 'rechner-backend', 'Code.gs');
const PHP = path.join(WURZEL, 'api', 'rechner-engine.php');

const arg = process.argv.find((a) => a.startsWith('--sabotage='));
const SABOTAGE = arg ? arg.split('=')[1] : '';

function ladeGs() {
  const src = fs.readFileSync(GS, 'utf8');
  const teile = ['bwpBasis_', 'bwpErsparnis_', 'bwpKlasse_', 'flaechenHeizlast_']
    .map((name) => {
      const treffer = src.match(new RegExp('function ' + name + '\\([\\s\\S]*?\\n}\\n'));
      if (!treffer) throw new Error('Funktion ' + name + ' nicht in Code.gs gefunden');
      return treffer[0];
    })
    .join('\n');
  const sandbox = {};
  new Function('exports', teile + '\nexports.f = flaechenHeizlast_;')(sandbox);
  return sandbox;
}

function phpWert(klasse, bauteile, flaeche, nat) {
  const eingabe = JSON.stringify({ klasse, bauteile, flaeche, nat });
  const code = [
    '$src = file_get_contents(' + JSON.stringify(PHP) + ');',
    "foreach (['hw_bwp_basis','hw_bwp_ersparnis','hw_bwp_klasse','hw_flaechen_heizlast'] as $fn) {",
    "  if (!preg_match('/function '.$fn.'\\(.*?\\n}\\n/s', $src, $m)) { fwrite(STDERR, 'fehlt: '.$fn); exit(2); }",
    '  eval($m[0]);',
    '}',
    '$in = json_decode(' + JSON.stringify(eingabe) + ', true);',
    "echo hw_flaechen_heizlast($in['klasse'], (array)$in['bauteile'], (float)$in['flaeche'], (float)$in['nat'], 1.0);",
  ].join('\n');
  return Number(execFileSync('php', ['-r', code], { encoding: 'utf8' }));
}

const FAELLE = [
  [
    'Bauauftrag A.6 Fall 1: 1958-1968, 200 qm, Dach und Fenster ueblich',
    '1958-1968',
    { dach: 2, fenster: 2 },
    200,
    -11.1,
    21.8,
  ],
  ['Bauauftrag A.6 Fall 2: 1958-1968, 140 qm, unsaniert', '1958-1968', {}, 140, -11.1, 19.04],
  ['bis1918 unsaniert, Messung 153 W/m2', 'bis1918', {}, 200, -11.1, 30.6],
  ['1919-1948 unsaniert, Messung 115', '1919-1948', {}, 200, -11.1, 23.0],
  ['1949-1957 unsaniert, Messung 145', '1949-1957', {}, 200, -11.1, 29.0],
  ['1958-1968 unsaniert, Messung 136', '1958-1968', {}, 200, -11.1, 27.2],
  ['1969-1978 unsaniert, Messung 98', '1969-1978', {}, 200, -11.1, 19.6],
  ['1979-1983 unsaniert, Messung 62', '1979-1983', {}, 200, -11.1, 12.4],
  ['1984-1994 unsaniert, Messung 75', '1984-1994', {}, 200, -11.1, 15.0],
  ['1995-2001 unsaniert, Messung 56', '1995-2001', {}, 200, -11.1, 11.2],
  ['2002-2009 unsaniert, Messung 43', '2002-2009', {}, 200, -11.1, 8.6],
  ['2010-2015 unsaniert, Messung 47', '2010-2015', {}, 200, -11.1, 9.4],
  ['ab2016 unsaniert, Messung 38', 'ab2016', {}, 200, -11.1, 7.6],
  ['Abgeloeste Karte 1995-2010 bleibt lesbar, Lead-Strecke', '1995-2010', {}, 200, -11.1, 11.2],
  ['Abgeloeste Karte nach2010 bleibt lesbar, Lead-Strecke', 'nach2010', {}, 200, -11.1, 9.4],
  ['Ort Flensburg, 1958-1968 unsaniert, Messung 121', '1958-1968', {}, 200, -7.5, 24.2],
  ['Ort Oberstdorf, 1958-1968 unsaniert, Messung 161', '1958-1968', {}, 200, -16.7, 32.2],
  ['Ort Hamburg, 1958-1968 unsaniert, Messung 124', '1958-1968', {}, 200, -8.2, 24.8],
  ['Wand tiefgreifend bis1918, Messung 153 minus 84', 'bis1918', { wand: 3 }, 200, -11.1, 13.8],
  ['Dach tiefgreifend 1949-1957, Messung 145 minus 44', '1949-1957', { dach: 3 }, 200, -11.1, 20.2],
  [
    'Alle vier tiefgreifend 1958-1968',
    '1958-1968',
    { dach: 3, fenster: 3, wand: 3, boden: 3 },
    200,
    -11.1,
    7.8,
  ],
  [
    'Negativklemme Dach 1995-2001: Sanierung darf nicht verschlechtern',
    '1995-2001',
    { dach: 2 },
    200,
    -11.1,
    11.2,
  ],
  ['Negativklemme Dach 2002-2009', '2002-2009', { dach: 2 }, 200, -11.1, 8.6],
  ['Unbekannte Klasse faellt auf 1958-1968 zurueck', 'quatsch', {}, 200, -11.1, 27.2],
];

const TOLERANZ = 0.01;

const SABOTAGEN = {
  'basis-klasse-verschoben': (w) => (w.klasse === '1949-1957' ? { ...w, klasse: '1919-1948' } : w),
  'karte-nicht-abgebildet': (w) => (w.klasse === '1995-2010' ? { ...w, klasse: '1958-1968' } : w),
  'ort-ignoriert': (w) => ({ ...w, nat: -11.1 }),
  'bauteile-ignoriert': (w) => ({ ...w, bauteile: {} }),
  'flaeche-fest-auf-200': (w) => ({ ...w, flaeche: 200 }),
  'stufe-verwechselt': (w) => ({
    ...w,
    bauteile: Object.fromEntries(Object.entries(w.bauteile).map(([k, v]) => [k, v === 2 ? 3 : 2])),
  }),
};

function lauf(sabotageName) {
  const gs = ladeGs();
  const verbiegen = SABOTAGEN[sabotageName] || ((w) => w);
  let rot = 0;
  const zeilen = [];
  for (const [name, klasse, bauteile, flaeche, nat, soll] of FAELLE) {
    const w = verbiegen({ klasse, bauteile, flaeche, nat });
    const istGs = gs.f(w.klasse, w.bauteile, w.flaeche, w.nat, 1.0);
    const istPhp = phpWert(w.klasse, w.bauteile, w.flaeche, w.nat);
    const gleich = Math.abs(istGs - istPhp) < 1e-9;
    const trifft = Math.abs(istGs - soll) / soll <= TOLERANZ;
    const ok = gleich && trifft;
    if (!ok) rot++;
    zeilen.push(
      (ok ? '  gruen ' : '  ROT   ') +
        name.padEnd(58).slice(0, 58) +
        ' Soll ' +
        soll.toFixed(2).padStart(6) +
        ' AppsScript ' +
        istGs.toFixed(3).padStart(7) +
        ' PHP ' +
        istPhp.toFixed(3).padStart(7) +
        (gleich ? '' : '  KERNE WEICHEN AB')
    );
  }
  return { rot, zeilen };
}

if (SABOTAGE) {
  if (!SABOTAGEN[SABOTAGE]) {
    console.error('Unbekannte Sabotage. Bekannt: ' + Object.keys(SABOTAGEN).join(', '));
    process.exit(2);
  }
  const { rot, zeilen } = lauf(SABOTAGE);
  console.log(zeilen.join('\n'));
  console.log('\nSabotage "' + SABOTAGE + '": ' + rot + ' von ' + FAELLE.length + ' Faellen rot.');
  if (rot === 0) {
    console.error('FEHLER: die Sabotage bleibt gruen. Die Pruefstrecke misst diese Stelle nicht.');
    process.exit(1);
  }
  process.exit(0);
}

const { rot, zeilen } = lauf('');
console.log(zeilen.join('\n'));
console.log('\nOhne Sabotage: ' + (FAELLE.length - rot) + ' von ' + FAELLE.length + ' gruen.');
let fehler = rot;

// Zweite Strecke: die Zuordnung eines frei eingegebenen Baujahrs zur Klasse, in BEIDEN Kernen.
// Jedes Grenzjahr ist am 09.09.2026 einzeln am Werkzeug des Bundesverbands gemessen worden.
const GRENZJAHRE = [
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
  [1995, '1995-2001'],
  [2001, '1995-2001'],
  [2002, '2002-2009'],
  [2009, '2002-2009'],
  [2010, '2010-2015'],
  [2015, '2010-2015'],
  [2016, 'ab2016'],
  [2026, 'ab2016'],
];

function klassePhp(jahr) {
  const code = [
    '$src = file_get_contents(' + JSON.stringify(PHP) + ');',
    "preg_match('/function hw_js_string.*?\\n}\\n/s', $src, $a); eval($a[0]);",
    "preg_match('/function hw_baujahr_klasse.*?\\n}\\n/s', $src, $m); eval($m[0]);",
    'echo hw_baujahr_klasse("' + jahr + '");',
  ].join('\n');
  return execFileSync('php', ['-r', code], { encoding: 'utf8' }).trim();
}

function klasseGs(jahr) {
  const src = fs.readFileSync(GS, 'utf8');
  const m = src.match(/function baujahrKlasse_\([\s\S]*?\n}\n/);
  const box = {};
  new Function('exports', m[0] + '\nexports.k = baujahrKlasse_;')(box);
  return box.k(String(jahr));
}

console.log('\nKlassenzuordnung an den 21 gemessenen Grenzjahren:');
let klassenFehler = 0;
for (const [jahr, soll] of GRENZJAHRE) {
  const php = klassePhp(jahr);
  const gs = klasseGs(jahr);
  if (php !== soll || gs !== soll) {
    klassenFehler++;
    console.log('  ROT   ' + jahr + ' Soll ' + soll + ' PHP ' + php + ' AppsScript ' + gs);
  }
}
console.log(
  '  ' + (GRENZJAHRE.length - klassenFehler) + ' von ' + GRENZJAHRE.length + ' gruen, beide Kerne.'
);
fehler += klassenFehler;
console.log('\nRot-Nachweis, Gegenrichtung:');
for (const name of Object.keys(SABOTAGEN)) {
  const r = lauf(name).rot;
  const faengt = r > 0;
  if (!faengt) fehler++;
  console.log('  ' + (faengt ? 'faengt ' : 'BLIND  ') + name.padEnd(28) + r + ' Faelle rot');
}
console.log(
  fehler === 0
    ? '\nABNAHME GRUEN, und jede Sabotage wird gefangen.'
    : '\nABNAHME ROT: ' + fehler + ' Befunde.'
);
process.exit(fehler === 0 ? 0 : 1);
