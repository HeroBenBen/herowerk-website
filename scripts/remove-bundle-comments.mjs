#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';
import * as parse5 from 'parse5';
import * as csstree from 'css-tree';
import { parseDocument } from 'htmlparser2';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const allowlistPath = path.join(scriptDir, 'bundle-comment-license-allowlist.json');
const binaryExtensions = new Set(['.webp', '.jpg', '.jpeg', '.png', '.ico', '.mp4', '.woff2']);
const countKeys = ['html', 'inlineCss', 'inlineJs', 'js', 'css', 'svg', 'xml', 'robots'];

function fail(message) {
  throw new Error(message);
}

function lineAt(source, offset) {
  let line = 1;
  for (let index = 0; index < offset; index += 1) {
    if (source[index] === '\n') line += 1;
  }
  return line;
}

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function loadAllowlist() {
  const parsed = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
  if (parsed.version !== 1 || !Array.isArray(parsed.comments)) {
    fail(`Erlaubnisliste ungueltig: ${allowlistPath}`);
  }
  return new Set(parsed.comments.map((entry) => `${entry.path}\0${entry.sha256}`));
}

function decodeUtf8(file) {
  const bytes = fs.readFileSync(file);
  let source;
  try {
    source = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    fail(`Datei ist nicht gueltiges UTF-8: ${file}. Ausweg: Zeichenkodierung klaeren.`);
  }
  if (!Buffer.from(source, 'utf8').equals(bytes)) {
    fail(
      `Zeichenkodierung ist nicht verlustfrei lesbar: ${file}. Ausweg: Datei bytegetreu pruefen.`
    );
  }
  return source;
}

function lineStart(source, offset) {
  let index = offset;
  while (index > 0 && source[index - 1] !== '\n' && source[index - 1] !== '\r') index -= 1;
  return index;
}

function lineEnd(source, offset) {
  let index = offset;
  while (index < source.length && source[index] !== '\n' && source[index] !== '\r') index += 1;
  return index;
}

function newlineEnd(source, offset) {
  if (source[offset] === '\r' && source[offset + 1] === '\n') return offset + 2;
  if (source[offset] === '\r' || source[offset] === '\n') return offset + 1;
  return offset;
}

function isHorizontalWhitespace(value) {
  return /^[\t \f]*$/.test(value);
}

function classifyEdit(source, start, end, language, file) {
  const firstLineStart = lineStart(source, start);
  const lastLineEnd = lineEnd(source, end);
  const beforeOnLine = source.slice(firstLineStart, start);
  const afterOnLine = source.slice(end, lastLineEnd);
  const beforeIsSpace = isHorizontalWhitespace(beforeOnLine);
  const afterIsSpace = isHorizontalWhitespace(afterOnLine);

  if (beforeIsSpace && afterIsSpace) {
    return { start: firstLineStart, end: newlineEnd(source, lastLineEnd), replacement: '' };
  }

  let whitespaceBefore = start;
  while (whitespaceBefore > firstLineStart && /[\t \f]/.test(source[whitespaceBefore - 1])) {
    whitespaceBefore -= 1;
  }
  let whitespaceAfter = end;
  while (whitespaceAfter < lastLineEnd && /[\t \f]/.test(source[whitespaceAfter])) {
    whitespaceAfter += 1;
  }

  if (!beforeIsSpace && afterIsSpace) {
    return { start: whitespaceBefore, end: lastLineEnd, replacement: '' };
  }
  if (beforeIsSpace && !afterIsSpace) {
    return { start, end: whitespaceAfter, replacement: '' };
  }

  if (language === 'js') {
    const comment = source.slice(start, end);
    const newline = comment.match(/\r\n|\r|\n/);
    const hasWhitespaceBefore = start > 0 && /\s/.test(source[start - 1]);
    const hasWhitespaceAfter = end < source.length && /\s/.test(source[end]);
    return {
      start,
      end,
      replacement: newline ? newline[0] : hasWhitespaceBefore || hasWhitespaceAfter ? '' : ' ',
    };
  }
  if (language === 'css') {
    const hasWhitespaceBefore = start > 0 && /\s/.test(source[start - 1]);
    const hasWhitespaceAfter = end < source.length && /\s/.test(source[end]);
    if (!hasWhitespaceBefore && !hasWhitespaceAfter) {
      fail(
        `${file}:${lineAt(source, start)}: Stilkommentar steht ohne Leerraum zwischen Code. ` +
          'Ausweg: Quelle fachlich pruefen; automatisches Entfernen ist nicht sicher.'
      );
    }
    return { start, end, replacement: '' };
  }
  return { start, end, replacement: '' };
}

