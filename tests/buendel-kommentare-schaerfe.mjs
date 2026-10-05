#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import childProcess from 'node:child_process';
import * as acorn from 'acorn';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const fixtureFile = path.join(root, 'tests/fixtures/buendel-kommentare/faelle.json');
const fixtures = JSON.parse(fs.readFileSync(fixtureFile, 'utf8'));
const checker = path.join(root, 'scripts/verify-bundle-comments.mjs');
const remover = path.join(root, 'scripts/remove-bundle-comments.mjs');
const equality = path.join(root, 'scripts/verify-bundle-equality.mjs');
const makeBundle = path.join(root, 'scripts/make-ionos-bundle.sh');
const productionAllowlist = path.join(root, 'scripts/bundle-comment-license-allowlist.json');
let failures = 0;

function temporary(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `hw-t1182-${label}-`));
}

function write(rootDirectory, relative, content) {
  const target = path.join(rootDirectory, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function run(command, args, options = {}) {
  return childProcess.spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: options.encoding ?? 'utf8',
    env: options.env ?? process.env,
  });
}

function record(number, description, ok, detail = '') {
  if (ok) console.log(`PASS Fall ${number}: ${description}`);
  else {
    failures += 1;
    console.error(`ROT Fall ${number}: ${description}${detail ? `: ${detail}` : ''}`);
  }
}

function bundleWith(files) {
  const directory = temporary('bundle');
  write(directory, '.htaccess', 'Require all granted\n');
  for (const [relative, content] of Object.entries(files)) write(directory, relative, content);
  return directory;
}

function checkerResult(directory, allowlist) {
  const args = [checker];
  if (allowlist) args.push('--erlaubnisliste', allowlist);
  args.push(directory);
  return run(process.execPath, args);
}

function removerResult(directory) {
  return run(process.execPath, [remover, directory]);
}

function checkerRedCases() {
  const descriptions = {
    1: 'HTML-Kommentar',
    2: 'Kommentar im Stilblock',
    3: 'Zeilenkommentar im Skriptblock',
    4: 'Zeilenkommentar hinter Code',
    5: 'Blockkommentar in Skriptdatei',
    6: 'Kommentar in Stildatei',
    7: 'Kommentar mitten in Stil-Deklaration',
    8: 'Kommentar in SVG',
    9: 'Kommentar in XML',
    10: 'Kommentar in robots.txt',
    11: 'Kommentar im style-Attribut',
    12: 'Kommentar im Ereignis-Attribut',
    13: 'unbekannte Textendung',
  };
  for (const [number, fixture] of Object.entries(fixtures.checkerRot)) {
    const red = bundleWith({ [fixture.name]: fixture.content });
    const green = bundleWith({ 'index.html': '<!doctype html><p>ok</p>' });
    const redResult = checkerResult(red);
    const greenResult = checkerResult(green);
    record(
      number,
      descriptions[number],
      redResult.status === 1 && greenResult.status === 0,
      redResult.stderr
    );
    fs.rmSync(red, { recursive: true, force: true });
    fs.rmSync(green, { recursive: true, force: true });
  }
}

function licenseCheckerCases() {
  const allowDirectory = temporary('allow');
  const raw = '/*! erlaubter Testhinweis */';
  const digest = crypto.createHash('sha256').update(raw).digest('hex');
  const allowFile = path.join(allowDirectory, 'allow.json');
  fs.writeFileSync(
    allowFile,
    JSON.stringify({ version: 1, comments: [{ path: 'js/erlaubt.js', sha256: digest }] })
  );
  const wrongPath = bundleWith({ 'js/falsch.js': `${raw}\nvoid 0;` });
  const wrongText = bundleWith({ 'js/erlaubt.js': '/*! veraenderter Testhinweis */\nvoid 0;' });
  const green = bundleWith({ 'js/erlaubt.js': `${raw}\nvoid 0;` });
  record(
    14,
    'erlaubter Wortlaut am falschen Pfad',
    checkerResult(wrongPath, allowFile).status === 1 && checkerResult(green, allowFile).status === 0
  );
  record(
    15,
    'veraenderter Wortlaut am erlaubten Pfad',
    checkerResult(wrongText, allowFile).status === 1 && checkerResult(green, allowFile).status === 0
  );
  for (const directory of [allowDirectory, wrongPath, wrongText, green])
    fs.rmSync(directory, { recursive: true, force: true });
}

