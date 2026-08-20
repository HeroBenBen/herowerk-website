/**
 * Einkommensstaffel des Foerderrechners, nach oben geschlossen (Vorgang T431, 19.08.2026).
 *
 * WOZU. Bis zum 19.08.2026 kannte der Foerderrechner nur die Grenzen 30.000, 40.000 und 50.000
 * Euro. Die vierte Klasse "ueber 50.000" war nach oben offen und fiel deshalb aus dem Grenzen-Feld
 * heraus, statt durch die Staffel zu laufen: sie lieferte IMMER null Prozent Einkommensbonus, auch
 * mit Kind. Gemessen am 19.08.2026 gegen die Live-Seite: 46 statt 56 Prozent, also 10 Prozentpunkte
 * oder 2.800 Euro auf die Bemessungsgrenze von 28.000 Euro der ersten Wohneinheit.
 * Der Kostenvergleichsrechner mit seinem stufenlosen Regler rechnete an derselben Stelle richtig.
 *
 * WAS DIESER TEST PRUEFT, in fünf Stufen:
 *   1. GLEICHLAUF DER DREI FASSUNGEN. Fuer jede Klasse mal mit und ohne Kind muessen der PHP-Kern,
 *      der Apps-Script-Rueckfall und die Richtlinienrechnung dieses Tests exakt dieselbe Zahl
 *      liefern. Der Sollwert wird hier unabhaengig aus der Staffel der Foerderperiode gerechnet
 *      und NICHT aus einer der beiden Fassungen abgeschrieben.
 *   2. GLEICHLAUF DER BEIDEN WEBSITE-RECHNER. Am oberen Rand jeder geschlossenen Klasse muss der
 *      Kostenvergleichsrechner (stufenloser Regler, hw_kv_foerder) denselben Bonus ausweisen wie
 *      der klassenbasierte Foerderrechner. Genau hier liefen beide Seiten auseinander.
 *   3. DIE STAFFEL IST NACH OBEN GESCHLOSSEN. Die Auswahl auf foerderung.html und die Klassen des
 *      Rechenkerns muessen deckungsgleich sein, und eine nach oben offene Klasse ist nur dann
 *      zulaessig, wenn ihre UNTERE Kante minus Kinderabzug bereits ueber der obersten Bonusstufe
 *      liegt. Das ist die verletzte Bedingung, die den Fehler ueberhaupt moeglich gemacht hat.
 *   4. KEINE KLASSE FAELLT AUS DER LEAD-ABBILDUNG. js/site.js bildet die Klasse auf das binaere
 *      HubSpot-Feld einkommen_unter_40k ab; eine dort fehlende Klasse wuerde still 'ka' liefern.
 *   5. BEIDE ERKLAERSTELLEN nennen dieselben sechs Auswahlklassen und deren Wirkung. Damit können
 *      Auswahl, Rechenkern und Kundentext nicht mehr getrennt voneinander geändert werden.
 *
 * ROT-NACHWEIS. Mit --rot-nachweis wird die Klassengrenze bis60 bewusst auf 70.000 Euro verstellt.
 * Der Lauf MUSS dann rot werden. Ein gruener Lauf allein belegt nichts.
 *
 * Herkunft der Zahlen: Foerderrichtlinie fuer die Bundesfoerderung fuer effiziente Gebaeude,
 * Einzelmassnahmen, des Bundesministeriums fuer Wirtschaft und Energie vom 17.07.2026,
 * Nr. 8.4.5 Abs. 3 (Staffel 40/30/10 Prozent und einmaliger Kinderabzug von 10.000 Euro) sowie
 * Nr. 8.1 und Nr. 8.5.2 Buchst. a (Zinsgrenze des Ergaenzungskredits bei 90.000 Euro).
 * Am 17.08.2026 im Volltext abgerufen und an einem zweiten amtlichen Dokument gegengeprueft.
 *
 * Start:  node tests/foerder-einkommensstaffel-regression.mjs
 *         node tests/foerder-einkommensstaffel-regression.mjs --rot-nachweis
 * Kein Netz, kein Sheet, kein Framework.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import vm from 'node:vm';

const ROT = process.argv.includes('--rot-nachweis');

// --- Apps-Script-Fassung in einer Sandbox, die jeden Sheet-Zugriff wirft.
const werfe = (was) => () => {
  throw new Error('Der Rechenkern hat ' + was + ' angefasst, er muss rein sein.');
};
const appsScript = {
  console,
  SpreadsheetApp: { openById: werfe('SpreadsheetApp') },
  CacheService: { getScriptCache: werfe('CacheService') },
  ContentService: { createTextOutput: werfe('ContentService'), MimeType: { JSON: 'JSON' } },
  Utilities: { sleep: werfe('Utilities') },
};
vm.createContext(appsScript);
vm.runInContext(fs.readFileSync('apps-script/rechner-backend/kv_engine.gs', 'utf8'), appsScript);
vm.runInContext(fs.readFileSync('apps-script/rechner-backend/Code.gs', 'utf8'), appsScript);

// --- Foerder-Parameter genau so, wie die Saat sie ins Blatt schreibt.
const F = {};
appsScript.FOERDER_ROWS_().forEach((zeile) => {
  F[zeile[0]] = zeile[1];
});
if (ROT) {
  // Sabotage NUR am Rechenkern, NICHT an der Erwartung dieses Tests: die Klasse bis 60.000 Euro
  // bekommt im Parametersatz die falsche Obergrenze 70.000 Euro. Damit liegt sie mit Kind
  // anrechenbar bei 60.000 statt 50.000 Euro und verliert die Zehn-Prozent-Stufe. Die
  // Richtlinienrechnung dieses Tests bleibt unveraendert, sonst wuerde sich der Nachweis selbst
  // mitziehen und nichts belegen.
  F.reform_eink_grenze_bis60 = 70000;
}

// --- Foerderperioden aus derselben Saat, aus der auch das Blatt befuellt wird.
const PERIODEN_ROWS = appsScript.KV_PERIODEN_ROWS_();
const PERIODE = 'h2-2026'; // laufende Periode, 21.07.2026 bis 31.01.2027
const periodenZeile = PERIODEN_ROWS.find((zeile) => zeile[0] === PERIODE);
assert.ok(periodenZeile, `Periode ${PERIODE} fehlt in der Saat`);
const KIND_ABZUG = Number(periodenZeile[9]);
const STUFEN = String(periodenZeile[10])
  .split(';')
  .filter(Boolean)
  .map((stufe) => {
    const [maxAnr, pct] = stufe.split(':').map(Number);
    return { maxAnr, pct };
  });
assert.equal(KIND_ABZUG, 10000, 'Kinderabzug der Periode muss 10.000 Euro sein (Nr. 8.4.5 Abs. 3)');
assert.deepEqual(
  STUFEN,
  [
    { maxAnr: 30000, pct: 40 },
    { maxAnr: 40000, pct: 30 },
    { maxAnr: 50000, pct: 10 },
  ],
  'Bonusstaffel der Periode muss 40/30/10 Prozent sein (Nr. 8.4.5 Abs. 3)'
);
const OBERSTE_STUFE = STUFEN[STUFEN.length - 1].maxAnr;

/** Richtlinienrechnung, unabhaengig von beiden Fassungen. */
function sollBonus(zvE, kind) {
  const anrechenbar = Math.max(0, zvE - (kind ? KIND_ABZUG : 0));
  for (const stufe of STUFEN) {
    if (anrechenbar <= stufe.maxAnr) return stufe.pct;
  }
  return 0;
}

