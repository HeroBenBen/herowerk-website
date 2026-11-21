import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const portal = path.join(path.dirname(root), 'portal');
const { startLocal } = await import(path.join(portal, 'scripts/t1300-local.mjs'));
if (!process.argv.includes('--freigegeben'))
  throw new Error('Browserlauf ohne ausdrückliche Freigabe gesperrt.');
const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 't1308-intern-browser-'));
let server;
let interrupted = false;
let activeChild;
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    interrupted = true;
    activeChild?.kill('SIGTERM');
  });
try {
  process.env.T1308_LIMITED_RUN = '1';
  server = await startLocal();
  if (interrupted) throw new Error('Interner Browserlauf angehalten');
  // Vorhandene 24 interne Tests, eigener Ausgabepfad und Arbeitsordner.
  const config = path.join(temporary, 'playwright.config.cjs');
  fs.writeFileSync(
    config,
    `module.exports={testDir:${JSON.stringify(path.join(portal, 'tests'))},testMatch:'t1300-portal-demo.spec.js',timeout:90000,workers:1,reporter:'list',outputDir:${JSON.stringify(path.join(out, 'test-results'))},use:{baseURL:${JSON.stringify(server.baseURL)},headless:true,deviceScaleFactor:2}};\n`
  );
  const result = await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(portal, 'node_modules/@playwright/test/cli.js'), 'test', '--config', config],
      {
        cwd: temporary,
        env: { ...process.env, T1300_BASE_URL: server.baseURL, T1300_COOKIE: server.cookie },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
    activeChild = child;
    let stdout = '',
      stderr = '';
    child.stdout.on('data', (data) => {
      stdout += data;
    });
    child.stderr.on('data', (data) => {
      stderr += data;
    });
    child.on('error', reject);
    child.on('close', (status) => {
      activeChild = null;
      resolve({ status, stdout, stderr });
    });
  });
  fs.writeFileSync(path.join(out, 'playwright.log'), (result.stdout || '') + (result.stderr || ''));
  if (result.status !== 0)
    throw new Error(`Interner Browserlauf Exit ${result.status}, siehe ${out}`);
  fs.cpSync(path.join(temporary, 'docs'), path.join(out, 'docs'), { recursive: true });
} finally {
  if (server) await server.stop();
  fs.rmSync(temporary, { recursive: true, force: true });
}
