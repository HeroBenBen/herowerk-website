// Kleine lokale Testfixture, kein Auslieferungsbündel und kein Server.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 't1308-import-processing-'));
try {
  fs.cpSync(path.join(root, 'vorschau'), path.join(fixture, 'vorschau'), { recursive: true });
  fs.mkdirSync(path.join(fixture, 'js'));
  fs.mkdirSync(path.join(fixture, 'css'));
  fs.writeFileSync(
    path.join(fixture, 'css/probe.css'),
    '/* Testkommentar */ body { color: #111; }\n'
  );
  fs.writeFileSync(
    path.join(fixture, 'index.html'),
    '<!doctype html><!-- Testkommentar --><script src="js/probe.js"></script>'
  );
  fs.writeFileSync(path.join(fixture, 'js/probe.js'), '// Testkommentar\nvoid 0;\n');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'vorschau/manifest.json')));
  const names = ['manifest.json', ...manifest.outputs.map((entry) => entry.file)];
  const equal = () => {
    for (const name of names)
      assert(
        fs
          .readFileSync(path.join(root, 'vorschau', name))
          .equals(fs.readFileSync(path.join(fixture, 'vorschau', name))),
        name
      );
  };
  execFileSync(process.execPath, [path.join(root, 'scripts/remove-bundle-comments.mjs'), fixture], {
    stdio: 'pipe',
  });
  equal();
  assert(
    !fs.readFileSync(path.join(fixture, 'index.html'), 'utf8').includes('Testkommentar'),
    'Positivkontrolle der Kommentarentfernung'
  );
  execFileSync('bash', [path.join(root, 'scripts/version-assets.sh'), fixture], { stdio: 'pipe' });
  equal();
  assert(
    /js\/probe\.js\?v=[a-f0-9]{10}/.test(fs.readFileSync(path.join(fixture, 'index.html'), 'utf8')),
    'Positivkontrolle der Versionierung'
  );
  console.log(
    `T1308: ${names.length} Importdateien nach beiden Verarbeitungsschritten bytegleich, beide Positivkontrollen grün.`
  );
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}