// --- Die Klassen der Auswahl, mit ihrer Obergrenze. Infinity = nach oben offen.
const KLASSEN = [
  ['bis30', 30000],
  ['bis40', 40000],
  ['bis50', 50000],
  ['bis60', 60000],
  ['bis90', 90000],
  ['ueber90', Infinity],
];

// --- PHP-Fassung. Ein Aufruf, alle Faelle, damit der Test schnell bleibt.
const phpRunner = String.raw`
require 'api/rechner-engine.php';
$in = json_decode(stream_get_contents(STDIN), true);
$f = $in['f'];
$out = ['staffel' => [], 'kv' => []];
foreach ($in['faelle'] as $fall) {
    $out['staffel'][] = hw_einkommensbonus_pct(hw_einkommen_norm($fall[0]), (bool) $fall[1], $f);
}
$sheets = ['KV_Parameter' => [['schluessel', 'wert']], 'KV_FoerderPerioden' => $in['periodenRows']];
$params = hw_kv_get_params($sheets);
foreach ($in['kvFaelle'] as $fall) {
    $r = hw_kv_foerder([
        'fHalbjahr' => $in['periode'], 'fGrund' => true, 'fEU' => true, 'fKlima' => true,
        'fAlt20' => true, 'fEffizienz' => false, 'fEinkSlider' => $fall[0], 'fKind' => (bool) $fall[1],
    ], $params);
    $out['kv'][] = $r['e'];
}
$synthetisch = $params;
$synthetisch['perioden'][$in['periode']]['cap'] = 63;
$synthetisch['perioden'][$in['periode']]['effizienzPct'] = 7;
$synthetisch['perioden'][$in['periode']]['kindFreibetrag'] = 0;
$synthetisch['perioden'][$in['periode']]['einkStufen'] = [['maxAnr' => 60000, 'pct' => 13]];
$r = hw_foerder_calc([
    'we' => 1, 'selbstWE' => 1, 'heizung' => 'gas', 'heizungsalter' => 25,
    'einkommen' => 'bis60', 'kind' => 'ja', 'preis' => 34510,
], $f, '2026-08-01T12:00:00', hw_foerder_perioden_aus_kv($synthetisch));
$out['periodenquelle'] = [
    'satz' => $r['kfwSatz'], 'zuschuss' => $r['zuschussGesamt'],
    'eigenanteil' => $r['eigenanteil'], 'einkommen' => $r['einkommensbonusPct'],
];
$fehlend = $params;
foreach (['cap', 'effizienzPct', 'kindFreibetrag'] as $feld) {
    $fehlend['perioden'][$in['periode']][$feld] = null;
}
$fehlend['perioden'][$in['periode']]['einkStufen'] = [];
$logger = hw_foerder_rueckfall_logger();
$einmal = hw_foerder_params_mit_rueckfall($fehlend, $f, $logger);
hw_foerder_params_mit_rueckfall($fehlend, $f, $logger);
$werte = $einmal['perioden'][$in['periode']];
$out['rueckfall'] = [
    'cap' => $werte['cap'], 'effizienzPct' => $werte['effizienzPct'],
    'kindFreibetrag' => $werte['kindFreibetrag'], 'einkStufen' => $werte['einkStufen'],
];
echo json_encode($out);
`;

