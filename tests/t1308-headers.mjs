import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { request } from 'node:http';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const keys = [
  'content-security-policy',
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
  'strict-transport-security',
  'x-robots-tag',
  'cache-control',
];
export function readHeaders(base, route, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = request(new URL(route, base), { method }, (response) => {
      const headers = {};
      for (let i = 0; i < response.rawHeaders.length; i += 2) {
        const key = response.rawHeaders[i].toLowerCase();
        (headers[key] ||= []).push(response.rawHeaders[i + 1]);
      }
      response.resume();
      response.on('end', () => resolve({ status: response.statusCode, headers }));
    });
    req.setTimeout(10000, () => req.destroy(new Error(`HTTP-Zeitlimit: ${route}`)));
    req.on('error', reject);
    req.end();
  });
}
export function compareHeaders(before, after, route) {
  assert.equal(after.status, before.status, `${route}: Status`);
  for (const name of keys)
    assert.deepEqual(after.headers[name] || [], before.headers[name] || [], `${route}: ${name}`);
}
export async function checkHeaders(baseline, current, out) {
  const evidence = { baseline, current, unchanged: [], exceptions: [], failures: [] };
  try {
    const tracked = execFileSync(
      'git',
      ['ls-tree', '-r', '--name-only', '4d6b36c1b464175406383ebe758aed80035fc365'],
      { cwd: root, encoding: 'utf8' }
    )
      .trim()
      .split('\n');
    const bundle = fs.readFileSync(path.join(root, 'scripts/make-ionos-bundle.sh'), 'utf8');
    const excluded = [...bundle.matchAll(/^\s*--exclude '([^']+)' \\$/gm)].map((m) => m[1]);
    const files = tracked.filter(
      (file) =>
        /\.(html|php)$/.test(file) &&
        !excluded.some((x) => (x.endsWith('/') ? file.startsWith(x) : file === x))
    );
    const routes = new Set(['/', '/funnel', '/proklima-hannover', '/proklima-hannover.html']);
    for (const file of files) {
      routes.add('/' + file);
      if (file.endsWith('.html')) routes.add('/' + file.slice(0, -5));
    }
    for (const route of [...routes]) routes.add(route + '?t1308=1');
    for (const route of routes) {
      const before = await readHeaders(baseline, route);
      const after = await readHeaders(current, route);
      compareHeaders(before, after, route);
      evidence.unchanged.push({ route, status: after.status, headers: after.headers });
    }
    const standard = (await readHeaders(baseline, '/')).headers['content-security-policy'][0];
    for (const portal of ['kunden', 'bewerber']) {
      for (const suffix of ['', '?t1308=1']) {
        const route = `/${portal}portal${suffix}`;
        const result = await readHeaders(current, route);
        assert.equal(result.status, 200);
        assert.deepEqual(result.headers['content-security-policy'], [
          standard.replace('frame-src ', "frame-src 'self' "),
        ]);
        assert.deepEqual(result.headers['x-frame-options'], ['DENY']);
        assert.equal(result.headers['x-robots-tag'], undefined);
        evidence.exceptions.push({ route, ...result });
      }
    }
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'vorschau/manifest.json')));
    for (const doc of manifest.documents)
      for (const suffix of ['', '?t1308=1']) {
        const route = `/vorschau/${doc.file}${suffix}`;
        const result = await readHeaders(current, route);
        assert.equal(result.status, 200, route);
        assert.deepEqual(result.headers['content-security-policy'], [doc.csp], route);
        assert.deepEqual(result.headers['x-frame-options'], ['SAMEORIGIN'], route);
        assert.deepEqual(result.headers['x-robots-tag'], ['noindex, nofollow'], route);
        assert.equal(result.headers['set-cookie'], undefined);
        evidence.exceptions.push({ route, ...result });
      }
    const negative = [
      '/kundenportal.html',
      '/bewerberportal.html',
      '/kundenportal/',
      '/bewerberportal/',
      '/kundenportal-falsch',
      '/kundenportal/zusatz',
      '/Kundenportal',
      '/vorschau/fremd.html',
      '/vorschau/kunden-login.html/zusatz',
      '/vorschau/kunden-login',
      '/vorschau/kunden-login/',
      '/vorschau/manifest.json',
    ];
    for (const route of negative) {
      const result = await readHeaders(current, route);
      assert.deepEqual(result.headers['content-security-policy'], [standard], route);
      assert.deepEqual(result.headers['x-frame-options'], ['DENY'], route);
      evidence.exceptions.push({ route, ...result });
    }
    for (const asset of manifest.outputs.filter((x) => x.file.startsWith('assets/'))) {
      const route = '/vorschau/' + asset.file;
      const result = await readHeaders(current, route);
      assert.deepEqual(result.headers['content-security-policy'], [standard], route);
      assert.deepEqual(result.headers['x-frame-options'], ['DENY']);
      assert.deepEqual(
        result.headers['access-control-allow-origin'],
        /\.(woff2|svg)$/.test(asset.file) ? ['*'] : undefined
      );
      evidence.exceptions.push({ route, ...result });
    }
    console.log(
      `T1308 Header: ${evidence.unchanged.length} unveränderte Bestandsrouten, ${evidence.exceptions.length} Pfadproben grün.`
    );
  } catch (error) {
    evidence.failures.push(error.stack);
    throw error;
  } finally {
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'headers.json'), JSON.stringify(evidence, null, 2) + '\n');
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url))
  await checkHeaders(process.argv[2], process.argv[3], process.argv[4]);
