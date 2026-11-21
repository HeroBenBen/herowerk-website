import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const check = args.includes('--check');
const workingCopy = args.includes('--arbeitsstand');
const index = args.indexOf('--quelle');
const producer = index >= 0 ? path.resolve(args[index + 1]) : null;
const destination = path.join(root, 'vorschau');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const source = producer ? path.join(producer, 'docs/t1308/oeffentlich') : destination;
if (!check && !producer) throw new Error('--quelle <Portal-Arbeitskopie> fehlt');
const revision = producer
  ? execFileSync('git', ['rev-parse', 'HEAD'], { cwd: producer, encoding: 'utf8' }).trim()
  : null;
const dirty = producer
  ? execFileSync('git', ['status', '--porcelain'], { cwd: producer, encoding: 'utf8' }).trim() !==
    ''
  : false;
if (!check && dirty && !workingCopy)
  throw new Error(
    'Produzent ist nicht sauber eingebucht. Für vorläufige lokale Übernahme ausdrücklich --arbeitsstand angeben.'
  );

const rawManifest = fs.readFileSync(path.join(source, 'manifest.json'));
const manifest = JSON.parse(rawManifest);
const names = ['manifest.json', ...manifest.outputs.map((entry) => entry.file)];
if (manifest.target !== 'public' || manifest.documents.length !== 6)
  throw new Error('Kein öffentlicher Export');
for (const entry of manifest.outputs) {
  if (
    !/^(?:(kunden|bewerber)-(login|mail|dashboard)\.html|assets\/[a-f0-9]{64}\.(png|svg|woff2))$/.test(
      entry.file
    )
  )
    throw new Error('Unzulässiger Importpfad');
  const bytes = fs.readFileSync(path.join(source, entry.file));
  if (hash(bytes) !== entry.sha256) throw new Error(`Quellhash: ${entry.file}`);
}
function inventory(dir, prefix = '') {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      if (entry.isSymbolicLink()) throw new Error('Verknüpfung im Export');
      return entry.isDirectory()
        ? inventory(path.join(dir, entry.name), `${prefix}${entry.name}/`)
        : [`${prefix}${entry.name}`];
    })
    .sort();
}
if (check) {
  if (JSON.stringify(inventory(destination)) !== JSON.stringify([...names].sort()))
    throw new Error('Importinventar weicht ab');
  for (const name of names)
    if (
      !fs
        .readFileSync(path.join(source, name))
        .equals(fs.readFileSync(path.join(destination, name)))
    )
      throw new Error(`Import verändert: ${name}`);
  const receipt = JSON.parse(fs.readFileSync(path.join(root, 'docs/t1308/uebernahme.json')));
  if (!['arbeitsstand', 'eingebucht'].includes(receipt.state))
    throw new Error('Übernahmestatus fehlt');
  if (receipt.state === 'arbeitsstand' && receipt.producerCommit !== null)
    throw new Error('Arbeitsstand darf keinen Produzentencommit behaupten');
  if (receipt.manifestSha256 !== hash(rawManifest)) throw new Error('Übernahmebeleg stimmt nicht');
  if (producer) {
    if (receipt.state === 'arbeitsstand') {
      if (receipt.producerBaseCommit !== revision)
        throw new Error('Basis des Portal-Arbeitsstands hat sich geändert');
    } else if (receipt.state !== 'eingebucht' || receipt.producerCommit !== revision || dirty) {
      throw new Error('Portal-Produzentencommit hat sich geändert oder ist nicht sauber');
    }
  }
} else {
  if (fs.existsSync(destination))
    for (const name of inventory(destination))
      if (!names.includes(name))
        throw new Error(`Veraltete Importdatei: ${name}; explizit bereinigen`);
  for (const name of names) {
    fs.mkdirSync(path.dirname(path.join(destination, name)), { recursive: true });
    fs.copyFileSync(path.join(source, name), path.join(destination, name));
  }
  fs.mkdirSync(path.join(root, 'docs/t1308'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'docs/t1308/uebernahme.json'),
    JSON.stringify(
      {
        state: dirty ? 'arbeitsstand' : 'eingebucht',
        producerCommit: dirty ? null : revision,
        producerBaseCommit: revision,
        manifestSha256: hash(rawManifest),
        sourceCommits: manifest.sourceCommits,
        importedAt: new Date().toISOString(),
      },
      null,
      2
    ) + '\n'
  );
}
console.log(
  `T1308-Import: ${names.length} Dateien bytegleich${producer ? ' mit expliziter Portalquelle' : ', eingefrorener Stand'}.`
);

const receipt = JSON.parse(fs.readFileSync(path.join(root, 'docs/t1308/uebernahme.json')));
if (receipt.state === 'arbeitsstand')
  console.log('Vorläufiger Arbeitsstand: noch kein eingebuchter Portal-Produzentencommit.');