const faelle = [];
for (const kind of [false, true]) for (const [klasse] of KLASSEN) faelle.push([klasse, kind]);
// Kostenvergleich: an der Obergrenze jeder geschlossenen Klasse, plus zwei Punkte oberhalb.
const kvFaelle = [];
for (const kind of [false, true]) {
  for (const [, grenze] of KLASSEN) if (Number.isFinite(grenze)) kvFaelle.push([grenze, kind]);
  kvFaelle.push([90001, kind]);
  kvFaelle.push([250000, kind]);
}

const periodenRows = [
  [
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
  ],
  ...PERIODEN_ROWS,
];
const roh = spawnSync('php', ['-r', phpRunner], {
  input: JSON.stringify({ f: F, faelle, kvFaelle, periodenRows, periode: PERIODE }),
  encoding: 'utf8',
});
assert.equal(roh.status, 0, roh.stderr);
const php = JSON.parse(roh.stdout);

// =====================================================================================
// 1. Gleichlauf PHP-Kern, Apps-Script-Rueckfall und Richtlinienrechnung
// =====================================================================================
const zeilen = [];
let fehler = 0;

const periodenquellePhpOk =
  JSON.stringify(php.periodenquelle) ===
  JSON.stringify({
    satz: 63,
    zuschuss: 17640,
    eigenanteil: 16870,
    einkommen: 13,
  });