function applyEdits(source, edits, file) {
  const ascending = edits.toSorted(
    (left, right) => left.start - right.start || left.end - right.end
  );
  const merged = [];
  for (const edit of ascending) {
    const previous = merged.at(-1);
    if (!previous || edit.start >= previous.end) {
      merged.push({ ...edit, combined: false });
      continue;
    }
    const overlap = source.slice(edit.start, Math.min(previous.end, edit.end));
    if (
      previous.replacement !== '' ||
      edit.replacement !== '' ||
      !isHorizontalWhitespace(overlap)
    ) {
      fail(`${file}: ueberlappende Kommentarbereiche. Ausweg: Zerleger pruefen.`);
    }
    previous.end = Math.max(previous.end, edit.end);
    previous.combined = true;
  }
  for (const edit of merged) {
    if (
      edit.combined &&
      edit.start === lineStart(source, edit.start) &&
      edit.end === lineEnd(source, edit.end)
    )
      edit.end = newlineEnd(source, edit.end);
  }
  const ordered = merged.toReversed();
  let lastStart = source.length + 1;
  let output = source;
  for (const edit of ordered) {
    if (edit.end > lastStart)
      fail(`${file}: ueberlappende Kommentarbereiche. Ausweg: Zerleger pruefen.`);
    output = output.slice(0, edit.start) + edit.replacement + output.slice(edit.end);
    lastStart = edit.start;
  }
  return output;
}

function isAllowed(allowlist, relative, source, start, end) {
  return allowlist.has(`${relative}\0${sha256(source.slice(start, end))}`);
}

function jsComments(source, sourceType, file) {
  const comments = [];
  try {
    acorn.parse(source, {
      ecmaVersion: 'latest',
      sourceType,
      locations: true,
      onComment: comments,
    });
  } catch (error) {
    fail(
      `${file}:${error.loc?.line ?? 1}: Skript nicht zerlegbar: ${error.message}. Ausweg: Syntax pruefen.`
    );
  }
  return comments.map((comment) => ({ start: comment.start, end: comment.end }));
}

function cssComments(source, file, context = 'stylesheet') {
  const comments = [];
  try {
    csstree.parse(source, {
      context,
      positions: true,
      onComment(_value, location) {
        comments.push({ start: location.start.offset, end: location.end.offset });
      },
      onParseError(error) {
        throw error;
      },
    });
  } catch (error) {
    fail(
      `${file}:${error.line ?? 1}: Stil nicht zerlegbar: ${error.message}. Ausweg: Syntax pruefen.`
    );
  }
  return comments;
}

function xmlComments(source, file) {
  let document;
  try {
    document = parseDocument(source, {
      xmlMode: true,
      decodeEntities: false,
      withStartIndices: true,
      withEndIndices: true,
    });
  } catch (error) {
    fail(`${file}:1: XML nicht zerlegbar: ${error.message}. Ausweg: XML-Syntax pruefen.`);
  }
  const comments = [];
  const visit = (node) => {
    if (node.type === 'comment') {
      if (node.startIndex == null || node.endIndex == null) {
        fail(`${file}:1: XML-Kommentar ohne Quellposition. Ausweg: Zerleger pruefen.`);
      }
      comments.push({ start: node.startIndex, end: node.endIndex + 1 });
    }
    for (const child of node.children ?? []) visit(child);
  };
  visit(document);
  return comments;
}

