#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { parseDocument } from 'htmlparser2';
import { SaxesParser } from 'saxes';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultAllowlist = path.join(scriptDir, 'bundle-comment-license-allowlist.json');
const binaryExtensions = new Set(['.webp', '.jpg', '.jpeg', '.png', '.ico', '.mp4', '.woff2']);

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function lineAt(source, offset) {
  let line = 1;
  for (let index = 0; index < offset; index += 1) if (source[index] === '\n') line += 1;
  return line;
}

function excerpt(raw) {
  return raw.replace(/\s+/g, ' ').trim().slice(0, 60);
}

function attributeValueRange(source, node, targetName) {
  let index = (node.startIndex ?? 0) + 1;
  while (index < source.length && !/[\s/>]/.test(source[index])) index += 1;
  while (index < source.length) {
    while (/\s/.test(source[index] ?? '')) index += 1;
    if (source[index] === '>' || source.startsWith('/>', index)) break;
    if (source[index] === '/') {
      index += 1;
      continue;
    }
    const nameStart = index;
    while (index < source.length && !/[\s=/>]/.test(source[index])) index += 1;
    const name = source.slice(nameStart, index).toLowerCase();
    while (/\s/.test(source[index] ?? '')) index += 1;
    if (source[index] !== '=') continue;
    index += 1;
    while (/\s/.test(source[index] ?? '')) index += 1;
    const quote = source[index] === '"' || source[index] === "'" ? source[index] : null;
    const start = quote ? index + 1 : index;
    if (quote) {
      index = source.indexOf(quote, start);
      if (index < 0) return null;
    } else {
      while (index < source.length && !/[\s>]/.test(source[index])) index += 1;
    }
    if (name === targetName) return { start, end: index };
    if (quote) index += 1;
  }
  return null;
}

function loadAllowlist(file) {
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (parsed.version !== 1 || !Array.isArray(parsed.comments))
    throw new Error(`Erlaubnisliste ungueltig: ${file}`);
  return new Set(parsed.comments.map((entry) => `${entry.path}\0${entry.sha256}`));
}

function typescriptComments(source, file, scriptKind = ts.ScriptKind.JS) {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, scriptKind);
  if (sourceFile.parseDiagnostics.length > 0) {
    const diagnostic = sourceFile.parseDiagnostics[0];
    throw new Error(
      `${file}:${lineAt(source, diagnostic.start ?? 0)}: Skript nicht zerlegbar: ` +
        ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')
    );
  }
  const ranges = new Map();
  const add = (range) => {
    if (range)
      for (const item of range)
        ranges.set(`${item.pos}:${item.end}`, { start: item.pos, end: item.end });
  };
  const visit = (node) => {
    add(ts.getLeadingCommentRanges(source, node.getFullStart()));
    add(ts.getTrailingCommentRanges(source, node.getEnd()));
    for (const child of node.getChildren(sourceFile)) visit(child);
  };
  visit(sourceFile);
  return [...ranges.values()].toSorted((left, right) => left.start - right.start);
}

