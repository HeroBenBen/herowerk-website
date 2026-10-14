import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  snapshotTestRoot,
  snapshotRuntime,
  snapshotTestEnvironment,
} from './helpers/snapshot-isolation.mjs';

const repo = process.cwd();
const cases = [
  ['lauf', 'rechner-snapshot-integritaet.php', 'if ($run !== $activeId)', 'if (false)'],
  [
    'preis',
    'rechner-snapshot-integritaet.php',
    'if (!hash_equals($expected, $actual))',
    'if (false)',
  ],
  [
    'modell',
    'rechner-snapshot-integritaet.php',
    'if (!hash_equals($expected, $actual))',
    'if (false)',
  ],
  [
    'blattfolge',
    'rechner-values.php',
    "array_keys($snapshot['sheets']) !== rechner_snapshot_sheet_names($schemaVersion)",
    'false',
  ],
];
for (const [name, file, search, replacement] of cases) {
  const root = await snapshotTestRoot(`p3a-mutation-${name}-`);
  const runtime = await snapshotRuntime(root);
  for (const module of [
    'rechner-values.php',
    'rechner-snapshot-integritaet.php',
    'rechner-snapshot-meldung.php',
  ]) {
    await fs.copyFile(path.join(repo, 'api', module), path.join(root, module));
  }
  const driver = `<?php
  define('RECHNER_RUNTIME_DIR', '${runtime}');
  require __DIR__.'/rechner-values.php';
  $f=json_decode(file_get_contents('${repo}/tests/fixtures/rechner-snapshot-vertrag.json'),true);
  $s=$f['snapshot'];
  switch('${name}') {
    case 'lauf': $s['sheets']['Preise_Wolf'][1][9]='fremd'; break;
    case 'preis': $s['sheets']['Preise_Wolf'][1][4]+=0.01; break;
    case 'modell': $s['sheets']['Geräte_Katalog'][2][1].=' verändert'; break;
    case 'blattfolge': $s['sheets']=array_reverse($s['sheets'],true); break;
  }
  try { rechner_validate_snapshot(json_encode($s)); echo 'ROT: ungültiger Abzug angenommen'; exit(1); }
  catch (RechnerValuesException $e) { echo 'PASS: '.$e->publicCode; }
  `;
  // Beim Lauf-Mutanten auch den Hash entfernen: prüft die Laufwache unabhängig.
  if (name === 'lauf') {
    const p = path.join(root, file);
    await fs.writeFile(
      p,
      (await fs.readFile(p, 'utf8')).replace('if (!hash_equals($expected, $actual))', 'if (false)')
    );
  }
  const script = path.join(root, 'check.php');
  await fs.writeFile(script, driver);
  const green = spawnSync('php', [script], { encoding: 'utf8', env: snapshotTestEnvironment() });
  if (green.status !== 0)
    throw new Error(`${name}: Grundprobe rot ${green.stdout} ${green.stderr}`);
  const target = path.join(root, file);
  const source = await fs.readFile(target, 'utf8');
  if (!source.includes(search)) throw new Error(`Mutationsstelle fehlt: ${name}`);
  await fs.writeFile(target, source.replace(search, replacement));
  const red = spawnSync('php', [script], { encoding: 'utf8', env: snapshotTestEnvironment() });
  if (red.status !== 1 || !red.stdout.includes('ungültiger Abzug angenommen'))
    throw new Error(`${name}: kein scharfer Rotnachweis ${red.stdout} ${red.stderr}`);
  console.log(
    `PASS Rotnachweis ${name}: intakte Wache grün, abgeschaltete Wache ROT (Exit ${red.status})`
  );
}

{
  const root = await snapshotTestRoot('p3a-mutation-meldung-');
  await fs.mkdir(path.join(root, 'api'));
  await fs.mkdir(path.join(root, 'tests'));
  for (const module of [
    'rechner-values.php',
    'rechner-snapshot-integritaet.php',
    'rechner-snapshot-meldung.php',
  ]) {
    await fs.copyFile(path.join(repo, 'api', module), path.join(root, 'api', module));
  }
  const test = path.join(root, 'tests/rechner-snapshot-meldung.php');
  await fs.copyFile(path.join(repo, 'tests/rechner-snapshot-meldung.php'), test);
  const green = spawnSync('php', [test], { encoding: 'utf8', env: snapshotTestEnvironment() });
  if (green.status !== 0) throw new Error('Meldungs-Grundprobe rot: ' + green.stderr);
  const target = path.join(root, 'api/rechner-snapshot-meldung.php');
  const source = await fs.readFile(target, 'utf8');
  const needle = 'if (in_array($reservation, explode("\\n", $contents), true))';
  if (!source.includes(needle)) throw new Error('Drosselungsstelle fehlt');
  await fs.writeFile(target, source.replace(needle, 'if (false)'));
  const red = spawnSync('php', [test], { encoding: 'utf8', env: snapshotTestEnvironment() });
  if (red.status === 0 || !red.stdout.includes('höchstens einmal je Grund und Tag')) {
    // PHP kann den Fehler in sein eigenes Fehlerprotokoll schreiben; Exit und letzte
    // bestandene Assertions belegen dann denselben Abbruch vor der Drosselungszusage.
    if (
      red.status === 0 ||
      !red.stdout.includes('Prüfadresse aus Konfiguration') ||
      red.stdout.includes('PASS höchstens einmal')
    ) {
      throw new Error('Kein scharfer Rotnachweis der Meldungssperre');
    }
  }
  console.log(
    `PASS Rotnachweis Meldung: intakte Sperre grün, abgeschaltete Sperre ROT (Exit ${red.status})`
  );
}
