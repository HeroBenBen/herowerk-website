#!/usr/bin/env node
// Live-Abgleich der Kampagnen-Zielseite /stelle (T1157) gegen ihre beiden Quellen.
//
// WARUM: stelle.html traegt Rollentexte und Verguetung als feste Kopie, damit der
// erste Bildschirm ohne Nachladen steht (Ladezeit unter zwei Sekunden). Eine Kopie
// veraltet still. Dieses Skript vergleicht sie mit
//   1. dem Stellen-Feed https://www.herowerk.de/api/jobs (Quelle der Karriereseite,
//      Verguetung nach dem GF-Entscheid vom 29.07.2026) und
//   2. der oeffentlichen Formularbeschreibung des HubSpot-Formulars c6a199f5
//      (welche Felder registriert sind, welche Rollen-Kennungen es kennt).
// Es liest nur, es schreibt nichts. Es braucht Netz und laeuft deshalb nicht in der
// CI, sondern vor jeder Kampagnen-Aenderung und nach jeder Verguetungsaenderung.
//
// AUFRUF: npm run verify:stelle-live
// Rueckgabe 0 = alles gleich, 1 = Abweichung, 2 = Quelle nicht erreichbar.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FEED = 'https://www.herowerk.de/api/jobs';
const FORMULAR =
  'https://forms-eu1.hsforms.com/embed/v3/form/148110267/c6a199f5-bab6-499e-a3ee-3d9605120877/json';

const html = readFileSync(path.join(ROOT, 'stelle.html'), 'utf8');
const block = html.match(/window\.HW_STELLEN = (\{[\s\S]*?\n {6}\});/);
if (!block) {
  console.error('FEHLER: window.HW_STELLEN in stelle.html nicht gefunden.');
  process.exit(1);
}
const stellen = vm.runInNewContext('(' + block[1] + ')');
const gesendet = [...html.matchAll(/\{ name: '([a-z_]+)', value:/g)].map((m) => m[1]);
for (const m of html.matchAll(/felder\.push\(\{ name: '([a-z_]+)'/g)) gesendet.push(m[1]);

async function holen(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`${url} antwortet ${res.status}`);
  return res.json();
}

let feed, formular;
try {
  [feed, formular] = await Promise.all([holen(FEED), holen(FORMULAR)]);
} catch (e) {
  console.error('QUELLE NICHT ERREICHBAR: ' + e.message);
  process.exit(2);
}

const fehler = [];
const betrag = (wert, einheit) =>
  einheit === 'HOUR'
    ? wert.toFixed(2).replace('.', ',')
    : wert.toLocaleString('de-DE', { maximumFractionDigits: 0 });

for (const [slug, s] of Object.entries(stellen)) {
  const job = feed.find((j) => j.id === slug);
  if (!job) {
    fehler.push(`${slug}: Rolle fehlt im Stellen-Feed.`);
    continue;
  }
  if (s.titel !== job.name) fehler.push(`${slug}: Titel "${s.titel}" statt "${job.name}".`);
  if (s.teaser !== job.teaser) fehler.push(`${slug}: Teaser weicht vom Feed ab.`);
  for (const feld of ['freuen', 'profil']) {
    if (JSON.stringify(s[feld]) !== JSON.stringify(job[feld])) {
      fehler.push(`${slug}: Liste "${feld}" weicht vom Feed ab.`);
    }
  }
  const v = job.verguetung;
  if (!v) {
    fehler.push(`${slug}: Feed traegt keine Verguetung, die Seite nennt aber "${s.gehalt}".`);
    continue;
  }
  const soll = betrag(v.wert, v.einheit);
  if (!s.gehalt.includes(soll + ' €')) {
    fehler.push(`${slug}: Gehalt "${s.gehalt}", Feed-Wert ${soll} (${v.einheit}).`);
  }
  if (/\bbis\b|–/.test(s.gehalt + s.gehaltNeben)) {
    fehler.push(`${slug}: Gehalt als Spanne formuliert, verboten (Entscheid 29.07.2026).`);
  }
  // Der Monatswert bei Stundenlohn muss wortgleich im Feed-Absatz stehen.
  const rund = s.gehaltNeben.match(/rund ([\d.]+) €/);
  if (rund && !v.absaetze.join(' ').includes(`rund ${rund[1]} EUR`)) {
    fehler.push(`${slug}: Monatswert "rund ${rund[1]}" steht so nicht im Feed.`);
  }
}

const felder = formular.form.formFieldGroups.flatMap((g) => g.fields);
const registriert = felder.map((f) => f.name);
for (const name of new Set(gesendet)) {
  if (!registriert.includes(name)) {
    fehler.push(
      `Feld "${name}" wird gesendet, ist am Formular aber nicht registriert (HubSpot verwirft es still).`
    );
  }
}
const rollenFeld = felder.find((f) => f.name === 'beworbene_rolle');
const kennungen = (rollenFeld?.options || []).map((o) => o.value);
for (const slug of Object.keys(stellen)) {
  if (!kennungen.includes(slug))
    fehler.push(`Rollen-Kennung "${slug}" fehlt im Formular-Auswahlfeld.`);
}

if (fehler.length) {
  console.error(`Stelle-Live-Abgleich: ${fehler.length} Abweichung(en)`);
  for (const f of fehler) console.error('  ! ' + f);
  process.exit(1);
}
console.log(
  `Stelle-Live-Abgleich OK: ${Object.keys(stellen).length} Rollen gegen ${FEED}, ` +
    `${new Set(gesendet).size} gesendete Felder gegen ${registriert.length} registrierte, 0 Abweichungen.`
);
