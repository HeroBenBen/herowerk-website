/**
 * Antragszeitpunkt und Installationsbeginn, getrennt und auf BEIDEN Seiten gleich (Vorgang T616).
 *
 * WOZU. Bis zum 20.08.2026 liess der Kostenvergleichsrechner den Antragszeitraum waehlen, der
 * oeffentliche Foerderrechner auf /foerderung nicht: dort rief der Rechenkern die Foerderrechnung
 * FEST mit dem heutigen Datum auf. Gemessen an der Live-Seite am 20.08.2026, derselbe Kundenfall
 * (Einfamilienhaus, selbst bewohnt, Gasheizung 25 Jahre, ueber 90.000 Euro Einkommen, 34.510 Euro
 * brutto): Antrag heute lieferten beide Seiten 12.880 Euro, Antrag im Maerz 2027 lieferte der
 * Kostenvergleich 11.445 Euro und der Foerderrechner unveraendert 12.880 Euro. Der Foerderrechner
 * hat also 1.435 Euro zu viel versprochen, sobald jemand nicht sofort beantragt.
 *
 * Dazu kam ein zweiter Fehler mit derselben Wurzel: das Feld im Kostenvergleich hiess "Geplanter
 * Foerdermittelantrag / geplante Installation" und vermischte zwei Termine, die der
 * Geschaeftsfuehrer am 19.08.2026 ausdruecklich getrennt hat. Der Antragszeitpunkt bestimmt die
 * Foerderhoehe, der Installationstermin bestimmt sie NICHT.
 *
 * WAS DIESER TEST PRUEFT, in fuenf Stufen:
 *   1. GLEICHLAUF BEIDER SEITEN. Fuer jeden Antragszeitraum muessen Foerderrechner und
 *      Kostenvergleich fuer denselben Kundenfall zifferngleich sein: Quote, Zuschuss, Eigenanteil.
 *   2. DAS ANTRAGSDATUM WIRKT. Der Foerderrechner muss dem gewaehlten Zeitraum folgen, und der
 *      Klimabonus muss von 16 auf 12 Prozent fallen, sobald der Antrag ins erste Halbjahr 2027
 *      rutscht. Das ist genau die Bedingung, die vor dieser Aenderung falsch war.
 *   3. DIE ZWEI KLEMMUNGEN. Ein abgelaufener Zeitraum und das nicht mehr beantragbare
 *      Alt-Regelwerk fallen auf den heute geltenden Zeitraum zurueck, mit Hinweis; die Auswahl
 *      bietet nie einen Zeitraum an, dessen Ende vorbei ist. Uebernommen aus dem Konfigurator
 *      (Vorgang T578, 19.08.2026).
 *   4. DIE REIHENFOLGE-WARNUNG. Liegt der Installationsbeginn vor dem fruehesten Foerderantrag
 *      des gewaehlten Zeitraums, warnt der Kern auf BEIDEN Seiten mit demselben Satz, und der
 *      Installationstermin veraendert dabei KEINE einzige Zahl.
 *   5. DIE SECHS DATUMS-SCHREIBWEISEN, wie sie der Konfigurator liest.
 *
 * ROT-NACHWEIS. Mit --rot-nachweis wird der Kern so sabotiert, dass die Foerderrechnung des
 * Foerderrechners wieder fest auf heute laeuft, also genau der Fehler vom 20.08.2026. Der Lauf
 * MUSS dann rot werden. Ein gruener Lauf allein belegt nichts.
 *
 * Start:  node tests/antragsdatum-und-installation-regression.mjs
 *         node tests/antragsdatum-und-installation-regression.mjs --rot-nachweis
 * Kein Netz, kein Sheet, kein Framework.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';

const ROT = process.argv.includes('--rot-nachweis');

// --- Saat aus dem Apps-Script-Stand, aus der auch das Blatt befuellt wird.
const werfe = (was) => () => {
  throw new Error('Die Saat hat ' + was + ' angefasst, sie muss rein sein.');
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

const SHEETS = {
  Förder_Parameter: [['schluessel', 'wert'], ...appsScript.FOERDER_ROWS_()],
  Dimensionierung: [['schluessel', 'wert'], ...appsScript.DIMENSION_ROWS_()],
  KV_Parameter: [['schluessel', 'wert'], ...appsScript.KV_PARAMETER_ROWS_()],
  KV_FoerderPerioden: [
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
    ...appsScript.KV_PERIODEN_ROWS_(),
  ],
  Preise_Wolf: [
    ['Klasse', 'Endpreis_brutto'],
    ['s', 30026],
    ['m', 35349],
    ['l', 41718],
  ],
};

// Die Reform-Zeitraeume in ihrer Reihenfolge, ohne das nicht mehr beantragbare Alt-Regelwerk.
const ZEITRAEUME = appsScript
  .KV_PERIODEN_ROWS_()
  .filter((zeile) => zeile[0] !== 'alt')
  .map((zeile) => ({ key: zeile[0], klima: Number(zeile[4]), grenze: Number(zeile[5]) }));

// --- Der Kundenfall, auf beiden Seiten identisch beschrieben.
// Einkommen bewusst oberhalb jeder Bonusstufe: dann ist die Quote NICHT vom 80-Prozent-Deckel
// verdeckt und der sinkende Klimabonus schlaegt Punkt fuer Punkt durch. Genau so ist der Fall
// am 20.08.2026 gegen die Live-Seite gemessen worden.
const PREIS = 34510;
const foerderAnfrage = (extra) => ({
  action: 'foerderung',
  we: '1',
  selbstWE: '1',
  heizung: 'gas',
  heizungsalter: '25',
  einkommen: 'ueber90',
  kind: 'nein',
  marke: 'wolf',
  wpTyp: 'm',
  preisManuell: String(PREIS),
  ...extra,
});
const kvAnfrage = (extra) => ({
  action: 'kostenvergleich',
  invWP: String(PREIS),
  fEinkSlider: '95000',
  fKind: '0',
  fGrund: '1',
  fEU: '1',
  fKlima: '1',
  fAlt20: '1',
  ...extra,
});

// --- Der Rechenkern. Im Rot-Nachweis eine sabotierte Kopie, sonst die echte Datei.
const KERN = 'api/rechner-engine.php';
let kernPfad = KERN;
if (ROT) {
  // Sabotage: der Foerderrechner nimmt wieder die Serveruhr statt des angegebenen Antragsdatums,
  // also exakt der Stand vom 20.08.2026. Die Erwartungen dieses Tests bleiben unveraendert, sonst
  // wuerde der Nachweis sich selbst mitziehen und nichts belegen.
  const quelle = fs.readFileSync(KERN, 'utf8');
  const alt =
    "$out = hw_foerder_calc($args, $f, $antrag['ab'] . 'T12:00:00', $perioden, $onFallback);";
  assert.ok(quelle.includes(alt), 'Sabotage-Stelle nicht gefunden, der Rot-Nachweis waere wertlos');
  kernPfad = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hw-rot-')), 'rechner-engine.php');
  fs.writeFileSync(
    kernPfad,
    quelle.replace(
      alt,
      "$out = hw_foerder_calc($args, $f, hw_heute_ab_stichtag_iso($params) . 'T12:00:00', $perioden, $onFallback);"
    )
  );
}

const phpRunner = String.raw`
require $argv[1];
$in = json_decode(stream_get_contents(STDIN), true);
$out = ['laeufe' => [], 'datum' => [], 'waehlbar' => []];
foreach ($in['laeufe'] as $lauf) {
    $q = $lauf;
    $action = $q['action'];
    unset($q['action']);
    $out['laeufe'][] = hw_rechner_route($action, $q, $in['sheets']);
}
foreach ($in['datum'] as $text) {
    $out['datum'][] = hw_datum_iso($text);
}
$params = hw_kv_get_params($in['sheets']);
foreach (hw_foerder_perioden_waehlbar($params) as $p) {
    $out['waehlbar'][] = $p['key'];
}
$out['heute'] = hw_heute_ab_stichtag_iso($params);
echo json_encode($out);
`;

// --- Alle Laeufe in EINEM Aufruf, damit der Test schnell bleibt.
const laeufe = [];
const merke = (anfrage) => laeufe.push(anfrage) - 1;

const idxFoerder = ZEITRAEUME.map((z) => merke(foerderAnfrage({ fHalbjahr: z.key })));
const idxKv = ZEITRAEUME.map((z) => merke(kvAnfrage({ fHalbjahr: z.key })));
const idxOhneAngabe = merke(foerderAnfrage({}));
const idxAlt = merke(foerderAnfrage({ fHalbjahr: 'alt' }));
const idxUnfug = merke(foerderAnfrage({ fHalbjahr: 'quatsch' }));
// Reihenfolge: Installation im laufenden Zeitraum, Antrag erst 2028. Der Antrag kaeme dann nach
// dem Vorhabensbeginn, und das kostet die ganze Foerderung, nicht nur ein paar Prozentpunkte.
const idxReihenfolgeFoerder = merke(
  foerderAnfrage({ fHalbjahr: 'h1-2028', installBeginn: '2026-09' })
);
const idxReihenfolgeKv = merke(kvAnfrage({ fHalbjahr: 'h1-2028', installBeginn: '2026-09' }));
const idxReihenfolgeOk = merke(foerderAnfrage({ fHalbjahr: 'h1-2028', installBeginn: '2028-06' }));
const idxOhneInstall = merke(foerderAnfrage({ fHalbjahr: 'h1-2028' }));

const roh = spawnSync('php', ['-r', phpRunner, kernPfad], {
  input: JSON.stringify({
    sheets: SHEETS,
    laeufe,
    datum: ['2027-03-15', '15.03.2027', '15.03.27', '03.2027', '03/2027', '2027-03', 'morgen', ''],
  }),
  encoding: 'utf8',
});
assert.equal(roh.status, 0, roh.stderr);
const php = JSON.parse(roh.stdout);
const L = (index) => php.laeufe[index];

const zeilen = [];
let fehler = 0;
const pruefe = (name, bedingung, gemessen) => {
  zeilen.push(
    (bedingung ? '  OK   ' : '  ROT  ') + name + (gemessen ? '  [' + gemessen + ']' : '')
  );
  if (!bedingung) fehler += 1;
};

// =====================================================================================
// 1. Gleichlauf beider Seiten, Zeitraum fuer Zeitraum
// =====================================================================================
zeilen.push('1. GLEICHLAUF FOERDERRECHNER UND KOSTENVERGLEICH, derselbe Kundenfall');
ZEITRAEUME.forEach((z, i) => {
  const f = L(idxFoerder[i]);
  const k = L(idxKv[i]).foerder;
  const gleich =
    f.kfwSatz === k.quote &&
    f.zuschussGesamt === k.anzeigeBetrag &&
    f.eigenanteil === k.netto &&
    f.periode === k.periode;
  pruefe(
    'Zeitraum ' + z.key,
    gleich,
    'Foerderseite ' +
      f.kfwSatz +
      ' % / ' +
      f.zuschussGesamt +
      ' EUR / ' +
      f.eigenanteil +
      ' EUR gegen Kostenvergleich ' +
      k.quote +
      ' % / ' +
      k.anzeigeBetrag +
      ' EUR / ' +
      k.netto +
      ' EUR'
  );
});

// =====================================================================================
// 2. Das Antragsdatum wirkt, und der Klimabonus faellt
// =====================================================================================
zeilen.push('2. DAS ANGEGEBENE ANTRAGSDATUM STEUERT DIE FOERDERUNG');
const heute = L(idxFoerder[0]);
const maerz2027 = L(idxFoerder[1]);
pruefe(
  'Foerderrechner folgt dem gewaehlten Zeitraum',
  heute.periode === 'h2-2026' && maerz2027.periode === 'h1-2027',
  heute.periode + ' und ' + maerz2027.periode
);
pruefe(
  'Klimabonus faellt von 16 auf 12 Prozent',
  heute.bausteine.some((b) => b.includes('+16%')) &&
    maerz2027.bausteine.some((b) => b.includes('+12%')),
  heute.bausteine.join(', ') + '  ->  ' + maerz2027.bausteine.join(', ')
);
pruefe(
  'Spaeter beantragt heisst weniger Zuschuss',
  maerz2027.zuschussGesamt < heute.zuschussGesamt,
  heute.zuschussGesamt + ' EUR gegen ' + maerz2027.zuschussGesamt + ' EUR'
);
pruefe(
  'Der Zuschuss sinkt ueber alle Zeitraeume monoton',
  idxFoerder.every(
    (idx, i) => i === 0 || L(idx).zuschussGesamt <= L(idxFoerder[i - 1]).zuschussGesamt
  ),
  idxFoerder.map((idx) => L(idx).zuschussGesamt).join(' > ')
);

// =====================================================================================
// 3. Die zwei Klemmungen des Antragsdatums
// =====================================================================================
zeilen.push('3. KLEMMUNG NACH UNTEN AUF HEUTE UND AUF DEN REFORM-STICHTAG');
pruefe(
  'Ohne Angabe rechnet der Kern auf den heute geltenden Zeitraum',
  L(idxOhneAngabe).antragAutomatik === true && L(idxOhneAngabe).antragAb === php.heute,
  L(idxOhneAngabe).antragPeriode + ' ab ' + L(idxOhneAngabe).antragAb
);
pruefe(
  'Das Alt-Regelwerk ist nicht mehr waehlbar und faellt auf heute zurueck',
  L(idxAlt).antragAutomatik === true &&
    L(idxAlt).periode !== 'alt' &&
    L(idxAlt).antragHinweis !== '',
  L(idxAlt).periode + ' / ' + L(idxAlt).antragHinweis
);
pruefe(
  'Ein unbekannter Wert faellt still auf heute zurueck, ohne Fehler',
  L(idxUnfug).antragAutomatik === true && L(idxUnfug).antragHinweis === '',
  L(idxUnfug).antragPeriode
);
pruefe(
  'Die Auswahl bietet keinen abgelaufenen Zeitraum an',
  php.waehlbar.length > 0 &&
    php.waehlbar.every((key) => {
      const zeile = appsScript.KV_PERIODEN_ROWS_().find((r) => r[0] === key);
      return String(zeile[2]) >= php.heute;
    }),
  php.waehlbar.join(', ')
);
pruefe(
  'Beide Seiten bieten dieselbe Auswahl an',
  JSON.stringify(L(idxOhneAngabe).perioden.map((p) => p.key)) === JSON.stringify(php.waehlbar),
  L(idxOhneAngabe)
    .perioden.map((p) => p.key)
    .join(', ')
);

// =====================================================================================
// 4. Reihenfolge Antrag vor Installation, auf beiden Seiten derselbe Satz
// =====================================================================================
zeilen.push('4. WARNUNG, WENN DIE INSTALLATION VOR DEM FOERDERANTRAG LIEGT');
const warnF = L(idxReihenfolgeFoerder);
const warnK = L(idxReihenfolgeKv);
pruefe(
  'Der Foerderrechner warnt',
  warnF.installHinweis.includes('entfällt die Förderung vollständig'),
  warnF.installHinweis
);
pruefe(
  'Der Kostenvergleich warnt mit demselben Satz',
  warnK.installHinweis === warnF.installHinweis,
  warnK.installHinweis
);
pruefe(
  'Passende Termine loesen keine Warnung aus',
  L(idxReihenfolgeOk).installHinweis === '',
  '"' + L(idxReihenfolgeOk).installHinweis + '"'
);
pruefe(
  'Der Installationstermin veraendert KEINE Zahl',
  warnF.kfwSatz === L(idxOhneInstall).kfwSatz &&
    warnF.zuschussGesamt === L(idxOhneInstall).zuschussGesamt &&
    warnF.eigenanteil === L(idxOhneInstall).eigenanteil,
  warnF.zuschussGesamt + ' EUR mit Termin, ' + L(idxOhneInstall).zuschussGesamt + ' EUR ohne'
);

// =====================================================================================
// 5. Die sechs Schreibweisen des Datums
// =====================================================================================
zeilen.push('5. DATUMS-SCHREIBWEISEN WIE IM KONFIGURATOR');
pruefe(
  'Sechs Formate plus zwei Nicht-Datumsangaben',
  JSON.stringify(php.datum) ===
    JSON.stringify([
      '2027-03-15',
      '2027-03-15',
      '2027-03-15',
      '2027-03-01',
      '2027-03-01',
      '2027-03-01',
      '',
      '',
    ]),
  php.datum.join(' | ')
);

console.log(zeilen.join('\n'));
console.log('');
if (ROT) {
  if (fehler === 0) {
    console.error(
      'ROT-NACHWEIS FEHLGESCHLAGEN: die Sabotage (Foerderrechnung wieder fest auf heute) ist ' +
        'unbemerkt geblieben. Der Test misst nicht, was er zu messen vorgibt.'
    );
    process.exit(1);
  }
  console.log('ROT-NACHWEIS BESTANDEN: ' + fehler + ' Bedingung(en) schlagen bei Sabotage an.');
  process.exit(0);
}
if (fehler > 0) {
  console.error(fehler + ' Bedingung(en) rot.');
  process.exit(1);
}
console.log('Alle Bedingungen gruen.');
