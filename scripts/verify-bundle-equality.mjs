#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import childProcess from 'node:child_process';
import * as acorn from 'acorn';
import * as parse5 from 'parse5';
import { SaxesParser } from 'saxes';

const binaryExtensions = new Set(['.webp', '.jpg', '.jpeg', '.png', '.ico', '.mp4', '.woff2']);

class DifferenceError extends Error {}

function fail(message) {
  throw new Error(message);
}

function difference(message) {
  throw new DifferenceError(message);
}

function slash(value) {
  return value.split(path.sep).join('/');
}

function allFiles(root) {
  const output = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) output.push(slash(path.relative(root, absolute)));
    }
  };
  visit(root);
  return output.toSorted();
}

function exclusions(sourceRoot) {
  const script = fs.readFileSync(path.join(sourceRoot, 'scripts/make-ionos-bundle.sh'), 'utf8');
  const found = [...script.matchAll(/^\s*--exclude '([^']+)' \\$/gm)].map((match) => match[1]);
  if (found.length === 0) fail('Keine --exclude-Zeilen im Buendelskript gefunden.');
  return found;
}

function globRegex(pattern) {
  return new RegExp(
    '^' +
      pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replaceAll('**', '\0')
        .replaceAll('*', '[^/]*')
        .replaceAll('?', '[^/]')
        .replaceAll('\0', '.*') +
      '$'
  );
}

function excluded(relative, patterns) {
  const segments = relative.split('/');
  return patterns.some((rawPattern) => {
    const directoryPattern = rawPattern.endsWith('/');
    const pattern = directoryPattern ? rawPattern.slice(0, -1) : rawPattern;
    const matcher = globRegex(pattern);
    if (pattern.includes('/')) {
      if (directoryPattern) return relative === pattern || relative.startsWith(`${pattern}/`);
      return matcher.test(relative);
    }
    if (directoryPattern) return segments.slice(0, -1).some((segment) => matcher.test(segment));
    return segments.some((segment) => matcher.test(segment));
  });
}

function sourceFiles(sourceRoot, patterns) {
  let files;
  try {
    const result = childProcess.execFileSync('git', ['-C', sourceRoot, 'ls-files', '-z'], {
      encoding: 'utf8',
    });
    files = result.split('\0').filter(Boolean);
  } catch {
    files = allFiles(sourceRoot);
  }
  return files.filter((file) => !excluded(file, patterns)).toSorted();
}

function normalizeVersion(value) {
  if (typeof value !== 'string' || value.includes('://')) return value;
  return value.replace(/\?v=[A-Za-z0-9._-]+/g, '?v=<VERSION>');
}

function jsTree(source, file, sourceType = 'script') {
  let tree;
  try {
    tree = acorn.parse(source, { ecmaVersion: 'latest', sourceType, preserveParens: true });
  } catch (error) {
    fail(`${file}:${error.loc?.line ?? 1}: JavaScript nicht zerlegbar: ${error.message}`);
  }
  const clean = (value, key = '') => {
    if (['start', 'end', 'loc', 'range', 'raw'].includes(key)) return undefined;
    if (typeof value === 'string') return normalizeVersion(value);
    if (Array.isArray(value))
      return value.map((entry) => clean(entry)).filter((entry) => entry !== undefined);
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value)
          .map(([childKey, childValue]) => [childKey, clean(childValue, childKey)])
          .filter(([, childValue]) => childValue !== undefined)
      );
    }
    return value;
  };
  return JSON.stringify(clean(tree));
}

function cssWithoutComments(source, file) {
  let output = '';
  let index = 0;
  while (index < source.length) {
    const quote = source[index];
    if (quote === '"' || quote === "'") {
      const start = index++;
      while (index < source.length) {
        if (source[index] === '\\') index += 2;
        else if (source[index++] === quote) break;
      }
      output += source.slice(start, index);
      continue;
    }
    if (source.startsWith('/*', index)) {
      const close = source.indexOf('*/', index + 2);
      if (close < 0) fail(`${file}: nicht geschlossener Stilkommentar.`);
      index = close + 2;
      continue;
    }
    output += source[index++];
  }
  return normalizeVersion(output).replace(/\s+/g, ' ').trim();
}