function unchangedCases() {
  const descriptions = {
    16: 'Adresse in JavaScript-Zeichenkette',
    17: 'Kommentarzeichen in String, Template und RegExp',
    18: 'HTML-Kommentarzeichen im Skriptstring',
    19: 'CSS-Kommentarzeichen in String und url',
    20: 'Adresse in application/ld+json',
    21: 'Rautenzeilen in llms.txt',
  };
  for (const [number, fixture] of Object.entries(fixtures.stehenBleiben)) {
    const directory = bundleWith({ [fixture.name]: fixture.content });
    const before = fs.readFileSync(path.join(directory, fixture.name));
    const check = checkerResult(directory);
    const remove = removerResult(directory);
    const after = fs.readFileSync(path.join(directory, fixture.name));
    record(
      number,
      descriptions[number],
      check.status === 0 && remove.status === 0 && before.equals(after),
      check.stderr || remove.stderr
    );
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function productionLicenseCase() {
  const allowlist = JSON.parse(fs.readFileSync(productionAllowlist, 'utf8'));
  const source = fs.readFileSync(path.join(root, 'js/chart-4.4.1.umd.min.js'), 'utf8');
  const allowed = allowlist.comments?.find((entry) => entry.path === 'js/chart-4.4.1.umd.min.js');
  const comments = [...source.matchAll(/\/\*![\s\S]*?\*\//g)].map((match) => match[0]);
  const raw = comments.find(
    (comment) => crypto.createHash('sha256').update(comment).digest('hex') === allowed?.sha256
  );
  if (!raw) {
    record(
      22,
      'eingebuchter Lizenzhinweis bleibt unveraendert',
      false,
      'kein passender eingebuchter Hinweis'
    );
    return;
  }
  const directory = bundleWith({ 'js/chart-4.4.1.umd.min.js': `${raw}\nvoid 0;` });
  const before = fs.readFileSync(path.join(directory, 'js/chart-4.4.1.umd.min.js'));
  const check = checkerResult(directory);
  const remove = removerResult(directory);
  const after = fs.readFileSync(path.join(directory, 'js/chart-4.4.1.umd.min.js'));
  record(
    22,
    'eingebuchter Lizenzhinweis bleibt unveraendert',
    check.status === 0 && remove.status === 0 && before.equals(after)
  );
  fs.rmSync(directory, { recursive: true, force: true });
}

function positionCases() {
  const input = bundleWith({
    'index.html':
      '<p>a</p>\n  <!-- allein -->\n<p>b</p>\n<p>c</p>  <!-- hinten -->  \n  <!-- vorne -->  <p>d</p>\n<p>e</p><!-- mitte --><p>f</p>\n' +
      '<style>a{}\n  /* allein */\nb{}\nc{}  /* hinten */  \n  /* vorne */  d{}\ne{} /* mitte */f{}\n</style>\n' +
      '<script>a();\n  // allein\nb();\nc();  // hinten\n  /* vorne */  d();\ne();/* mitte */f();\n</script>\n',
    'js/app.js':
      'a();\n  // allein\nb();\nc();  // hinten\n  /* vorne */  d();\ne();/* mitte */f();\n',
    'css/app.css':
      'a{}\n  /* allein */\nb{}\nc{}  /* hinten */  \n  /* vorne */  d{}\ne{} /* mitte */f{}\n',
    'bild.svg':
      '<svg>\n  <!-- allein -->\n<a/>  <!-- hinten -->  \n  <!-- vorne -->  <b/>\n<c/><!-- mitte --><d/>\n</svg>',
    'sitemap.xml':
      '<root>\n  <!-- allein -->\n<a/>  <!-- hinten -->  \n  <!-- vorne -->  <b/>\n<c/><!-- mitte --><d/>\n</root>',
    'robots.txt': '# allein\nUser-agent: *  # hinten\nAllow: /\n',
  });
  const expected = {
    'index.html':
      '<p>a</p>\n<p>b</p>\n<p>c</p>\n  <p>d</p>\n<p>e</p><p>f</p>\n' +
      '<style>a{}\nb{}\nc{}\n  d{}\ne{} f{}\n</style>\n' +
      '<script>a();\nb();\nc();\n  d();\ne(); f();\n</script>\n',
    'js/app.js': 'a();\nb();\nc();\n  d();\ne(); f();\n',
    'css/app.css': 'a{}\nb{}\nc{}\n  d{}\ne{} f{}\n',
    'bild.svg': '<svg>\n<a/>\n  <b/>\n<c/><d/>\n</svg>',
    'sitemap.xml': '<root>\n<a/>\n  <b/>\n<c/><d/>\n</root>',
    'robots.txt': 'User-agent: *\nAllow: /\n',
  };
  const result = removerResult(input);
  const exact =
    result.status === 0 &&
    Object.entries(expected).every(
      ([file, value]) => fs.readFileSync(path.join(input, file), 'utf8') === value
    );
  record(23, 'alle sprachlich moeglichen Leerraumlagen', exact, result.stderr);
  fs.rmSync(input, { recursive: true, force: true });

  const asi = bundleWith({ 'js/app.js': 'const a = 1\n/* mehr\nzeilig */\nconst b = 2\n' });
  const beforeTree = acorn.parse(fs.readFileSync(path.join(asi, 'js/app.js'), 'utf8'), {
    ecmaVersion: 'latest',
  });
  const asiResult = removerResult(asi);
  const afterTree = acorn.parse(fs.readFileSync(path.join(asi, 'js/app.js'), 'utf8'), {
    ecmaVersion: 'latest',
  });
  const clean = (tree) =>
    JSON.stringify(tree, (key, value) => (['start', 'end'].includes(key) ? undefined : value));
  record(
    24,
    'mehrzeiliger Kommentar ohne Semikolon behaelt AST',
    asiResult.status === 0 && clean(beforeTree) === clean(afterTree)
  );
  fs.rmSync(asi, { recursive: true, force: true });

  const crlf = bundleWith({ 'js/app.js': '// allein\r\nconst a = 1;\r\n' });
  const crlfResult = removerResult(crlf);
  const crlfBytes = fs.readFileSync(path.join(crlf, 'js/app.js'));
  record(
    25,
    'CRLF bleibt CRLF',
    crlfResult.status === 0 && crlfBytes.equals(Buffer.from('const a = 1;\r\n'))
  );
  fs.rmSync(crlf, { recursive: true, force: true });
}

function directFailureCases() {
  const css = bundleWith({ 'css/app.css': 'a{color:re/*x*/d}' });
  record(26, 'CSS-Kommentar ohne Leerraum bricht ab', removerResult(css).status === 1);
  fs.rmSync(css, { recursive: true, force: true });
  const js = bundleWith({ 'js/app.js': 'const = ;' });
  record(27, 'nicht zerlegbare Skriptdatei bricht ab', removerResult(js).status === 1);
  fs.rmSync(js, { recursive: true, force: true });
}

function buildFailureFixture(file, content, withNodeModules) {
  const directory = temporary('bau');
  write(directory, '.htaccess', 'Require all granted\n');
  write(directory, file, content);
  for (const script of [
    'make-ionos-bundle.sh',
    'remove-bundle-comments.mjs',
    'bundle-comment-license-allowlist.json',
  ]) {
    const source = path.join(root, 'scripts', script);
    const target = path.join(directory, 'scripts', script);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
  if (withNodeModules)
    fs.symlinkSync(path.join(root, 'node_modules'), path.join(directory, 'node_modules'), 'dir');
  const target = `${directory}-ziel`;
  const result = run('bash', [path.join(directory, 'scripts/make-ionos-bundle.sh'), target], {
    cwd: directory,
  });
  return { directory, target, result };
}

function buildFailureCases() {
  const missingModules = buildFailureFixture('index.html', '<!doctype html><p>ok</p>', false);
  record(
    28,
    'Bau ohne node_modules bricht mit Ausweg ab und loescht Ziel',
    missingModules.result.status === 1 &&
      !fs.existsSync(missingModules.target) &&
      /npm ci|node_modules/.test(missingModules.result.stderr + missingModules.result.stdout)
  );
  fs.rmSync(missingModules.directory, { recursive: true, force: true });

  const styleAttribute = buildFailureFixture(
    'index.html',
    '<!doctype html><p style="color:/* intern */red">ok</p>',
    true
  );
  record(
    29,
    'style-Attribut bricht Bau ab und loescht Ziel',
    styleAttribute.result.status === 1 && !fs.existsSync(styleAttribute.target)
  );
  fs.rmSync(styleAttribute.directory, { recursive: true, force: true });

  const unknownType = buildFailureFixture(
    'index.html',
    '<!doctype html><script type="text/x-fremd">inhalt</script>',
    true
  );
  record(
    40,
    'unbekannter Skripttyp bricht Bau ab und loescht Ziel',
    unknownType.result.status === 1 && !fs.existsSync(unknownType.target)
  );
  fs.rmSync(unknownType.directory, { recursive: true, force: true });

  const red = bundleWith({
    'index.html': '<!doctype html><script type="text/x-fremd">inhalt</script>',
  });
  const green = bundleWith({
    'index.html': '<!doctype html><script type="text/javascript">void 0;</script>',
  });
  record(
    41,
    'unbekannter Skripttyp macht Kommentarpruefung rot',
    checkerResult(red).status === 1 && checkerResult(green).status === 0
  );
  fs.rmSync(red, { recursive: true, force: true });
  fs.rmSync(green, { recursive: true, force: true });

  const unknownBinary = buildFailureFixture('daten.blob', Buffer.from([0, 255, 1, 2]), true);
  record(
    42,
    'unbekannte binaere Endung bricht Bau ab',
    unknownBinary.result.status === 1 && !fs.existsSync(unknownBinary.target)
  );
  fs.rmSync(unknownBinary.directory, { recursive: true, force: true });
}

function equalityBase() {
  const source = temporary('quelle');
  write(source, 'scripts/make-ionos-bundle.sh', fs.readFileSync(makeBundle));
  write(
    source,
    'index.html',
    '<!doctype html><html><body data-wert="eins">Sichtbar<script>const innen = 1;</script><script type="application/ld+json">{"wert":1}</script></body></html>'
  );
  write(source, 'js/app.js', 'const wert = 1;\n');
  write(source, 'css/app.css', '.a .b { color: red; }\n');
  write(source, 'bild.png', Buffer.from([1, 2, 3, 4]));
  const bundle = temporary('gleich');
  for (const file of ['index.html', 'js/app.js', 'css/app.css', 'bild.png']) {
    write(bundle, file, fs.readFileSync(path.join(source, file)));
  }
  return { source, bundle };
}

function equalityCases() {
  const mutations = {
    30: ['js/app.js', 'const wert = 2;\n', 'Codezeichen in Skriptdatei'],
    31: [
      'index.html',
      '<!doctype html><html><body data-wert="eins">Sichtbar<script>const innen = 2;</script><script type="application/ld+json">{"wert":1}</script></body></html>',
      'Codezeichen im Skriptblock',
    ],
    32: [
      'index.html',
      '<!doctype html><html><body data-wert="eins">Anders<script>const innen = 1;</script><script type="application/ld+json">{"wert":1}</script></body></html>',
      'sichtbares Wort',
    ],
    33: [
      'index.html',
      '<!doctype html><html><body data-wert="zwei">Sichtbar<script>const innen = 1;</script><script type="application/ld+json">{"wert":1}</script></body></html>',
      'Attributwert',
    ],
    34: [
      'index.html',
      '<!doctype html><html><body data-wert="eins">Sichtbar<script>const innen = 1;</script><script type="application/ld+json">{"wert":2}</script></body></html>',
      'Zeichen in JSON LD',
    ],
    35: ['css/app.css', '.a .b { color: blue; }\n', 'Wert in Stildatei'],
    36: ['css/app.css', '.a.b { color: red; }\n', 'Selektorleerraum'],
  };
  for (const [number, [file, content, description]] of Object.entries(mutations)) {
    const { source, bundle } = equalityBase();
    const green = run(process.execPath, [equality, source, bundle]);
    write(bundle, file, content);
    const red = run(process.execPath, [equality, source, bundle]);
    record(number, description, green.status === 0 && red.status === 1, red.stderr);
    fs.rmSync(source, { recursive: true, force: true });
    fs.rmSync(bundle, { recursive: true, force: true });
  }
  for (const number of [37, 38, 39]) {
    const { source, bundle } = equalityBase();
    const green = run(process.execPath, [equality, source, bundle]);
    if (number === 37) fs.rmSync(path.join(bundle, 'css/app.css'));
    if (number === 38) write(bundle, 'extra.png', Buffer.from([8]));
    if (number === 39) write(bundle, 'bild.png', Buffer.from([1, 2, 3, 5]));
    const red = run(process.execPath, [equality, source, bundle]);
    const description =
      number === 37
        ? 'fehlende Datei'
        : number === 38
          ? 'ueberzaehlige Datei'
          : 'geaendertes Binaerbyte';
    record(number, description, green.status === 0 && red.status === 1, red.stderr);
    fs.rmSync(source, { recursive: true, force: true });
    fs.rmSync(bundle, { recursive: true, force: true });
  }
}

checkerRedCases();
licenseCheckerCases();
unchangedCases();
productionLicenseCase();
positionCases();
directFailureCases();
buildFailureCases();
equalityCases();

if (failures > 0) {
  console.error(`Schärfeprüfung: ROT, ${failures} Fall/Faelle fehlgeschlagen.`);
  process.exit(1);
}
console.log('Schärfeprüfung: GRÜN, 42 Fälle bestanden.');
