// Ausschließlich lokale Erzeuger- und Node-Prüfungen. Kein Browserimport, kein Server.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspace = path.dirname(root);
const portal = path.join(workspace, 'portal');
const applicant = path.join(workspace, 'bewerberportal_lesend');
const out = path.join(
  workspace,
  'belege',
  'offline-' + new Date().toISOString().replace(/[:.]/g, '-')
);
fs.mkdirSync(out, { recursive: true });
const report = {
  startedAt: new Date().toISOString(),
  mode: 'Nur Erzeuger und Node, ohne Container/Browser/Server',
  steps: [],
};
function command(name, cwd, argv, expected = 0) {
  const start = Date.now();
  const result = spawnSync(argv[0], argv.slice(1), { cwd, encoding: 'utf8', maxBuffer: 16e6 });
  const row = {
    name,
    command: argv,
    expected,
    actual: result.status,
    milliseconds: Date.now() - start,
  };
  report.steps.push(row);
  fs.writeFileSync(path.join(out, name + '.log'), (result.stdout || '') + (result.stderr || ''));
  assert.equal(result.status, expected, `${name}: siehe ${out}`);
}
try {
  command('intern-quellen', portal, [
    process.execPath,
    'scripts/build-t1300-portal-demo.mjs',
    '--check',
    '--bewerberportal',
    applicant,
  ]);
  command('public-quellen-und-rotproben', portal, [
    process.execPath,
    'scripts/verify-t1308-public.mjs',
    applicant,
  ]);
  command('website-regression', root, [process.execPath, 'tests/t1308-portalweg-regression.mjs']);
  command('import-verarbeitung', root, [process.execPath, 'tests/t1308-import-processing.mjs']);
  command('expliziter-portalvergleich', root, [
    process.execPath,
    'scripts/import-t1308-preview.mjs',
    '--check',
    '--quelle',
    portal,
  ]);
  command('consent-abgrenzung', root, [process.execPath, 'scripts/consent-integration-check.js']);
  command('seo', root, [process.execPath, 'scripts/build-structured-data.mjs', '--check']);
  command('bausteine', root, [process.execPath, 'scripts/build-bausteine.mjs', '--check']);
  command('freigabesperre', root, ['bash', 'scripts/pruefe-t1308-controller.sh'], 64);
  for (const [name, directory] of [
    ['portal', portal],
    ['website', root],
  ]) {
    const changed = execFileSync('git', ['diff', '--name-only', '-z'], {
      cwd: directory,
      encoding: 'utf8',
    })
      .split('\0')
      .filter(Boolean);
    const added = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '-z'], {
      cwd: directory,
      encoding: 'utf8',
    })
      .split('\0')
      .filter(Boolean);
    const files = [...new Set([...changed, ...added])].filter((file) => /\.(m?js|css)$/.test(file));
    if (name === 'portal')
      assert(
        ![...changed, ...added].some((file) =>
          /^(index\.html$|dashboard\.html$|js\/|css\/|api\/|php\/|\.github\/)/.test(file)
        ),
        'Geschützte Portalquelle geändert'
      );
    else
      assert(
        ![...changed, ...added].some((file) => file.startsWith('.github/')),
        'Workflow geändert'
      );
    for (const file of files.filter((file) => /\.m?js$/.test(file)))
      command(`${name}-syntax-${file.replaceAll('/', '_')}`, directory, [
        process.execPath,
        '--check',
        file,
      ]);
    if (files.length)
      command(`${name}-format-geaendert`, directory, [
        process.execPath,
        path.join(directory, 'node_modules/prettier/bin/prettier.cjs'),
        '--check',
        ...files,
      ]);
    report[name + 'ChangedFiles'] = [...new Set([...changed, ...added])].sort();
  }
  assert.equal(
    execFileSync('git', ['status', '--porcelain'], { cwd: applicant, encoding: 'utf8' }).trim(),
    '',
    'Bewerber-Lesekopie verändert'
  );
  const publicManifest = JSON.parse(fs.readFileSync(path.join(root, 'vorschau/manifest.json')));
  const internalManifest = JSON.parse(
    fs.readFileSync(path.join(portal, 'intern/portal-demo/generated/manifest.json'))
  );
  assert.deepEqual(publicManifest.sourceCommits, internalManifest.sourceCommits);
  const before = JSON.parse(
    fs.readFileSync(path.join(workspace, 'belege/ausgang/quelldrift.json'))
  );
  report.drift = before.mismatches.map((row) => {
    const rel = row.key.slice('kunden:'.length);
    const actual = createHash('sha256')
      .update(fs.readFileSync(path.join(portal, rel)))
      .digest('hex');
    const expected = internalManifest.inputs.find((entry) => entry.key === row.key).sha256;
    assert.equal(actual, expected, row.key);
    assert.notEqual(row.expected, row.actual, 'Ausgangsrot fehlt');
    return {
      key: row.key,
      before: 'rot',
      after: 'grün',
      oldExpected: row.expected,
      expected,
      actual,
    };
  });
  assert.equal(report.drift.length, 7);
  report.documents = publicManifest.documents.map(({ file, bytes }) => ({ file, bytes }));
  report.sourceCommits = publicManifest.sourceCommits;
  for (const dir of [portal, applicant])
    assert(
      /<form\b[^>]*id="loginForm"/.test(fs.readFileSync(path.join(dir, 'index.html'), 'utf8')),
      'Lokales Anmeldeformular fehlt'
    );
  report.exit = 0;
} catch (error) {
  report.exit = 1;
  report.error = error.stack;
} finally {
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(
    `T1308 offline: Exit ${report.exit}, ${report.steps.length} Teilprüfungen, Beleg ${out}`
  );
  process.exitCode = report.exit;
}
