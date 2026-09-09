/**
 * Abnahme der Fragestrecke, Reihenfolge und Sprungregeln.
 *
 * ANLASS: bis zum 09.09.2026 stand die Verbrauchsfrage als LETZTE im Fragebogen. Damit konnte
 * der Fragebogen die drei Bestandsfragen nicht ueberspringen, obwohl sie nur dann etwas tragen,
 * wenn der Verbrauch bekannt ist: an ihrer Stelle wusste er die Antwort noch gar nicht. Seit dem
 * GF-Entscheid vom 09.09.2026 steht sie an Schritt 8, direkt hinter der Heizungsfrage, weil die
 * Einheit des Schiebers vom Energietraeger abhaengt.
 *
 * Diese Strecke faehrt den Fragebogen OHNE Browser durch: sie laedt wizStepIsSkipped aus
 * js/site.js, setzt die Antworten und zaehlt die Schrittfolge nach. Sie prueft ausserdem, dass
 * die Reihenfolge im Markup zu den Nummern im Quelltext passt.
 *
 * Aufruf:   node tests/flaechenweg/abnahme_fragestrecke.js
 * Einzeln:  node tests/flaechenweg/abnahme_fragestrecke.js --sabotage=<name>
 * Der Rot-Nachweis laeuft in beide Richtungen.
 */
const fs = require('fs');
const path = require('path');

const WURZEL = path.resolve(__dirname, '..', '..');
const SITE = path.join(WURZEL, 'js', 'site.js');
const HTML = path.join(WURZEL, 'dimensionierung.html');

const arg = process.argv.find((a) => a.startsWith('--sabotage='));
const SABOTAGE = arg ? arg.split('=')[1] : '';

const SABOTAGEN = {
  'verbrauchsfrage-wieder-ans-ende': (s) =>
    s.replace('if (stepNum === 9 && !wizData.verbrauchKnown) return true;', ''),
  'warmwasser-sprung-alt': (s) =>
    s.replace('[13, 14, 15].includes(stepNum)', '[12, 13, 14].includes(stepNum)'),
  'nachtspeicher-sprung-alt': (s) =>
    s.replace('(stepNum === 9 || stepNum === 10)', '(stepNum === 8 || stepNum === 9)'),
};

function ladeSkip(sabotage) {
  let src = fs.readFileSync(SITE, 'utf8');
  if (sabotage) {
    if (!SABOTAGEN[sabotage]) {
      console.error('Unbekannte Sabotage. Bekannt: ' + Object.keys(SABOTAGEN).join(', '));
      process.exit(2);
    }
    src = SABOTAGEN[sabotage](src);
  }
  const m = src.match(/function wizStepIsSkipped\([\s\S]*?\n}\n/);
  if (!m) throw new Error('wizStepIsSkipped nicht in js/site.js gefunden');
  const box = {};
  new Function(
    'exports',
    'let wizData;\n' + m[0] + '\nexports.set = (d) => (wizData = d); exports.f = wizStepIsSkipped;'
  )(box);
  return box;
}

function strecke(box, antworten) {
  box.set(antworten);
  const schritte = [];
  for (let n = 1; n <= 15; n += 1) if (!box.f(n)) schritte.push(n);
  return schritte;
}

