/**
 * Gleichlauf von PHP-Rechenkern und Apps-Script-Rueckfall beim Antragszeitpunkt (Vorgang T617).
 *
 * WOZU. Die Website rechnet mit dem PHP-Rechenkern, faellt aber in zwei Faellen auf das
 * Apps Script zurueck: wenn der PHP-Kern per Schalter abgeschaltet ist (RECHNER_PHP_ENGINE_ENABLED)
 * und wenn der Wertevorrat kalt nicht geladen werden kann (api/rechner.php, Kaltstart-Sonderfall).
 * Am 21.08.2026 hat der Rueckfall das Feld fHalbjahr auf der Foerderroute ignoriert und einem
 * Antrag im Maerz 2027 unveraendert 12.880 statt 11.445 Euro versprochen, waehrend der PHP-Kern
 * seit dem 20.08.2026 richtig rechnete. Gemessen an der Live-Adresse AKfycbwsvoC0.
 *
 * WAS DIESER TEST PRUEFT. Beide Fassungen bekommen DIESELBEN Blattzeilen aus der Saat und
 * dieselben Anfragen. Verglichen wird die vollstaendige Antwort als JSON, also Werte UND
 * Feldreihenfolge, denn der Doppellauf (scripts/compare-rechner-php.mjs) vergleicht die
 * Feldreihenfolge hart und meldet sonst eine Abweichung, die keine ist.
 * Faelle: alle Reform-Zeitraeume auf der Foerderroute und auf dem Kostenvergleich, dazu ohne
 * Angabe, mit dem nicht mehr beantragbaren Alt-Regelwerk, mit Unfug, und mit einem
 * Installationsbeginn vor und nach dem fruehesten Antrag.
 *
 * ROT-NACHWEIS. Mit --rot-nachweis rechnet die Apps-Script-Fassung wieder fest auf heute, also
 * genau der Stand vom 21.08.2026. Der Lauf MUSS dann rot werden.
 *
 * Start:  node tests/rueckfall-antragsdatum-gleichlauf.mjs
 *         node tests/rueckfall-antragsdatum-gleichlauf.mjs --rot-nachweis
 *         node tests/rueckfall-antragsdatum-gleichlauf.mjs --gs <pfad zu einem anderen Code.gs>
 * Kein Netz, kein Sheet, kein Framework.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import vm from 'node:vm';

const ROT = process.argv.includes('--rot-nachweis');
const gsIndex = process.argv.indexOf('--gs');
const GS_PFAD = gsIndex >= 0 ? process.argv[gsIndex + 1] : 'apps-script/rechner-backend/Code.gs';
const ENGINE_PFAD =
  gsIndex >= 0
    ? GS_PFAD.replace(/Code\.(gs|js)$/, 'kv_engine.$1')
    : 'apps-script/rechner-backend/kv_engine.gs';

// ---------------------------------------------------------------------------
// 1. Die Saat einmal lesen, aus ihr die Blaetter bauen. Beide Fassungen bekommen dieselben Zeilen.
// ---------------------------------------------------------------------------
const werfe = (was) => () => {
  throw new Error('Unerwarteter Zugriff auf ' + was);
};
const saatKontext = {
  console,
  SpreadsheetApp: { openById: werfe('SpreadsheetApp') },
  CacheService: { getScriptCache: werfe('CacheService') },
  ContentService: { createTextOutput: werfe('ContentService'), MimeType: { JSON: 'JSON' } },
  Utilities: { sleep: werfe('Utilities') },
};
vm.createContext(saatKontext);
vm.runInContext(fs.readFileSync(ENGINE_PFAD, 'utf8'), saatKontext);
vm.runInContext(fs.readFileSync(GS_PFAD, 'utf8'), saatKontext);

const PERIODEN_KOPF = [
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
];
const PREISE_WOLF = [
  [
    'Klasse',
    'Modell',
    'Hausgroesse',
    'kW',
    'Endpreis_brutto',
    'Eigenanteil',
    'proKlima_Eigenanteil',
  ],
  ['s', 'CHA-07', 'klein', 7, 30026, 0, 0],
  ['m', 'CHA-10', 'mittel', 10, 35349, 0, 0],
  ['l', 'CHA-16', 'gross', 16, 41718, 0, 0],
];
const BLAETTER = {
  Förder_Parameter: [['schluessel', 'wert'], ...saatKontext.FOERDER_ROWS_()],
  Dimensionierung: [['schluessel', 'wert'], ...saatKontext.DIMENSION_ROWS_()],
  KV_Parameter: [['schluessel', 'wert'], ...saatKontext.KV_PARAMETER_ROWS_()],
  KV_FoerderPerioden: [PERIODEN_KOPF, ...saatKontext.KV_PERIODEN_ROWS_()],
  Preise_Wolf: PREISE_WOLF,
  Preise_Vaillant: PREISE_WOLF,
};

const ZEITRAEUME = saatKontext
  .KV_PERIODEN_ROWS_()
  .filter((zeile) => zeile[0] !== 'alt')
  .map((zeile) => zeile[0]);

// ---------------------------------------------------------------------------
// 2. Die Anfragen. Derselbe Kundenfall auf beiden Routen, wie am 20.08.2026 live gemessen.
// ---------------------------------------------------------------------------
const PREIS = 34510;
const foerder = (extra) => ({
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
const kv = (extra) => ({
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

const ANFRAGEN = [];
const merke = (name, anfrage) => ANFRAGEN.push({ name, anfrage }) - 1;
ZEITRAEUME.forEach((z) => merke('Foerderroute, Antrag ' + z, foerder({ fHalbjahr: z })));
ZEITRAEUME.forEach((z) => merke('Kostenvergleich, Antrag ' + z, kv({ fHalbjahr: z })));
merke('Foerderroute ohne Angabe', foerder({}));
merke('Foerderroute mit Alt-Regelwerk', foerder({ fHalbjahr: 'alt' }));
merke('Foerderroute mit Unfug', foerder({ fHalbjahr: 'quatsch' }));
merke(
  'Foerderroute, Installation vor dem Antrag',
  foerder({ fHalbjahr: 'h1-2028', installBeginn: '2026-09' })
);
merke(
  'Foerderroute, Installation nach dem Antrag',
  foerder({ fHalbjahr: 'h1-2028', installBeginn: '2028-06' })
);
merke(
  'Kostenvergleich, Installation vor dem Antrag',
  kv({ fHalbjahr: 'h1-2028', installBeginn: '2026-09' })
);
merke('Bootstrap des Kostenvergleichs', { action: 'kv_bootstrap' });

// ---------------------------------------------------------------------------
// 3. PHP-Fassung, ein Aufruf fuer alle Faelle.
// ---------------------------------------------------------------------------
const phpRunner = String.raw`
require 'api/rechner-engine.php';
$in = json_decode(stream_get_contents(STDIN), true);
$out = [];
foreach ($in['anfragen'] as $q) {
    $action = $q['action'];
    unset($q['action']);
    $out[] = hw_rechner_route($action, $q, $in['sheets']);
}
echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
`;
const roh = spawnSync('php', ['-r', phpRunner], {
  input: JSON.stringify({ sheets: BLAETTER, anfragen: ANFRAGEN.map((a) => a.anfrage) }),
  encoding: 'utf8',
});
assert.equal(roh.status, 0, roh.stderr);
const php = JSON.parse(roh.stdout);

// ---------------------------------------------------------------------------
// 4. Apps-Script-Fassung in einer Sandbox mit denselben Blaettern.
// ---------------------------------------------------------------------------
const blattAttrappe = (zeilen) => ({
  getDataRange: () => ({ getValues: () => zeilen.map((z) => z.slice()) }),
  getLastRow: () => zeilen.length,
  getRange: (zeile, spalte, anzahl, breite) => ({
    getValues: () =>
      zeilen.slice(zeile - 1, zeile - 1 + anzahl).map((z) => {
        const teil = z.slice(spalte - 1, spalte - 1 + breite);
        while (teil.length < breite) teil.push('');
        return teil;
      }),
  }),
});
const cache = {};
const heuteBerlin = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Berlin',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());
const gsKontext = {
  console: { log: () => {}, warn: () => {}, error: () => {} },
  Date,
  Intl,
  JSON,
  Math,
  Number,
  String,
  Object,
  Array,
  SpreadsheetApp: {
    openById: () => ({
      getSheetByName: (name) =>
        Object.prototype.hasOwnProperty.call(BLAETTER, name) ? blattAttrappe(BLAETTER[name]) : null,
      insertSheet: werfe('insertSheet'),
    }),
  },
  CacheService: {
    getScriptCache: () => ({
      get: (k) => (Object.prototype.hasOwnProperty.call(cache, k) ? cache[k] : null),
      put: (k, v) => {
        cache[k] = v;
      },
    }),
  },
  ContentService: { createTextOutput: werfe('ContentService'), MimeType: { JSON: 'JSON' } },
  Utilities: {
    sleep: () => {},
    // Nur das eine Format wird gebraucht; jedes andere waere ein stiller Messfehler.
    formatDate: (datum, zone, muster) => {
      if (zone !== 'Europe/Berlin' || muster !== 'yyyy-MM-dd') {
        throw new Error('Unerwartetes Datumsformat in der Messung: ' + zone + ' / ' + muster);
      }
      return heuteBerlin;
    },
  },
};
vm.createContext(gsKontext);
vm.runInContext(fs.readFileSync(ENGINE_PFAD, 'utf8'), gsKontext, { filename: 'kv_engine' });
let gsQuelle = fs.readFileSync(GS_PFAD, 'utf8');
if (ROT) {
  // Sabotage NUR an der Apps-Script-Fassung: der Antragszeitpunkt wird wieder ignoriert und die
  // Serveruhr genommen. Die PHP-Seite und die Erwartung bleiben unveraendert, sonst wuerde der
  // Nachweis sich selbst mitziehen.
  const alt = "const heuteEff = antrag.ab + 'T12:00:00';";
  assert.ok(
    gsQuelle.includes(alt),
    'Sabotage-Stelle nicht gefunden, der Rot-Nachweis waere wertlos'
  );
  gsQuelle = gsQuelle.replace(alt, "const heuteEff = heuteAbStichtagIso_(kvParams) + 'T12:00:00';");
}
vm.runInContext(gsQuelle, gsKontext, { filename: 'Code' });

const gs = ANFRAGEN.map(({ anfrage }) => {
  const p = { ...anfrage };
  const action = p.action;
  delete p.action;
  if (action === 'foerderung') return gsKontext.foerderung_(p);
  if (action === 'kostenvergleich') return gsKontext.kostenvergleich_(p);
  if (action === 'kv_bootstrap') return gsKontext.kvBootstrap_(p);
  throw new Error('Unbekannte Route: ' + action);
});

// ---------------------------------------------------------------------------
// 5. Vergleich. Der Bootstrap wird nur auf der Zeitraum-Auswahl verglichen: beide Fassungen
//    fuehren dort bewusst verschieden viele Felder je Eintrag, das ist Bestand und nicht Gegenstand.
// ---------------------------------------------------------------------------
let fehler = 0;
const zeilen = [];
ANFRAGEN.forEach(({ name, anfrage }, i) => {
  const istBootstrap = anfrage.action === 'kv_bootstrap';
  const a = istBootstrap ? php[i].perioden.map((p) => p.key) : php[i];
  const b = istBootstrap ? gs[i].perioden.map((p) => p.key) : gs[i];
  const gleich = JSON.stringify(a) === JSON.stringify(b);
  if (!gleich) fehler += 1;
  const kern = istBootstrap
    ? 'Auswahl ' + JSON.stringify(a) + ' gegen ' + JSON.stringify(b)
    : anfrage.action === 'foerderung'
      ? php[i].kfwSatz +
        ' % / ' +
        php[i].zuschussGesamt +
        ' EUR gegen ' +
        gs[i].kfwSatz +
        ' % / ' +
        gs[i].zuschussGesamt +
        ' EUR'
      : php[i].foerder.quote +
        ' % / ' +
        php[i].foerder.anzeigeBetrag +
        ' EUR gegen ' +
        gs[i].foerder.quote +
        ' % / ' +
        gs[i].foerder.anzeigeBetrag +
        ' EUR';
  zeilen.push((gleich ? '  OK   ' : '  ROT  ') + name + '  [' + kern + ']');
  if (!gleich && !istBootstrap) {
    const schluesselPhp = JSON.stringify(Object.keys(a));
    const schluesselGs = JSON.stringify(Object.keys(b));
    if (schluesselPhp !== schluesselGs) {
      zeilen.push('         Feldreihenfolge: ' + schluesselPhp + '  !=  ' + schluesselGs);
    }
  }
});

console.log('GLEICHLAUF PHP-RECHENKERN GEGEN APPS-SCRIPT-RUECKFALL (' + GS_PFAD + ')');
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
  console.log('ROT-NACHWEIS BESTANDEN: ' + fehler + ' Fall/Faelle schlagen bei Sabotage an.');
  process.exit(0);
}
if (fehler > 0) {
  console.error(fehler + ' Fall/Faelle laufen auseinander.');
  process.exit(1);
}
console.log('Alle ' + ANFRAGEN.length + ' Faelle laufen gleich.');
