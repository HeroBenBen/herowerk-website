#!/usr/bin/env node
// ============================================================
// Job "csp-headers" — Sicherheitskopfzeilen-Pruefung.
// Aufruf: node scripts/header-check.js <basis-adresse>
//
// WARUM DIESE PRUEFUNG DEN MOZILLA-OBSERVATORY-AUFRUF ERSETZT (07.08.2026)
// Die bisherige Fassung (scripts/observatory-check.js) gab die Adresse an einen
// FREMDEN Dienst, der den Rechnernamen von aussen abscannt und eine Schulnote
// zurueckgibt. Daraus folgten drei Schwaechen:
//   1. Der Dienst kann einen Pruefserver im Laufband gar nicht erreichen, und
//      hinter einem Zugriffsschutz bewertet er die Passwortseite. Genau das
//      stand als Einschraenkung im Kopf des alten Skriptes.
//   2. Er bewertete die Vercel-Vorschau, deren Kopfzeilen aus vercel.json
//      stammen. Produktiv kommen sie aus .htaccess. Geprueft wurde also ein
//      Stand, der beim Kunden nie ankommt.
//   3. Eine Schulnote B ist unscharf: sie bleibt gruen, auch wenn eine einzelne
//      Regel still verschwindet.
//
// Diese Fassung vergleicht STATT DESSEN die Zusage gegen die Auslieferung: jede
// Zeile "Header always set" aus der produktiven .htaccess muss in der Antwort des
// Servers wortgleich ankommen. Die Pruefung ist damit in beide Richtungen scharf:
// eine fehlende oder abweichende Kopfzeile macht rot, und eine aus der .htaccess
// entfernte Pflichtkopfzeile macht ebenfalls rot.
// ============================================================
'use strict';

const fs = require('fs');
const path = require('path');

// Ohne diese sechs Kopfzeilen geht die Website nicht live. Sie stehen hier fest,
// damit niemand eine Regel aus der .htaccess entfernen und dabei gruen bleiben
// kann: die Pruefung wuerde sonst einfach weniger vergleichen.
const PFLICHT = [
  'content-security-policy',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
  'x-frame-options',
  'strict-transport-security',
];

/** Liest alle "Header always set <Name> "<Wert>""-Zeilen aus der .htaccess. */
function zusagenAusHtaccess(datei) {
  const text = fs.readFileSync(datei, 'utf8');
  /** @type {Map<string, string>} */
  const zusagen = new Map();
  for (const zeile of text.split('\n')) {
    const roh = zeile.trim();
    if (roh.startsWith('#')) continue;
    const treffer = roh.match(/^Header\s+always\s+set\s+([A-Za-z0-9-]+)\s+"(.*)"\s*$/);
    if (treffer) zusagen.set(treffer[1].toLowerCase(), treffer[2]);
  }
  return zusagen;
}

async function main() {
  const basis = process.argv[2];
  if (!basis) {
    console.error('Aufruf: header-check.js <basis-adresse>');
    process.exit(2);
  }

  const htaccess = path.join(__dirname, '..', '.htaccess');
  const zusagen = zusagenAusHtaccess(htaccess);
  if (zusagen.size === 0) {
    console.error('FEHLER: In .htaccess steht keine einzige "Header always set"-Zeile.');
    console.error('Eine Pruefung ohne Vergleichswerte waere immer gruen und damit wertlos.');
    process.exit(1);
  }

  const fehler = [];

  for (const pflicht of PFLICHT) {
    if (!zusagen.has(pflicht)) {
      fehler.push(`Pflichtkopfzeile ${pflicht} fehlt in .htaccess (dort nicht mehr zugesagt)`);
    }
  }

  const antwort = await fetch(new URL('/', basis), { redirect: 'manual' });
  console.log(`Gemessen gegen ${basis} (HTTP ${antwort.status})`);
  if (antwort.status >= 400) {
    console.error(`FEHLER: Startseite antwortet mit HTTP ${antwort.status}.`);
    process.exit(1);
  }

  for (const [name, zusage] of zusagen) {
    const geliefert = antwort.headers.get(name);
    if (geliefert === null) {
      fehler.push(`${name}: in .htaccess zugesagt, wird aber nicht ausgeliefert`);
      continue;
    }
    if (geliefert.trim() !== zusage.trim()) {
      fehler.push(
        `${name}: Auslieferung weicht von der Zusage ab\n    zugesagt : ${zusage}\n    geliefert: ${geliefert}`,
      );
      continue;
    }
    console.log(`  OK  ${name}`);
  }

  if (fehler.length) {
    fehler.forEach((e) => console.error(`FAIL: ${e}`));
    process.exit(1);
  }
  console.log(`Kopfzeilen-Gate OK (${zusagen.size} Zusagen aus .htaccess, alle wortgleich geliefert).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
