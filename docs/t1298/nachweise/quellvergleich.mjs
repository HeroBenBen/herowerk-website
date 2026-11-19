import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import vm from 'node:vm';
const root = '/Users/benjaminbendler/code/_t1298_website/';
const sourcePath =
  '/Users/benjaminbendler/Library/CloudStorage/GoogleDrive-b.bendler@herowerk.de/Meine Ablage/HeroPlan/_Agent-Work/2026-11-19_T1298_Aufstellabstaende/Inhalt_Aufstellabstaende_Freigabefassung_HERO.html';
const draftPath =
  '/Users/benjaminbendler/Library/CloudStorage/GoogleDrive-b.bendler@herowerk.de/Meine Ablage/HeroPlan/_Agent-Drafts/2026-11-18_Aufstellabstaende_Entwurf3/index.html';
const read = (p) => fs.readFileSync(p, 'utf8');
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex');
const main = (s) => s.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)[1].trim();
const blocks = (s, tag) =>
  [...s.matchAll(new RegExp('<' + tag + '\\b[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'gi'))].map(
    (m) => m[1]
  );
const source = read(sourcePath),
  page = read(root + 'waermepumpe-abstand.html'),
  draft = read(draftPath);
const icon = read(root + 'funnel-icons/interesse-wp.svg').match(/(<g transform[\s\S]*<\/g>)/)[1];
assert.equal(source.split('%%WP_ICON%%').length, 2);
const expected = source.replace('%%WP_ICON%%', icon).trim(),
  actual = main(page);
assert.equal(actual, expected);
const sourceStyle = blocks(source, 'style'),
  newStyle = blocks(actual, 'style');
const sourceScript = blocks(source, 'script'),
  newScript = blocks(actual, 'script');
assert.deepEqual(newStyle, sourceStyle);
assert.deepEqual(newScript, sourceScript);
newScript.forEach((s) => new vm.Script(s));
const originalEqual = main(draft) === actual;
const template = read(root + 'waermepumpe-laerm.html');
const shell = (s) => ({
  navigation: s.match(/  <!-- NAVIGATION -->[\s\S]*?<\/nav>/)[0],
  footer: s.slice(s.indexOf('  <!-- FOOTER -->')),
  consent: s.slice(s.indexOf('  <!-- ConsentManager'), s.indexOf('  <meta name="viewport"')),
});
assert.deepEqual(shell(page), shell(template));
assert(!page.includes('noindex'));
assert(!page.includes('ENTWURF'));
assert(!page.includes('%%WP_ICON%%'));
assert.equal([...page.matchAll(/<main\b/g)].length, 1);
const localLinks = [...actual.matchAll(/href="(\/(?!\/)[^"#?]*)"/g)].map((m) => m[1]);
for (const p of localLinks)
  assert(fs.existsSync(root + (p === '/' ? 'index' : p.slice(1)) + '.html'), p);
const ids = [...actual.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
assert.equal(new Set(ids).size, ids.length, 'Doppelte IDs');
const anchors = [...actual.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
for (const id of anchors) assert(ids.includes(id), id);
const jsonld = [...page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
  (m) => JSON.parse(m[1])
);
assert.equal(jsonld.length, 1);
assert.equal(jsonld[0]['@type'], 'Article');
assert.equal(jsonld[0].datePublished, '2026-11-19');
assert.equal(jsonld[0].headline, 'Wo darf die Wärmepumpe stehen?');
assert.equal(jsonld[0].url, 'https://www.herowerk.de/waermepumpe-abstand');
const baseline = JSON.parse(read(root + 'baseline/v4-sections.json'));
const base = JSON.parse(read('/tmp/t1298-pruefung/basis/baseline/v4-sections.json'));
assert.deepEqual(
  { ...baseline, pages: baseline.pages.filter((p) => p.file !== 'waermepumpe-abstand.html') },
  base
);
assert.equal(baseline.pages.filter((p) => p.file === 'waermepumpe-abstand.html').length, 1);
for (const p of [
  'scripts/seiten-bausteine.json',
  'scripts/build-bausteine.mjs',
  'waermepumpe-laerm.html',
  'propan-waermepumpe.html',
])
  assert.equal(read(root + p), read('/tmp/t1298-pruefung/basis/' + p));
for (const p of [
  'tests/a11y.spec.js',
  'tests/smoke.spec.js',
  'scripts/fidelity-pages.json',
  'lighthouserc.json',
])
  assert(read(root + p).includes('waermepumpe-abstand'));
const result = {
  ergebnis: 'gleich',
  art: 'Exakter Quellvergleich, keine Browserabnahme',
  quelle: sourcePath,
  entwurf: draftPath,
  seite: 'waermepumpe-abstand.html',
  iconErsetzung: true,
  fragmentSha256: hash(actual),
  fragmentBytes: Buffer.byteLength(actual),
  originalentwurfFragmentGleich: originalEqual,
  originalentwurfFragmentSha256: hash(main(draft)),
  css: sourceStyle.map(hash),
  skript: sourceScript.map(hash),
  skriptSyntax: 'gültig',
  huelle: 'Navigation, Consent und Fuß bytegleich zur Vorlage',
  interneZiele: [...new Set(localLinks)],
  anker: anchors.length,
  ids: ids.length,
  metadaten: 'Article, Veröffentlichungsdatum, Überschrift und URL geprüft',
  baseline: 'Nur die neue Seite ergänzt, alle Bestandswerte unverändert',
  bausteine: 'Beide Dateien unverändert, 12 Seiten',
  browserTextvergleich: 'nicht gelaufen, Sandbox',
};
assert(originalEqual, 'Originalentwurf unterscheidet sich im Quellfragment');
fs.writeFileSync('/tmp/t1298-pruefung/quellvergleich.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
