#!/usr/bin/env node
// ============================================================
// Job "csp-headers" — Sicherheitskopfzeilen-, JavaScript- und JSON-Prüfung.
// Aufruf: node scripts/header-check.js <basis-adresse> [--intern-api]
// JSON: zuerst Preis-API; nur bei HTTP 404 oder PHP-Quelltext auf
// /produkte_HERO.json ausweichen. HTTP 200, application/json, gzip und gültiges
// JSON sind Pflicht. --intern-api prüft zusätzlich nach der Live-Auslieferung
// zwei interne APIs ohne Anmeldung auf HTTP 403, JSON und no-store ohne Jahrescache.
// Ohne diesen Schalter werden keine internen APIs angefragt.
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
const { Parser } = require('htmlparser2');

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

// 08.11.2026 T1184: Versionen aus dem ausgelieferten Bündel lesen, denn dessen
// Kommentarentfernung kann andere Inhalts-Hashes als im Arbeitsbaum erzeugen.
async function javascriptPruefen(startseite, basis, fehler) {
  const pfade = ['/js/site.js', '/js/theme.js', '/js/consent.js'];
  /** @type {Map<string, URL>} */
  const skripte = new Map();
  const parser = new Parser({
    onopentag(name, attribute) {
      if (name !== 'script' || !attribute.src) return;
      const adresse = new URL(attribute.src, new URL('/', basis));
      if (adresse.origin === new URL(basis).origin && pfade.includes(adresse.pathname)) {
        skripte.set(adresse.pathname, adresse);
      }
    },
  });
  parser.end(startseite);

  for (const pfad of pfade) {
    const version = skripte.get(pfad)?.searchParams.get('v');
    if (!version) {
      fehler.push(`${pfad}: Startseite enthält keine Einbindung mit ?v=<Version>`);
      continue;
    }
    const adresse = new URL(pfad, basis);
    adresse.searchParams.set('v', version);
    const antwort = await fetch(adresse, {
      redirect: 'manual',
      headers: { 'Accept-Encoding': 'gzip' },
    });
    const kennung = adresse.pathname + adresse.search;
    if (antwort.status !== 200) {
      fehler.push(`${kennung}: erwartet HTTP 200, geliefert HTTP ${antwort.status}`);
      await antwort.body?.cancel();
      continue;
    }
    const kompression = antwort.headers.get('content-encoding');
    const cache = antwort.headers.get('cache-control');
    if (kompression?.trim().toLowerCase() !== 'gzip') {
      fehler.push(
        `${kennung}: content-encoding erwartet gzip, geliefert ${kompression ?? 'fehlt'}`
      );
    }
    if (!hatJahrescache(cache)) {
      fehler.push(
        `${kennung}: Cache-Control erwartet max-age=31536000, geliefert ${cache ?? 'fehlt'}`
      );
    }
    if (kompression?.trim().toLowerCase() === 'gzip' && hatJahrescache(cache)) {
      console.log(`  OK  ${kennung}: gzip und max-age=31536000`);
    }
    await antwort.body?.cancel();
  }

  // Optionale Gegenprobe außerhalb von /js/. Lokal NACH dem Bündelbau auslösen:
  // mkdir -p /tmp/pruefserver-buendel/t1184-cache-probe
  // printf 'void 0;\n' > /tmp/pruefserver-buendel/t1184-cache-probe/probe.js
  // printf 'ForceType text/javascript\n' > /tmp/pruefserver-buendel/t1184-cache-probe/.htaccess
  // Bei PRUEFSERVER_BUNDLE den Pfad anpassen. Nur im lokalen Bündel anlegen.
  const probe = '/t1184-cache-probe/probe.js';
  const antwort = await fetch(new URL(probe, basis), { redirect: 'manual' });
  const typ = antwort.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  const cache = antwort.headers.get('cache-control');
  if (antwort.status === 404 || antwort.status === 410) {
    console.log(
      `  HINWEIS  ${probe}: fehlt; Gegenprobe für text/javascript außerhalb von /js/ entfällt`
    );
  } else if (antwort.status !== 200) {
    fehler.push(
      `${probe}: Gegenprobe erwartet HTTP 200 oder fehlende Datei, geliefert HTTP ${antwort.status}`
    );
  } else if (typ !== 'text/javascript') {
    fehler.push(`${probe}: Gegenprobe erwartet text/javascript, geliefert ${typ ?? 'fehlt'}`);
  } else if (hatJahrescache(cache)) {
    fehler.push(`${probe}: text/javascript außerhalb von /js/ darf kein max-age=31536000 tragen`);
  } else {
    console.log(`  OK  ${probe}: text/javascript außerhalb von /js/ ohne Jahrescache`);
  }
  await antwort.body?.cancel();
}

function hatJahrescache(cache) {
  return /(?:^|,)\s*max-age\s*=\s*"?31536000"?\s*(?:,|$)/i.test(cache ?? '');
}

