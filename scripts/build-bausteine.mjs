#!/usr/bin/env node
/**
 * Setzt die drei sichtbaren Bausteine der Ratgeberseiten:
 * Pfadzeile (Brotkrume), zitierfaehiger Fakt-Satz, Begriffsblock "Kurz erklaert".
 * Inhalte stehen in scripts/seiten-bausteine.json, GF-freigegeben am 28.07.2026.
 *
 *   node scripts/build-bausteine.mjs           schreibt
 *   node scripts/build-bausteine.mjs --check    prueft nur (Gate)
 *
 * WICHTIG: die Pfadzeile ist ein <div role="navigation">, KEIN <nav>.
 * css/site.css Zeile 92 formatiert jedes <nav> als fixierte Kopfleiste;
 * ein zweites <nav> auf der Seite wird dadurch still zur zweiten Kopfleiste.
 * Am 28.07.2026 gemessen: top=0 left=0 w=1100 statt top=145 left=170 w=760.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATEN = JSON.parse(readFileSync(join(ROOT, 'scripts/seiten-bausteine.json'), 'utf8')).seiten;
const NUR_PRUEFEN = process.argv.includes('--check');

const A_KRUME = '<!-- BAUSTEIN:BROTKRUME ANFANG -->';
const E_KRUME = '<!-- BAUSTEIN:BROTKRUME ENDE -->';
const A_FAKT = '<!-- BAUSTEIN:FAKT ANFANG -->';
const E_FAKT = '<!-- BAUSTEIN:FAKT ENDE -->';
const A_BEGR = '<!-- BAUSTEIN:BEGRIFFE ANFANG -->';
const E_BEGR = '<!-- BAUSTEIN:BEGRIFFE ENDE -->';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const rx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function ersetzenOderEinfuegen(html, anfang, ende, block, ankerRegex, wo) {
  const vorhanden = new RegExp(`\\s*${rx(anfang)}[\\s\\S]*?${rx(ende)}`);
  if (vorhanden.test(html)) return html.replace(vorhanden, '\n' + block);
  const m = html.match(ankerRegex);
  if (!m) throw new Error(`Anker nicht gefunden: ${ankerRegex}`);
  return wo === 'vor'
    ? html.replace(ankerRegex, block + '\n    ' + m[0])
    : html.replace(ankerRegex, m[0] + '\n' + block);
}

function brotkrume(kurztitel) {
  const links =
    `<a href="/">Start</a><span class="brotkrume-trenner" aria-hidden="true">›</span>` +
    `<a href="/ratgeber">Ratgeber</a><span class="brotkrume-trenner" aria-hidden="true">›</span>` +
    `<span aria-current="page">${esc(kurztitel)}</span>`;
  return (
    `    ${A_KRUME}\n` +
    `    <div class="brotkrume" role="navigation" aria-label="Pfad">${links}</div>\n` +
    `    ${E_KRUME}`
  );
}

function fakt(satz) {
  return `    ${A_FAKT}\n    <p class="fakt-satz">${esc(satz)}</p>\n    ${E_FAKT}`;
}

function begriffe(liste) {
  const eintraege = liste
    .map(([b, e]) => `            <dt>${esc(b)}</dt>\n            <dd>${esc(e)}</dd>`)
    .join('\n');
  return (
    `        ${A_BEGR}\n` +
    `        <section class="begriffe" aria-labelledby="begriffe-titel">\n` +
    `          <h2 id="begriffe-titel">Kurz erklärt</h2>\n` +
    `          <dl>\n${eintraege}\n          </dl>\n` +
    `        </section>\n` +
    `        ${E_BEGR}`
  );
}

/**
 * Jede Zahl im Fakt-Satz muss auf derselben Seite sichtbar stehen.
 * Der Satz ist zum Zitieren gedacht, also darf er nichts behaupten, was die
 * Seite nicht selbst belegt. Geprueft wird gegen den Seitentext OHNE den
 * Fakt-Satz, sonst belegt er sich selbst.
 */
function zahlenBelegt(slug, satz, html) {
  const ohneBaustein = html.replace(new RegExp(`${rx(A_FAKT)}[\\s\\S]*?${rx(E_FAKT)}`, 'g'), ' ');
  const text = ohneBaustein
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
  const zahlen = [...new Set(satz.match(/\d[\d.,]*\d|\d/g) || [])];
  return zahlen.filter((z) => !text.includes(z));
}

let geschrieben = 0;
const abweichungen = [];
const unbelegt = [];
let zKrume = 0,
  zFakt = 0,
  zBegriffe = 0,
  zZahlen = 0;

for (const [slug, d] of Object.entries(DATEN)) {
  const pfad = join(ROOT, `${slug}.html`);
  const alt = readFileSync(pfad, 'utf8');
  let neu = alt;

  const fehlend = zahlenBelegt(slug, d.fakt, alt);
  zZahlen += (d.fakt.match(/\d[\d.,]*/g) || []).length;
  if (fehlend.length) unbelegt.push(`${slug}: ${fehlend.join(', ')}`);

  neu = ersetzenOderEinfuegen(neu, A_KRUME, E_KRUME, brotkrume(d.brotkrume), /<h1[^>]*>/, 'vor');
  neu = ersetzenOderEinfuegen(neu, A_FAKT, E_FAKT, fakt(d.fakt), /<h1[^>]*>[\s\S]*?<\/h1>/, 'nach');
  neu = ersetzenOderEinfuegen(
    neu,
    A_BEGR,
    E_BEGR,
    begriffe(d.begriffe),
    /<div class="ra-cta">[\s\S]*?<\/div>/,
    'nach'
  );

  zKrume += 1;
  zFakt += 1;
  zBegriffe += d.begriffe.length;

  if (neu !== alt) {
    abweichungen.push(`${slug}.html`);
    geschrieben += 1;
    if (!NUR_PRUEFEN) writeFileSync(pfad, neu);
  }
}

if (unbelegt.length) {
  console.error('Fakt-Satz mit Zahl, die auf der Seite nicht steht:');
  unbelegt.forEach((z) => console.error('  ' + z));
  console.error('Ein zitierfaehiger Satz darf nichts behaupten, was die Seite nicht belegt.');
  process.exit(1);
}

if (NUR_PRUEFEN) {
  if (geschrieben > 0) {
    console.error(`Bausteine NICHT aktuell: ${abweichungen.join(', ')}`);
    console.error('Behebung: npm run build:bausteine');
    process.exit(1);
  }
  console.log(
    `Bausteine aktuell: ${zKrume} Pfadzeilen, ${zFakt} Fakt-Saetze, ${zBegriffe} Begriffe, ${zZahlen} gepruefte Zahlen auf ${Object.keys(DATEN).length} Seiten, 0 Abweichungen.`
  );
} else {
  console.log(
    `Bausteine gesetzt: ${zKrume} Pfadzeilen, ${zFakt} Fakt-Saetze, ${zBegriffe} Begriffe, ${geschrieben} Datei(en) geschrieben.`
  );
}
