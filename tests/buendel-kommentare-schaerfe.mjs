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
const modulePackages = [
  'acorn',
  'css-tree',
  'dom-serializer',
  'domelementtype',
  'domhandler',
  'domutils',
  'entities',
  'htmlparser2',
  'mdn-data',
  'parse5',
  'saxes',
  'source-map-js',
  'typescript',
  'xmlchars',
];

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

function output(result) {
  return `${result.stdout ?? ''}${result.stderr ?? ''}`;
}

function hasOwnMessage(result, ...parts) {
  const text = output(result);
  return parts.every((part) => text.includes(part));
}

function copyNodeModules(targetRoot) {
  const target = path.join(targetRoot, 'node_modules');
  fs.mkdirSync(target, { recursive: true });
  for (const name of modulePackages) {
    fs.cpSync(path.join(root, 'node_modules', name), path.join(target, name), { recursive: true });
  }
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
  const expectedTexts = {
    1: '<!-- intern -->',
    2: '/* intern */',
    3: '// intern',
    4: '// intern',
    5: '/* intern */',
    6: '/* intern */',
    7: '/* intern */',
    8: '<!-- intern -->',
    9: '<!-- intern -->',
    10: '# intern',
    11: '/* intern */',
    12: '// intern',
    13: 'unbekannte Dateiendung .fremd',
  };
  for (const [number, fixture] of Object.entries(fixtures.checkerRot)) {
    const red = bundleWith({ [fixture.name]: fixture.content });
    const green = bundleWith({ 'index.html': '<!doctype html><p>ok</p>' });
    const redResult = checkerResult(red);
    const greenResult = checkerResult(green);
    record(
      number,
      descriptions[number],
      redResult.status === 1 &&
        hasOwnMessage(redResult, `TREFFER ${fixture.name}:1: ${expectedTexts[number]}`) &&
        greenResult.status === 0,
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
  const wrongPathResult = checkerResult(wrongPath, allowFile);
  const wrongTextResult = checkerResult(wrongText, allowFile);
  record(
    14,
    'erlaubter Wortlaut am falschen Pfad',
    wrongPathResult.status === 1 &&
      hasOwnMessage(wrongPathResult, 'TREFFER js/falsch.js:1: /*! erlaubter Testhinweis */') &&
      checkerResult(green, allowFile).status === 0
  );
  record(
    15,
    'veraenderter Wortlaut am erlaubten Pfad',
    wrongTextResult.status === 1 &&
      hasOwnMessage(wrongTextResult, 'TREFFER js/erlaubt.js:1: /*! veraenderter Testhinweis */') &&
      checkerResult(green, allowFile).status === 0
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
  const allowed = allowlist.comments?.filter((entry) => entry.path === 'js/chart-4.4.1.umd.min.js');
  const comments = [...source.matchAll(/\/\*![\s\S]*?\*\//g)].map((match) => match[0]);
  const raws = (allowed ?? []).map((entry) =>
    comments.find(
      (comment) => crypto.createHash('sha256').update(comment).digest('hex') === entry.sha256
    )
  );
  if (allowed?.length !== 2 || raws.some((raw) => !raw)) {
    record(
      22,
      'beide eingebuchten Lizenzhinweise bleiben unveraendert',
      false,
      'nicht beide eingebuchten Hinweise gefunden'
    );
    return;
  }
  const directory = bundleWith({
    'js/chart-4.4.1.umd.min.js': `${raws.join('\n')}\nvoid 0;`,
  });
  const before = fs.readFileSync(path.join(directory, 'js/chart-4.4.1.umd.min.js'));
  const check = checkerResult(directory);
  const remove = removerResult(directory);
  const after = fs.readFileSync(path.join(directory, 'js/chart-4.4.1.umd.min.js'));
  record(
    22,
    'beide eingebuchten Lizenzhinweise bleiben unveraendert',
    check.status === 0 &&
      hasOwnMessage(check, 'erlaubt 2') &&
      remove.status === 0 &&
      before.equals(after)
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

  const asiSource = 'const a = 1/* mehr\nzeilig */const b = 2\n';
  const asiExpected = 'const a = 1\nconst b = 2\n';
  const asi = bundleWith({ 'js/app.js': asiSource });
  const clean = (tree) =>
    JSON.stringify(tree, (key, value) => (['start', 'end'].includes(key) ? undefined : value));
  let asiOk = false;
  let asiDetail = '';
  try {
    const beforeTree = acorn.parse(fs.readFileSync(path.join(asi, 'js/app.js'), 'utf8'), {
      ecmaVersion: 'latest',
    });
    const asiResult = removerResult(asi);
    const afterTree = acorn.parse(fs.readFileSync(path.join(asi, 'js/app.js'), 'utf8'), {
      ecmaVersion: 'latest',
    });
    const withoutReplacement = asiSource.replace('/* mehr\nzeilig */', '');
    let withoutReplacementIsWrong = false;
    try {
      withoutReplacementIsWrong =
        clean(acorn.parse(withoutReplacement, { ecmaVersion: 'latest' })) !== clean(beforeTree);
    } catch {
      withoutReplacementIsWrong = true;
    }
    asiOk =
      asiResult.status === 0 &&
      fs.readFileSync(path.join(asi, 'js/app.js'), 'utf8') === asiExpected &&
      clean(beforeTree) === clean(afterTree) &&
      withoutReplacementIsWrong;
  } catch (error) {
    asiDetail = error.message;
  }
  record(
    24,
    'mehrzeiliger Kommentar zwischen Code ohne Semikolon behaelt AST und Zeilenumbruch',
    asiOk,
    asiDetail
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
  const cssResult = removerResult(css);
  record(
    26,
    'CSS-Kommentar ohne Leerraum bricht mit eigener Meldung ab',
    cssResult.status === 1 && hasOwnMessage(cssResult, 'css/app.css:1:', 'Stilkommentar', 'Ausweg:')
  );
  fs.rmSync(css, { recursive: true, force: true });
  const js = bundleWith({ 'js/app.js': 'const = ;' });
  const jsResult = removerResult(js);
  record(
    27,
    'nicht zerlegbare Skriptdatei bricht mit eigener Meldung ab',
    jsResult.status === 1 &&
      hasOwnMessage(jsResult, 'js/app.js:1:', 'Skript nicht zerlegbar', 'Ausweg:')
  );
  fs.rmSync(js, { recursive: true, force: true });
}

function replaceOnce(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`Mutationsstelle fehlt: ${label}`);
  return source.replace(from, to);
}

function buildFailureFixture(
  file,
  content,
  modulesMode,
  mutateRemover,
  checkerSource = 'process.exit(0);\n'
) {
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
  const copiedMake = path.join(directory, 'scripts/make-ionos-bundle.sh');
  let makeSource = fs.readFileSync(copiedMake, 'utf8');
  makeSource = replaceOnce(
    makeSource,
    '$(git -C "$SRC" rev-parse --short=10 HEAD)',
    'teststand',
    'Git-Ausgabe der Bauattrappe'
  );
  fs.writeFileSync(copiedMake, makeSource);
  fs.chmodSync(copiedMake, 0o755);
  if (mutateRemover) {
    const copiedRemover = path.join(directory, 'scripts/remove-bundle-comments.mjs');
    fs.writeFileSync(copiedRemover, mutateRemover(fs.readFileSync(copiedRemover, 'utf8')));
  }
  write(directory, 'scripts/version-assets.sh', '#!/usr/bin/env bash\nexit 0\n');
  write(directory, 'scripts/stamp-version.sh', '#!/usr/bin/env bash\nexit 0\n');
  write(directory, 'scripts/verify-bundle-comments.mjs', checkerSource);
  fs.chmodSync(path.join(directory, 'scripts/version-assets.sh'), 0o755);
  fs.chmodSync(path.join(directory, 'scripts/stamp-version.sh'), 0o755);
  if (modulesMode === 'copy') copyNodeModules(directory);
  if (modulesMode === 'symlink')
    fs.symlinkSync(path.join(root, 'node_modules'), path.join(directory, 'node_modules'), 'dir');
  const target = `${directory}-ziel`;
  const result = run('bash', [path.join(directory, 'scripts/make-ionos-bundle.sh'), target], {
    cwd: directory,
  });
  return { directory, target, result };
}

function buildFailureCases() {
  const missingModules = buildFailureFixture('index.html', '<!doctype html><p>ok</p>', 'none');
  record(
    28,
    'Bau ohne node_modules bricht mit Ausweg ab und loescht Ziel',
    missingModules.result.status === 1 &&
      !fs.existsSync(missingModules.target) &&
      hasOwnMessage(missingModules.result, ':1:', 'node_modules fehlt', 'Ausweg:', 'npm ci')
  );
  fs.rmSync(missingModules.directory, { recursive: true, force: true });

  const styleAttribute = buildFailureFixture(
    'index.html',
    '<!doctype html><p style="color:/* intern */red">ok</p>',
    'copy'
  );
  const styleAttributeMutant = buildFailureFixture(
    'index.html',
    '<!doctype html><p style="color:/* intern */red">ok</p>',
    'copy',
    (source) =>
      replaceOnce(
        source,
        "cssComments(attribute.value, `${file} style-Attribut`, 'declarationList').length > 0",
        'false',
        'style-Attribut-Wache'
      )
  );
  record(
    29,
    'style-Attribut bricht mit eigener Meldung ab; ohne Wache wird der Fall rot',
    styleAttribute.result.status === 1 &&
      !fs.existsSync(styleAttribute.target) &&
      hasOwnMessage(
        styleAttribute.result,
        'index.html:1:',
        'Kommentar im style-Attribut',
        'Ausweg:'
      ) &&
      styleAttributeMutant.result.status === 0 &&
      fs.existsSync(styleAttributeMutant.target)
  );
  for (const fixture of [styleAttribute, styleAttributeMutant]) {
    fs.rmSync(fixture.directory, { recursive: true, force: true });
    fs.rmSync(fixture.target, { recursive: true, force: true });
  }

  const unknownType = buildFailureFixture(
    'index.html',
    '<!doctype html><script type="text/x-fremd">inhalt</script>',
    'copy'
  );
  const unknownTypeMutant = buildFailureFixture(
    'index.html',
    '<!doctype html><script type="text/x-fremd">inhalt</script>',
    'copy',
    (source) =>
      replaceOnce(
        source,
        'if (\n        type &&',
        'if (\n        false &&\n        type &&',
        'Skripttyp-Wache'
      )
  );
  record(
    40,
    'unbekannter Skripttyp bricht mit eigener Meldung ab; ohne Wache wird der Fall rot',
    unknownType.result.status === 1 &&
      !fs.existsSync(unknownType.target) &&
      hasOwnMessage(unknownType.result, 'index.html:1:', 'unbekannter Skripttyp', 'Ausweg:') &&
      unknownTypeMutant.result.status === 0 &&
      fs.existsSync(unknownTypeMutant.target)
  );
  for (const fixture of [unknownType, unknownTypeMutant]) {
    fs.rmSync(fixture.directory, { recursive: true, force: true });
    fs.rmSync(fixture.target, { recursive: true, force: true });
  }

  const red = bundleWith({
    'index.html': '<!doctype html><script type="text/x-fremd">inhalt</script>',
  });
  const green = bundleWith({
    'index.html': '<!doctype html><script type="text/javascript">void 0;</script>',
  });
  record(
    41,
    'unbekannter Skripttyp macht Kommentarpruefung rot',
    checkerResult(red).status === 1 &&
      hasOwnMessage(checkerResult(red), 'TREFFER index.html:1:', 'unbekannter Skripttyp') &&
      checkerResult(green).status === 0
  );
  fs.rmSync(red, { recursive: true, force: true });
  fs.rmSync(green, { recursive: true, force: true });

  const unknownBinary = buildFailureFixture('daten.blob', Buffer.from([0, 1, 2, 3]), 'copy');
  const unknownBinaryMutant = buildFailureFixture(
    'daten.blob',
    Buffer.from([0, 1, 2, 3]),
    'copy',
    (source) =>
      replaceOnce(
        source,
        "if (kind === 'unknown') {",
        "if (false && kind === 'unknown') {",
        'Endungs-Wache'
      )
  );
  record(
    42,
    'unbekannte binaere Endung bricht mit eigener Meldung ab; ohne Wache wird der Fall rot',
    unknownBinary.result.status === 1 &&
      !fs.existsSync(unknownBinary.target) &&
      hasOwnMessage(unknownBinary.result, 'daten.blob:1:', 'unbekannte Dateiendung', 'Ausweg:') &&
      unknownBinaryMutant.result.status === 0 &&
      fs.existsSync(unknownBinaryMutant.target)
  );
  for (const fixture of [unknownBinary, unknownBinaryMutant]) {
    fs.rmSync(fixture.directory, { recursive: true, force: true });
    fs.rmSync(fixture.target, { recursive: true, force: true });
  }
}

function additionalSharpnessCases() {
  const linkedModules = buildFailureFixture('index.html', '<!doctype html><p>ok</p>', 'symlink');
  record(
    43,
    'verknuepftes node_modules wird nicht in das Buendel kopiert',
    linkedModules.result.status === 0 &&
      fs.existsSync(linkedModules.target) &&
      !fs.existsSync(path.join(linkedModules.target, 'node_modules'))
  );
  fs.rmSync(linkedModules.directory, { recursive: true, force: true });
  fs.rmSync(linkedModules.target, { recursive: true, force: true });

  const brokenXml = bundleWith({ 'sitemap.xml': '<root>' });
  const brokenResult = checkerResult(brokenXml);
  record(
    44,
    'Absturz der Kommentarpruefung hat Rueckgabewert 2 statt Trefferwert 1',
    brokenResult.status === 2 && hasOwnMessage(brokenResult, 'FEHLER:')
  );
  fs.rmSync(brokenXml, { recursive: true, force: true });

  const cases = {
    45: ['html', 'index.html', 'HTML'],
    46: ['inline-js', 'index.html', 'eingebettetes JavaScript'],
    47: ['js', 'js/app.js', 'JavaScript-Datei'],
    48: ['inline-css', 'index.html', 'eingebettetes CSS'],
    49: ['css', 'css/app.css', 'CSS-Datei'],
    50: ['svg', 'bild.svg', 'SVG'],
    51: ['xml', 'sitemap.xml', 'XML'],
  };
  for (const [number, [fixtureName, targetName, description]] of Object.entries(cases)) {
    const fixtureRoot = path.join(root, 'tests/fixtures/buendel-kommentare');
    const input = fs.readFileSync(
      path.join(fixtureRoot, `doppelt-${fixtureName}.eingabe.txt`),
      'utf8'
    );
    const expected = fs.readFileSync(
      path.join(fixtureRoot, `doppelt-${fixtureName}.erwartet.txt`),
      'utf8'
    );
    const directory = bundleWith({ [targetName]: input });
    const result = removerResult(directory);
    const actual = fs.readFileSync(path.join(directory, targetName), 'utf8');
    record(
      number,
      `zwei Kommentare auf einer Zeile in ${description} stimmen mit Erwartungsdatei ueberein`,
      result.status === 0 && actual === expected,
      result.stderr
    );
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function blankLineCases() {
  const fixtureRoot = path.join(root, 'tests/fixtures/buendel-kommentare');
  const mutantRoot = temporary('leerzeilen-mutant');
  const mutantScript = path.join(mutantRoot, 'scripts/remove-bundle-comments.mjs');
  fs.mkdirSync(path.dirname(mutantScript), { recursive: true });
  const removerSource = fs.readFileSync(remover, 'utf8');
  fs.writeFileSync(
    mutantScript,
    replaceOnce(
      removerSource,
      '      edit.combined &&\n',
      '',
      'Zusammenfassungsmerker fuer Leerzeilen'
    )
  );
  fs.copyFileSync(
    productionAllowlist,
    path.join(mutantRoot, 'scripts/bundle-comment-license-allowlist.json')
  );
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(mutantRoot, 'node_modules'), 'dir');

  const cases = {
    52: ['leerzeile-html', 'index.html', 'Seite'],
    53: ['leerzeile-inline-js', 'index.html', 'Skriptblock'],
    54: ['leerzeile-js', 'js/app.js', 'Skriptdatei'],
    55: ['leerzeile-inline-css', 'index.html', 'Stilblock'],
    56: ['leerzeile-css', 'css/app.css', 'Stildatei'],
    57: ['leerzeile-svg', 'bild.svg', 'SVG'],
    58: ['leerzeile-xml', 'sitemap.xml', 'XML'],
    59: ['leerzeile-robots', 'robots.txt', 'robots.txt'],
    60: ['leerzeile-crlf-js', 'js/app.js', 'Skriptdatei mit Wagenruecklauf'],
  };
  for (const [number, [fixtureName, targetName, description]] of Object.entries(cases)) {
    const input = fs.readFileSync(path.join(fixtureRoot, `${fixtureName}.eingabe.txt`));
    const expected = fs.readFileSync(path.join(fixtureRoot, `${fixtureName}.erwartet.txt`));
    const actualDirectory = bundleWith({ [targetName]: input });
    const mutantDirectory = bundleWith({ [targetName]: input });
    const actualResult = removerResult(actualDirectory);
    const mutantResult = run(process.execPath, [mutantScript, mutantDirectory]);
    const actual = fs.readFileSync(path.join(actualDirectory, targetName));
    const mutant = fs.readFileSync(path.join(mutantDirectory, targetName));
    record(
      number,
      `${description}: Leerzeile nach alleinstehendem Kommentar bleibt erhalten`,
      actualResult.status === 0 &&
        actual.equals(expected) &&
        mutantResult.status === 0 &&
        !mutant.equals(expected),
      actualResult.stderr || mutantResult.stderr
    );
    fs.rmSync(actualDirectory, { recursive: true, force: true });
    fs.rmSync(mutantDirectory, { recursive: true, force: true });
  }
  fs.rmSync(mutantRoot, { recursive: true, force: true });
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
    record(
      number,
      description,
      green.status === 0 &&
        red.status === 1 &&
        hasOwnMessage(
          red,
          `FEHLER: ${file}: Quelle und Buendel unterscheiden sich ausserhalb der erlaubten Transformation`
        ),
      red.stderr
    );
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
    const expectedMessage =
      number === 37
        ? 'FEHLER: Dateimenge abweichend; fehlend: css/app.css; ueberzaehlig: keine.'
        : number === 38
          ? 'FEHLER: Dateimenge abweichend; fehlend: keine; ueberzaehlig: extra.png.'
          : 'FEHLER: bild.png: Bytevergleich abweichend.';
    record(
      number,
      description,
      green.status === 0 && red.status === 1 && hasOwnMessage(red, expectedMessage),
      red.stderr
    );
    fs.rmSync(source, { recursive: true, force: true });
    fs.rmSync(bundle, { recursive: true, force: true });
  }

  const { source, bundle } = equalityBase();
  fs.rmSync(bundle, { recursive: true, force: true });
  const crashed = run(process.execPath, [equality, source, bundle]);
  record(
    61,
    'Absturz der Gleichheitspruefung hat Rueckgabewert 2 statt Abweichungswert 1',
    crashed.status === 2 && hasOwnMessage(crashed, 'FEHLER:', 'ENOENT'),
    crashed.stderr
  );
  fs.rmSync(source, { recursive: true, force: true });
}

function bundleSelfCheckCases() {
  const hit = buildFailureFixture(
    'index.html',
    '<!doctype html><p>ok</p>',
    'copy',
    undefined,
    "console.error('TREFFER index.html:1: absichtlich'); process.exit(1);\n"
  );
  const crash = buildFailureFixture(
    'index.html',
    '<!doctype html><p>ok</p>',
    'copy',
    undefined,
    "console.error('FEHLER: absichtlicher Absturz'); process.exit(2);\n"
  );
  record(
    62,
    'Buendelbau meldet Treffer der Selbstpruefung und endet mit 1',
    hit.result.status === 1 &&
      !fs.existsSync(hit.target) &&
      hasOwnMessage(hit.result, 'Kommentar-Selbstprüfung hat einen Treffer gemeldet', 'Ausweg:'),
    output(hit.result)
  );
  record(
    63,
    'Buendelbau meldet Absturz der Selbstpruefung und endet mit 1',
    crash.result.status === 1 &&
      !fs.existsSync(crash.target) &&
      hasOwnMessage(
        crash.result,
        'Kommentar-Selbstprüfung ist abgestürzt',
        'Rückgabewert 2',
        'Ausweg:'
      ),
    output(crash.result)
  );
  for (const fixture of [hit, crash]) {
    fs.rmSync(fixture.directory, { recursive: true, force: true });
    fs.rmSync(fixture.target, { recursive: true, force: true });
  }
}

checkerRedCases();
licenseCheckerCases();
unchangedCases();
productionLicenseCase();
positionCases();
directFailureCases();
buildFailureCases();
additionalSharpnessCases();
blankLineCases();
equalityCases();
bundleSelfCheckCases();

if (failures > 0) {
  console.error(`Schärfeprüfung: ROT, ${failures} Fall/Faelle fehlgeschlagen.`);
  process.exit(1);
}
console.log('Schärfeprüfung: GRÜN, 63 Fälle bestanden.');
