// Nur beauftragte Bereichsprüfungen und fachlicher Rot-Nachweis. Kein Browser, kein Volltest.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';
const root = process.cwd();
const report = path.join(root, 'reports/t1247');
const old = path.join(root, '.rot-alt');
const files = [
  'tests/t1247-kostenvergleich.mjs',
  'tests/t1247-kv-runner.php',
  'tests/t1247-kv-fixture.mjs',
];
const protectedFiles = [
  'api/rechner-engine.php',
  'apps-script/rechner-backend/kv_engine.gs',
  'apps-script/rechner-backend/Code.gs',
  'docs/intern/kostenvergleich-berater.html',
  'amortisation-waermepumpe.html',
];
const hash = (data) => crypto.createHash('sha256').update(data).digest('hex');
const oldHashes = Object.fromEntries(
  protectedFiles.map((f) => [f, hash(fs.readFileSync(path.join(old, f)))])
);
const stamp = `T1247-NUTZEN-20261107-01 | Basis ${execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()} | ${new Date().toISOString()}\n`;
function run(cmd, args, cwd) {
  return spawnSync(cmd, args, { cwd, encoding: 'utf8', maxBuffer: 30e6 });
}
let red;
const copied = [];
try {
  for (const f of files) {
    const target = path.join(old, f);
    if (fs.existsSync(target)) throw new Error('Prüfdatei existiert bereits: ' + target);
    fs.copyFileSync(path.join(root, f), target);
    copied.push(target);
  }
  red = run('node', ['tests/t1247-kostenvergleich.mjs'], old);
  fs.appendFileSync(
    path.join(report, 'rot_alt.log'),
    '\n' +
      stamp +
      'STAND ALT: 6fdf74e, Originalverhalten ohne Adapter\n' +
      red.stdout +
      red.stderr +
      `EXIT ${red.status}\n`
  );
} finally {
  for (const f of copied) fs.unlinkSync(f);
}
for (const [f, h] of Object.entries(oldHashes))
  if (h !== hash(fs.readFileSync(path.join(old, f)))) throw new Error('Altbaum verändert: ' + f);
if (red.status !== 1 || !red.stdout.includes('T1247 ERGEBNIS:'))
  throw new Error('Kein fachlicher Rot-Nachweis: Prüfaufbau untersuchen');
const green = run('npm', ['run', 'verify:kv-t1247'], root);
fs.appendFileSync(
  path.join(report, 'gruen_neu.log'),
  '\n' +
    stamp +
    'STAND NEU: Arbeitsbaum, keine Einbuchung\n' +
    green.stdout +
    green.stderr +
    `EXIT ${green.status}\n`
);
const results = [...green.stdout.split('T1247 ERGEBNIS:')[0].matchAll(/^(GRÜN|ROT ) (.+)$/gm)]
  .filter(
    (m) =>
      !m[2].startsWith('DOM T1245:') &&
      !m[2].startsWith('T1245:') &&
      !m[2].startsWith('PHP/JS:') &&
      !m[2].startsWith('Parameter:')
  )
  .map((m) => ({ pruefung: m[2], neu: m[1].trim() === 'GRÜN' ? 'grün' : 'rot' }));
for (const r of results) {
  const line = red.stdout
    .split('\n')
    .find((line) => line.startsWith('GRÜN ' + r.pruefung) || line.startsWith('ROT  ' + r.pruefung));
  r.alt = line?.startsWith('GRÜN')
    ? 'grün'
    : line?.startsWith('ROT ')
      ? 'rot'
      : 'siehe rot_alt.log';
}
const sourceHashes = Object.fromEntries(
  [
    'kostenvergleich-waermepumpe.html',
    'api/rechner.php',
    'api/rechner-kv-adapter.php',
    'data/kv-marktwerte.php',
    'tests/t1247-kostenvergleich.mjs',
    'tests/t1245-kv-website-dom.mjs',
    'reports/t1247/browser-und-bilder.mjs',
  ].map((f) => [f, hash(fs.readFileSync(f))])
);
const resultPath = path.join(report, 'pruefergebnisse.json');
const previous = fs.existsSync(resultPath) ? JSON.parse(fs.readFileSync(resultPath, 'utf8')) : null;
const history = previous
  ? [
      ...(previous.history || []),
      Object.fromEntries(Object.entries(previous).filter(([key]) => key !== 'history')),
    ]
  : [];
fs.writeFileSync(
  resultPath,
  JSON.stringify(
    {
      kennung: 'T1247-NUTZEN-20261107-01',
      auftrag: 12,
      stamp,
      neuExit: green.status,
      altExit: red.status,
      browser:
        'Auftrag 12: Reglerziele aus DOM-Grenzen, Altersbonus für Gas explizit, Null-Euro-Muster begrenzt; gezielter Browserlauf siehe browser-ergebnisse.json',
      sourceHashes,
      results,
      history,
    },
    null,
    2
  ) + '\n'
);
console.log(
  red.stdout
    .split('\n')
    .filter((s) => s.startsWith('T1247 ERGEBNIS'))
    .join('\n')
);
console.log(green.stdout);
process.exitCode = green.status || 0;
