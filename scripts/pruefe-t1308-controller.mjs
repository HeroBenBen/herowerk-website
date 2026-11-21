import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { checkHeaders, readHeaders, compareHeaders } from '../tests/t1308-headers.mjs';
import { browserCheck } from '../tests/t1308-browser.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspace = path.dirname(root);
const portal = path.join(workspace, 'portal');
if (!process.argv.includes('--freigegeben')) {
  throw new Error('Prüflauf gesperrt: Erst nach ausdrücklicher Freigabe --freigegeben angeben.');
}
const lock = path.join(workspace, 'belege', '.t1308-controller-lock');
fs.mkdirSync(path.dirname(lock), { recursive: true });
try {
  fs.mkdirSync(lock);
} catch {
  throw new Error(
    'Ein Controller-Lauf ist bereits aktiv oder wurde unterbrochen. Sperre vor einem Neustart prüfen.'
  );
}
fs.writeFileSync(
  path.join(lock, 'owner.json'),
  JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }) + '\n'
);
let interrupted = false;
const cancellation = new AbortController();
let activeChild;
const childOwners = new Set();
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    interrupted = true;
    cancellation.abort();
    activeChild?.kill('SIGTERM');
  });
const out = path.join(
  workspace,
  'belege',
  'controller-' + new Date().toISOString().replace(/[:.]/g, '-')
);
fs.mkdirSync(out, { recursive: true });
const report = {
  startedAt: new Date().toISOString(),
  out,
  steps: [],
  failures: [],
  commits: {},
  manifests: {},
};
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 't1308-controller-'));
const containers = [];
const docker = (...args) =>
  execFileSync('docker', args, { encoding: 'utf8', maxBuffer: 16e6 }).trim();