function htmlComments(source, file) {
  let document;
  try {
    document = parse5.parse(source, { sourceCodeLocationInfo: true });
  } catch (error) {
    fail(`${file}:1: Seite nicht zerlegbar: ${error.message}. Ausweg: HTML-Syntax pruefen.`);
  }
  const comments = [];
  const embedded = [];
  const visit = (node) => {
    if (node.nodeName === '#comment') {
      const location = node.sourceCodeLocation;
      if (!location)
        fail(`${file}:1: HTML-Kommentar ohne Quellposition. Ausweg: Zerleger pruefen.`);
      comments.push({ start: location.startOffset, end: location.endOffset });
    }
    if (node.tagName === 'script') {
      const location = node.sourceCodeLocation;
      const attributes = Object.fromEntries(
        (node.attrs ?? []).map((entry) => [entry.name, entry.value])
      );
      const type = (attributes.type ?? '').trim().toLowerCase();
      if (
        type &&
        type !== 'text/javascript' &&
        type !== 'module' &&
        type !== 'application/ld+json'
      ) {
        fail(
          `${file}:${location?.startLine ?? 1}: unbekannter Skripttyp ${JSON.stringify(type)}. ` +
            'Ausweg: Typ als text/javascript oder module ausweisen oder fachlich freigeben.'
        );
      }
      if (
        !attributes.src &&
        type !== 'application/ld+json' &&
        location?.startTag &&
        location?.endTag
      ) {
        embedded.push({
          kind: 'js',
          start: location.startTag.endOffset,
          end: location.endTag.startOffset,
          sourceType: type === 'module' ? 'module' : 'script',
        });
      }
    }
    if (node.tagName === 'style') {
      const location = node.sourceCodeLocation;
      if (location?.startTag && location?.endTag) {
        embedded.push({
          kind: 'css',
          start: location.startTag.endOffset,
          end: location.endTag.startOffset,
        });
      }
    }
    if (node.tagName && node.sourceCodeLocation) {
      for (const attribute of node.attrs ?? []) {
        if (attribute.name === 'style') {
          if (
            cssComments(attribute.value, `${file} style-Attribut`, 'declarationList').length > 0
          ) {
            fail(
              `${file}:${node.sourceCodeLocation.startLine}: Kommentar im style-Attribut. ` +
                'Ausweg: Kommentar aus dem Attribut entfernen oder Regel entscheiden.'
            );
          }
        } else if (attribute.name.startsWith('on')) {
          const wrapped = `function __attribut__(){${attribute.value}\n}`;
          if (jsComments(wrapped, 'script', `${file} ${attribute.name}-Attribut`).length > 0) {
            fail(
              `${file}:${node.sourceCodeLocation.startLine}: Kommentar im Ereignis-Attribut ${attribute.name}. ` +
                'Ausweg: Kommentar aus dem Attribut entfernen oder Regel entscheiden.'
            );
          }
        }
      }
    }
    for (const child of node.childNodes ?? []) visit(child);
    if (node.content) visit(node.content);
  };
  visit(document);
  return { comments, embedded };
}

function allFiles(root) {
  const files = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile()) files.push(absolute);
      else
        fail(`${absolute}: unbekannter Dateityp. Ausweg: Verknuepfung oder Sonderdatei entfernen.`);
    }
  };
  walk(root);
  return files.toSorted();
}