// Die Fragen hinter den Nummern, aus dem Markup gelesen statt aus dem Gedaechtnis.
function fragenAusMarkup() {
  const html = fs.readFileSync(HTML, 'utf8');
  const paare = [];
  const re = /<div class="wizard-step(?: active)?" data-step="(\d+)">([\s\S]{0,900}?)<\/div>/g;
  let m;
  while ((m = re.exec(html))) {
    const q = m[2].match(/wizard-question">([^<]{0,80})/);
    paare.push([Number(m[1]), q ? q[1].trim() : '?']);
  }
  return paare;
}

const SOLL_REIHENFOLGE = [
  [1, 'Wie lautet deine Postleitzahl?'],
  [6, 'Was heizt du aktuell?'],
  [7, 'Was genau heizt bei dir?'],
  [8, 'Kennst du deinen Jahresverbrauch?'],
  [9, 'Schau auf das Abgasrohr'],
  [10, 'Wie alt ist deine Heizung?'],
];

const FAELLE = [
  {
    name: 'Verbrauch unbekannt, Gas: die Abgasrohr-Frage entfaellt',
    antworten: { heizung: 'gas', verbrauchKnown: false, warmwasser: 'ja', duschen: 2, wannen: 1 },
    erwartet: [1, 2, 3, 4, 5, 6, 8, 10, 11, 12, 13, 14, 15],
  },
  {
    name: 'Verbrauch bekannt, Gas: die Abgasrohr-Frage wird gestellt',
    antworten: { heizung: 'gas', verbrauchKnown: true, warmwasser: 'ja', duschen: 2, wannen: 1 },
    erwartet: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15],
  },
  {
    name: 'Nachtspeicher: Abgasrohr UND Heizungsalter entfallen, auch bei bekanntem Verbrauch',
    antworten: { heizung: 'nacht', verbrauchKnown: true, warmwasser: 'ja', duschen: 2, wannen: 1 },
    erwartet: [1, 2, 3, 4, 5, 6, 8, 11, 12, 13, 14, 15],
  },
  {
    name: 'Sonstige Heizung: die Rueckfrage nach der Bestandsheizung kommt dazu',
    antworten: { heizung: 'sonst', verbrauchKnown: true, warmwasser: 'ja', duschen: 2, wannen: 1 },
    erwartet: [1, 2, 3, 4, 5, 6, 7, 8, 11, 12, 13, 14, 15],
  },
  {
    name: 'Kein Warmwasser ueber die Waermepumpe: die drei Warmwasser-Schritte entfallen',
    antworten: { heizung: 'gas', verbrauchKnown: true, warmwasser: 'nein', duschen: 2, wannen: 1 },
    erwartet: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12],
  },
  {
    name: 'Keine Wanne: der Wannen-Schritt entfaellt, der Duschen-Schritt bleibt',
    antworten: { heizung: 'gas', verbrauchKnown: true, warmwasser: 'ja', duschen: 2, wannen: 0 },
    erwartet: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14],
  },
];

function lauf(sabotage) {
  const box = ladeSkip(sabotage);
  let rot = 0;
  const zeilen = [];
  for (const f of FAELLE) {
    const ist = strecke(box, f.antworten);
    const ok = ist.join(',') === f.erwartet.join(',');
    if (!ok) rot++;
    zeilen.push(
      (ok ? '  gruen ' : '  ROT   ') +
        f.name.padEnd(66).slice(0, 66) +
        (ok
          ? ''
          : '\n          erwartet ' +
            f.erwartet.join(',') +
            '\n          gemessen ' +
            ist.join(','))
    );
  }
  return { rot, zeilen };
}

if (SABOTAGE) {
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

console.log('\nReihenfolge im Markup:');
const markup = new Map(fragenAusMarkup());
let markupFehler = 0;
for (const [nr, anfang] of SOLL_REIHENFOLGE) {
  const ist = markup.get(nr) || '';
  if (!ist.startsWith(anfang.slice(0, 24))) {
    markupFehler++;
    console.log('  ROT   Schritt ' + nr + ' traegt "' + ist + '", erwartet "' + anfang + '"');
  }
}
console.log(
  '  ' +
    (SOLL_REIHENFOLGE.length - markupFehler) +
    ' von ' +
    SOLL_REIHENFOLGE.length +
    ' Schritte an ihrer Stelle.'
);
fehler += markupFehler;

console.log('\nRot-Nachweis, Gegenrichtung:');
for (const name of Object.keys(SABOTAGEN)) {
  const r = lauf(name).rot;
  const faengt = r > 0;
  if (!faengt) fehler++;
  console.log('  ' + (faengt ? 'faengt ' : 'BLIND  ') + name.padEnd(34) + r + ' Faelle rot');
}
console.log(
  fehler === 0
    ? '\nABNAHME GRUEN, und jede Sabotage wird gefangen.'
    : '\nABNAHME ROT: ' + fehler + ' Befunde.'
);
process.exit(fehler === 0 ? 0 : 1);
