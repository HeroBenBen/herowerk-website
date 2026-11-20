#!/usr/bin/env node
// Einmaliger Baunachweis. Kein Dauertest und kein Teil von pruefe.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const STATE = '/Users/benjaminbendler/.herowerk-pruefung';
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/interne-pruefer/abdeckung.json')));
const home = path.join(STATE, config.repository, 'rot-nachweis');
fs.mkdirSync(home, { recursive: true, mode: 0o700 });
const marker = path.join(home, 'begonnen.json');
const fd = fs.openSync(marker, 'wx', 0o600);
fs.writeSync(
  fd,
  JSON.stringify({
    started: new Date().toISOString(),
    version: config.version,
  })
);
fs.closeSync(fd);
const observations = [];
const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'herowerk-t1302-rot-'));
function git(root, ...args) {
  return execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8',
  }).trim();
}
function commit(root, message) {
  git(root, 'add', '--all');
  git(
    root,
    '-c',
    'user.name=HeroWerk Prüfbeleg',
    '-c',
    'user.email=pruefung@localhost',
    'commit',
    '--quiet',
    '-m',
    message
  );
}
function copy(name) {
  const dest = path.join(parent, name);
  fs.cpSync(ROOT, dest, {
    recursive: true,
    verbatimSymlinks: true,
    filter: (p) => !p.includes('/node_modules'),
  });
  git(dest, 'checkout', '--quiet', '-b', `t1302-rot-${Date.now()}-${name}`);
  return dest;
}
function run(root, mode = '--geaendert') {
  const p = spawnSync(process.execPath, ['tools/interne-pruefer/pruefe.mjs', mode], {
    cwd: root,
    encoding: 'utf8',
    timeout: (config.limits[mode === '--voll' ? 'voll' : 'geaendert'] + 20) * 1000,
    maxBuffer: 16 * 1024 * 1024,
  });
  const base = path.join(STATE, config.repository, 'laeufe');
  const files = fs
    .readdirSync(base)
    .sort()
    .map((n) => path.join(base, n, 'ergebnis.json'));
  let own = files
    .map((f) => ({ file: f, result: JSON.parse(fs.readFileSync(f)) }))
    .filter((x) => x.result.branch === git(root, 'branch', '--show-current'))
    .at(-1);
  if (!own) throw new Error('Ergebnis des Rot-Nachweises fehlt');
  for (let i = 0; i < 100 && !own.result.ended; i++) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    own.result = JSON.parse(fs.readFileSync(own.file));
  }
  return { code: p.status, ...own };
}
function requireTrue(condition, message) {
  if (!condition) throw new Error(message);
}
try {
  for (const [index, probe] of config.redProof.entries()) {
    const root = copy(`fach-${index}`);
    for (const m of probe.mutations) {
      const f = path.join(root, m.file);
      let text = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
      if (m.replace !== undefined) {
        requireTrue(text.includes(m.replace), 'Mutationsstelle fehlt');
        text = text.replace(m.replace, m.with);
      } else if (m.secret)
        text +=
          ['gh', 'p_'].join('') +
          Array.from(globalThis.crypto.getRandomValues(new Uint8Array(18)), (n) =>
            n.toString(16).padStart(2, '0')
          ).join('') +
          '\n';
      else text += m.append;
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, text);
    }
    if (probe.keep) {
      const f = path.join(root, 'tools/interne-pruefer/abdeckung.json');
      const c = JSON.parse(fs.readFileSync(f));
      const keep = new Set(probe.keep);
      let grew = true;
      while (grew) {
        grew = false;
        for (const t of c.tasks)
          if (keep.has(t.id))
            for (const d of t.needs || [])
              if (!keep.has(d)) {
                keep.add(d);
                grew = true;
              }
      }
      for (const t of c.tasks)
        if (!keep.has(t.id)) {
          t.omitted = true;
          t.reason =
            'Ausschließlich im einmaligen Rot-Nachweis: unabhängiger nicht betroffener Schritt außerhalb dieser gezielten Probe.';
        }
      fs.writeFileSync(f, JSON.stringify(c, null, 2) + '\n');
    }
    commit(root, `T1302 einmalige Probe ${probe.name}`);
    const first = run(root, index === 1 ? '--voll' : '--geaendert');
    requireTrue(first.code === 1, 'Sabotage muss rot sein');
    for (const id of probe.expectIds)
      requireTrue(
        first.result.steps.some((s) => s.id === id && s.status === 'rot'),
        `Erwarteter roter Schritt fehlt: ${id}`
      );
    if (probe.marker) {
      const logs = fs
        .readdirSync(path.dirname(first.file))
        .filter((n) => n.endsWith('.log'))
        .map((n) => fs.readFileSync(path.join(path.dirname(first.file), n), 'utf8'))
        .join('\n');
      requireTrue(
        logs.includes(probe.marker),
        'Der injizierte Fehler wurde nicht in der Ausgabe nachgewiesen'
      );
    }
    if (probe.secretFile) {
      const reports = fs
        .readdirSync(path.dirname(first.file))
        .filter((n) => /(?:git|dateien)\.json$/.test(n))
        .flatMap(
          (n) => JSON.parse(fs.readFileSync(path.join(path.dirname(first.file), n), 'utf8')) || []
        );
      requireTrue(
        reports.some((r) => r.File.endsWith(probe.secretFile) && r.RuleID === 'github-pat'),
        'Synthetischer Geheimnisfall fehlt im redigierten gitleaks-Bericht'
      );
    }
    const redIndex = first.result.steps.findIndex((s) => s.status === 'rot');
    requireTrue(
      first.result.steps
        .slice(redIndex + 1)
        .some((s) => s.exitCode !== undefined && !s.reason?.startsWith('Voraussetzung')),
      'Nach Fehler wurde nicht weiter geprüft'
    );
    observations.push({ probe: probe.name, passed: true, result: first.file });
    if (index === 0) {
      const second = run(root);
      requireTrue(second.code === 1, 'Zweiter roter Lauf fehlt');
      const third = run(root);
      requireTrue(
        third.code === 2 && third.result.refused === 'anhalten, beheben, melden',
        'Dritter roter Lauf wurde nicht verweigert'
      );
      observations.push({
        probe: 'Zwei rote Läufe, dritter gesperrt',
        passed: true,
        result: third.file,
      });
    }
    if (index === 1) {
      const second = run(root, '--voll');
      requireTrue(
        second.code === 2 && /Zweiter Vollauf/.test(second.result.refused),
        'Doppelter Vollauf wurde nicht verweigert'
      );
      observations.push({
        probe: 'Vollauf nur einmal je SHA',
        passed: true,
        result: second.file,
      });
    }
  }
  const timed = copy('zeit');
  const f = path.join(timed, 'tools/interne-pruefer/abdeckung.json');
  const c = JSON.parse(fs.readFileSync(f));
  c.limits.geaendert = 12;
  const t = c.tasks.find((t) => !t.omitted && t.kind !== 'artifact');
  t.command = 'sleep 30';
  t.always = true;
  fs.writeFileSync(f, JSON.stringify(c, null, 2) + '\n');
  commit(timed, 'T1302 einmalige Zeitprobe');
  const r = run(timed);
  requireTrue(
    r.result.timeout && r.code !== 0 && r.result.durationSeconds <= 12,
    'Zeitdeckel nicht eingehalten'
  );
  const remaining = execFileSync(
    'docker',
    ['ps', '-q', '--filter', `label=herowerk.lauf=${r.result.runId}`],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        DOCKER_HOST: 'unix:///Users/benjaminbendler/.colima/default/docker.sock',
      },
    }
  ).trim();
  requireTrue(!remaining, 'Container nach Zeitabbruch noch aktiv');
  for (const pgid of r.result.stoppedGroups || []) {
    let alive = false;
    try {
      process.kill(-pgid, 0);
      alive = true;
    } catch (e) {
      if (e.code !== 'ESRCH') throw e;
    }
    requireTrue(!alive, 'Erfasste Prozessgruppe nach Zeitabbruch noch aktiv');
  }
  observations.push({
    probe: 'Zeitdeckel und Containerabbruch',
    passed: true,
    result: r.file,
  });
  const lock = path.join(STATE, 'sperre');
  const lockFd = fs.openSync(lock, 'wx', 0o600);
  fs.writeSync(lockFd, JSON.stringify({ pid: process.pid, purpose: 'T1302 Sperrprobe' }));
  try {
    const r = run(timed);
    requireTrue(
      r.code === 2 && /läuft bereits/.test(r.result.refused),
      'Sperre wartet oder lässt zweiten Lauf durch'
    );
    observations.push({
      probe: 'Rechnerweite Sperre ohne Warten',
      passed: true,
      result: r.file,
    });
  } finally {
    fs.closeSync(lockFd);
    fs.unlinkSync(lock);
  }
  fs.writeFileSync(
    path.join(home, 'ergebnis.json'),
    JSON.stringify({ passed: true, observations }, null, 2) + '\n'
  );
  console.log(JSON.stringify({ passed: true, observations }, null, 2));
} catch (e) {
  fs.writeFileSync(
    path.join(home, 'ergebnis.json'),
    JSON.stringify({ passed: false, error: e.message, observations }, null, 2) + '\n'
  );
  console.error(e.message);
  process.exitCode = 1;
} finally {
  fs.rmSync(parent, { recursive: true, force: true });
}
