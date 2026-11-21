import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pattern = /<nav aria-label="Hauptnavigation">[\s\S]*?<\/nav>/;
const template = JSON.parse(
  fs.readFileSync(path.join(root, 'scripts/t1308-portalweg-vorlage.json'))
);
function verifyNav(source) {
  assert.equal(source.match(pattern)?.[0].replace(/\s+/g, ' '), template.nav.replace(/\s+/g, ' '));
  for (const url of ['https://portal.herowerk.de/', 'https://bewerbung.herowerk.de/'])
    assert(source.match(pattern)[0].includes(url));
}
const files = fs.readdirSync(root).filter((file) => file.endsWith('.html'));
let count = 0;
for (const file of files) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (pattern.test(source)) {
    verifyNav(source);
    count++;
  }
  assert(source.includes('<!-- T1308 Unternehmenslinks -->'), `${file}: Fußzeile`);
  const footer = source
    .slice(source.indexOf('<!-- T1308 Unternehmenslinks -->'))
    .split('</footer>')[0];
  for (const [url, label] of [
    ['https://portal.herowerk.de/', 'Kundenportal'],
    ['https://bewerbung.herowerk.de/', 'Bewerberportal'],
  ])
    assert(
      footer.includes(`<a href="${url}">${label}</a>`),
      `${file}: ${label} fehlt in der Fußzeile`
    );
  assert(!/class="nav-portal-b"|entwurf-leiste|data-variante/.test(source), file);
}
assert.equal(count, 25);
assert.equal(files.length, 34);
assert.throws(() =>
  verifyNav(execFileSync('git', ['show', '4d6b36c:index.html'], { cwd: root, encoding: 'utf8' }))
);
assert.throws(() =>
  verifyNav('<nav aria-label="Hauptnavigation"><a>Neue Seite ohne Portal</a></nav>')
);
for (const portal of ['kunden', 'bewerber']) {
  const source = fs.readFileSync(path.join(root, `${portal}portal.html`), 'utf8');
  assert(source.includes(template[portal]), 'Wortlaut und Stationen');
  assert(source.includes(`https://www.herowerk.de/${portal}portal`));
  assert(!/consentmanager|gtag\(|js\/consent\.js|js\/site\.js|facebook\.net/.test(source));
  assert.equal((source.match(/class="pv-station"/g) || []).length, portal === 'kunden' ? 5 : 3);
  assert(
    fs
      .readFileSync(path.join(root, 'sitemap.xml'), 'utf8')
      .includes(`https://www.herowerk.de/${portal}portal`)
  );
}
assert(!fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8').includes('/vorschau/'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'vorschau/manifest.json')));
for (const doc of manifest.documents) {
  const bytes = fs.readFileSync(path.join(root, 'vorschau', doc.file));
  assert(bytes.length < 400000);
  const script = bytes.toString().match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.equal(createHash('sha256').update(script).digest('base64'), doc.scriptHash);
}
execFileSync(process.execPath, ['scripts/sync-t1308-portalweg.mjs', '--check'], {
  cwd: root,
  stdio: 'inherit',
});
execFileSync(process.execPath, ['scripts/sync-t1308-headers.mjs', '--check'], {
  cwd: root,
  stdio: 'inherit',
});
execFileSync(process.execPath, ['scripts/import-t1308-preview.mjs', '--check'], {
  cwd: root,
  stdio: 'inherit',
});
execFileSync(process.execPath, ['tests/t1308-bedienung-node.mjs'], { cwd: root, stdio: 'inherit' });
console.log(
  'T1308 Website: Navigation, 34 Fußzeilen, Wortlaut, Quellenkopie, sechs Hashrichtlinien und Rotfälle grün.'
);
