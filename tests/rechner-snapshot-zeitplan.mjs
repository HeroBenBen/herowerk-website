import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requestLimitMilliseconds = 10000;
const results = [];
const temporaryRoots = [];
const phpProcesses = [];
let phpLog = '';

const snapshotAlt = {
  service: 'werte_snapshot',
  schemaVersion: 1,
  sheets: {
    KV_Parameter: [
      ['schluessel', 'wert'],
      ['marker', 'alt'],
    ],
    KV_FoerderPerioden: [['key', 'gueltig_ab']],
    Förder_Parameter: [['schluessel', 'wert']],
    Dimensionierung: [['schluessel', 'wert']],
    Preise_Wolf: [['Klasse', 'Modell', 'Endpreis_brutto']],
    Preise_Vaillant: [['Klasse', 'Modell', 'Endpreis_brutto']],
    Geräte_Katalog: [['Marke', 'Modell']],
    Klima_PLZ: [['PLZ', 'Ort', 'NAT_C']],
    Fördervorschuss: [['schluessel', 'wert']],
  },
};

const snapshotNeu = structuredClone(snapshotAlt);
snapshotNeu.sheets.KV_Parameter[1][1] = 'neu';

function record(name, passed, detail) {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'ROT '} ${name}: ${detail}`);
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function hash(body) {
  return crypto.createHash('sha256').update(body).digest('hex');
}

function lineCount(value) {
  return value.trim() === '' ? 0 : value.trimEnd().split('\n').length;
}

async function reservePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  await new Promise((resolve) => server.close(resolve));
  if (!port) throw new Error('Kein freier lokaler Port gefunden.');
  return port;
}

async function stopProcess(processHandle) {
  if (!processHandle || processHandle.exitCode !== null) return;
  processHandle.kill('SIGTERM');
  const ended = await Promise.race([
    new Promise((resolve) => processHandle.once('exit', () => resolve(true))),
    sleep(2000).then(() => false),
  ]);
  if (!ended && processHandle.exitCode === null) processHandle.kill('SIGKILL');
}

async function waitForPort(port, processHandle) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (processHandle.exitCode !== null) {
      throw new Error(`PHP-Prüfserver vorzeitig beendet.\n${phpLog.slice(-2000)}`);
    }
    const connected = await new Promise((resolve) => {
      const socket = net.createConnection({ host: '127.0.0.1', port });
      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.once('error', () => resolve(false));
    });
    if (connected) return;
    await sleep(50);
  }
  throw new Error(`PHP-Prüfserver antwortet nicht.\n${phpLog.slice(-2000)}`);
}

function replaceExactlyOnce(source, search, replacement, label) {
  const matches = source.match(search);
  if (!matches || matches.length !== 1) {
    throw new Error(`${label}: genau ein Quelltreffer erwartet, gefunden ${matches?.length ?? 0}.`);
  }
  return source.replace(search, replacement);
}

async function buildFixture(root, upstreamUrl, removeSapiGuard = false) {
  const websiteDirectory = path.join(root, 'website');
  const apiDirectory = path.join(websiteDirectory, 'api');
  const runtimeDirectory = path.join(root, 'rechner-runtime');
  await fs.mkdir(apiDirectory, { recursive: true });
  await fs.mkdir(runtimeDirectory, { recursive: true });

  for (const file of ['rechner-engine.php', 'rechner.php']) {
    await fs.copyFile(path.join(repoRoot, 'api', file), path.join(apiDirectory, file));
  }

  let valuesSource = await fs.readFile(path.join(repoRoot, 'api', 'rechner-values.php'), 'utf8');
  valuesSource = replaceExactlyOnce(
    valuesSource,
    /const APPS_SCRIPT_URL = '[^']+';/g,
    `const APPS_SCRIPT_URL = '${upstreamUrl}';`,
    'APPS_SCRIPT_URL'
  );
  await fs.writeFile(path.join(apiDirectory, 'rechner-values.php'), valuesSource);

  let scheduleSource = await fs.readFile(
    path.join(repoRoot, 'api', 'werte-auffrischen.php'),
    'utf8'
  );
  if (removeSapiGuard) {
    scheduleSource = replaceExactlyOnce(
      scheduleSource,
      /if \(php_sapi_name\(\) !== 'cli'\) \{[\s\S]*?\n\}\n\n/g,
      '',
      'PHP-SAPI-Sperre'
    );
  }
  await fs.writeFile(path.join(apiDirectory, 'werte-auffrischen.php'), scheduleSource);
  await fs.writeFile(path.join(runtimeDirectory, 'werte_snapshot_key.txt'), 'test-secret\n', {
    mode: 0o600,
  });

  return { websiteDirectory, runtimeDirectory };
}

async function startPhpServer(websiteDirectory) {
  const port = await reservePort();
  const processHandle = spawn(
    'php',
    ['-d', 'display_errors=0', '-S', `127.0.0.1:${port}`, '-t', websiteDirectory],
    { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] }
  );
  phpProcesses.push(processHandle);
  const collect = (chunk) => {
    phpLog += chunk.toString();
  };
  processHandle.stdout.on('data', collect);
  processHandle.stderr.on('data', collect);
  await waitForPort(port, processHandle);
  return { port, processHandle };
}

async function request(port, pathname) {
  const startedAt = performance.now();
  return new Promise((resolve, reject) => {
    const requestHandle = http.request(
      {
        host: '127.0.0.1',
        port,
        path: pathname,
        method: 'GET',
        agent: false,
        headers: {
          Referer: 'https://www.herowerk.de/rechner.html',
          Connection: 'close',
        },
      },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          resolve({
            status: response.statusCode ?? 0,
            body: Buffer.concat(chunks).toString('utf8'),
            milliseconds: performance.now() - startedAt,
          });
        });
      }
    );
    requestHandle.setTimeout(requestLimitMilliseconds, () => {
      requestHandle.destroy(new Error('Zeitgrenze des lokalen HTTP-Aufrufs überschritten.'));
    });
    requestHandle.once('error', reject);
    requestHandle.end();
  });
}

async function runCli(websiteDirectory) {
  const startedAt = performance.now();
  const processHandle = spawn(
    'php',
    [path.join(websiteDirectory, 'api', 'werte-auffrischen.php')],
    {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
  let stdout = '';
  let stderr = '';
  processHandle.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });
  processHandle.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });
  const code = await new Promise((resolve) => processHandle.once('exit', resolve));
  return { code, stdout, stderr, milliseconds: performance.now() - startedAt };
}

async function writeSnapshot(runtimeDirectory, snapshot, ageSeconds = 0) {
  const snapshotFile = path.join(runtimeDirectory, 'werte_snapshot.json');
  const body = JSON.stringify(snapshot);
  await fs.writeFile(snapshotFile, body, { mode: 0o600 });
  const modifiedAt = new Date(Date.now() - ageSeconds * 1000);
  await fs.utimes(snapshotFile, modifiedAt, modifiedAt);
  const status = await fs.stat(snapshotFile);
  return { snapshotFile, body, hash: hash(body), mtimeMs: status.mtimeMs };
}

async function readSnapshotState(snapshotFile) {
  const body = await fs.readFile(snapshotFile, 'utf8');
  const status = await fs.stat(snapshotFile);
  return { body, hash: hash(body), mtimeMs: status.mtimeMs };
}

let upstreamMode = 'success';
let upstreamDelayMilliseconds = 0;
let snapshotFetches = 0;

const upstreamServer = http.createServer((requestHandle, response) => {
  const url = new URL(requestHandle.url ?? '/', 'http://127.0.0.1');
  if (url.searchParams.get('action') !== 'werte_snapshot') {
    response.statusCode = 200;
    response.end(JSON.stringify({ status: 'google-fallback' }));
    return;
  }

  snapshotFetches += 1;
  setTimeout(() => {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (upstreamMode === 'http-error') {
      response.statusCode = 503;
      response.end(JSON.stringify({ error: true }));
      return;
    }
    response.statusCode = 200;
    response.end(upstreamMode === 'invalid' ? '{ungültig' : JSON.stringify(snapshotNeu));
  }, upstreamDelayMilliseconds);
});

try {
  await new Promise((resolve, reject) => {
    upstreamServer.once('error', reject);
    upstreamServer.listen(0, '127.0.0.1', resolve);
  });
  const upstreamAddress = upstreamServer.address();
  const upstreamPort =
    typeof upstreamAddress === 'object' && upstreamAddress ? upstreamAddress.port : 0;
  if (!upstreamPort) throw new Error('Die Snapshot-Attrappe konnte nicht starten.');
  const upstreamUrl = `http://127.0.0.1:${upstreamPort}/rechner`;

  const mainRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'rechner-zeitplan-'));
  temporaryRoots.push(mainRoot);
  const fixture = await buildFixture(mainRoot, upstreamUrl);

  upstreamMode = 'success';
  upstreamDelayMilliseconds = 0;
  snapshotFetches = 0;
  const freshBefore = await writeSnapshot(fixture.runtimeDirectory, snapshotAlt, 0);
  const unconditionalRun = await runCli(fixture.websiteDirectory);
  const freshAfter = await readSnapshotState(freshBefore.snapshotFile);
  record(
    'Zeitplan frischt unabhängig vom Dateialter auf',
    unconditionalRun.code === 0 &&
      unconditionalRun.stderr === '' &&
      lineCount(unconditionalRun.stdout) === 1 &&
      unconditionalRun.stdout === 'OK: Wertevorrat erfolgreich aufgefrischt.\n' &&
      snapshotFetches === 1 &&
      JSON.parse(freshAfter.body).sheets.KV_Parameter[1][1] === 'neu',
    `Rückgabewert ${unconditionalRun.code}, ${snapshotFetches} Abruf, ${unconditionalRun.milliseconds.toFixed(1)} ms`
  );

  upstreamDelayMilliseconds = 1200;
  snapshotFetches = 0;
  await writeSnapshot(fixture.runtimeDirectory, snapshotAlt, 7200);
  const scheduledRun = await runCli(fixture.websiteDirectory);
  const phpServer = await startPhpServer(fixture.websiteDirectory);
  const visitorResponse = await request(phpServer.port, '/api/rechner.php?action=health');
  record(
    'Besucheraufruf ist nach dem Zeitplanlauf schnell',
    scheduledRun.code === 0 &&
      snapshotFetches === 1 &&
      visitorResponse.status === 200 &&
      visitorResponse.milliseconds < 500,
    `Zeitplan ${scheduledRun.milliseconds.toFixed(1)} ms, Besucher ${visitorResponse.milliseconds.toFixed(1)} ms, HTTP ${visitorResponse.status}`
  );

  for (const failureMode of ['http-error', 'invalid']) {
    upstreamMode = failureMode;
    upstreamDelayMilliseconds = 0;
    const beforeFailure = await writeSnapshot(fixture.runtimeDirectory, snapshotAlt, 0);
    const failedRun = await runCli(fixture.websiteDirectory);
    const afterFailure = await readSnapshotState(beforeFailure.snapshotFile);
    record(
      `Fehlerfall ${failureMode} lässt den alten Snapshot unverändert`,
      failedRun.code === 1 &&
        failedRun.stdout === '' &&
        lineCount(failedRun.stderr) === 1 &&
        beforeFailure.hash === afterFailure.hash &&
        beforeFailure.mtimeMs === afterFailure.mtimeMs &&
        JSON.parse(afterFailure.body).sheets.KV_Parameter[1][1] === 'alt',
      `Rückgabewert ${failedRun.code}, Prüfsumme ${afterFailure.hash.slice(0, 12)}, Änderungszeit ${Math.round(afterFailure.mtimeMs)}`
    );
  }

  upstreamMode = 'success';
  snapshotFetches = 0;
  const beforeLock = await writeSnapshot(fixture.runtimeDirectory, snapshotAlt, 0);
  const lockFile = path.join(fixture.runtimeDirectory, 'werte_snapshot.lock');
  const lockHolder = spawn(
    'php',
    [
      '-r',
      '$h=fopen($argv[1], "c"); flock($h, LOCK_EX); echo "LOCKED\\n"; fflush(STDOUT); usleep(5500000);',
      lockFile,
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );
  phpProcesses.push(lockHolder);
  await new Promise((resolve, reject) => {
    lockHolder.once('error', reject);
    lockHolder.stdout.once('data', (chunk) => {
      if (chunk.toString() === 'LOCKED\n') resolve();
      else reject(new Error('Sperrhalter meldet keinen eindeutigen Start.'));
    });
  });
  const busyRun = await runCli(fixture.websiteDirectory);
  const afterLock = await readSnapshotState(beforeLock.snapshotFile);
  record(
    'Belegte Sperre endet begrenzt und erfolgreich',
    busyRun.code === 0 &&
      busyRun.stderr === '' &&
      busyRun.stdout === 'OK: Auffrischung übersprungen, ein anderer Lauf ist bereits aktiv.\n' &&
      busyRun.milliseconds >= 2800 &&
      busyRun.milliseconds < 4500 &&
      snapshotFetches === 0 &&
      beforeLock.hash === afterLock.hash &&
      beforeLock.mtimeMs === afterLock.mtimeMs,
    `Rückgabewert ${busyRun.code}, ${busyRun.milliseconds.toFixed(1)} ms, ${snapshotFetches} Abrufe`
  );
  await stopProcess(lockHolder);

  const guardedResponse = await request(phpServer.port, '/api/werte-auffrischen.php');
  record(
    'PHP-SAPI-Sperre weist den Netzaufruf ab',
    guardedResponse.status === 403 &&
      guardedResponse.body ===
        'FEHLER: Dieses Skript darf nur über die Kommandozeile ausgeführt werden.\n',
    `HTTP ${guardedResponse.status}, ${guardedResponse.body.trim()}`
  );

  const mutantRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'rechner-zeitplan-ohne-sperre-'));
  temporaryRoots.push(mutantRoot);
  const mutantFixture = await buildFixture(mutantRoot, upstreamUrl, true);
  const mutantServer = await startPhpServer(mutantFixture.websiteDirectory);
  const mutantResponse = await request(mutantServer.port, '/api/werte-auffrischen.php');
  const counterproofRed = mutantResponse.status !== 403;
  console.log(
    `GEGENPROBE ${counterproofRed ? 'ROT' : 'UNBRAUCHBAR'}: Netzwerkaufruf ohne PHP-SAPI-Sperre antwortet mit HTTP ${mutantResponse.status} statt HTTP 403.`
  );
  record(
    'Gegenprobe ohne PHP-SAPI-Sperre bewacht die Zusicherung',
    counterproofRed && mutantResponse.status === 200,
    `HTTP ${mutantResponse.status}, ${mutantResponse.body.trim()}`
  );
} catch (error) {
  console.error(`FEHLER: ${error instanceof Error ? error.message : String(error)}`);
  if (phpLog.trim() !== '') console.error(phpLog.slice(-4000));
  process.exitCode = 2;
} finally {
  await Promise.all(phpProcesses.map((processHandle) => stopProcess(processHandle)));
  await new Promise((resolve) => upstreamServer.close(resolve));
  await Promise.all(temporaryRoots.map((root) => fs.rm(root, { recursive: true, force: true })));
}

if (process.exitCode !== 2) {
  const passed = results.filter((result) => result.passed).length;
  const allPassed = passed === results.length && results.length === 7;
  console.log(
    `ERGEBNIS: ${allPassed ? 'GRÜN' : 'ROT'}, ${passed} von ${results.length} Zusicherungen bestanden.`
  );
  process.exitCode = allPassed ? 0 : 1;
}