if (!periodenquellePhpOk) fehler++;
zeilen.push(
  `${periodenquellePhpOk ? 'PASS' : 'FAIL'} | PHP-Periodenquelle | ` +
    `Deckel, Effizienz, Kinderabzug und Einkommensstufen gewinnen gegen Förder_Parameter`
);

const rueckfallProtokolle = roh.stderr
  .split('\n')
  .filter((zeile) => zeile.includes('FOERDER_PERIODEN_RUECKFALL periode=h2-2026'));
const rueckfallPhpOk =
  php.rueckfall.cap === 80 &&
  php.rueckfall.effizienzPct === 0 &&
  php.rueckfall.kindFreibetrag === 10000 &&
  JSON.stringify(php.rueckfall.einkStufen) === JSON.stringify(STUFEN) &&
  rueckfallProtokolle.length === 4;
if (!rueckfallPhpOk) fehler++;
zeilen.push(
  `${rueckfallPhpOk ? 'PASS' : 'FAIL'} | PHP-Rückfall | 4 Werte korrekt, ` +
    `${rueckfallProtokolle.length} deduplizierte Protokolle, erwartet 4`
);
faelle.forEach(([klasse, kind], index) => {
  const grenze = KLASSEN.find(([name]) => name === klasse)[1];
  // Gerechnet wird mit der Klassenobergrenze; eine offene Klasse hat keine, sie kann nur 0 sein.
  const soll = Number.isFinite(grenze) ? sollBonus(grenze, kind) : 0;
  const istPhp = php.staffel[index];
  const istGs = appsScript.einkommensbonusPct_(appsScript.einkommenNorm_(klasse), kind, F);
  const ok = istPhp === soll && istGs === soll;
  if (!ok) fehler++;
  zeilen.push(
    `${ok ? 'PASS' : 'FAIL'} | Staffel | ${klasse.padEnd(8)} | Kind ${kind ? 'ja ' : 'nein'} | ` +
      `PHP ${istPhp} % | Apps Script ${istGs} % | Richtlinie ${soll} %`
  );
});

// =====================================================================================
// 2. Gleichlauf der beiden Website-Rechner am oberen Rand jeder geschlossenen Klasse
// =====================================================================================
kvFaelle.forEach(([zvE, kind], index) => {
  const soll = sollBonus(zvE, kind);
  const ist = php.kv[index];
  const ok = ist === soll;
  if (!ok) fehler++;
  zeilen.push(
    `${ok ? 'PASS' : 'FAIL'} | Kostenvergleich | zvE ${String(zvE).padStart(6)} | Kind ${kind ? 'ja ' : 'nein'} | ` +
      `ist ${ist} % | Richtlinie ${soll} %`
  );
  if (Number.isFinite(zvE)) {
    const klasse = KLASSEN.find(([, grenze]) => grenze === zvE);
    if (klasse) {
      const foerderIndex = faelle.findIndex(([name, k]) => name === klasse[0] && k === kind);
      const gleich = php.staffel[foerderIndex] === ist;
      if (!gleich) fehler++;
      zeilen.push(
        `${gleich ? 'PASS' : 'FAIL'} | Beide Rechner | Klasse ${klasse[0].padEnd(8)} | Kind ${kind ? 'ja ' : 'nein'} | ` +
          `Foerderrechner ${php.staffel[foerderIndex]} % | Kostenvergleich ${ist} %`
      );
    }
  }
});

// =====================================================================================
// 3. Die Staffel ist nach oben geschlossen
// =====================================================================================
const html = fs.readFileSync('foerderung.html', 'utf8');
const block = html.slice(
  html.indexOf('<select id="einkommen">'),
  html.indexOf('</select>', html.indexOf('<select id="einkommen">'))
);
const optionen = [...block.matchAll(/<option value="([^"]+)"/g)]
  .map((treffer) => treffer[1])
  .filter((wert) => wert !== 'keine');