function classify(relative) {
  const normalized = relative.split(path.sep).join('/');
  if (normalized === '.htaccess' || normalized === 'llms.txt' || normalized.endsWith('.json'))
    return 'skip';
  if (normalized === 'robots.txt') return 'robots';
  if (normalized.startsWith('api/')) return 'skip';
  const extension = path.extname(normalized).toLowerCase();
  if (binaryExtensions.has(extension)) return 'binary';
  if (['.html', '.js', '.css', '.svg', '.xml'].includes(extension)) return extension.slice(1);
  return 'unknown';
}

function processFile(root, absolute, allowlist, counts) {
  const relative = path.relative(root, absolute).split(path.sep).join('/');
  const kind = classify(relative);
  if (kind === 'skip' || kind === 'binary') return;
  if (kind === 'unknown') {
    fail(
      `${relative}:1: unbekannte Dateiendung. Ausweg: Dateiart einordnen oder aus dem Buendel ausschliessen.`
    );
  }
  const source = decodeUtf8(absolute);
  const edits = [];
  const add = (comments, language, countKey, base = 0) => {
    for (const comment of comments) {
      const start = comment.start + base;
      const end = comment.end + base;
      if (isAllowed(allowlist, relative, source, start, end)) continue;
      edits.push(classifyEdit(source, start, end, language, relative));
      counts[countKey] += 1;
    }
  };

  if (kind === 'js') add(jsComments(source, 'script', relative), 'js', 'js');
  if (kind === 'css') add(cssComments(source, relative), 'css', 'css');
  if (kind === 'svg' || kind === 'xml') add(xmlComments(source, relative), 'xml', kind);
  if (kind === 'html') {
    const parsed = htmlComments(source, relative);
    add(parsed.comments, 'html', 'html');
    for (const block of parsed.embedded) {
      const fragment = source.slice(block.start, block.end);
      if (block.kind === 'js') {
        add(jsComments(fragment, block.sourceType, relative), 'js', 'inlineJs', block.start);
      } else {
        add(cssComments(fragment, relative), 'css', 'inlineCss', block.start);
      }
    }
  }
  if (kind === 'robots') {
    let offset = 0;
    for (const line of source.split(/(?<=\r\n|\r|\n)/)) {
      const body = line.replace(/\r\n$|\r$|\n$/, '');
      const hash = body.indexOf('#');
      if (hash >= 0) {
        const start = offset + hash;
        const end = offset + body.length;
        edits.push(classifyEdit(source, start, end, 'robots', relative));
        counts.robots += 1;
      }
      offset += line.length;
    }
  }

  const output = applyEdits(source, edits, relative);
  if (output !== source) fs.writeFileSync(absolute, output, { encoding: 'utf8' });
}

function main() {
  const rootArgument = process.argv[2];
  if (!rootArgument || process.argv.length !== 3) {
    console.error('Aufruf: node scripts/remove-bundle-comments.mjs <Buendelordner>');
    process.exit(1);
  }
  const root = path.resolve(rootArgument);
  if (!fs.statSync(root, { throwIfNoEntry: false })?.isDirectory()) {
    console.error(`FEHLER: Buendelordner fehlt: ${root}`);
    process.exit(1);
  }
  const counts = Object.fromEntries(countKeys.map((key) => [key, 0]));
  try {
    const allowlist = loadAllowlist();
    for (const file of allFiles(root)) processFile(root, file, allowlist, counts);
  } catch (error) {
    console.error(`FEHLER: ${error.message}`);
    process.exit(1);
  }
  console.log('Entfernte Kommentare:');
  console.log(`  HTML-Kommentarknoten : ${counts.html}`);
  console.log(`  eingebettetes CSS    : ${counts.inlineCss}`);
  console.log(`  eingebettetes JS     : ${counts.inlineJs}`);
  console.log(`  Skriptdateien        : ${counts.js}`);
  console.log(`  Stildateien          : ${counts.css}`);
  console.log(`  SVG                   : ${counts.svg}`);
  console.log(`  XML                   : ${counts.xml}`);
  console.log(`  robots.txt            : ${counts.robots}`);
}

main();
