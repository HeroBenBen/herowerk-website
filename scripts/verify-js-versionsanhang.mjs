#!/usr/bin/env node

// 08.11.2026 T1184: Der Jahrescache in js/.htaccess setzt versionierte URLs voraus.
// Nur Node-Bordmittel; auch ungetrackte Auslieferungsdateien werden geprüft.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function globRegex(pattern) {
  return new RegExp(
    '^' +
      pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replaceAll('*', '[^/]*')
        .replaceAll('?', '[^/]') +
      '$'
  );
}

function exclusions() {
  const script = fs.readFileSync(path.join(repo, 'scripts/make-ionos-bundle.sh'), 'utf8');
  const block = script.match(/^rsync -a \\\n([\s\S]*?)^\s*"\$SRC\/" "\$OUT\/"/m)?.[1];
  if (!block) throw new Error('rsync-Ausschlussblock im Bündelskript nicht gefunden.');
  const patterns = [...block.matchAll(/^\s*--exclude '([^']+)' \\$/gm)].map((match) => {
    const raw = match[1];
    const directory = raw.endsWith('/');
    const pattern = directory ? raw.slice(0, -1) : raw;
    return { directory, anchored: pattern.includes('/'), matcher: globRegex(pattern) };
  });
  if (!patterns.length || patterns.length !== (block.match(/--exclude/g) ?? []).length)
    throw new Error('Ausschlüsse im Bündelskript sind leer oder nicht vollständig lesbar.');
  return patterns;
}

function filesToCheck(root, patterns) {
  const files = [];
  const walk = (relative = '') => {
    for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
      const file = relative ? `${relative}/${entry.name}` : entry.name;
      if (
        patterns.some(({ directory, anchored, matcher }) => {
          if (directory && !entry.isDirectory()) return false;
          return matcher.test(anchored ? file : entry.name);
        })
      )
        continue;
      if (entry.isDirectory()) walk(file);
      else if (/\.(?:html|php)$/i.test(file) || file.startsWith('js/')) {
        if (!entry.isFile()) throw new Error(`${file}: Verknüpfung/Sonderdatei nicht prüfbar.`);
        files.push(file);
      }
    }
  };
  walk();
  return files.sort();
}

function references(source, file) {
  // Markup-Kommentare werden nicht ausgeliefert; Positionen für Meldungen erhalten.
  const visible = source.replace(/<!--[\s\S]*?-->/g, (comment) => comment.replace(/[^\n]/g, ' '));
  const found = new Map();
  const add = (raw, offset, context = false) => {
    const value = raw
      .replace(/^[ \t\n\r\f]+|[ \t\n\r\f]+$/g, '')
      .replace(/&amp;|&#38;|&#x26;/gi, '&')
      .replace(/\\\//g, '/');
    // In js/ ist nicht jeder String mit Schrägstrich ein Dateipfad (z. B.
    // application/json). Implizite relative Pfade nur als Skript oder im URL-Kontext.
    if (!context && !/(?:^|\/)js\//.test(value) && !/\.m?js(?:[?#]|$)/i.test(value)) return;
    // Statische Pfadzeichenketten erfassen src/href, from, import(), Worker und
    // beliebige URL-Zuweisungen. Relative Modulpfade in js/ gehören ebenfalls dazu.
    if (!/^(?:(?:https?:)?\/\/|\.?\.?\/|[\w-]+\/|[\w-]+\.[\w.-]+(?:[?#]|$))/i.test(value)) return;
    let url;
    try {
      // Die ausdrücklich geforderte Form 'js/…' auch in verschachtelten Seiten prüfen.
      const base = value.startsWith('js/') ? 'https://herowerk.de/' : `https://herowerk.de/${file}`;
      url = new URL(value, base);
    } catch {
      return;
    }
    if (!['herowerk.de', 'www.herowerk.de'].includes(url.hostname)) return;
    if (!url.pathname.startsWith('/js/') || url.pathname.endsWith('/')) return;
    // Ein leerer, dynamischer oder mehrfacher Versionswert ist kein Hash.
    const versions = url.searchParams.getAll('v');
    const valid =
      versions.length === 1 && /^[a-f0-9]+$/i.test(versions[0]) && url.search.startsWith('?v=');
    found.set(offset, { raw, offset, valid });
  };
  // Nur ganze pfadartige Literale suchen, damit Prosa mit Apostrophen keine
  // echten Attribute verschluckt. Backticks mit ${...} werden nicht grün gewertet.
  const literal =
    /(["'`])([ \t\n\r\f]*(?:(?:https?:)?\/\/|\.{0,2}\/|[\w-]+[/.])[^"'`<>\r\n]*[ \t\n\r\f]*)\1/g;
  for (const match of visible.matchAll(literal)) add(match[2], match.index + 1);
  // HTML erlaubt auch unquoted src/href. Dieselbe Fundstelle nicht doppelt zählen.
  const attribute = /\b(?:src|href)\s*=\s*([^\s"'`=<>][^\s<>]*)/gi;
  for (const match of visible.matchAll(attribute))
    add(match[1], match.index + match[0].length - match[1].length, true);
  const urlContext =
    /(?:\b(?:src|href)\s*=\s*|\bfrom\s+|\bimport\s*(?:\(\s*)?|\bnew\s+(?:Worker|SharedWorker|URL)\s*\(\s*)(["'`])([^"'`<>\r\n]+)\1/g;
  for (const match of visible.matchAll(urlContext))
    add(match[2], match.index + match[0].length - match[2].length - 1, true);
  return [...found.values()].sort((left, right) => left.offset - right.offset);
}

function main() {
  if (process.argv.length > 3)
    throw new Error('Aufruf: node scripts/verify-js-versionsanhang.mjs [Quellordner]');
  const root = path.resolve(process.argv[2] ?? repo);
  const files = filesToCheck(root, exclusions());
  let pages = 0;
  let jsFiles = 0;
  let total = 0;
  const missing = [];
  for (const file of files) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    const refs = references(source, file);
    const page = /\.(?:html|php)$/i.test(file);
    if (page) pages += 1;
    if (file.startsWith('js/')) jsFiles += 1;
    console.log(`  ${page ? 'Seite' : 'JS-Datei'} ${file}: ${refs.length} Referenzen`);
    total += refs.length;
    for (const ref of refs.filter((ref) => !ref.valid)) {
      const line = source.slice(0, ref.offset).split('\n').length;
      missing.push(`${file}:${line}: ${ref.raw}`);
    }
  }
  console.log(`${pages} Seiten, ${jsFiles} Dateien unter js/, ${total} Referenzen gesamt.`);
  if (missing.length) {
    console.error(`FAIL: ${missing.length} Referenzen ohne gültigen ?v=<Hash>:`);
    missing.forEach((entry) => console.error(`  ${entry}`));
  }
  if (total === 0) console.error('FAIL: 0 Referenzen gefunden; kein stummes Grün.');
  if (missing.length || total === 0) process.exitCode = 1;
  else console.log('JS-Versionsanhang: GRÜN, alle Referenzen tragen ?v=<Hash>.');
}

try {
  main();
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
}