const erwartet = KLASSEN.map(([name]) => name);
const auswahlOk = JSON.stringify(optionen) === JSON.stringify(erwartet);
if (!auswahlOk) fehler++;
zeilen.push(
  `${auswahlOk ? 'PASS' : 'FAIL'} | Auswahl | foerderung.html fuehrt ${JSON.stringify(optionen)}, ` +
    `der Rechenkern kennt ${JSON.stringify(erwartet)}`
);

// Eine nach oben offene Klasse ist nur zulaessig, wenn ihre UNTERE Kante minus Kinderabzug bereits
// ueber der obersten Bonusstufe liegt. Genau diese Bedingung war bei 'ueber50' verletzt.
const offene = KLASSEN.filter(([, grenze]) => !Number.isFinite(grenze));
const untereKante = KLASSEN.filter(([, g]) => Number.isFinite(g))
  .map(([, g]) => g)
  .sort((a, b) => b - a)[0];
const offenOk = offene.length === 1 && untereKante - KIND_ABZUG > OBERSTE_STUFE;
if (!offenOk) fehler++;
zeilen.push(
  `${offenOk ? 'PASS' : 'FAIL'} | Geschlossen nach oben | genau eine offene Klasse (${offene.length}), ` +
    `untere Kante ${untereKante} minus Kinderabzug ${KIND_ABZUG} = ${untereKante - KIND_ABZUG} ` +
    `muss ueber der obersten Bonusstufe ${OBERSTE_STUFE} liegen`
);

// =====================================================================================
// 4. Keine Klasse faellt aus der Lead-Abbildung von js/site.js
// =====================================================================================
const site = fs.readFileSync('js/site.js', 'utf8');
const abbildung = site.slice(
  site.indexOf('const einkommenFlag ='),
  site.indexOf('hwMergeLeadPrefill', site.indexOf('const einkommenFlag ='))
);
const fehlend = erwartet.filter((klasse) => !abbildung.includes(`'${klasse}'`));
const leadOk = fehlend.length === 0;
if (!leadOk) fehler++;
zeilen.push(
  `${leadOk ? 'PASS' : 'FAIL'} | Lead-Abbildung | Klassen ohne Zuordnung in js/site.js: ` +
    `${fehlend.length === 0 ? 'keine' : JSON.stringify(fehlend)}`
);

// =====================================================================================
// 5. Beide Erklärstellen bilden dieselbe Staffel und dieselben Null-Prozent-Klassen ab
// =====================================================================================
const erklaerung =
  'Maßgeblich ist das Einkommen nach einem einmaligen Kinderabzug von 10.000 €: ' +
  '40 % bis 30.000 €, 30 % bis 40.000 € und 10 % bis 50.000 €. ' +
  'Deshalb ergibt die Auswahlklasse bis 60.000 € mit Kind 10 %, ohne Kind 0 %. ' +
  'Bis 90.000 € und über 90.000 € ergeben 0 %.';
const erklaerstellen = html.split(erklaerung).length - 1;
const textOk = erklaerstellen === 2;
if (!textOk) fehler++;
zeilen.push(
  `${textOk ? 'PASS' : 'FAIL'} | Erklärtext | vollständige Förderstaffel steht ${erklaerstellen}-mal, erwartet 2-mal`
);

// --- Ausgabe
zeilen.forEach((zeile) => console.log(zeile));
console.log('');
console.log(`${zeilen.length - fehler} von ${zeilen.length} gruen.`);

if (ROT) {
  assert.ok(
    fehler > 0,
    'ROT-NACHWEIS FEHLGESCHLAGEN: die verstellte Klassengrenze bis60 blieb unbemerkt.'
  );
  console.log(
    `ROT-NACHWEIS BESTANDEN: die verstellte Klassengrenze bis60 macht ${fehler} Pruefung(en) rot.`
  );
} else {
  assert.equal(fehler, 0, `${fehler} Pruefung(en) rot, siehe Zeilen oben.`);
  console.log('Einkommensstaffel: alle Pruefungen gruen.');
}