async function step(name, fn) {
  if (interrupted) throw new Error('Prüflauf von außen angehalten; keine weitere Phase gestartet.');
  const row = { name, startedAt: new Date().toISOString() };
  report.steps.push(row);
  try {
    await fn();
    row.exit = 0;
  } catch (error) {
    row.exit = 1;
    row.error = error.stack;
    report.failures.push(name);
  }
  row.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`${name}: ${row.exit === 0 ? 'grün' : 'ROT'}`);
}
async function command(name, cwd, argv, env = {}) {
  report.steps.at(-1).command = argv;
  const result = await new Promise((resolve, reject) => {
    const child = spawn(argv[0], argv.slice(1), {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    activeChild = child;
    childOwners.add(child.pid);
    let stdout = '',
      stderr = '';
    child.stdout.on('data', (data) => {
      stdout += data;
    });
    child.stderr.on('data', (data) => {
      stderr += data;
    });
    child.on('error', reject);
    child.on('close', (status, signal) => {
      activeChild = null;
      resolve({ status, signal, stdout, stderr });
    });
  });
  fs.writeFileSync(
    path.join(out, name + '.log'),
    `$ ${argv.join(' ')}\n${result.stdout}${result.stderr}`
  );
  if (result.status !== 0)
    throw new Error(`${name}: Exit ${result.status}, Signal ${result.signal || '-'}; siehe Log`);
}
function release(container) {
  docker('rm', '-f', container);
  containers.splice(containers.indexOf(container), 1);
}
async function apache(name, directory) {
  const container = `t1308-${process.pid}-${name}`;
  docker(
    'create',
    '--name',
    container,
    '--cpus',
    '1',
    '--memory',
    '768m',
    '--pids-limit',
    '128',
    '-p',
    '127.0.0.1::80',
    ...(directory === root ? ['-v', `${directory}:/usr/local/apache2/htdocs:ro`] : []),
    '-v',
    `${path.join(root, 'tests/t1308-apache.conf')}:/usr/local/apache2/conf/extra/t1308.conf:ro`,
    'httpd:2.4',
    'httpd-foreground',
    '-c',
    'Include conf/extra/t1308.conf'
  );
  containers.push(container);
  if (directory !== root) docker('cp', `${directory}/.`, `${container}:/usr/local/apache2/htdocs`);
  docker('start', container);
  const port = JSON.parse(docker('inspect', container))[0].NetworkSettings.Ports['80/tcp'][0]
    .HostPort;
  const url = `http://127.0.0.1:${port}`;
  for (let n = 0; n < 50; n++) {
    try {
      if ((await readHeaders(url, '/')).status === 200) return url;
    } catch {
      /* wartet auf lokalen Start */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Apache startet nicht: ' + docker('logs', container));
}
try {
  for (const [name, dir] of [
    ['website', root],
    ['portal', portal],
    ['bewerber', path.join(workspace, 'bewerberportal_lesend')],
  ]) {
    report.commits[name] = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: dir,
      encoding: 'utf8',
    }).trim();
    report[name + 'Status'] = execFileSync('git', ['status', '--porcelain'], {
      cwd: dir,
      encoding: 'utf8',
    }).trim();
  }
  for (const [name, file] of [
    ['public', path.join(root, 'vorschau/manifest.json')],
    ['internal', path.join(portal, 'intern/portal-demo/generated/manifest.json')],
  ])
    report.manifests[name] = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  report.node = process.version;
  report.docker = docker('version', '--format', '{{.Server.Version}}');
  for (const image of ['httpd:2.4', 'php:8.2-apache']) docker('image', 'inspect', image);
  for (const name of ['portal', 'website'])
    if (!fs.existsSync(path.join(workspace, name, 'node_modules/@playwright/test')))
      throw new Error(`${name}: installierte Prüfabhängigkeiten fehlen`);
  await step('website-regression', () =>
    command('website-regression', root, ['npm', 'run', 'verify:t1308'])
  );
  await step('oeffentliche-quellen', () =>
    command('oeffentliche-quellen', portal, ['npm', 'run', 'verify:t1308-public'])
  );
  let before, after;
  await step('apache-start', async () => {
    const baseline = path.join(temp, 'baseline');
    fs.mkdirSync(baseline);
    const archive = execFileSync('git', ['archive', '4d6b36c1b464175406383ebe758aed80035fc365'], {
      cwd: root,
      maxBuffer: 256e6,
    });
    execFileSync('tar', ['-x', '-C', baseline], { input: archive });
    before = await apache('baseline', baseline);
    after = await apache('current', root);
    fs.writeFileSync(
      path.join(out, 'apache.json'),
      JSON.stringify(
        { before, after, version: docker('exec', containers.at(-1), 'httpd', '-v') },
        null,
        2
      )
    );
  });
  if (before && after) {
    await step('apache-headers', () => checkHeaders(before, after, out));
    await step('apache-header-rotproben', async () => {
      const expected = await readHeaders(before, '/');
      release(containers.find((name) => name.endsWith('-baseline')));
      const red = path.join(temp, 'red');
      fs.mkdirSync(red);
      fs.writeFileSync(path.join(red, 'index.html'), '<!doctype html><title>Rotprobe</title>');
      const original = fs.readFileSync(path.join(root, '.htaccess'), 'utf8');
      fs.writeFileSync(path.join(red, '.htaccess'), original);
      const base = await apache('red', red);
      for (const extra of [
        '\nHeader always add Content-Security-Policy "default-src \'self\'"\n',
        "\nHeader always set Content-Security-Policy \"default-src 'self'; frame-src 'self'\"\n",
      ]) {
        fs.writeFileSync(path.join(red, '.htaccess'), original + extra);
        docker(
          'cp',
          path.join(red, '.htaccess'),
          `${containers.at(-1)}:/usr/local/apache2/htdocs/.htaccess`
        );
        const actual = await readHeaders(base, '/');
        if (actual.status !== 200) throw new Error('Ungültige Rotprobe: HTTP-Fehler');
        let rejected = false;
        try {
          compareHeaders(expected, actual, '/');
        } catch (e) {
          rejected = e.message.includes('content-security-policy');
        }
        if (!rejected) throw new Error('Kopfzeilen-Rotprobe nicht erkannt');
      }
    });
    const redContainer = containers.find((name) => name.endsWith('-red'));
    if (redContainer) release(redContainer);
    await step('chromium-normal', () =>
      browserCheck(after, path.join(out, 'browser'), false, cancellation.signal)
    );
    await step('betroffene-smoke-a11y', () =>
      command(
        'betroffene-smoke-a11y',
        root,
        [
          process.execPath,
          'node_modules/@playwright/test/cli.js',
          'test',
          'tests/smoke.spec.js',
          'tests/a11y.spec.js',
          '--grep',
          'Erklärseite|Telefon-Menue|kundenportal|bewerberportal',
          '--workers=1',
          '--reporter=list',
          '--output',
          path.join(out, 'smoke-a11y'),
        ],
        { PREVIEW_URL: after }
      )
    );
    await step('header-check', () =>
      command('header-check', root, ['node', 'scripts/header-check.js', after])
    );
  }
  for (const container of [...containers]) release(container);
  await step('interne-http-regression', () =>
    command('interne-http-regression', portal, ['npm', 'run', 'verify:t1300'], {
      T1308_LIMITED_RUN: '1',
      T1308_EVIDENCE_DIR: path.join(out, 'intern'),
      T1308_APPLICANT: path.join(workspace, 'bewerberportal_lesend'),
    })
  );
  await step('interne-browser-regression', () =>
    command('interne-browser-regression', root, [
      'node',
      'scripts/t1308-intern-browser.mjs',
      path.join(out, 'intern-browser'),
      '--freigegeben',
    ])
  );
} catch (error) {
  report.failures.push('Voraussetzung');
  report.error = error.stack;
} finally {
  for (const pid of childOwners) {
    try {
      const names = docker('ps', '-a', '--filter', `name=^/t1300-${pid}-`, '--format', '{{.Names}}')
        .split('\n')
        .filter(Boolean);
      for (const name of names) docker('rm', '-f', name);
    } catch (error) {
      report.failures.push('Unterprozess-Aufräumen');
      report.cleanupError = error.message;
    }
  }
  for (const container of containers.reverse()) {
    try {
      docker('rm', '-f', container);
    } catch (e) {
      report.failures.push('Aufräumen');
      report.cleanupError = e.message;
    }
  }
  fs.rmSync(temp, { recursive: true, force: true });
  fs.rmSync(lock, { recursive: true, force: true });
  report.interrupted = interrupted;
  report.finishedAt = new Date().toISOString();
  report.exit = report.failures.length ? 1 : 0;
  fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`T1308 Controller: Exit ${report.exit}, Beleg ${out}`);
  process.exitCode = report.exit;
}