function cssComments(source) {
  const found = [];
  let index = 0;
  while (index < source.length) {
    const quote = source[index];
    if (quote === '"' || quote === "'") {
      index += 1;
      while (index < source.length) {
        if (source[index] === '\\') index += 2;
        else if (source[index] === quote) {
          index += 1;
          break;
        } else index += 1;
      }
      continue;
    }
    if (/[uU]/.test(source[index])) {
      const match = source.slice(index).match(/^url\s*\(/i);
      if (match) {
        let cursor = index + match[0].length;
        while (/\s/.test(source[cursor] ?? '')) cursor += 1;
        if (source[cursor] !== '"' && source[cursor] !== "'") {
          while (cursor < source.length && source[cursor] !== ')') {
            cursor += source[cursor] === '\\' ? 2 : 1;
          }
          index = Math.min(source.length, cursor + 1);
          continue;
        }
      }
    }
    if (source.startsWith('/*', index)) {
      const close = source.indexOf('*/', index + 2);
      if (close < 0) throw new Error('Stilkommentar ist nicht geschlossen');
      found.push({ start: index, end: close + 2 });
      index = close + 2;
      continue;
    }
    index += source[index] === '\\' ? 2 : 1;
  }
  return found;
}

function xmlComments(source, file) {
  const found = [];
  const parser = new SaxesParser({ fileName: file });
  parser.on('comment', (text) => {
    const parserEnd = parser.position;
    const rawLength = text.length + 7;
    const guessedStart = parserEnd - rawLength;
    const start = source.lastIndexOf('<!--', parserEnd);
    const close = source.indexOf('-->', Math.max(0, start));
    found.push({
      start: start >= 0 ? start : guessedStart,
      end: close >= 0 ? close + 3 : parserEnd,
    });
  });
  parser.write(source).close();
  return found;
}

function htmlFindings(source, file) {
  const document = parseDocument(source, {
    decodeEntities: false,
    withStartIndices: true,
    withEndIndices: true,
  });
  const findings = [];
  const visit = (node) => {
    if (node.type === 'comment' && node.startIndex != null && node.endIndex != null) {
      findings.push({ kind: 'html', start: node.startIndex, end: node.endIndex + 1 });
    }
    if (node.type === 'script') {
      const type = (node.attribs?.type ?? '').trim().toLowerCase();
      if (
        type &&
        type !== 'text/javascript' &&
        type !== 'module' &&
        type !== 'application/ld+json'
      ) {
        findings.push({
          kind: 'unknownScriptType',
          start: node.startIndex ?? 0,
          end: node.startIndex ?? 0,
          type,
        });
      } else if (!node.attribs?.src && type !== 'application/ld+json') {
        for (const child of node.children ?? []) {
          if (child.type !== 'text' || child.startIndex == null) continue;
          for (const comment of typescriptComments(child.data, file)) {
            findings.push({
              kind: 'inlineJs',
              start: child.startIndex + comment.start,
              end: child.startIndex + comment.end,
            });
          }
        }
      }
    }
    if (node.type === 'style') {
      for (const child of node.children ?? []) {
        if (child.type !== 'text' || child.startIndex == null) continue;
        for (const comment of cssComments(child.data)) {
          findings.push({
            kind: 'inlineCss',
            start: child.startIndex + comment.start,
            end: child.startIndex + comment.end,
          });
        }
      }
    }
    if (node.type === 'tag' || node.type === 'script' || node.type === 'style') {
      for (const [name, value] of Object.entries(node.attribs ?? {})) {
        if (name === 'style') {
          const comments = cssComments(value);
          const attribute = comments.length > 0 ? attributeValueRange(source, node, name) : null;
          for (const comment of comments) {
            findings.push({
              kind: 'styleAttribute',
              start: attribute ? attribute.start + comment.start : (node.startIndex ?? 0),
              end: attribute ? attribute.start + comment.end : (node.startIndex ?? 0),
            });
          }
        } else if (name.startsWith('on')) {
          const prefix = 'function __attribut__(){';
          const wrapped = `${prefix}${value}\n}`;
          const comments = typescriptComments(wrapped, `${file} ${name}-Attribut`);
          const attribute = comments.length > 0 ? attributeValueRange(source, node, name) : null;
          for (const comment of comments) {
            findings.push({
              kind: 'eventAttribute',
              start: attribute
                ? attribute.start + comment.start - prefix.length
                : (node.startIndex ?? 0),
              end: attribute
                ? attribute.start + comment.end - prefix.length
                : (node.startIndex ?? 0),
            });
          }
        }
      }
    }
    for (const child of node.children ?? []) visit(child);
  };
  visit(document);
  return findings;
}

function allFiles(root) {
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) files.push(absolute);
      else files.push(absolute);
    }
  };
  visit(root);
  return files.toSorted();
}

function classification(relative) {
  if (relative === '.htaccess') return ['ausgenommen', '.htaccess wird nicht ausgeliefert'];
  if (relative.startsWith('api/')) return ['ausgenommen', 'api wird serverseitig ausgefuehrt'];
  if (relative.endsWith('.json')) return ['ausgenommen', 'JSON ist kein Kommentarscope'];
  if (relative === 'llms.txt') return ['ausgenommen', 'Rautenzeilen sind Ueberschriften'];
  if (relative === 'robots.txt') return ['geprueft', 'robots'];
  const extension = path.extname(relative).toLowerCase();
  if (binaryExtensions.has(extension)) return ['binaer', extension];
  if (['.html', '.js', '.css', '.svg', '.xml'].includes(extension))
    return ['geprueft', extension.slice(1)];
  return ['unbekannt', extension || 'ohne Endung'];
}

