#!/usr/bin/env node
// T1302 gemeinsamer Kern. Änderungen stets bytegleich in alle fünf Ablagen übernehmen.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';

export const VERSION = 'T1302.1';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const STATE = '/Users/benjaminbendler/.herowerk-pruefung';
const SOCKET = 'unix:///Users/benjaminbendler/.colima/default/docker.sock';
const hash = (value) =>
  crypto
    .createHash('sha256')
    .update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value))
    .digest('hex');
const git = (...args) =>
  execFileSync('git', ['-C', ROOT, ...args], {
    encoding: 'utf8',
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
    maxBuffer: 32 * 1024 * 1024,
  }).trim();
const redact = (value) =>
  String(value)
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]+|AKIA[A-Z0-9]{16})\b/g, '[ENTFERNT]')
    .replace(
      /((?:password|token|secret|schluessel|authorization)\s*[=:]\s*)[^\s,;]+/gi,
      '$1[ENTFERNT]'
    );
const save = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(tmp, file);
};
const read = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return fallback;
    throw e;
  }
};

// Nur Struktur lesen. Keine Workflowbefehle werden aus ungeprüftem YAML ausgeführt.
const YAML_READER = `import json,pathlib,yaml,sys
root=pathlib.Path(sys.argv[1]); result=[]
for p in sorted((root/'.github/workflows').glob('*')):
 if p.suffix not in ['.yml','.yaml']: continue
 d=yaml.safe_load(p.read_text()) or {}; on=d.get('on',d.get(True,{}))
 active=('pull_request' in on) if isinstance(on,(dict,list)) else on=='pull_request'
 if not active: continue
 for name,job in (d.get('jobs') or {}).items():
  context={k:job[k] for k in ['env','strategy','services','if','defaults','container'] if k in job}
  context['workflow_env']=d.get('env',{})
  for i,s in enumerate(job.get('steps',[]),1):
   result.append({'id':p.name+':'+name+':'+str(i),'step':s,'context':context})
print(json.dumps(result,sort_keys=True,separators=(',',':')))
`;
export function workflowInventory(root = ROOT) {
  return JSON.parse(
    execFileSync('python3', ['-B', '-c', YAML_READER, root], {
      encoding: 'utf8',
      timeout: 30000,
      maxBuffer: 16 * 1024 * 1024,
    })
  );
}
const canonical = (value) =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((k) => [k, canonical(value[k])])
        )
      : value;
