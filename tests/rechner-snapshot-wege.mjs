import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  snapshotTestEnvironment,
  snapshotTestRoot,
  snapshotRuntime,
  preserveSnapshotState,
} from './helpers/snapshot-isolation.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contract = JSON.parse(
  await fs.readFile(path.join(repo, 'tests/fixtures/rechner-snapshot-vertrag.json'), 'utf8')
);
const root = await snapshotTestRoot('p3a-wege-');
const runtime = await snapshotRuntime(root);
await preserveSnapshotState();
const capture = path.join(runtime, `wege-mail-${Date.now()}.jsonl`);
const adapter = path.join(runtime, `wege-adapter-${Date.now()}.php`);
await fs.writeFile(
  adapter,
  `<?php return static function (array $m): bool { file_put_contents('${capture}', json_encode($m)."\\n", FILE_APPEND | LOCK_EX); return true; };`
);
await fs.writeFile(path.join(runtime, 'werte_snapshot_key.txt'), 'unechter-pruefschluessel\n');
let incoming = contract.snapshot;
const urls = [];
const server = http.createServer((request, response) => {
  urls.push(request.url);
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(incoming));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
assert(address && typeof address === 'object');
await fs.writeFile(
  path.join(runtime, 'rechner-config.json'),
  JSON.stringify({
    apps_script_url: `http://127.0.0.1:${address.port}/exec`,
    mail_adapter: adapter,
  })
);
const phpQuote = (s) => `'${s.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
async function php(body) {
  const preamble = `define('RECHNER_RUNTIME_DIR', ${phpQuote(runtime)}); require ${phpQuote(path.join(repo, 'api/rechner-values.php'))}; `;
  const processHandle = spawn('php', ['-r', preamble + body], {
    env: snapshotTestEnvironment(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '',
    stderr = '';
  processHandle.stdout.on('data', (v) => {
    stdout += v;
  });
  processHandle.stderr.on('data', (v) => {
    stderr += v;
  });
  const code = await new Promise((resolve) => processHandle.on('exit', resolve));
  return { code, stdout, stderr };
}
const snapshotFile = path.join(runtime, 'werte_snapshot.json');
try {
  for (const way of ['zeitplan', 'nachlauf', 'kaltstart']) {
    for (const failure of ['lauf', 'preis', 'modell', 'blattfolge']) {
      incoming = structuredClone(contract.snapshot);
      if (failure === 'lauf') incoming.sheets.Preise_Wolf[1][9] = 'fremd';
      if (failure === 'preis') incoming.sheets.Preise_Wolf[1][4] += 0.01;
      if (failure === 'modell') incoming.sheets.Geräte_Katalog[2][1] += ' geändert';
      if (failure === 'blattfolge')
        incoming.sheets = Object.fromEntries(Object.entries(incoming.sheets).reverse());
      await fs.writeFile(snapshotFile, JSON.stringify(contract.snapshot));
      await fs.utimes(snapshotFile, new Date(0), new Date(0));
      const old = await fs.readFile(snapshotFile, 'utf8');
      const before = await fs.stat(snapshotFile);
      if (way === 'kaltstart')
        await fs.rename(snapshotFile, `${snapshotFile}.${way}-${failure}.beleg`);
      const entry =
        way === 'zeitplan'
          ? `require ${phpQuote(path.join(repo, 'api/werte-auffrischen.php'))};`
          : way === 'nachlauf'
            ? 'rechner_auffrischen_im_nachlauf();'
            : 'try { rechner_load_snapshot(); exit(99); } catch (RechnerValuesException $e) { echo $e->publicCode; }';
      const result = await php(entry);
      assert.notEqual(result.code, 99);
      if (way === 'zeitplan') assert.equal(result.code, 1);
      else assert.equal(result.code, 0);
      assert.match(result.stderr, /snapshot_abgelehnt grund=/);
      if (way === 'kaltstart') {
        assert.equal(result.stdout, 'snapshot_cold_start_failed');
        await assert.rejects(fs.stat(snapshotFile), { code: 'ENOENT' });
      } else {
        assert.equal(await fs.readFile(snapshotFile, 'utf8'), old);
        assert.equal((await fs.stat(snapshotFile)).mtimeMs, before.mtimeMs);
      }
      console.log(
        `PASS ${way}/${failure}: abgewiesen, alter Abzug unverändert oder Kaltstart ohne Datei`
      );
    }
    incoming = contract.snapshot;
    const entry =
      way === 'zeitplan'
        ? `require ${phpQuote(path.join(repo, 'api/werte-auffrischen.php'))};`
        : way === 'nachlauf'
          ? 'rechner_auffrischen_im_nachlauf();'
          : 'rechner_load_snapshot();';
    await fs.writeFile(snapshotFile, '{ungueltiger-altstand');
    await fs.utimes(snapshotFile, new Date(0), new Date(0));
    const result = await php(entry);
    assert.equal(result.code, 0, result.stderr);
    assert.deepEqual(JSON.parse(await fs.readFile(snapshotFile, 'utf8')), contract.snapshot);
    console.log(`PASS ${way}: gültiges Schema 3 geschrieben`);
  }
  const forwarded = await php(
    "define('RECHNER_GOOGLE_FORWARD_TIMEOUT_SECONDS', 2); rechner_forward_google('action=health');"
  );
  assert.equal(forwarded.code, 0, forwarded.stderr);
  assert(urls.includes('/exec?action=health'));
  console.log('PASS Google-Durchreicheweg verwendet ebenfalls konfigurierte Prüfadresse');
} finally {
  await new Promise((resolve) => server.close(resolve));
  await fs.writeFile(path.join(runtime, 'rechner-config.json'), '{}');
}