function parseArguments(argv) {
  let allowlist = defaultAllowlist;
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--erlaubnisliste') {
      allowlist = path.resolve(argv[index + 1] ?? '');
      index += 1;
    } else positional.push(argv[index]);
  }
  if (positional.length !== 1)
    throw new Error('Aufruf: verify-bundle-comments.mjs [--erlaubnisliste DATEI] <Buendelordner>');
  return { root: path.resolve(positional[0]), allowlist };
}

function main() {
  let args;
  try {
    args = parseArguments(process.argv.slice(2));
  } catch (error) {
    console.error(`FEHLER: ${error.message}`);
    process.exit(2);
  }
  if (!fs.statSync(args.root, { throwIfNoEntry: false })?.isDirectory()) {
    console.error(`FEHLER: Buendelordner fehlt: ${args.root}`);
    process.exit(2);
  }
  const counts = { html: 0, inlineCss: 0, inlineJs: 0, js: 0, css: 0, svg: 0, xml: 0, robots: 0 };
  const hits = [];
  let allowedCount = 0;
  let allowlist;
  try {
    allowlist = loadAllowlist(args.allowlist);
    for (const absolute of allFiles(args.root)) {
      const relative = path.relative(args.root, absolute).split(path.sep).join('/');
      const [group, kind] = classification(relative);
      if (group === 'unbekannt') {
        hits.push({ relative, line: 1, text: `unbekannte Dateiendung ${kind}` });
        continue;
      }
      if (group !== 'geprueft') continue;
      const source = fs.readFileSync(absolute, 'utf8');
      const add = (items, countKey) => {
        for (const item of items) {
          counts[countKey] += 1;
          if (item.kind === 'unknownScriptType') {
            hits.push({
              relative,
              line: lineAt(source, item.start),
              text: `unbekannter Skripttyp ${item.type}`,
            });
            continue;
          }
          const raw = source.slice(item.start, item.end);
          if (allowlist.has(`${relative}\0${sha256(raw)}`)) allowedCount += 1;
          else hits.push({ relative, line: lineAt(source, item.start), text: excerpt(raw) });
        }
      };
      if (kind === 'html') {
        for (const item of htmlFindings(source, relative)) {
          const key =
            item.kind === 'html'
              ? 'html'
              : item.kind === 'inlineCss' || item.kind === 'styleAttribute'
                ? 'inlineCss'
                : 'inlineJs';
          add([item], key);
        }
      } else if (kind === 'js') add(typescriptComments(source, relative), 'js');
      else if (kind === 'css') add(cssComments(source), 'css');
      else if (kind === 'svg' || kind === 'xml') add(xmlComments(source, relative), kind);
      else if (kind === 'robots') {
        let offset = 0;
        const comments = [];
        for (const line of source.split(/(?<=\r\n|\r|\n)/)) {
          const body = line.replace(/\r\n$|\r$|\n$/, '');
          const hash = body.indexOf('#');
          if (hash >= 0) comments.push({ start: offset + hash, end: offset + body.length });
          offset += line.length;
        }
        add(comments, 'robots');
      }
    }
  } catch (error) {
    console.error(`FEHLER: ${error.message}`);
    process.exit(2);
  }

  console.log(
    `Kommentarzaehlung: HTML ${counts.html}, eingebettetes CSS ${counts.inlineCss}, ` +
      `eingebettetes JS ${counts.inlineJs}, JS ${counts.js}, CSS ${counts.css}, ` +
      `SVG ${counts.svg}, XML ${counts.xml}, robots.txt ${counts.robots}; erlaubt ${allowedCount}.`
  );
  if (hits.length > 0) {
    for (const hit of hits) console.error(`TREFFER ${hit.relative}:${hit.line}: ${hit.text}`);
    process.exit(1);
  }
  console.log('Buendel-Kommentarpruefung: GRUEN.');
}

main();