// fetch entpackt gzip automatisch. JSON.parse prüft deshalb den entpackten
// Inhalt; Content-Encoding darf am Antwortkopf trotzdem noch gzip heißen.
async function jsonPruefen(basis, fehler) {
  const api = '/api/rechner?action=preise&origin=https://herowerk.de';
  const abrufen = (pfad) =>
    fetch(new URL(pfad, basis), {
      redirect: 'manual',
      headers: {
        'Accept-Encoding': 'gzip',
        ...(pfad === api ? { Origin: new URL(basis).origin } : {}),
      },
    });
  let pfad = api;
  let antwort = await abrufen(pfad);
  let inhalt;
  if (antwort.status !== 404) {
    try {
      inhalt = await antwort.text();
    } catch (error) {
      fehler.push(`${pfad}: JSON-Antwort nicht entpackbar oder lesbar: ${error.message}`);
      return;
    }
  }
  if (antwort.status === 404 || inhalt?.startsWith('<?php')) {
    const grund =
      antwort.status === 404 ? 'HTTP 404' : 'PHP-Quelltext (Prüfserver ohne Interpreter)';
    console.log(`  HINWEIS  ${api}: ${grund}; JSON-Probe mit /produkte_HERO.json`);
    if (!antwort.bodyUsed) await antwort.body?.cancel();
    pfad = '/produkte_HERO.json';
    antwort = await abrufen(pfad);
    inhalt = undefined;
  }
  if (antwort.status !== 200) {
    fehler.push(`${pfad}: JSON-Probe erwartet HTTP 200, geliefert HTTP ${antwort.status}`);
    if (!antwort.bodyUsed) await antwort.body?.cancel();
    return;
  }
  const typ = antwort.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (typ !== 'application/json') {
    fehler.push(`${pfad}: content-type erwartet application/json, geliefert ${typ ?? 'fehlt'}`);
  }
  const encoding = antwort.headers.get('content-encoding');
  if (encoding?.trim().toLowerCase() !== 'gzip') {
    fehler.push(
      `${pfad}: JSON-Probe erwartet content-encoding gzip, geliefert ${encoding ?? 'fehlt'}`
    );
  }
  try {
    JSON.parse(inhalt ?? (await antwort.text()));
    if (typ === 'application/json' && encoding?.trim().toLowerCase() === 'gzip') {
      console.log(
        `  OK  ${pfad}: application/json, JSON.parse erfolgreich (Encoding: ${encoding})`
      );
    }
  } catch (error) {
    fehler.push(`${pfad}: JSON-Antwort nicht entpackbar oder ungültig: ${error.message}`);
  }
}

async function internApiPruefen(basis, fehler) {
  for (const pfad of [
    '/intern/api/aufnahme-vorgaenge.php',
    '/intern/api/aufnahme-vorbelegung.php',
  ]) {
    const vorher = fehler.length;
    const antwort = await fetch(new URL(pfad, basis), { redirect: 'manual' });
    if (antwort.status !== 403) {
      fehler.push(`${pfad}: erwartet HTTP 403 ohne Anmeldung, geliefert HTTP ${antwort.status}`);
    }
    const typ = antwort.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    if (typ !== 'application/json') {
      fehler.push(`${pfad}: content-type erwartet application/json, geliefert ${typ ?? 'fehlt'}`);
    }
    const cache = antwort.headers.get('cache-control');
    if (!/(?:^|,)\s*no-store\s*(?:,|$)/i.test(cache ?? '')) {
      fehler.push(`${pfad}: Cache-Control erwartet no-store, geliefert ${cache ?? 'fehlt'}`);
    }
    if (hatJahrescache(cache)) {
      fehler.push(`${pfad}: Cache-Control darf kein max-age=31536000 enthalten`);
    }
    try {
      JSON.parse(await antwort.text());
    } catch (error) {
      fehler.push(`${pfad}: JSON-Antwort nicht entpackbar oder ungültig: ${error.message}`);
    }
    if (fehler.length === vorher) {
      console.log(
        `  OK  ${pfad}: HTTP 403, application/json, gültiges JSON, no-store ohne Jahrescache`
      );
    }
  }
}

async function main() {
  const argumente = process.argv.slice(2);
  const basis = argumente.find((argument) => argument !== '--intern-api');
  if (!basis) {
    console.error('Aufruf: node scripts/header-check.js <basis-adresse> [--intern-api]');
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
        `${name}: Auslieferung weicht von der Zusage ab\n    zugesagt : ${zusage}\n    geliefert: ${geliefert}`
      );
      continue;
    }
    console.log(`  OK  ${name}`);
  }

  await javascriptPruefen(await antwort.text(), basis, fehler);
  await jsonPruefen(basis, fehler);
  if (argumente.includes('--intern-api')) {
    await internApiPruefen(basis, fehler);
  }

  if (fehler.length) {
    fehler.forEach((e) => console.error(`FAIL: ${e}`));
    process.exit(1);
  }
  console.log(
    `Kopfzeilen-Gate OK (${zusagen.size} Zusagen aus .htaccess, alle wortgleich geliefert).`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
