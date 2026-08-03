import fs from 'node:fs';
import path from 'node:path';

const [sourcePath, targetPath] = process.argv.slice(2);
if (!sourcePath || !targetPath) {
  throw new Error('Aufruf: node scripts/install-local-snapshot-key.mjs LIVE_CODE_JS ZIELDATEI');
}

const source = fs.readFileSync(sourcePath, 'utf8');
const match = source.match(/^const WERTE_SNAPSHOT_KEY = '([^']+)';$/m);
if (!match || !match[1] || match[1] === 'CONTROLLER_SETZT_WERTE_SNAPSHOT_KEY') {
  throw new Error('Live-Schlüssel fehlt oder ist noch ein Platzhalter.');
}

fs.mkdirSync(path.dirname(targetPath), { recursive: true, mode: 0o700 });
fs.writeFileSync(targetPath, match[1], { encoding: 'utf8', mode: 0o600 });
fs.chmodSync(targetPath, 0o600);
console.log('Lokale Schlüsseldatei angelegt, Inhalt nicht ausgegeben.');