export const sourceHash = (item) => hash(canonical({ step: item.step, context: item.context }));
export function checkCoverage(config, inventory) {
  const errors = [];
  const ids = new Set();
  for (const item of inventory) {
    if (ids.has(item.id)) errors.push(`Doppelter Quellschritt ${item.id}`);
    ids.add(item.id);
    const entry = config.coverage[item.id];
    if (!entry) {
      errors.push(`Ohne Zuordnung: ${item.id}`);
      continue;
    }
    if (entry.hash !== sourceHash(item)) errors.push(`Veraltete Zuordnung: ${item.id}`);
    if (!entry.reason || (!entry.tasks?.length && !entry.omitted))
      errors.push(`Unvollständige Zuordnung: ${item.id}`);
    for (const id of entry.tasks || []) {
      const task = config.tasks.find((t) => t.id === id);
      if (!task || !task.sources?.includes(item.id))
        errors.push(`Fehlender oder nicht erreichbarer lokaler Befehl: ${id}`);
    }
  }
  return errors; // Entfernte/manuelle Abläufe und alte Zuordnungen sperren ausdrücklich nicht.
}
function guard(file) {
  const info = read(file),
    remaining = Math.max(1, info.deadline - Date.now() - 8500);
  setTimeout(() => {
    const state = read(file),
      result = read(state.output, state.initial);
    // Eigenständiger Prozess: auch synchron blockierte Dateikopie und Git werden gestoppt.
    // Eigene Prozessgruppen werden beim Start registriert; kein Zugriff auf
    // die rechnerweite Prozesstabelle erforderlich. Detached Node-Arbeiter
    // laufen ausschließlich in den registrierten Docker-Namensräumen.
    result.stoppedGroups = state.groups || [];
    for (const pid of result.stoppedGroups) {
      try {
        process.kill(-pid, 'SIGKILL');
      } catch {}
    }
    try {
      process.kill(state.pid, 'SIGKILL');
    } catch {}
    let cleanupOkay = true;
    try {
      const found = execFileSync(
        'docker',
        ['ps', '-aq', '--filter', `label=herowerk.lauf=${state.runId}`],
        {
          env: { ...process.env, DOCKER_HOST: SOCKET },
          encoding: 'utf8',
          timeout: 1500,
        }
      )
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      const names = [...new Set([...state.containers, ...found])];
      if (names.length)
        execFileSync('docker', ['rm', '-f', ...names], {
          env: { ...process.env, DOCKER_HOST: SOCKET },
          timeout: 4500,
          stdio: 'ignore',
        });
    } catch {
      /* Ergebnis wird anschließend gegen den tatsächlichen Prozessbestand geprüft. */
    }
    try {
      const running = execFileSync('docker', ['ps', '--format', '{{json .}}'], {
        env: { ...process.env, DOCKER_HOST: SOCKET },
        encoding: 'utf8',
        timeout: 1000,
      })
        .trim()
        .split('\n')
        .filter(Boolean)
        .map(JSON.parse);
      cleanupOkay = !running.some(
        (c) =>
          state.containers.includes(c.Names) || c.Labels?.includes(`herowerk.lauf=${state.runId}`)
      );
    } catch {
      cleanupOkay = false;
    }
    result.status = 'rot';
    result.timeout = true;
    result.complete = false;
    result.cleanupOkay = cleanupOkay;
    result.ended = new Date().toISOString();
    result.durationSeconds = (Date.now() - state.started) / 1000;
    result.steps.push({
      id: 'zeitdeckel',
      status: 'rot',
      reason: 'Unabhängiger Wächter hat den Lauf und seine Kindprozesse beendet.',
    });
    save(state.output, result);
    if (state.reserved) {
      const counter = read(state.counterFile, { sha: state.sha, red: 0 });
      counter.red = counter.sha === state.sha ? counter.red + 1 : 1;
      counter.sha = state.sha;
      save(state.counterFile, counter);
    }
    try {
      const lock = read(path.join(STATE, 'sperre'));
      if (cleanupOkay && lock.runId === state.runId) fs.unlinkSync(path.join(STATE, 'sperre'));
    } catch {}
    process.exit(124);
  }, remaining);
}
function matches(file, glob) {
  const expr = glob
    .split('**')
    .map((part) =>
      part
        .split('*')
        .map((x) => x.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
        .join('[^/]*')
    )
    .join('.*');
  return new RegExp(`^${expr}$`).test(file);
}
export function diagnostics(text, task, root = ROOT) {
  const normalized = redact(text)
    .split(root)
    .join('<ABLAGE>')
    .replace(/\x1b\[[0-9;]*m/g, '');
  if (task.diagnostics === 'eslint') {
    try {
      const rows = JSON.parse(normalized.slice(normalized.indexOf('[')));
      return rows.flatMap((f) =>
        f.messages
          .filter((m) => m.severity === 2 || m.fatal)
          .map((m) => ({
            file: f.filePath.replace(/^.*?\/(?:work|out\/jobs\/[^/]+)\//, ''),
            rule: m.ruleId || 'syntax',
            message: m.message,
          }))
      );
    } catch {
      return [];
    }
  }
  if (task.diagnostics === 'tsc')
    return normalized
      .split('\n')
      .filter((l) => /error TS\d+/.test(l))
      .map((l) => ({
        file: l.split('(')[0],
        rule: l.match(/TS\d+/)[0],
        message: l.replace(/^.*error (TS\d+): /, ''),
      }));
  if (task.diagnostics === 'prettier')
    return normalized
      .split('\n')
      .filter((l) => /^\[warn\] /.test(l) && !/Code style|Formatting|Ignored unknown/.test(l))
      .map((l) => ({
        file: l.slice(7).trim(),
        rule: 'prettier',
        message: 'Format weicht ab',
      }));
  return []; // Unstrukturierte Abstürze werden niemals als Altlast freigestellt.
}
export function removedBaselineEntries(entries, steps, observed) {
  const measured = new Set(
    steps.filter((s) => s.exitCode === 0 || s.structuredFailure).map((s) => s.id)
  );
  const present = new Set(observed.map((e) => e.fingerprint));
  return entries.filter((e) => measured.has(e.task) && !present.has(e.fingerprint));
}
function jsonDiagnostics(task, dir, sourceRoot) {
  if (!['gitleaks', 'lhci'].includes(task.diagnostics)) return null;
  try {
    const entries = [];
    for (const report of task.diagnosticReports) {
      const rows = JSON.parse(fs.readFileSync(path.join(dir, report.file), 'utf8')) || [];
      if (!Array.isArray(rows)) return null;
      for (const finding of rows) {
        if (task.diagnostics === 'gitleaks') {
          const file = path.resolve(sourceRoot, finding.File);
          if (!file.startsWith(sourceRoot + path.sep)) return null;
          const content =
            report.scope === 'git'
              ? /^[a-f0-9]{40}$/.test(finding.Commit || '')
                ? execFileSync(
                    'git',
                    ['-C', sourceRoot, 'show', finding.Commit + ':' + finding.File],
                    { encoding: 'utf8', timeout: 2000, maxBuffer: 16 * 1024 * 1024 }
                  )
                : null
              : fs.readFileSync(file, 'utf8');
          if (content === null) return null;
          const line = content
            .split('\n')
            .slice(finding.StartLine - 1, finding.EndLine)
            .join('\n');
          entries.push({
            file: finding.File,
            rule: report.scope + ':' + finding.RuleID,
            message: 'Geheimnisverdacht; Fundstelleninhalt SHA-256 ' + hash(line),
          });
        } else if (finding.level === 'error' && !finding.passed) {
          entries.push({
            file: finding.url || '/',
            rule: finding.name || finding.auditId,
            message: JSON.stringify({
              expected: finding.expected,
              actual: finding.actual,
              operator: finding.operator,
            }),
          });
        }
      }
    }
    return entries;
  } catch {
    return null;
  }
}
function storeBaseline(config, result, dir, sourceRoot, existing) {
  const eligible = new Set(),
    observed = [],
    unresolved = [];
  for (const task of config.tasks) {
    const step = result.steps.find((s) => s.id === task.id);
    if (!step || step.status === 'entfallen') continue;
    const parsed = jsonDiagnostics(task, dir, sourceRoot);
    const log = path.join(dir, hash(task.id).slice(0, 16) + '.log');
    const fatal =
      fs.existsSync(log) &&
      /FTL|FATAL|TARGET_CRASHED|Runtime error encountered/.test(fs.readFileSync(log, 'utf8'));
    if (parsed && step.exitCode === 1 && parsed.length && !fatal) {
      eligible.add(task.id);
      observed.push(...fingerprints(parsed, task.id));
    } else if (step.exitCode === 0 || step.structuredFailure) {
      eligible.add(task.id);
      observed.push(...(step.diagnostics || []));
    } else {
      const reason = step.reason || 'Kein vollständig strukturierter Befund; keine Freistellung';
      unresolved.push({
        task: task.id,
        file: task.sourceFile || '.github/workflows/' + task.id.split(':')[0],
        rule: 'nicht freigestellter Prüfabbruch',
        message: reason,
        fingerprint: hash({ task: task.id, reason }),
      });
    }
  }
  const entries = [...existing.entries.filter((e) => !eligible.has(e.task)), ...observed];
  save(path.join(HERE, 'bestand.json'), {
    version: VERSION,
    sha: result.mainSha,
    generated: new Date().toISOString(),
    sourceResult: path.join(dir, 'ergebnis.json'),
    entries,
    unresolved,
  });
  return unresolved;
}
function adoptBaseline(file) {
  const real = fs.realpathSync(file);
  const config = read(path.join(HERE, 'abdeckung.json'));
  if (!real.startsWith(path.join(STATE, config.repository, 'laeufe') + path.sep))
    throw new Error('Ergebnis muss aus dem rechnerweiten Prüfordner stammen');
  const result = read(real),
    source = path.join(path.dirname(real), 'arbeit'),
    inventory = workflowInventory(),
    active = new Set(inventory.map((item) => item.id));
  if (
    !result.complete ||
    !(result.mode === 'voll' || result.baselineWritten) ||
    result.configurationHash !== hash(canonical(config)) ||
    result.inventoryHash !== hash(canonical(inventory)) ||
    checkCoverage(config, inventory).length ||
    config.tasks.some(
      (task) =>
        !task.omitted &&
        task.sources?.some((id) => active.has(id)) &&
        !result.steps.some((step) => step.id === task.id && Number.isInteger(step.exitCode))
    ) ||
    result.timeout ||
    result.aborted ||
    result.sha !== result.mainSha ||
    result.mainSha !== git('rev-parse', 'origin/main')
  )
    throw new Error('Nur vollständig beendete Erhebung am dokumentierten Hauptstand übernehmen');
  const runGit = (...args) =>
    execFileSync('git', ['-C', source, ...args], { encoding: 'utf8', timeout: 2000 }).trim();
  if (runGit('rev-parse', 'HEAD') !== result.mainSha || runGit('status', '--porcelain'))
    throw new Error('Unveränderter Hauptstand der Wegwerf-Kopie nicht bestätigt');
  const lock = path.join(STATE, 'sperre'),
    fd = fs.openSync(lock, 'wx', 0o600);
  try {
    const unresolved = storeBaseline(
      config,
      result,
      path.dirname(real),
      source,
      read(path.join(HERE, 'bestand.json'), { entries: [] })
    );
    const audit = path.join(STATE, config.repository, 'bestand-uebernahme-' + Date.now() + '.json');
    save(audit, {
      source: real,
      sha: result.mainSha,
      unresolved,
      checkedAt: new Date().toISOString(),
    });
    console.log(
      'Bestandsliste ausdrücklich aus vorhandener Hauptstandmessung übernommen; offene Schritte: ' +
        unresolved.length
    );
  } finally {
    fs.closeSync(fd);
    fs.unlinkSync(lock);
  }
}
function fingerprints(items, taskId) {
  const counts = new Map();
  return items.map((d) => {
    const key = hash({ task: taskId, ...d });
    const occurrence = (counts.get(key) || 0) + 1;
    counts.set(key, occurrence);
    return {
      ...d,
      task: taskId,
      occurrence,
      fingerprint: hash({ key, occurrence }),
    };
  });
}

export async function main(args = process.argv.slice(2)) {
  if (args.length === 3 && args[0] === '--bestand-neu' && args[1] === '--ergebnis')
    return adoptBaseline(args[2]);
  const allowed = ['--geaendert', '--voll', '--bestand-neu'];
  if (
    args.some((a) => !allowed.includes(a)) ||
    args.includes('--voll') === args.includes('--geaendert')
  )
    throw new Error(
      'Aufruf: node tools/interne-pruefer/pruefe.mjs --geaendert|--voll [--bestand-neu]'
    );
  const config = read(path.join(HERE, 'abdeckung.json'));
  const mode = args.includes('--voll') ? 'voll' : 'geaendert';
  const baselineWrite = args.includes('--bestand-neu');
  const sha = git('rev-parse', 'HEAD'),
    branch = git('branch', '--show-current');
  const mainSha = git('rev-parse', 'origin/main');
  const dirty = git('status', '--porcelain', '--untracked-files=all');
  const repo = config.repository;
  const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`;
  const dir = path.join(STATE, repo, 'laeufe', runId);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const output = path.join(dir, 'ergebnis.json');
  const started = Date.now(),
    budget = config.limits[mode] * 1000;
  const deadline = started + budget;
  const result = {
    version: VERSION,
    kernelSha256: hash(fs.readFileSync(fileURLToPath(import.meta.url))),
    repository: repo,
    configurationHash: hash(canonical(config)),
    baselineWritten: baselineWrite,
    runId,
    pid: process.pid,
    sha,
    mainSha,
    branch,
    mode,
    started: new Date(started).toISOString(),
    budgetSeconds: config.limits[mode],
    dirty: Boolean(dirty),
    steps: [],
    status: 'rot',
    complete: false,
  };
  const record = (entry) => {
    result.steps.push(entry);
    save(output, result);
    console.log(`${entry.status}: ${entry.id}${entry.reason ? ': ' + entry.reason : ''}`);
  };
  const refuse = (message) => {
    result.refused = message;
    result.ended = new Date().toISOString();
    save(output, result);
    console.error(message);
    process.exitCode = 2;
  };
  const lock = path.join(STATE, 'sperre');
  let fd;
  try {
    fd = fs.openSync(lock, 'wx', 0o600);
    fs.writeSync(fd, JSON.stringify({ pid: process.pid, repo, sha, runId, started }));
  } catch (e) {
    if (e.code === 'EEXIST') {
      refuse(
        'Ein Prüflauf läuft bereits. Keine Wartezeit. Verwaiste Sperre nur nach Prüfung der Prozesse entfernen.'
      );
      return;
    }
    throw e;
  }
  const counterFile = path.join(STATE, repo, 'rot', hash(branch) + '.json');
  let counter = read(counterFile, { sha, red: 0 });
  const containers = new Set(),
    children = new Set();
  const network = `hw-pruef-${process.pid}-${Date.now()}`;
  let networkCreated = false,
    timeout = false,
    abort = false,
    reserved = false;
  const dockerEnv = {
    ...process.env,
    DOCKER_HOST: SOCKET,
    DOCKER_CLIENT_TIMEOUT: '10',
    DOCKER_BUILDKIT: '0',
  };
  const killAll = () => {
    for (const child of children) {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {}
    }
    try {
      const intermediate = execFileSync(
        'docker',
        ['ps', '-aq', '--filter', `label=herowerk.lauf=${runId}`],
        { env: dockerEnv, encoding: 'utf8', timeout: 1000 }
      )
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      const names = [...new Set([...containers, ...intermediate])];
      if (names.length)
        execFileSync('docker', ['rm', '-f', ...names], {
          env: dockerEnv,
          timeout: 5000,
          stdio: 'ignore',
        });
    } catch {}
    try {
      const running = execFileSync('docker', ['ps', '--format', '{{json .}}'], {
        env: dockerEnv,
        encoding: 'utf8',
        timeout: 1000,
      })
        .trim()
        .split('\n')
        .filter(Boolean)
        .map(JSON.parse);
      return !running.some(
        (c) => containers.has(c.Names) || c.Labels?.includes(`herowerk.lauf=${runId}`)
      );
    } catch {
      return false;
    }
  };
  const onSignal = () => {
    abort = true;
    killAll();
  };
  const guardFile = path.join(dir, 'waechter.json');
  const guardState = {
    pid: process.pid,
    deadline,
    started,
    output,
    initial: result,
    containers: [],
    groups: [],
    runId,
    counterFile,
    sha,
    reserved: false,
  };
  save(output, result);
  save(guardFile, guardState);
  const watchdog = spawn(
    process.execPath,
    [fileURLToPath(import.meta.url), '--waechter', guardFile],
    { detached: true, stdio: 'ignore' }
  );
  const register = (name) => {
    containers.add(name);
    guardState.containers = [...containers];
    save(guardFile, guardState);
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);
  async function command(cmd, argv, options = {}) {
    if (abort || Date.now() >= deadline - 10000) {
      timeout = true;
      abort = true;
      return { code: 124, stdout: '', stderr: 'Zeitdeckel erreicht' };
    }
    return await new Promise((resolve) => {
      let stdout = '',
        stderr = '',
        closed = false;
      const child = spawn(cmd, argv, {
        cwd: options.cwd || ROOT,
        env: options.env || process.env,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      children.add(child);
      guardState.groups = [...children].map((c) => c.pid);
      save(guardFile, guardState);
      // Der unabhängige Wächter beendet den vollständigen noch zusammenhängenden
      // Prozessbaum. Ein früher getöteter Elternprozess könnte Enkel verwaisen lassen.
      const timer = options.timeout ? setTimeout(onSignal, options.timeout) : null;
      child.stdout.on('data', (d) => {
        stdout += d;
        if (stdout.length > 16 * 1024 * 1024) {
          stderr += '\nAusgabegrenze überschritten';
          try {
            process.kill(-child.pid, 'SIGKILL');
          } catch {}
        }
      });
      child.stderr.on('data', (d) => {
        if (stderr.length < 16 * 1024 * 1024) stderr += d;
      });
      const finish = (code) => {
        if (closed) return;
        closed = true;
        clearTimeout(timer);
        children.delete(child);
        guardState.groups = [...children].map((c) => c.pid);
        save(guardFile, guardState);
        resolve({ code, stdout, stderr });
      };
      child.on('error', (e) => {
        stderr += e.message;
        finish(127);
      });
      child.on('close', (code) => finish(code ?? 137));
    });
  }
  const docker = (argv, options) => command('docker', argv, { ...options, env: dockerEnv });
  const contexts = new Map();
  let work;
  try {
    if (counter.sha !== sha) counter = { sha, red: 0 };
    if (counter.red >= 2) {
      refuse('anhalten, beheben, melden');
      return;
    }
    if (mode === 'voll' && dirty && !baselineWrite) {
      refuse('Vollauf verlangt einen sauberen, eingebuchten Stand.');
      return;
    }
    if (baselineWrite && sha !== mainSha) {
      refuse('Bestandsliste nur am unveränderten origin/main erheben.');
      return;
    }
    const fullFile = path.join(STATE, repo, 'voll', sha + '.json');
    if (mode === 'voll') {
      try {
        const fullFd = fs.openSync(fullFile, 'wx', 0o600);
        fs.writeSync(fullFd, JSON.stringify({ sha, runId, output }));
        fs.closeSync(fullFd);
      } catch (e) {
        if (e.code === 'ENOENT') {
          fs.mkdirSync(path.dirname(fullFile), { recursive: true });
          const fullFd = fs.openSync(fullFile, 'wx', 0o600);
          fs.writeSync(fullFd, JSON.stringify({ sha, runId, output }));
          fs.closeSync(fullFd);
        } else if (e.code === 'EEXIST') {
          refuse('Zweiter Vollauf derselben Einbuchung verweigert.');
          return;
        } else throw e;
      }
    }
    reserved = true;
    guardState.reserved = true;
    save(guardFile, guardState);
    const inventory = workflowInventory();
    result.inventoryHash = hash(canonical(inventory));
    const coverageErrors = checkCoverage(config, inventory);
    record({
      id: 'abdeckung',
      status: coverageErrors.length ? 'rot' : 'grün',
      errors: coverageErrors,
    });
    if (coverageErrors.length) return;
    const active = new Set(inventory.map((i) => i.id));
    const base = git('merge-base', 'origin/main', 'HEAD');
    const changed = [
      ...new Set(
        (
          git('diff', '--name-only', '--no-renames', base) +
          '\n' +
          git('ls-files', '--others', '--exclude-standard')
        )
          .split('\n')
          .filter(Boolean)
      ),
    ];
    result.base = base;
    result.changedPaths = changed;
    result.workingTreeFingerprint = hash(
      git('diff', '--binary', 'HEAD') +
        changed
          .filter(
            (f) => fs.existsSync(path.join(ROOT, f)) && fs.statSync(path.join(ROOT, f)).isFile()
          )
          .map((f) => hash(fs.readFileSync(path.join(ROOT, f))))
          .join('')
    );
    const oldBaseline = read(path.join(HERE, 'bestand.json'), { entries: [] });
    const observed = [];
    work = path.join(dir, 'arbeit');
    const clone = await command('git', ['clone', '--no-hardlinks', '--quiet', ROOT, work]);
    if (clone.code) throw new Error('Lokale Wegwerf-Kopie konnte nicht erzeugt werden');
    await command('git', ['-C', work, 'update-ref', 'refs/remotes/origin/main', mainSha]);
    // Arbeitsbaum und neue Prüferdaten übernehmen, ohne Geheimnisdateien oder fremde Caches.
    const files = git('ls-files', '--cached', '--others', '--exclude-standard', '-z')
      .split('\0')
      .filter(Boolean);
    for (const f of baselineWrite ? [] : files) {
      if (/(?:^|\/)(?:secrets\.local\.php|\.env(?:\..*)?)$/.test(f)) continue;
      const src = path.join(ROOT, f),
        dest = path.join(work, f);
      if (!fs.existsSync(src)) {
        fs.rmSync(dest, { force: true, recursive: true });
        continue;
      }
      if (!fs.lstatSync(src).isFile()) continue;
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
      fs.chmodSync(dest, fs.statSync(src).mode);
    }
    if (!baselineWrite) {
      for (const f of git('diff', '--name-only', '--no-renames', '--diff-filter=D', 'HEAD')
        .split('\n')
        .filter(Boolean)) {
        fs.rmSync(path.join(work, f), { recursive: true, force: true });
      }
      const scratchDirty = await command('git', ['-C', work, 'status', '--porcelain']);
      if (scratchDirty.stdout.trim()) {
        const add = await command('git', ['-C', work, 'add', '--all']);
        const commit = await command('git', [
          '-C',
          work,
          '-c',
          'user.name=HeroWerk Prüfstand',
          '-c',
          'user.email=pruefung@localhost',
          '-c',
          'commit.gpgsign=false',
          '-c',
          'core.hooksPath=/dev/null',
          'commit',
          '--quiet',
          '-m',
          'T1302 lokaler Prüfstand des Arbeitsbaums',
        ]);
        if (add.code || commit.code)
          throw new Error('Arbeitsbaum konnte nicht als lokaler Prüfstand fixiert werden');
      }
      const scratch = await command('git', ['-C', work, 'rev-parse', 'HEAD']);
      result.scratchSha = scratch.stdout.trim();
    }
    const buildInputs = Object.fromEntries(
      (config.environment.buildInputs || []).map((file) => [
        file,
        hash(fs.readFileSync(path.join(work, file))),
      ])
    );
    const imageName = `herowerk-pruefung-${repo}:${hash(Object.keys(buildInputs).length ? { environment: config.environment, buildInputs } : config.environment).slice(0, 16)}`;
    result.buildInputs = buildInputs;
    const expand = (value) =>
      String(value)
        .replaceAll('@WORK@', work)
        .replaceAll('@OUT@', dir)
        .replaceAll('@SHA@', sha)
        .replaceAll('@RUN@', network)
        .replaceAll('@IMAGE@', imageName);
    for (const edit of config.prepare || []) {
      const file = path.join(work, edit.file),
        before = fs.readFileSync(file, 'utf8');
      if (!before.includes(edit.from)) throw new Error('Vorbereitungsstelle fehlt: ' + edit.file);
      fs.writeFileSync(file, before.replaceAll(edit.from, expand(edit.to)));
    }
    const imageExists = await docker(['image', 'inspect', imageName]);
    if (imageExists.code) {
      const dockerfile = path.join(dir, 'Dockerfile');
      fs.writeFileSync(
        dockerfile,
        config.environment.dockerfile.replace(/^(FROM .+)$/gm, `$1\nLABEL herowerk.lauf="${runId}"`)
      );
      const build = await docker([
        'build',
        '--pull=false',
        '--force-rm',
        '--label',
        'herowerk.pruefung=1',
        '-f',
        dockerfile,
        '-t',
        imageName,
        work,
      ]);
      fs.writeFileSync(path.join(dir, 'einrichtung.log'), redact(build.stdout + build.stderr));
      record({
        id: 'pruefumgebung',
        status: build.code ? 'rot' : 'grün',
        exitCode: build.code,
      });
      if (build.code) return;
    }
    result.image = imageName;
    const versionName = `${network}-versionen`;
    register(versionName);
    const versions = await docker([
      'run',
      '--rm',
      '--name',
      versionName,
      '--label',
      `herowerk.lauf=${runId}`,
      '--network',
      'none',
      imageName,
      'sh',
      '-c',
      config.environment.versions,
    ]);
    record({
      id: 'versionen',
      status: versions.code ? 'rot' : 'grün',
      versions: redact(versions.stdout),
      exitCode: versions.code,
    });
    if (versions.code) return;
    const tasks = config.tasks.filter((t) => (t.sources || []).some((s) => active.has(s)));
    const chosen = tasks.filter(
      (t) =>
        baselineWrite ||
        mode === 'voll' ||
        t.always ||
        changed.some((f) => (t.paths || ['**']).some((g) => matches(f, g))) ||
        changed.some((f) => f.startsWith('tools/interne-pruefer/') || f === 'package-lock.json')
    );
    const chosenIds = new Set(chosen.map((t) => t.id));
    let grew = true;
    while (grew) {
      grew = false;
      for (const t of tasks)
        if (chosenIds.has(t.id))
          for (const d of t.needs || [])
            if (!chosenIds.has(d)) {
              chosenIds.add(d);
              grew = true;
            }
    }
    const done = new Map();
    for (const task of tasks) {
      if (!chosenIds.has(task.id)) {
        record({
          id: task.id,
          status: 'entfallen',
          reason: 'Keine zugeordnete Änderung',
        });
        continue;
      }
      if (task.fullOnly && mode !== 'voll') {
        record({
          id: task.id,
          status: 'entfallen',
          reason: 'Live-Bericht ausschließlich im Vollauf',
        });
        done.set(task.id, true);
        continue;
      }
      if (task.omitted) {
        record({ id: task.id, status: 'entfallen', reason: task.reason });
        done.set(task.id, true);
        continue;
      }
      if (abort) {
        record({
          id: task.id,
          status: 'rot',
          reason: 'Zeitdeckel oder Abbruch',
          reportOnly: task.reportOnly,
        });
        continue;
      }
      const blocked = (task.needs || []).filter((d) => done.get(d) !== true);
      if (blocked.length) {
        record({
          id: task.id,
          status: 'rot',
          reason: 'Voraussetzung fehlgeschlagen: ' + blocked.join(', '),
          reportOnly: task.reportOnly,
        });
        done.set(task.id, false);
        continue;
      }
      const begin = Date.now();
      let execution;
      if (task.kind === 'artifact') {
        let found = 0;
        for (const f of task.pathsToSave || []) {
          const src = path.join(work, f);
          if (fs.existsSync(src)) {
            fs.cpSync(src, path.join(dir, 'artefakte', f), { recursive: true });
            found++;
          }
        }
        execution = {
          code: !found && task.missingIsError ? 1 : 0,
          stdout: `${found} Artefaktpfade gesichert`,
          stderr: '',
        };
      } else if (task.kind === 'host') {
        for (const name of task.containers || []) register(expand(name));
        execution = await command('bash', ['-o', 'pipefail', '-c', expand(task.command)], {
          cwd: work,
          env: {
            ...process.env,
            DOCKER_HOST: SOCKET,
            GITHUB_SHA: sha,
            GITHUB_ENV: path.join(dir, 'umgebung'),
            HW_OUTPUT: dir,
            HW_RUN_ID: runId,
          },
        });
      } else {
        const context = task.context || 'standard';
        if (!contexts.has(context)) {
          const name = `${network}-${hash(context).slice(0, 8)}`;
          register(name);
          const envArgs = Object.entries({
            CI: '1',
            PYTHONDONTWRITEBYTECODE: '1',
            PLAYWRIGHT_HTML_OPEN: 'never',
            GITHUB_ENV: '/out/umgebung',
            GITHUB_SHA: sha,
            ...config.environment.env,
            ...task.env,
          }).flatMap(([k, v]) => ['-e', `${k}=${expand(v)}`]);
          const launch = await docker([
            'run',
            '-d',
            '--init',
            '--name',
            name,
            '--label',
            `herowerk.lauf=${runId}`,
            '--network',
            task.network || (task.live ? 'bridge' : 'none'),
            '-v',
            `${work}:/work`,
            '-v',
            `${dir}:/out`,
            '-w',
            '/work',
            ...(config.environment.user === 'host'
              ? ['--user', `${process.getuid()}:${process.getgid()}`]
              : []),
            ...envArgs,
            imageName,
            'sleep',
            'infinity',
          ]);
          contexts.set(context, { name, okay: launch.code === 0 });
        }
        const ctx = contexts.get(context);
        const envArgs = Object.entries(task.env || {}).flatMap(([k, v]) => [
          '-e',
          `${k}=${expand(v)}`,
        ]);
        execution = ctx.okay
          ? await docker([
              'exec',
              ...envArgs,
              ctx.name,
              'bash',
              '-o',
              'pipefail',
              '-c',
              'set -a; if [ -f /out/umgebung ]; then . /out/umgebung; fi; set +a; ' +
                expand(task.command),
            ])
          : {
              code: 125,
              stdout: '',
              stderr: 'Prüfcontainer konnte nicht starten',
            };
      }
      const text = execution.stdout + execution.stderr;
      fs.writeFileSync(path.join(dir, hash(task.id).slice(0, 16) + '.log'), redact(text), {
        mode: 0o600,
      });
      const jsonFound = jsonDiagnostics(task, dir, baselineWrite ? work : ROOT);
      const found = fingerprints(jsonFound || diagnostics(text, task), task.id);
      observed.push(...found);
      const old = new Set(oldBaseline.entries.map((e) => e.fingerprint));
      const expectedCode = { eslint: 1, prettier: 1, tsc: 2, gitleaks: 1, lhci: 1 }[
        task.diagnostics
      ];
      const parseable = (() => {
        if (jsonFound !== null)
          return !/FTL|FATAL|TARGET_CRASHED|Runtime error encountered/.test(text);
        if (task.diagnostics === 'eslint') {
          try {
            const rows = JSON.parse(execution.stdout);
            return Array.isArray(rows) && !execution.stderr.trim();
          } catch {
            return false;
          }
        }
        if (task.diagnostics === 'tsc') {
          let seen = false;
          return (
            !execution.stderr.trim() &&
            execution.stdout.split('\n').every((l) => {
              if (!l.trim()) return true;
              if (/error TS\d+:/.test(l)) {
                seen = true;
                return true;
              }
              return seen && /^ {2,}\S/.test(l);
            })
          );
        }
        if (task.diagnostics === 'prettier') {
          const known = new Set(found.map((d) => '[warn] ' + d.file));
          return (
            found.every((d) => fs.existsSync(path.join(work, d.file))) &&
            text
              .split('\n')
              .every(
                (l) =>
                  !l.trim() ||
                  l === 'Checking formatting...' ||
                  /^\[warn\] Code style issues found in .*Run Prettier with --write to fix\.$/.test(
                    l
                  ) ||
                  known.has(l)
              )
          );
        }
        return false;
      })();
      const allKnown =
        execution.code === expectedCode &&
        parseable &&
        found.length > 0 &&
        found.every((e) => old.has(e.fingerprint));
      const status = execution.code === 0 ? 'grün' : allKnown ? 'Altlast' : 'rot';
      record({
        id: task.id,
        status,
        exitCode: execution.code,
        structuredFailure: execution.code === expectedCode && parseable && found.length > 0,
        durationSeconds: (Date.now() - begin) / 1000,
        reportOnly: Boolean(task.reportOnly),
        diagnostics: found,
        reason:
          execution.code && !found.length
            ? 'Fehler ohne freigestellten strukturierten Fingerabdruck'
            : undefined,
      });
      done.set(task.id, execution.code === 0 || allKnown);
    }
    result.removedBaseline = removedBaselineEntries(oldBaseline.entries, result.steps, observed);
    if (baselineWrite && !abort) {
      result.baselineUnresolved = storeBaseline(config, result, dir, work, oldBaseline);
      result.baselineWritten = true;
      if (result.baselineUnresolved.length)
        record({
          id: 'bestand',
          status: 'rot',
          reason:
            'Strukturierte Einzelbefunde übernommen; offene Schritte bleiben rot und werden nicht freigestellt.',
        });
    } else if (baselineWrite)
      record({
        id: 'bestand',
        status: 'rot',
        reason: 'Abgebrochene Erhebung; Liste bleibt unverändert.',
      });
    result.complete = !abort;
  } catch (error) {
    record({ id: 'laeufer', status: 'rot', reason: redact(error.message) });
  } finally {
    const cleanupOkay = killAll();
    result.cleanupOkay = cleanupOkay;
    if (!cleanupOkay)
      record({
        id: 'bereinigung',
        status: 'rot',
        reason:
          'Containerbereinigung nicht bestätigt. Rechnerweite Sperre bleibt bestehen; Prozesse prüfen und melden.',
      });
    if (networkCreated) await docker(['network', 'rm', network]);
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);
    if (!result.refused) {
      result.timeout = timeout;
      result.aborted = abort;
      result.status =
        timeout ||
        abort ||
        !result.complete ||
        result.steps.some((s) => s.status === 'rot' && !s.reportOnly)
          ? 'rot'
          : 'grün';
      result.ended = new Date().toISOString();
      result.durationSeconds = (Date.now() - started) / 1000;
      if (reserved && result.status === 'rot') {
        counter.red++;
        save(counterFile, counter);
      }
      save(output, result);
      console.log(`Ergebnis ${result.status}; ${result.durationSeconds.toFixed(2)} s; ${output}`);
      process.exitCode = result.status === 'grün' ? 0 : 1;
    }
    fs.closeSync(fd);
    if (cleanupOkay) fs.unlinkSync(lock);
    try {
      watchdog.kill('SIGKILL');
    } catch {}
  }
}
if (process.argv[2] === '--waechter') guard(process.argv[3]);
else if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch((e) => {
    console.error(redact(e.message));
    process.exitCode = 2;
  });