function stripMarkupComments(source, spans) {
  const edits = spans.map(({ start, end }) => {
    let lineStart = start;
    while (lineStart > 0 && source[lineStart - 1] !== '\n' && source[lineStart - 1] !== '\r')
      lineStart -= 1;
    let lineEnd = end;
    while (lineEnd < source.length && source[lineEnd] !== '\n' && source[lineEnd] !== '\r')
      lineEnd += 1;
    const beforeSpace = /^[\t \f]*$/.test(source.slice(lineStart, start));
    const afterSpace = /^[\t \f]*$/.test(source.slice(end, lineEnd));
    if (beforeSpace && afterSpace) {
      let newlineEnd = lineEnd;
      if (source[newlineEnd] === '\r' && source[newlineEnd + 1] === '\n') newlineEnd += 2;
      else if (source[newlineEnd] === '\r' || source[newlineEnd] === '\n') newlineEnd += 1;
      return { start: lineStart, end: newlineEnd };
    }
    let whitespaceBefore = start;
    while (whitespaceBefore > lineStart && /[\t \f]/.test(source[whitespaceBefore - 1]))
      whitespaceBefore -= 1;
    let whitespaceAfter = end;
    while (whitespaceAfter < lineEnd && /[\t \f]/.test(source[whitespaceAfter]))
      whitespaceAfter += 1;
    if (!beforeSpace && afterSpace) return { start: whitespaceBefore, end: lineEnd };
    if (beforeSpace && !afterSpace) return { start, end: whitespaceAfter };
    return { start, end };
  });
  let output = source;
  for (const edit of edits.toSorted((left, right) => right.start - left.start)) {
    output = output.slice(0, edit.start) + output.slice(edit.end);
  }
  return output;
}

function canonicalHtml(source, file) {
  const located = parse5.parse(source, { sourceCodeLocationInfo: true });
  const spans = [];
  const locate = (node) => {
    if (node.nodeName === '#comment' && node.sourceCodeLocation) {
      spans.push({
        start: node.sourceCodeLocation.startOffset,
        end: node.sourceCodeLocation.endOffset,
      });
    }
    for (const child of node.childNodes ?? []) locate(child);
    if (node.content) locate(node.content);
  };
  locate(located);
  const document = parse5.parse(stripMarkupComments(source, spans), {
    sourceCodeLocationInfo: false,
  });
  const buildChildren = (children, preserveWhitespace = false) => {
    const result = [];
    for (const child of children ?? []) {
      const built = build(child, preserveWhitespace);
      if (built == null) continue;
      if (built.kind === 'text' && result.at(-1)?.kind === 'text') {
        result.at(-1).value += built.value;
        if (!built.exact && !result.at(-1).exact)
          result.at(-1).value = result.at(-1).value.replace(/\s+/g, ' ');
      } else result.push(built);
    }
    return result;
  };
  const build = (node, preserveWhitespace = false) => {
    if (node.nodeName === '#comment') return null;
    if (node.nodeName === '#text') {
      return {
        kind: 'text',
        value: preserveWhitespace
          ? normalizeVersion(node.value)
          : normalizeVersion(node.value.replace(/\s+/g, ' ')),
        exact: preserveWhitespace,
      };
    }
    if (node.nodeName === '#documentType') return { kind: 'doctype', name: node.name };
    if (node.tagName) {
      const attributes = (node.attrs ?? []).map((attribute) => [
        attribute.name,
        normalizeVersion(attribute.value),
      ]);
      if (
        node.tagName === 'meta' &&
        attributes.some(([name, value]) => name === 'name' && value === 'herowerk-stand')
      ) {
        return null;
      }
      const attributeMap = Object.fromEntries(attributes);
      if (node.tagName === 'script') {
        const type = (attributeMap.type ?? '').trim().toLowerCase();
        const text = (node.childNodes ?? [])
          .filter((child) => child.nodeName === '#text')
          .map((child) => child.value)
          .join('');
        if (type === 'application/ld+json')
          return { kind: 'element', name: node.tagName, attributes, raw: text };
        if (type && type !== 'text/javascript' && type !== 'module')
          fail(`${file}: unbekannter Skripttyp ${type}.`);
        if (!attributeMap.src) {
          return {
            kind: 'element',
            name: node.tagName,
            attributes,
            ast: jsTree(text, file, type === 'module' ? 'module' : 'script'),
          };
        }
      }
      if (node.tagName === 'style') {
        const text = (node.childNodes ?? [])
          .filter((child) => child.nodeName === '#text')
          .map((child) => child.value)
          .join('');
        return {
          kind: 'element',
          name: node.tagName,
          attributes,
          css: cssWithoutComments(text, file),
        };
      }
      const preserve = preserveWhitespace || node.tagName === 'pre' || node.tagName === 'textarea';
      return {
        kind: 'element',
        name: node.tagName,
        attributes,
        children: buildChildren(node.childNodes, preserve),
      };
    }
    return { kind: node.nodeName, children: buildChildren(node.childNodes, preserveWhitespace) };
  };
  const canonical = build(document);
  const children = canonical.children ?? [];
  if (children[0]?.kind === 'text') children[0].value = children[0].value.trimStart();
  if (children.at(-1)?.kind === 'text') children.at(-1).value = children.at(-1).value.trimEnd();
  return JSON.stringify(canonical);
}

