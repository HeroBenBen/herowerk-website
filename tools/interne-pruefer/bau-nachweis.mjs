#!/usr/bin/env node
// Einmaliger, ausdrücklich aufgerufener Baunachweis. Kein Dauertest.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { VERSION, protectedBuild, cleanupBuildImages } from './pruefe.mjs';

const mode = process.argv[2];
if (!['1', '2', '3'].includes(mode) || process.argv.length !== 3)
  throw new Error('Aufruf: node tools/interne-pruefer/bau-nachweis.mjs 1|2|3');
const state = '/Users/benjaminbendler/.herowerk-pruefung';
const home = path.join(state, 'bau-nachweise', VERSION, `wache-${mode}`);
const lock = path.join(state, 'sperre');
const runId = `bau-nachweis-${mode}-${Date.now()}-${process.pid}`;
const dockerEnv = {
  ...process.env,
  DOCKER_HOST: 'unix:///Users/benjaminbendler/.colima/default/docker.sock',
  DOCKER_BUILDKIT: '0',
};
const deadline = Date.now() + 110000;
fs.mkdirSync(home, { recursive: true, mode: 0o700 });
const fd = fs.openSync(lock, 'wx', 0o600);
fs.writeSync(fd, JSON.stringify({ pid: process.pid, runId, purpose: 'T1302 Bau-Nachweis' }));
if (fs.existsSync(path.join(home, 'begonnen.json'))) {
  fs.closeSync(fd);
  fs.unlinkSync(lock);
  throw new Error('Dieser Bau-Nachweis wurde bereits begonnen; keine Wiederholung.');
}
const result = {
  version: VERSION,
  runId,
  guard: Number(mode),
  started: new Date().toISOString(),
  builds: [],
};
const save = () =>
  fs.writeFileSync(path.join(home, 'ergebnis.json'), JSON.stringify(result, null, 2) + '\n', {
    mode: 0o600,
  });
const names = [];
const tags = [];
async function docker(args, onStdout) {
  try {
    const stdout = execFileSync('docker', args, {
      env: dockerEnv,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: Math.max(1, Math.min(60000, deadline - Date.now())),
      maxBuffer: 8 * 1024 * 1024,
    });
    onStdout?.(stdout);
    return { code: 0, stdout, stderr: '' };
  } catch (e) {
    const stdout = String(e.stdout || '');
    onStdout?.(stdout);
    return { code: e.status || 1, stdout, stderr: String(e.stderr || e.message) };
  }
}
function requireTrue(value, message) {
  if (!value) throw new Error(message);
}
async function build(dockerfile, suffix) {
  const name = `${runId}-${suffix}`;
  names.push(name);
  const record = { id: suffix, runId, spaceName: name };
  result.builds.push(record);
  const tag = `herowerk-t1302-bau-nachweis:${runId}-${suffix}`;
  tags.push(tag);
  return protectedBuild(
    docker,
    (onStdout) =>
      docker(
        [
          'build',
          '--pull=false',
          '--force-rm',
          '--label',
          `herowerk.lauf=${runId}-${suffix}`,
          '-f',
          dockerfile,
          '-t',
          tag,
          home,
        ],
        onStdout
      ),
    record,
    save
  );
}
try {
  const begun = fs.openSync(path.join(home, 'begonnen.json'), 'wx', 0o600);
  fs.writeSync(begun, JSON.stringify({ runId, started: result.started }));
  fs.closeSync(begun);
  if (mode === '3') {
    let calls = 0;
    const record = { id: 'speichersperre', runId, spaceName: runId };
    names.push(runId);
    result.builds.push(record);
    const r = await protectedBuild(
      docker,
      async () => {
        calls++;
        throw new Error('Speicherprobe führt grundsätzlich keinen Bau aus');
      },
      record,
      save
    );
    result.status = r.code ? 'rot' : 'grün';
    result.message = r.stderr;
    result.buildCalls = calls;
    requireTrue(
      r.code === 1 &&
        record.storage?.freeBytes < record.storage?.minimumBytes &&
        !record.buildStarted &&
        calls === 0,
      'Speichersperre unter 6 GB nicht nachgewiesen'
    );
    result.passed = true;
    process.exitCode = 1; // Erwartetes Rot der tatsächlich gemessenen Speichersperre.
  } else {
    const dockerfile = path.join(home, 'Dockerfile');
    const base = 'node@sha256:c65a31e3c5a9d0c7ab92d2bb91fe74f90d199bfe08b429c1419129e7a5052d99';
    const source =
      `FROM ${base} AS vorher\nRUN printf '%s' '${runId}' > /beleg\n` +
      `FROM ${base}\nCOPY --from=vorher /beleg /beleg\n` +
      (mode === '2' ? 'RUN exit 73\n' : '');
    fs.writeFileSync(dockerfile, source);
    result.dockerfileSha256 = crypto.createHash('sha256').update(source).digest('hex');
    const first = await build(dockerfile, 'erster');
    fs.writeFileSync(path.join(home, 'erster.log'), first.stdout + first.stderr);
    if (mode === '1') {
      requireTrue(first.code === 0, 'Erster Cache-Messpunkt fehlgeschlagen; kein zweiter Bau');
      const second = await build(dockerfile, 'zweiter');
      fs.writeFileSync(path.join(home, 'zweiter.log'), second.stdout + second.stderr);
      requireTrue(
        second.code === 0 && (second.stdout.match(/---> Using cache/g) || []).length >= 2,
        'Gleicher mehrstufiger Dockerfile-Inhalt bei anderer CLI-Laufkennung nicht aus Cache gebaut'
      );
      requireTrue(fs.readFileSync(dockerfile, 'utf8') === source, 'Dockerfile beim Bau verändert');
    } else {
      const record = result.builds[0];
      requireTrue(
        first.code !== 0 &&
          record.buildStarted &&
          record.cleanup?.complete &&
          record.cleanup.removed.length > 0,
        'Gezielt gescheiterter Bau nicht vollständig bereinigt'
      );
      const after = await docker(['image', 'ls', '-aq', '--no-trunc']);
      const ids = new Set(after.stdout.trim().split(/\s+/));
      requireTrue(
        after.code === 0 && record.before.every((id) => ids.has(id)),
        'Ein bereits vor dem Bau vorhandenes Abbild wurde entfernt'
      );
    }
    result.passed = true;
    result.status = 'grün';
  }
} catch (e) {
  result.passed = false;
  result.status = 'rot';
  result.error = e.message;
  process.exitCode = 1;
} finally {
  for (const name of names) await docker(['rm', '-f', name]);
  for (const tag of tags) await docker(['image', 'rm', '--no-prune', tag]);
  if (mode === '1')
    for (const b of result.builds) if (b.buildStarted) b.proofCleanup = cleanupBuildImages(b);
  result.ended = new Date().toISOString();
  save();
  fs.closeSync(fd);
  fs.unlinkSync(lock);
  console.log(
    JSON.stringify(
      {
        status: result.status,
        passed: result.passed,
        message: result.message || result.error,
        result: path.join(home, 'ergebnis.json'),
      },
      null,
      2
    )
  );
}
