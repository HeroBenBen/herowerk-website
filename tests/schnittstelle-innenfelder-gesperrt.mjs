// ============================================================
// Prueft die Sperre der Auslegungs-Innenfelder an der Rechenschnittstelle.
// GF-Entscheid 24.08.2026, Vorgang T652.
//
// Warum diese Pruefstrecke existiert: die Felder werden weiterhin BERECHNET und nur an der
// Ausgabe entfernt. Eine Sperre, die nur als Funktion im Quelltext steht, aber nirgends
// gerufen wird, ist keine Sperre. Diese Strecke prueft deshalb DREI Dinge getrennt:
//   1. die Filterfunktion nimmt die Innenfelder und laesst die Anzeigefelder stehen,
//   2. sie ist an der einzigen Ausgabestelle tatsaechlich eingehaengt,
//   3. die Ratenbremse steht scharf.
// Dazu kommt der Rot-Nachweis: mit umgelegtem Schalter muss Pruefung 1 rot werden.
// ============================================================
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const quelle = fs.readFileSync(path.join(repoRoot, 'api', 'rechner.php'), 'utf8');
const ergebnisse = [];

function pruefe(name, bestanden, detail) {
  ergebnisse.push({ name, bestanden });
  console.log(`${bestanden ? 'PASS' : 'ROT '} ${name}: ${detail}`);
}

// Beispielantwort mit derselben Verschachtelung wie die echte: Marke, Variantenliste.
const beispiel = {
  bedarf: 14,
  stromverbrauch_kwh: 4676,
  taktpunkt_grenze_c: 7,
  marken: {
    wolf: {
      modell: 'CHA-10',
      brutto: 35349,
      eigenanteil: 12949,
      empfohlen: true,
      leistungsanteil_prozent: 80,
      bivalenzpunkt_c: -7,
      taktpunkt_c: 9,
      ueberSollband: false,
      preis_hinterlegt: true,
      eigenanteilProklima: 11000,
      vorlaeufig: false,
      varianten: [
        { modell: 'CHA-16/20', brutto: 41718, leistungsanteil_prozent: 121.7, bivalenzpunkt_c: -9 },
      ],
    },
  },
};

const innenfelder = [
  'taktpunkt_c',
  'taktpunkt_grenze_c',
  'taktpunkt_grenze_wirksam',
  'bivalenzpunkt_c',
  'leistungsanteil_prozent',
  'ueberSollband',
  'preis_hinterlegt',
  'eigenanteilProklima',
  'vorlaeufig',
];
const anzeigefelder = [
  'bedarf',
  'stromverbrauch_kwh',
  'modell',
  'brutto',
  'eigenanteil',
  'empfohlen',
];

function zaehle(wert, namen) {
  if (Array.isArray(wert)) return wert.reduce((n, e) => n + zaehle(e, namen), 0);
  if (wert && typeof wert === 'object') {
    return Object.entries(wert).reduce(
      (n, [k, v]) => n + (namen.includes(k) ? 1 : 0) + zaehle(v, namen),
      0
    );
  }
  return 0;
}

// Ruft die echte Filterfunktion aus api/rechner.php auf, ohne die Datei auszufuehren:
// Konstanten und Funktion werden herausgeschnitten und in einem eigenen PHP-Lauf gerufen.
function filtereMitEchterFunktion(eingabe, sperreAn) {
  const block = quelle.match(
    /const RECHNER_INNENFELDER_SPERREN[\s\S]*?function rechner_innenfelder_entfernen[\s\S]*?\n}\n/
  );
  if (!block) throw new Error('Filterblock in api/rechner.php nicht gefunden.');
  const code = block[0].replace(
    /const RECHNER_INNENFELDER_SPERREN = \w+;/,
    `const RECHNER_INNENFELDER_SPERREN = ${sperreAn ? 'true' : 'false'};`
  );
  const skript = `<?php\n${code}\necho json_encode(rechner_innenfelder_entfernen(json_decode(file_get_contents('php://stdin'), true)));`;
  const datei = path.join(repoRoot, 'node_modules', '.hw-innenfelder-pruefung.php');
  fs.mkdirSync(path.dirname(datei), { recursive: true });
  fs.writeFileSync(datei, skript);
  try {
    return JSON.parse(execFileSync('php', [datei], { input: JSON.stringify(eingabe) }).toString());
  } finally {
    fs.rmSync(datei, { force: true });
  }
}

// 1. Die Innenfelder verschwinden.
const gefiltert = filtereMitEchterFunktion(beispiel, true);
pruefe(
  'Innenfelder sind aus der Antwort entfernt',
  zaehle(gefiltert, innenfelder) === 0,
  `${zaehle(beispiel, innenfelder)} vorher, ${zaehle(gefiltert, innenfelder)} nachher`
);

// 2. Die Anzeigefelder bleiben unangetastet.
pruefe(
  'Anzeigefelder bleiben vollstaendig',
  zaehle(gefiltert, anzeigefelder) === zaehle(beispiel, anzeigefelder),
  `${zaehle(gefiltert, anzeigefelder)} von ${zaehle(beispiel, anzeigefelder)}`
);

// 3. Auch in der Variantenliste, nicht nur auf der obersten Ebene.
const variante = gefiltert?.marken?.wolf?.varianten?.[0] ?? {};
pruefe(
  'Variantenliste ist mitgefiltert',
  !('leistungsanteil_prozent' in variante) && variante.modell === 'CHA-16/20',
  `Variantenfelder: ${Object.keys(variante).join(', ')}`
);

// 4. ROT-NACHWEIS: mit umgelegtem Schalter muessen die Felder wieder da sein. Ohne diesen
//    Nachweis belegt ein gruener Lauf nur, dass die Beispielantwort leer war.
const ungefiltert = filtereMitEchterFunktion(beispiel, false);
pruefe(
  'Rot-Nachweis: abgeschaltet liefert die Funktion alle Felder',
  zaehle(ungefiltert, innenfelder) === zaehle(beispiel, innenfelder),
  `${zaehle(ungefiltert, innenfelder)} Felder bei ausgeschalteter Sperre`
);

// 5. Der Filter ist an der Ausgabestelle eingehaengt. Eine Funktion, die niemand ruft,
//    ist keine Sperre.
const eingehaengt =
  /\$result = rechner_innenfelder_entfernen\(\$result\);\s*\n\s*echo json_encode\(\$result/.test(
    quelle
  );
pruefe(
  'Filter ist vor der einzigen Ausgabestelle eingehaengt',
  eingehaengt,
  eingehaengt ? 'Aufruf steht direkt vor json_encode' : 'AUFRUF FEHLT'
);

// 6. Die Sperre steht scharf.
pruefe(
  'Sperre der Innenfelder ist eingeschaltet',
  /const RECHNER_INNENFELDER_SPERREN = true;/.test(quelle),
  'RECHNER_INNENFELDER_SPERREN'
);

// 7. Die Ratenbremse steht scharf.
pruefe(
  'Ratenbremse ist scharf geschaltet',
  /const RECHNER_RATE_LIMIT_ENFORCED = true;/.test(quelle),
  'RECHNER_RATE_LIMIT_ENFORCED'
);

const rot = ergebnisse.filter((e) => !e.bestanden);
console.log(`\n${ergebnisse.length - rot.length} von ${ergebnisse.length} Pruefungen gruen.`);
if (rot.length) process.exit(1);