function canonicalXml(source, file) {
  const spans = [...source.matchAll(/<!--[\s\S]*?-->/g)].map((match) => ({
    start: match.index,
    end: match.index + match[0].length,
  }));
  source = stripMarkupComments(source, spans);
  const events = [];
  const appendText = (value, exact = false) => {
    const normalized = exact ? value : value.replace(/\s+/g, ' ');
    if (events.at(-1)?.kind === 'text') events.at(-1).value += normalized;
    else events.push({ kind: 'text', value: normalized });
  };
  const parser = new SaxesParser({ fileName: file });
  parser.on('xmldecl', (declaration) => events.push({ kind: 'xmldecl', declaration }));
  parser.on('doctype', (value) => events.push({ kind: 'doctype', value }));
  parser.on('processinginstruction', (value) => events.push({ kind: 'pi', value }));
  parser.on('opentag', (tag) =>
    events.push({
      kind: 'open',
      name: tag.name,
      attributes: Object.entries(tag.attributes).map(([name, value]) => [name, value]),
      selfClosing: tag.isSelfClosing,
    })
  );
  parser.on('closetag', (tag) => events.push({ kind: 'close', name: tag.name }));
  parser.on('text', (value) => appendText(value));
  parser.on('cdata', (value) => appendText(value, true));
  parser.on('comment', () => {});
  parser.write(source).close();
  if (events[0]?.kind === 'text') events[0].value = events[0].value.trimStart();
  if (events.at(-1)?.kind === 'text') events.at(-1).value = events.at(-1).value.trimEnd();
  return JSON.stringify(events);
}

function expectedRobots(source) {
  let output = '';
  for (const line of source.split(/(?<=\r\n|\r|\n)/)) {
    const newline = line.match(/\r\n$|\r$|\n$/)?.[0] ?? '';
    const body = line.slice(0, line.length - newline.length);
    const hash = body.indexOf('#');
    if (hash < 0) output += line;
    else if (body.slice(0, hash).trim() !== '')
      output += body.slice(0, hash).replace(/[\t \f]+$/, '') + newline;
  }
  return output;
}

function compareFile(sourceRoot, bundleRoot, relative) {
  const sourceFile = path.join(sourceRoot, relative);
  const bundleFile = path.join(bundleRoot, relative);
  const sourceBytes = fs.readFileSync(sourceFile);
  const bundleBytes = fs.readFileSync(bundleFile);
  const extension = path.extname(relative).toLowerCase();
  if (
    relative === '.htaccess' ||
    relative === 'llms.txt' ||
    relative.startsWith('api/') ||
    relative.endsWith('.json') ||
    binaryExtensions.has(extension) ||
    relative === 'js/chart-4.4.1.umd.min.js'
  ) {
    if (!sourceBytes.equals(bundleBytes)) difference(`${relative}: Bytevergleich abweichend.`);
    return;
  }
  const source = sourceBytes.toString('utf8');
  const bundle = bundleBytes.toString('utf8');
  let left;
  let right;
  if (extension === '.js') [left, right] = [jsTree(source, relative), jsTree(bundle, relative)];
  else if (extension === '.css') {
    [left, right] = [cssWithoutComments(source, relative), cssWithoutComments(bundle, relative)];
  } else if (extension === '.html')
    [left, right] = [canonicalHtml(source, relative), canonicalHtml(bundle, relative)];
  else if (extension === '.svg' || extension === '.xml') {
    [left, right] = [canonicalXml(source, relative), canonicalXml(bundle, relative)];
  } else if (relative === 'robots.txt') [left, right] = [expectedRobots(source), bundle];
  else fail(`${relative}: Dateiart kann nicht verglichen werden.`);
  if (left !== right) {
    let offset = 0;
    while (offset < left.length && offset < right.length && left[offset] === right[offset])
      offset += 1;
    difference(
      `${relative}: Quelle und Buendel unterscheiden sich ausserhalb der erlaubten Transformation ` +
        `bei Vergleichsposition ${offset}; Quelle ${JSON.stringify(left.slice(Math.max(0, offset - 100), offset + 120))}; ` +
        `Buendel ${JSON.stringify(right.slice(Math.max(0, offset - 100), offset + 120))}.`
    );
  }
}

function main() {
  if (process.argv.length !== 4) {
    console.error('Aufruf: node scripts/verify-bundle-equality.mjs <Quelle> <Buendelordner>');
    process.exit(1);
  }
  const sourceRoot = path.resolve(process.argv[2]);
  const bundleRoot = path.resolve(process.argv[3]);
  try {
    const patterns = exclusions(sourceRoot);
    const expected = sourceFiles(sourceRoot, patterns);
    const actual = allFiles(bundleRoot).filter((file) => file !== 'version.json');
    const missing = expected.filter((file) => !actual.includes(file));
    const extra = actual.filter((file) => !expected.includes(file));
    if (missing.length || extra.length) {
      difference(
        `Dateimenge abweichend; fehlend: ${missing.join(', ') || 'keine'}; ueberzaehlig: ${extra.join(', ') || 'keine'}.`
      );
    }
    for (const relative of expected) compareFile(sourceRoot, bundleRoot, relative);
    console.log(`Buendel-Gleichheitspruefung: GRUEN, ${expected.length} Dateien verglichen.`);
  } catch (error) {
    console.error(`FEHLER: ${error.message}`);
    process.exit(error instanceof DifferenceError ? 1 : 2);
  }
}

main();
