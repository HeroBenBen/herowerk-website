import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceArgument = process.argv.find((argument) => argument.startsWith('--source='));
const sourceRoot = sourceArgument
  ? path.resolve(sourceArgument.slice('--source='.length))
  : repoRoot;
const slowDelayMilliseconds = 1200;
const requestLimitMilliseconds = 10000;

const snapshot = {
  service: 'werte_snapshot',
  schemaVersion: 1,
  sheets: {
    KV_Parameter: [['schluessel', 'wert']],
    KV_FoerderPerioden: [['key', 'gueltig_ab']],
    Förder_Parameter: [
      ['schluessel', 'wert'],
      ['grundfoerderung_pct', 30],
    ],
    Dimensionierung: [
      ['schluessel', 'wert'],
      ['volllaststunden', 1800],
    ],
    Preise_Wolf: [['Klasse', 'Modell', 'Endpreis_brutto']],
    Preise_Vaillant: [['Klasse', 'Modell', 'Endpreis_brutto']],
    Geräte_Katalog: [['Marke', 'Modell']],
    Klima_PLZ: [['PLZ', 'Ort', 'NAT_C']],
    Fördervorschuss: [['schluessel', 'wert']],
  },
};

const results = [];
let phpLog = '';

function record(name, passed, detail) {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'ROT '} ${name}: ${detail}`);
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
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

async function stopProcess(processHandle) {
  if (!processHandle || processHandle.exitCode !== null) return;
  processHandle.kill('SIGTERM');
  const ended = await Promise.race([
    new Promise((resolve) => processHandle.once('exit', () => resolve(true))),
    sleep(2000).then(() => false),
  ]);
  if (!ended && processHandle.exitCode === null) processHandle.kill('SIGKILL');
}

function replaceExactlyOnce(source, search, replacement, label) {
  const matches = source.match(search);
  if (!matches || matches.length !== 1) {
    throw new Error(`${label}: genau ein Quelltreffer erwartet, gefunden ${matches?.length ?? 0}.`);
  }
  return source.replace(search, replacement);
}

async function buildFixture(root, upstreamUrl, fatalMode = '') {
  const websiteDirectory = path.join(root, 'website');
  const apiDirectory = path.join(websiteDirectory, 'api');
  const runtimeDirectory = path.join(root, 'rechner-runtime');
  await fs.mkdir(apiDirectory, { recursive: true });
  await fs.mkdir(runtimeDirectory, { recursive: true });

  await fs.copyFile(
    path.join(sourceRoot, 'api', 'rechner-engine.php'),
    path.join(apiDirectory, 'rechner-engine.php')
  );

  let valuesSource = await fs.readFile(path.join(sourceRoot, 'api', 'rechner-values.php'), 'utf8');
  valuesSource = replaceExactlyOnce(
    valuesSource,
    /const APPS_SCRIPT_URL = '[^']+';/g,
    `const APPS_SCRIPT_URL = '${upstreamUrl}';`,
    'APPS_SCRIPT_URL'
  );
  await fs.writeFile(path.join(apiDirectory, 'rechner-values.php'), valuesSource);

  let rechnerSource = await fs.readFile(path.join(sourceRoot, 'api', 'rechner.php'), 'utf8');

  if (fatalMode !== '') {
    const injection =
      fatalMode === 'exception'
        ? "throw new RuntimeException('test_unbehandelte_ausnahme');"
        : "trigger_error('test_fataler_fehler', E_USER_ERROR);";
    rechnerSource = replaceExactlyOnce(
      rechnerSource,
      /require_once __DIR__ \. '\/rechner-engine\.php';/g,
      `require_once __DIR__ . '/rechner-engine.php';\n${injection}`,
      `Fehlerinjektion ${fatalMode}`
    );
  }

  await fs.writeFile(path.join(apiDirectory, 'rechner.php'), rechnerSource);
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
    {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
  const collect = (chunk) => {
    phpLog += chunk.toString();
  };
  processHandle.stdout.on('data', collect);
  processHandle.stderr.on('data', collect);
  await waitForPort(port, processHandle);
  return { port, processHandle };
}

async function requestCalculator(port) {
  const startedAt = performance.now();
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        host: '127.0.0.1',
        port,
        path: '/api/rechner.php?action=health',
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
    request.setTimeout(requestLimitMilliseconds, () => {
      request.destroy(new Error('Zeitgrenze des lokalen Rechneraufrufs überschritten.'));
    });
    request.once('error', reject);
    request.end();
  });
}

async function writeSnapshot(runtimeDirectory, body, ageSeconds = 7200) {
  const snapshotFile = path.join(runtimeDirectory, 'werte_snapshot.json');
  await fs.writeFile(snapshotFile, body, { mode: 0o600 });
  const modifiedAt = new Date(Date.now() - ageSeconds * 1000);
  await fs.utimes(snapshotFile, modifiedAt, modifiedAt);
  return { snapshotFile, oldMtime: (await fs.stat(snapshotFile)).mtimeMs };
}

async function waitForNewMtime(snapshotFile, oldMtime) {
  const deadline = Date.now() + 6000;
  while (Date.now() < deadline) {
    const current = await fs.stat(snapshotFile);
    if (current.mtimeMs > oldMtime) return current.mtimeMs;
    await sleep(50);
  }
  return (await fs.stat(snapshotFile)).mtimeMs;
}

function validGenericError(response) {
  if (response.status !== 500 || response.body.trim() === '') return false;
  try {
    const payload = JSON.parse(response.body);
    return payload?.error === true && payload?.message === 'calculator_temporarily_unavailable';
  } catch {
    return false;
  }
}

let upstreamMode = 'snapshot';
let snapshotFetches = 0;
let barrierResponses = [];
let barrierTimer = null;

function releaseBarrierResponses() {
  const responses = barrierResponses;
  barrierResponses = [];
  if (barrierTimer !== null) clearTimeout(barrierTimer);
  barrierTimer = null;
  for (const response of responses) {
    response.statusCode = 200;
    response.end(JSON.stringify(snapshot));
  }
}

const upstreamServer = http.createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  const action = url.searchParams.get('action');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Connection', 'close');

  if (action !== 'werte_snapshot') {
    response.statusCode = 200;
    response.end(JSON.stringify({ status: 'google-fallback' }));
    return;
  }

  snapshotFetches += 1;
  if (upstreamMode === 'fallback') {
    response.statusCode = 503;
    response.end(JSON.stringify({ error: true }));
    return;
  }

  if (upstreamMode === 'barrier') {
    barrierResponses.push(response);
    if (barrierResponses.length >= 2) {
      setTimeout(releaseBarrierResponses, slowDelayMilliseconds);
    } else {
      barrierTimer = setTimeout(releaseBarrierResponses, slowDelayMilliseconds * 2);
    }
    return;
  }

  setTimeout(() => {
    response.statusCode = 200;
    response.end(JSON.stringify(snapshot));
  }, slowDelayMilliseconds);
});

let mainServer;
const temporaryRoots = [];

try {
  await new Promise((resolve, reject) => {
    upstreamServer.once('error', reject);
    upstreamServer.listen(0, '127.0.0.1', resolve);
  });
  const upstreamAddress = upstreamServer.address();
  const upstreamPort =
    typeof upstreamAddress === 'object' && upstreamAddress ? upstreamAddress.port : 0;
  if (!upstreamPort) throw new Error('Die langsame Attrappe konnte nicht starten.');
  const upstreamUrl = `http://127.0.0.1:${upstreamPort}/rechner`;

  const mainRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'rechner-nachlauf-'));
  temporaryRoots.push(mainRoot);
  const fixture = await buildFixture(mainRoot, upstreamUrl);
  mainServer = await startPhpServer(fixture.websiteDirectory);

  snapshotFetches = 0;
  upstreamMode = 'snapshot';
  const firstSnapshot = await writeSnapshot(fixture.runtimeDirectory, JSON.stringify(snapshot));
  const firstResponse = await requestCalculator(mainServer.port);
  record(
    'Abgelaufener Snapshot antwortet unter 500 Millisekunden',
    firstResponse.milliseconds < 500,
    `${firstResponse.milliseconds.toFixed(1)} ms, HTTP ${firstResponse.status}`
  );

  const refreshedMtime = await waitForNewMtime(firstSnapshot.snapshotFile, firstSnapshot.oldMtime);
  record(
    'Snapshot wird nach der Antwort aufgefrischt',
    refreshedMtime > firstSnapshot.oldMtime,
    `Änderungszeit ${Math.round(firstSnapshot.oldMtime)} -> ${Math.round(refreshedMtime)}`
  );

  snapshotFetches = 0;
  upstreamMode = 'barrier';
  const parallelSnapshot = await writeSnapshot(fixture.runtimeDirectory, JSON.stringify(snapshot));
  const secondParallelServer = await startPhpServer(fixture.websiteDirectory);
  let parallelResponses;
  try {
    parallelResponses = await Promise.all([
      requestCalculator(mainServer.port),
      requestCalculator(secondParallelServer.port),
    ]);
  } finally {
    await stopProcess(secondParallelServer.processHandle);
  }
  await waitForNewMtime(parallelSnapshot.snapshotFile, parallelSnapshot.oldMtime);
  let lockMarker = '';
  try {
    lockMarker = await fs.readFile(
      path.join(fixture.runtimeDirectory, 'werte_snapshot.lock'),
      'utf8'
    );
  } catch (error) {
    if (!(error && typeof error === 'object' && error.code === 'ENOENT')) throw error;
  }
  const lockMode = await fs
    .stat(path.join(fixture.runtimeDirectory, 'werte_snapshot.lock'))
    .then((status) => status.mode & 0o777)
    .catch((error) => {
      if (error && typeof error === 'object' && error.code === 'ENOENT') return 0;
      throw error;
    });
  const pathLogCount = (phpLog.match(/nachlauf_abschluss weg=puffer/g) ?? []).length;
  record(
    'Zwei parallele Aufrufe erzeugen genau eine Auffrischung',
    snapshotFetches === 1 &&
      parallelResponses.every((response) => response.milliseconds < 500) &&
      lockMarker === 'abschlussweg=puffer\n' &&
      lockMode === 0o600 &&
      pathLogCount === 1,
    `${snapshotFetches} Attrappenabruf(e), Weg ${pathLogCount} mal protokolliert, Rechte ${lockMode.toString(8)}, Antworten ${parallelResponses
      .map((response) => response.milliseconds.toFixed(1) + ' ms')
      .join(' und ')}`
  );

  upstreamMode = 'snapshot';

  const fatalResponses = [];
  for (const fatalMode of ['exception', 'fatal']) {
    const fatalRoot = await fs.mkdtemp(path.join(os.tmpdir(), `rechner-${fatalMode}-`));
    temporaryRoots.push(fatalRoot);
    const fatalFixture = await buildFixture(fatalRoot, upstreamUrl, fatalMode);
    const fatalServer = await startPhpServer(fatalFixture.websiteDirectory);
    try {
      fatalResponses.push(await requestCalculator(fatalServer.port));
    } finally {
      await stopProcess(fatalServer.processHandle);
    }
  }
  record(
    'Ausnahme und fataler Fehler liefern nicht leeres, gültiges Fehler-JSON',
    fatalResponses.every(validGenericError),
    fatalResponses
      .map((response) => `HTTP ${response.status}, ${Buffer.byteLength(response.body)} Byte`)
      .join(' und ')
  );

  upstreamMode = 'fallback';
  snapshotFetches = 0;
  await writeSnapshot(fixture.runtimeDirectory, '{ungültig', 0);
  const fallbackResponse = await requestCalculator(mainServer.port);
  let fallbackPayload = null;
  try {
    fallbackPayload = JSON.parse(fallbackResponse.body);
  } catch {
    fallbackPayload = null;
  }
  // GOOGLE-RUECKFALL STILLGELEGT, GF-Entscheid vom 21.08.2026 (Vorgang T583):
  // _Entscheidungen/2026-08-21_Google-Rueckfall-des-Website-Rechners-stilllegen_HERO.md
  // Frueher wurde hier erwartet, dass ein unbrauchbarer Wertevorrat auf das Google-Programm
  // umleitet. Dessen Rechenwerk ist eine Generation aelter und legt bei einer bestehenden
  // Waermepumpe um mehr als die Haelfte zu klein aus. Erwartet wird jetzt das Gegenteil: der
  // Aufruf endet sichtbar mit einem Fehler, und die Attrappe des Google-Programms wird NICHT
  // angefasst. Der zweite Teil ist der eigentliche Waechter; ohne ihn wuerde ein
  // wiederhergestellter Rueckfall unbemerkt durchgehen, solange er nur einen Fehler zurueckgibt.
  record(
    'Unbrauchbarer Snapshot endet mit sichtbarem Fehler statt Google-Rückfall',
    fallbackResponse.status === 503 &&
      fallbackPayload?.error === true &&
      fallbackPayload?.message === 'calculator_temporarily_unavailable' &&
      fallbackPayload?.status !== 'google-fallback',
    `HTTP ${fallbackResponse.status}, ${fallbackResponse.body}`
  );
} catch (error) {
  console.error(`FEHLER: ${error instanceof Error ? error.message : String(error)}`);
  if (phpLog.trim() !== '') console.error(phpLog.slice(-4000));
  process.exitCode = 2;
} finally {
  await stopProcess(mainServer?.processHandle);
  await new Promise((resolve) => upstreamServer.close(resolve));
  await Promise.all(temporaryRoots.map((root) => fs.rm(root, { recursive: true, force: true })));
}

if (process.exitCode !== 2) {
  const passed = results.filter((result) => result.passed).length;
  const allPassed = passed === results.length && results.length === 5;
  console.log(
    `ERGEBNIS: ${allPassed ? 'GRÜN' : 'ROT'}, ${passed} von ${results.length} Zusicherungen bestanden.`
  );
  process.exitCode = allPassed ? 0 : 1;
}
